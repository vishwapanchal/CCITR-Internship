<div align="center">

# 🛡️ APEX-X

### Agentic APK Profiling, Exploitation Intelligence & Threat Attribution

**An enterprise-grade forensic intelligence platform for Android malware analysis**

[![Next.js](https://img.shields.io/badge/Next.js-16.2-black?logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)](https://python.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org/)
[![License](https://img.shields.io/badge/License-Educational-orange)](#disclaimer)

</div>

---

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Analysis Engines](#analysis-engines)
- [Pre-Tested Results](#pre-tested-results)
- [API Reference](#api-reference)
- [Team](#team)
- [Disclaimer](#disclaimer)

---

## Overview

**APEX-X** is a full-stack Android malware analysis platform built as a group project for **CMP311 — Professional Project Planning and Prototyping**. It provides security professionals and developers with tools to:

- **Decompile** APK files using APKTool and JADX
- **Analyze** permissions, APIs, and control flow graphs via Androguard
- **Detect** malware signatures using YARA rules
- **Extract** Indicators of Compromise (IOCs) — URLs, IPs, domains, API keys
- **Scan** for OWASP Mobile Top 10 vulnerabilities
- **Score** risk using a weighted multi-factor algorithm (0–100)
- **Visualize** threat infrastructure with interactive graph exploration
- **Generate** Section 65B-compliant forensic reports

The platform ships with **real analysis results** from three intentionally vulnerable Android applications (DIVA, InsecureShop, AndroGoat), with zero dummy data.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     APEX-X Platform                         │
├──────────────────────┬──────────────────────────────────────┤
│   Frontend (Next.js) │        Backend (FastAPI)             │
│                      │                                      │
│  ┌────────────────┐  │  ┌──────────────────────────────┐   │
│  │ Landing Page   │  │  │ Static Analysis Engine       │   │
│  │ Upload / Intake│  │  │  ├─ APKTool Wrapper          │   │
│  │ Pre-Tested Apps│  │  │  ├─ JADX Wrapper             │   │
│  │ Case Detail    │  │  │  ├─ Androguard Analyzer      │   │
│  │ Graph Explorer │  │  │  ├─ Manifest Parser          │   │
│  │ Co-Pilot Chat  │  │  │  ├─ YARA Scanner             │   │
│  │ Reports        │  │  │  ├─ IOC Extractor            │   │
│  └────────────────┘  │  │  └─ Risk Scorer              │   │
│                      │  ├──────────────────────────────┐   │
│  Components:         │  │ Dynamic Analysis Engine      │   │
│  ├─ ThreatScore      │  │  ├─ VM Orchestrator          │   │
│  ├─ PermissionMatrix │  │  │  ├─ Frida Manager          │   │
│  ├─ IOCTable         │  │  │  ├─ Traffic Capture        │   │
│  ├─ NetworkGraph     │  │  │  ├─ PCAP Analyzer          │   │
│  ├─ VulnerabilityCard│  │  │  └─ Behavior Aggregator    │   │
│  ├─ BehaviorTimeline │  │  ├──────────────────────────┐    │
│  └─ PhaseProgress    │  │  │ Vulnerability Engine     │    │
│                      │  │  │  ├─ OWASP Scanner        │    │
│                      │  │  │  ├─ CVSS Calculator      │    │
│                      │  │  │  ├─ CWE Mapper           │    │
│                      │  │  │  └─ PoC Generator        │    │
│                      │  │  └────────────────────────┘      │
│                      │  └──────────────────────────────┘   │
├──────────────────────┴──────────────────────────────────────┤
│              Infrastructure (Docker Compose)                │
│  PostgreSQL │ Redis │ Neo4j │ ChromaDB │ Android Emulator   │
└─────────────────────────────────────────────────────────────┘
```

---

## Features

### 🔬 Static Analysis Engine
| Module | Description |
|--------|-------------|
| **APKTool Wrapper** | Decompiles APK → extracts Smali code, resources, assets |
| **JADX Wrapper** | Reconstructs Java source from DEX bytecode |
| **Androguard Analyzer** | Extracts permissions, APIs, CFGs, certificates |
| **Manifest Parser** | Deep-parses AndroidManifest.xml for misconfigurations |
| **YARA Scanner** | Matches APK contents against malware signature rules |
| **IOC Extractor** | Extracts URLs, IPs, domains, emails, API keys |
| **Risk Scorer** | Weighted multi-factor scoring algorithm (0–100) |

### 🧪 Dynamic Analysis Engine
| Module | Description |
|--------|-------------|
| **VM Orchestrator** | Manages Android emulator lifecycle (ADB-based) |
| **Frida Manager** | Injects Frida scripts for runtime API hooking |
| **Traffic Capture** | Intercepts network traffic via mitmproxy |
| **PCAP Analyzer** | Parses captured packets for C2 communication |
| **Behavior Aggregator** | Correlates runtime behaviors into a threat profile |

### 🛡️ Vulnerability Engine
| Module | Description |
|--------|-------------|
| **OWASP Scanner** | Checks against OWASP Mobile Top 10 (2024) |
| **CVSS Calculator** | Computes CVSS v3.1 scores for findings |
| **CWE Mapper** | Maps vulnerabilities to CWE identifiers |
| **PoC Generator** | Generates proof-of-concept narratives |

### 🖥️ Frontend
- **Forensic Minimalist UI** — Light theme, premium typography (Outfit + JetBrains Mono)
- **Pre-Tested Apps Tab** — Browse real analysis results without uploading
- **Interactive Case Detail** — Tabbed views: Overview, Static, Dynamic, C2, Vulns, Reports
- **Threat Score Gauge** — Animated 0–100 risk visualization
- **Permission Matrix** — Color-coded permission risk breakdown
- **IOC Table** — Searchable/filterable IOC explorer with CSV/JSON/STIX export
- **Network Graph** — React Flow-based infrastructure visualization
- **Co-Pilot** — AI-assisted forensic Q&A interface

---

## Tech Stack

### Frontend
| Technology | Purpose |
|-----------|---------|
| Next.js 16 | React framework with App Router |
| TypeScript 5 | Type safety |
| Tailwind CSS 4 | Utility-first styling |
| Framer Motion | Animations and transitions |
| React Flow | Graph visualization |
| Three.js / react-globe.gl | 3D globe on landing page |
| Lucide React | Icon system |
| Zustand | State management |

### Backend
| Technology | Purpose |
|-----------|---------|
| FastAPI | REST API framework |
| SQLAlchemy | ORM for PostgreSQL |
| Androguard | APK binary analysis |
| YARA | Malware signature matching |
| Frida | Runtime instrumentation |
| Scapy / mitmproxy | Network traffic analysis |
| Celery + Redis | Async task queue |
| ReportLab | PDF report generation |

### Infrastructure
| Service | Purpose |
|---------|---------|
| PostgreSQL 15 | Primary data store |
| Neo4j 5 | Threat graph database |
| Redis 7 | Task queue broker + cache |
| ChromaDB | Vector store for Co-Pilot |
| Docker Android | Sandboxed emulator for dynamic analysis |

---

## Project Structure

```
Apex-X/
├── frontend/                   # Next.js 16 application
│   ├── src/
│   │   ├── app/                # App Router pages
│   │   │   ├── page.tsx        # Landing page
│   │   │   ├── login/          # Authentication
│   │   │   ├── upload/         # APK upload / intake
│   │   │   ├── dashboard/      # Pre-Tested Apps view
│   │   │   ├── cases/[id]/     # Case detail (tabbed)
│   │   │   ├── graph/          # Network graph explorer
│   │   │   ├── copilot/        # AI Co-Pilot
│   │   │   └── reports/        # Report management
│   │   ├── components/         # Reusable UI components (18)
│   │   ├── services/
│   │   │   ├── api.ts          # API client + local data fallback
│   │   │   └── realData.ts     # Real analysis data (auto-generated)
│   │   └── hooks/
│   │       └── useAuth.ts      # Auth state management
│   └── package.json
│
├── backend/                    # FastAPI application
│   ├── app/
│   │   ├── main.py             # FastAPI app entry point
│   │   ├── config.py           # Settings (env-based)
│   │   ├── api/
│   │   │   ├── routes/         # REST endpoints
│   │   │   │   ├── auth.py     # Login / Signup
│   │   │   │   ├── cases.py    # Case CRUD
│   │   │   │   ├── upload.py   # APK upload
│   │   │   │   ├── analysis.py # Trigger analysis
│   │   │   │   ├── results.py  # Fetch results
│   │   │   │   ├── reports.py  # PDF download
│   │   │   │   └── ws.py       # WebSocket Co-Pilot
│   │   │   └── middleware/
│   │   │       └── rbac.py     # Role-based access control
│   │   ├── engines/
│   │   │   ├── static/         # Static analysis pipeline
│   │   │   │   ├── __init__.py # Orchestrator
│   │   │   │   ├── apktool_wrapper.py
│   │   │   │   ├── jadx_wrapper.py
│   │   │   │   ├── androguard_analyzer.py
│   │   │   │   ├── manifest_parser.py
│   │   │   │   ├── yara_scanner.py
│   │   │   │   ├── ioc_extractor.py
│   │   │   │   └── risk_scorer.py
│   │   │   ├── dynamic/        # Dynamic analysis pipeline
│   │   │   │   ├── __init__.py # Orchestrator
│   │   │   │   ├── vm_orchestrator.py
│   │   │   │   ├── frida_manager.py
│   │   │   │   ├── traffic_capture.py
│   │   │   │   ├── pcap_analyzer.py
│   │   │   │   └── behavior_aggregator.py
│   │   │   └── vulnerability/  # Vulnerability engine
│   │   │       ├── __init__.py
│   │   │       ├── owasp_scanner.py
│   │   │       ├── cvss_calculator.py
│   │   │       ├── cwe_mapper.py
│   │   │       └── poc_generator.py
│   │   ├── models/             # SQLAlchemy models
│   │   ├── services/           # Business logic
│   │   └── utils/              # Helpers (hashing, security)
│   ├── run_engines.py          # CLI test runner
│   ├── test_results/           # Pre-generated analysis outputs
│   └── requirements.txt
│
├── tools/                      # Bundled binaries (jadx, apktool)
├── docker-compose.yml          # Full infra stack
├── render.yaml                 # Render deployment config
└── README.md
```

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **Python** ≥ 3.11
- **Java** ≥ 11 (for JADX/APKTool)
- **Docker** (optional, for full infra)

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend runs at `http://localhost:3000`. It works standalone with embedded real data — no backend needed for viewing pre-tested cases.

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate      # Linux/Mac
# venv\Scripts\activate       # Windows

pip install -r requirements.txt

# Create .env with your DATABASE_URL and SECRET_KEY
uvicorn app.main:app --host 0.0.0.0 --port 8080 --reload
```

### Full Infrastructure (Docker)

```bash
docker-compose up -d
```

This starts PostgreSQL, Redis, Neo4j, ChromaDB, and an Android emulator.

### Running the Analysis CLI

```bash
cd backend
python run_engines.py path/to/sample.apk --output-dir test_results
```

Options:
- `--static-only` — Run only static analysis
- `--dynamic-only` — Run only dynamic analysis

---

## Analysis Engines

### Static Analysis Pipeline

The static engine runs 6 analysis steps sequentially:

1. **APKTool** → Decompiles to Smali + resources
2. **JADX** → Reconstructs Java source code
3. **Androguard** → Extracts permissions, APIs, certificates
4. **Manifest Parser** → Parses AndroidManifest.xml for misconfigurations
5. **YARA Scanner** → Matches against malware signature rules
6. **IOC Extractor** → Pulls URLs, domains, IPs, emails, API keys

All outputs feed into the **Risk Scorer**, which uses a weighted formula:

```
Risk Score = Σ(category_weight × category_score)

Categories:
  - Permissions (0.25)  — Dangerous permission count & type
  - IOCs (0.20)         — Hardcoded URLs, IPs, domains
  - YARA (0.20)         — Malware signature matches
  - API Calls (0.15)    — Suspicious API usage patterns
  - Manifest (0.20)     — Security misconfigurations
```

### Dynamic Analysis Pipeline

The dynamic engine orchestrates:

1. **VM Orchestrator** → Boots Android emulator via ADB
2. **Frida Manager** → Injects JavaScript hooks for API monitoring
3. **Traffic Capture** → Intercepts HTTP/HTTPS via mitmproxy
4. **PCAP Analyzer** → Parses captured traffic for C2 indicators
5. **Behavior Aggregator** → Correlates all runtime data

### Vulnerability Engine

Maps findings to **OWASP Mobile Top 10 (2024)**, calculates **CVSS v3.1** scores, assigns **CWE** identifiers, and generates proof-of-concept narratives.

---

## Pre-Tested Results

The platform ships with analysis results from three intentionally vulnerable apps:

| APK | Package | Risk Score | Verdict | Permissions | IOCs | Vulns |
|-----|---------|-----------|---------|-------------|------|-------|
| **DIVA** | `jakhar.aseem.diva` | 26/100 | ⚠️ Moderate Risk | 2 dangerous | 52 | 5 |
| **InsecureShop** | `com.insecureshop` | 43/100 | 🔴 Suspicious | 3 dangerous | 130 | 10 |
| **AndroGoat** | `owasp.sat.agoat` | 51/100 | 🔴 Suspicious | 3 dangerous | 185 | 7 |

### Key Findings Across All Apps

- ✅ **Debuggable flag** detected in all 3 apps
- ✅ **Exported components** without permission protection
- ✅ **Hardcoded API keys** found in AndroGoat (AWS key)
- ✅ **Custom URL scheme hijacking** risks in InsecureShop and AndroGoat
- ✅ **Backup enabled** allowing data extraction via `adb backup`

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/auth/login` | User authentication |
| `POST` | `/api/v1/auth/signup` | User registration |
| `GET` | `/api/v1/cases/` | List all cases |
| `GET` | `/api/v1/cases/{id}` | Get case details |
| `POST` | `/api/v1/cases/upload/` | Upload APK for analysis |
| `POST` | `/api/v1/analysis/{id}/static` | Trigger static analysis |
| `POST` | `/api/v1/analysis/{id}/dynamic` | Trigger dynamic analysis |
| `POST` | `/api/v1/analysis/{id}/full` | Trigger full analysis |
| `GET` | `/api/v1/analysis/{id}/status` | Get analysis status |
| `GET` | `/api/v1/cases/{id}/results` | Get analysis results |
| `GET` | `/api/v1/reports/{id}/download` | Download PDF report |
| `GET` | `/health` | Health check |

---

## Team

| Role | Responsibility |
|------|---------------|
| **TM1** | Frontend, Backend API, Database, Authentication |
| **TM2** | Static Analysis Engine, Dynamic Sandbox, Vulnerability Scanner |
| **TM3** | Report Generation, Graph Explorer, Co-Pilot Integration |

---

## Disclaimer

> ⚠️ **Educational Purposes Only**
>
> This project was developed for CMP311 coursework. All analysis is performed on intentionally vulnerable applications designed for security education. The tools and techniques demonstrated are for learning purposes only. Attempting any form of penetration testing without explicit written permission is illegal and punishable by law.
>
> The vulnerable APKs used for testing (DIVA, InsecureShop, AndroGoat) are open-source educational resources created by their respective authors for security training.

---

<div align="center">

**Built with 🛡️ for CMP311 — Professional Project Planning and Prototyping**

</div>
