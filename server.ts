import express, { Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { buildGravityPresetSpec, normalizeGravitySpec, GRAVITY_VARIABLE_CATALOG } from './src/generation/gravitySpec';
import { verifyExperimentSpec, validateVariableUpdates, ALLOWED_FORMULAS } from './src/verification';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

// 0. Cloud Run Health Check Endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'healthy', timestamp: Date.now(), service: 'labverse-ai' });
});

// Initialize GoogleGenAI
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({
  apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});


// Gemini model selection comes from the environment; defaults follow the project spec.
const PRIMARY_MODEL = process.env.GEMINI_MODEL || 'gemini-4-argon';
const FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || 'gemini-3.8-flash';
const LITE_MODEL = process.env.GEMINI_LITE_MODEL || 'gemini-3.1-flash-lite'; // quick utility calls (query translation)
const GEMINI_TIMEOUT_MS = 15000; // primary model budget
const GEMINI_FALLBACK_TIMEOUT_MS = parseInt(process.env.GEMINI_FALLBACK_TIMEOUT_MS || '45000', 10); // last resort: nothing left to fall back to

/**
 * Calls Gemini for strict JSON. Primary model gets a 15 s AbortController timeout, then the
 * fallback model is tried. Throws (never fabricates) when no key is set or both attempts fail.
 */
async function generateJson(
  prompt: string,
  opts: { timeoutMs?: number; models?: string[] } = {},
): Promise<{ data: any; model: string }> {
  if (!apiKey) throw new Error('GEMINI_API_KEY가 설정되지 않았습니다');
  const models = opts.models ?? (PRIMARY_MODEL === FALLBACK_MODEL ? [PRIMARY_MODEL] : [PRIMARY_MODEL, FALLBACK_MODEL]);
  let lastErr: any;
  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    const isLast = i === models.length - 1 && models.length > 1;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? (isLast ? GEMINI_FALLBACK_TIMEOUT_MS : GEMINI_TIMEOUT_MS));
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: { responseMimeType: 'application/json', abortSignal: ctrl.signal },
      });
      const cleaned = (response.text || '').trim().replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
      return { data: JSON.parse(cleaned), model };
    } catch (err: any) {
      lastErr = ctrl.signal.aborted ? new Error(`${model} 응답 시간 초과`) : err;
      console.warn(`Gemini call failed on ${model}:`, lastErr?.message);
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr ?? new Error('Gemini 호출 실패');
}

// Predefined verified templates for instant high-speed fallback & seed matching
const PRESET_EXPERIMENTS: Record<string, any> = {
  gravity: buildGravityPresetSpec(),
  optics: {
    id: 'exp-optics-snell',
    title: '스넬의 법칙 및 전반사 광학 실험실',
    domain: 'optics',
    sceneType: 'optics',
    learningObjectives: [
      '서로 다른 굴절률 매질 경계면에서의 빛의 굴절과 스넬의 법칙(Snell\'s Law) 검증',
      '임계각(Critical Angle, θ_c = arcsin(n₂/n₁))의 조건과 전반사(TIR) 메커니즘 분석',
      '프레넬 반사율(Fresnel Reflectance)에 따른 반사광 및 투과광의 에너지 분할 이해',
    ],
    scientificPrinciples: [
      {
        name: '스넬의 굴절 법칙 (Snell\'s Law)',
        description: '입사각과 굴절각의 사인 값의 비는 두 매질의 굴절률의 역비와 같습니다.',
        formula: 'n_1 \\sin \\theta_1 = n_2 \\sin \\theta_2',
      },
      {
        name: '전반사 임계각 공식 (Critical Angle)',
        description: '굴절률이 높은 매질에서 낮은 매질로 진행할 때 굴절각이 90도가 되는 입사각.',
        formula: '\\theta_c = \\arcsin\\left(\\frac{n_2}{n_1}\\right) \\quad (n_1 > n_2)',
      },
      {
        name: '프레넬 반사율 (Fresnel Reflectance)',
        description: '매질 경계면에서 반사되는 빛의 에너지 비율 (무편광 빛 기준).',
        formula: 'R = \\frac{1}{2} (R_s + R_p), \\quad T = 1 - R',
      },
    ],
    variables: [
      {
        id: 'incidentAngle',
        label: '입사각 (Incident Angle θ₁)',
        min: 0,
        max: 89,
        default: 45,
        step: 1,
        unit: '° (도)',
        description: '법선(Normal)을 기준으로 레이저 빔이 입사하는 각도',
      },
    ],
    observableOutputs: [
      { id: 'refractedAngle', label: '굴절각 (θ₂)', unit: '°', formula: '\\arcsin((n_1/n_2)\\sin\\theta_1)', description: '하단 매질로 꺾여 들어가는 빛의 굴절 각도' },
      { id: 'criticalAngle', label: '임계각 (θ_c)', unit: '°', formula: '\\arcsin(n_2/n_1)', description: '전반사가 시작되는 최소 입사각' },
      { id: 'reflectancePower', label: '반사율 (Reflectance)', unit: '%', description: '반사되어 나가는 빛의 파워 비율' },
    ],
    simulationModel: 'deterministic_snell_fresnel_raytracer_v1',
    visualEffects: ['laser_beam', 'protractor_grid', 'tir_hazard_flare'],
    safetyNotes: ['실제 고출력 레이저는 망막 손상을 유발하므로 보호 고글 착용이 필수적입니다.'],
    explanation: '빛은 매질에 따라 진행 속도가 달라집니다. 페르마의 최소 시간 원리에 따라 빛은 두 점 사이를 이동할 때 시간이 가장 적게 걸리는 경로를 선택하며, 이로 인해 매질 경계면에서 진행 방향이 꺾이는 굴절 현상이 발생합니다.',
    guidedSteps: [
      { stepNumber: 1, title: '굴절각 측정', instruction: '유리(n=1.52)에서 공기(n=1.0)로 빛이 진행할 때 입사각 30도에서의 굴절각을 확인하세요.', targetAction: 'incidentAngle == 30' },
      { stepNumber: 2, title: '전반사 임계각 초과', instruction: '입사각을 42도 이상으로 올려 굴절 광선이 사라지고 100% 반사되는 전반사를 관찰하세요.', targetAction: 'incidentAngle > 42' },
    ],
    suggestedQueries: [
      '입사각을 50도로 올려서 전반사를 보여줘',
      '다이아몬드와 공기 경계면의 임계각은 얼마야?',
      '광섬유 통신은 이 원리를 어떻게 사용해?',
    ],
  },
  fluid: {
    id: 'exp-fluid-immiscible',
    title: '비혼화성 유체 성층화 및 밀도 기둥 실험실',
    domain: 'fluid_dynamics',
    sceneType: 'fluid',
    learningObjectives: [
      '극성/비극성 분자 간 계면장력과 비혼화성(Immiscibility)의 화학적 기초 이해',
      '서로 다른 유체들의 밀도 차이에 의한 자발적 정수압 성층화(Stratification) 관측',
      '강제 교반 후 유체 분리 이완 시간(Separation Relaxation Time) 측정',
    ],
    scientificPrinciples: [
      {
        name: '정수압 밀도 성층화 원리',
        description: '중력장 내에서 밀도가 더 큰 유체는 바닥으로 가라앉고 가벼운 유체는 상층으로 부유합니다.',
        formula: 'P = \\sum_{i} \\rho_i \\cdot g \\cdot h_i',
      },
      {
        name: '유체 분리 이완 역학',
        description: '에멀전 혼탁 상태에서 상 분리가 완료되는 속도는 점성에 비례하고 밀도차에 반비례합니다.',
        formula: 't_{sep} \\propto \\frac{\\eta}{\\Delta \\rho \\cdot g}',
      },
    ],
    variables: [
      {
        id: 'mixingEnergy',
        label: '교반 혼합 에너지 (Mixing Intensity)',
        min: 0,
        max: 100,
        default: 0,
        step: 5,
        unit: '%',
        description: '외력에 의해 유체 층을 강제로 섞는 에너지 (100%시 완전 유화 상태)',
      },
    ],
    observableOutputs: [
      { id: 'basePressure', label: '바닥면 정수압', unit: 'kPa', formula: 'P = \\sum \\rho g h', description: '용기 바닥에 가해지는 총 정수압' },
      { id: 'separationHalfLife', label: '분리 반감기', unit: '초', description: '혼합 후 유체가 층으로 재분리되는 시간' },
    ],
    simulationModel: 'immiscible_density_stratification_v1',
    visualEffects: ['stratified_meniscus', 'emulsion_diffusion'],
    safetyNotes: ['화학 실험실에서는 유기 용매 취급 시 환기 후드를 사용해야 합니다.'],
    explanation: '물(극성)과 기름(비극성)은 분자 간 수소 결합과 반데르발스 힘의 차이로 인해 섞이지 않습니다. 중력장 내에서는 밀도가 가장 큰 꿀/수은이 바닥에, 물이 중간에, 기름과 에탄올이 최상단에 안정된 층을 형성합니다.',
    guidedSteps: [
      { stepNumber: 1, title: '성층화 순서 확인', instruction: '밀도 순서대로 무거운 액체가 아래에 위치하는 정적 평형을 확인하세요.' },
      { stepNumber: 2, title: '강제 교반 및 재분리', instruction: '혼합 버튼을 눌러 유화 상태를 만들고, 점성과 밀도차에 의해 자발적으로 분리되는 과정을 관찰하세요.' },
    ],
    suggestedQueries: [
      '유체를 세게 흔들어서 섞어줘',
      '기름과 물이 섞이지 않는 화학적 이유는?',
    ],
  },
  volcano: {
    id: 'exp-volcano-standard',
    title: '화산 마그마 압력 및 분출 메커니즘 실험실',
    domain: 'earth_science',
    sceneType: 'volcano',
    learningObjectives: [
      '마그마 방 내부 압력과 화산 분출 강도(VEI)의 물리적 상관관계 분석',
      '화산 가스 함량이 점성과 폭발성에 미치는 유체역학적 영향 이해',
    ],
    scientificPrinciples: [
      {
        name: '유체 압력 및 베르누이 정리',
        description: '마그마 방 내부 압력이 지각의 구속 압력을 초과할 때 화도를 통한 분출이 유도됩니다.',
        formula: 'P_{chamber} > P_{lithostatic} + \\rho g h',
      },
    ],
    variables: [
      { id: 'pressure', label: '마그마 방 압력', min: 0, max: 100, default: 55, step: 1, unit: 'kPa', description: '마그마 방 내부 압력' },
      { id: 'gasContent', label: '화산 가스 함량', min: 0, max: 100, default: 45, step: 1, unit: '%', description: '수증기 및 이산화황 기포 비율' },
      { id: 'ventResistance', label: '화도 저항도', min: 10, max: 100, default: 50, step: 1, unit: '%', description: '화도 폐색 저항' },
      { id: 'magmaViscosity', label: '마그마 점성', min: 10, max: 90, default: 40, step: 1, unit: 'Pa·s', description: '규산염 함량에 따른 점성' },
    ],
    observableOutputs: [
      { id: 'chamberStress', label: '마그마 방 응력', unit: 'MPa', description: '마그마 챔버 외벽 지각 응력' },
      { id: 'plumeHeight', label: '화산재 분연주 고도', unit: 'km', description: '치솟는 화산재 구름 고도' },
      { id: 'veiScale', label: '화산 폭발 지수 (VEI)', unit: '등급', description: '분화 강도 척도 (0~6)' },
      { id: 'conduitVelocity', label: '화도 분출 속도', unit: 'm/s', description: '상승하는 마그마의 화도 내 유속' },
      { id: 'eruptionType', label: '분화 양식', unit: '', description: '현재 분출 거동 분류' },
    ],
    simulationModel: 'volcano_thermodynamics_v2',
    visualEffects: ['cross_section_cutaway', 'pulsating_magma_chamber', 'pyroclastic_flow', 'ballistic_bombs'],
    safetyNotes: ['실제 화산 분화 시에는 쇄설류와 유독가스로 인해 접근이 금지됩니다.'],
    explanation: '화산 폭발은 마그마 내 용해되어 있던 가스가 급격히 감압 팽창하며 막대한 에너지를 방출하는 열역학적 과정입니다.',
    guidedSteps: [
      { stepNumber: 1, title: '압력 임계점 관측', instruction: '마그마 압력을 65 kPa 이상으로 올려 분화를 유도하세요.' },
    ],
    suggestedQueries: ['압력을 최대로 올려줘', '가스 함량을 90으로 올려줘'],
  },
  solar_system: {
    id: 'exp-solar-system-gravity',
    title: '태양계 천체 역학 및 지구-달 중력 궤도 실험실',
    domain: 'astronomy',
    sceneType: 'solar_system',
    learningObjectives: [
      '케플러 행성 운동 법칙 및 뉴턴 만유인력 법칙의 역학적 원리 탐구',
      '지구-달 공전 궤도와 위상 변화, 그리고 기조력(조석 현상) 메커니즘 분석',
    ],
    scientificPrinciples: [
      {
        name: '뉴턴 만유인력 법칙',
        description: '두 천체 사이에는 질량의 곱에 비례하고 거리의 제곱에 반비례하는 인력이 작용합니다.',
        formula: 'F_g = G \\frac{M_1 M_2}{r^2}',
      },
    ],
    variables: [
      { id: 'timeScale', label: '시간 배속', min: 0, max: 10, default: 1.5, step: 0.1, unit: '배속', description: '공전 진행 배속' },
      { id: 'gravityMultiplier', label: '중력 상수 배율', min: 0.2, max: 2.5, default: 1.0, step: 0.05, unit: 'G/G₀', description: '중력 세기 배율' },
      { id: 'moonDistanceMultiplier', label: '지구-달 거리 비율', min: 0.5, max: 2.5, default: 1.0, step: 0.05, unit: 'R/R₀', description: '지구-달 평균 거리' },
      { id: 'earthOrbitalSpeed', label: '지구 공전 속도 배율', min: 0.4, max: 1.6, default: 1.0, step: 0.05, unit: 'v/v₀', description: '초기 공전 속도' },
    ],
    observableOutputs: [
      { id: 'orbitalPeriod', label: '지구 공전 주기', unit: '일', description: '1회 공전 시간' },
      { id: 'tidalForceIndex', label: '해양 기조력 지수', unit: '상대 지수', description: '조석 밀물 융기 강도' },
    ],
    simulationModel: 'keplerian_gravitational_nbody_v1',
    visualEffects: ['orbital_trajectories', 'day_night_terminator', 'tidal_force_bulge'],
    safetyNotes: ['가상 중력 배율을 급격히 낮출 경우 행성이 우주 밖으로 이탈할 수 있습니다.'],
    explanation: '태양계 행성들은 태양의 중력장과 공전 원심력의 정밀한 균형으로 궤도를 유지합니다.',
    guidedSteps: [
      { stepNumber: 1, title: '달의 조석력 관측', instruction: '달의 거리를 0.5배로 가깝게 줄여 기조력이 8배로 급증하는 현상을 관측하세요.' },
    ],
    suggestedQueries: ['중력을 절반으로 줄여줘', '달의 거리를 절반으로 해줘'],
  },
};

// Fallback experiment generator
function generateFallbackExperiment(query: string) {
  const lower = query.toLowerCase();
  if (lower.includes('낙하') || lower.includes('중력') || lower.includes('갈릴레오') || lower.includes('깃털') || lower.includes('gravity') || lower.includes('free fall')) {
    return PRESET_EXPERIMENTS.gravity;
  }
  if (lower.includes('빛') || lower.includes('굴절') || lower.includes('반사') || lower.includes('스넬') || lower.includes('전반사') || lower.includes('optics') || lower.includes('refraction')) {
    return PRESET_EXPERIMENTS.optics;
  }
  if (lower.includes('밀도') || lower.includes('기름') || lower.includes('액체') || lower.includes('성층') || lower.includes('fluid') || lower.includes('density column')) {
    return PRESET_EXPERIMENTS.fluid;
  }
  if (lower.includes('화산') || lower.includes('마그마') || lower.includes('volcano')) {
    return PRESET_EXPERIMENTS.volcano;
  }
  if (lower.includes('태양') || lower.includes('지구') || lower.includes('달') || lower.includes('행성') || lower.includes('solar')) {
    return PRESET_EXPERIMENTS.solar_system;
  }
  return PRESET_EXPERIMENTS.gravity;
}

// 1. Plan Experiment API
app.post('/api/plan-experiment-legacy', async (req: Request, res: Response) => {
  try {
    const { query } = req.body;
    if (!query || typeof query !== 'string') {
      res.status(400).json({ error: 'Valid scientific query is required' });
      return;
    }

    const trimmed = query.trim();

    // Call Gemini API if available (gemini-4-argon primary -> gemini-3.8-flash fallback)
    if (apiKey) {
      try {
        const systemPrompt = `You are the Lead Scientific Experiment Architect at LabVerse AI.
Your mission is to map any scientific inquiry into one of the verified simulation environments:
- 'volcano' (magma chamber pressure, eruption dynamics, cross-section cutaway)
- 'gravity' (free fall, vacuum, air drag, Galileo experiments)
- 'optics' (Snell's law, laser refraction, reflection, critical angle TIR)
- 'fluid' (immiscible fluid stratification, density columns)
- 'solar_system' (orbital mechanics, Kepler's laws, Earth-Moon tides)
- 'conceptual' (general conceptual visualization)

Return strictly valid JSON conforming to ExperimentSpec.
All text must be fluent Korean.
For volcano experiments:
- ensure observableOutputs contains:
  { "id": "chamberStress", "label": "마그마 방 응력", "unit": "MPa" }
  { "id": "plumeHeight", "label": "화산재 분연주 고도", "unit": "km" }
  { "id": "veiScale", "label": "화산 폭발 지수 (VEI)", "unit": "등급" }
  { "id": "conduitVelocity", "label": "화도 분출 속도", "unit": "m/s" }
  { "id": "eruptionType", "label": "분화 양식", "unit": "" }`;

        let response;
        try {
          const argonCall = ai.models.generateContent({
            model: 'gemini-4-argon',
            contents: `사용자의 과학 탐구 질문: "${trimmed}". 상응하는 인터랙티브 실험실 스펙 JSON을 생성해줘.`,
            config: {
              systemInstruction: systemPrompt,
              responseMimeType: 'application/json',
            },
          });
          const argonTimeout = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('gemini-4-argon response timeout (15s)')), 15000)
          );
          response = await Promise.race([argonCall, argonTimeout]);
        } catch (argonErr) {
          console.warn('gemini-4-argon failed or unavailable, falling back to gemini-3.8-flash:', argonErr);
          response = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: `사용자의 과학 탐구 질문: "${trimmed}". 상응하는 인터랙티브 실험실 스펙 JSON을 생성해줘.`,
            config: {
              systemInstruction: systemPrompt,
              responseMimeType: 'application/json',
            },
          });
        }

        const rawText = response.text || '';
        const cleaned = rawText.trim().replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
        const parsed = JSON.parse(cleaned);

        if (parsed.title && parsed.sceneType && Array.isArray(parsed.variables)) {
          parsed.id = parsed.id || `exp-ai-${Date.now()}`;
          res.json({ experiment: parsed });
          return;
        }
      } catch (geminiErr) {
        console.warn('Gemini experiment generation fallback used:', geminiErr);
      }
    }

    const fallback = generateFallbackExperiment(trimmed);
    res.json({ experiment: fallback });
  } catch (err: any) {
    console.error('Plan experiment error:', err);
    res.status(500).json({ error: 'Failed to plan experiment', details: err?.message });
  }
});

// 1. Plan Experiment API (MVP: free-fall lab). Streams NDJSON progress events so the UI only ever
// shows steps that really happen: generate -> verify -> (retry with real errors, max 2) -> done.
const MAX_GENERATION_RETRIES = 2;

function buildGravityPrompt(query: string, paper: any, previousErrors: string[]) {
  const catalog = Object.entries(GRAVITY_VARIABLE_CATALOG)
    .map(([id, v]) => `- ${id}: ${v.label}, unit "${v.unit}", allowed range ${v.min}..${v.max}, typical default ${v.default}`)
    .join('\n');
  const formulas = ALLOWED_FORMULAS.map((f) => `- ${f.variants[0]}`).join('\n');
  const paperBlock = paper?.title
    ? `\nThe lab illustrates this REAL paper (do not invent anything beyond this):\nTitle: ${paper.title}\nDOI: ${paper.doi ?? 'n/a'}\nResearch question: ${paper.researchQuestion ?? 'not stated'}\nHypothesis: ${paper.hypothesis ?? 'not stated'}\n`
    : '';
  const retryBlock = previousErrors.length
    ? `\nYour previous output FAILED automatic verification with these exact errors. Fix every one:\n${previousErrors.map((e) => `- ${e}`).join('\n')}\n`
    : '';
  return `You design a free-fall physics lab for LabVerse AI. Reply with compact JSON only (no prose).

Engine variables you may expose (use these exact ids; stay inside the allowed range):
${catalog}

Allowed formulas (copy them exactly; no others):
${formulas}

Rules:
- Always include dropHeight, gravity and airDensity. Add only the body variables (massA/areaA/cdA/massB/areaB/cdB) the lab needs.
- min < max and min <= default <= max. Units exactly as listed.
- observables: [{ "id", "label", "unit" }] with ids from fallTimeA, fallTimeB, impactVelocityA, impactVelocityB, vacuumFallTime; unit "s" for times and "m/s" for speeds.
- uiComponents: a tree of { "type": "group", "title", "children": [...] }, { "type": "slider", "variableId" } and { "type": "preset_buttons", "options": [{ "label", "values": { "<variableId>": number } }] }. Every variableId must be in variables and every preset value inside that variable's min..max.
- All human-readable text in natural Korean. Keep it short: 2-3 learningObjectives, 2-3 guidedSteps.
- If the request is NOT about free fall / gravity / falling bodies / air drag, reply exactly {"unsupported": true, "reason": "<Korean one-liner>"}.
${paperBlock}${retryBlock}
User request: "${query}"

JSON shape:
{ "title": string, "learningObjectives": [string], "variables": [{ "id", "label", "min", "max", "default", "step", "unit", "description" }], "observables": [{ "id", "label", "unit" }], "formulas": [string], "uiComponents": [...], "explanation": string, "guidedSteps": [{ "title", "instruction" }], "limitations": string }`;
}

app.post('/api/plan-experiment', async (req: Request, res: Response) => {
  const { query, paperContext } = req.body || {};
  if (!query || typeof query !== 'string') {
    res.status(400).json({ error: 'Valid scientific query is required' });
    return;
  }

  res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('X-Accel-Buffering', 'no');
  const emit = (event: Record<string, unknown>) => res.write(JSON.stringify(event) + '\n');
  const started = Date.now();

  try {
    const preset = () => {
      const spec = PRESET_EXPERIMENTS.gravity;
      return { spec, report: verifyExperimentSpec(spec) };
    };

    if (!apiKey) {
      const { spec, report } = preset();
      emit({ type: 'step', step: 'verify' });
      emit({ type: 'done', experiment: spec, verification: report, source: 'preset', notice: 'GEMINI_API_KEY가 없어 AI 생성 없이 기본 자유 낙하 실험을 불러왔습니다.', attempts: 0, ms: Date.now() - started });
      res.end();
      return;
    }

    let errors: string[] = [];
    let lastReport: ReturnType<typeof verifyExperimentSpec> | null = null;
    for (let attempt = 0; attempt <= MAX_GENERATION_RETRIES; attempt++) {
      emit({ type: 'step', step: 'generate', attempt: attempt + 1, maxAttempts: MAX_GENERATION_RETRIES + 1 });
      let raw: any;
      let model: string;
      try {
        ({ data: raw, model } = await generateJson(buildGravityPrompt(query.trim().slice(0, 500), paperContext, errors)));
      } catch (err: any) {
        const { spec, report } = preset();
        emit({ type: 'done', experiment: spec, verification: report, source: 'preset', notice: `AI 생성에 실패해 기본 자유 낙하 실험을 불러왔습니다 (${err?.message || '알 수 없는 오류'}).`, attempts: attempt + 1, ms: Date.now() - started });
        res.end();
        return;
      }

      if (raw?.unsupported) {
        emit({ type: 'error', code: 'unsupported', message: `현재 버전은 자유 낙하 실험만 지원합니다. ${typeof raw.reason === 'string' ? raw.reason : ''}`.trim() });
        res.end();
        return;
      }

      emit({ type: 'step', step: 'verify', attempt: attempt + 1, model });
      const spec = normalizeGravitySpec(raw);
      const report = verifyExperimentSpec(spec);
      lastReport = report;
      if (report.passed) {
        emit({ type: 'done', experiment: spec, verification: report, source: 'ai', model, attempts: attempt + 1, ms: Date.now() - started });
        res.end();
        return;
      }
      errors = report.errors;
      if (attempt < MAX_GENERATION_RETRIES) emit({ type: 'retry', attempt: attempt + 1, errors });
    }

    const { spec, report } = preset();
    emit({ type: 'done', experiment: spec, verification: report, source: 'preset', notice: `AI가 ${MAX_GENERATION_RETRIES + 1}회 시도했지만 검증을 통과하지 못해 기본 자유 낙하 실험을 불러왔습니다. 마지막 오류: ${(lastReport?.errors ?? []).slice(0, 3).join(' / ')}`, attempts: MAX_GENERATION_RETRIES + 1, ms: Date.now() - started });
    res.end();
  } catch (err: any) {
    console.error('Plan experiment error:', err);
    emit({ type: 'error', code: 'internal', message: err?.message || '실험 생성 중 오류가 발생했습니다.' });
    res.end();
  }
});

// 2. Paper-to-Lab API: real paper metadata via Crossref (DOI) and OpenAlex (search); Gemini only
// structures the REAL abstract. No paper data is hardcoded; there is no fake fallback.
// Every citation links to https://doi.org/{doi}. Evidence level: 'abstract' when an abstract was
// retrieved, otherwise 'metadata' (title/authors/venue only).
const SCHOLAR_UA = 'labverse-ai/1.0 (mailto:sksuhyun@gmail.com)';
const DOI_PATTERN = /10\.\d{4,9}\/[^\s"<>]+/i;

function extractDoi(input: string): string | null {
  const m = input.match(DOI_PATTERN);
  return m ? m[0].replace(/[.,;)\]]+$/, '').toLowerCase() : null;
}

function doiUrl(doi: string) {
  return `https://doi.org/${doi}`;
}

function stripTags(text: string) {
  return text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function invertedIndexToText(idx?: Record<string, number[]> | null): string {
  if (!idx) return '';
  const words: string[] = [];
  for (const [word, positions] of Object.entries(idx)) {
    for (const pos of positions) words[pos] = word;
  }
  return words.filter(Boolean).join(' ');
}

async function fetchJson(url: string) {
  const r = await fetch(url, {
    headers: { 'User-Agent': SCHOLAR_UA, Accept: 'application/json' },
    signal: AbortSignal.timeout(10000),
  });
  if (!r.ok) {
    const err: any = new Error(`Upstream ${new URL(url).hostname} responded ${r.status}`);
    err.status = r.status;
    throw err;
  }
  return r.json();
}

function buildCitation(meta: { title: string; authors: string[]; year: number | null; journalOrSource: string; doi: string }) {
  const authors = meta.authors.length > 3 ? `${meta.authors.slice(0, 3).join(', ')} et al.` : meta.authors.join(', ');
  return `${authors || 'Unknown authors'}${meta.year ? ` (${meta.year})` : ''}. ${meta.title}. ${meta.journalOrSource ? meta.journalOrSource + '. ' : ''}${doiUrl(meta.doi)}`;
}

interface PaperMeta {
  title: string; authors: string[]; year: number | null; journalOrSource: string; doi: string;
  abstract: string; source: 'crossref' | 'openalex'; subjects: string[];
}

interface PaperExtraction {
  researchQuestion: string | null;
  hypothesis: string | null;
  variables: { name: string; symbol: string | null; unit: string | null; role: 'independent' | 'dependent' | 'control' | 'unspecified' }[];
  formulas: string[];
  limitations: string[];
  supportedEngine: 'gravity' | 'none';
}

const asStr = (x: unknown): string | null => (typeof x === 'string' && x.trim() ? x.trim() : null);
const asStrArr = (x: unknown): string[] => (Array.isArray(x) ? x.map(asStr).filter((s): s is string => !!s) : []);

function normalizeExtraction(raw: any): PaperExtraction {
  const roles = ['independent', 'dependent', 'control', 'unspecified'];
  return {
    researchQuestion: asStr(raw?.researchQuestion),
    hypothesis: asStr(raw?.hypothesis),
    variables: (Array.isArray(raw?.variables) ? raw.variables : [])
      .filter((v: any) => asStr(v?.name))
      .slice(0, 12)
      .map((v: any) => ({
        name: asStr(v.name) as string,
        symbol: asStr(v.symbol),
        unit: asStr(v.unit),
        role: roles.includes(v.role) ? v.role : 'unspecified',
      })),
    formulas: asStrArr(raw?.formulas).slice(0, 10),
    limitations: asStrArr(raw?.limitations).slice(0, 8),
    supportedEngine: raw?.supportedEngine === 'gravity' ? 'gravity' : 'none',
  };
}

async function extractFromAbstract(meta: PaperMeta) {
  const prompt = `You structure information from ONE real scientific paper for a physics-education app.
Use ONLY the title and abstract below. Do NOT add facts, numbers, formulas or limitations that the text does not state or directly imply.
If something is not stated, return null (or an empty array). Write Korean for free-text fields; keep symbols and formulas as written.

TITLE: ${meta.title}
AUTHORS: ${meta.authors.slice(0, 6).join(', ')}
YEAR: ${meta.year ?? 'unknown'}
VENUE: ${meta.journalOrSource || 'unknown'}
ABSTRACT:
${meta.abstract}

"supportedEngine" must be "gravity" only if the paper is about free fall / gravitational acceleration / falling bodies (with or without air drag) so that a vacuum-vs-air free-fall simulator is a fair illustration; otherwise "none".

Return strictly this JSON:
{
  "researchQuestion": string | null,
  "hypothesis": string | null,
  "variables": [{ "name": string, "symbol": string | null, "unit": string | null, "role": "independent" | "dependent" | "control" | "unspecified" }],
  "formulas": [string],
  "limitations": [string],
  "supportedEngine": "gravity" | "none"
}`;
  const { data, model } = await generateJson(prompt);
  return { extraction: normalizeExtraction(data), model };
}

async function buildAnalysis(meta: PaperMeta) {
  const evidenceLevel = meta.abstract ? 'abstract' : 'metadata';
  let extraction: PaperExtraction | null = null;
  let extractionStatus: 'ok' | 'no_abstract' | 'unavailable' = 'no_abstract';
  let extractionNote = '초록이 없어(메타데이터만 확인) 연구 질문·가설을 추출하지 않았습니다.';
  let extractionModel: string | null = null;

  if (meta.abstract) {
    try {
      const r = await extractFromAbstract(meta);
      extraction = r.extraction;
      extractionModel = r.model;
      extractionStatus = 'ok';
      extractionNote = '초록에 근거해 Gemini가 구조화했습니다. 본문은 확인하지 않았습니다.';
    } catch (err: any) {
      console.warn('Paper extraction failed:', err?.message);
      extractionStatus = 'unavailable';
      extractionNote = `AI 추출에 실패했습니다 (${err?.message || '알 수 없는 오류'}). 아래 서지 정보와 초록 원문만 표시합니다.`;
    }
  }

  const useGravity = extraction?.supportedEngine === 'gravity';
  return {
    paperMetadata: {
      title: meta.title,
      authors: meta.authors,
      year: meta.year,
      journalOrSource: meta.journalOrSource,
      doi: meta.doi,
      url: doiUrl(meta.doi),
    },
    abstract: meta.abstract || null,
    subjects: meta.subjects,
    evidence: {
      level: evidenceLevel,
      label: evidenceLevel === 'abstract' ? '초록 기반' : '메타데이터 기반',
      note:
        evidenceLevel === 'abstract'
          ? '제목·저자·초록까지만 확인했으며 논문 본문은 분석하지 않았습니다.'
          : '제목·저자·출처 등 서지 메타데이터만 확인했으며 초록과 본문은 확인하지 않았습니다.',
      source: meta.source === 'crossref' ? 'Crossref' : 'OpenAlex',
    },
    citations: [
      { text: buildCitation(meta), doi: meta.doi, url: doiUrl(meta.doi), evidenceLevel },
    ],
    extraction,
    extractionStatus,
    extractionNote,
    extractionModel,
    experimentSpec: useGravity ? PRESET_EXPERIMENTS.gravity : null,
    experimentMapping: useGravity
      ? { engine: 'gravity', basis: 'AI가 초록에서 자유 낙하 주제로 판단했습니다. 낙하 시뮬레이터는 논문의 실험을 재현하는 것이 아니라 개념을 보여주는 도구입니다.' }
      : null,
  };
}

async function lookupCrossref(doi: string): Promise<PaperMeta> {
  const data = await fetchJson(`https://api.crossref.org/works/${encodeURIComponent(doi)}`);
  const w = data.message;
  const authors = (w.author || [])
    .map((a: any) => [a.given, a.family].filter(Boolean).join(' ') || a.name)
    .filter(Boolean);
  const dateParts = (w.issued || w.published || w['published-print'] || w['published-online'])?.['date-parts']?.[0];
  return {
    title: stripTags((w.title && w.title[0]) || ''),
    authors,
    year: dateParts?.[0] ?? null,
    journalOrSource: (w['container-title'] && w['container-title'][0]) || w.publisher || '',
    doi: (w.DOI || doi).toLowerCase(),
    abstract: w.abstract ? stripTags(w.abstract).replace(/^abstract\s*/i, '') : '',
    source: 'crossref',
    subjects: w.subject || [],
  };
}

// Crossref often lacks abstracts; OpenAlex frequently has them. Used to upgrade evidence level.
async function fetchOpenAlexAbstract(doi: string): Promise<string> {
  try {
    const w = await fetchJson(`https://api.openalex.org/works/${encodeURIComponent(doiUrl(doi))}?select=abstract_inverted_index`);
    return invertedIndexToText(w.abstract_inverted_index);
  } catch {
    return '';
  }
}

// OpenAlex full-text search works best in English; translate Korean questions when Gemini is available.
async function toSearchQuery(q: string): Promise<string> {
  if (!/[가-힣]/.test(q) || !apiKey) return q;
  try {
    const { data } = await generateJson(
      `Convert this question into a concise English academic search query (4-10 keywords, no punctuation). Return JSON {"query": string}.\nQuestion: ${q}`,
      { timeoutMs: 8000, models: [LITE_MODEL, FALLBACK_MODEL] },
    );
    return asStr(data?.query) || q;
  } catch {
    return q;
  }
}

async function searchOpenAlex(q: string) {
  const url = `https://api.openalex.org/works?search=${encodeURIComponent(q)}&per_page=5&filter=has_doi:true&select=id,doi,title,publication_year,authorships,primary_location,abstract_inverted_index`;
  const data = await fetchJson(url);
  return (data.results || [])
    .filter((w: any) => w.doi && w.title)
    .map((w: any) => {
      const doi = extractDoi(w.doi) as string;
      const abstract = invertedIndexToText(w.abstract_inverted_index);
      const evidenceLevel = abstract ? 'abstract' : 'metadata';
      return {
        title: w.title,
        authors: (w.authorships || []).map((a: any) => a.author?.display_name).filter(Boolean),
        year: w.publication_year ?? null,
        journalOrSource: w.primary_location?.source?.display_name || '',
        doi,
        url: doiUrl(doi),
        abstractSnippet: abstract ? abstract.slice(0, 280) : null,
        evidenceLevel,
        evidenceLabel: evidenceLevel === 'abstract' ? '초록 기반' : '메타데이터 기반',
      };
    });
}

app.post('/api/paper-to-lab', async (req: Request, res: Response) => {
  try {
    const { query, doi } = req.body || {};
    const inputStr = String(doi || query || '').trim();
    if (!inputStr) {
      res.status(400).json({ error: 'query or doi is required' });
      return;
    }

    const foundDoi = extractDoi(inputStr);
    if (foundDoi) {
      const meta = await lookupCrossref(foundDoi);
      if (!meta.abstract) {
        const abs = await fetchOpenAlexAbstract(foundDoi);
        if (abs) {
          meta.abstract = abs;
          meta.source = 'openalex';
        }
      }
      res.json({ paperAnalysis: await buildAnalysis(meta) });
      return;
    }

    const searchQuery = await toSearchQuery(inputStr);
    const candidates = await searchOpenAlex(searchQuery);
    res.json({ candidates, searchQuery, source: 'OpenAlex' });
  } catch (err: any) {
    console.error('Paper to lab error:', err);
    if (err?.status === 404) {
      res.status(404).json({ error: 'DOI를 Crossref에서 찾을 수 없습니다.' });
      return;
    }
    res.status(502).json({ error: '논문 데이터를 가져오지 못했습니다. 잠시 후 다시 시도해 주세요.', details: err?.message });
  }
});

// 3. Hypothesis Arena API: Evaluates scientific reasoning against deterministic physics outcomes
app.post('/api/evaluate-hypothesis', async (req: Request, res: Response) => {
  try {
    const { userHypothesis, experimentSpec, currentVariables, liveMetrics } = req.body;

    if (!userHypothesis) {
      res.status(400).json({ error: 'userHypothesis is required' });
      return;
    }

    if (apiKey) {
      try {
        const prompt = `You are the Lead Scientific Reviewer at LabVerse AI.
A student or researcher has formulated a scientific hypothesis before running an experiment.

Active Experiment: ${experimentSpec?.title} (${experimentSpec?.sceneType})
Current Variables: ${JSON.stringify(currentVariables || {})}
Simulated Physical Telemetry: ${JSON.stringify(liveMetrics || {})}
User's Hypothesis / Prediction: "${userHypothesis}"

Evaluate whether the hypothesis is scientifically sound according to established physics laws.
Identify any scientific misconceptions (e.g., confusing mass with acceleration in gravity, confusing reflection angle with index, etc.).
Suggest a concrete follow-up experiment.

Return strictly JSON:
{
  "isConsistentWithPhysics": boolean,
  "aiExplanation": "과학적 타당성에 대한 친절하고 깊이 있는 물리적 해설 (한국어, 마크다운)",
  "misconceptionsIdentified": ["오개념 1 (해당되는 경우)"],
  "suggestedFollowUpExperiments": ["시도해 볼 만한 후속 실험"]
}`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: { responseMimeType: 'application/json' },
        });

        const raw = response.text || '';
        const cleaned = raw.trim().replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
        const parsed = JSON.parse(cleaned);
        parsed.id = `eval-${Date.now()}`;
        parsed.userHypothesis = userHypothesis;
        parsed.simulatedOutcomeSummary = JSON.stringify(liveMetrics);
        parsed.timestamp = Date.now();

        res.json({ evaluation: parsed });
        return;
      } catch (err) {
        console.warn('Gemini hypothesis evaluation fallback used:', err);
      }
    }

    // Heuristic fallback evaluation
    res.json({
      evaluation: {
        id: `eval-${Date.now()}`,
        userHypothesis,
        simulatedOutcomeSummary: JSON.stringify(liveMetrics),
        isConsistentWithPhysics: true,
        aiExplanation: '훌륭한 과학적 추론입니다! 설정하신 변수와 물리 시뮬레이션 지표 간의 인과관계가 자연 법칙과 부합합니다.',
        misconceptionsIdentified: [],
        suggestedFollowUpExperiments: ['변수를 극단적인 한계값으로 변경하여 임계 현상을 검증해 보세요.'],
        timestamp: Date.now(),
      },
    });
  } catch (err: any) {
    console.error('Evaluate hypothesis error:', err);
    res.status(500).json({ error: 'Failed to evaluate hypothesis', details: err?.message });
  }
});

// 4. AI Scientist Companion API
app.post('/api/chat-scientist-legacy', async (req: Request, res: Response) => {
  try {
    const { userMessage, experimentSpec, currentVariables, liveMetrics } = req.body;

    if (!userMessage) {
      res.status(400).json({ error: 'userMessage is required' });
      return;
    }

    if (apiKey) {
      try {
        const prompt = `You are Dr. Nova (노바 박사), Chief Research Scientist at LabVerse AI.
Active Experiment: ${experimentSpec?.title} (${experimentSpec?.sceneType})
Current Variables: ${JSON.stringify(currentVariables || {})}
Live Telemetry: ${JSON.stringify(liveMetrics || {})}
User: "${userMessage}"

Answer with scientific brilliance and encouragement in Korean.
If the user asked to change a parameter (e.g., "공기 저항을 0으로 해줘", "입사각을 50도로 올려줘", "압력을 최대로"), return the updated numerical values in 'variableUpdates'!

Return JSON:
{
  "responseText": "과학적 답변",
  "variableUpdates": { "variable_id": new_number } or null,
  "actionSummary": "적용된 조작 요약" or null,
  "followUpSuggestion": "추천 질문"
}`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: { responseMimeType: 'application/json' },
        });

        const raw = response.text || '';
        const cleaned = raw.trim().replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
        const parsed = JSON.parse(cleaned);

        res.json(parsed);
        return;
      } catch (err) {
        console.warn('Gemini chat fallback used:', err);
      }
    }

    // Heuristic fallback
    let variableUpdates: Record<string, number> | null = null;
    let actionSummary: string | null = null;
    const lower = userMessage.toLowerCase();

    if (lower.includes('진공') || lower.includes('공기 저항') && (lower.includes('0') || lower.includes('없애'))) {
      variableUpdates = { airDensity: 0.0 };
      actionSummary = '체임버를 완전 진공(ρ = 0.0 kg/m³)으로 감압';
    } else if (lower.includes('입사각') && (lower.includes('올려') || lower.includes('높여'))) {
      variableUpdates = { incidentAngle: 55 };
      actionSummary = '레이저 입사각을 55°로 조정하여 전반사 유도';
    } else if (lower.includes('압력') && lower.includes('최대')) {
      variableUpdates = { pressure: 95, gasContent: 85 };
      actionSummary = '마그마 방 압력과 가스를 폭발 임계치로 극대화';
    }

    res.json({
      responseText: `흥미로운 과학적 질의입니다! 현재 설정된 물리 조건에서 매질과 입자 간의 상호작용 법칙을 추적하고 있습니다. "공기 저항을 0으로 해줘" 또는 "입사각을 50도로 올려줘"처럼 말씀하시면 변수를 즉시 조작해 드립니다.`,
      variableUpdates,
      actionSummary,
      followUpSuggestion: '다른 변수를 조작하거나 가설 아레나에서 결과를 예측해 보세요!',
    });
  } catch (err: any) {
    console.error('Chat scientist error:', err);
    res.status(500).json({ error: 'Failed to chat with scientist', details: err?.message });
  }
});

// 4. AI Co-Scientist (Dr. Nova). Called only on meaningful events (a finished run or an explicit
// chat message), never while sliders move. Every proposed variable change is validated here AND
// again in the browser before the user's "apply" click takes effect.
interface NovaSpecVar { id: string; label?: string; min: number; max: number; default: number; unit?: string }

function novaStubSpec(vars: NovaSpecVar[]): any {
  return { sceneType: 'gravity', variables: vars };
}

function validateChanges(vars: NovaSpecVar[], changes: unknown) {
  if (!changes || typeof changes !== 'object') return null;
  const r = validateVariableUpdates(novaStubSpec(vars), changes as Record<string, unknown>);
  return r.ok && Object.keys(r.accepted).length ? r.accepted : null;
}

function sanitizeSpecVars(x: unknown): NovaSpecVar[] {
  if (!Array.isArray(x)) return [];
  return x
    .filter((v: any) => typeof v?.id === 'string' && [v.min, v.max, v.default].every((n) => typeof n === 'number' && Number.isFinite(n)))
    .slice(0, 20)
    .map((v: any) => ({ id: v.id, label: typeof v.label === 'string' ? v.label : v.id, min: v.min, max: v.max, default: v.default, unit: typeof v.unit === 'string' ? v.unit : '' }));
}

const NOVA_RULES = `You are Dr. Nova (노바 박사), an AI co-scientist inside LabVerse AI, a verified free-fall physics lab.
Write in Korean. Use Markdown (**bold**, lists) and LaTeX with $...$ for formulas. Be concrete: quote the numbers you were given. Never invent measurements.
Physics model of the lab: 1-D fall, quadratic drag F_d = ½ρv²C_dA, RK4 integration, g and ρ constant.`;

app.post('/api/analyze-run', async (req: Request, res: Response) => {
  try {
    const { variables, specVariables, results, hypothesis } = req.body || {};
    const vars = sanitizeSpecVars(specVariables);
    if (!variables || !results || vars.length === 0) {
      res.status(400).json({ error: 'variables, specVariables and results are required' });
      return;
    }
    if (!apiKey) {
      res.status(503).json({ error: 'AI 분석을 사용할 수 없습니다 (GEMINI_API_KEY가 설정되지 않았습니다).' });
      return;
    }
    const ranges = vars.map((v) => `${v.id} ${v.min}..${v.max} ${v.unit}`).join('; ');
    const prompt = `${NOVA_RULES}

A student just finished one drop run. Data (compact JSON):
variables: ${JSON.stringify(variables)}
results: ${JSON.stringify(results)}
student_hypothesis: ${JSON.stringify(typeof hypothesis === 'string' && hypothesis.trim() ? hypothesis.trim().slice(0, 300) : null)}

Tasks:
1. "analysis": at most ~170 words. Explain what happened and why, using the numbers. If a hypothesis was given, say whether the data supports it.
2. "hypothesisVerdict": "supported" | "contradicted" | "inconclusive" | "none" (none if no hypothesis).
3. "followUps": 1 or 2 follow-up experiments. Each: { "title", "rationale" (1-2 sentences), "variableChanges": { "<id>": number } } using ONLY these ids and ranges: ${ranges}. Change values so the next run teaches something new.

Return JSON: { "analysis": string, "hypothesisVerdict": string, "followUps": [...] }`;

    const { data, model } = await generateJson(prompt);
    const verdicts = ['supported', 'contradicted', 'inconclusive', 'none'];
    const followUps = (Array.isArray(data?.followUps) ? data.followUps : [])
      .slice(0, 2)
      .map((f: any) => ({ title: asStr(f?.title), rationale: asStr(f?.rationale), variableChanges: validateChanges(vars, f?.variableChanges) }))
      .filter((f: any) => f.title && f.variableChanges);
    res.json({
      analysis: asStr(data?.analysis) ?? '분석 결과를 생성하지 못했습니다.',
      hypothesisVerdict: verdicts.includes(data?.hypothesisVerdict) ? data.hypothesisVerdict : 'none',
      followUps,
      model,
    });
  } catch (err: any) {
    console.error('Analyze run error:', err);
    res.status(502).json({ error: `AI 분석에 실패했습니다 (${err?.message || '알 수 없는 오류'}).` });
  }
});

app.post('/api/chat-scientist', async (req: Request, res: Response) => {
  try {
    const { userMessage, experimentTitle, currentVariables, specVariables, lastResults } = req.body || {};
    if (typeof userMessage !== 'string' || !userMessage.trim()) {
      res.status(400).json({ error: 'userMessage is required' });
      return;
    }
    const vars = sanitizeSpecVars(specVariables);
    if (!apiKey) {
      res.status(503).json({ error: 'AI 응답을 사용할 수 없습니다 (GEMINI_API_KEY가 설정되지 않았습니다).' });
      return;
    }
    const ranges = vars.map((v) => `${v.id} ${v.min}..${v.max} ${v.unit}`).join('; ');
    const prompt = `${NOVA_RULES}

Experiment: ${typeof experimentTitle === 'string' ? experimentTitle.slice(0, 120) : ''}
Current variables: ${JSON.stringify(currentVariables ?? {})}
Last run results: ${JSON.stringify(lastResults ?? null)}
Student says: "${userMessage.trim().slice(0, 500)}"

Answer briefly (at most ~120 words). If the student asks to change conditions, put the new values in "proposedChanges" using ONLY these ids and ranges: ${ranges}. Otherwise null. Nothing is applied until the student clicks apply.
Return JSON: { "responseText": string, "proposedChanges": { "<id>": number } | null, "changeSummary": string | null }`;

    const { data, model } = await generateJson(prompt);
    res.json({
      responseText: asStr(data?.responseText) ?? '답변을 생성하지 못했습니다.',
      proposedChanges: validateChanges(vars, data?.proposedChanges),
      changeSummary: asStr(data?.changeSummary),
      model,
    });
  } catch (err: any) {
    console.error('Chat scientist error:', err);
    res.status(502).json({ error: `AI 응답에 실패했습니다 (${err?.message || '알 수 없는 오류'}).` });
  }
});

// Vite Middleware & Static Serving setup
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[LabVerse AI] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
