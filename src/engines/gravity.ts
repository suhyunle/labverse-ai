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

// ---------------------------------------------------------------------------
// Fixed-timestep fall simulation (RK4) with quadratic drag, plus closed-form
// reference solutions used for verification.
//   a(v) = g - k v^2,   k = rho * Cd * A / (2 m),   F_d = 1/2 rho v^2 Cd A
// ---------------------------------------------------------------------------

export interface FallBody {
  massKg: number;
  areaM2: number;
  dragCoefficient: number;
}

export interface FallParams {
  heightM: number;
  gravity: number;
  airDensity: number;
}

export interface FallSample {
  t: number;
  /** height of the body above ground (m) */
  y: number;
  /** downward speed (m/s) */
  v: number;
}

export interface FallSimulation {
  samples: FallSample[];
  landingTime: number;
  impactVelocity: number;
  terminalVelocity: number;
}

export interface FallAnalytic {
  landingTime: number;
  impactVelocity: number;
  terminalVelocity: number;
}

export const SIM_DT = 0.001;
const SAMPLE_EVERY = 10; // keep one sample per 10 ms
const MAX_SIM_TIME = 120;

function dragK(p: FallParams, b: FallBody): number {
  if (p.airDensity <= 0) return 0;
  return (p.airDensity * b.dragCoefficient * b.areaM2) / (2 * b.massKg);
}

export function analyticFall(p: FallParams, b: FallBody): FallAnalytic {
  const k = dragK(p, b);
  if (k === 0) {
    return {
      landingTime: Math.sqrt((2 * p.heightM) / p.gravity),
      impactVelocity: Math.sqrt(2 * p.gravity * p.heightM),
      terminalVelocity: Infinity,
    };
  }
  const vt = Math.sqrt(p.gravity / k);
  const landingTime = Math.acosh(Math.exp(k * p.heightM)) / Math.sqrt(p.gravity * k);
  const impactVelocity = vt * Math.sqrt(1 - Math.exp(-2 * k * p.heightM));
  return { landingTime, impactVelocity, terminalVelocity: vt };
}

export function simulateFall(p: FallParams, b: FallBody, dt: number = SIM_DT): FallSimulation {
  const k = dragK(p, b);
  const accel = (v: number) => p.gravity - k * v * v;

  let t = 0;
  let y = p.heightM;
  let v = 0;
  const samples: FallSample[] = [{ t: 0, y, v: 0 }];
  let step = 0;

  while (t < MAX_SIM_TIME) {
    // RK4 on (y' = -v, v' = a(v))
    const k1v = accel(v);
    const k2v = accel(v + 0.5 * dt * k1v);
    const k3v = accel(v + 0.5 * dt * k2v);
    const k4v = accel(v + dt * k3v);
    const vNext = v + (dt / 6) * (k1v + 2 * k2v + 2 * k3v + k4v);
    const yNext = y - (dt / 2) * (v + vNext); // trapezoid on the RK4 velocities

    if (yNext <= 0) {
      const frac = y / (y - yNext);
      const tLand = t + frac * dt;
      const vLand = v + frac * (vNext - v);
      samples.push({ t: tLand, y: 0, v: vLand });
      return {
        samples,
        landingTime: tLand,
        impactVelocity: vLand,
        terminalVelocity: k === 0 ? Infinity : Math.sqrt(p.gravity / k),
      };
    }

    t += dt;
    y = yNext;
    v = vNext;
    step++;
    if (step % SAMPLE_EVERY === 0) samples.push({ t, y, v });
  }

  const last = samples[samples.length - 1];
  return { samples, landingTime: last.t, impactVelocity: last.v, terminalVelocity: k === 0 ? Infinity : Math.sqrt(p.gravity / k) };
}

/** State of a precomputed fall at time t (clamped; linear interpolation between samples). */
export function sampleAt(sim: FallSimulation, t: number): FallSample {
  const s = sim.samples;
  if (t <= 0) return s[0];
  const last = s[s.length - 1];
  if (t >= last.t) return last;
  // samples are uniform (0.01 s) except the final one, so index directly then correct
  let i = Math.min(s.length - 2, Math.floor(t / (SAMPLE_EVERY * SIM_DT)));
  while (i > 0 && s[i].t > t) i--;
  while (i < s.length - 2 && s[i + 1].t < t) i++;
  const a = s[i];
  const b = s[i + 1];
  const f = (t - a.t) / (b.t - a.t || 1);
  return { t, y: a.y + f * (b.y - a.y), v: a.v + f * (b.v - a.v) };
}

export const FALL_BODY_PRESETS: Record<string, { name: string; body: FallBody; color: string }> = {
  bowling_ball: { name: '볼링공', body: { massKg: 6, areaM2: 0.0366, dragCoefficient: 0.47 }, color: '#22d3ee' },
  feather: { name: '깃털', body: { massKg: 0.005, areaM2: 0.0078, dragCoefficient: 1.3 }, color: '#fb7185' },
  gold_sphere: { name: '금 구체', body: { massKg: 19.3, areaM2: 0.0121, dragCoefficient: 0.47 }, color: '#fbbf24' },
  wooden_block: { name: '나무 블록', body: { massKg: 0.8, areaM2: 0.0201, dragCoefficient: 1.05 }, color: '#a78bfa' },
};

export const GRAVITY_PLANET_PRESETS = [
  { id: 'earth', name: '지구', g: 9.81 },
  { id: 'moon', name: '달', g: 1.62 },
  { id: 'mars', name: '화성', g: 3.71 },
  { id: 'jupiter', name: '목성', g: 24.79 },
] as const;

export function bodyFromVariables(vars: Record<string, number>, which: 'A' | 'B'): FallBody {
  const dflt = which === 'A' ? FALL_BODY_PRESETS.bowling_ball.body : FALL_BODY_PRESETS.feather.body;
  return {
    massKg: vars[`mass${which}`] ?? dflt.massKg,
    areaM2: vars[`area${which}`] ?? dflt.areaM2,
    dragCoefficient: vars[`cd${which}`] ?? dflt.dragCoefficient,
  };
}

export function paramsFromVariables(vars: Record<string, number>): FallParams {
  return {
    heightM: vars.dropHeight ?? 30,
    gravity: vars.gravity ?? 9.81,
    airDensity: vars.airDensity ?? 0,
  };
}
