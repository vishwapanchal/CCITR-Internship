"""
Cross-Case Syndicate Correlation Engine
Executes a graph query to find structural overlaps (communication, infrastructure, BaaS, signing certs)
between the current case and historical cases.
"""

import logging
from typing import Dict, Any, List

from app.engines.c2.graph_builder import _get_driver

logger = logging.getLogger(__name__)

def find_correlated_cases(case_id: str, apk_hash: str) -> Dict[str, Any]:
    """
    Finds correlated cases using Neo4j graph relationships.
    Looks for overlap in:
    - COMMUNICATES_WITH (Domains, IPs)
    - USES_BACKEND (Firebase/Supabase projects)
    - SIGNED_WITH (Certificates - if added in future)
    - PAYS_TO (Crypto/Financial - if added in future)
    """
    driver = _get_driver()
    if not driver:
        return {"status": "unavailable", "correlations": []}

    correlations = []
    
    query = """
    MATCH (c1:Case)-[:CONTAINS]->(a1:APK)-[r:COMMUNICATES_WITH|USES_BACKEND|SIGNED_WITH|PAYS_TO]->(shared_node)<-[r2:COMMUNICATES_WITH|USES_BACKEND|SIGNED_WITH|PAYS_TO]-(a2:APK)<-[:CONTAINS]-(c2:Case)
    WHERE c1.case_id = $case_id AND c1.case_id <> c2.case_id
    RETURN c2.case_id AS related_case,
           labels(shared_node)[0] AS shared_type,
           coalesce(shared_node.name, shared_node.address, shared_node.project_id, shared_node.full_url, shared_node.id, 'unknown') AS shared_value,
           a2.package_name AS related_package
    ORDER BY related_case
    """
    
    try:
        with driver.session() as session:
            result = session.run(query, case_id=case_id)
            for record in result:
                correlations.append({
                    "related_case": record["related_case"],
                    "shared_type": record["shared_type"],
                    "shared_value": record["shared_value"],
                    "related_package": record["related_package"]
                })
    except Exception as e:
        logger.error(f"Failed to query correlations: {e}")
        return {"status": "error", "error": str(e), "correlations": []}
    finally:
        driver.close()

    # Aggregate by case
    aggregated = {}
    for corr in correlations:
        rc = corr["related_case"]
        if rc not in aggregated:
            aggregated[rc] = {
                "case_id": rc,
                "related_package": corr["related_package"],
                "shared_nodes": []
            }
        aggregated[rc]["shared_nodes"].append({
            "type": corr["shared_type"],
            "value": corr["shared_value"]
        })

    return {
        "status": "success",
        "total_correlated_cases": len(aggregated),
        "correlations": list(aggregated.values())
    }
