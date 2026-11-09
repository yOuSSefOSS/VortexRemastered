// ============================================================================
// Flight Mechanics, Wing Compressibility, Stability & Turbofan Propulsion Core
// ============================================================================

import { computeISAAtmosphere } from './isaAtmosphere';

/**
 * 1. Wing Planform, Sweep & Transonic Wave Drag Solver
 *    Fixes WingsLab where sweep and Mach had zero effect on CL, CDi, and L/D.
 */
export function computeWingPlanformAero({
  spanMeters = 35.8,
  rootChordMeters = 5.4,
  taperRatio = 0.35,
  aspectRatio: explicitAR,
  sweepDeg = 25,
  mach = 0.78,
  altitudeMeters = 10668, // 35,000 ft
  aoaDeg = 4.0,
  thicknessRatio = 0.12,
  flapType = 'fowler', // 'none' | 'plain' | 'split' | 'slotted' | 'fowler'
  flapAngleDeg,
  flapDeg = 0,
  slatExtensionPct,
  slatDeg = 0,
  cl2D,
  cd2D,
  cm2D = -0.04,
}) {
  const atmo = computeISAAtmosphere(altitudeMeters);
  const sweepRad = (Number(sweepDeg) * Math.PI) / 180;
  const cosSweep = Math.max(0.25, Math.cos(sweepRad));

  // True trapezoidal wing area: S = b * c_r * (1 + lambda) / 2
  const tipChordMeters = rootChordMeters * taperRatio;
  const meanAeroChord =
    (2 / 3) *
    rootChordMeters *
    ((1 + taperRatio + taperRatio * taperRatio) / (1 + taperRatio));
  const wingArea = spanMeters * rootChordMeters * 0.5 * (1 + taperRatio);
  const aspectRatio = explicitAR
    ? Number(explicitAR)
    : (spanMeters * spanMeters) / Math.max(1, wingArea);

  const effectiveFlapDeg = flapAngleDeg !== undefined ? flapAngleDeg : flapDeg;
  const effectiveSlatPct =
    slatExtensionPct !== undefined ? slatExtensionPct : (slatDeg / 25) * 100;

  // High-lift device increments
  const flapMultipliers = {
    none: { cl: 0, cd: 0, area: 0 },
    plain: { cl: 0.75, cd: 0.035, area: 0.0 },
    split: { cl: 0.9, cd: 0.05, area: 0.0 },
    slotted: { cl: 1.25, cd: 0.028, area: 0.03 },
    fowler: { cl: 1.65, cd: 0.032, area: 0.12 },
  };
  const fm = flapMultipliers[flapType] || flapMultipliers.fowler;
  const flapFrac = Math.max(0, Math.min(1, effectiveFlapDeg / 40));
  const slatFrac = Math.max(0, Math.min(1, effectiveSlatPct / 100));

  const deltaClFlap = flapFrac * fm.cl * cosSweep;
  const deltaCdFlap = flapFrac * flapFrac * fm.cd;
  const effectiveArea = wingArea * (1 + flapFrac * fm.area);
  const deltaStallSlat = slatFrac * 5.5;
  const deltaStallFlap = -flapFrac * 3.0;

  // Helmbold-Diederich sweep-corrected lift curve slope (per radian -> per deg)
  const clAlphaUnswept = (2 * Math.PI * aspectRatio) / (2 + Math.sqrt(4 + aspectRatio * aspectRatio));
  const clAlphaSwept =
    (clAlphaUnswept * cosSweep) /
    Math.sqrt(1 - Math.min(0.85, Math.pow(mach * cosSweep, 2)));
  const clAlphaDeg = clAlphaSwept * (Math.PI / 180);

  const stallAngleDeg = 15.0 * cosSweep + deltaStallSlat + deltaStallFlap;
  const baseCl2D = typeof cl2D === 'number' ? cl2D * cosSweep : 0.18 + clAlphaDeg * aoaDeg;
  const rawCl = baseCl2D + deltaClFlap;
  const isStalled = aoaDeg > stallAngleDeg || aoaDeg < -(13.0 * cosSweep);
  const cl =
    aoaDeg <= stallAngleDeg
      ? rawCl
      : rawCl * (0.45 + 0.55 * Math.exp(-(aoaDeg - stallAngleDeg) / 5.5));

  // Oswald efficiency degrades slightly at high sweep angles
  const oswaldE = Math.max(0.62, 0.86 - 0.18 * Math.pow(sweepRad / (Math.PI / 3), 2));
  const cdi = (cl * cl) / (Math.PI * oswaldE * aspectRatio);

  // Korn Equation for subsonic Critical Mach number (always < 1.0)
  const kappaA = 0.89;
  const mDragDivergence = Math.min(
    0.95,
    Math.max(
      0.58,
      (kappaA - thicknessRatio / cosSweep - Math.max(0, cl) / (10 * cosSweep * cosSweep)) /
        Math.pow(cosSweep, 0.55)
    )
  );
  const criticalMach = Number(Math.max(0.52, mDragDivergence - 0.08).toFixed(2));

  // Lock's 4th-power transonic wave drag above critical Mach
  let cdWave = 0;
  if (mach > criticalMach) {
    const excessM = mach - criticalMach;
    cdWave = 20 * Math.pow(excessM, 4);
    if (mach >= 1.0) {
      cdWave = 0.035 + 0.045 / Math.sqrt(Math.max(0.05, mach * mach - 1) + 0.25);
    }
  }

  const cd0 = (typeof cd2D === 'number' ? cd2D : 0.0175) + deltaCdFlap;
  const cdTotal = cd0 + cdi + cdWave;
  const ldRatio = cl / Math.max(0.005, cdTotal);
  const cm3D = Number((cm2D - flapFrac * 0.08).toFixed(4));

  const machConeAngleDeg =
    mach > 1.0 ? (Math.asin(1 / mach) * 180) / Math.PI : 90.0;
  const wingLeadingEdgeHalfAngleDeg = 90 - sweepDeg;
  const isTipOutsideMachCone =
    mach > 1.0 && wingLeadingEdgeHalfAngleDeg > machConeAngleDeg;

  const trueAirspeedMs = mach * atmo.speedOfSound;
  const dynamicPressurePa = 0.5 * atmo.density * trueAirspeedMs * trueAirspeedMs;
  const liftNewtons = dynamicPressurePa * effectiveArea * cl;
  const dragNewtons = dynamicPressurePa * effectiveArea * cdTotal;

  return {
    wingArea: Number(wingArea.toFixed(1)),
    effectiveArea: Number(effectiveArea.toFixed(1)),
    tipChordMeters: Number(tipChordMeters.toFixed(2)),
    meanAeroChord: Number(meanAeroChord.toFixed(2)),
    aspectRatio: Number(aspectRatio.toFixed(2)),
    oswaldE: Number(oswaldE.toFixed(2)),
    criticalMach,
    mCrit: criticalMach,
    mDragDivergence: Number(mDragDivergence.toFixed(2)),
    cl: Number(cl.toFixed(3)),
    cl3D: Number(cl.toFixed(3)),
    cd0: Number(cd0.toFixed(4)),
    cdi: Number(cdi.toFixed(4)),
    cdWave: Number(cdWave.toFixed(4)),
    cdTotal: Number(cdTotal.toFixed(4)),
    cm3D,
    ldRatio: Number(ldRatio.toFixed(1)),
    ld3D: Number(ldRatio.toFixed(1)),
    stallAngleDeg: Number(stallAngleDeg.toFixed(1)),
    isStalled,
    machConeAngleDeg: Number(machConeAngleDeg.toFixed(1)),
    isTransonicShock: mach > criticalMach,
    isTipOutsideMachCone,
    trueAirspeedMs: Number(trueAirspeedMs.toFixed(1)),
    liftKilonewtons: Number((liftNewtons / 1000).toFixed(1)),
    dragKilonewtons: Number((dragNewtons / 1000).toFixed(1)),
  };
}

/**
 * 2. Longitudinal Stability, Neutral Point & 3-Axis Flight Control Solver
 *    Fixes TailLab where Tail Area (St) and Tail Arm (Lt) did not move the Neutral Point
 *    and fixes the inverted pitch sign when nose-heavy.
 */
export function computeLongitudinalStability({
  cgMacPct,
  cgPercentMac = 25,
  tailVolumeRatio: explicitVH,
  tailAreaM2 = 32,
  tailArmM = 22,
  wingAreaM2 = 122,
  macM = 4.2,
  airspeedKts = 180,
  altitudeMeters = 3000,
  aoaDeg = 4,
  elevatorDeg = 0,
  aileronDeg = 0,
  rudderDeg = 0,
  clWing = 0.55,
  cm0Airfoil = -0.04,
}) {
  const cg = cgMacPct !== undefined ? Number(cgMacPct) : Number(cgPercentMac);
  const xAcWingPct = 25.0;
  const tailEfficiency = 0.9;
  const liftSlopeRatio = 0.82;
  const downwashGradient = 0.35;

  const tailVolumeRatio =
    explicitVH !== undefined
      ? Number(explicitVH)
      : (tailAreaM2 * tailArmM) / (wingAreaM2 * macM);

  const neutralPointPct =
    xAcWingPct +
    tailEfficiency * liftSlopeRatio * (1 - downwashGradient) * tailVolumeRatio * 100;

  const staticMarginPct = neutralPointPct - cg;
  const cmAlphaPerRad = -(staticMarginPct / 100) * 4.8;

  const stabilityState =
    staticMarginPct >= 5
      ? 'Statically stable'
      : staticMarginPct >= 0
      ? 'Neutrally stable'
      : 'Statically unstable';

  const atmo = computeISAAtmosphere(altitudeMeters);
  const tasMs = airspeedKts * 0.514444;
  const qDynPa = 0.5 * atmo.density * tasMs * tasMs;

  const cgOffsetFromAc = (cg - xAcWingPct) / 100;
  const elevatorEffectiveness = 0.95 * tailVolumeRatio;
  const trimmedPitchDeg = Math.max(
    -25,
    Math.min(
      25,
      aoaDeg + cgOffsetFromAc * 28 - elevatorDeg * elevatorEffectiveness * 0.65
    )
  );

  const cmTotal =
    cm0Airfoil -
    (staticMarginPct / 100) * clWing -
    0.022 * tailVolumeRatio * elevatorDeg;

  const tailTrimForceKn = Number(
    ((-staticMarginPct / 100) * (qDynPa * wingAreaM2 * 0.55) / (tailArmM / macM) / 1000).toFixed(1)
  );

  const adverseYawDeg = -aileronDeg * 0.28;
  const effectiveYawDeg = rudderDeg + adverseYawDeg;
  const isTurnCoordinated = Math.abs(aileronDeg) > 5 && Math.abs(effectiveYawDeg) <= 2.5;

  const cmCurve = [];
  const cm0 = 0.04 + elevatorDeg * 0.012 * tailVolumeRatio;
  for (let cl = 0; cl <= 1.6; cl += 0.1) {
    const cm = cm0 - (staticMarginPct / 100) * cl;
    cmCurve.push({
      cl: Number(cl.toFixed(2)),
      cm: Number(cm.toFixed(4)),
      baselineCm: Number((0.04 - 0.15 * cl).toFixed(4)),
    });
  }

  return {
    tailVolumeRatio: Number(tailVolumeRatio.toFixed(3)),
    neutralPointPct: Number(neutralPointPct.toFixed(1)),
    neutralPointPctMac: Number(neutralPointPct.toFixed(1)),
    staticMarginPct: Number(staticMarginPct.toFixed(1)),
    cmAlphaPerRad: Number(cmAlphaPerRad.toFixed(3)),
    cmTotal: Number(cmTotal.toFixed(4)),
    stabilityState,
    stabilityStatus: stabilityState,
    isStable: staticMarginPct > 0,
    trimmedPitchDeg: Number(trimmedPitchDeg.toFixed(1)),
    pitchResponseDeg: Number(trimmedPitchDeg.toFixed(1)),
    tailTrimForceKn,
    adverseYawDeg: Number(adverseYawDeg.toFixed(1)),
    effectiveYawDeg: Number(effectiveYawDeg.toFixed(1)),
    isTurnCoordinated,
    qDynKPa: Number((qDynPa / 1000).toFixed(2)),
    cmCurve,
  };
}

export function computeAdverseYaw({ aileronDeg = 0, rudderDeg = 0, clWing = 0.6 }) {
  const recommendedRudderDeg = Number((aileronDeg * 0.35 * Math.max(0.3, clWing)).toFixed(1));
  const slipAngleDeg = Number((recommendedRudderDeg - rudderDeg * 0.85).toFixed(1));
  return {
    recommendedRudderDeg,
    slipAngleDeg,
    isCoordinated: Math.abs(slipAngleDeg) <= 2.0,
  };
}

export function computeTurbofanPerformance({
  throttlePct = 82,
  altitudeKm,
  altitudeMeters = 10500,
  mach = 0.8,
  bypassRatio = 8.5,
}) {
  const altM = altitudeKm !== undefined ? Number(altitudeKm) * 1000 : Number(altitudeMeters);
  const atmo = computeISAAtmosphere(altM);
  const throttleFrac = Math.max(0.05, Math.min(1.0, Number(throttlePct) / 100));
  const bpr = Math.max(0.5, Math.min(14.0, Number(bypassRatio)));
  const m0 = Math.max(0, Math.min(1.5, Number(mach)));

  const v0 = m0 * atmo.speedOfSound;
  const ramRatio = Math.pow(1 + 0.2 * m0 * m0, 3.5);
  const inletDensityRatio = atmo.densityRatio * Math.pow(ramRatio, 0.72);

  const coreMassFlowKgS = 52.0 * inletDensityRatio * (0.28 + 0.72 * throttleFrac);
  const bypassMassFlowKgS = coreMassFlowKgS * bpr;
  const totalMassFlowKgS = coreMassFlowKgS + bypassMassFlowKgS;

  const workExtractionFactor = 1 / (1 + 0.045 * bpr);
  const vExitCore = (360 + 540 * throttleFrac) * workExtractionFactor;
  const vExitBypass = Math.max(v0 * 1.04, 210 + 195 * throttleFrac);

  const coreNetThrustN = coreMassFlowKgS * Math.max(0, vExitCore - v0);
  const bypassNetThrustN = bypassMassFlowKgS * Math.max(0, vExitBypass - v0);
  const grossThrustKn =
    (coreMassFlowKgS * vExitCore + bypassMassFlowKgS * vExitBypass) / 1000;
  const ramDragKn = (totalMassFlowKgS * v0) / 1000;
  const netThrustKn = Math.max(0, (coreNetThrustN + bypassNetThrustN) / 1000);

  const throttleOffDesignPenalty = 1 + 0.28 * Math.pow(throttleFrac - 0.8, 2);
  const tempFactor = Math.sqrt(atmo.temperatureK / 288.15);
  const tsfc =
    (0.0215 * Math.pow(bpr / 6.0, -0.24) + 0.0045 * m0) *
    tempFactor *
    throttleOffDesignPenalty;

  const fuelFlowKgHr = netThrustKn * tsfc * 3600;
  const fuelFlowKgS = Number((fuelFlowKgHr / 3600).toFixed(2));
  const tsfcMgNs = Number((tsfc * 1000).toFixed(2));

  const n1Pct = Number((22 + throttleFrac * 78).toFixed(1));
  const n2Pct = Number((45 + throttleFrac * 53).toFixed(1));
  const opr = Number((12 + 28 * Math.pow(throttleFrac, 1.15)).toFixed(1));
  const egtCelsius = Math.round(
    390 + throttleFrac * 490 - (288.15 - atmo.temperatureK) * 1.15 - bpr * 4.5
  );
  const egtStatus = egtCelsius > 950 ? 'critical' : egtCelsius > 850 ? 'caution' : 'normal';

  const vEff =
    (coreMassFlowKgS * vExitCore + bypassMassFlowKgS * vExitBypass) /
    Math.max(1, totalMassFlowKgS);
  const propulsiveEfficiencyPct =
    v0 > 5 ? Math.min(92, ((2 * v0) / (v0 + vEff)) * 100) : 0;

  return {
    netThrustKn: Number(netThrustKn.toFixed(1)),
    netThrustKN: Number(netThrustKn.toFixed(1)),
    grossThrustKn: Number(grossThrustKn.toFixed(1)),
    grossThrustKN: Number(grossThrustKn.toFixed(1)),
    ramDragKn: Number(ramDragKn.toFixed(1)),
    ramDragKN: Number(ramDragKn.toFixed(1)),
    coreThrustSharePct:
      netThrustKn > 0.1
        ? Math.round((coreNetThrustN / 1000 / netThrustKn) * 100)
        : 30,
    bypassThrustSharePct:
      netThrustKn > 0.1
        ? Math.round((bypassNetThrustN / 1000 / netThrustKn) * 100)
        : 70,
    coreMassFlowKgS: Number(coreMassFlowKgS.toFixed(1)),
    bypassMassFlowKgS: Number(bypassMassFlowKgS.toFixed(1)),
    totalMassFlowKgS: Number(totalMassFlowKgS.toFixed(1)),
    tsfc: Number(tsfc.toFixed(4)),
    tsfcMgNs,
    fuelFlowKgHr: Math.round(fuelFlowKgHr),
    fuelFlowKgS,
    n1Pct,
    n2Pct,
    opr,
    egtCelsius,
    egtStatus,
    propulsiveEfficiencyPct: Number(propulsiveEfficiencyPct.toFixed(1)),
    atmo,
  };
}
