/**
 * Deterministic Optics & Ray Tracing Scientific Engine
 * Grounded in Snell's Law and Fresnel Equations
 */

export interface OpticalMedium {
  id: string;
  name: string;
  refractiveIndex: number;
  color: string;
  absorbance: number;
}

export const OPTICAL_MEDIA_PRESETS: Record<string, OpticalMedium> = {
  vacuum: { id: 'vacuum', name: '진공 (Vacuum)', refractiveIndex: 1.0, color: 'rgba(5, 10, 20, 0.2)', absorbance: 0 },
  air: { id: 'air', name: '공기 (Air, STP)', refractiveIndex: 1.000293, color: 'rgba(56, 189, 248, 0.08)', absorbance: 0.001 },
  water: { id: 'water', name: '물 (Water, 20°C)', refractiveIndex: 1.333, color: 'rgba(14, 165, 233, 0.25)', absorbance: 0.01 },
  crown_glass: { id: 'crown_glass', name: '크라운 유리 (Crown Glass)', refractiveIndex: 1.52, color: 'rgba(129, 140, 248, 0.35)', absorbance: 0.02 },
  flint_glass: { id: 'flint_glass', name: '플린트 고밀도 유리 (Flint Glass)', refractiveIndex: 1.66, color: 'rgba(168, 85, 247, 0.4)', absorbance: 0.03 },
  diamond: { id: 'diamond', name: '다이아몬드 (Diamond)', refractiveIndex: 2.417, color: 'rgba(236, 72, 153, 0.5)', absorbance: 0.05 },
};

export interface OpticsCalculationResult {
  thetaIncidentDeg: number;
  thetaReflectedDeg: number;
  thetaRefractedDeg: number | null; // null if Total Internal Reflection (TIR)
  criticalAngleDeg: number | null; // null if n1 <= n2
  isTotalInternalReflection: boolean;
  reflectance: number; // 0.0 to 1.0 (Fresnel power reflection coefficient)
  transmittance: number; // 0.0 to 1.0 (Fresnel power transmission coefficient)
  speedMedium1KmS: number;
  speedMedium2KmS: number;
  wavelengthRatio: number; // lambda2 / lambda1 = n1 / n2
}

const SPEED_OF_LIGHT_VACUUM = 299792.458; // km/s

/**
 * Calculates reflection, refraction, critical angle, and Fresnel reflection coefficients.
 * Snell's Law: n1 * sin(theta1) = n2 * sin(theta2)
 */
export function calculateOptics(
  thetaIncidentDegrees: number,
  n1: number,
  n2: number
): OpticsCalculationResult {
  const theta1Deg = Math.max(0, Math.min(89.9, thetaIncidentDegrees));
  const theta1Rad = (theta1Deg * Math.PI) / 180;

  // Reflection angle equals incident angle
  const thetaReflectedDeg = theta1Deg;

  // Critical angle: sin(theta_c) = n2 / n1 (only exists when n1 > n2)
  let criticalAngleDeg: number | null = null;
  if (n1 > n2) {
    const sinCritical = n2 / n1;
    criticalAngleDeg = parseFloat(((Math.asin(Math.min(1.0, sinCritical)) * 180) / Math.PI).toFixed(2));
  }

  // Snell's Law: sin(theta2) = (n1 / n2) * sin(theta1)
  const sinTheta2 = (n1 / n2) * Math.sin(theta1Rad);
  const isTIR = sinTheta2 > 1.0;

  let thetaRefractedDeg: number | null = null;
  let R = 1.0; // Reflectance
  let T = 0.0; // Transmittance

  if (!isTIR) {
    const theta2Rad = Math.asin(sinTheta2);
    thetaRefractedDeg = parseFloat(((theta2Rad * 180) / Math.PI).toFixed(2));

    // Fresnel Equations for unpolarized light:
    // Rs = |(n1*cos1 - n2*cos2) / (n1*cos1 + n2*cos2)|^2
    // Rp = |(n1*cos2 - n2*cos1) / (n1*cos2 + n2*cos1)|^2
    // R = 0.5 * (Rs + Rp)
    const cos1 = Math.cos(theta1Rad);
    const cos2 = Math.cos(theta2Rad);

    const rs = Math.pow((n1 * cos1 - n2 * cos2) / (n1 * cos1 + n2 * cos2), 2);
    const rp = Math.pow((n1 * cos2 - n2 * cos1) / (n1 * cos2 + n2 * cos1), 2);
    R = Math.min(1.0, Math.max(0.0, 0.5 * (rs + rp)));
    T = Math.max(0.0, 1.0 - R);
  } else {
    // Total internal reflection: 100% reflected
    R = 1.0;
    T = 0.0;
  }

  return {
    thetaIncidentDeg: parseFloat(theta1Deg.toFixed(2)),
    thetaReflectedDeg: parseFloat(thetaReflectedDeg.toFixed(2)),
    thetaRefractedDeg,
    criticalAngleDeg,
    isTotalInternalReflection: isTIR,
    reflectance: parseFloat(R.toFixed(3)),
    transmittance: parseFloat(T.toFixed(3)),
    speedMedium1KmS: parseFloat((SPEED_OF_LIGHT_VACUUM / n1).toFixed(0)),
    speedMedium2KmS: parseFloat((SPEED_OF_LIGHT_VACUUM / n2).toFixed(0)),
    wavelengthRatio: parseFloat((n1 / n2).toFixed(3)),
  };
}
