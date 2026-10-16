import type { ExperimentSpec, UiComponent, VariableSpec } from '../types';
import { FALL_BODY_PRESETS, GRAVITY_PLANET_PRESETS } from '../engines/gravity';

/** Variables the gravity engine understands, with the physical envelope a spec may use. */
export const GRAVITY_VARIABLE_CATALOG: Record<string, Omit<VariableSpec, 'id'>> = {
  dropHeight: { label: '낙하 높이', min: 1, max: 100, default: 30, step: 1, unit: 'm', description: '물체를 놓는 높이' },
  gravity: { label: '중력 가속도', min: 0.1, max: 30, default: 9.81, step: 0.01, unit: 'm/s²', description: '달 1.62, 화성 3.71, 지구 9.81, 목성 24.79' },
  airDensity: { label: '공기 밀도', min: 0, max: 1.5, default: 0, step: 0.05, unit: 'kg/m³', description: '0이면 진공, 지구 해수면은 약 1.2' },
  massA: { label: '물체 A 질량', min: 0.001, max: 50, default: 6, step: 0.001, unit: 'kg', description: '물체 A의 질량' },
  areaA: { label: '물체 A 단면적', min: 0.0005, max: 0.2, default: 0.0366, step: 0.0005, unit: 'm²', description: '낙하 방향에서 본 단면적' },
  cdA: { label: '물체 A 항력계수', min: 0.04, max: 2, default: 0.47, step: 0.01, unit: '', description: '구는 약 0.47' },
  massB: { label: '물체 B 질량', min: 0.001, max: 50, default: 0.005, step: 0.001, unit: 'kg', description: '물체 B의 질량' },
  areaB: { label: '물체 B 단면적', min: 0.0005, max: 0.2, default: 0.0078, step: 0.0005, unit: 'm²', description: '낙하 방향에서 본 단면적' },
  cdB: { label: '물체 B 항력계수', min: 0.04, max: 2, default: 1.3, step: 0.01, unit: '', description: '깃털 같은 납작한 물체는 1 이상' },
};

const OBSERVABLE_CATALOG: Record<string, { label: string; unit: string }> = {
  fallTimeA: { label: '물체 A 낙하 시간', unit: 's' },
  fallTimeB: { label: '물체 B 낙하 시간', unit: 's' },
  impactVelocityA: { label: '물체 A 착지 속도', unit: 'm/s' },
  impactVelocityB: { label: '물체 B 착지 속도', unit: 'm/s' },
  vacuumFallTime: { label: '진공 이론 낙하 시간', unit: 's' },
};

const bodyOptions = (which: 'A' | 'B') =>
  Object.values(FALL_BODY_PRESETS).map((p) => ({
    label: p.name,
    values: { [`mass${which}`]: p.body.massKg, [`area${which}`]: p.body.areaM2, [`cd${which}`]: p.body.dragCoefficient },
  }));

export const DEFAULT_GRAVITY_UI: UiComponent[] = [
  {
    type: 'group',
    title: '환경 조건',
    children: [
      {
        type: 'preset_buttons',
        options: [
          ...GRAVITY_PLANET_PRESETS.map((p) => ({ label: `${p.name} ${p.g}`, values: { gravity: p.g } })),
          { label: '진공', values: { airDensity: 0 } },
          { label: '지구 대기 1.2', values: { airDensity: 1.2 } },
        ],
      },
      { type: 'slider', variableId: 'dropHeight' },
      { type: 'slider', variableId: 'gravity' },
      { type: 'slider', variableId: 'airDensity' },
    ],
  },
  ...(['A', 'B'] as const).map<UiComponent>((w) => ({
    type: 'group',
    title: `물체 ${w}`,
    children: [
      { type: 'preset_buttons', options: bodyOptions(w) },
      { type: 'slider', variableId: `mass${w}` },
      { type: 'slider', variableId: `area${w}` },
      { type: 'slider', variableId: `cd${w}` },
    ],
  })),
];

export function buildGravityPresetSpec(): ExperimentSpec {
  return {
    id: 'exp-gravity-freefall',
    title: '갈릴레오-뉴턴 자유 낙하 및 진공 가속도 실험실',
    domain: 'physics',
    sceneType: 'gravity',
    learningObjectives: [
      '진공에서는 질량과 무관하게 모든 물체가 같은 가속도 g로 낙하함을 확인한다',
      '공기 저항 환경에서 단면적과 항력계수에 따른 종단 속도를 관찰한다',
      '행성별 중력(달, 화성, 지구, 목성)에 따른 낙하 시간 t = √(2h/g)를 비교한다',
    ],
    scientificPrinciples: [
      { name: '진공 자유 낙하', description: '초기 속도가 0인 자유 낙하의 위치와 낙하 시간.', formula: 'y(t) = h - \\frac{1}{2} g t^2, \\quad t = \\sqrt{\\frac{2h}{g}}' },
      { name: '이차 공기 저항', description: '속도의 제곱에 비례하는 항력이 중력과 평형을 이루면 종단 속도에 도달합니다.', formula: 'F_d = \\frac{1}{2} \\rho v^2 C_d A, \\quad v_t = \\sqrt{\\frac{2 m g}{\\rho C_d A}}' },
    ],
    variables: Object.entries(GRAVITY_VARIABLE_CATALOG).map(([id, v]) => ({ id, ...v })),
    observableOutputs: Object.entries(OBSERVABLE_CATALOG).map(([id, o]) => ({ id, ...o, description: o.label })),
    formulas: ['t = sqrt(2h/g)', 'v = g t', 'v = sqrt(2gh)', 'F_d = 0.5 rho v^2 C_d A'],
    uiComponents: DEFAULT_GRAVITY_UI,
    simulationModel: 'rk4_quadratic_drag',
    visualEffects: [],
    safetyNotes: [],
    explanation: '갈릴레오는 공기 저항이 없다면 무게와 관계없이 모든 물체가 같은 가속도로 떨어진다고 주장했습니다. 공기 밀도를 올리면 단면적 대비 질량이 작은 물체가 더 늦게 떨어집니다.',
    guidedSteps: [
      { stepNumber: 1, title: '진공에서 낙하', instruction: '공기 밀도를 0(진공)으로 두고 두 물체가 동시에 착지하는지 확인하세요.', targetAction: 'airDensity == 0' },
      { stepNumber: 2, title: '공기 저항 도입', instruction: '공기 밀도를 1.2 kg/m³로 올리고 깃털이 늦게 떨어지는 것을 관찰하세요.', targetAction: 'airDensity > 1.0' },
      { stepNumber: 3, title: '달에서 낙하', instruction: '중력을 1.62 m/s²로 낮춰 낙하 시간이 어떻게 달라지는지 확인하세요.', targetAction: 'gravity < 2.0' },
    ],
    suggestedQueries: [],
    limitations: '낙하 방향의 1차원 운동과 속도 제곱 항력만 다루며, 회전·양력·공기 밀도 변화(고도 효과)는 무시합니다.',
  };
}

const num = (x: unknown): number | null => (typeof x === 'number' && Number.isFinite(x) ? x : null);
const str = (x: unknown): string | null => (typeof x === 'string' && x.trim() ? x.trim() : null);
const strArr = (x: unknown): string[] => (Array.isArray(x) ? x.map(str).filter((s): s is string => !!s) : []);

function normalizeUi(raw: unknown, depth = 0): UiComponent[] {
  if (!Array.isArray(raw) || depth > 3) return [];
  const out: UiComponent[] = [];
  for (const c of raw as any[]) {
    if (c?.type === 'group' && str(c.title)) out.push({ type: 'group', title: str(c.title)!, children: normalizeUi(c.children, depth + 1) });
    else if (c?.type === 'slider' && str(c.variableId)) out.push({ type: 'slider', variableId: str(c.variableId)! });
    else if (c?.type === 'preset_buttons' && Array.isArray(c.options)) {
      const options = c.options
        .map((o: any) => {
          const values: Record<string, number> = {};
          for (const [k, v] of Object.entries(o?.values ?? {})) if (num(v) !== null) values[k] = v as number;
          return str(o?.label) && Object.keys(values).length ? { label: str(o.label)!, values } : null;
        })
        .filter(Boolean);
      if (options.length) out.push({ type: 'preset_buttons', label: str(c.label) ?? undefined, options });
    }
  }
  return out;
}

/**
 * Turns the model's compact lab description into a full ExperimentSpec. Only the fields the model is
 * responsible for are read; everything structural is filled in here. The result is NOT trusted:
 * callers must run verifyExperimentSpec on it.
 */
export function normalizeGravitySpec(raw: any, now: number = Date.now()): ExperimentSpec {
  const base = buildGravityPresetSpec();
  const variables: VariableSpec[] = (Array.isArray(raw?.variables) ? raw.variables : []).map((v: any) => {
    const cat = GRAVITY_VARIABLE_CATALOG[v?.id];
    const min = num(v?.min) ?? cat?.min ?? 0;
    const max = num(v?.max) ?? cat?.max ?? 1;
    return {
      id: String(v?.id ?? ''),
      label: str(v?.label) ?? cat?.label ?? String(v?.id ?? ''),
      min,
      max,
      default: num(v?.default) ?? cat?.default ?? min,
      step: num(v?.step) ?? cat?.step ?? (max - min) / 100,
      unit: typeof v?.unit === 'string' ? v.unit : cat?.unit ?? '',
      description: str(v?.description) ?? cat?.description ?? '',
    };
  });
  const observables = (Array.isArray(raw?.observables) ? raw.observables : [])
    .map((o: any) => ({ id: str(o?.id) ?? '', label: str(o?.label) ?? '', unit: typeof o?.unit === 'string' ? o.unit : '', description: str(o?.description) ?? str(o?.label) ?? '' }));
  const formulas = strArr(raw?.formulas);
  const ui = normalizeUi(raw?.uiComponents);
  const hasSlider = (list: UiComponent[]): boolean => list.some((c) => c.type === 'slider' || (c.type === 'group' && hasSlider(c.children)));

  return {
    ...base,
    id: `exp-ai-${now}`,
    title: str(raw?.title) ?? base.title,
    learningObjectives: strArr(raw?.learningObjectives).length ? strArr(raw.learningObjectives) : base.learningObjectives,
    scientificPrinciples: formulas.map((f) => ({ name: f, description: '', formula: f })),
    variables,
    observableOutputs: observables,
    formulas,
    uiComponents: ui.length && hasSlider(ui) ? ui : undefined,
    explanation: str(raw?.explanation) ?? base.explanation,
    guidedSteps: (Array.isArray(raw?.guidedSteps) ? raw.guidedSteps : [])
      .filter((g: any) => str(g?.title) && str(g?.instruction))
      .map((g: any, i: number) => ({ stepNumber: i + 1, title: str(g.title)!, instruction: str(g.instruction)! })),
    limitations: str(raw?.limitations) ?? base.limitations,
  };
}
