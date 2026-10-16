/**
 * Variables the dedicated 3D scenes actually read.
 *
 * Each of these scenes has hand-written simulation code that looks its inputs up by a fixed id
 * (e.g. VolcanoSimulation reads `pressure`). A generated spec that invents its own names renders a
 * lab whose sliders move nothing — so these ids are a contract: the generator is told to use them
 * and verification rejects a spec that omits them. Only 'conceptual' is free-form, because there
 * the observables carry their own formulas.
 */

import type { SceneType, VariableSpec } from '../types';

export type EngineScene = 'optics' | 'fluid' | 'volcano' | 'solar_system' | 'buoyancy';

/**
 * `optional: true` marks an input the simulation reads behind a safe default, so a spec may leave it
 * out; everything else is a control the scene cannot be driven without.
 */
type CatalogEntry = Omit<VariableSpec, 'id'> & { optional?: boolean };

export const SCENE_VARIABLE_CATALOG: Record<EngineScene, Record<string, CatalogEntry>> = {
  volcano: {
    pressure: { label: '마그마 방 압력', min: 0, max: 100, default: 55, step: 1, unit: 'kPa', description: '마그마 방에 축적된 과압' },
    gasContent: { label: '휘발성 가스 함량', min: 0, max: 100, default: 45, step: 1, unit: '%', description: '용존 가스 비율이 높으면 폭발성이 커집니다' },
    ventResistance: { label: '화도 저항도', min: 10, max: 100, default: 50, step: 1, unit: '%', description: '화도가 막혀 있을수록 압력이 쌓입니다' },
    magmaViscosity: { label: '마그마 점성', min: 10, max: 90, default: 40, step: 1, unit: 'Pa·s', description: '점성이 높으면 가스가 빠져나가기 어렵습니다' },
  },
  optics: {
    incidentAngle: { label: '입사각 (θ₁)', min: 0, max: 89, default: 45, step: 1, unit: '° (도)', description: '경계면 법선에 대한 입사 각도' },
  },
  fluid: {
    mixingEnergy: { label: '교반 에너지', min: 0, max: 100, default: 0, step: 5, unit: '%', description: '0이면 정지, 높이면 층이 섞입니다' },
    gravity: { label: '중력 가속도', min: 0.1, max: 30, default: 9.81, step: 0.01, unit: 'm/s²', description: '정수압과 성층화 속도를 좌우합니다', optional: true },
  },
  solar_system: {
    timeScale: { label: '시간 배속', min: 0, max: 10, default: 1.5, step: 0.1, unit: '배속', description: '공전 재생 속도' },
    gravityMultiplier: { label: '중력 상수 배율', min: 0.2, max: 2.5, default: 1.0, step: 0.05, unit: 'G/G₀', description: '태양 중력의 배율' },
    moonDistanceMultiplier: { label: '지구-달 거리 비율', min: 0.5, max: 2.5, default: 1.0, step: 0.05, unit: 'R/R₀', description: '기조력에 직접 영향을 줍니다' },
    earthOrbitalSpeed: { label: '지구 공전 속도 배율', min: 0.4, max: 1.6, default: 1.0, step: 0.05, unit: 'v/v₀', description: '궤도 이심률을 바꿉니다' },
  },
  buoyancy: {
    fluidDensity: { label: '유체 밀도', min: 100, max: 2000, default: 1000, step: 10, unit: 'kg/m³', description: '물은 약 1000' },
    objectDensity: { label: '물체 밀도', min: 50, max: 3000, default: 700, step: 10, unit: 'kg/m³', description: '유체보다 작으면 뜹니다' },
    objectVolume: { label: '물체 부피', min: 0.001, max: 1, default: 0.05, step: 0.001, unit: 'm³', description: '배수 부피를 결정합니다' },
    gravity: { label: '중력 가속도', min: 0.1, max: 30, default: 9.81, step: 0.01, unit: 'm/s²', description: '부력과 중력의 크기', optional: true },
  },
};

export const ENGINE_SCENE_LIST = Object.keys(SCENE_VARIABLE_CATALOG) as EngineScene[];

export function isEngineScene(scene: unknown): scene is EngineScene {
  return typeof scene === 'string' && (ENGINE_SCENE_LIST as string[]).includes(scene);
}

/** The ids a spec for this scene must declare for the simulation to respond at all. */
export function requiredVariablesFor(scene: SceneType): string[] {
  if (!isEngineScene(scene)) return [];
  return Object.entries(SCENE_VARIABLE_CATALOG[scene])
    .filter(([, v]) => !v.optional)
    .map(([id]) => id);
}

/** Prompt-ready description of one scene's contract. */
export function describeSceneCatalog(scene: EngineScene): string {
  return Object.entries(SCENE_VARIABLE_CATALOG[scene])
    .map(([id, v]) => `  - ${id}: ${v.label}, unit "${v.unit}", range ${v.min}..${v.max}, default ${v.default}${v.optional ? ' (optional)' : ''}`)
    .join('\n');
}

/** Fills in any missing engine variable from the catalog so a near-miss spec still drives the scene. */
export function withEngineDefaults(scene: SceneType, variables: VariableSpec[]): VariableSpec[] {
  if (!isEngineScene(scene)) return variables;
  const have = new Set(variables.map((v) => v.id));
  const missing = Object.entries(SCENE_VARIABLE_CATALOG[scene])
    .filter(([id, v]) => !have.has(id) && !v.optional)
    .map(([id, v]) => ({ id, ...v }));
  return [...variables, ...missing];
}
