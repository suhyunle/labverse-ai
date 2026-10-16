# GENESIS LAB 3.0 — Advanced AI Scientific Universe

> Transform scientific curiosity, research papers, and experimental hypotheses into interactive, verifiable 3D scientific experiences.

Built for the **Google DeepMind AI Hackathon**, **GENESIS LAB 3.0** is a next-generation AI scientific research platform. It fuses deterministic scientific engines, multimodal Gemini reasoning, research paper grounding (Crossref & OpenAlex), and interactive visual simulations.

---

## 🌟 Core Architecture & Key Modules

### 1. Deterministic Scientific Engines (`/src/engines/`)
Independent of generative AI, all physical laws are solved deterministically by local analytical and numerical engines:
- **Gravity & Free-Fall Engine (`gravity.ts`)**:
  - Newtonian kinematics in vacuum: $y(t) = h - \frac{1}{2}gt^2$, $t_{fall} = \sqrt{\frac{2h}{g}}$.
  - Atmospheric aerodynamic drag: $F_{drag} = \frac{1}{2}\rho C_d A v^2$ with terminal velocity $v_t = \sqrt{\frac{2mg}{\rho C_d A}}$.
  - Comparative testing with Bowling Ball ($6\text{ kg}$) vs. Feather ($0.005\text{ kg}$) in vacuum chambers vs. planetary atmospheres.
- **Optics & Raytracing Engine (`optics.ts`)**:
  - Snell's Law of Refraction: $n_1 \sin \theta_1 = n_2 \sin \theta_2$.
  - Total Internal Reflection (TIR) and Critical Angle: $\theta_c = \arcsin(n_2 / n_1)$.
  - Fresnel power reflection and transmission coefficients: $R = \frac{1}{2}(R_s + R_p)$, $T = 1 - R$.
- **Fluid Stratification & Immiscibility Engine (`fluid.ts`)**:
  - Hydrostatic equilibrium: $P = \sum_i \rho_i g h_i$.
  - Density column sorting: Mercury ($13,534\text{ kg/m}^3$), Honey ($1,420$), Water ($1,000$), Oil ($920$), Alcohol ($789$).
  - Emulsion mixing and phase separation kinetics: $t_{sep} \propto \frac{\eta}{\Delta \rho \cdot g}$.
- **Volcano Thermodynamics & Celestial Keplerian Engines** (`volcano`, `solar_system`):
  - Preserved high-fidelity 3D cross-sections and Keplerian planetary orbital simulations.

### 2. Paper-to-Lab (`POST /api/paper-to-lab`)
- Accepts research questions, paper DOIs (e.g. `10.1038/...`), or URLs.
- Extracts research questions, verified hypotheses, physical formulas, parameter constraints, and methodological limitations.
- Grounded with genuine academic citations (Galileo's *Two New Sciences*, Snellius & Fermat's *Wave Optics*, Archimedes' *On Floating Bodies*).

### 3. Parallel Universe Mode (Split-Screen Experimentation)
- Side-by-side comparative simulation: **Universe Alpha** (Baseline) vs. **Universe Beta** (Counterfactual).
- Compare Vacuum vs. Air, Earth ($9.81\text{ m/s}^2$) vs. Moon ($1.62\text{ m/s}^2$), Normal glass vs. Diamond, or extreme parameter variations.
- Synchronized playback with real-time differential telemetry.

### 4. Hypothesis Arena (`POST /api/evaluate-hypothesis`)
- Formulate predictions prior to running tests.
- Physics-based evaluation identifies misconceptions (e.g. Aristotle's heavier-falls-faster fallacy) and suggests follow-up experiments.

### 5. Evidence Lens
- Transparent layer verifying physical constants ($g, G, c, n$), established laws, model assumptions, and educational approximations with real scientific sources (NIST, CODATA, BIPM, Feynman Lectures).

### 6. Research Branching Tree
- Clones and forks experiment configurations into a branching research tree with JSON export.

---

## 🚀 Getting Started

### Prerequisites
- Node.js >= 20
- npm >= 10

### Installation
```bash
npm install
```

### Running Locally
```bash
# Starts the full-stack server (Express + Vite middlewares) on port 3000
npm run dev
```
Open `http://localhost:3000` in your browser.

### Running Unit Tests
```bash
npm test
```
Verifies deterministic accuracy of the Gravity, Optics, and Fluid engines.

---

## 🐳 Google Cloud Run Deployment

### Container Build
```bash
docker build -t genesis-lab-3 .
```

### Run Container Locally
```bash
docker run -p 3000:3000 -e GEMINI_API_KEY="your-gemini-key" genesis-lab-3
```

### Cloud Run Deployment Command
```bash
gcloud run deploy genesis-lab \
  --source . \
  --port 3000 \
  --allow-unauthenticated \
  --set-env-vars GEMINI_API_KEY="YOUR_KEY"
```

Health check is available at `GET /health`.

---

## 📄 License
Apache-2.0
