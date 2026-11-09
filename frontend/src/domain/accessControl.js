// ============================================================================
// Persistent Hardware/Browser Device Fingerprint & Platform-Wide Access Control
// ============================================================================

const STORAGE_FP_KEY = 'vg_device_fingerprint_v2';
const STORAGE_SESSION_KEY = 'vg_active_session_v2';

/**
 * Compute and persist a deterministic device identifier combining hardware traits
 * (screen geometry, WebGL renderer string, CPU cores, timezone) with a persistent token.
 */
export function getOrCreateDeviceFingerprint() {
  try {
    const existing = localStorage.getItem(STORAGE_FP_KEY);
    if (existing && existing.length >= 12) {
      return existing;
    }

    const traits = [
      navigator.userAgent || '',
      navigator.language || '',
      String(navigator.hardwareConcurrency || 4),
      `${window.screen?.width || 1920}x${window.screen?.height || 1080}x${window.screen?.colorDepth || 24}`,
      Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    ];

    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          traits.push(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '');
        }
      }
    } catch (_) {}

    const raw = traits.join('|');
    let hash1 = 0x811c9dc5;
    let hash2 = 0xcbf29ce4;
    for (let i = 0; i < raw.length; i++) {
      const ch = raw.charCodeAt(i);
      hash1 ^= ch;
      hash1 = Math.imul(hash1, 0x01000193);
      hash2 ^= ch;
      hash2 = Math.imul(hash2, 0x100000001b3);
    }

    const randomSuffix = Math.random().toString(36).slice(2, 7).toUpperCase();
    const fp = `DEV-${(hash1 >>> 0).toString(16).toUpperCase().padStart(8, '0')}-${(hash2 >>> 0)
      .toString(16)
      .toUpperCase()
      .slice(0, 4)}-${randomSuffix}`;

    localStorage.setItem(STORAGE_FP_KEY, fp);
    return fp;
  } catch (_) {
    return 'DEV-FALLBACK-0001';
  }
}

export function loadStoredSession() {
  try {
    const raw = localStorage.getItem(STORAGE_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

export function saveStoredSession(session) {
  try {
    if (!session) {
      localStorage.removeItem(STORAGE_SESSION_KEY);
    } else {
      localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(session));
    }
  } catch (_) {}
}

// ============================================================================
// Platform-Wide Tier Matrix (Governs Hangar, Theory Depth & 3D Cockpit Modes)
// ============================================================================

export const TIER_DEFINITIONS = {
  guest_restricted: {
    id: 'guest_restricted',
    label: 'Guest preview',
    description: 'Limited preview access. Enter an event code or request instructor unlock for full modules.',
    allowedHangarZones: ['fuselage', 'wings'],
    allowedCockpitModes: ['wind_tunnel'],
    allowEngineeringDepth: false,
    allowCustomAirfoilImport: false,
    allowBatchAutotune: false,
    allowExport: false,
    allowedAirfoilIds: ['naca0012', 'naca2412'],
  },
  event_cohort: {
    id: 'event_cohort',
    label: 'Event cohort',
    description: 'Active live workshop participant with full aircraft hangar and guided flight simulation access.',
    allowedHangarZones: ['fuselage', 'wings', 'airfoil', 'tail', 'engines'],
    allowedCockpitModes: ['flight_dynamics', 'wind_tunnel', 'turbofan'],
    allowEngineeringDepth: true,
    allowCustomAirfoilImport: true,
    allowBatchAutotune: true,
    allowExport: false,
    allowedAirfoilIds: 'all',
  },
  pro_student: {
    id: 'pro_student',
    label: 'Course cadet',
    description: 'Full curriculum, all 3D simulation cockpit stations, custom airfoil imports, and STL/PDF exports.',
    allowedHangarZones: ['fuselage', 'wings', 'airfoil', 'tail', 'engines'],
    allowedCockpitModes: ['flight_dynamics', 'wind_tunnel', 'turbofan'],
    allowEngineeringDepth: true,
    allowCustomAirfoilImport: true,
    allowBatchAutotune: true,
    allowExport: true,
    allowedAirfoilIds: 'all',
  },
  vip_full: {
    id: 'vip_full',
    label: 'VIP / Faculty',
    description: 'Unrestricted faculty, researcher, and administrator access across all simulation and host tools.',
    allowedHangarZones: ['fuselage', 'wings', 'airfoil', 'tail', 'engines'],
    allowedCockpitModes: ['flight_dynamics', 'wind_tunnel', 'turbofan'],
    allowEngineeringDepth: true,
    allowCustomAirfoilImport: true,
    allowBatchAutotune: true,
    allowExport: true,
    allowedAirfoilIds: 'all',
  },
};

export const ROLE_DEFINITIONS = {
  guest: { id: 'guest', label: 'Guest' },
  student: { id: 'student', label: 'Cadet' },
  event_participant: { id: 'event_participant', label: 'Cohort participant' },
  instructor: { id: 'instructor', label: 'Event instructor' },
  vip_professor: { id: 'vip_professor', label: 'Faculty / VIP' },
  admin: { id: 'admin', label: 'Founder / Admin' },
  superadmin: { id: 'superadmin', label: 'Founder / Admin' },
};

export function getTierCapabilities(tierId = 'guest_restricted', role = 'guest') {
  if (role === 'admin' || role === 'superadmin' || role === 'instructor' || role === 'vip_professor') {
    return {
      ...TIER_DEFINITIONS.vip_full,
      unlockedSubsystems: TIER_DEFINITIONS.vip_full.allowedHangarZones,
      unlockedCockpitModes: ['aircraft', 'windtunnel', 'propulsion'],
    };
  }
  const base = TIER_DEFINITIONS[tierId] || TIER_DEFINITIONS.guest_restricted;
  const modeMap = {
    guest_restricted: ['aircraft'],
    event_cohort: ['aircraft', 'windtunnel', 'propulsion'],
    pro_student: ['aircraft', 'windtunnel', 'propulsion'],
    vip_full: ['aircraft', 'windtunnel', 'propulsion'],
  };
  return {
    ...base,
    unlockedSubsystems: base.allowedHangarZones,
    unlockedCockpitModes: modeMap[base.id] || ['aircraft'],
  };
}
