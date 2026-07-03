"""
C2 Graph Builder — Neo4j Integration
Reads IOCs from static and dynamic analysis outputs, constructs a threat
intelligence graph in Neo4j with APK, Domain, IP, URL, and Case nodes.
"""

import json
import os
import logging
from typing import Dict, Any, List, Optional

from app.config import settings

logger = logging.getLogger(__name__)

try:
    from neo4j import GraphDatabase
    NEO4J_AVAILABLE = True
except ImportError:
    NEO4J_AVAILABLE = False
    logger.warning("neo4j driver not installed. Install: pip install neo4j")


def _get_driver():
    """Create a Neo4j driver instance."""
    if not NEO4J_AVAILABLE:
        return None
    try:
        driver = GraphDatabase.driver(
            settings.NEO4J_URI,
            auth=(settings.NEO4J_USER, settings.NEO4J_PASSWORD),
        )
        driver.verify_connectivity()
        return driver
    except Exception as e:
        logger.error(f"Failed to connect to Neo4j: {e}")
        return None


def build_c2_graph(
    case_id: str,
    case_dir: str,
    apk_hash: str,
    package_name: str = "unknown",
) -> Dict[str, Any]:
    """
    Build the C2 intelligence graph from analysis outputs.

    Reads:
    - static_analysis/ioc_list.json  (domains, IPs, URLs from static IOC extractor)
    - dynamic_analysis/dynamic_report.json  (DNS queries, HTTP requests from Frida/PCAP)

    Creates Neo4j nodes and relationships.

    Returns:
        Graph construction summary with node/edge counts.
    """
    result = {
        "status": "success",
        "nodes_created": 0,
        "relationships_created": 0,
        "domains": [],
        "ips": [],
        "urls": [],
        "errors": [],
    }

    # ── Collect IOCs from all phases ─────────────────────────
    domains = set()
    ips = set()
    urls = set()
    baas_projects = []

    # From static report (BaaS)
    static_path = os.path.join(case_dir, "static_analysis", "static_report.json")
    if os.path.exists(static_path):
        try:
            with open(static_path, "r") as f:
                report = json.load(f)
            baas_data = report.get("steps", {}).get("baas_detection", {}).get("data", {})
            for p in baas_data.get("firebase_projects", []):
                baas_projects.append({"id": p["project_id"], "type": p["type"]})
            for p in baas_data.get("supabase_projects", []):
                baas_projects.append({"id": p["project_id"], "type": p["type"]})
        except Exception as e:
            result["errors"].append(f"Failed to read static report for BaaS: {e}")

    # From static analysis (IOCs)
    ioc_path = os.path.join(case_dir, "static_analysis", "ioc_list.json")
    if os.path.exists(ioc_path):
        try:
            with open(ioc_path, "r") as f:
                iocs = json.load(f)
            domains.update(iocs.get("domains", []))
            ips.update(iocs.get("ips", []))
            urls.update(iocs.get("urls", []))
        except Exception as e:
            result["errors"].append(f"Failed to read static IOCs: {e}")

    # From dynamic analysis
    dynamic_path = os.path.join(case_dir, "dynamic_analysis", "dynamic_report.json")
    if os.path.exists(dynamic_path):
        try:
            with open(dynamic_path, "r") as f:
                dynamic = json.load(f)

            # Network step may contain DNS queries and HTTP requests
            network = dynamic.get("steps", {}).get("network", {})
            for dns in network.get("dns_queries", []):
                domains.add(dns)

            for req in network.get("http_requests", []):
                host = req.get("host", "")
                url = req.get("url", "")
                if host:
                    domains.add(host)
                if url:
                    urls.add(url)

            for ip in network.get("unique_ips", []):
                ips.add(ip)

        except Exception as e:
            result["errors"].append(f"Failed to read dynamic report: {e}")

    result["domains"] = sorted(domains)
    result["ips"] = sorted(ips)
    result["urls"] = sorted(urls)

    # ── Build Neo4j Graph ────────────────────────────────────
    driver = _get_driver()
    if not driver:
        result["status"] = "failed"
        result["errors"].append("Could not connect to Neo4j")
        return result

    try:
        with driver.session() as session:
            # Create Case node
            session.run(
                "MERGE (c:Case {case_id: $case_id}) "
                "SET c.status = 'analyzed'",
                case_id=str(case_id),
            )
            result["nodes_created"] += 1

            # Create APK node
            session.run(
                "MERGE (a:APK {hash: $hash}) "
                "SET a.package_name = $package, a.case_id = $case_id",
                hash=apk_hash,
                package=package_name,
                case_id=str(case_id),
            )
            result["nodes_created"] += 1

            # Link Case -> APK
            session.run(
                "MATCH (c:Case {case_id: $case_id}), (a:APK {hash: $hash}) "
                "MERGE (c)-[:CONTAINS]->(a)",
                case_id=str(case_id),
                hash=apk_hash,
            )
            result["relationships_created"] += 1

            # Create Domain nodes + relationships
            for domain in domains:
                session.run(
                    "MERGE (d:Domain {name: $name})",
                    name=domain,
                )
                session.run(
                    "MATCH (a:APK {hash: $hash}), (d:Domain {name: $name}) "
                    "MERGE (a)-[:COMMUNICATES_WITH]->(d)",
                    hash=apk_hash,
                    name=domain,
                )
                result["nodes_created"] += 1
                result["relationships_created"] += 1

            # Create IP nodes + relationships
            for ip in ips:
                session.run(
                    "MERGE (i:IPAddress {address: $addr})",
                    addr=ip,
                )
                session.run(
                    "MATCH (a:APK {hash: $hash}), (i:IPAddress {address: $addr}) "
                    "MERGE (a)-[:COMMUNICATES_WITH]->(i)",
                    hash=apk_hash,
                    addr=ip,
                )
                result["nodes_created"] += 1
                result["relationships_created"] += 1

            # Create URL nodes + link to domains
            for url in urls:
                session.run(
                    "MERGE (u:URL {full_url: $url})",
                    url=url,
                )
                result["nodes_created"] += 1
                
            # Create BaaS Project nodes + relationships
            for bp in baas_projects:
                session.run(
                    "MERGE (b:BaaSProject {project_id: $pid}) "
                    "SET b.type = $ptype",
                    pid=bp["id"],
                    ptype=bp["type"]
                )
                session.run(
                    "MATCH (a:APK {hash: $hash}), (b:BaaSProject {project_id: $pid}) "
                    "MERGE (a)-[:USES_BACKEND]->(b)",
                    hash=apk_hash,
                    pid=bp["id"]
                )
                result["nodes_created"] += 1
                result["relationships_created"] += 1

            # Find related APKs (same domain/IP communication)
            related = session.run(
                "MATCH (a1:APK {hash: $hash})-[:COMMUNICATES_WITH]->(target)"
                "<-[:COMMUNICATES_WITH]-(a2:APK) "
                "WHERE a2.hash <> $hash "
                "RETURN DISTINCT a2.hash AS related_hash, "
                "a2.package_name AS related_pkg, "
                "count(target) AS shared_infra "
                "ORDER BY shared_infra DESC LIMIT 10",
                hash=apk_hash,
            )
            result["related_apks"] = [
                {
                    "hash": r["related_hash"],
                    "package": r["related_pkg"],
                    "shared_infrastructure": r["shared_infra"],
                }
                for r in related
            ]

            # Find campaigns that use the same domains
            campaigns = session.run(
                "MATCH (a:APK {hash: $hash})-[:COMMUNICATES_WITH]->(d:Domain)"
                "<-[:USES]-(c:Campaign) "
                "RETURN DISTINCT c.name AS campaign, d.name AS domain",
                hash=apk_hash,
            )
            result["campaign_links"] = [
                {"campaign": r["campaign"], "domain": r["domain"]}
                for r in campaigns
            ]

    except Exception as e:
        logger.error(f"Neo4j graph construction error: {e}")
        result["errors"].append(str(e))
        result["status"] = "error"
    finally:
        driver.close()

    logger.info(
        f"C2 graph built: {result['nodes_created']} nodes, "
        f"{result['relationships_created']} relationships"
    )
    return result


def query_infrastructure(ioc_list: List[str]) -> Dict[str, Any]:
    """
    Query Neo4j for existing infrastructure matching the given IOCs.
    Used by the attribution engine.
    """
    driver = _get_driver()
    if not driver:
        return {"status": "unavailable", "matches": []}

    matches = []
    try:
        with driver.session() as session:
            for ioc in ioc_list:
                # Check domains
                r = session.run(
                    "MATCH (d:Domain {name: $name})<-[:COMMUNICATES_WITH]-(a:APK) "
                    "RETURN a.hash AS apk_hash, a.package_name AS pkg, "
                    "a.case_id AS case_id",
                    name=ioc,
                )
                for record in r:
                    matches.append({
                        "ioc": ioc,
                        "type": "domain",
                        "related_apk": record["apk_hash"],
                        "package": record["pkg"],
                        "case_id": record["case_id"],
                    })

                # Check IPs
                r = session.run(
                    "MATCH (i:IPAddress {address: $addr})"
                    "<-[:COMMUNICATES_WITH]-(a:APK) "
                    "RETURN a.hash AS apk_hash, a.package_name AS pkg, "
                    "a.case_id AS case_id",
                    addr=ioc,
                )
                for record in r:
                    matches.append({
                        "ioc": ioc,
                        "type": "ip",
                        "related_apk": record["apk_hash"],
                        "package": record["pkg"],
                        "case_id": record["case_id"],
                    })

    except Exception as e:
        logger.error(f"Neo4j query error: {e}")
        return {"status": "error", "error": str(e), "matches": []}
    finally:
        driver.close()

    return {"status": "success", "matches": matches, "total": len(matches)}
