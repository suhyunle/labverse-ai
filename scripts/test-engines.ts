import { calculateFreeFall, GRAVITY_OBJECT_PRESETS } from '../src/engines/gravity.ts';
import { calculateOptics } from '../src/engines/optics.ts';
import { calculateFluidColumn } from '../src/engines/fluid.ts';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ TEST FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ ${message}`);
  }
}

console.log('🧪 RUNNING DETERMINISTIC SCIENTIFIC ENGINES TEST SUITE...\n');

// 1. Gravity Engine Tests
console.log('[1] Testing Gravity Engine...');
{
  // Test vacuum free fall: h = 20m, g = 9.80665 m/s^2
  // t = sqrt(2 * 20 / 9.80665) = sqrt(4.0788) = 2.020 s
  const bowlingBall = GRAVITY_OBJECT_PRESETS.bowling_ball;
  const resVacuum = calculateFreeFall(20, 9.80665, bowlingBall, 0.0);

  assert(Math.abs(resVacuum.fallTimeVacuum - 2.02) < 0.02, `Vacuum fall time for 20m is ~2.02s (got ${resVacuum.fallTimeVacuum})`);
  assert(Math.abs(resVacuum.impactVelocityVacuum - 19.81) < 0.1, `Vacuum impact velocity for 20m is ~19.81 m/s (got ${resVacuum.impactVelocityVacuum})`);

  // Test air resistance: feather falls much slower than bowling ball in air
  const feather = GRAVITY_OBJECT_PRESETS.feather;
  const resFeatherAir = calculateFreeFall(20, 9.80665, feather, 1.225);
  const resBallAir = calculateFreeFall(20, 9.80665, bowlingBall, 1.225);

  assert(resFeatherAir.fallTimeAir > resBallAir.fallTimeAir, `Feather falls slower in air than bowling ball (${resFeatherAir.fallTimeAir}s > ${resBallAir.fallTimeAir}s)`);
  assert(resFeatherAir.fallTimeVacuum === resBallAir.fallTimeVacuum, `Feather and bowling ball have identical fall time in vacuum (${resFeatherAir.fallTimeVacuum}s == ${resBallAir.fallTimeVacuum}s)`);
}

// 2. Optics Engine Tests
console.log('\n[2] Testing Optics Engine (Snell\'s Law & TIR)...');
{
  // Normal incidence (theta1 = 0) -> theta2 = 0
  const resNormal = calculateOptics(0, 1.0, 1.5);
  assert(resNormal.thetaRefractedDeg === 0, `Normal incidence yields 0 deg refraction (got ${resNormal.thetaRefractedDeg})`);

  // Air to Crown Glass: n1=1.0, n2=1.52, theta1=30 deg
  // sin(theta2) = (1.0 / 1.52) * sin(30) = 0.5 / 1.52 = 0.3289 -> theta2 = 19.2 deg
  const resAirGlass = calculateOptics(30, 1.0, 1.52);
  assert(Math.abs(resAirGlass.thetaRefractedDeg! - 19.2) < 0.2, `Refraction 30 deg into glass is ~19.2 deg (got ${resAirGlass.thetaRefractedDeg})`);
  assert(resAirGlass.criticalAngleDeg === null, `No critical angle when going from low to high index`);

  // Glass to Air: n1=1.52, n2=1.0
  // Critical angle: sin(theta_c) = 1.0 / 1.52 = 0.6578 -> theta_c = 41.14 deg
  const resGlassAir = calculateOptics(40, 1.52, 1.0);
  assert(Math.abs(resGlassAir.criticalAngleDeg! - 41.14) < 0.2, `Critical angle glass->air is ~41.14 deg (got ${resGlassAir.criticalAngleDeg})`);
  assert(!resGlassAir.isTotalInternalReflection, `40 deg is below critical angle, so no TIR`);

  // TIR test: angle 45 deg > 41.14 deg -> Total Internal Reflection
  const resTIR = calculateOptics(45, 1.52, 1.0);
  assert(resTIR.isTotalInternalReflection === true, `45 deg produces Total Internal Reflection`);
  assert(resTIR.thetaRefractedDeg === null, `Refracted ray is absent during TIR`);
  assert(resTIR.reflectance === 1.0, `Reflectance is 100% during TIR`);
}

// 3. Fluid Stratification Tests
console.log('\n[3] Testing Fluid Engine (Density Stratification)...');
{
  // Layers: mercury (13534), water (1000), vegetable_oil (920)
  const column = calculateFluidColumn(['water', 'mercury', 'vegetable_oil'], 9.80665, 0, 1.0);
  assert(column.sortedLayers[0].id === 'mercury', `Heaviest fluid (mercury) sits at bottom`);
  assert(column.sortedLayers[1].id === 'water', `Intermediate fluid (water) sits in middle`);
  assert(column.sortedLayers[2].id === 'vegetable_oil', `Lightest fluid (oil) sits on top`);
  assert(column.hydrostaticPressureBaseKPa > 101.325, `Hydrostatic base pressure exceeds 1 atm atmospheric pressure`);
}

console.log('\n🎉 ALL DETERMINISTIC SCIENTIFIC ENGINE UNIT TESTS PASSED SUCCESSFULLY!\n');
