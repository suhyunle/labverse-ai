/**
 * Deterministic Fluid Stratification & Immiscibility Engine
 * Grounded in Hydrostatics, Density Columns, and Interfacial Tension
 */

export interface FluidLayerSpec {
  id: string;
  name: string;
  densityKgM3: number;
  viscosityCP: number; // centipoise (mPa*s)
  colorHex: string;
  transparency: number;
  description: string;
}

export const FLUID_SPECIES_PRESETS: Record<string, FluidLayerSpec> = {
  mercury: {
    id: 'mercury',
    name: '액체 수은 (Mercury)',
    densityKgM3: 13534,
    viscosityCP: 1.55,
    colorHex: '#94a3b8',
    transparency: 0.1,
    description: '상온에서 유일한 액체 전이 금속, 극도의 밀도로 대부분의 금속을 띄움',
  },
  honey: {
    id: 'honey',
    name: '천연 꿀 (Honey)',
    densityKgM3: 1420,
    viscosityCP: 10000,
    colorHex: '#d97706',
    transparency: 0.85,
    description: '고점도 과포화 당 용액, 높은 밀도로 바닥층을 형성',
  },
  water: {
    id: 'water',
    name: '증류수 (Water)',
    densityKgM3: 1000,
    viscosityCP: 1.0,
    colorHex: '#0284c7',
    transparency: 0.7,
    description: '표준 극성 용매, 비극성 오일과 섞이지 않고 경계면 형성',
  },
  vegetable_oil: {
    id: 'vegetable_oil',
    name: '식물성 오일 (Vegetable Oil)',
    densityKgM3: 920,
    viscosityCP: 50.0,
    colorHex: '#eab308',
    transparency: 0.8,
    description: '비극성 탄화수소 사슬로 물보다 밀도가 낮아 상층 부유',
  },
  rubbing_alcohol: {
    id: 'rubbing_alcohol',
    name: '에탄올/알코올 (Alcohol)',
    densityKgM3: 789,
    viscosityCP: 1.2,
    colorHex: '#f43f5e',
    transparency: 0.75,
    description: '저밀도 유기 액체, 유체 기둥의 최상단에 안정적 배치',
  },
};

export interface FluidColumnState {
  sortedLayers: FluidLayerSpec[]; // Sorted by density descending (heaviest at bottom)
  hydrostaticPressureBaseKPa: number;
  separationHalfLifeSec: number;
  isSeparated: boolean;
  mixingEnergyIndex: number; // 0 (separated) to 1 (homogenized emulsion)
}

/**
 * Calculates deterministic density column equilibrium and separation dynamics.
 * Hydrostatic pressure: P = sum( rho_i * g * h_i )
 */
export function calculateFluidColumn(
  selectedLayerIds: string[],
  gravity: number = 9.80665,
  mixingEnergyPercent: number = 0,
  totalHeightMeters: number = 1.0
): FluidColumnState {
  const activeLayers = selectedLayerIds
    .map((id) => FLUID_SPECIES_PRESETS[id])
    .filter(Boolean);

  // In hydrostatic equilibrium, heavier fluids sink to bottom
  const sortedLayers = [...activeLayers].sort((a, b) => b.densityKgM3 - a.densityKgM3);

  const numLayers = Math.max(1, sortedLayers.length);
  const layerHeightM = totalHeightMeters / numLayers;

  // Hydrostatic pressure at the base
  let totalPressurePa = 101325; // 1 atm surface air pressure
  sortedLayers.forEach((layer) => {
    totalPressurePa += layer.densityKgM3 * gravity * layerHeightM;
  });

  // Average density difference driving phase separation
  let minDensityDiff = Infinity;
  for (let i = 0; i < sortedLayers.length - 1; i++) {
    const diff = sortedLayers[i].densityKgM3 - sortedLayers[i + 1].densityKgM3;
    if (diff < minDensityDiff) minDensityDiff = diff;
  }
  if (!isFinite(minDensityDiff)) minDensityDiff = 200;

  // Separation time: proportional to viscosity / (delta_rho * g)
  const avgViscosity = sortedLayers.reduce((acc, l) => acc + l.viscosityCP, 0) / numLayers;
  const separationHalfLife = Math.max(1.0, (avgViscosity / (minDensityDiff * 0.05 * (gravity / 9.8))));

  const isSeparated = mixingEnergyPercent < 5;

  return {
    sortedLayers,
    hydrostaticPressureBaseKPa: parseFloat((totalPressurePa / 1000).toFixed(2)),
    separationHalfLifeSec: parseFloat(separationHalfLife.toFixed(1)),
    isSeparated,
    mixingEnergyIndex: mixingEnergyPercent / 100,
  };
}
