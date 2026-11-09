import { supabase, isSupabaseConfigured } from './supabaseClient';
import { getOrCreateDeviceFingerprint } from '../domain/accessControl';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/+$/, '');

async function buildHeaders(extraHeaders = {}) {
  const fp = getOrCreateDeviceFingerprint();
  const headers = {
    'Content-Type': 'application/json',
    'X-Device-Fingerprint': fp,
    ...extraHeaders,
  };

  if (isSupabaseConfigured) {
    try {
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    } catch (_) {}
  }

  return headers;
}

export async function apiFetch(endpoint, options = {}) {
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = path.startsWith('/api') ? `${API_BASE}${path}` : `${API_BASE}/api${path}`;
  const headers = await buildHeaders(options.headers);

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || `Request failed with status ${response.status}`);
    error.status = response.status;
    error.payload = data;
    throw error;
  }
  return data;
}

/**
 * Evaluate airfoil via Python NeuralFoil daemon with automatic 503 cold-start retry backoff.
 */
export async function analyzeAirfoil(payload, { signal, onWarmingUp } = {}) {
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await apiFetch('/api/analyze', {
        method: 'POST',
        body: JSON.stringify(payload),
        signal,
      });
    } catch (err) {
      if (err.name === 'AbortError') throw err;
      if (err.status === 503 && attempt < maxAttempts) {
        if (onWarmingUp) onWarmingUp(true);
        await new Promise((r) => setTimeout(r, attempt * 1200));
        continue;
      }
      throw err;
    }
  }
}

/**
 * Evaluate a batch of NACA candidates in a single IPC roundtrip for Golden Lift Autotune.
 */
export async function analyzeAirfoilBatch(batchCandidates, { signal } = {}) {
  return apiFetch('/api/analyze-batch', {
    method: 'POST',
    body: JSON.stringify({ batch: batchCandidates }),
    signal,
  });
}

export async function registerGuestOrEventSession({
  displayName,
  eventCode = null,
  audienceTrack = 'foundation',
  currentRoute = '/explore',
}) {
  const deviceFingerprint = getOrCreateDeviceFingerprint();
  return apiFetch('/api/session/register', {
    method: 'POST',
    body: JSON.stringify({
      display_name: displayName,
      device_fingerprint: deviceFingerprint,
      event_code: eventCode,
      audience_track: audienceTrack,
      current_route: currentRoute,
    }),
  });
}

export async function pollDeviceSessionStatus(currentRoute = null) {
  const fp = getOrCreateDeviceFingerprint();
  const qs = new URLSearchParams({ device_fingerprint: fp });
  if (currentRoute) qs.set('route', currentRoute);
  return apiFetch(`/api/session/status?${qs.toString()}`, { method: 'GET' });
}

export async function recordModuleProgress({ moduleId, completed, score, currentRoute }) {
  return apiFetch('/api/session/progress', {
    method: 'POST',
    body: JSON.stringify({
      module_id: moduleId,
      completed,
      score,
      current_route: currentRoute,
    }),
  });
}

export async function fetchAdminSessionOverview() {
  return apiFetch('/api/admin/sessions', { method: 'GET' });
}

export const fetchAdminSessions = fetchAdminSessionOverview;

export async function overrideUserAccessTier({
  deviceFingerprint,
  userId,
  accessTier,
  role,
  audienceTrack,
  displayName,
}) {
  return apiFetch('/api/admin/override-access', {
    method: 'POST',
    body: JSON.stringify({
      device_fingerprint: deviceFingerprint,
      user_id: userId,
      access_tier: accessTier,
      role,
      audience_track: audienceTrack,
      display_name: displayName,
    }),
  });
}

export const overrideUserAccess = overrideUserAccessTier;

export async function fetchEventCohorts() {
  return apiFetch('/api/events', { method: 'GET' });
}

export async function createEventCohort({ code, title, audienceTrack, unlockedTier, track, tier }) {
  return apiFetch('/api/events', {
    method: 'POST',
    body: JSON.stringify({
      code,
      title,
      audience_track: audienceTrack || track || 'engineering',
      unlocked_tier: unlockedTier || tier || 'event_cohort',
    }),
  });
}
