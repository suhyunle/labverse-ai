/**
 * Normaliser for multi-domain labs.
 *
 * The free-fall lab has a dedicated engine and its own normaliser (gravitySpec.ts). Every other
 * query produces a declarative lab: the model picks the variables, and each observable carries an
 * arithmetic formula over those variable ids. Nothing here is trusted — callers must run
 * verifyExperimentSpec on the result, which is what proves the readouts really respond to the
 * controls.
 */

import type {
  ExperimentDomain,
  ExperimentSpec,
  GuidedStep,
  ObservableOutput,
  SceneType,
  ScientificPrinciple,
  UiComponent,
  VariableSpec,
} from '../types';
import { withEngineDefaults } from './sceneCatalog';

const DOMAINS: ExperimentDomain[] = [
  'physics', 'optics', 'fluid_dynamics', 'earth_science', 'astronomy', 'chemistry', 'biology', 'general',
];

const SCENES: SceneType[] = [
  'gravity', 'optics', 'fluid', 'volcano', 'solar_system', 'buoyancy', 'conceptual',
];

const num = (x: unknown): number | null => (typeof x === 'number' && Number.isFinite(x) ? x : null);
const str = (x: unknown): string | null => (typeof x === 'string' && x.trim() ? x.trim() : null);
const strArr = (x: unknown): string[] => (Array.isArray(x) ? x.map(str).filter((s): s is string => !!s) : []);

/** Keeps ids usable inside formulas; Korean belongs in `label`. */
const ID_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

function normalizeUi(raw: unknown, depth = 0): UiComponent[] {
  if (!Array.isArray(raw) || depth > 3) return [];
  const out: UiComponent[] = [];
  for (const c of raw as any[]) {
    if (c?.type === 'group' && str(c.title)) {
      out.push({ type: 'group', title: str(c.title)!, children: normalizeUi(c.children, depth + 1) });
    } else if (c?.type === 'slider' && str(c.variableId)) {
      out.push({ type: 'slider', variableId: str(c.variableId)! });
    } else if (c?.type === 'preset_buttons' && Array.isArray(c.options)) {
      const options = c.options
        .map((o: any) => {
          const values: Record<string, number> = {};
          for (const [k, v] of Object.entries(o?.values ?? {})) if (num(v) !== null) values[k] = v as number;
          return str(o?.label) && Object.keys(values).length ? { label: str(o.label)!, values } : null;
        })
        .filter(Boolean) as { label: string; values: Record<string, number> }[];
      if (options.length) out.push({ type: 'preset_buttons', label: str(c.label) ?? undefined, options });
    }
  }
  return out;
}

function normalizeVariables(raw: unknown): VariableSpec[] {
  const list = Array.isArray(raw) ? raw : [];
  const seen = new Set<string>();
  const out: VariableSpec[] = [];
  for (const v of list as any[]) {
    const id = str(v?.id);
    if (!id || !ID_RE.test(id) || seen.has(id)) continue;
    let min = num(v?.min) ?? 0;
    let max = num(v?.max) ?? min + 1;
    if (min > max) [min, max] = [max, min];
    if (min === max) max = min + 1;
    const def = Math.min(Math.max(num(v?.default) ?? min + (max - min) / 2, min), max);
    const step = num(v?.step);
    seen.add(id);
    out.push({
      id,
      label: str(v?.label) ?? id,
      min,
      max,
      default: def,
      step: step && step > 0 ? step : Number(((max - min) / 100).toPrecision(2)),
      unit: typeof v?.unit === 'string' ? v.unit.trim() : '',
      description: str(v?.description) ?? '',
      category: str(v?.category) ?? undefined,
    });
  }
  return out;
}

function normalizeObservables(raw: unknown): ObservableOutput[] {
  const list = Array.isArray(raw) ? raw : [];
  const seen = new Set<string>();
  const out: ObservableOutput[] = [];
  for (const o of list as any[]) {
    const id = str(o?.id);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const decimals = num(o?.decimals);
    out.push({
      id,
      label: str(o?.label) ?? id,
      unit: typeof o?.unit === 'string' ? o.unit.trim() : '',
      formula: str(o?.formula) ?? undefined,
      description: str(o?.description) ?? str(o?.label) ?? '',
      decimals: decimals !== null && decimals >= 0 && decimals <= 6 ? Math.round(decimals) : undefined,
    });
  }
  return out;
}

function normalizePrinciples(raw: unknown, formulas: string[]): ScientificPrinciple[] {
  const list = Array.isArray(raw) ? raw : [];
  const out: ScientificPrinciple[] = [];
  for (const p of list as any[]) {
    const name = str(p?.name);
    if (!name) continue;
    out.push({ name, description: str(p?.description) ?? '', formula: str(p?.formula) ?? undefined });
  }
  if (out.length) return out;
  return formulas.map((f) => ({ name: f, description: '', formula: f }));
}

function normalizeSteps(raw: unknown): GuidedStep[] {
  return (Array.isArray(raw) ? raw : [])
    .filter((g: any) => str(g?.title) && str(g?.instruction))
    .map((g: any, i: number) => ({
      stepNumber: i + 1,
      title: str(g.title)!,
      instruction: str(g.instruction)!,
      targetAction: str(g?.targetAction) ?? undefined,
    }));
}

/** One slider per variable, grouped by the variable's own `category` when it supplies one. */
export function defaultUiFor(variables: VariableSpec[]): UiComponent[] {
  if (!variables.length) return [];
  const groups = new Map<string, VariableSpec[]>();
  for (const v of variables) {
    const key = v.category ?? '실험 변수';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(v);
  }
  return [...groups.entries()].map(([title, vs]) => ({
    type: 'group' as const,
    title,
    children: vs.map((v) => ({ type: 'slider' as const, variableId: v.id })),
  }));
}

export function normalizeLabSpec(raw: any, now: number = Date.now()): ExperimentSpec {
  const sceneRaw = (SCENES.includes(raw?.sceneType) ? raw.sceneType : 'conceptual') as SceneType;
  // A dedicated scene drives itself from fixed ids; top up whatever the model forgot so a
  // near-miss spec still produces a live lab instead of a frozen one.
  const variables = withEngineDefaults(sceneRaw, normalizeVariables(raw?.variables));
  const observableOutputs = normalizeObservables(raw?.observables ?? raw?.observableOutputs);
  const formulas = strArr(raw?.formulas);
  const sceneType = sceneRaw;
  const domain = (DOMAINS.includes(raw?.domain) ? raw.domain : 'general') as ExperimentDomain;

  const ui = normalizeUi(raw?.uiComponents);
  const hasSlider = (list: UiComponent[]): boolean =>
    list.some((c) => c.type === 'slider' || (c.type === 'group' && hasSlider(c.children)));
  const declared = new Set(variables.map((v) => v.id));
  const prune = (list: UiComponent[]): UiComponent[] =>
    list
      .map((c) => {
        if (c.type === 'group') {
          const children = prune(c.children);
          return children.length ? { ...c, children } : null;
        }
        if (c.type === 'slider') return declared.has(c.variableId) ? c : null;
        const options = c.options.filter((o) => Object.keys(o.values).every((k) => declared.has(k)));
        return options.length ? { ...c, options } : null;
      })
      .filter(Boolean) as UiComponent[];
  const prunedUi = prune(ui);

  return {
    id: `exp-ai-${now}`,
    title: str(raw?.title) ?? '생성된 실험',
    domain,
    sceneType,
    learningObjectives: strArr(raw?.learningObjectives),
    scientificPrinciples: normalizePrinciples(raw?.scientificPrinciples, formulas),
    variables,
    observableOutputs,
    formulas,
    uiComponents: prunedUi.length && hasSlider(prunedUi) ? prunedUi : defaultUiFor(variables),
    simulationModel: sceneType === 'conceptual' ? 'spec_formulas' : sceneType,
    visualEffects: strArr(raw?.visualEffects),
    safetyNotes: strArr(raw?.safetyNotes),
    explanation: str(raw?.explanation) ?? '',
    guidedSteps: normalizeSteps(raw?.guidedSteps),
    suggestedQueries: strArr(raw?.suggestedQueries),
    isConceptualOnly: sceneType === 'conceptual',
    limitations: str(raw?.limitations) ?? undefined,
  };
}
