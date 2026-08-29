// ============================================================
// Shared UI type definitions for analysis data rendered from
// the real APEX-X backend (case results, IOCs, permissions, etc).
// ============================================================

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
  type: "domain" | "ip" | "url" | "hash" | "email" | "phone" | "upi" | "bank_account";
  value: string;
  context: string;
  confidence: number;
  first_seen?: string;
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
  type: "apk" | "domain" | "ip" | "campaign" | "threat_actor" | "url" | "file" | "baas_project";
  risk?: string;
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

export interface PhaseStatus {
  phase: string;
  status: "pending" | "running" | "completed" | "failed";
  progress: number;
  started_at: string | null;
  completed_at: string | null;
}

export const REAL_COPILOT_SUGGESTIONS: string[] = [
  "What permissions does this APK request?",
  "Are there any exported components without protection?",
  "What hardcoded secrets were found?",
  "Summarize the OWASP vulnerabilities detected.",
  "What is the overall risk level and why?",
];
