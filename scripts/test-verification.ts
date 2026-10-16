import { verifyExperimentSpec, checkSchema, checkRanges, checkUnits, checkFormulas, checkEngine, validateVariableUpdates, matchAllowedFormula, normalizeUnit } from '../src/verification/index.ts';
import type { ExperimentSpec } from '../src/types.ts';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ TEST FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ ${message}`);
}

const v = (id: string, label: string, min: number, max: number, def: number, unit: string) => ({ id, label, min, max, default: def, step: 0.01, unit, description: '' });

function goodSpec(): ExperimentSpec {
  return {
    id: 'exp-test', title: '테스트', domain: 'physics', sceneType: 'gravity',
    learningObjectives: [], scientificPrinciples: [],
    variables: [
      v('dropHeight', '낙하 높이', 1, 100, 30, 'm'),
      v('gravity', '중력 가속도', 0.1, 30, 9.81, 'm/s²'),
      v('airDensity', '공기 밀도', 0, 1.5, 0, 'kg/m³'),
      v('massA', '질량 A', 0.001, 50, 6, 'kg'), v('areaA', '단면적 A', 0.0005, 0.2, 0.0366, 'm²'), v('cdA', '항력계수 A', 0.04, 2, 0.47, ''),
      v('massB', '질량 B', 0.001, 50, 0.005, 'kg'), v('areaB', '단면적 B', 0.0005, 0.2, 0.0078, 'm²'), v('cdB', '항력계수 B', 0.04, 2, 1.3, ''),
    ],
    observableOutputs: [
      { id: 'fallTimeA', label: '낙하 시간 A', unit: 's', description: '' },
      { id: 'impactVelocityA', label: '착지 속도 A', unit: 'm/s', description: '' },
    ],
    formulas: ['t = sqrt(2h/g)', 'v = g t', 'v = \\sqrt{2gh}', 'F_d = \\frac{1}{2} \\rho v^2 C_d A'],
    simulationModel: 'x', visualEffects: [], safetyNotes: [], explanation: '', guidedSteps: [], suggestedQueries: [],
  };
}
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

console.log('🧪 VERIFICATION UNIT TESTS\n');

console.log('[a] schema');
{
  assert(checkSchema(goodSpec()).passed, 'valid spec passes schema check');
  const bad = clone(goodSpec()) as any;
  delete bad.title; bad.variables[0].min = 'x'; bad.sceneType = 'magic';
  const r = checkSchema(bad);
  assert(!r.passed && r.errors.length >= 3, `broken spec fails schema with real messages (${r.errors.join(' | ')})`);
  const bad2 = clone(goodSpec()); bad2.variables[1].default = 99;
  assert(!checkSchema(bad2).passed, 'default outside [min,max] fails schema');
  assert(!checkSchema(null).passed, 'null spec fails schema');
}

console.log('\n[b] ranges');
{
  assert(checkRanges(goodSpec()).passed, 'valid ranges pass');
  const g = clone(goodSpec()); g.variables[1].max = 50;
  assert(!checkRanges(g).passed, 'g up to 50 m/s² is rejected (limit 0.1–30)');
  const g0 = clone(goodSpec()); g0.variables[1].min = 0;
  assert(!checkRanges(g0).passed, 'g min 0 is rejected');
  const h = clone(goodSpec()); h.variables[0].min = 0;
  assert(!checkRanges(h).passed, 'h must be > 0');
  const rho = clone(goodSpec()); rho.variables[2].max = 5;
  assert(!checkRanges(rho).passed, 'air density 5 kg/m³ is rejected');
  assert(!checkRanges(goodSpec(), { gravity: 40 }).passed, 'current value out of range is rejected');
  const missing = clone(goodSpec()); missing.variables = missing.variables.filter((x) => x.id !== 'gravity');
  assert(!checkRanges(missing).passed, 'gravity scene without gravity variable is rejected');
}

console.log('\n[c] units');
{
  assert(checkUnits(goodSpec()).passed, 'valid units pass');
  assert(normalizeUnit('m/s^2') === 'm/s²' && normalizeUnit('초 (s)') === 's', 'unit normalisation handles ^2 and parenthesised units');
  const u = clone(goodSpec()); u.variables[1].unit = 'km/h';
  assert(!checkUnits(u).passed, 'gravity in km/h is rejected');
  const o = clone(goodSpec()); o.observableOutputs[1].unit = 'm';
  assert(!checkUnits(o).passed, 'velocity observable in metres is rejected');
}

console.log('\n[d] formulas');
{
  assert(checkFormulas(goodSpec()).passed, 'plain-text and LaTeX spellings of allowed formulas pass');
  for (const f of ['t = sqrt(2h/g)', 'v = g*t', 'v = √(2gh)', 'F_d = ½ρv²C_dA', 'F_d = 0.5 * rho * v^2 * C_d * A']) {
    assert(matchAllowedFormula(f) !== null, `allowed: ${f}`);
  }
  for (const f of ['t = 2h/g', 'v = sqrt(2h)/g', 'E = mc^2', 'F_d = rho v C_d A', 'v = g t^2']) {
    assert(matchAllowedFormula(f) === null, `rejected: ${f}`);
  }
  const bad = clone(goodSpec()); bad.formulas = ['t = 2h/g'];
  assert(!checkFormulas(bad).passed, 'spec with a wrong formula fails');
  const none = clone(goodSpec()); none.formulas = [];
  assert(!checkFormulas(none).passed, 'spec with no formulas fails');
}

console.log('\n[e] engine vs analytic');
{
  const r = checkEngine(goodSpec());
  assert(r.passed, `engine agrees with closed form (${r.message})`);
  const air = checkEngine(goodSpec(), { airDensity: 1.2 });
  assert(air.passed, `engine agrees with drag closed form at rho=1.2 (${air.message})`);
  const nan = checkEngine(goodSpec(), { gravity: NaN });
  assert(!nan.passed, 'NaN input is reported as a failure');
}

console.log('\n[all] verifyExperimentSpec + validateVariableUpdates');
{
  const report = verifyExperimentSpec(goodSpec());
  assert(report.passed && report.checks.length === 5, 'all five checks run and pass for a valid spec');
  const bad = clone(goodSpec()); bad.variables[1].max = 50; bad.formulas = ['E = mc^2'];
  const bad_r = verifyExperimentSpec(bad);
  assert(!bad_r.passed && bad_r.errors.length >= 2, `failures surface as real error strings (${bad_r.errors.length})`);
  const broken = verifyExperimentSpec({} as ExperimentSpec);
  assert(!broken.passed && broken.checks.every((c) => !c.passed), 'empty spec fails every check');

  const ok = validateVariableUpdates(goodSpec(), { gravity: 1.62, airDensity: 1.2 });
  assert(ok.ok && ok.accepted.gravity === 1.62, 'in-range update is accepted');
  const rejected = validateVariableUpdates(goodSpec(), { gravity: 99, nonsense: 1, dropHeight: '30' as unknown as number });
  assert(!rejected.ok && rejected.errors.length === 3 && Object.keys(rejected.accepted).length === 0, 'out-of-range, unknown and non-numeric updates are rejected');
}

console.log('\n🎉 ALL VERIFICATION TESTS PASSED\n');
