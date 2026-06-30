# APEX-X: Frontend Implementation & Prompt Guide
**Context for AI Developer:** You are tasked with building the frontend for "APEX-X," a law-enforcement-grade, AI-powered Android malware analysis platform. This application is used by cybercrime investigators. 

**CRITICAL DIRECTIVE:** The UI must NOT look like a generic AI-generated web app or a standard admin dashboard (no basic sidebars, no standard Bootstrap/Tailwind blocky tables). It must feel like a cutting-edge, bespoke forensic tool. 

**ABSOLUTE CONSTRAINT:** **NO DARK THEME.** The entire application must be built in a pristine, high-contrast, ultra-clean Light Theme. 

---

## 1. Technology Stack & Core Libraries

Use the following stack to ensure high performance, fluid animations, and a modern developer experience:
* **Framework:** Next.js (App Router) with React.
* **Styling:** Tailwind CSS (configured for a strict light theme) + CSS Modules for complex specific layouts.
* **Smooth Scrolling:** `@studio-freight/lenis` (for buttery smooth scroll hijacking that feels premium).
* **Animations:** `framer-motion` (for page transitions, bento-box staggered reveals, and layout shifts) and `gsap` (for scroll-linked timeline animations).
* **Data Visualization / Node Graphs:** `reactflow` (for the C2 infrastructure graph, heavily customized to look organic, not blocky).
* **State Management:** `zustand` (minimal, fast).
* **Icons & Typography:** `lucide-react` for minimalist icons. 

---

## 2. Design System & Aesthetics (The "Forensic Minimalist" Vibe)

* **Color Palette (Strict Light Mode):**
    * *Backgrounds:* Pure white (`#FFFFFF`) for main content, off-white/alabaster (`#FAFAFA` or `#F4F4F5`) for application canvas/canvas areas.
    * *Primary Accents:* Deep Forensic Blue (`#0A2540`) for primary typography and active states. 
    * *Threat Indicators:* Crimson (`#D32F2F`) for critical malware alerts, Amber (`#F57C00`) for warnings, Emerald (`#10B981`) for safe/verified states.
    * *Borders & Dividers:* Ultra-light zinc (`#E4E4E7`). Borders should be 1px solid, creating a crisp, wireframe-like elegance.
* **Typography:**
    * *Headings/Display:* **Clash Display** or **Satoshi** (sans-serif, slightly expanded, brutalist but clean).
    * *Body/UI text:* **Inter** or **Geist** (highly readable, tightly tracked).
    * *Data/Code/Hashes:* **JetBrains Mono** (for SHA256 hashes, IP addresses, and Smali code snippets).
* **Layout Style:** "Editorial Bento Box". Break away from the standard top-nav/sidebar setup. Use asymmetrical grid layouts, floating glass panels (with very subtle blur, no heavy shadows), and sticky headers that morph on scroll.

---

## 3. Page-by-Page Implementation Prompts

### A. The "Intake" / Upload Screen (Landing View)
* **Design:** A full-screen, highly immersive drag-and-drop zone. It should feel like dropping a file into a high-tech scanner.
* **Interactions:** * Use Framer Motion to create a dashed border that continuously animates (marching ants effect). 
    * When a file (`.apk`) is dropped, transition smoothly to a "Scanning State."
    * The scanning state should not be a boring loading bar. Implement a multi-step progressive reveal: "Extracting Manifest" -> "Hooking APIs" -> "Generating Graph," with JetBrains Mono text rapidly scrolling in the background at 20% opacity.

### B. The Command Center (Main Dashboard - Bento Grid)
* **Design:** Implement a fluid CSS Grid (Bento Box layout) showcasing the active investigation. 
* **Components:**
    * *Top left (Hero Box):* Threat Score Gauge. Do not use a standard semi-circle. Create a custom SVG radial dial with Framer Motion that ticks up dynamically.
    * *Top right (Metadata):* Clean typographic list of APK metadata (Hashes, App Name, Developer Signature) using monospace fonts for values.
    * *Middle row:* "Vulnerability Radar" (a customized SVG radar chart) and "Recent Alerts."
* **Animation:** Use Framer Motion's `staggerChildren` to make the bento boxes slide up and fade in organically when the page loads.

### C. The Behavioral Timeline (Scroll-Linked Experience)
* **Design:** A vertical, centered timeline mapping the malware's execution phases. 
* **Interactions (Lenis + GSAP):** As the user scrolls down, a central line "draws" itself. Timeline nodes (e.g., "Network Exfiltration Attempt", "SMS Read") fade in sideways. 
* **Aesthetic:** Look to high-end journalism sites (like NYT interactives) for inspiration. Large, clean typography with subtle sticky positioning so the current context stays on screen.

### D. The C2 Infrastructure Intelligence Graph (React Flow)
* **Design:** A full-bleed, edge-to-edge interactive canvas. 
* **Customization:** Override the default React Flow styling completely. 
    * *Nodes:* Pill-shaped, flat white background, 1px border. Domain nodes, IP nodes, and APK nodes should have distinct, minimalist icons.
    * *Edges:* Bezier curves with animated marching dashes indicating data flow.
    * *Interactivity:* When a user clicks a node, a sleek sliding drawer (right side) smoothly pushes the canvas left, revealing deep intel (Neo4j data) about that specific node.

### E. AI Officer Co-Pilot (Floating Overlay)
* **Design:** Not a generic ChatGPT clone. The Co-Pilot should be a floating, draggable glass-paneled widget at the bottom right.
* **Interactions:** * When activated, it expands fluidly using `framer-motion` layout animations.
    * Messages from the AI should have a "decoding" text effect (letters randomly cycling before settling on the actual word) to emphasize the forensic/AI nature of the tool.
    * Use markdown rendering with custom light-theme syntax highlighting for code/logs inside the chat.

---

## 4. Execution Directives for the Developer AI

When generating code for this prompt, you must adhere to the following:
1.  **Component Modularity:** Break down the UI into atomic components. Do not output massive 1000-line files.
2.  **No Placeholders:** Generate realistic mock data (e.g., fake Android package names, realistic SHA256 hashes, dummy Smali code snippets) so the UI looks complete and production-ready out of the box. 
3.  **Advanced Tailwind:** Utilize arbitrary values, group-hover states, and `has-[]` selectors to create complex micro-interactions without heavy JS event listeners.
4.  **Accessibility:** Ensure perfect contrast ratios (critical for light mode) and ARIA labels.

Begin by generating the `layout.tsx` establishing the Lenis smooth scroll provider, followed by the `page.tsx` for the Bento Box dashboard.