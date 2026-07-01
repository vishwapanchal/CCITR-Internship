

// ============================================================
// APEX-X Mock Data — Comprehensive test data for all components
// ============================================================

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
  name: string;
  protection_level: "normal" | "dangerous" | "signature" | "signatureOrSystem";
  description: string;
  risk: "low" | "medium" | "high" | "critical";
  granted: boolean;
}

export interface IOCEntry {
  id: string;
  type: "domain" | "ip" | "url" | "hash" | "email" | "phone";
  value: string;
  context: string;
  confidence: number;
  first_seen: string;
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

export interface Vulnerability {
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

export interface YARAMatch {
  rule_name: string;
  category: string;
  description: string;
  strings_matched: string[];
  severity: "low" | "medium" | "high" | "critical";
}

export interface PhaseStatus {
  phase: string;
  status: "pending" | "running" | "completed" | "failed";
  progress: number;
  started_at: string | null;
  completed_at: string | null;
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

// ---- MOCK CASES ----

export const MOCK_CASES: MockCase[] = [
  {
    id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    case_number: "CASE-8F4E9A0C",
    apk_hash: "8f4e9a0c2b5d1e7f3a6c8d9b0e2f4a5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1",
    apk_name: "com.whatsapp.update.apk",
    status: "completed",
    created_at: "2026-06-30T10:15:00Z",
    updated_at: "2026-06-30T11:45:00Z",
    threat_score: 87,
    verdict: "MALICIOUS — Spyware with C2 capabilities",
    package_name: "com.hidden.spyware.v2",
    description: "Suspected WhatsApp clone distributing via phishing SMS",
    priority: "critical",
  },
  {
    id: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    case_number: "CASE-2D7B3F1A",
    apk_hash: "2d7b3f1a9c8e5d4f6a2b0c1d3e5f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f",
    apk_name: "flashlight_pro.apk",
    status: "completed",
    created_at: "2026-06-29T14:30:00Z",
    updated_at: "2026-06-29T15:10:00Z",
    threat_score: 12,
    verdict: "BENIGN — No malicious indicators found",
    package_name: "com.simple.flashlight",
    description: "Routine check on app from Play Store",
    priority: "low",
  },
  {
    id: "c3d4e5f6-a7b8-9012-cdef-123456789012",
    case_number: "CASE-5E9C2A4B",
    apk_hash: "5e9c2a4b7d1f8e3c6a0b9d2e5f8a1c4b7d0e3f6a9b2c5d8e1f4a7b0c3d6e9f2",
    apk_name: "banking_trojan_sample.apk",
    status: "analyzing",
    created_at: "2026-07-01T08:00:00Z",
    updated_at: null,
    threat_score: 65,
    verdict: "ANALYZING — Dynamic analysis in progress",
    package_name: "com.secure.banking.app",
    description: "Banking trojan intercepted from dark web forum",
    priority: "high",
  },
  {
    id: "d4e5f6a7-b8c9-0123-defa-234567890123",
    case_number: "CASE-7A3D1F8E",
    apk_hash: "7a3d1f8e5c2b9a0d4e7f1c3b6a8d2e5f0c9b4a7d1e8f3c6b0a5d2e9f4c7b1a8",
    apk_name: "system_update_v3.apk",
    status: "pending",
    created_at: "2026-07-01T13:50:00Z",
    updated_at: null,
    threat_score: 0,
    verdict: "PENDING — Awaiting analysis",
    package_name: "unknown",
    description: "Found on seized device, auto-installs at boot",
    priority: "medium",
  },
];

// ---- PERMISSIONS ----

export const MOCK_PERMISSIONS: Permission[] = [
  { name: "android.permission.INTERNET", protection_level: "normal", description: "Full network access", risk: "low", granted: true },
  { name: "android.permission.READ_SMS", protection_level: "dangerous", description: "Read SMS messages", risk: "critical", granted: true },
  { name: "android.permission.SEND_SMS", protection_level: "dangerous", description: "Send SMS messages", risk: "critical", granted: true },
  { name: "android.permission.READ_CONTACTS", protection_level: "dangerous", description: "Read contact data", risk: "high", granted: true },
  { name: "android.permission.CAMERA", protection_level: "dangerous", description: "Take pictures and video", risk: "high", granted: true },
  { name: "android.permission.RECORD_AUDIO", protection_level: "dangerous", description: "Record audio", risk: "critical", granted: true },
  { name: "android.permission.ACCESS_FINE_LOCATION", protection_level: "dangerous", description: "Precise GPS location", risk: "high", granted: true },
  { name: "android.permission.READ_PHONE_STATE", protection_level: "dangerous", description: "Read phone status and identity", risk: "high", granted: true },
  { name: "android.permission.WRITE_EXTERNAL_STORAGE", protection_level: "dangerous", description: "Modify/delete SD card contents", risk: "medium", granted: true },
  { name: "android.permission.RECEIVE_BOOT_COMPLETED", protection_level: "normal", description: "Run at startup", risk: "medium", granted: true },
  { name: "android.permission.WAKE_LOCK", protection_level: "normal", description: "Prevent phone from sleeping", risk: "low", granted: true },
  { name: "android.permission.INSTALL_PACKAGES", protection_level: "signature", description: "Install applications", risk: "critical", granted: false },
  { name: "android.permission.BIND_ACCESSIBILITY_SERVICE", protection_level: "signature", description: "Bind to accessibility service", risk: "critical", granted: true },
  { name: "android.permission.SYSTEM_ALERT_WINDOW", protection_level: "dangerous", description: "Draw over other apps", risk: "high", granted: true },
];

// ---- IOCs ----

export const MOCK_IOCS: IOCEntry[] = [
  { id: "ioc-1", type: "domain", value: "c2.malware-ops.ru", context: "Primary C2 domain in HTTP POST beacon", confidence: 95, first_seen: "2026-06-30T10:20:00Z" },
  { id: "ioc-2", type: "ip", value: "185.220.101.42", context: "C2 server IP resolved from c2.malware-ops.ru", confidence: 92, first_seen: "2026-06-30T10:20:05Z" },
  { id: "ioc-3", type: "ip", value: "91.234.99.18", context: "Secondary exfiltration endpoint", confidence: 88, first_seen: "2026-06-30T10:25:00Z" },
  { id: "ioc-4", type: "domain", value: "update-service.ddns.net", context: "Dynamic DNS used for fallback C2", confidence: 85, first_seen: "2026-06-30T10:30:00Z" },
  { id: "ioc-5", type: "url", value: "https://c2.malware-ops.ru/gate.php", context: "Data exfiltration gate endpoint", confidence: 97, first_seen: "2026-06-30T10:22:00Z" },
  { id: "ioc-6", type: "hash", value: "e3b0c44298fc1c149afbf4c8996fb924", context: "Embedded DEX payload hash (MD5)", confidence: 100, first_seen: "2026-06-30T10:16:00Z" },
  { id: "ioc-7", type: "email", value: "admin@malware-ops.ru", context: "WHOIS registrant for C2 domain", confidence: 70, first_seen: "2026-06-30T11:00:00Z" },
  { id: "ioc-8", type: "domain", value: "cdn-payload.s3.amazonaws.com", context: "Secondary payload hosting", confidence: 60, first_seen: "2026-06-30T10:35:00Z" },
  { id: "ioc-9", type: "ip", value: "103.45.67.89", context: "Tor exit node used during testing", confidence: 55, first_seen: "2026-06-30T11:10:00Z" },
  { id: "ioc-10", type: "phone", value: "+91-9876543210", context: "SMS exfiltration target number", confidence: 78, first_seen: "2026-06-30T10:40:00Z" },
];

// ---- TIMELINE EVENTS ----

export const MOCK_TIMELINE_EVENTS: TimelineEvent[] = [
  { id: "evt-1", timestamp: "2026-06-30T10:15:01Z", type: "permission", title: "Permissions Requested", description: "App requested 14 permissions including READ_SMS, CAMERA, RECORD_AUDIO", severity: "warning" },
  { id: "evt-2", timestamp: "2026-06-30T10:15:03Z", type: "api_call", title: "DexClassLoader Invoked", description: "Dynamic code loading via DexClassLoader from assets/payload.dex", severity: "critical" },
  { id: "evt-3", timestamp: "2026-06-30T10:15:05Z", type: "file_io", title: "File Written to /data/local/tmp", description: "Extracted payload.dex (45KB) written to temp directory", severity: "warning" },
  { id: "evt-4", timestamp: "2026-06-30T10:15:08Z", type: "network", title: "DNS Resolution", description: "Resolved c2.malware-ops.ru → 185.220.101.42", severity: "critical" },
  { id: "evt-5", timestamp: "2026-06-30T10:15:10Z", type: "network", title: "HTTP POST to C2", description: "POST https://c2.malware-ops.ru/gate.php with device fingerprint", severity: "critical" },
  { id: "evt-6", timestamp: "2026-06-30T10:15:15Z", type: "sms", title: "SMS Content Read", description: "Read 23 SMS messages from content://sms/inbox", severity: "critical" },
  { id: "evt-7", timestamp: "2026-06-30T10:15:18Z", type: "network", title: "Data Exfiltration", description: "Uploaded 12KB of SMS data to C2 endpoint via HTTPS", severity: "critical" },
  { id: "evt-8", timestamp: "2026-06-30T10:15:22Z", type: "api_call", title: "Contacts Enumerated", description: "ContentResolver query on ContactsContract.Contacts", severity: "warning" },
  { id: "evt-9", timestamp: "2026-06-30T10:15:25Z", type: "crypto", title: "AES Encryption Used", description: "javax.crypto.Cipher with AES/CBC/PKCS5Padding for data encryption", severity: "info" },
  { id: "evt-10", timestamp: "2026-06-30T10:15:28Z", type: "network", title: "Contact Data Exfiltrated", description: "Encrypted contact list sent to 91.234.99.18:443", severity: "critical" },
  { id: "evt-11", timestamp: "2026-06-30T10:15:35Z", type: "api_call", title: "Location Access", description: "LocationManager.getLastKnownLocation() called", severity: "warning" },
  { id: "evt-12", timestamp: "2026-06-30T10:15:40Z", type: "file_io", title: "Screenshot Captured", description: "MediaProjection API used to capture screen content", severity: "critical" },
  { id: "evt-13", timestamp: "2026-06-30T10:15:45Z", type: "api_call", title: "Camera Activated", description: "Front camera opened silently via Camera2 API", severity: "critical" },
  { id: "evt-14", timestamp: "2026-06-30T10:15:50Z", type: "network", title: "Image Upload", description: "Captured image uploaded to c2.malware-ops.ru/upload", severity: "critical" },
  { id: "evt-15", timestamp: "2026-06-30T10:16:00Z", type: "api_call", title: "Keylogger Registered", description: "AccessibilityService registered to capture keystrokes", severity: "critical" },
  { id: "evt-16", timestamp: "2026-06-30T10:16:10Z", type: "sms", title: "SMS Sent", description: "Premium SMS sent to +91-9876543210", severity: "critical" },
  { id: "evt-17", timestamp: "2026-06-30T10:16:20Z", type: "file_io", title: "Log File Created", description: "Keylog data written to /data/data/com.hidden.spyware.v2/files/log.dat", severity: "warning" },
  { id: "evt-18", timestamp: "2026-06-30T10:16:30Z", type: "network", title: "Heartbeat Beacon", description: "Periodic heartbeat to update-service.ddns.net every 30s", severity: "warning" },
  { id: "evt-19", timestamp: "2026-06-30T10:16:45Z", type: "api_call", title: "Device Admin Requested", description: "DevicePolicyManager.setActiveAdmin() attempted", severity: "critical" },
  { id: "evt-20", timestamp: "2026-06-30T10:17:00Z", type: "permission", title: "Overlay Permission Used", description: "SYSTEM_ALERT_WINDOW used to draw phishing overlay", severity: "critical" },
];

// ---- GRAPH DATA (C2 Infrastructure) ----

export const MOCK_GRAPH_NODES: GraphNode[] = [
  { id: "node-apk", label: "com.hidden.spyware.v2", type: "apk", metadata: { hash: "8f4e9a0c...", version: "2.1.4" } },
  { id: "node-domain-1", label: "c2.malware-ops.ru", type: "domain", metadata: { registrar: "REG.RU", created: "2026-01-15" } },
  { id: "node-domain-2", label: "update-service.ddns.net", type: "domain", metadata: { registrar: "No-IP", created: "2026-03-22" } },
  { id: "node-domain-3", label: "cdn-payload.s3.amazonaws.com", type: "domain", metadata: { provider: "AWS S3", region: "ap-south-1" } },
  { id: "node-ip-1", label: "185.220.101.42", type: "ip", metadata: { country: "RU", asn: "AS49505", isp: "Selectel" } },
  { id: "node-ip-2", label: "91.234.99.18", type: "ip", metadata: { country: "UA", asn: "AS57724", isp: "HostPro" } },
  { id: "node-ip-3", label: "103.45.67.89", type: "ip", metadata: { country: "IN", asn: "AS18229", isp: "CtrlS" } },
  { id: "node-campaign", label: "Operation PhishKing", type: "campaign", metadata: { first_seen: "2026-01-20", targets: "Indian banking users" } },
  { id: "node-actor", label: "APT-IND-07", type: "threat_actor", metadata: { origin: "Unknown", motivation: "Financial" } },
];

export const MOCK_GRAPH_EDGES: GraphEdge[] = [
  { id: "edge-1", source: "node-apk", target: "node-domain-1", label: "HTTPS POST", confidence: 95, style: "solid" },
  { id: "edge-2", source: "node-apk", target: "node-domain-2", label: "DNS", confidence: 85, style: "solid" },
  { id: "edge-3", source: "node-apk", target: "node-domain-3", label: "HTTPS GET", confidence: 60, style: "dashed" },
  { id: "edge-4", source: "node-domain-1", target: "node-ip-1", label: "A Record", confidence: 92, style: "solid" },
  { id: "edge-5", source: "node-domain-2", target: "node-ip-2", label: "A Record", confidence: 88, style: "solid" },
  { id: "edge-6", source: "node-domain-3", target: "node-ip-3", label: "CNAME", confidence: 55, style: "dashed" },
  { id: "edge-7", source: "node-ip-1", target: "node-campaign", label: "Attributed", confidence: 80, style: "solid" },
  { id: "edge-8", source: "node-ip-2", target: "node-campaign", label: "Attributed", confidence: 75, style: "dashed" },
  { id: "edge-9", source: "node-campaign", target: "node-actor", label: "Operated by", confidence: 65, style: "dashed" },
];

// ---- VULNERABILITIES ----

export const MOCK_VULNERABILITIES: Vulnerability[] = [
  {
    id: "vuln-1",
    title: "Insecure Data Storage",
    description: "Sensitive user credentials stored in SharedPreferences without encryption",
    cvss_score: 7.5,
    cvss_vector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N",
    owasp_category: "M2: Insecure Data Storage",
    severity: "high",
    poc_narrative: "SharedPreferences file at /data/data/com.hidden.spyware.v2/shared_prefs/config.xml contains plaintext API keys and user tokens accessible via adb backup.",
    cwe_id: "CWE-312",
  },
  {
    id: "vuln-2",
    title: "Improper Certificate Validation",
    description: "TrustManager accepts all certificates, enabling MITM attacks",
    cvss_score: 9.1,
    cvss_vector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N",
    owasp_category: "M3: Insecure Communication",
    severity: "critical",
    poc_narrative: "Custom X509TrustManager implementation returns empty array for getAcceptedIssuers() and checkServerTrusted() is a no-op, allowing any certificate.",
    cwe_id: "CWE-295",
  },
  {
    id: "vuln-3",
    title: "Dynamic Code Loading",
    description: "Application loads executable code from external storage at runtime",
    cvss_score: 8.8,
    cvss_vector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:U/C:H/I:H/A:H",
    owasp_category: "M7: Client Code Quality",
    severity: "critical",
    poc_narrative: "DexClassLoader is used to load payload.dex from assets/ directory. The DEX file contains the main spyware logic including C2 communication routines.",
    cwe_id: "CWE-94",
  },
  {
    id: "vuln-4",
    title: "Hardcoded Encryption Key",
    description: "AES encryption key hardcoded in source code",
    cvss_score: 6.5,
    cvss_vector: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N",
    owasp_category: "M5: Insufficient Cryptography",
    severity: "medium",
    poc_narrative: "AES-256-CBC key found hardcoded as string constant: 'A1B2C3D4E5F6A7B8' in com.hidden.spyware.v2.utils.CryptoHelper class.",
    cwe_id: "CWE-321",
  },
  {
    id: "vuln-5",
    title: "Exported Content Provider Without Permissions",
    description: "Content provider exported without required permissions, exposing user data",
    cvss_score: 5.3,
    cvss_vector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N",
    owasp_category: "M1: Improper Platform Usage",
    severity: "medium",
    poc_narrative: "ContentProvider 'com.hidden.spyware.v2.provider.DataProvider' is exported in AndroidManifest.xml with no permission restrictions.",
    cwe_id: "CWE-926",
  },
];

// ---- YARA MATCHES ----

export const MOCK_YARA_MATCHES: YARAMatch[] = [
  { rule_name: "AndroidSpy_DexLoader", category: "Spyware", description: "Detects dynamic DEX loading patterns common in Android spyware", strings_matched: ["DexClassLoader", "loadClass", "payload.dex"], severity: "critical" },
  { rule_name: "AndroidSpy_SMSExfil", category: "Spyware", description: "SMS content provider access for data theft", strings_matched: ["content://sms/inbox", "SmsManager", "sendTextMessage"], severity: "critical" },
  { rule_name: "AndroidSpy_C2Beacon", category: "C2", description: "HTTP-based C2 beacon communication pattern", strings_matched: ["HttpURLConnection", "gate.php", "POST"], severity: "critical" },
  { rule_name: "Android_AntiEmulator", category: "Evasion", description: "Emulator detection techniques to avoid sandbox analysis", strings_matched: ["Build.FINGERPRINT", "generic", "goldfish"], severity: "high" },
  { rule_name: "Android_RootCheck", category: "Evasion", description: "Root detection to modify behavior on rooted devices", strings_matched: ["/system/app/Superuser.apk", "su", "which"], severity: "medium" },
];

// ---- PHASE STATUS ----

export const MOCK_PHASE_STATUS: PhaseStatus[] = [
  { phase: "Upload & Validation", status: "completed", progress: 100, started_at: "2026-06-30T10:15:00Z", completed_at: "2026-06-30T10:15:02Z" },
  { phase: "Static Analysis", status: "completed", progress: 100, started_at: "2026-06-30T10:15:02Z", completed_at: "2026-06-30T10:20:00Z" },
  { phase: "Dynamic Analysis", status: "completed", progress: 100, started_at: "2026-06-30T10:20:00Z", completed_at: "2026-06-30T10:35:00Z" },
  { phase: "C2 & Attribution", status: "completed", progress: 100, started_at: "2026-06-30T10:35:00Z", completed_at: "2026-06-30T10:50:00Z" },
  { phase: "Vulnerability Scan", status: "completed", progress: 100, started_at: "2026-06-30T10:50:00Z", completed_at: "2026-06-30T11:05:00Z" },
  { phase: "Report Generation", status: "completed", progress: 100, started_at: "2026-06-30T11:05:00Z", completed_at: "2026-06-30T11:15:00Z" },
];

export const MOCK_PHASE_STATUS_ANALYZING: PhaseStatus[] = [
  { phase: "Upload & Validation", status: "completed", progress: 100, started_at: "2026-07-01T08:00:00Z", completed_at: "2026-07-01T08:00:02Z" },
  { phase: "Static Analysis", status: "completed", progress: 100, started_at: "2026-07-01T08:00:02Z", completed_at: "2026-07-01T08:05:00Z" },
  { phase: "Dynamic Analysis", status: "running", progress: 62, started_at: "2026-07-01T08:05:00Z", completed_at: null },
  { phase: "C2 & Attribution", status: "pending", progress: 0, started_at: null, completed_at: null },
  { phase: "Vulnerability Scan", status: "pending", progress: 0, started_at: null, completed_at: null },
  { phase: "Report Generation", status: "pending", progress: 0, started_at: null, completed_at: null },
];

// ---- RECENT ACTIVITY ----

export const MOCK_ACTIVITY: ActivityEntry[] = [
  { id: "act-1", action: "APK_UPLOADED", case_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890", case_number: "CASE-8F4E9A0C", user: "Officer Singh", timestamp: "2026-06-30T10:15:00Z", details: "Uploaded com.whatsapp.update.apk" },
  { id: "act-2", action: "ANALYSIS_COMPLETED", case_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890", case_number: "CASE-8F4E9A0C", user: "System", timestamp: "2026-06-30T11:45:00Z", details: "All analysis phases completed. Threat score: 87/100" },
  { id: "act-3", action: "REPORT_GENERATED", case_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890", case_number: "CASE-8F4E9A0C", user: "System", timestamp: "2026-06-30T11:50:00Z", details: "PDF reports generated in EN, HI, KN" },
  { id: "act-4", action: "APK_UPLOADED", case_id: "b2c3d4e5-f6a7-8901-bcde-f12345678901", case_number: "CASE-2D7B3F1A", user: "Officer Patel", timestamp: "2026-06-29T14:30:00Z", details: "Uploaded flashlight_pro.apk" },
  { id: "act-5", action: "ANALYSIS_COMPLETED", case_id: "b2c3d4e5-f6a7-8901-bcde-f12345678901", case_number: "CASE-2D7B3F1A", user: "System", timestamp: "2026-06-29T15:10:00Z", details: "All phases completed. Verdict: BENIGN" },
  { id: "act-6", action: "APK_UPLOADED", case_id: "c3d4e5f6-a7b8-9012-cdef-123456789012", case_number: "CASE-5E9C2A4B", user: "Officer Kumar", timestamp: "2026-07-01T08:00:00Z", details: "Uploaded banking_trojan_sample.apk" },
  { id: "act-7", action: "COPILOT_QUERY", case_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890", case_number: "CASE-8F4E9A0C", user: "Officer Singh", timestamp: "2026-07-01T09:00:00Z", details: "Asked: What C2 domains were contacted?" },
];

// ---- REPORT TYPES ----

export interface ReportEntry {
  id: string;
  case_id: string;
  case_number: string;
  title: string;
  type: "pdf" | "zip" | "csv" | "json" | "stix";
  language: string;
  generated_at: string;
  size_kb: number;
}

export const MOCK_REPORTS: ReportEntry[] = [
  { id: "rpt-1", case_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890", case_number: "CASE-8F4E9A0C", title: "Investigation Report", type: "pdf", language: "English", generated_at: "2026-06-30T11:50:00Z", size_kb: 2450 },
  { id: "rpt-2", case_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890", case_number: "CASE-8F4E9A0C", title: "Investigation Report", type: "pdf", language: "Hindi", generated_at: "2026-06-30T11:52:00Z", size_kb: 2680 },
  { id: "rpt-3", case_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890", case_number: "CASE-8F4E9A0C", title: "Investigation Report", type: "pdf", language: "Kannada", generated_at: "2026-06-30T11:54:00Z", size_kb: 2710 },
  { id: "rpt-4", case_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890", case_number: "CASE-8F4E9A0C", title: "Investigation Report", type: "pdf", language: "Tamil", generated_at: "2026-06-30T11:56:00Z", size_kb: 2690 },
  { id: "rpt-5", case_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890", case_number: "CASE-8F4E9A0C", title: "Investigation Report", type: "pdf", language: "Telugu", generated_at: "2026-06-30T11:58:00Z", size_kb: 2700 },
  { id: "rpt-6", case_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890", case_number: "CASE-8F4E9A0C", title: "Section 65B Evidence Package", type: "zip", language: "N/A", generated_at: "2026-06-30T12:00:00Z", size_kb: 15200 },
  { id: "rpt-7", case_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890", case_number: "CASE-8F4E9A0C", title: "IOC Export", type: "csv", language: "N/A", generated_at: "2026-06-30T12:01:00Z", size_kb: 12 },
  { id: "rpt-8", case_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890", case_number: "CASE-8F4E9A0C", title: "IOC Export (STIX 2.1)", type: "stix", language: "N/A", generated_at: "2026-06-30T12:02:00Z", size_kb: 45 },
];

// ---- COPILOT SUGGESTED QUESTIONS ----

export const MOCK_COPILOT_SUGGESTIONS: string[] = [
  "What C2 domains were contacted by this APK?",
  "Summarize the key malicious behaviors found.",
  "Is this APK related to any known malware family?",
  "What data was exfiltrated and to where?",
  "Explain the DexClassLoader usage found in static analysis.",
  "What is the risk level of the permissions requested?",
  "Generate a timeline summary for the court report.",
  "What YARA rules matched and what do they indicate?",
];
