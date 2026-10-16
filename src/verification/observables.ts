/**
 * Checks for 'model' tier labs (anything that is not the free-fall engine).
 *
 * A declarative lab is only honest if its readouts are really computed from its own controls. These
 * two checks make the two ways that can silently break into verification failures the generator has
 * to fix:
 *   1. the formula does not parse, or reads a variable that does not exist;
 *   2. the formula parses but ignores every control, so the panel shows a constant.
 */

import type { ExperimentSpec, ObservableOutput, VariableSpec } from '../types';
import { compileFormula, FORMULA_CONSTANTS } from '../lib/formulaEval';
import type { CheckResult } from './types';

const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);

function result(id: CheckResult['id'], label: string, okMsg: string, errors: string[]): CheckResult {
  return { id, label, passed: errors.length === 0, message: errors.length === 0 ? okMsg : errors.join(' / '), errors };
}

const vars = (spec: ExperimentSpec): VariableSpec[] => (Array.isArray(spec.variables) ? spec.variables : []);
const observables = (spec: ExperimentSpec): ObservableOutput[] =>
  (Array.isArray(spec.observableOutputs) ? spec.observableOutputs : []);

/** Variable values with every slider at its default. */
export function defaultScope(spec: ExperimentSpec): Record<string, number> {
  const scope: Record<string, number> = {};
  for (const v of vars(spec)) if (isNum(v.default)) scope[v.id] = v.default;
  return scope;
}

/**
 * (d, model tier) Every observable carries a formula that parses, reads only declared variables and
 * produces a finite number at the default settings.
 */
export function checkObservableFormulas(spec: ExperimentSpec, require = true): CheckResult {
  const errors: string[] = [];
  const list = observables(spec);
  const declared = new Set(vars(spec).map((v) => v.id));
  const scope = defaultScope(spec);

  if (list.length === 0) errors.push('observableOutputs가 비어 있어 측정할 값이 없습니다');

  // Formulas reference variables by id, so an id that is not a plain identifier can never be read.
  for (const v of vars(spec)) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(v.id)) {
      errors.push(`변수 id '${v.id}'는 수식에서 참조할 수 없습니다 — 영문/숫자/밑줄만 쓰고 한국어는 label에 넣으세요`);
    }
  }

  let withFormula = 0;
  for (const o of list) {
    const where = o.label || o.id;
    if (!o.formula || !String(o.formula).trim()) {
      // On engine-backed scenes the simulation supplies the value, so a missing formula is fine.
      if (require) errors.push(`'${where}'에 formula가 없습니다 (변수로 계산되는 식이 필요합니다)`);
      continue;
    }
    withFormula++;
    const compiled = compileFormula(o.formula);
    if (!compiled.ok) {
      errors.push(`'${where}' 수식을 해석할 수 없습니다: ${compiled.error} (식: ${o.formula})`);
      continue;
    }
    const unknown = compiled.formula.identifiers.filter((id) => !declared.has(id) && !(id in FORMULA_CONSTANTS));
    if (unknown.length) {
      errors.push(`'${where}' 수식이 존재하지 않는 변수를 참조합니다: ${unknown.join(', ')}`);
      continue;
    }
    if (compiled.formula.identifiers.length === 0) {
      errors.push(`'${where}' 수식이 변수를 전혀 쓰지 않아 항상 같은 값입니다 (식: ${o.formula})`);
      continue;
    }
    try {
      compiled.formula.evaluate(scope);
    } catch (err: any) {
      errors.push(`'${where}'를 기본값에서 계산할 수 없습니다: ${err?.message ?? '알 수 없는 오류'}`);
    }
  }

  const okMsg = require
    ? `${list.length}개 관측값이 모두 변수로부터 계산됩니다`
    : withFormula > 0
      ? `전용 엔진이 계산하고, 스펙이 제시한 수식 ${withFormula}개는 계산 가능합니다`
      : '전용 엔진이 관측값을 계산합니다';
  return result('formulas', '관측값 수식의 계산 가능성', okMsg, errors);
}

/**
 * (e, model tier) Replaces the engine-vs-analytic comparison: sweeps every variable across its own
 * slider range and requires each observable to stay finite and to actually move for at least one
 * control. This is what stops a lab whose panel is frozen from being shown as a working experiment.
 */
export function checkObservableResponse(spec: ExperimentSpec, require = true, samples = 5): CheckResult {
  const errors: string[] = [];
  const list = observables(spec);
  const variableList = vars(spec).filter((v) => isNum(v.min) && isNum(v.max) && v.min < v.max);
  const base = defaultScope(spec);

  if (list.length === 0 || variableList.length === 0) {
    return result('engine', '관측값의 변수 반응성', '', ['변수 또는 관측값이 없어 반응성을 확인할 수 없습니다']);
  }
  if (!require && !list.some((o) => o.formula)) {
    return result('engine', '관측값의 변수 반응성', '전용 엔진이 관측값을 계산하므로 수식 반응성 검사는 대상이 아닙니다', []);
  }

  for (const o of list) {
    const where = o.label || o.id;
    if (!o.formula) continue; // already reported by checkObservableFormulas
    const compiled = compileFormula(o.formula);
    if (!compiled.ok) continue;

    const read = compiled.formula.identifiers;
    let moved = false;
    let worstSpan = 0;
    let broke = false;
    const inert: string[] = [];

    for (const v of variableList) {
      // A variable the formula never reads cannot move it; sweeping it proves nothing.
      if (!read.includes(v.id)) continue;
      const seen: number[] = [];
      for (let i = 0; i < samples; i++) {
        const x = v.min + ((v.max - v.min) * i) / (samples - 1);
        try {
          seen.push(compiled.formula.evaluate({ ...base, [v.id]: x }));
        } catch (err: any) {
          errors.push(`'${where}': ${v.label || v.id}=${Number(x.toFixed(4))}에서 계산이 실패합니다 (${err?.message ?? '오류'}) — 슬라이더를 끝까지 움직이면 값이 깨집니다`);
          broke = true;
          break;
        }
      }
      if (broke) break;
      if (seen.length < 2) continue;
      const lo = Math.min(...seen);
      const hi = Math.max(...seen);
      const span = (hi - lo) / (Math.abs(lo) + Math.abs(hi) + 1e-12);
      worstSpan = Math.max(worstSpan, span);
      if (span > 1e-6) moved = true;
      else inert.push(v.label || v.id);
    }
    if (broke) continue;

    if (!moved) {
      errors.push(`'${where}'가 어떤 슬라이더에도 반응하지 않습니다 (변화율 ${(worstSpan * 100).toExponential(1)}%) — 측정 패널이 고정된 값만 보여 줍니다`);
    } else if (inert.length) {
      // Reading a variable but never responding to it is usually a min()/max()/clamp() that is
      // saturated over the whole slider range: the student moves the control and nothing happens.
      errors.push(`'${where}'는 ${inert.join(', ')}을(를) 수식에서 읽지만 그 슬라이더를 전 구간 움직여도 값이 변하지 않습니다 — min/max/clamp가 전 구간 포화되었는지 확인하고, 실제 범위에서 변하도록 계수를 조정하세요`);
    }
  }

  // A control nothing reads is a dead slider: it looks interactive but changes no readout.
  const readByAny = new Set<string>();
  for (const o of list) {
    if (!o.formula) continue;
    const compiled = compileFormula(o.formula);
    if (compiled.ok) compiled.formula.identifiers.forEach((id) => readByAny.add(id));
  }
  const dead = variableList.filter((v) => !readByAny.has(v.id));
  if (require && dead.length) {
    errors.push(`어떤 관측값도 읽지 않는 변수가 있습니다: ${dead.map((v) => v.label || v.id).join(', ')} — 움직여도 아무 변화가 없는 슬라이더입니다`);
  }

  const total = list.length;
  return result(
    'engine',
    '관측값의 변수 반응성',
    `${total}개 관측값이 슬라이더 전 구간에서 유한하고 실제로 반응합니다`,
    errors,
  );
}
