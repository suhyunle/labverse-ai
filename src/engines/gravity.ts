/**
 * Deterministic Gravity & Free-Fall Scientific Engine
 * Grounded in Newtonian Kinematics and Aerodynamic Drag
 */

export interface GravityObjectSpec {
  id: string;
  name: string;
  massKg: number;
  radiusMeters: number;
  dragCoefficient: number; // Sphere ~0.47, Feather ~1.2, Streamlined ~0.04
  color: string;
}

export const GRAVITY_OBJECT_PRESETS: Record<string, GravityObjectSpec> = {
  bowling_ball: {
    id: 'bowling_ball',
    name: '볼링공 (Bowling Ball)',
    massKg: 6.0,
    radiusMeters: 0.108,
    dragCoefficient: 0.47,
    color: '#00f0ff',
  },
  feather: {
    id: 'feather',
    name: '깃털 (Feather)',
    massKg: 0.005,
    radiusMeters: 0.05,
    dragCoefficient: 1.3,
    color: '#f43f5e',
  },
  gold_sphere: {
    id: 'gold_sphere',
    name: '금 구체 (Gold Sphere)',
    massKg: 19.3,
    radiusMeters: 0.062,
    dragCoefficient: 0.47,
    color: '#fbbf24',
  },
  wooden_cube: {
    id: 'wooden_cube',
    name: '나무 블록 (Wood Block)',
    massKg: 0.8,
    radiusMeters: 0.08,
    dragCoefficient: 1.05,
    color: '#a78bfa',
  },
};

export const CELESTIAL_GRAVITY_PRESETS: Record<string, { name: string; g: number; atmosphereDensity: number }> = {
  earth: { name: '지구 (Earth)', g: 9.80665, atmosphereDensity: 1.225 },
  moon: { name: '달 (Moon)', g: 1.62, atmosphereDensity: 0.0 },
  mars: { name: '화성 (Mars)', g: 3.72076, atmosphereDensity: 0.02 },
  jupiter: { name: '목성 (Jupiter)', g: 24.79, atmosphereDensity: 1.3 },
  zero_g: { name: '무중력 (Zero-G Space)', g: 0.0, atmosphereDensity: 0.0 },
};

export interface FreeFallCalculationResult {
  fallTimeVacuum: number;
  impactVelocityVacuum: number;
  fallTimeAir: number;
  impactVelocityAir: number;
  terminalVelocity: number;
  trajectoryVacuum: { t: number; y: number; v: number }[];
  trajectoryAir: { t: number; y: number; v: number }[];
}

/**
 * Computes deterministic free-fall kinematics with optional atmospheric drag.
 * Air resistance: F_drag = 0.5 * rho * C_d * A * v^2
 * Terminal velocity: v_t = sqrt( (2 * m * g) / (rho * C_d * A) )
 */
export function calculateFreeFall(
  heightMeters: number,
  gravity: number,
  objectSpec: GravityObjectSpec,
  airDensityKgM3: number = 0.0 // 0 for vacuum
): FreeFallCalculationResult {
  const h = Math.max(0.1, heightMeters);
  const g = Math.max(0.0001, gravity);
  const m = Math.max(0.0001, objectSpec.massKg);
  const A = Math.PI * Math.pow(objectSpec.radiusMeters, 2);
  const Cd = objectSpec.dragCoefficient;

  // 1. Vacuum analytic formulas
  const tVac = Math.sqrt((2 * h) / g);
  const vImpactVac = Math.sqrt(2 * g * h);

  // Vacuum trajectory sampling
  const numSteps = 50;
  const trajVac: { t: number; y: number; v: number }[] = [];
  for (let i = 0; i <= numSteps; i++) {
    const t = (i / numSteps) * tVac;
    const y = Math.max(0, h - 0.5 * g * t * t);
    const v = g * t;
    trajVac.push({ t: parseFloat(t.toFixed(3)), y: parseFloat(y.toFixed(3)), v: parseFloat(v.toFixed(3)) });
  }

  // 2. Numerical integration for Air Resistance (if air density > 0)
  if (airDensityKgM3 <= 0.0001) {
    return {
      fallTimeVacuum: parseFloat(tVac.toFixed(3)),
      impactVelocityVacuum: parseFloat(vImpactVac.toFixed(2)),
      fallTimeAir: parseFloat(tVac.toFixed(3)),
      impactVelocityAir: parseFloat(vImpactVac.toFixed(2)),
      terminalVelocity: Infinity,
      trajectoryVacuum: trajVac,
      trajectoryAir: trajVac,
    };
  }

  // Terminal velocity
  const vTerminal = Math.sqrt((2 * m * g) / (airDensityKgM3 * Cd * A));

  // Runge-Kutta 4th order / Euler simulation for air resistance
  const dt = 0.005;
  let currY = h;
  let currV = 0.0;
  let currT = 0.0;
  const trajAir: { t: number; y: number; v: number }[] = [{ t: 0, y: h, v: 0 }];

  while (currY > 0 && currT < 60) {
    // a = g - (0.5 * rho * Cd * A * v^2) / m
    const dragForce = 0.5 * airDensityKgM3 * Cd * A * currV * currV;
    const a = g - dragForce / m;

    currV += a * dt;
    currY -= currV * dt;
    currT += dt;

    if (Math.round(currT * 100) % 5 === 0) {
      trajAir.push({
        t: parseFloat(currT.toFixed(3)),
        y: parseFloat(Math.max(0, currY).toFixed(3)),
        v: parseFloat(currV.toFixed(3)),
      });
    }
  }

  trajAir.push({
    t: parseFloat(currT.toFixed(3)),
    y: 0,
    v: parseFloat(currV.toFixed(3)),
  });

  return {
    fallTimeVacuum: parseFloat(tVac.toFixed(3)),
    impactVelocityVacuum: parseFloat(vImpactVac.toFixed(2)),
    fallTimeAir: parseFloat(currT.toFixed(3)),
    impactVelocityAir: parseFloat(currV.toFixed(2)),
    terminalVelocity: parseFloat(vTerminal.toFixed(2)),
    trajectoryVacuum: trajVac,
    trajectoryAir: trajAir,
  };
}
