import { NextRequest, NextResponse } from "next/server";

/**
 * Proxies Co-Pilot chat requests to DeepSeek R1 via OpenRouter.
 * Keeps the API key server-side — never shipped to the browser.
 */

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "deepseek/deepseek-r1:free";

const SYSTEM_PROMPT = `You are APEX-X Co-Pilot, an expert Android malware forensics AI assistant embedded in the APEX-X threat intelligence platform. You are built for CMP311 — Professional Project Planning and Prototyping.

You receive the COMPLETE analysis data for the currently selected APK case. This data was extracted by the APEX-X static analysis engine using: APKTool, JADX, Androguard, Manifest Parser, YARA Scanner, and IOC Extractor.

YOUR CONTEXT CONTAINS:
1. CASE OVERVIEW: apk_name, package_name, threat_score (0-100), verdict, priority, status
2. PERMISSIONS: Every Android permission the APK requests, with risk level (low/medium/high/critical) and protection_level (normal/dangerous)
3. IOCS (Indicators of Compromise): Every URL, domain, IP address, email, and hardcoded API key found in the decompiled source code. Each has a type, value, context (where it was found), and confidence score.
4. VULNERABILITIES: Every security misconfiguration found in AndroidManifest.xml, with CVSS v3.1 scores, OWASP Mobile Top 10 category, CWE ID, description, and proof-of-concept narrative.
5. THREAT GRAPH: Connected domains and infrastructure nodes that the APK communicates with.
6. ANALYSIS PIPELINE STATUS: Which analysis phases completed successfully.
7. ACTIVITY LOG: Engine actions and timestamps.
8. OTHER ANALYZED APPS: Summary of other APKs in the system for cross-referencing.

HOW TO RESPOND:
- Reference SPECIFIC data from the context (exact permission names, exact domain names, exact CWE IDs, exact CVSS scores)
- When asked about permissions, list the actual permission names and their risk levels from the data
- When asked about IOCs, cite the exact URLs/domains/IPs from the data
- When asked about vulnerabilities, reference the specific title, CVSS score, CWE ID, and OWASP category
- Calculate and cite statistics from the data (e.g., "3 out of 8 permissions are dangerous")
- For risk assessment, explain WHY the threat_score is what it is, based on the specific findings
- Use forensic/security professional language
- Use bullet points and structured formatting for clarity
- Be thorough but concise
- NEVER fabricate or hallucinate data. Only reference what exists in the provided context.
- If asked about something not in the context (e.g., dynamic analysis when only static was run), clearly state that data is not available.

IMPORTANT: The pre-tested APKs (DIVA, InsecureShop, AndroGoat) are intentionally vulnerable educational apps. Explain findings in that context when relevant.`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, context } = body;

    if (!message) {
      return NextResponse.json({ error: "No message provided" }, { status: 400 });
    }

    if (!OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: "OPENROUTER_API_KEY not configured" },
        { status: 500 }
      );
    }

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
    ];

    // Inject case context if provided
    if (context) {
      messages.push({
        role: "system",
        content: `CURRENT CASE CONTEXT:\n${JSON.stringify(context, null, 2)}`,
      });
    }

    // Add conversation history if provided
    if (body.history && Array.isArray(body.history)) {
      for (const msg of body.history) {
        if (msg.role === "user" || msg.role === "assistant") {
          messages.push({ role: msg.role, content: msg.content });
        }
      }
    }

    messages.push({ role: "user", content: message });

    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://apex-x.onrender.com",
        "X-Title": "APEX-X Co-Pilot",
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        max_tokens: 1024,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenRouter error:", response.status, errorText);
      return NextResponse.json(
        { error: `AI service error: ${response.status}` },
        { status: 502 }
      );
    }

    const data = await response.json();
    const aiMessage = data.choices?.[0]?.message?.content || "No response generated.";

    return NextResponse.json({ message: aiMessage });
  } catch (error) {
    console.error("Co-Pilot API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
