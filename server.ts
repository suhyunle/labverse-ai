import express, { Request, Response } from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

// Initialize GoogleGenAI
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({
  apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Predefined verified templates for instant high-speed fallback & seed matching
const PRESET_EXPERIMENTS: Record<string, any> = {
  volcano: {
    id: 'exp-volcano-standard',
    title: '화산 마그마 압력 및 분출 메커니즘 실험실',
    domain: 'earth_science',
    sceneType: 'volcano',
    learningObjectives: [
      '마그마 방(Magma Chamber) 내부 압력과 화산 분출 강도(VEI)의 물리적 상관관계 분석',
      '화산 가스(휘발성분) 함량이 점성과 폭발성에 미치는 유체역학적 영향 이해',
      '화도(Conduit)의 저항 및 분화구 폐색이 폭발 임계점에 미치는 영향 탐구',
    ],
    scientificPrinciples: [
      {
        name: '유체 압력 및 베르누이 정리',
        description: '마그마 방 내부 압력이 지각의 구속 압력과 마그마의 정수압을 초과할 때 화도를 통한 급격한 분출이 유도됩니다.',
        formula: 'P_{chamber} > P_{lithostatic} + \\rho g h + \\Delta P_{friction}',
      },
      {
        name: '기포 탈가스화 및 급격한 부피 팽창',
        description: '마그마 상승 시 감압에 의해 용해되어 있던 H2O, CO2, SO2 가스가 급격히 팽창하며 폭발적인 파쇄를 유발합니다.',
        formula: 'V \\propto \\frac{nRT}{P}',
      },
      {
        name: '화산 폭발 지수 (VEI)',
        description: '분출물 부피, 분연주(Ash Plume) 높이, 분출 에너지에 따른 폭발 규모 정량 척도 (0~8 단계).',
      },
    ],
    variables: [
      {
        id: 'pressure',
        label: '마그마 방 압력 (Chamber Pressure)',
        min: 0,
        max: 100,
        default: 55,
        step: 1,
        unit: 'kPa',
        description: '지하 마그마 챔버 내부의 누적 압력. 65를 초과하면 지각 균열 파괴 및 폭발 분출이 발생합니다.',
      },
      {
        id: 'gasContent',
        label: '화산 가스 및 휘발성분 (Volatile Ratio)',
        min: 0,
        max: 100,
        default: 45,
        step: 1,
        unit: '%',
        description: '수증기, 이산화황 등 기포 비율. 가스 비율이 높을수록 폭발성 플리니식 분화와 고공 분연주가 형성됩니다.',
      },
      {
        id: 'ventResistance',
        label: '분화구 폐색 및 저항도 (Conduit Resistance)',
        min: 10,
        max: 100,
        default: 50,
        step: 1,
        unit: '%',
        description: '식어 굳은 용암 돔 또는 화도 굴절 저항. 저항이 높으면 압력이 더 축적되어 분화 시 폭발력이 급격히 증폭됩니다.',
      },
      {
        id: 'magmaViscosity',
        label: '마그마 규산염(SiO2) 점성 (Viscosity)',
        min: 10,
        max: 90,
        default: 40,
        step: 1,
        unit: 'Pa·s',
        description: '규산염(SiO2) 함량에 따른 점성. 점성이 낮으면 현무암질 유동성 용암, 높으면 유문암질 폭발 분화가 일어납니다.',
      },
    ],
    observableOutputs: [
      {
        id: 'plumeHeight',
        label: '화산재 분연주 고도',
        unit: 'km',
        formula: 'H = 2.0 \\times (P \\times G / 100)^{0.65}',
        description: '성층권 또는 대류권으로 치솟는 화산재 구름의 최대 고도',
      },
      {
        id: 'veiScale',
        label: '화산 폭발 지수 (VEI)',
        unit: '등급',
        description: '분화 강도 척도 (0: 비폭발성 하와이식 ~ 6: 초거대 플리니식)',
      },
      {
        id: 'conduitVelocity',
        label: '화도 분출 속도',
        unit: 'm/s',
        description: '화도를 통해 분출되는 용암 및 가스 혼합물의 평균 유출 속도',
      },
      {
        id: 'eruptionType',
        label: '분화 양식',
        unit: '유형',
        description: '하와이안식(유출), 스트롬볼리안식(간헐), 불카니안식(폭발), 플리니안식(초거대 대폭발)',
      },
    ],
    simulationModel: 'volcano_thermodynamics_v2',
    visualEffects: ['cross_section_cutaway', 'pulsating_magma_chamber', 'pyroclastic_flow', 'ballistic_bombs', 'volcanic_ash_cloud', 'seismic_tremor'],
    safetyNotes: [
      '실제 화산 분화 시에는 쇄설류와 유독가스(SO2, CO)로 인해 반경 수십 km 이내 접근이 금지됩니다.',
      '본 실험실은 교육용 유체역학 및 열역학 모델에 기반한 가상 인터랙티브 시뮬레이션입니다.',
    ],
    explanation: '화산 폭발은 지구 내부 맨틀 대류로부터 생성된 규산염 용융체(마그마)가 지표면으로 상승하면서 발생합니다. 마그마가 상승함에 따라 주변 암석 압력이 낮아지며 마그마 내 용해되어 있던 가스가 급격히 팽창합니다. 마그마 방 압력과 가스 함량이 화도 저항을 초과할 때, 막대한 열에너지가 운동에너지로 전환되며 분화가 폭발적으로 일어납니다.',
    guidedSteps: [
      {
        stepNumber: 1,
        title: '정상 상태 관찰',
        instruction: '마그마 챔버의 은은한 대류 맥동과 지하 깊이에 따른 지각 층리를 단면 뷰에서 확인하세요.',
      },
      {
        stepNumber: 2,
        title: '압력 임계점 도달',
        instruction: '마그마 방 압력 슬라이더를 65 kPa 이상으로 점진적으로 올려 화도 내부로 마그마가 솟구치는 모습을 관찰하세요.',
        targetAction: 'pressure > 65',
      },
      {
        stepNumber: 3,
        title: '가스 함량 극대화 (플리니식 분화)',
        instruction: '화산 가스 함량을 80% 이상으로 높여 폭발성 파쇄와 30km 상공까지 솟구치는 거대 분연주 형성을 탐구하세요.',
        targetAction: 'gasContent > 80',
      },
    ],
    suggestedQueries: [
      '압력을 최대로 올리고 가스 함량을 줄이면 어떻게 돼?',
      '점성이 높은 마그마와 낮은 마그마는 화산 모양을 어떻게 다르게 만드나요?',
      '분화구 저항도를 100%로 막으면 어떤 폭발이 일어나?',
      '실제 백두산이나 폼페이 베수비오 화산 분화는 어떤 수치였을까?',
    ],
  },
  solar_system: {
    id: 'exp-solar-system-gravity',
    title: '태양계 천체 역학 및 지구-달 중력 궤도 실험실',
    domain: 'astronomy',
    sceneType: 'solar_system',
    learningObjectives: [
      '케플러 행성 운동 법칙 및 뉴턴 만유인력 법칙의 역학적 원리 탐구',
      '지구 공전 궤도 및 자전축 경사(23.5°)에 따른 사계절 변화와 일조각 이해',
      '지구-달 공전 궤도와 위상 변화, 그리고 기조력(조석 현상) 메커니즘 분석',
    ],
    scientificPrinciples: [
      {
        name: '뉴턴 만유인력 법칙',
        description: '두 천체 사이에는 질량의 곱에 비례하고 거리의 제곱에 반비례하는 인력이 작용합니다.',
        formula: 'F_g = G \\frac{M_1 M_2}{r^2}',
      },
      {
        name: '케플러 제3법칙 (조화의 법칙)',
        description: '행성의 공전 주기의 제곱은 궤도 장반경의 세제곱에 비례합니다.',
        formula: 'T^2 = \\frac{4\\pi^2}{G M_{sun}} a^3',
      },
      {
        name: '기조력 (Tidal Force)',
        description: '달이 지구의 가까운 면과 먼 면에 미치는 중력 차이에 의해 해수면이 양방향으로 팽창합니다.',
        formula: 'F_{tidal} \\approx \\frac{2 G M_{moon} R_{earth}}{r^3}',
      },
    ],
    variables: [
      {
        id: 'timeScale',
        label: '시간 시뮬레이션 배속 (Simulation Speed)',
        min: 0,
        max: 10,
        default: 1.5,
        step: 0.1,
        unit: '배속',
        description: '공전 및 자전 시간의 진행 배속. 0으로 두면 일시 정지되어 현재 각도를 정밀 관측할 수 있습니다.',
      },
      {
        id: 'gravityMultiplier',
        label: '만유인력 상수 배율 (Gravity Multiplier)',
        min: 0.2,
        max: 2.5,
        default: 1.0,
        step: 0.05,
        unit: 'G/G₀',
        description: '태양과 행성 간 작용하는 중력 세기 배율. 1.0은 실제 현실 우주 물리 계수입니다.',
      },
      {
        id: 'moonDistanceMultiplier',
        label: '지구-달 거리 비율 (Moon Orbital Radius)',
        min: 0.5,
        max: 2.5,
        default: 1.0,
        step: 0.05,
        unit: 'R/R₀',
        description: '지구와 달 중심 간 평균 거리 비율. 거리가 가까워지면 조석력과 공전 속도가 기하급수적으로 증가합니다.',
      },
      {
        id: 'earthOrbitalSpeed',
        label: '지구 초기 공전 속도 배율 (Earth Velocity)',
        min: 0.4,
        max: 1.6,
        default: 1.0,
        step: 0.05,
        unit: 'v/v₀',
        description: '지구의 공전 궤도 속도. 속도가 너무 빠르면 탈출 궤도(쌍곡선), 느리면 태양으로 나선 추락합니다.',
      },
    ],
    observableOutputs: [
      {
        id: 'orbitalPeriod',
        label: '지구 공전 주기',
        unit: '일 (Days)',
        formula: '365.25 \\times (1 / G)^{0.5}',
        description: '지구가 태양 주위를 1회 완전히 공전하는 데 걸리는 지구 시간',
      },
      {
        id: 'moonPeriod',
        label: '달 공전 주기 (삭망월/항성월)',
        unit: '일 (Days)',
        description: '달이 지구를 1회 공전하는 주기 (기준 약 27.3일)',
      },
      {
        id: 'tidalForceIndex',
        label: '해양 기조력 지수',
        unit: '상대 지수',
        formula: '1.0 / (R_{moon}^3)',
        description: '달의 인력에 의해 발생하는 지구 조석 밀물/썰물 융기 강도',
      },
      {
        id: 'orbitEccentricity',
        label: '궤도 이심률 (Eccentricity)',
        unit: 'e',
        description: '궤도의 찌그러진 정도 (0: 완벽한 원, 0~1: 타원, 1 이상: 탈출 쌍곡선)',
      },
    ],
    simulationModel: 'keplerian_gravitational_nbody_v1',
    visualEffects: ['orbital_trajectories', 'day_night_terminator', 'sun_corona_glow', 'atmospheric_scattering', 'tidal_force_bulge', 'moon_phase_indicator'],
    safetyNotes: [
      '가상 중력 배율을 급격히 0.3 이하로 낮출 경우 행성이 태양계 밖으로 이탈하여 영구 동결될 수 있습니다.',
      '천체 간 실제 크기 및 거리는 인간의 시각적 직관과 학습을 위해 과학적으로 최적화된 스케일 팩터로 렌더링됩니다.',
    ],
    explanation: '태양계는 약 46억 년 전 거대 성간 분자 구름의 중력 수축으로 형성되었습니다. 중심의 태양이 전체 질량의 99.86%를 차지하며 막대한 중력장으로 지구를 비롯한 행성들을 궤도 운동으로 구속합니다. 지구가 태양으로 빨려 들어가지 않는 이유는 공전 속도에 의한 관성(원심력)과 태양 중력이 완벽한 균형을 이루고 있기 때문입니다.',
    guidedSteps: [
      {
        stepNumber: 1,
        title: '지구의 자전과 공전 확인',
        instruction: '지구의 23.5도 기울어진 자전축과 낮과 밤의 경계선(Terminator)을 확인하고 계절의 형성을 관측하세요.',
      },
      {
        stepNumber: 2,
        title: '달의 거리 변화와 기조력',
        instruction: '지구-달 거리 비율을 0.6배로 가깝게 줄여 조석력 지수가 4.6배 이상 치솟는 역제곱 역삼제곱 법칙을 경험하세요.',
        targetAction: 'moonDistanceMultiplier < 0.7',
      },
      {
        stepNumber: 3,
        title: '중력 붕괴 실험',
        instruction: '만유인력 상수 배율을 0.3배로 급감시키거나 2.0배로 증가시켜 행성 궤도의 이탈 및 나선 궤적을 관찰하세요.',
        targetAction: 'gravityMultiplier != 1.0',
      },
    ],
    suggestedQueries: [
      '중력을 절반으로 줄이면 지구는 어디로 날아가?',
      '달이 지구와 지금보다 두 배 가까워지면 쓰나미가 일어나나요?',
      '지구의 자전축 기울기가 0도가 되면 사계절은 어떻게 될까?',
      '지구 공전 속도를 최대로 빠르게 설정해줘',
    ],
  },
  buoyancy: {
    id: 'exp-archimedes-buoyancy',
    title: '아르키메데스 원리 및 유체 부력 유체역학 실험실',
    domain: 'physics',
    sceneType: 'buoyancy',
    learningObjectives: [
      '아르키메데스의 원리: 유체에 잠긴 물체가 받는 부력의 크기는 밀려난 유체의 무게와 같음을 증명',
      '물체 밀도와 유체 밀도의 상대적 비율에 따른 부유(Float), 중성 부력(Neutral), 침강(Sink) 조건 분석',
      '중력 가속도 변화(지구 vs 달 vs 목성)가 물체의 침수 깊이에 미치는 영향 탐구',
    ],
    scientificPrinciples: [
      {
        name: '아르키메데스의 원리',
        description: '유체 속에 잠긴 물체는 물체가 밀어낸 유체의 무게와 크기가 같고 방향이 반대인 연직 상향의 부력을 받습니다.',
        formula: 'F_B = \\rho_{fluid} \\cdot V_{submerged} \\cdot g',
      },
      {
        name: '중력과 부력의 평형 방정식',
        description: '물체가 정지하여 떠 있을 때 중력(F_g)과 부력(F_B)의 합력은 0입니다.',
        formula: 'F_{net} = F_B - F_g = (\\rho_{fluid} V_{sub} - \\rho_{obj} V_{total}) g = 0',
      },
      {
        name: '침수 부피 비율 (Submerged Fraction)',
        description: '떠 있는 물체의 전체 부피 대비 물속에 잠긴 부피 비율은 물체 밀도와 유체 밀도의 비와 정확히 일치합니다.',
        formula: '\\frac{V_{sub}}{V_{total}} = \\frac{\\rho_{object}}{\\rho_{fluid}}',
      },
    ],
    variables: [
      {
        id: 'fluidDensity',
        label: '유체 밀도 (Fluid Density)',
        min: 600,
        max: 13600,
        default: 1000,
        step: 50,
        unit: 'kg/m³',
        description: '주변 액체의 밀도. 800: 알코올/기름, 1,000: 순수한 물, 1,030: 바닷물, 13,600: 액체 수은.',
      },
      {
        id: 'objectDensity',
        label: '물체 밀도 (Object Density)',
        min: 200,
        max: 8900,
        default: 700,
        step: 25,
        unit: 'kg/m³',
        description: '물체의 재질 밀도. 500: 소나무, 920: 얼음, 1,000: 물, 2,700: 알루미늄, 7,800: 강철.',
      },
      {
        id: 'objectVolume',
        label: '물체 체적 (Object Volume)',
        min: 0.1,
        max: 5.0,
        default: 1.0,
        step: 0.1,
        unit: 'm³',
        description: '시험 대상 물체의 총 기하학적 부피.',
      },
      {
        id: 'gravity',
        label: '중력 가속도 (Gravity Accel)',
        min: 1.6,
        max: 25.0,
        default: 9.8,
        step: 0.1,
        unit: 'm/s²',
        description: '행성 환경의 중력. 1.6: 달, 9.8: 지구, 24.8: 목성.',
      },
    ],
    observableOutputs: [
      {
        id: 'buoyantForce',
        label: '작용 부력 (Buoyant Force)',
        unit: 'N (뉴턴)',
        formula: 'F_B = \\rho_{f} V_{sub} g',
        description: '물체를 위로 밀어 올리는 유체의 정압 합력',
      },
      {
        id: 'gravitationalForce',
        label: '물체 중력 (Weight Force)',
        unit: 'N (뉴턴)',
        formula: 'F_g = m g = \\rho_{o} V_{tot} g',
        description: '지구가 물체를 아래로 끌어당기는 무게',
      },
      {
        id: 'submergedRatio',
        label: '침수 비율 (Submerged %)',
        unit: '%',
        description: '물체가 액체 표면 아래로 잠겨 있는 체적 비율 (100% 초과 시 완전 침강)',
      },
      {
        id: 'netState',
        label: '평형 상태',
        unit: '상태',
        description: '완전 부유(Floating) / 평형(Neutral) / 바닥 침강(Sunken)',
      },
    ],
    simulationModel: 'archimedes_hydrostatic_equilibrium_v1',
    visualEffects: ['fluid_displacement_level', 'dynamic_force_vectors', 'water_ripple_particles', 'cross_sectional_grid', 'density_stratification'],
    safetyNotes: [
      '실제 수은(13,600 kg/m³)은 쇠구슬도 둥둥 띄우지만 극심한 신경독성을 지니므로 가상 실험실에서만 안전하게 관찰합니다.',
    ],
    explanation: '아르키메데스는 왕관이 순금인지 판별하기 위해 목욕탕에 들어갔다가 수면이 차오르는 것을 보고 "유레카!"를 외쳤습니다. 물체가 유체에 잠길 때 물체의 상단과 하단에 작용하는 정수압 차이로 인해 알짜 윗방향 힘(부력)이 발생하며, 이 부력의 크기는 물체에 의해 배제된 유체의 무게와 수학적으로 정확히 일치합니다.',
    guidedSteps: [
      {
        stepNumber: 1,
        title: '얼음의 90% 침수 관측',
        instruction: '물체 밀도를 얼음 밀도인 920 kg/m³로 두고, 순수한 물(1000 kg/m³)에서 왜 빙산의 일각(10%)만 수면 위에 남는지 확인하세요.',
      },
      {
        stepNumber: 2,
        title: '쇠구슬을 띄우는 수은 유체 실험',
        instruction: '물체 밀도를 강철(7,800 kg/m³)로 올린 뒤 가라앉는 것을 확인하고, 유체 밀도를 수은(13,600 kg/m³)으로 변경하여 강철이 물처럼 떠오르는 현상을 관측하세요.',
        targetAction: 'fluidDensity > 10000',
      },
      {
        stepNumber: 3,
        title: '중력 가속도와 부력 비율',
        instruction: '중력 가속도를 달(1.6 m/s²)과 목성(24.8 m/s²)으로 변경해도 침수 비율(V_sub/V_tot)은 왜 변하지 않는지 공식으로부터 증명하세요.',
      },
    ],
    suggestedQueries: [
      '수은에 무거운 쇠구슬을 넣으면 정말 뜨나요?',
      '달나라에서 얼음이 물에 뜨면 지구에서보다 더 많이 잠길까?',
      '물체 밀도를 8000으로 올려서 바닥에 가라앉혀줘',
      '잠수함은 어떤 원리로 물속에서 깊이를 조절해?',
    ],
  },
};

// Fallback experiment generator if AI fails or returns invalid response
function generateFallbackExperiment(query: string) {
  const lower = query.toLowerCase();
  if (lower.includes('화산') || lower.includes('폭발') || lower.includes('마그마') || lower.includes('용암') || lower.includes('volcano')) {
    return PRESET_EXPERIMENTS.volcano;
  }
  if (lower.includes('태양') || lower.includes('지구') || lower.includes('달') || lower.includes('우주') || lower.includes('행성') || lower.includes('공전') || lower.includes('중력') || lower.includes('solar') || lower.includes('orbit')) {
    return PRESET_EXPERIMENTS.solar_system;
  }
  if (lower.includes('뜨') || lower.includes('가라앉') || lower.includes('부력') || lower.includes('아르키메데스') || lower.includes('밀도') || lower.includes('float') || lower.includes('sink')) {
    return PRESET_EXPERIMENTS.buoyancy;
  }

  // Conceptual fallback for other scientific inquiries
  return {
    id: `exp-conceptual-${Date.now()}`,
    title: `[개념 가상 실험실] ${query.slice(0, 30)}`,
    domain: 'general',
    sceneType: 'conceptual',
    isConceptualOnly: true,
    limitations: '본 주제는 고정밀 물리 엔진이 아닌 교육용 인터랙티브 개념 가시화 모델로 제공됩니다.',
    learningObjectives: [
      `"${query}" 현상의 핵심 과학 원리와 상호작용 변수 이해`,
      '에너지 전달 및 물질 보존 메커니즘 관찰',
      '조작 변인과 종속 변인의 인과관계 정량 분석',
    ],
    scientificPrinciples: [
      {
        name: '시스템 동역학 및 상호작용 원리',
        description: '입력된 에너지와 입자 간의 상호작용으로 새로운 평형 상태가 형성됩니다.',
        formula: 'E_{in} = \\Delta U + W_{out}',
      },
      {
        name: '질량 및 에너지 보존 법칙',
        description: '닫힌 계에서 물질과 총 에너지는 보존되며 형태만 변환됩니다.',
      },
    ],
    variables: [
      {
        id: 'intensity',
        label: '반응 강도 / 에너지 투입량 (Intensity)',
        min: 0,
        max: 100,
        default: 50,
        step: 1,
        unit: '%',
        description: '실험 시스템에 가해지는 주 자극 또는 활성화 에너지 수준',
      },
      {
        id: 'reactionRate',
        label: '상호작용 속도 (Reaction / Flux Rate)',
        min: 10,
        max: 100,
        default: 45,
        step: 1,
        unit: 'a.u.',
        description: '입자 충돌 빈도 및 시스템 내 전달 속도',
      },
      {
        id: 'dampingFactor',
        label: '저항 / 안정화 계수 (Stabilization)',
        min: 0,
        max: 100,
        default: 30,
        step: 1,
        unit: '%',
        description: '시스템의 과열을 억제하고 평형 상태로 유도하는 완충 작용',
      },
    ],
    observableOutputs: [
      {
        id: 'energyYield',
        label: '시스템 활성 에너지',
        unit: 'kJ',
        description: '상호작용 결과 방출되는 유효 에너지 총량',
      },
      {
        id: 'equilibriumIndex',
        label: '동적 평형 지수',
        unit: '%',
        description: '변화가 안정 상태에 도달한 비율',
      },
    ],
    simulationModel: 'conceptual_particle_network_v1',
    visualEffects: ['energy_particle_flux', 'node_resonance', 'force_field_glow'],
    safetyNotes: ['가상 개념 모델로 안전하게 탐구할 수 있습니다.'],
    explanation: `사용자가 질문한 "${query}" 현상은 복합적인 물리·화학적 법칙에 의해 작동합니다. 변수를 조절하여 에너지 투입량과 전달 속도에 따른 시스템의 동적 평형 변화를 확인해 보세요.`,
    guidedSteps: [
      {
        stepNumber: 1,
        title: '초기 평형 관측',
        instruction: '기본 설정 상태에서 입자 노드들의 정상 진동 패턴을 관측하세요.',
      },
      {
        stepNumber: 2,
        title: '에너지 증폭',
        instruction: '반응 강도를 80% 이상으로 높여 입자 충돌 및 에너지 방출 팽창을 확인하세요.',
      },
    ],
    suggestedQueries: [
      '에너지 투입을 최대로 올리면 어떻게 돼?',
      '안정화 계수를 0으로 줄여줘',
      '이 현상을 실생활에서 볼 수 있는 곳은 어디야?',
    ],
  };
}

// 1. AI Experiment Architect API
app.post('/api/plan-experiment', async (req: Request, res: Response) => {
  try {
    const { query } = req.body;
    if (!query || typeof query !== 'string') {
      res.status(400).json({ error: 'Valid scientific query is required' });
      return;
    }

    const trimmed = query.trim();

    // Check fast keyword matches for precision
    const lower = trimmed.toLowerCase();
    if (lower.includes('화산') || lower.includes('마그마') || lower.includes('volcano')) {
      // Customise title with query if appropriate
      const base = { ...PRESET_EXPERIMENTS.volcano };
      base.id = `exp-volcano-${Date.now()}`;
      res.json({ experiment: base });
      return;
    }
    if (lower.includes('태양계') || lower.includes('지구와 달') || lower.includes('달의') || lower.includes('행성') || lower.includes('solar system')) {
      const base = { ...PRESET_EXPERIMENTS.solar_system };
      base.id = `exp-solar-${Date.now()}`;
      res.json({ experiment: base });
      return;
    }
    if (lower.includes('부력') || lower.includes('뜨고') || lower.includes('가라앉') || lower.includes('아르키메데스') || lower.includes('buoyancy')) {
      const base = { ...PRESET_EXPERIMENTS.buoyancy };
      base.id = `exp-buoyancy-${Date.now()}`;
      res.json({ experiment: base });
      return;
    }

    // If Gemini API Key is available, use Gemini 3.8 / 4 to design an experiment specification!
    if (apiKey) {
      try {
        const systemPrompt = `You are the Lead Scientific Experiment Architect at Science Universe, a Google DeepMind hackathon project.
Your mission is to take any scientific question from a curious learner and engineer an interactive, scientifically grounded 3D laboratory experiment specification.

Language: Korean (primary for labels, explanations, objectives) and standard mathematical/scientific notation.

Supported high-fidelity 3D simulation scene types:
1. 'volcano' (for geological, volcanic, magma pressure, plate tectonics, explosion, thermodynamics)
2. 'solar_system' (for orbital mechanics, gravity, Kepler's laws, seasons, Earth-Moon-Sun tides, eclipses, celestial physics)
3. 'buoyancy' (for Archimedes principle, fluid density, floating/sinking, gravity variations, hydrostatic balance)
4. 'conceptual' (for any other science topics: chemistry reactions, electricity/circuits, quantum waves, biology, genetics. NOTE: set isConceptualOnly: true and explain limitations!)

Return ONLY a valid JSON object strictly matching this schema without markdown code blocks:
{
  "id": "exp-string",
  "title": "실험실 제목",
  "domain": "earth_science" | "astronomy" | "physics" | "chemistry" | "biology" | "general",
  "sceneType": "volcano" | "solar_system" | "buoyancy" | "conceptual",
  "learningObjectives": ["학습 목표 1", "학습 목표 2", "학습 목표 3"],
  "scientificPrinciples": [
    {
      "name": "원리 명칭",
      "description": "원리 설명",
      "formula": "LaTeX 수식(선택)"
    }
  ],
  "variables": [
    {
      "id": "variable_id",
      "label": "변수 레이블 (단위)",
      "min": number,
      "max": number,
      "default": number,
      "step": number,
      "unit": "단위",
      "description": "변수에 대한 설명과 조작 시 일어나는 물리적 영향"
    }
  ],
  "observableOutputs": [
    {
      "id": "output_id",
      "label": "측정량 명칭",
      "unit": "단위",
      "formula": "계산식 또는 설명",
      "description": "지표 설명"
    }
  ],
  "simulationModel": "model_identifier_v1",
  "visualEffects": ["effect1", "effect2"],
  "safetyNotes": ["안전 주의사항"],
  "explanation": "해당 과학 현상의 상세하고 흥미로운 과학적 설명",
  "guidedSteps": [
    {
      "stepNumber": 1,
      "title": "탐구 단계 제목",
      "instruction": "사용자가 실험실에서 직접 조작해 볼 안내"
    }
  ],
  "suggestedQueries": ["AI 과학자에게 물어볼 수 있는 질문 3~4개"],
  "isConceptualOnly": boolean,
  "limitations": "한계점 설명 (해당되는 경우)"
}`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: `사용자의 과학 질문: "${trimmed}". 이 질문에 대한 인터랙티브 3D 과학 실험실 스펙을 생성해줘.`,
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: 'application/json',
          },
        });

        const rawText = response.text || '';
        const cleaned = rawText.trim().replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
        const parsed = JSON.parse(cleaned);

        if (parsed.title && parsed.sceneType && Array.isArray(parsed.variables)) {
          parsed.id = parsed.id || `exp-ai-${Date.now()}`;
          res.json({ experiment: parsed });
          return;
        }
      } catch (geminiErr) {
        console.warn('Gemini experiment generation fallback used:', geminiErr);
      }
    }

    // Fallback if Gemini not available or failed
    const fallback = generateFallbackExperiment(trimmed);
    res.json({ experiment: fallback });
  } catch (err: any) {
    console.error('Plan experiment error:', err);
    res.status(500).json({ error: 'Failed to generate experiment specification', details: err?.message });
  }
});

// 2. AI Scientist Companion API (Answers in context & performs natural language variable controls!)
app.post('/api/chat-scientist', async (req: Request, res: Response) => {
  try {
    const { userMessage, experimentSpec, currentVariables, liveMetrics } = req.body;

    if (!userMessage) {
      res.status(400).json({ error: 'userMessage is required' });
      return;
    }

    if (apiKey) {
      try {
        const prompt = `You are Dr. Nova (노바 박사), the Chief Scientist and AI Research Companion at Science Universe.
Your tone: Warm, brilliant, encouraging, scientifically rigorous, and inspiring (like a visionary NASA/DeepMind researcher).
Primary language: Korean.

Current Active Experiment:
- Title: ${experimentSpec?.title || '과학 실험실'}
- Scene Type: ${experimentSpec?.sceneType || '일반'}
- Variables Available: ${JSON.stringify(experimentSpec?.variables || [])}
- Current Variable Values: ${JSON.stringify(currentVariables || {})}
- Live Physical Telemetry / Metrics: ${JSON.stringify(liveMetrics || {})}

User Inquiry: "${userMessage}"

Tasks:
1. Explain the scientific phenomena directly answering the user's question, referencing current variable values and real-world science.
2. If the user asked to change or experiment with something (e.g. "압력을 최대로 올려줘", "중력을 절반으로 줄여봐", "가스 함량을 90으로 맞춰줘", "달의 거리를 줄여봐"), you MUST generate the corresponding numerical state updates in 'variableUpdates' within the variable's min and max bounds!
3. If no state change was requested, leave 'variableUpdates' as null or empty object.
4. Suggest a curious next step or question for deeper inquiry.

Return ONLY a JSON object:
{
  "responseText": "과학적이고 친절한 답변 (한국어, 마크다운 형식 가능)",
  "variableUpdates": { "variable_id": new_number_value } or null,
  "actionSummary": "적용된 조작 요약 (예: 마그마 압력을 100 kPa로 변경)" or null,
  "followUpSuggestion": "다음에 시도해 볼 만한 흥미로운 실험 제안"
}`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        });

        const raw = response.text || '';
        const cleaned = raw.trim().replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
        const parsed = JSON.parse(cleaned);

        res.json(parsed);
        return;
      } catch (geminiChatErr) {
        console.warn('Gemini companion chat fallback used:', geminiChatErr);
      }
    }

    // Heuristic response if AI is offline
    const lower = userMessage.toLowerCase();
    let variableUpdates: Record<string, number> | null = null;
    let actionSummary: string | null = null;
    let responseText = `훌륭한 질문입니다! 현재 관측 중인 실험 파라미터에서 변화를 추적하고 있습니다.`;

    if (experimentSpec?.sceneType === 'volcano') {
      if (lower.includes('최대') || lower.includes('올려') || lower.includes('높여')) {
        variableUpdates = { pressure: 95, gasContent: 85 };
        actionSummary = '마그마 방 압력과 가스 함량을 폭발 임계치로 극대화';
        responseText = `마그마 방의 누적 압력을 95 kPa로, 휘발성 가스 함량을 85%로 극대화했습니다! 
화도 내부에서 급격한 감압 발포(Decompression Degassing)가 일어나며, 지각 구속 압력을 완전히 초과하여 거대한 플리니안식(Plinian) 분화가 촉발되었습니다. 초고온 분연주가 대류권을 뚫고 성층권까지 치솟는 모습을 관찰해 보세요!`;
      } else if (lower.includes('줄여') || lower.includes('낮춰') || lower.includes('안정')) {
        variableUpdates = { pressure: 25, gasContent: 20 };
        actionSummary = '마그마 방 압력과 가스 함량을 휴면 상태로 감압';
        responseText = `마그마 방 압력을 25 kPa로 낮추었습니다. 지각의 구속 압력 아래로 안정화되어 화산재 분출이 멈추고 온화한 분기공 수증기 배출 상태로 복귀했습니다.`;
      } else {
        responseText = `현재 마그마 챔버의 압력(${currentVariables?.pressure ?? 55} kPa)과 가스 함량(${currentVariables?.gasContent ?? 45}%)의 균형점에 위치해 있습니다. 마그마의 규산염 점성과 가스 팽창 압력이 서로 맞물리면서 분화의 형태(유출형 vs 폭발형)를 결정짓게 됩니다. "압력을 최대로 올려줘"라고 말씀하시면 임계 폭발을 바로 테스트할 수 있습니다!`;
      }
    } else if (experimentSpec?.sceneType === 'solar_system') {
      if (lower.includes('중력') && (lower.includes('절반') || lower.includes('줄여'))) {
        variableUpdates = { gravityMultiplier: 0.5 };
        actionSummary = '만유인력 상수를 절반(0.5G)으로 감소';
        responseText = `태양계의 중력 상수 배율을 0.5G로 낮췄습니다! 뉴턴의 만유인력 공식(F = G*M*m/r²)에 따라 구심력이 급감하면서 지구의 현재 공전 속도가 탈출 속도에 근접하게 됩니다. 궤도가 타원에서 바깥쪽으로 크게 찌그러지며 확장되는 궤적을 확인해 보세요!`;
      } else if (lower.includes('달') && (lower.includes('가깝') || lower.includes('줄여'))) {
        variableUpdates = { moonDistanceMultiplier: 0.5 };
        actionSummary = '지구-달 거리를 절반(0.5R)으로 단축';
        responseText = `지구와 달 사이의 거리를 절반으로 단축했습니다! 기조력(Tidal Force)은 거리의 3제곱에 반비례(1/r³)하므로, 해수면을 끌어당기는 조석 에너지가 기존의 8배로 폭증하여 엄청난 슈퍼 밀물 현상이 발생합니다.`;
      } else {
        responseText = `태양(${currentVariables?.gravityMultiplier ?? 1.0}G)과 지구-달 사이의 중력 상호작용은 케플러 법칙과 만유인력에 의해 정밀하게 궤도를 유지합니다. "중력을 절반으로 줄여줘" 또는 "달을 가깝게 해줘"라고 명령하시면 즉시 천체 궤적의 변화를 확인하실 수 있습니다.`;
      }
    } else if (experimentSpec?.sceneType === 'buoyancy') {
      if (lower.includes('뜨') || lower.includes('수은') || lower.includes('올려')) {
        variableUpdates = { fluidDensity: 13600, objectDensity: 7800 };
        actionSummary = '유체를 고밀도 수은으로, 물체를 강철로 설정';
        responseText = `유체를 액체 수은(13,600 kg/m³)으로 변경하고 강철 큐브(7,800 kg/m³)를 투입했습니다! 강철의 밀도가 매우 높음에도 불구하고 수은의 밀도가 훨씬 더 크기 때문에(ρ_obj < ρ_fluid), 강철이 바닥으로 가라앉지 않고 마치 코르크마개처럼 수면 위로 절반 이상 높이 둥둥 뜨게 됩니다!`;
      } else {
        responseText = `아르키메데스의 원리에 따르면 유체 속에 잠긴 부피만큼 밀려난 유체의 무게가 바로 부력(F_b = ρ * V * g)입니다. 물체 밀도가 유체 밀도보다 작으면 뜨고, 크면 가라앉습니다. "쇠구슬을 수은에 띄워줘"라고 해보세요!`;
      }
    }

    res.json({
      responseText,
      variableUpdates,
      actionSummary,
      followUpSuggestion: '다른 변수를 조작하거나 가상 상황을 자연어로 질문해 보세요!',
    });
  } catch (err: any) {
    console.error('Chat scientist error:', err);
    res.status(500).json({ error: 'Failed to process scientist dialogue', details: err?.message });
  }
});

// Vite Middleware & Static Serving setup
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Science Universe] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
