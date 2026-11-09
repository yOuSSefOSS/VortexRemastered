// ============================================================================
// International Standard Atmosphere (ISA) & Cabin Pressurization Engine
// Valid from 0 m to 20,000 m (0 ft to 65,617 ft)
// ============================================================================

const G0 = 9.80665; // m/s^2
const R_GAS = 287.05287; // J/(kg·K)
const GAMMA = 1.4;
const T0 = 288.15; // Sea level standard temperature (K) = 15.0 °C
const P0 = 101325.0; // Sea level standard pressure (Pa)
const RHO0 = 1.225; // Sea level standard density (kg/m^3)
const LAPSE_TROPO = 0.0065; // K/m (6.5 K/km up to 11,000 m)
const H_TROPOPAUSE = 11000.0; // m

// Conditions at 11,000 m tropopause boundary
const T11 = T0 - LAPSE_TROPO * H_TROPOPAUSE; // 216.65 K (-56.5 °C)
const P11 = P0 * Math.pow(T11 / T0, G0 / (R_GAS * LAPSE_TROPO)); // ~22,632 Pa

export function feetToMeters(ft) {
  return Number(ft) * 0.3048;
}

export function metersToFeet(m) {
  return Number(m) / 0.3048;
}

export function paToPsi(pa) {
  return Number(pa) * 0.000145037738;
}

/**
 * Compute full ISA atmospheric properties at a given geometric altitude in meters.
 * Fixes the stratosphere discontinuity above 11 km by holding T = 216.65 K
 * and decaying pressure exponentially in the lower stratosphere (11–20 km).
 */
export function computeISAAtmosphere(altitudeMeters = 0) {
  const h = Math.max(0, Math.min(20000, Number(altitudeMeters) || 0));

  let T;
  let P;
  let layerName;

  if (h <= H_TROPOPAUSE) {
    T = T0 - LAPSE_TROPO * h;
    P = P0 * Math.pow(T / T0, G0 / (R_GAS * LAPSE_TROPO));
    layerName = h < 10500 ? 'Troposphere' : 'Tropopause';
  } else {
    T = T11;
    P = P11 * Math.exp((-G0 * (h - H_TROPOPAUSE)) / (R_GAS * T11));
    layerName = 'Lower stratosphere';
  }

  const rho = P / (R_GAS * T);
  const speedOfSound = Math.sqrt(GAMMA * R_GAS * T);

  // Sutherland's formula for dynamic viscosity of air (Pa·s)
  const mu = (1.458e-6 * Math.pow(T, 1.5)) / (T + 110.4);
  const nu = mu / rho;

  return {
    altitudeMeters: h,
    altitudeFeet: metersToFeet(h),
    altitudeFt: metersToFeet(h),
    altitudeKm: h / 1000,
    temperatureK: T,
    temperatureC: T - 273.15,
    pressurePa: P,
    pressureKPa: P / 1000,
    pressurePsi: paToPsi(P),
    density: rho,
    densityKgM3: rho,
    densityRatio: rho / RHO0,
    speedOfSound,
    speedOfSoundMs: speedOfSound,
    dynamicViscosity: mu,
    viscosityPaS: mu,
    kinematicViscosity: nu,
    layerName,
  };
}

/**
 * Compute realistic commercial aircraft cabin pressurization schedule & hoop stress.
 * At sea level (0 ft), cabin altitude is 0 ft (14.70 PSI = ambient, deltaP = 0.00 PSI).
 * As the aircraft climbs toward max cruise (41,000 ft), cabin altitude schedules
 * proportionally up to 8,000 ft (10.92 PSI), preventing any unphysical sea-level vacuum.
 */
export function computeCabinPressurization(arg = 10668) {
  const isNumberArg = typeof arg === 'number';
  const altitudeFeet = isNumberArg ? metersToFeet(arg) : (arg?.altitudeFeet ?? 35000);
  const fuselageRadiusMeters = isNumberArg ? 2.95 : (arg?.fuselageRadiusMeters ?? 2.95);
  const skinThicknessMm = isNumberArg ? 2.2 : (arg?.skinThicknessMm ?? 2.2);
  const maxCertAltitudeFeet = isNumberArg ? 41000 : (arg?.maxCertAltitudeFeet ?? 41000);
  const maxCabinAltitudeFeet = isNumberArg ? 8000 : (arg?.maxCabinAltitudeFeet ?? 8000);

  const altFt = Math.max(0, Math.min(50000, Number(altitudeFeet) || 0));
  const ambientAtmo = computeISAAtmosphere(feetToMeters(altFt));

  // Proportional cabin altitude schedule clamped so cabin pressure >= ambient pressure
  const scheduledCabinAltFt = Math.min(
    altFt,
    (altFt / maxCertAltitudeFeet) * maxCabinAltitudeFeet
  );
  const cabinAtmo = computeISAAtmosphere(feetToMeters(scheduledCabinAltFt));

  const ambientPsi = ambientAtmo.pressurePsi;
  const cabinPsi = Math.max(ambientPsi, cabinAtmo.pressurePsi);
  const deltaPsi = Math.max(0, cabinPsi - ambientPsi);
  const deltaPa = deltaPsi / 0.000145037738;

  const r = Math.max(1.0, Number(fuselageRadiusMeters) || 2.95);
  const tMeters = Math.max(0.5, Number(skinThicknessMm) || 2.2) / 1000;

  // Thin-walled cylindrical pressure vessel stresses (MPa)
  // Hoop stress: sigma_theta = (DeltaP * r) / t
  // Longitudinal stress: sigma_z = (DeltaP * r) / (2 * t)
  const hoopStressMPa = (deltaPa * r) / tMeters / 1e6;
  const longitudinalStressMPa = hoopStressMPa * 0.5;
  const yieldStrengthAl2024MPa = 325.0;
  const safetyFactor =
    hoopStressMPa > 0.1 ? yieldStrengthAl2024MPa / hoopStressMPa : 99.9;

  return {
    altitudeFeet: altFt,
    cabinAltitudeFeet: scheduledCabinAltFt,
    cabinAltitudeFt: scheduledCabinAltFt,
    ambientPsi,
    cabinPsi,
    deltaPsi,
    differentialPsi: deltaPsi,
    hoopStressMPa,
    longitudinalStressMPa,
    safetyFactor,
    ambientAtmo,
  };
}
