# LabVerse AI

### From paper to experiment — an AI science lab with explicit verification
<img width="2752" height="1686" alt="image" src="https://github.com/user-attachments/assets/a8c22ebc-e7a0-41ee-9fe7-74e3a399111d" />

**Turn a science question or a real research paper into an interactive lab where you can change variables, observe results, and explore what happens next.**

LabVerse AI is a science learning web app powered by Gemini. The model designs an experiment's variables, observables, formulas, and controls; the application checks the generated specification before running it in the browser. In the free-fall lab, you can compare two falling objects and work with **Dr. Nova**, an AI science companion, to interpret results and plan follow-up experiments.

The app distinguishes **AI-generated explanations from checks performed by code**. Free-fall calculations are compared with closed-form solutions. Other experiments display verification levels that reflect what their implementations can actually check.

Built for the Google DeepMind AI hackathon. The current application interface and generated explanations are primarily in Korean.

## Features

| Feature | What it does |
| --- | --- |
| **Question-to-Lab** | Converts a natural-language question into an experiment specification with variables, observables, learning objectives, and guided steps. Displays generation, verification, and retry progress. |
| **Paper-to-Lab** | Searches OpenAlex by research question or looks up a DOI through Crossref. When an abstract is available, Gemini extracts structured research questions, hypotheses, and variables. |
| **Free-fall lab** | Compares two objects, such as a feather and a bowling ball. Adjust drop height, gravity, air density, mass, cross-sectional area, and drag coefficient, then inspect landing times and impact speeds. |
| **Specification verification** | Checks schema, variable ranges, units, formulas, and either numerical results or responsiveness to controls. Checks run on both the server and the client. |
| **Dr. Nova** | Analyzes completed free-fall runs and student hypotheses, then suggests follow-up experiments. Proposed changes take effect only after the user clicks Apply. |
| **Additional science labs** | Supports dedicated scenes for optics, fluids, volcanoes, the solar system, and buoyancy, plus formula-driven conceptual labs. Their verification scope differs from free fall. |

The default home screen focuses on free fall and Paper-to-Lab. Additional lab cards and experimental tools can be exposed through [feature flags](#feature-flags). Natural-language generation for other topics is available even when those cards are hidden.

## Quick start

### 1. Install

Use Node.js **22.12 or later** and npm. The Docker image uses Node.js 22.

```bash
git clone https://github.com/suhyunle/labverse-ai.git
cd labverse-ai
npm ci
cp .env.example .env
```

The repository's `.npmrc` already sets `legacy-peer-deps=true`; no extra installation flag is needed.

### 2. Configure

Replace the `GEMINI_API_KEY` placeholder in `.env` with your own key.

```dotenv
GEMINI_API_KEY=your_gemini_api_key
```

AI generation and Dr. Nova require a valid key and model IDs accessible to your account. Do not leave the example key placeholder in place. **To try the built-in lab without AI, leave the value empty: `GEMINI_API_KEY=`.**

### 3. Run

```bash
npm run dev
```

<img width="1448" height="1086" alt="image" src="https://github.com/user-attachments/assets/206df3b6-9d79-4fa3-8a03-1b90a554a914" />


Open [http://localhost:3000](http://localhost:3000). Express serves the API and Vite development middleware together, so there is no separate frontend server to start.

## Try your first experiment

1. Choose the home-screen example comparing a feather and a bowling ball in a vacuum. The built-in preset opens immediately without an AI request.
2. Drop both objects and compare their landing times. At the default height of 30 m and gravity of 9.81 m/s², both land after approximately 2.47 seconds in a vacuum.
3. Increase air density and run the experiment again. Explore how mass, cross-sectional area, and drag coefficient affect the result.
4. Enter a hypothesis, run a drop, and review Dr. Nova's analysis. Apply a suggested change to continue exploring. This step requires a working Gemini connection.

To start from a paper, open Paper-to-Lab or select the paper example on the home screen. Example DOIs included in the project:

- [Developing a graphical tool for students to understand air resistance and free fall](https://doi.org/10.1088/1361-6552/aa65da)
- [Air resistance from the acceleration of a falling smartphone](https://doi.org/10.1590/1806-9126-rbef-2024-0374)

## How it works

```text
Science question
  → Gemini topic routing
  → Free-fall or general experiment specification
  → Normalize and verify
      → On failure: send actual errors back to Gemini
        (initial generation + up to 2 retries)
      → On success: render the interactive lab
  → Adjust variables and run the experiment
  → For completed free-fall runs: Dr. Nova analyzes the results
  → User approves proposed changes → next experiment

Research question → OpenAlex search → select a paper ─┐
DOI ─────────────────────────────────────────────────┴→ Crossref lookup
  → Supplement missing abstracts through OpenAlex
  → Gemini structures the abstract, when available
  → If identified as a free-fall topic: enter the free-fall generation path
```

`POST /api/plan-experiment` streams processing events as NDJSON. When a specification fails verification, the next generation request includes the checker's actual error messages. If free-fall generation fails, the server returns the built-in preset with an explanatory notice. Generation or verification failures for other topics are returned as errors.

## What is verified?

Verification has a different scope for each experiment type. [`src/verification/`](src/verification/) implements three levels:

| Level | Applies to | Checks | Limits |
| --- | --- | --- | --- |
| **Strict · `strict`** | Free fall | Schema, physical ranges, units, formula allow-list, and numerical results against closed-form solutions | Applies to the defined one-dimensional fall model. Landing time and impact speed must each have less than 1% relative error for both objects. |
| **Engine · `engine`** | Optics, fluids, volcanoes, solar system, buoyancy | Schema, required scene variables, registered range and unit rules, and evaluation and responsiveness of any supplied observable formulas | No independent closed-form comparison. Formula responsiveness checks are skipped when no observable formulas are supplied. |
| **Model · `model`** | Formula-driven conceptual labs | Formula parsing, declared variable references, finite results at defaults and five sample points across each variable's range, and responsiveness between sliders and observables | Does not establish scientific validity or quantitative predictive accuracy. Does not test every combination of variable values. |

Physical range and unit checks use rules registered in the code. They do not perform general dimensional analysis on arbitrary formulas.

### Free-fall model

`simulateFall` in [`src/engines/gravity.ts`](src/engines/gravity.ts) models quadratic drag under constant gravity and air density, with downward velocity taken as positive:

$$
\frac{dv}{dt}=g-kv^2,\qquad k=\frac{\rho C_d A}{2m}
$$

Velocity is integrated with RK4 at a fixed **1 ms** time step. Position uses trapezoidal integration of the velocities, and the landing point is interpolated within the final step. For a drop from rest at height $h$, the reference fall times are:

$$
t_{\mathrm{vacuum}}=\sqrt{\frac{2h}{g}},\qquad
t_{\mathrm{drag}}=\frac{\operatorname{acosh}(e^{kh})}{\sqrt{gk}}\quad(k>0)
$$

### Paper evidence

- Bibliographic records come from Crossref and OpenAlex. Citations link to their DOIs.
- Results distinguish **abstract-based** evidence from **metadata-only** evidence. Without an abstract, the app does not ask AI to extract research questions or hypotheses.
- The app does not read full papers or PDFs. Paper-to-Lab currently enables experiment creation for papers identified as free-fall related through abstract analysis.
- Generated experiments illustrate concepts from a paper. They do not reproduce its original experimental conditions or findings.

## Configuration

| Variable | Default / purpose |
| --- | --- |
| `GEMINI_API_KEY` | Server-side key for AI features. When empty, the generation API returns the built-in free-fall preset and Dr. Nova is unavailable. |
| `GEMINI_MODEL` | `gemini-4-argon`. Primary model for the shared JSON generation helper, with a default 15-second timeout. |
| `GEMINI_FALLBACK_MODEL` | `gemini-3.8-flash`. Alternative model used when the primary call fails. |
| `GEMINI_LITE_MODEL` | `gemini-3.1-flash-lite`. Used for topic classification and translating Korean search queries into English. |
| `GEMINI_FALLBACK_TIMEOUT_MS` | `45000`. Timeout for the final fallback model in the shared JSON generation helper. |
| `PORT` | `3000`. Express listening port. |
| `NODE_ENV` | Set to `production` to serve the built `dist/` directory instead of Vite development middleware. |
| `DISABLE_HMR` | Set to `true` to disable Vite HMR and file watching. |

Model IDs above are the defaults currently configured in the source. Adjust them to match your account's model access. Some legacy and experimental endpoints specify model IDs separately.

API keys and external API requests are handled in `server.ts`. Keep secrets out of variables prefixed with `VITE_`. The `APP_URL` entry in `.env.example` is not currently referenced by the application code.

### Feature flags

All flags in [`src/config/features.ts`](src/config/features.ts) default to `false`. A flag is enabled only when its value is exactly `true`.

| Variable | Exposes |
| --- | --- |
| `VITE_FEATURE_OTHER_LABS` | Additional lab cards on the home screen |
| `VITE_FEATURE_DIAGRAM_TO_LAB` | Experimental Diagram-to-Lab UI |
| `VITE_FEATURE_PARALLEL_UNIVERSE` | Parallel experiment comparison UI |
| `VITE_FEATURE_HYPOTHESIS_ARENA` | Separate hypothesis evaluation UI |
| `VITE_FEATURE_EVIDENCE_LENS` | Evidence and principles UI |
| `VITE_FEATURE_RESEARCH_TREE` | Research branching tree UI |
| `VITE_FEATURE_LAB_NOTEBOOK` | Lab notebook UI |

For example, add the following to `.env` and restart the development server to show additional lab cards:

```dotenv
VITE_FEATURE_OTHER_LABS=true
```

These flags control UI visibility, not server API access. In production, they are applied at **build time**. The additional tools are experimental and may be less complete than the core free-fall workflow. Diagram-to-Lab provides sample diagram selection; arbitrary image analysis is not implemented.

## Tech stack and project structure

| Area | Technologies |
| --- | --- |
| Frontend | React 19, TypeScript, Vite 8, Tailwind CSS 4 |
| Simulation rendering | Three.js, React Three Fiber |
| AI and server | Gemini API (`@google/genai`), Express, `tsx` |
| Research data | Crossref REST API, OpenAlex API |
| Math and text | KaTeX, React Markdown, custom arithmetic expression evaluator |
| Deployment | Multi-stage Docker build, Cloud Run port and health-check support |

```text
labverse-ai/
├── server.ts                  # AI, paper lookup, experiment APIs, and web server
├── src/
│   ├── App.tsx                # Experiment state and screen composition
│   ├── components/            # Paper search, controls, Dr. Nova, verification UI
│   ├── simulations/           # Free-fall and topic-specific visualizations
│   ├── engines/               # Free-fall, optics, and fluid calculations
│   ├── generation/            # Spec normalization, presets, scene variable contracts
│   ├── verification/          # Verification levels and pure check functions
│   ├── lib/                   # Formula evaluation, NDJSON streaming, audio, utilities
│   ├── config/features.ts     # Feature flags
│   └── types.ts               # Experiment specifications and shared types
├── scripts/                   # Engine, verification, and model-lab tests
├── .env.example               # Environment variable template
└── Dockerfile                 # Build, test, and runtime stages
```

Experiment snapshots and research tree data are stored in browser `localStorage`. There is no separate database or cross-account synchronization.

## Development commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start Express with Vite development middleware |
| `npm test` | Run engine, free-fall verification and normalization, model-lab, and formula evaluator tests |
| `npm run lint` | Check TypeScript types with `tsc --noEmit` |
| `npm run build` | Build the frontend into `dist/` |
| `NODE_ENV=production npm start` | Serve the built frontend and API through Express |

`npm run preview` starts only Vite's static preview server. Use the development or production server to exercise the full app with its API. The test suite covers local calculation logic; it does not verify live Gemini or paper API connectivity.

## Run with Docker

```bash
docker build -t labverse-ai .
docker run --rm -p 3000:3000 --env-file .env labverse-ai
```

The Docker build runs the frontend build and `npm test`. The runtime sets `NODE_ENV=production` and honors the `PORT` injected by Cloud Run. Use `GET /health` to check server availability.

> The health endpoint checks whether the server responds. It does not validate the Gemini key, model access, or external paper APIs.
