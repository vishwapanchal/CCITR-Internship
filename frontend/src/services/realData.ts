// Auto-generated from APEX-X backend test results

export interface MockCase {
  id: string;
  case_number: string;
  apk_hash: string;
  apk_name: string;
  status: "pending" | "analyzing" | "completed" | "failed";
  created_at: string;
  updated_at: string | null;
  threat_score: number;
  verdict: string;
  package_name: string;
  description: string;
  priority: "low" | "medium" | "high" | "critical";
}

export interface Permission {
  case_id?: string;
  name: string;
  protection_level: "normal" | "dangerous" | "signature" | "signatureOrSystem";
  description: string;
  risk: "low" | "medium" | "high" | "critical";
  granted: boolean;
}

export interface IOCEntry {
  case_id?: string;
  id: string;
  type: "domain" | "ip" | "url" | "hash" | "email" | "phone";
  value: string;
  context: string;
  confidence: number;
  first_seen: string;
}

export interface Vulnerability {
  case_id?: string;
  id: string;
  title: string;
  description: string;
  cvss_score: number;
  cvss_vector: string;
  owasp_category: string;
  severity: "low" | "medium" | "high" | "critical";
  poc_narrative: string;
  cwe_id: string;
}

export interface TimelineEvent {
  id: string;
  timestamp: string;
  type: "network" | "file_io" | "api_call" | "sms" | "crypto" | "permission";
  title: string;
  description: string;
  severity: "info" | "warning" | "critical";
}

export interface GraphNode {
  id: string;
  label: string;
  type: "apk" | "domain" | "ip" | "campaign" | "threat_actor";
  metadata?: Record<string, string>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  confidence?: number;
  style?: "solid" | "dashed";
}

export interface ActivityEntry {
  id: string;
  action: string;
  case_id: string;
  case_number: string;
  user: string;
  timestamp: string;
  details: string;
}

export interface PhaseStatus {
  phase: string;
  status: "pending" | "running" | "completed" | "failed";
  progress: number;
  started_at: string | null;
  completed_at: string | null;
}

export const REAL_CASES: MockCase[] = [
  {
    "id": "c549886f-2c3c-4919-8ae0-d9d76ebe4993",
    "case_number": "CASE-C549886F",
    "apk_hash": "N/A - Standalone Test",
    "apk_name": "AndroGoat.apk",
    "status": "completed",
    "created_at": "2026-07-02T10:16:28.286408Z",
    "updated_at": "2026-07-02T10:16:28.286440Z",
    "threat_score": 0,
    "verdict": "BENIGN \u2014 No malicious indicators found",
    "package_name": "unknown",
    "description": "Pre-tested analysis results for AndroGoat.apk",
    "priority": "medium"
  },
  {
    "id": "f5e625d7-a55f-459b-9a2f-6b44b18219fe",
    "case_number": "CASE-F5E625D7",
    "apk_hash": "N/A - Standalone Test",
    "apk_name": "DivaApplication.apk",
    "status": "completed",
    "created_at": "2026-07-02T10:16:28.288674Z",
    "updated_at": "2026-07-02T10:16:28.288682Z",
    "threat_score": 0,
    "verdict": "BENIGN \u2014 No malicious indicators found",
    "package_name": "unknown",
    "description": "Pre-tested analysis results for DivaApplication.apk",
    "priority": "medium"
  },
  {
    "id": "949dec2d-070f-4f0e-a29c-6d5924400099",
    "case_number": "CASE-949DEC2D",
    "apk_hash": "N/A - Standalone Test",
    "apk_name": "InsecureShop.apk",
    "status": "completed",
    "created_at": "2026-07-02T10:16:28.289488Z",
    "updated_at": "2026-07-02T10:16:28.289492Z",
    "threat_score": 0,
    "verdict": "BENIGN \u2014 No malicious indicators found",
    "package_name": "unknown",
    "description": "Pre-tested analysis results for InsecureShop.apk",
    "priority": "medium"
  }
];
export const REAL_PERMISSIONS: Permission[] = [];
export const REAL_IOCS: IOCEntry[] = [];
export const REAL_VULNERABILITIES: Vulnerability[] = [];

export const REAL_TIMELINE_EVENTS: TimelineEvent[] = [];
export const REAL_GRAPH_NODES: GraphNode[] = [];
export const REAL_GRAPH_EDGES: GraphEdge[] = [];
export const REAL_ACTIVITY: ActivityEntry[] = [];
export const REAL_PHASE_STATUS: PhaseStatus[] = [
  { phase: "Upload & Validation", status: "completed", progress: 100, started_at: "2026-06-30T10:15:00Z", completed_at: "2026-06-30T10:15:02Z" },
  { phase: "Static Analysis", status: "completed", progress: 100, started_at: "2026-06-30T10:15:02Z", completed_at: "2026-06-30T10:20:00Z" },
  { phase: "Dynamic Analysis", status: "completed", progress: 100, started_at: "2026-06-30T10:20:00Z", completed_at: "2026-06-30T10:35:00Z" },
  { phase: "Vulnerability Scan", status: "completed", progress: 100, started_at: "2026-06-30T10:50:00Z", completed_at: "2026-06-30T11:05:00Z" }
];
export const REAL_PHASE_STATUS_ANALYZING: PhaseStatus[] = [];
export const REAL_YARA_MATCHES: { rule_name: string; category: string; description: string; strings_matched: string[]; severity: string }[] = [];
export const REAL_REPORTS: any[] = [];
export const REAL_COPILOT_SUGGESTIONS: any[] = [];
