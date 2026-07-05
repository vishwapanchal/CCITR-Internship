import {
  REAL_CASES,
  REAL_PERMISSIONS,
  REAL_IOCS,
  REAL_VULNERABILITIES,
  REAL_GRAPH_NODES,
  REAL_GRAPH_EDGES,
  REAL_PHASE_STATUS,
  REAL_ACTIVITY,
} from "@/services/realData";

export function buildCaseContext(selectedCase: string) {
  const c = REAL_CASES.find((x) => x.id === selectedCase);
  if (!c) return null;

  // ALL permissions for this case
  const perms = REAL_PERMISSIONS.filter((p) => p.case_id === c.id);
  // ALL IOCs for this case (every URL, domain, IP, email, API key)
  const iocs = REAL_IOCS.filter((i) => i.case_id === c.id);
  // ALL vulnerabilities/misconfigurations
  const vulns = REAL_VULNERABILITIES.filter((v) => v.case_id === c.id);
  // Graph data for this case
  const caseNodeId = REAL_GRAPH_NODES.find(
    (n) => n.type === "apk" && n.label === c.package_name
  )?.id;
  const graphNodes = caseNodeId
    ? REAL_GRAPH_NODES.filter(
        (n) =>
          n.id === caseNodeId ||
          REAL_GRAPH_EDGES.some(
            (e) =>
              (e.source === caseNodeId && e.target === n.id) ||
              (e.target === caseNodeId && e.source === n.id)
          )
      )
    : [];
  const graphEdges = caseNodeId
    ? REAL_GRAPH_EDGES.filter(
        (e) => e.source === caseNodeId || e.target === caseNodeId
      )
    : [];
  // Activity log
  const activity = REAL_ACTIVITY.filter((a) => a.case_id === c.id);
  if (activity.length === 0) {
    activity.push({
      id: `act-${c.id}`,
      action: c.status === "completed" ? "STATIC_DYNAMIC_ANALYSIS_COMPLETED" : "ANALYSIS_PROCESSING",
      case_id: c.id,
      case_number: c.case_number || `CASE-${c.id.slice(0, 8).toUpperCase()}`,
      user: "APEX-X Engine",
      timestamp: c.updated_at || c.created_at || new Date().toISOString(),
      details: `Automated analysis for ${c.apk_name} — Threat Score: ${c.threat_score || 0}/100`,
    });
  }

  // All other cases for cross-referencing
  const otherCases = REAL_CASES.reduce((acc, x) => {
    if (x.id !== c.id) {
      acc.push({
        apk_name: x.apk_name,
        package_name: x.package_name,
        threat_score: x.threat_score,
        verdict: x.verdict,
      });
    }
    return acc;
  }, [] as Array<{ apk_name: string; package_name: string; threat_score: number; verdict: string }>);

  return {
    // ---- Case Overview ----
    case_number: c.case_number,
    apk_name: c.apk_name,
    package_name: c.package_name,
    threat_score: c.threat_score,
    verdict: c.verdict,
    priority: c.priority,
    status: c.status,
    apk_hash: c.apk_hash,
    description: c.description,
    created_at: c.created_at,
    updated_at: c.updated_at,

    // ---- Permissions (COMPLETE) ----
    total_permissions: perms.length,
    dangerous_permissions: perms.filter((p) => p.protection_level === "dangerous").length,
    permissions: perms.map((p) => ({
      name: p.name,
      risk: p.risk,
      protection_level: p.protection_level,
      description: p.description,
      granted: p.granted,
    })),

    // ---- IOCs (COMPLETE — every single one) ----
    total_iocs: iocs.length,
    ioc_breakdown: {
      urls: iocs.filter((i) => i.type === "url").length,
      domains: iocs.filter((i) => i.type === "domain").length,
      ips: iocs.filter((i) => i.type === "ip").length,
      emails: iocs.filter((i) => i.type === "email").length,
      hashes_api_keys: iocs.filter((i) => i.type === "hash").length,
    },
    iocs: iocs.map((i) => ({
      type: i.type,
      value: i.value,
      context: i.context,
      confidence: i.confidence,
    })),

    // ---- Vulnerabilities (COMPLETE) ----
    total_vulnerabilities: vulns.length,
    critical_vulns: vulns.filter((v) => v.severity === "critical").length,
    high_vulns: vulns.filter((v) => v.severity === "high").length,
    vulnerabilities: vulns.map((v) => ({
      title: v.title,
      severity: v.severity,
      cvss_score: v.cvss_score,
      cvss_vector: v.cvss_vector,
      owasp_category: v.owasp_category,
      cwe_id: v.cwe_id,
      description: v.description,
      poc_narrative: v.poc_narrative,
    })),

    // ---- Threat Graph (connected nodes) ----
    connected_domains: graphNodes.reduce((acc, n) => {
      if (n.type === "domain") acc.push(n.label);
      return acc;
    }, [] as string[]),
    graph_edges: graphEdges.map((e) => ({
      label: e.label,
      confidence: e.confidence,
    })),

    // ---- Analysis Pipeline Status ----
    phase_status: REAL_PHASE_STATUS.map((p) => ({
      phase: p.phase,
      status: p.status,
      progress: p.progress,
    })),

    // ---- Activity Log ----
    activity: activity.map((a) => ({
      action: a.action,
      details: a.details,
      timestamp: a.timestamp,
    })),

    // ---- Other cases in the system (for cross-reference) ----
    other_analyzed_apps: otherCases,
  };
}
