import type { ExperimentSpec, UiComponent } from '../types';
import { analyticFall, bodyFromVariables, paramsFromVariables, simulateFall } from '../engines/gravity';
import { matchAllowedFormula, ALLOWED_FORMULAS } from './formulas';
import type { CheckResult, VerificationReport } from './types';

export type { CheckResult, VerificationReport } from './types';
export { ALLOWED_FORMULAS, matchAllowedFormula, normalizeFormula } from './formulas';

const SCENE_TYPES = ['gravity', 'optics', 'fluid', 'volcano', 'solar_system', 'buoyancy', 'conceptual'];

/** Physically plausible hard limits per variable id (inclusive). */
export const PHYSICAL_LIMITS: Record<string, { min: number; max: number; minExclusive?: boolean; unit: string }> = {
  dropHeight: { min: 0, max: 1000, minExclusive: true, unit: 'm' },
  gravity: { min: 0.1, max: 30, unit: 'm/s²' },
  airDensity: { min: 0, max: 1.5, unit: 'kg/m³' },
  massA: { min: 0, max: 1000, minExclusive: true, unit: 'kg' },
  massB: { min: 0, max: 1000, minExclusive: true, unit: 'kg' },
  areaA: { min: 0, max: 10, minExclusive: true, unit: 'm²' },
  areaB: { min: 0, max: 10, minExclusive: true, unit: 'm²' },
  cdA: { min: 0.01, max: 3, unit: '' },
  cdB: { min: 0.01, max: 3, unit: '' },
};

const GRAVITY_REQUIRED_VARS = ['dropHeight', 'gravity', 'airDensity'];

export function normalizeUnit(unit: unknown): string {
  let u = String(unit ?? '').trim();
  const paren = u.match(/\(([^)]*)\)/);
  if (paren) u = paren[1];
  u = u.replace(/\^2/g, '²').replace(/\^3/g, '³').replace(/s2\b/g, 's²').replace(/m3\b/g, 'm³').replace(/\s+/g, '');
  if (u === '초') u = 's';
  return u;
}

function result(id: CheckResult['id'], label: string, okMsg: string, errors: string[]): CheckResult {
  return { id, label, passed: errors.length === 0, message: errors.length === 0 ? okMsg : errors.join(' / '), errors };
}

const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const isStr = (x: unknown): x is string => typeof x === 'string' && x.length > 0;

/** (a) Required fields and their types. */
export function checkSchema(spec: unknown): CheckResult {
  const errors: string[] = [];
  const s = spec as Partial<ExperimentSpec> & Record<string, unknown>;
  if (!s || typeof s !== 'object') {
    return result('schema', '스키마 필드·타입', '', ['스펙이 객체가 아닙니다']);
  }
  if (!isStr(s.id)) errors.push('id(문자열)가 없습니다');
  if (!isStr(s.title)) errors.push('title(문자열)이 없습니다');
  if (!isStr(s.sceneType) || !SCENE_TYPES.includes(s.sceneType)) errors.push(`sceneType이 유효하지 않습니다: ${String(s.sceneType)}`);
  if (!Array.isArray(s.variables) || s.variables.length === 0) {
    errors.push('variables 배열이 비어 있거나 없습니다');
  } else {
    const seen = new Set<string>();
    s.variables.forEach((v, i) => {
      const p = `variables[${i}]`;
      if (!v || typeof v !== 'object') return errors.push(`${p}가 객체가 아닙니다`);
      if (!isStr(v.id)) errors.push(`${p}.id 누락`);
      else if (seen.has(v.id)) errors.push(`${p}.id 중복: ${v.id}`);
      else seen.add(v.id);
      if (!isStr(v.label)) errors.push(`${p}.label 누락`);
      if (typeof v.unit !== 'string') errors.push(`${p}.unit(문자열) 누락`);
      for (const k of ['min', 'max', 'default'] as const) if (!isNum(v[k])) errors.push(`${p}.${k}는 숫자여야 합니다`);
      if (isNum(v.min) && isNum(v.max) && v.min >= v.max) errors.push(`${p}: min(${v.min})은 max(${v.max})보다 작아야 합니다`);
      if (isNum(v.min) && isNum(v.max) && isNum(v.default) && (v.default < v.min || v.default > v.max)) {
        errors.push(`${p}: default(${v.default})가 [${v.min}, ${v.max}] 범위 밖입니다`);
      }
    });
  }
  if (!Array.isArray(s.observableOutputs)) errors.push('observableOutputs 배열이 없습니다');
  else {
    s.observableOutputs.forEach((o, i) => {
      if (!o || !isStr(o.id) || !isStr(o.label) || typeof o.unit !== 'string') errors.push(`observableOutputs[${i}]에 id/label/unit이 필요합니다`);
    });
  }
  if (!Array.isArray(s.formulas) || s.formulas.some((f) => typeof f !== 'string')) errors.push('formulas는 문자열 배열이어야 합니다');
  if (s.uiComponents !== undefined) {
    if (!Array.isArray(s.uiComponents)) errors.push('uiComponents는 배열이어야 합니다');
    else if (Array.isArray(s.variables)) {
      const byId = new Map<string, { min: number; max: number }>();
      for (const x of s.variables) if (x && isStr(x.id)) byId.set(x.id, { min: x.min, max: x.max });
      const walk = (list: UiComponent[], path: string) => list.forEach((c, i) => {
        const p = `${path}[${i}]`;
        if (c.type === 'group') walk(c.children, `${p}.children`);
        else if (c.type === 'slider') { if (!byId.has(c.variableId)) errors.push(`uiComponents${p}: 존재하지 않는 변수 ${c.variableId}`); }
        else if (c.type === 'preset_buttons') {
          c.options.forEach((o) => Object.entries(o.values).forEach(([id, val]) => {
            const r = byId.get(id);
            if (!r) errors.push(`프리셋 '${o.label}': 존재하지 않는 변수 ${id}`);
            else if (val < r.min || val > r.max) errors.push(`프리셋 '${o.label}': ${id}=${val}이 범위 [${r.min}, ${r.max}] 밖입니다`);
          }));
        } else errors.push(`uiComponents${p}: 알 수 없는 type`);
      });
      walk(s.uiComponents, '');
    }
  }
  return result('schema', '스키마 필드·타입', '필수 필드와 타입이 모두 올바릅니다', errors);
}

/** (b) Variable ranges against physical limits. */
export function checkRanges(spec: ExperimentSpec, values?: Record<string, number>): CheckResult {
  const errors: string[] = [];
  const vars = Array.isArray(spec.variables) ? spec.variables : [];
  if (spec.sceneType === 'gravity') {
    for (const id of GRAVITY_REQUIRED_VARS) if (!vars.some((v) => v.id === id)) errors.push(`중력 실험에 필요한 변수 ${id}가 없습니다`);
  }
  const outside = (lim: (typeof PHYSICAL_LIMITS)[string], x: number) => (lim.minExclusive ? x <= lim.min : x < lim.min) || x > lim.max;
  const rangeText = (lim: (typeof PHYSICAL_LIMITS)[string]) => `${lim.minExclusive ? '>' : '≥'} ${lim.min} 그리고 ≤ ${lim.max} ${lim.unit}`;
  for (const v of vars) {
    const lim = PHYSICAL_LIMITS[v.id];
    if (!lim) continue;
    for (const [k, x] of [['min', v.min], ['max', v.max], ['default', v.default]] as const) {
      if (isNum(x) && outside(lim, x)) errors.push(`${v.id}.${k}=${x}은 물리적 허용 범위(${rangeText(lim)})를 벗어납니다`);
    }
    const cur = values?.[v.id];
    if (isNum(cur) && outside(lim, cur)) errors.push(`${v.id} 현재값 ${cur}은 물리적 허용 범위(${rangeText(lim)})를 벗어납니다`);
  }
  return result('ranges', '변수 범위의 물리적 타당성', '모든 변수가 물리적 허용 범위 안에 있습니다', errors);
}

/** (c) Unit consistency for variables and observables. */
export function checkUnits(spec: ExperimentSpec): CheckResult {
  const errors: string[] = [];
  for (const v of spec.variables ?? []) {
    const lim = PHYSICAL_LIMITS[v.id];
    if (lim && normalizeUnit(v.unit) !== normalizeUnit(lim.unit)) {
      errors.push(`${v.id}의 단위는 '${lim.unit}'이어야 하지만 '${v.unit}'입니다`);
    }
  }
  for (const o of spec.observableOutputs ?? []) {
    const u = normalizeUnit(o.unit);
    if (/time/i.test(o.id) && u !== 's') errors.push(`${o.id}는 시간이므로 단위가 's'여야 하는데 '${o.unit}'입니다`);
    if (/velocity|speed/i.test(o.id) && u !== 'm/s') errors.push(`${o.id}는 속도이므로 단위가 'm/s'여야 하는데 '${o.unit}'입니다`);
    if (/height/i.test(o.id) && u !== 'm') errors.push(`${o.id}는 높이이므로 단위가 'm'여야 하는데 '${o.unit}'입니다`);
  }
  return result('units', '단위 일관성', '변수와 관측량의 단위가 일관됩니다', errors);
}

/** (d) Every formula must be on the allow-list. */
export function checkFormulas(spec: ExperimentSpec): CheckResult {
  const errors: string[] = [];
  const formulas = Array.isArray(spec.formulas) ? spec.formulas : [];
  if (formulas.length === 0) errors.push('검증할 공식이 하나도 없습니다');
  for (const f of formulas) {
    if (!matchAllowedFormula(f)) errors.push(`허용 목록에 없는 공식: ${f}`);
  }
  return result('formulas', '공식 허용 목록', `${formulas.length}개 공식이 모두 허용 목록과 일치합니다`, errors);
}

/**
 * (e) Engine vs closed-form solution. Vacuum conditions must agree within 1 %;
 * the spec's own air density is checked against the quadratic-drag closed form.
 */
export function checkEngine(spec: ExperimentSpec, values?: Record<string, number>): CheckResult {
  if (spec.sceneType !== 'gravity') {
    return result('engine', '엔진 계산 vs 해석해', '이 실험 유형은 해석해 비교 대상이 아닙니다', []);
  }
  const errors: string[] = [];
  const vars: Record<string, number> = {};
  for (const v of spec.variables ?? []) vars[v.id] = isNum(v.default) ? v.default : NaN;
  Object.assign(vars, values ?? {});
  const base = paramsFromVariables(vars);
  if (![base.heightM, base.gravity, base.airDensity].every(isNum) || base.heightM <= 0 || base.gravity <= 0) {
    return result('engine', '엔진 계산 vs 해석해', '', ['높이·중력 값이 유효하지 않아 엔진을 실행할 수 없습니다']);
  }
  let worst = 0;
  for (const which of ['A', 'B'] as const) {
    const body = bodyFromVariables(vars, which);
    if (![body.massKg, body.areaM2, body.dragCoefficient].every((x) => isNum(x) && x > 0)) {
      errors.push(`물체 ${which}의 질량·단면적·항력계수가 유효하지 않습니다`);
      continue;
    }
    for (const air of [0, base.airDensity]) {
      const p = { ...base, airDensity: air };
      const sim = simulateFall(p, body);
      const ref = analyticFall(p, body);
      const tErr = Math.abs(sim.landingTime - ref.landingTime) / ref.landingTime;
      const vErr = Math.abs(sim.impactVelocity - ref.impactVelocity) / ref.impactVelocity;
      worst = Math.max(worst, tErr, vErr);
      const cond = air === 0 ? '진공' : `ρ=${air}`;
      if (tErr >= 0.01) errors.push(`물체 ${which} (${cond}) 낙하 시간 오차 ${(tErr * 100).toFixed(3)}% ≥ 1%`);
      if (vErr >= 0.01) errors.push(`물체 ${which} (${cond}) 착지 속도 오차 ${(vErr * 100).toFixed(3)}% ≥ 1%`);
    }
  }
  return result('engine', '엔진 계산 vs 해석해', `최대 오차 ${(worst * 100).toFixed(4)}% (기준 1% 미만)`, errors);
}

/** Runs all five checks. Pure: no I/O, safe on both server and client. */
export function verifyExperimentSpec(spec: ExperimentSpec, values?: Record<string, number>): VerificationReport {
  const schema = checkSchema(spec);
  const checks: CheckResult[] = [schema];
  if (schema.passed) {
    checks.push(checkRanges(spec, values), checkUnits(spec), checkFormulas(spec), checkEngine(spec, values));
  } else {
    const skipped = (id: CheckResult['id'], label: string): CheckResult => ({
      id, label, passed: false, message: '스키마 검사 실패로 실행하지 못했습니다', errors: ['스키마 검사 실패로 실행하지 못했습니다'],
    });
    checks.push(skipped('ranges', '변수 범위의 물리적 타당성'), skipped('units', '단위 일관성'), skipped('formulas', '공식 허용 목록'), skipped('engine', '엔진 계산 vs 해석해'));
  }
  const errors = checks.filter((c) => !c.passed && c.message !== '스키마 검사 실패로 실행하지 못했습니다').flatMap((c) => c.errors);
  return { checks, passed: checks.every((c) => c.passed), errors };
}

/**
 * Validates a set of proposed variable changes (e.g. from the AI co-scientist) against the
 * spec's slider ranges and physical limits. Returns the accepted, in-range values.
 */
export function validateVariableUpdates(
  spec: ExperimentSpec,
  updates: Record<string, unknown>,
): { ok: boolean; errors: string[]; accepted: Record<string, number> } {
  const errors: string[] = [];
  const accepted: Record<string, number> = {};
  for (const [id, raw] of Object.entries(updates)) {
    const v = spec.variables.find((x) => x.id === id);
    if (!v) { errors.push(`알 수 없는 변수: ${id}`); continue; }
    if (!isNum(raw)) { errors.push(`${v.label}: 숫자가 아닙니다`); continue; }
    if (raw < v.min || raw > v.max) { errors.push(`${v.label}: ${raw} ${v.unit}은 허용 범위 [${v.min}, ${v.max}]를 벗어납니다`); continue; }
    const lim = PHYSICAL_LIMITS[id];
    if (lim && ((lim.minExclusive ? raw <= lim.min : raw < lim.min) || raw > lim.max)) {
      errors.push(`${v.label}: ${raw} ${v.unit}은 물리적 허용 범위를 벗어납니다`);
      continue;
    }
    accepted[id] = raw;
  }
  if (Object.keys(accepted).length > 0) {
    const merged = { ...Object.fromEntries(spec.variables.map((x) => [x.id, x.default])), ...accepted };
    const engine = checkEngine(spec, merged);
    if (!engine.passed) errors.push(...engine.errors);
  }
  return { ok: errors.length === 0, errors, accepted };
}
