/**
 * Unit tests for the model-tier lab path: the formula evaluator, the observable checks that make a
 * frozen readout a verification failure, and the multi-domain normaliser.
 */

import { compileFormula, evaluateFormula, formatObservableValue, normalizeExpression } from '../src/lib/formulaEval.ts';
import { verifyExperimentSpec, tierFor, checkObservableFormulas, checkObservableResponse } from '../src/verification/index.ts';
import { normalizeLabSpec } from '../src/generation/labSpec.ts';
import { requiredVariablesFor } from '../src/generation/sceneCatalog.ts';
import type { ExperimentSpec } from '../src/types.ts';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ TEST FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ ${message}`);
}

const near = (a: number, b: number, tol = 1e-9) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(b));

console.log('🧪 MODEL-TIER LAB TESTS\n');

console.log('[1] formula evaluator');
{
  const ok = (src: string, scope: Record<string, number>, expected: number) => {
    const r = evaluateFormula(src, scope);
    assert(r.ok && near(r.value, expected), `${src} = ${expected}`);
  };
  ok('2 + 3 * 4', {}, 14);
  ok('(2 + 3) * 4', {}, 20);
  ok('2 ^ 3 ^ 2', {}, 512); // right associative
  ok('-x ^ 2', { x: 3 }, -9);
  ok('sqrt(16) + abs(-2)', {}, 6);
  ok('min(3, 7) + max(1, 9)', {}, 12);
  ok('clamp(120, 0, 100)', {}, 100);
  ok('2 pi', {}, 2 * Math.PI); // implicit multiplication
  ok('3(x + 1)', { x: 1 }, 6);
  ok('c / (a + b)', { a: 1, b: 3, c: 8 }, 2);

  // LaTeX-flavoured spellings and a named left-hand side are accepted
  ok('t = \\sqrt{\\frac{2h}{g}}', { h: 20, g: 10 }, 2);
  ok('F_d', { F_d: 5 }, 5);
  ok('x × 2', { x: 4 }, 8);
  ok('x²', { x: 5 }, 25);

  const bad = (src: string, scope: Record<string, number>, hint: string) => {
    const r = evaluateFormula(src, scope);
    assert(!r.ok, `rejected: ${hint}`);
  };
  bad('x + y', { x: 1 }, 'undefined variable');
  bad('frobnicate(2)', {}, 'unknown function');
  bad('1 / 0', {}, 'division by zero');
  bad('ln(0)', {}, 'non-finite result');
  bad('2 +', {}, 'truncated expression');
  bad('(2 + 3', {}, 'unbalanced parenthesis');
  bad('sqrt(2, 3)', {}, 'wrong arity');
  bad('process.exit(1)', {}, 'property access is not arithmetic');
  bad("'use strict'", {}, 'string literal');

  assert(compileFormula('a * b + pi').ok, 'compiles once for reuse');
  const ids = compileFormula('a * b + pi');
  assert(ids.ok && ids.formula.identifiers.sort().join(',') === 'a,b', 'identifiers exclude constants and functions');
  assert(normalizeExpression('$v = g \\cdot t$') === 'g * t', 'normalises LaTeX and drops the left-hand side');

  assert(formatObservableValue(1234.5) === '1234.5', 'formats large values');
  assert(formatObservableValue(0.00004321) === '4.32e-5', 'formats tiny values in exponential form');
  assert(formatObservableValue(2.5, 0) === '3', 'honours explicit decimals');
  assert(formatObservableValue(NaN) === '—', 'NaN renders as a dash');
}

const lab = (over: Partial<ExperimentSpec> = {}): ExperimentSpec =>
  normalizeLabSpec({
    sceneType: 'conceptual',
    domain: 'chemistry',
    title: '희석 실험',
    variables: [
      { id: 'conc', label: '농도', min: 1, max: 10, default: 5, step: 0.1, unit: 'M', description: '' },
      { id: 'volume', label: '부피', min: 10, max: 100, default: 50, step: 1, unit: 'mL', description: '' },
    ],
    observables: [
      { id: 'amount', label: '용질량', unit: 'mmol', formula: 'conc * volume', description: '' },
    ],
    formulas: ['n = c V'],
    ...over,
  }, 1);

console.log('\n[2] tiering');
{
  assert(tierFor({ sceneType: 'gravity' }) === 'strict', 'free fall is strict tier');
  assert(tierFor({ sceneType: 'volcano' }) === 'engine', 'volcano is engine tier');
  assert(tierFor({ sceneType: 'conceptual' }) === 'model', 'conceptual is model tier');

  const report = verifyExperimentSpec(lab());
  assert(report.passed, `a formula-driven lab passes all five checks (${report.errors.join('|') || 'ok'})`);
  assert(report.tier === 'model' && report.tierLabel.includes('모델 검증'), 'report states the tier it actually applied');
  assert(
    report.checks.some((c) => c.id === 'formulas' && c.label.includes('관측값')) &&
      report.checks.some((c) => c.id === 'engine' && c.label.includes('반응성')),
    'model tier swaps in the observable checks instead of the gravity allow-list and engine',
  );
}

console.log('\n[3] a frozen readout is a verification failure');
{
  // This is the regression that made every generated lab show the same numbers.
  const constant = lab();
  const frozen = { ...constant, observableOutputs: [{ id: 'x', label: '에너지', unit: 'kJ', formula: '725', description: '' }] };
  const r1 = checkObservableFormulas(frozen as ExperimentSpec);
  assert(!r1.passed && r1.errors.some((e) => e.includes('변수를 전혀')), 'an observable that is a bare number is rejected');

  const noFormula = { ...constant, observableOutputs: [{ id: 'x', label: '에너지', unit: 'kJ', description: '' }] };
  assert(!checkObservableFormulas(noFormula as ExperimentSpec).passed, 'an observable with no formula is rejected at model tier');

  const unknownRef = { ...constant, observableOutputs: [{ id: 'x', label: '에너지', unit: '', formula: 'intensity * 1450', description: '' }] };
  const r2 = checkObservableFormulas(unknownRef as ExperimentSpec);
  assert(r2.errors.some((e) => e.includes('intensity')), 'a formula reading an undeclared variable names it');

  const deadSlider = {
    ...constant,
    variables: [...constant.variables, { id: 'stir', label: '교반 속도', min: 0, max: 10, default: 5, step: 1, unit: 'rpm', description: '' }],
  };
  const r3 = checkObservableResponse(deadSlider as ExperimentSpec);
  assert(!r3.passed && r3.errors.some((e) => e.includes('교반 속도')), 'a slider no observable reads is reported as dead');

  // Reads every control but min() is saturated over the whole range of one of them, so moving that
  // slider does nothing — the mild version of the frozen-panel bug.
  const saturated = {
    ...constant,
    observableOutputs: [{ id: 'x', label: '위험도', unit: '%', formula: 'min(95, conc * 500) + volume', description: '' }],
  };
  const r4 = checkObservableResponse(saturated as ExperimentSpec);
  assert(!r4.passed && r4.errors.some((e) => e.includes('농도')), 'a control the readout reads but never responds to is reported');

  const allSaturated = {
    ...constant,
    observableOutputs: [{ id: 'x', label: '위험도', unit: '%', formula: 'min(95, conc * 500) + volume * 0', description: '' }],
  };
  const r4b = checkObservableResponse(allSaturated as ExperimentSpec);
  assert(!r4b.passed && r4b.errors.some((e) => e.includes('반응하지 않습니다')), 'a readout saturated on every control is rejected outright');

  const blowsUp = {
    ...constant,
    observableOutputs: [{ id: 'x', label: '비율', unit: '', formula: 'conc / (volume - 50)', description: '' }],
  };
  const r5 = checkObservableResponse(blowsUp as ExperimentSpec);
  assert(!r5.passed && r5.errors.some((e) => e.includes('계산이 실패')), 'a formula that breaks inside the slider range is rejected');

  const koreanId = normalizeLabSpec({
    sceneType: 'conceptual', title: 't',
    variables: [{ id: '농도', label: '농도', min: 1, max: 2, default: 1.5, unit: 'M' }],
    observables: [{ id: 'y', label: 'y', unit: '', formula: '농도 * 2' }],
  }, 2);
  assert(koreanId.variables.length === 0, 'a non-identifier variable id is dropped by the normaliser');
}

console.log('\n[4] engine scenes keep their contract');
{
  assert(requiredVariablesFor('volcano').includes('pressure'), 'volcano requires the id its simulation reads');
  assert(requiredVariablesFor('conceptual').length === 0, 'conceptual has no fixed ids');

  const volcano = normalizeLabSpec({
    sceneType: 'volcano', domain: 'earth_science', title: '분화',
    variables: [{ id: 'chamberOverpressure', label: '과압', min: 5, max: 60, default: 30, unit: 'MPa' }],
    observables: [{ id: 'plumeHeight', label: '분연주 고도', unit: 'km' }],
    formulas: ['H = k Q^0.25'],
  }, 3);
  assert(
    requiredVariablesFor('volcano').every((id) => volcano.variables.some((v) => v.id === id)),
    'missing engine variables are topped up from the catalogue',
  );
  const vr = verifyExperimentSpec(volcano);
  assert(vr.tier === 'engine', 'a dedicated scene is verified at engine tier');
  assert(vr.passed, `engine tier does not demand formulas (${vr.errors.join('|') || 'ok'})`);

  const stripped = { ...volcano, variables: volcano.variables.filter((v) => v.id !== 'pressure') };
  const sr = verifyExperimentSpec(stripped as ExperimentSpec);
  assert(!sr.passed && sr.errors.some((e) => e.includes('pressure')), 'a spec missing an engine variable is rejected');
}

console.log('\n[5] normaliser hardening');
{
  const messy = normalizeLabSpec({
    sceneType: 'nonsense', domain: 'nope', title: '  제목  ',
    variables: [
      { id: 'a', label: 'A', min: 10, max: 1, default: 99, unit: 'x' },
      { id: 'a', label: '중복', min: 0, max: 1, default: 0.5 },
      { id: '1bad', label: '숫자로 시작', min: 0, max: 1, default: 0 },
    ],
    observables: [{ id: 'o', label: 'O', unit: '', formula: 'a * 2', decimals: 99 }],
    uiComponents: [{ type: 'slider', variableId: 'ghost' }, { type: 'slider', variableId: 'a' }],
  }, 7);
  assert(messy.sceneType === 'conceptual' && messy.domain === 'general', 'unknown scene/domain fall back safely');
  assert(messy.title === '제목', 'title is trimmed');
  assert(messy.variables.length === 1 && messy.variables[0].id === 'a', 'duplicate and invalid ids are dropped');
  assert(messy.variables[0].min === 1 && messy.variables[0].max === 10, 'reversed min/max is corrected');
  assert(messy.variables[0].default >= 1 && messy.variables[0].default <= 10, 'out-of-range default is clamped');
  assert(messy.observableOutputs[0].decimals === undefined, 'an absurd decimals value is ignored');
  const sliders = JSON.stringify(messy.uiComponents);
  assert(!sliders.includes('ghost') && sliders.includes('"a"'), 'controls referencing missing variables are pruned');
  assert(verifyExperimentSpec(messy).passed, 'the hardened spec still verifies');
}

console.log('\n🎉 ALL MODEL-TIER TESTS PASSED\n');
