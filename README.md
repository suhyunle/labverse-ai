# LabVerse AI — from paper to verified experiment

LabVerse AI turns a real scientific paper (or a plain question) into an interactive free-fall physics lab, and
refuses to show anything it could not check. Built for the Google DeepMind AI hackathon.

> Tagline (KO): 논문에서 실험으로 — 검증 가능한 AI 과학 실험실

## How it works

```
question / DOI ──► OpenAlex search · Crossref lookup        (real papers only, doi.org links, evidence level)
                 └► Gemini structures the real abstract      (research question, variables, formulas, limitations)
                 └► Gemini drafts a lab spec (JSON)          (variables, observables, formulas, control layout)
                 └► Verification (pure functions)            schema · physical ranges · units · formula allow-list · engine vs closed form
                      └─ failures are sent back to Gemini with the exact error text (max 2 retries)
                 └► Gravity Lab (React Three Fiber)          fixed-step RK4 with quadratic drag, real-time playback
                 └► Dr. Nova                                  analyses a finished run, proposes follow-ups the student must approve
```

* **No invented papers.** Metadata comes from Crossref / OpenAlex; if nothing is found the UI says so. Every citation
  links to `https://doi.org/{doi}` and is tagged *abstract-based* or *metadata-only*. Full text is never read.
* **Verification is real.** `src/verification/` contains pure functions with unit tests; the UI shows each check's
  actual result. Nothing is hardcoded as "verified".
* **Physics is deterministic.** `src/engines/gravity.ts`: `a = g - k v²`, `k = ρ C_d A / 2m`, RK4 at Δt = 1 ms, compared
  against the closed-form solution (`t = acosh(e^{kh}) / √(gk)`). In vacuum `t = √(2h/g)`.
* **AI proposals need approval.** Dr. Nova's suggested variable changes are validated on the server and again in the
  browser, and applied only when the student clicks *apply*.

## Run locally

```bash
npm install --legacy-peer-deps
cp .env.example .env        # set GEMINI_API_KEY
npm run dev                 # http://localhost:3000
npm test                    # engine + verification unit tests
npm run lint                # tsc --noEmit
npm run build
```

Environment variables: `GEMINI_API_KEY` (required for AI features), `GEMINI_MODEL` (default `gemini-4-argon`, 15 s
timeout), `GEMINI_FALLBACK_MODEL` (default `gemini-3.8-flash`), `GEMINI_LITE_MODEL` (query translation). The key is read
only on the server; all external calls (Crossref, OpenAlex, Gemini) are made from `server.ts`.

## Demo papers (checked against Crossref)

* `10.1088/1361-6552/aa65da` — Ferreira, Seyffert, Lemmer (2017), *Developing a graphical tool for students to understand
  air resistance and free fall*, Physics Education.
* `10.1590/1806-9126-rbef-2024-0374` — Saliby (2025), *Air resistance from the acceleration of a falling smartphone*.

## Scope

The MVP is the free-fall lab. Other labs (optics, fluids, volcano, solar system, buoyancy), Diagram-to-Lab, the research
tree, hypothesis arena, evidence lens and parallel-universe mode remain in the code behind feature flags
(`src/config/features.ts`, e.g. `VITE_FEATURE_OTHER_LABS=true`).

## Deploy (Cloud Run)

`Dockerfile` builds the client, runs the tests, and serves `server.ts` on `$PORT`; `GET /health` is the health check.
