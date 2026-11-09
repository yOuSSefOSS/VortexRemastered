// ============================================================================
// Unified NACA 4-Digit Geometry, Area Integration & Analytical Aero Solver
// ============================================================================

/**
 * Generate closed-loop [x, y] coordinates for any 4-digit NACA airfoil.
 * Cosine spacing concentrates points near the leading and trailing edges.
 */
export function computeNACA4Digit(m, p, t, n = 60) {
  const upper = [];
  const lower = [];

  for (let i = 0; i <= n; i++) {
    const beta = (i / n) * Math.PI;
    const x = 0.5 * (1 - Math.cos(beta));

    const yt =
      5 *
      t *
      (0.2969 * Math.sqrt(x) -
        0.126 * x -
        0.3516 * x * x +
        0.2843 * x * x * x -
        0.1015 * x * x * x * x);

    let yc = 0;
    let dyc = 0;

    if (m > 0 && p > 0 && p < 1) {
      if (x < p) {
        yc = (m / (p * p)) * (2 * p * x - x * x);
        dyc = ((2 * m) / (p * p)) * (p - x);
      } else {
        yc = (m / ((1 - p) * (1 - p))) * (1 - 2 * p + 2 * p * x - x * x);
        dyc = ((2 * m) / ((1 - p) * (1 - p))) * (p - x);
      }
    }

    const theta = Math.atan(dyc);
    upper.push([
      Number((x - yt * Math.sin(theta)).toFixed(5)),
      Number((yc + yt * Math.cos(theta)).toFixed(5)),
    ]);
    lower.push([
      Number((x + yt * Math.sin(theta)).toFixed(5)),
      Number((yc - yt * Math.cos(theta)).toFixed(5)),
    ]);
  }

  return [...upper.reverse(), ...lower.slice(1)];
}

/**
 * Parse a NACA 4-digit code string (e.g. "2412" or "NACA 0012") into { m, p, t }.
 */
export function parseNACA4String(codeStr = '2412') {
  const digits = String(codeStr).replace(/[^0-9]/g, '');
  if (digits.length !== 4) {
    return { m: 0.02, p: 0.4, t: 0.12, code: '2412' };
  }
  const m = parseInt(digits[0], 10) / 100;
  const p = m === 0 ? 0.4 : parseInt(digits[1], 10) / 10;
  const t = parseInt(digits.slice(2, 4), 10) / 100;
  return { m, p: p || 0.4, t: Math.max(0.04, t), code: digits };
}

/**
 * Compute exact non-dimensional cross-sectional area (A / c^2) of a closed airfoil polygon
 * using the Shoelace formula. Fixes the 70x STL volume underestimation bug.
 */
export function computeAirfoilAreaRatio(points) {
  if (!Array.isArray(points) || points.length < 3) return 0.082;
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    const x1 = Array.isArray(p1) ? p1[0] : p1.x;
    const y1 = Array.isArray(p1) ? p1[1] : p1.y;
    const x2 = Array.isArray(p2) ? p2[0] : p2.x;
    const y2 = Array.isArray(p2) ? p2[1] : p2.y;
    sum += x1 * y2 - x2 * y1;
  }
  const area = Math.abs(sum) * 0.5;
  return area > 0.005 ? area : 0.082;
}

/**
 * Format NACA 4-digit parameters (camber %, maxCamberLoc 10%, thickness %) into "NACA 2412"
 */
export function formatNacaCode(camberPct = 2, maxCamberLoc = 4, thicknessPct = 12) {
  const m = Math.round(Number(camberPct) || 0);
  const p = m === 0 ? 0 : Math.round(Number(maxCamberLoc) || 4);
  const t = String(Math.round(Number(thicknessPct) || 12)).padStart(2, '0');
  return `NACA ${m}${p}${t}`;
}

/**
 * Generate structured { upper, lower, coordinates } for 3D extrusion & STL export
 */
export function generateNaca4Coordinates(camberPct = 2, maxCamberLoc = 4, thicknessPct = 12, n = 60) {
  const m = Math.max(0, Number(camberPct) || 0) / 100;
  const p = m === 0 ? 0.4 : Math.max(0.1, Math.min(0.9, (Number(maxCamberLoc) || 4) / 10));
  const t = Math.max(0.04, (Number(thicknessPct) || 12) / 100);

  const upper = [];
  const lower = [];

  for (let i = 0; i <= n; i++) {
    const beta = (i / n) * Math.PI;
    const x = 0.5 * (1 - Math.cos(beta));
    const yt =
      5 *
      t *
      (0.2969 * Math.sqrt(x) -
        0.126 * x -
        0.3516 * x * x +
        0.2843 * x * x * x -
        0.1015 * x * x * x * x);

    let yc = 0;
    let dyc = 0;
    if (m > 0 && p > 0 && p < 1) {
      if (x < p) {
        yc = (m / (p * p)) * (2 * p * x - x * x);
        dyc = ((2 * m) / (p * p)) * (p - x);
      } else {
        yc = (m / ((1 - p) * (1 - p))) * (1 - 2 * p + 2 * p * x - x * x);
        dyc = ((2 * m) / ((1 - p) * (1 - p))) * (p - x);
      }
    }
    const theta = Math.atan(dyc);
    upper.push({
      x: Number((x - yt * Math.sin(theta)).toFixed(5)),
      y: Number((yc + yt * Math.cos(theta)).toFixed(5)),
    });
    lower.push({
      x: Number((x + yt * Math.sin(theta)).toFixed(5)),
      y: Number((yc - yt * Math.cos(theta)).toFixed(5)),
    });
  }

  const coordinates = [...upper.slice().reverse(), ...lower.slice(1)];
  return { upper, lower, coordinates };
}

/**
 * Evaluate analytical 2D aerodynamic coefficients at a single operating AoA and Reynolds number
 */
export function computeAnalyticalAero(
  camberPct = 2,
  maxCamberLoc = 4,
  thicknessPct = 12,
  aoaDeg = 4,
  reynolds = 1000000
) {
  const m = Math.max(0, Number(camberPct) || 0) / 100;
  const p = m === 0 ? 0.4 : Math.max(0.1, Math.min(0.9, (Number(maxCamberLoc) || 4) / 10));
  const t = Math.max(0.04, (Number(thicknessPct) || 12) / 100);
  const { baseCl, baseCd, stallPos, stallNeg } = deriveNACAParams(m, p, t);
  const reScale = Math.pow(Math.max(1e5, reynolds) / 3.0e6, -0.08);
  const clSlope = 0.106;
  const aoa = Number(aoaDeg) || 0;

  let cl;
  let cd;
  let cm;
  if (aoa >= stallNeg && aoa <= stallPos) {
    cl = baseCl + clSlope * aoa;
    const inducedFactor = (cl * cl) / (Math.PI * 7.5 * 0.85);
    cd = baseCd * reScale + inducedFactor * 0.35 + 0.00004 * aoa * aoa;
    cm = -0.025 - m * 1.8 - 0.0035 * aoa;
  } else if (aoa > stallPos) {
    const degPast = aoa - stallPos;
    const clPeak = baseCl + clSlope * stallPos;
    const decay = 0.45 + 0.55 * Math.exp(-degPast / 6.0);
    cl = clPeak * decay;
    cd = baseCd * reScale + 0.028 + 0.013 * Math.pow(degPast, 1.35);
    cm = -0.09 - 0.012 * degPast;
  } else {
    const degPast = stallNeg - aoa;
    const clTrough = baseCl + clSlope * stallNeg;
    const decay = 0.45 + 0.55 * Math.exp(-degPast / 6.0);
    cl = clTrough * decay;
    cd = baseCd * reScale + 0.028 + 0.013 * Math.pow(degPast, 1.35);
    cm = 0.05 + 0.01 * degPast;
  }

  const safeCd = Math.max(0.004, cd);
  return {
    cl: Number(cl.toFixed(4)),
    cd: Number(safeCd.toFixed(4)),
    cm: Number(cm.toFixed(4)),
    ld: Number((cl / safeCd).toFixed(2)),
    isStalled: aoa > stallPos || aoa < stallNeg,
    source: 'analytical',
  };
}

/**
 * Derive physical stall and baseline parameters from NACA 4-digit parameters.
 * Note: For symmetric airfoils (m === 0), p defaults to 0.4 so stallPos is never inflated.
 */
export function deriveNACAParams(m, p, t) {
  const effectiveP = m === 0 ? 0.4 : p;
  const baseCl = Number((m * 11.5).toFixed(3));
  const baseCd = Number((0.0055 + t * 0.036 + m * 0.045).toFixed(4));
  const stallPos = Math.round(
    Math.min(19, Math.max(10, 14 + m * 18 - Math.abs(t - 0.12) * 38 - Math.abs(effectiveP - 0.4) * 3))
  );
  const stallNeg = -Math.round(
    Math.min(16, Math.max(8, 13 - m * 22 - Math.abs(t - 0.12) * 30))
  );
  return { baseCl, baseCd, stallPos, stallNeg };
}

/**
 * Generate analytical aerodynamic curve across AoA [-20°, +25°] when offline or warming up.
 */
export function generateAnalyticalAeroCurve({
  baseCl = 0.25,
  baseCd = 0.009,
  stallAngle = 15,
  negStallAngle = -13,
  reynolds = 3.0e6,
  flapDeltaCl = 0,
  flapDeltaCd = 0,
  slatDeltaStall = 0,
}) {
  const reScale = Math.pow(Math.max(1e5, reynolds) / 3.0e6, -0.08);
  const posStall = stallAngle + slatDeltaStall;
  const negStall = negStallAngle - slatDeltaStall * 0.4;
  const clSlope = 0.106; // ~2*pi per radian in deg^-1

  const rows = [];
  for (let aoa = -20; aoa <= 25; aoa += 1) {
    let cl;
    let cd;
    let cm;

    if (aoa >= negStall && aoa <= posStall) {
      // Attached flow regime
      cl = baseCl + flapDeltaCl + clSlope * aoa;
      const inducedFactor = (cl * cl) / (Math.PI * 7.5 * 0.85);
      cd = (baseCd + flapDeltaCd) * reScale + inducedFactor * 0.35 + 0.00004 * aoa * aoa;
      cm = -0.025 - mEquivalent(baseCl) * 0.18 - 0.0035 * aoa - flapDeltaCl * 0.09;
    } else if (aoa > posStall) {
      // Positive stall separation decay
      const degPast = aoa - posStall;
      const clPeak = baseCl + flapDeltaCl + clSlope * posStall;
      const decay = 0.45 + 0.55 * Math.exp(-degPast / 6.0);
      cl = clPeak * decay;
      cd =
        (baseCd + flapDeltaCd) * reScale +
        0.028 +
        0.013 * Math.pow(degPast, 1.35);
      cm = -0.09 - 0.012 * degPast;
    } else {
      // Negative stall separation decay
      const degPast = negStall - aoa;
      const clTrough = baseCl + flapDeltaCl + clSlope * negStall;
      const decay = 0.45 + 0.55 * Math.exp(-degPast / 6.0);
      cl = clTrough * decay;
      cd =
        (baseCd + flapDeltaCd) * reScale +
        0.028 +
        0.013 * Math.pow(degPast, 1.35);
      cm = 0.05 + 0.01 * degPast;
    }

    rows.push({
      aoa,
      cl: Number(cl.toFixed(4)),
      cd: Number(Math.max(0.004, cd).toFixed(4)),
      cm: Number(cm.toFixed(4)),
      ld: Number((cl / Math.max(0.004, cd)).toFixed(2)),
    });
  }

  return rows;
}

function mEquivalent(baseCl) {
  return Math.max(0, baseCl / 11.5);
}

/**
 * Standard Built-in Airfoil Library
 */
export const STANDARD_AIRFOILS = [
  {
    id: 'naca0012',
    name: 'NACA 0012',
    code: '0012',
    role: 'Symmetric baseline',
    category: 'Symmetric baseline',
    description: 'Symmetric 12% thickness profile used on rotorcraft blades, empennage surfaces, and aerodynamic benchmarks.',
    m: 0.0,
    p: 0.4,
    t: 0.12,
    camber: 0,
    maxCamberLoc: 4,
    thickness: 12,
    ...deriveNACAParams(0.0, 0.4, 0.12),
    stallAngle: 15,
    negStallAngle: -15,
    airfoilData: computeNACA4Digit(0.0, 0.4, 0.12, 60),
  },
  {
    id: 'naca2412',
    name: 'NACA 2412',
    code: '2412',
    role: 'General aviation trainer',
    category: 'General aviation trainer',
    description: '2% camber at 40% chord with 12% thickness. Standard wing root profile on general aviation trainers (Cessna 172).',
    m: 0.02,
    p: 0.4,
    t: 0.12,
    camber: 2,
    maxCamberLoc: 4,
    thickness: 12,
    ...deriveNACAParams(0.02, 0.4, 0.12),
    stallAngle: 16,
    negStallAngle: -13,
    airfoilData: computeNACA4Digit(0.02, 0.4, 0.12, 60),
  },
  {
    id: 'naca4412',
    name: 'NACA 4412',
    code: '4412',
    role: 'High-lift subsonic',
    category: 'High-lift subsonic',
    description: '4% camber at 40% chord. Produces substantial positive lift at zero angle of attack for STOL and low-speed wings.',
    m: 0.04,
    p: 0.4,
    t: 0.12,
    camber: 4,
    maxCamberLoc: 4,
    thickness: 12,
    ...deriveNACAParams(0.04, 0.4, 0.12),
    stallAngle: 15,
    negStallAngle: -11,
    airfoilData: computeNACA4Digit(0.04, 0.4, 0.12, 60),
  },
  {
    id: 'naca2315',
    name: 'NACA 2315',
    code: '2315',
    role: 'Thick structural root',
    category: 'Thick structural root',
    description: 'Forward-cambered 15% thick section providing high internal spar depth and gentle stall progression.',
    m: 0.02,
    p: 0.3,
    t: 0.15,
    camber: 2,
    maxCamberLoc: 3,
    thickness: 15,
    ...deriveNACAParams(0.02, 0.3, 0.15),
    stallAngle: 16,
    negStallAngle: -13,
    airfoilData: computeNACA4Digit(0.02, 0.3, 0.15, 60),
  },
  {
    id: 'naca1408',
    name: 'NACA 1408',
    code: '1408',
    role: 'High-speed thin wing',
    category: 'High-speed thin wing',
    description: 'Thin 8% profile with 1% camber designed for reduced profile drag and higher critical Mach number.',
    m: 0.01,
    p: 0.4,
    t: 0.08,
    camber: 1,
    maxCamberLoc: 4,
    thickness: 8,
    ...deriveNACAParams(0.01, 0.4, 0.08),
    stallAngle: 12,
    negStallAngle: -11,
    airfoilData: computeNACA4Digit(0.01, 0.4, 0.08, 60),
  },
];

/**
 * Generate candidate NACA 4-digit airfoils for Golden Lift optimization.
 * Fixes the symmetric p=4 bug so symmetric candidates use p=0.4 cleanly.
 */
export function generateOptimizationCandidates(activeAirfoilOrMode = 'fast', reynolds = 1000000) {
  const isDeep = activeAirfoilOrMode === 'deep';
  const currentAoa =
    typeof activeAirfoilOrMode === 'object' && activeAirfoilOrMode !== null
      ? Number(activeAirfoilOrMode.aoa ?? 4)
      : 4;
  const mVals = isDeep ? [0.0, 0.01, 0.02, 0.03, 0.04, 0.05, 0.06] : [0.0, 0.02, 0.04];
  const pVals = isDeep ? [0.3, 0.4, 0.5] : [0.3, 0.4];
  const tVals = isDeep ? [0.08, 0.10, 0.12, 0.15, 0.18] : [0.09, 0.12, 0.15];

  const list = [];
  for (const m of mVals) {
    const activePs = m === 0 ? [0.4] : pVals;
    for (const p of activePs) {
      for (const t of tVals) {
        const mDigit = Math.round(m * 100);
        const pDigit = m === 0 ? 0 : Math.round(p * 10);
        const tDigits = String(Math.round(t * 100)).padStart(2, '0');
        const code = `${mDigit}${pDigit}${tDigits}`;
        const derived = deriveNACAParams(m, p, t);
        list.push({
          id: `naca_${code}`,
          name: `NACA ${code}`,
          code,
          m,
          p,
          t,
          camber: mDigit,
          maxCamberLoc: m === 0 ? 4 : pDigit,
          thickness: Math.round(t * 100),
          aoa: currentAoa,
          reynolds,
          ...derived,
          stallAngle: derived.stallPos,
          negStallAngle: derived.stallNeg,
          airfoilData: computeNACA4Digit(m, p, t, 50),
        });
      }
    }
  }
  return list;
}
