export interface CheckResult {
  id: 'schema' | 'ranges' | 'units' | 'formulas' | 'engine';
  label: string;
  passed: boolean;
  /** Human readable outcome; on failure it lists every violation (fed back to the model on retries). */
  message: string;
  errors: string[];
}

/**
 * How strongly a spec can be checked.
 *
 * 'strict' — the lab runs on an engine with a closed-form solution to compare against (free fall).
 *            Every formula must be on the allow-list and the two must agree within 1 %.
 * 'engine' — a dedicated deterministic simulation computes the readouts (volcano, optics, fluid,
 *            solar system, buoyancy). Schema, ranges and units are checked, and any formula the
 *            spec does supply is verified — but there is no independent reference solution.
 * 'model'  — a declarative lab: the observables ARE formulas over the spec's own variables. We
 *            verify they parse, reference only declared variables, stay finite over each slider's
 *            full range and actually respond to it — but NOT that the science is quantitatively
 *            right. The UI must say so.
 */
export type VerificationTier = 'strict' | 'engine' | 'model';

export const TIER_LABELS: Record<VerificationTier, string> = {
  strict: '엄격 검증 — 엔진 계산을 해석해와 비교했습니다',
  engine: '엔진 검증 — 전용 결정론적 시뮬레이션이 계산합니다 (독립 해석해 비교는 없음)',
  model: '모델 검증 — 수식이 계산 가능하고 슬라이더에 반응하는지만 확인했습니다 (정량 예측 아님)',
};

/** Scenes that have their own simulation code computing the telemetry. */
export const ENGINE_SCENES = ['volcano', 'optics', 'fluid', 'solar_system', 'buoyancy'] as const;

export interface VerificationReport {
  checks: CheckResult[];
  passed: boolean;
  /** Flat list of error strings across all failed checks. */
  errors: string[];
  /** Which level of checking was applied; drives the honesty banner in the UI. */
  tier: VerificationTier;
  /** One-line Korean description of that level. */
  tierLabel: string;
}
