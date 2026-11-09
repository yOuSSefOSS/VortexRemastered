if (process.env.NODE_ENV !== 'production') {
  try {
    require('dotenv').config();
  } catch (_) {}
}

const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const readline = require('readline');
const rateLimit = require('express-rate-limit');
const { createClient } = require('@supabase/supabase-js');
const WebSocket = require('ws');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── SUPABASE SERVICE CLIENT ────────────────────────────────────────────────
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const isSupabaseConfigured =
  Boolean(supabaseUrl && supabaseServiceKey) &&
  !supabaseUrl.includes('placeholder') &&
  !supabaseUrl.includes('your_supabase') &&
  !supabaseServiceKey.includes('placeholder') &&
  !supabaseServiceKey.includes('your_supabase');

const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
      realtime: { websocket: WebSocket, transport: WebSocket },
    })
  : null;

// ─── CORS & PAYLOAD LIMITS ──────────────────────────────────────────────────
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : ['http://localhost:5173', 'http://localhost:4173', 'http://127.0.0.1:5173'];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }
      return callback(new Error('Origin not allowed by CORS policy'));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '256kb' }));

// ─── RATE LIMITERS ──────────────────────────────────────────────────────────
const analysisLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 90,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Rate limit exceeded for aerodynamic solver. Please wait a moment.' },
});

const sessionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many session requests from this address.' },
});

const mutationLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many write requests. Please slow down.' },
});

// ─── IN-MEMORY DEVICE & EVENT REGISTRY (FAST CACHE + LOCAL FALLBACK) ────────
// Synced with Supabase tables `device_guest_sessions` and `event_cohorts` when configured.
const deviceSessions = new Map();
const eventCohorts = new Map([
  [
    'VG-YOUTH',
    {
      code: 'VG-YOUTH',
      title: 'Pre-Aviation Youth Discovery Camp',
      audience_track: 'foundation',
      unlocked_tier: 'event_cohort',
      unlocked_modules: ['fuselage', 'wings', 'airfoil', 'tail', 'engines'],
      active: true,
      created_at: new Date().toISOString(),
    },
  ],
  [
    'VG-UNI26',
    {
      code: 'VG-UNI26',
      title: 'University Aerospace & Propulsion Workshop',
      audience_track: 'engineering',
      unlocked_tier: 'pro_student',
      unlocked_modules: ['fuselage', 'wings', 'airfoil', 'tail', 'engines'],
      active: true,
      created_at: new Date().toISOString(),
    },
  ],
  [
    'VG-VIP01',
    {
      code: 'VG-VIP01',
      title: 'Faculty & Visiting Professor Full Access',
      audience_track: 'engineering',
      unlocked_tier: 'vip_full',
      unlocked_modules: ['fuselage', 'wings', 'airfoil', 'tail', 'engines'],
      active: true,
      created_at: new Date().toISOString(),
    },
  ],
]);

function hashIpAddress(req) {
  const rawIp =
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    '0.0.0.0';
  return crypto.createHash('sha256').update(rawIp + (process.env.IP_HASH_SALT || 'vortex-gen-salt')).digest('hex').slice(0, 16);
}

// ─── PYTHON NEURALFOIL DAEMON WITH CORRELATION-ID IPC MAP ───────────────────
let pythonProcess = null;
let daemonRestartTimer = null;
const pendingRequests = new Map(); // requestId -> { resolve, reject, timer }

function rejectAllPending(reason) {
  for (const [, entry] of pendingRequests.entries()) {
    clearTimeout(entry.timer);
    entry.reject(new Error(reason));
  }
  pendingRequests.clear();
}

function startPythonDaemon() {
  if (pythonProcess && !pythonProcess.killed) return;

  try {
    const venvPython =
      process.platform === 'win32'
        ? path.join(__dirname, 'venv', 'Scripts', 'python.exe')
        : path.join(__dirname, 'venv', 'bin', 'python');
    const dockerVenvPython = '/opt/venv/bin/python';

    const pythonCmd = fs.existsSync(venvPython)
      ? venvPython
      : fs.existsSync(dockerVenvPython)
      ? dockerVenvPython
      : process.platform === 'win32'
      ? 'python'
      : 'python3';

    pythonProcess = spawn(pythonCmd, ['run_nf.py', '--daemon'], {
      cwd: __dirname,
    });

    const rl = readline.createInterface({
      input: pythonProcess.stdout,
      terminal: false,
    });

    rl.on('line', (line) => {
      try {
        const parsed = JSON.parse(line);
        const reqId = parsed.request_id;
        if (reqId && pendingRequests.has(reqId)) {
          const entry = pendingRequests.get(reqId);
          pendingRequests.delete(reqId);
          clearTimeout(entry.timer);
          entry.resolve(parsed);
        }
      } catch (err) {
        console.error('[Daemon] Invalid JSON from Python:', err.message);
      }
    });

    pythonProcess.stderr.on('data', (data) => {
      const msg = data.toString().trim();
      if (msg) console.error(`[Python]: ${msg}`);
    });

    pythonProcess.on('close', (code) => {
      console.warn(`[Daemon] Python process exited with code ${code}`);
      pythonProcess = null;
      rejectAllPending('Aerodynamic solver process restarted.');
      if (!daemonRestartTimer) {
        daemonRestartTimer = setTimeout(() => {
          daemonRestartTimer = null;
          startPythonDaemon();
        }, 2000);
      }
    });

    pythonProcess.on('error', (err) => {
      console.error(`[Daemon] Failed to spawn Python solver: ${err.message}`);
      pythonProcess = null;
      rejectAllPending('Aerodynamic solver unavailable.');
    });
  } catch (err) {
    console.error('[Daemon] Startup exception:', err.message);
    pythonProcess = null;
  }
}

startPythonDaemon();

function queryPythonDaemon(payload, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    if (!pythonProcess || pythonProcess.killed || !pythonProcess.stdin.writable) {
      startPythonDaemon();
      return reject(new Error('Python solver daemon is warming up.'));
    }

    const requestId = crypto.randomUUID();
    const timer = setTimeout(() => {
      pendingRequests.delete(requestId);
      reject(new Error('Aerodynamic solver timed out after 10s.'));
    }, timeoutMs);

    pendingRequests.set(requestId, { resolve, reject, timer });

    try {
      const message = JSON.stringify({ ...payload, request_id: requestId }) + '\n';
      pythonProcess.stdin.write(message);
    } catch (writeErr) {
      clearTimeout(timer);
      pendingRequests.delete(requestId);
      reject(writeErr);
    }
  });
}

// ─── UNIFIED AUTH & DEVICE SESSION MIDDLEWARE ───────────────────────────────
const resolveCallerMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const deviceFingerprint = req.headers['x-device-fingerprint'] || req.body?.device_fingerprint;

  // 1. Check Bearer JWT if provided
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();

    if (supabase && token && !token.startsWith('vg_guest_')) {
      const { data: authData, error } = await supabase.auth.getUser(token);
      if (!error && authData?.user) {
        const user = authData.user;
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, display_name, role, account_type, access_tier, active_workspace_id, event_code')
          .eq('id', user.id)
          .maybeSingle();

        req.caller = {
          id: user.id,
          email: user.email,
          display_name: profile?.display_name || user.email?.split('@')[0] || 'Student',
          role: profile?.role || 'student',
          access_tier: profile?.access_tier || (profile?.role === 'superadmin' || profile?.role === 'admin' ? 'vip_full' : 'pro_student'),
          workspace_id: profile?.active_workspace_id || null,
          is_guest: Boolean(user.is_anonymous),
          device_fingerprint: deviceFingerprint || null,
        };
        return next();
      }
    }
  }

  // 2. Check registered Device-Bound Guest Session
  if (deviceFingerprint && deviceSessions.has(deviceFingerprint)) {
    const guest = deviceSessions.get(deviceFingerprint);
    guest.last_seen_at = new Date().toISOString();
    req.caller = guest;
    return next();
  }

  // 3. If Supabase has a persistent record for this device fingerprint, hydrate it
  if (deviceFingerprint && supabase) {
    const { data: dbGuest } = await supabase
      .from('device_guest_sessions')
      .select('*')
      .eq('device_fingerprint', deviceFingerprint)
      .maybeSingle();

    if (dbGuest) {
      deviceSessions.set(deviceFingerprint, dbGuest);
      req.caller = dbGuest;
      return next();
    }
  }

  return res.status(401).json({
    error: 'Authentication or active guest session required.',
  });
};

const requireAdminMiddleware = (req, res, next) => {
  const adminSecret = req.headers['x-admin-key'];
  if (process.env.ADMIN_OVERRIDE_KEY && adminSecret === process.env.ADMIN_OVERRIDE_KEY) {
    return next();
  }
  if (
    req.caller &&
    (req.caller.role === 'admin' ||
      req.caller.role === 'superadmin' ||
      req.caller.role === 'instructor' ||
      req.caller.access_tier === 'vip_full')
  ) {
    return next();
  }
  return res.status(403).json({ error: 'Administrator or instructor privileges required.' });
};

// ─── HEALTH & STATUS ────────────────────────────────────────────────────────
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ok',
    solver_ready: Boolean(pythonProcess && !pythonProcess.killed),
    timestamp: new Date().toISOString(),
  });
});

// ─── DEVICE-BOUND GUEST & EVENT CODE REGISTRATION ───────────────────────────
app.post('/api/session/register', sessionLimiter, async (req, res) => {
  try {
    const {
      display_name,
      device_fingerprint,
      event_code,
      audience_track,
      current_route,
    } = req.body || {};

    if (!device_fingerprint || typeof device_fingerprint !== 'string' || device_fingerprint.length < 8) {
      return res.status(400).json({ error: 'Valid device_fingerprint is required.' });
    }

    const cleanName = String(display_name || 'Guest Student').trim().slice(0, 60) || 'Guest Student';
    const cleanCode = event_code ? String(event_code).trim().toUpperCase() : null;
    const ipHash = hashIpAddress(req);
    const userAgent = String(req.headers['user-agent'] || '').slice(0, 180);

    const existing = deviceSessions.get(device_fingerprint);
    let resolvedTier = existing?.access_tier || 'guest_restricted';
    let resolvedRole = existing?.role || 'guest';
    let resolvedTrack = audience_track || existing?.audience_track || 'foundation';
    let matchedCohort = null;

    if (cleanCode) {
      matchedCohort = eventCohorts.get(cleanCode) || null;
      if (!matchedCohort && supabase) {
        const { data: dbCohort } = await supabase
          .from('event_cohorts')
          .select('*')
          .eq('code', cleanCode)
          .eq('active', true)
          .maybeSingle();
        if (dbCohort) {
          matchedCohort = dbCohort;
          eventCohorts.set(cleanCode, dbCohort);
        }
      }
      if (!matchedCohort) {
        return res.status(404).json({ error: `Event code "${cleanCode}" was not found or is inactive.` });
      }
      resolvedTier = matchedCohort.unlocked_tier || 'event_cohort';
      resolvedTrack = matchedCohort.audience_track || resolvedTrack;
      if (resolvedTier === 'vip_full') {
        resolvedRole = 'vip_professor';
      } else if (resolvedRole === 'guest') {
        resolvedRole = 'event_participant';
      }
    }

    const now = new Date().toISOString();
    const sessionRecord = {
      id: existing?.id || `guest_${device_fingerprint.slice(0, 12)}`,
      display_name: cleanName,
      device_fingerprint,
      ip_hash: ipHash,
      user_agent: userAgent,
      role: resolvedRole,
      access_tier: resolvedTier,
      audience_track: resolvedTrack,
      event_code: cleanCode || existing?.event_code || null,
      current_route: current_route || existing?.current_route || '/explore',
      progress: existing?.progress || {},
      quiz_scores: existing?.quiz_scores || {},
      is_guest: true,
      created_at: existing?.created_at || now,
      last_seen_at: now,
    };

    deviceSessions.set(device_fingerprint, sessionRecord);

    if (supabase) {
      await supabase
        .from('device_guest_sessions')
        .upsert(
          {
            device_fingerprint: sessionRecord.device_fingerprint,
            display_name: sessionRecord.display_name,
            ip_hash: sessionRecord.ip_hash,
            user_agent: sessionRecord.user_agent,
            role: sessionRecord.role,
            access_tier: sessionRecord.access_tier,
            audience_track: sessionRecord.audience_track,
            event_code: sessionRecord.event_code,
            current_route: sessionRecord.current_route,
            progress: sessionRecord.progress,
            quiz_scores: sessionRecord.quiz_scores,
            last_seen_at: now,
          },
          { onConflict: 'device_fingerprint' }
        );
    }

    return res.json({
      session: sessionRecord,
      cohort: matchedCohort,
    });
  } catch (err) {
    console.error('[Session Register Error]:', err.message);
    return res.status(500).json({ error: 'Could not initialize session.' });
  }
});

// Poll or verify live session state (picks up Founder Admin overrides in real time)
app.get('/api/session/status', async (req, res) => {
  const fp = req.headers['x-device-fingerprint'] || req.query.device_fingerprint;
  if (!fp) return res.status(400).json({ error: 'Missing device_fingerprint' });

  let session = deviceSessions.get(fp);
  if (supabase) {
    const { data: dbGuest } = await supabase
      .from('device_guest_sessions')
      .select('*')
      .eq('device_fingerprint', fp)
      .maybeSingle();
    if (dbGuest) {
      session = { ...(session || {}), ...dbGuest };
      deviceSessions.set(fp, session);
    }
  }

  if (!session) {
    return res.status(404).json({ error: 'No session registered for this device.' });
  }

  session.last_seen_at = new Date().toISOString();
  if (req.query.route) {
    session.current_route = String(req.query.route).slice(0, 80);
  }
  return res.json({ session });
});

// Save progress / quiz score for Guest or Event participant
app.post('/api/session/progress', mutationLimiter, resolveCallerMiddleware, async (req, res) => {
  const { module_id, completed, score, current_route } = req.body || {};
  const fp = req.caller.device_fingerprint;

  if (fp && deviceSessions.has(fp)) {
    const record = deviceSessions.get(fp);
    if (module_id) {
      record.progress = {
        ...(record.progress || {}),
        [module_id]: {
          completed: Boolean(completed),
          score: typeof score === 'number' ? score : record.progress?.[module_id]?.score || 0,
          updated_at: new Date().toISOString(),
        },
      };
      if (typeof score === 'number') {
        record.quiz_scores = { ...(record.quiz_scores || {}), [module_id]: score };
      }
    }
    if (current_route) record.current_route = String(current_route).slice(0, 80);
    record.last_seen_at = new Date().toISOString();
    deviceSessions.set(fp, record);

    if (supabase) {
      await supabase
        .from('device_guest_sessions')
        .update({
          progress: record.progress,
          quiz_scores: record.quiz_scores,
          current_route: record.current_route,
          last_seen_at: record.last_seen_at,
        })
        .eq('device_fingerprint', fp);
    }
    return res.json({ session: record });
  }

  return res.json({ ok: true });
});

// ─── AERODYNAMIC SOLVER ENDPOINTS ───────────────────────────────────────────
app.post('/api/analyze', analysisLimiter, resolveCallerMiddleware, async (req, res) => {
  try {
    const result = await queryPythonDaemon(req.body, 10000);
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }
    return res.json(result);
  } catch (err) {
    return res.status(503).json({ error: err.message || 'Solver unavailable.' });
  }
});

app.post('/api/analyze-batch', analysisLimiter, resolveCallerMiddleware, async (req, res) => {
  if (req.caller.access_tier === 'guest_restricted') {
    return res.status(403).json({
      error: 'Batch airfoil autotune requires an active Event Code, Pro Student, or VIP session.',
    });
  }

  const batch = req.body?.batch;
  if (!Array.isArray(batch) || batch.length === 0 || batch.length > 160) {
    return res.status(400).json({ error: 'batch must be an array of 1 to 160 airfoil candidates.' });
  }

  try {
    const result = await queryPythonDaemon({ batch }, 25000);
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }
    return res.json(result);
  } catch (err) {
    return res.status(503).json({ error: err.message || 'Batch solver unavailable.' });
  }
});

// ─── FOUNDER / INSTRUCTOR LIVE OVERRIDE & EVENT HOSTING ENDPOINTS ───────────
app.get('/api/admin/sessions', resolveCallerMiddleware, requireAdminMiddleware, async (req, res) => {
  const guests = Array.from(deviceSessions.values());
  let registeredProfiles = [];

  if (supabase) {
    const { data: dbGuests } = await supabase
      .from('device_guest_sessions')
      .select('*')
      .order('last_seen_at', { ascending: false })
      .limit(200);

    if (Array.isArray(dbGuests)) {
      for (const g of dbGuests) {
        if (!deviceSessions.has(g.device_fingerprint)) {
          deviceSessions.set(g.device_fingerprint, g);
          guests.push(g);
        }
      }
    }

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, role, account_type, access_tier, event_code, created_at')
      .order('created_at', { ascending: false })
      .limit(200);

    if (Array.isArray(profiles)) {
      registeredProfiles = profiles;
    }
  }

  return res.json({
    guest_sessions: Array.from(deviceSessions.values()).sort(
      (a, b) => new Date(b.last_seen_at || 0) - new Date(a.last_seen_at || 0)
    ),
    registered_profiles: registeredProfiles,
    events: Array.from(eventCohorts.values()),
  });
});

app.post('/api/admin/override-access', mutationLimiter, resolveCallerMiddleware, requireAdminMiddleware, async (req, res) => {
  const { device_fingerprint, user_id, access_tier, role, audience_track, display_name } = req.body || {};

  const validTiers = ['guest_restricted', 'event_cohort', 'pro_student', 'vip_full'];
  const validRoles = ['guest', 'event_participant', 'student', 'vip_professor', 'instructor', 'admin'];

  if (access_tier && !validTiers.includes(access_tier)) {
    return res.status(400).json({ error: `Invalid access_tier. Must be one of: ${validTiers.join(', ')}` });
  }
  if (role && !validRoles.includes(role)) {
    return res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
  }

  // 1. Override a Device-Bound Guest Session (instant unlock without registration)
  if (device_fingerprint) {
    const current = deviceSessions.get(device_fingerprint) || {
      id: `guest_${device_fingerprint.slice(0, 12)}`,
      device_fingerprint,
      display_name: display_name || 'VIP Guest',
      is_guest: true,
      created_at: new Date().toISOString(),
    };

    if (access_tier) current.access_tier = access_tier;
    if (role) current.role = role;
    if (audience_track) current.audience_track = audience_track;
    if (display_name) current.display_name = String(display_name).trim().slice(0, 60);
    current.overridden_at = new Date().toISOString();
    current.last_seen_at = new Date().toISOString();

    deviceSessions.set(device_fingerprint, current);

    if (supabase) {
      await supabase
        .from('device_guest_sessions')
        .upsert(
          {
            device_fingerprint,
            display_name: current.display_name,
            access_tier: current.access_tier,
            role: current.role,
            audience_track: current.audience_track || 'engineering',
            last_seen_at: current.last_seen_at,
          },
          { onConflict: 'device_fingerprint' }
        );
    }

    return res.json({ success: true, updated_guest: current });
  }

  // 2. Override a Registered Supabase User Profile
  if (user_id && supabase) {
    const updates = {};
    if (access_tier) updates.access_tier = access_tier;
    if (role) updates.role = role;
    if (display_name) updates.display_name = String(display_name).trim().slice(0, 60);

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user_id)
      .select()
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true, updated_profile: data });
  }

  return res.status(400).json({ error: 'Provide either device_fingerprint or user_id.' });
});

app.get('/api/events', (req, res) => {
  const list = Array.from(eventCohorts.values()).map((ev) => {
    const participants = Array.from(deviceSessions.values()).filter(
      (s) => s.event_code === ev.code
    );
    return {
      ...ev,
      participant_count: participants.length,
      participants: participants.map((p) => ({
        display_name: p.display_name,
        device_fingerprint: p.device_fingerprint.slice(0, 10),
        access_tier: p.access_tier,
        quiz_scores: p.quiz_scores || {},
        last_seen_at: p.last_seen_at,
      })),
    };
  });
  res.json({ events: list });
});

app.post('/api/events', mutationLimiter, resolveCallerMiddleware, requireAdminMiddleware, async (req, res) => {
  const { code, title, audience_track, unlocked_tier } = req.body || {};
  const cleanCode = String(code || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '');

  if (!cleanCode || cleanCode.length < 3 || cleanCode.length > 16) {
    return res.status(400).json({ error: 'Event code must be 3–16 alphanumeric characters.' });
  }

  const cohort = {
    code: cleanCode,
    title: String(title || cleanCode).trim().slice(0, 100),
    audience_track: audience_track === 'engineering' ? 'engineering' : 'foundation',
    unlocked_tier: ['guest_restricted', 'event_cohort', 'pro_student', 'vip_full'].includes(unlocked_tier)
      ? unlocked_tier
      : 'event_cohort',
    unlocked_modules: ['fuselage', 'wings', 'airfoil', 'tail', 'engines'],
    active: true,
    created_at: new Date().toISOString(),
  };

  eventCohorts.set(cleanCode, cohort);

  if (supabase) {
    await supabase.from('event_cohorts').upsert(cohort, { onConflict: 'code' });
  }

  return res.json({ success: true, event: cohort });
});

app.listen(PORT, () => {
  console.log(`[Vortex-Gen Backend] Listening on port ${PORT}`);
});
