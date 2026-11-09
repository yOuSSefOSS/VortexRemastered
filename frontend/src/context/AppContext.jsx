import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import {
  getOrCreateDeviceFingerprint,
  loadStoredSession,
  saveStoredSession,
  getTierCapabilities,
} from '../domain/accessControl';
import {
  registerGuestOrEventSession,
  pollDeviceSessionStatus,
  recordModuleProgress,
} from '../services/apiService';
import { STANDARD_AIRFOILS } from '../domain/nacaGeometry';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const deviceFingerprint = useMemo(() => getOrCreateDeviceFingerprint(), []);

  // Theme polarity: Default Light mode per Section 5.1 (3D viewports stay anchored in #0F1217)
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('vg_theme_v2') || 'light';
    } catch (_) {
      return 'light';
    }
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('vg_theme_v2', theme);
    } catch (_) {}
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  // Session & Identity State (Supports Registered User, Device-Bound Guest, and Live Event Participant)
  const [session, setSession] = useState(() => {
    const cached = loadStoredSession();
    return (
      cached || {
        id: `guest_${deviceFingerprint.slice(0, 12)}`,
        display_name: 'Guest Student',
        device_fingerprint: deviceFingerprint,
        role: 'guest',
        access_tier: 'guest_restricted',
        audience_track: 'foundation',
        event_code: null,
        progress: {},
        quiz_scores: {},
        is_guest: true,
        is_initialized: false,
      }
    );
  });

  const [authLoading, setAuthLoading] = useState(true);

  // Audience depth mode ('foundation' for K-12/High School vs 'engineering' for University/Faculty)
  const [audienceTrack, setAudienceTrackState] = useState(
    () => session?.audience_track || 'foundation'
  );

  // Shared Aerospace Environment & Active NACA Parameters
  const [altitudeMeters, setAltitudeMeters] = useState(0);
  const [windSpeedMs, setWindSpeedMs] = useState(70);
  const [units, setUnits] = useState('metric'); // 'metric' | 'imperial'
  const [activeShapeId, setActiveShapeId] = useState('naca2412');
  const [compareShapeId, setCompareShapeId] = useState('naca0012');
  const [activeAirfoil, setActiveAirfoil] = useState({
    camber: 2,
    maxCamberLoc: 4,
    thickness: 12,
    aoa: 4,
  });
  const [compareAirfoil, setCompareAirfoil] = useState({
    camber: 0,
    maxCamberLoc: 4,
    thickness: 12,
    aoa: 4,
  });
  const [flightConditions, setFlightConditions] = useState({
    altitudeMeters: 1500,
    airspeedMs: 75,
    chordMeters: 1.6,
  });
  const [customAirfoils, setCustomAirfoils] = useState(() => {
    try {
      const saved = localStorage.getItem('vg_custom_airfoils_v2');
      return saved ? JSON.parse(saved) : [];
    } catch (_) {
      return [];
    }
  });

  const addCustomAirfoil = useCallback((newShape) => {
    setCustomAirfoils((prev) => {
      const updated = [newShape, ...prev.filter((s) => s.id !== newShape.id)];
      try {
        localStorage.setItem('vg_custom_airfoils_v2', JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });
    setActiveShapeId(newShape.id);
  }, []);

  const allAirfoils = useMemo(
    () => [...customAirfoils, ...STANDARD_AIRFOILS],
    [customAirfoils]
  );

  // Sync session changes to localStorage
  const updateSessionState = useCallback((nextSession) => {
    setSession((prev) => {
      const merged = { ...prev, ...nextSession, is_initialized: true };
      saveStoredSession(merged);
      if (merged.audience_track) {
        setAudienceTrackState(merged.audience_track);
      }
      return merged;
    });
  }, []);

  // Initialize session on mount (check Supabase Auth or restore/register Device Guest session)
  useEffect(() => {
    let mounted = true;

    async function bootstrapIdentity() {
      try {
        if (isSupabaseConfigured) {
          const { data } = await supabase.auth.getSession();
          const sbUser = data?.session?.user;
          if (sbUser && !sbUser.is_anonymous) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', sbUser.id)
              .maybeSingle();

            if (mounted) {
              updateSessionState({
                id: sbUser.id,
                email: sbUser.email,
                display_name:
                  profile?.display_name || sbUser.email?.split('@')[0] || 'Cadet',
                device_fingerprint: deviceFingerprint,
                role: profile?.role || 'student',
                access_tier: profile?.access_tier || 'pro_student',
                audience_track: profile?.audience_track || 'engineering',
                event_code: profile?.event_code || null,
                is_guest: false,
              });
              setAuthLoading(false);
              return;
            }
          }
        }

        // Check or register Device-Bound Guest Session with backend
        const stored = loadStoredSession();
        if (stored?.is_initialized) {
          try {
            const { session: remoteSession } = await pollDeviceSessionStatus(
              window.location.pathname
            );
            if (mounted && remoteSession) {
              updateSessionState(remoteSession);
            }
          } catch (_) {
            // Re-register cached session if backend restarted
            const { session: reRegistered } = await registerGuestOrEventSession({
              displayName: stored.display_name,
              eventCode: stored.event_code,
              audienceTrack: stored.audience_track,
              currentRoute: window.location.pathname,
            }).catch(() => ({}));
            if (mounted && reRegistered) {
              updateSessionState(reRegistered);
            }
          }
        }
      } finally {
        if (mounted) setAuthLoading(false);
      }
    }

    bootstrapIdentity();
    return () => {
      mounted = false;
    };
  }, [deviceFingerprint, updateSessionState]);

  // Real-Time Founder Override Listener (Supabase Realtime + lightweight 6s poll)
  // Allows the Founder to upgrade any Guest or Student to VIP/Professor in real time without refresh
  useEffect(() => {
    let channel = null;
    if (isSupabaseConfigured) {
      channel = supabase
        .channel(`device_override_${deviceFingerprint}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'device_guest_sessions',
            filter: `device_fingerprint=eq.${deviceFingerprint}`,
          },
          (payload) => {
            if (payload.new) {
              updateSessionState(payload.new);
            }
          }
        )
        .subscribe();
    }

    const interval = setInterval(async () => {
      try {
        const { session: fresh } = await pollDeviceSessionStatus(window.location.pathname);
        if (
          fresh &&
          (fresh.access_tier !== session.access_tier ||
            fresh.role !== session.role ||
            fresh.display_name !== session.display_name ||
            fresh.event_code !== session.event_code)
        ) {
          updateSessionState(fresh);
        }
      } catch (_) {}
    }, 6000);

    return () => {
      clearInterval(interval);
      if (channel && isSupabaseConfigured) {
        supabase.removeChannel(channel);
      }
    };
  }, [deviceFingerprint, session.access_tier, session.role, session.display_name, session.event_code, updateSessionState]);

  // Start or update a Guest / Event Code session
  const enterAsGuestOrEvent = useCallback(
    async ({ displayName, eventCode = null, track = 'foundation' }) => {
      const cleanName = String(displayName || 'Guest Student').trim() || 'Guest Student';
      const cleanCode = eventCode ? String(eventCode).trim().toUpperCase() : null;

      try {
        const { session: registered, cohort } = await registerGuestOrEventSession({
          displayName: cleanName,
          eventCode: cleanCode,
          audienceTrack: track,
          currentRoute: window.location.pathname,
        });
        updateSessionState(registered);
        return { session: registered, cohort };
      } catch (err) {
        // Offline / local fallback if backend is not reachable
        if (cleanCode && err.status === 404) {
          throw err;
        }
        const fallbackTier =
          cleanCode === 'VG-VIP01'
            ? 'vip_full'
            : cleanCode
            ? 'event_cohort'
            : 'guest_restricted';
        const fallbackSession = {
          id: `guest_${deviceFingerprint.slice(0, 12)}`,
          display_name: cleanName,
          device_fingerprint: deviceFingerprint,
          role: cleanCode === 'VG-VIP01' ? 'vip_professor' : cleanCode ? 'event_participant' : 'guest',
          access_tier: fallbackTier,
          audience_track: track,
          event_code: cleanCode,
          progress: session.progress || {},
          quiz_scores: session.quiz_scores || {},
          is_guest: true,
        };
        updateSessionState(fallbackSession);
        return { session: fallbackSession, cohort: null };
      }
    },
    [deviceFingerprint, session.progress, session.quiz_scores, updateSessionState]
  );

  // Save module quiz completion & score
  const saveProgress = useCallback(
    async (moduleId, scorePct) => {
      const completed = scorePct >= 70;
      const nextProgress = {
        ...(session.progress || {}),
        [moduleId]: { completed, score: scorePct, updated_at: new Date().toISOString() },
      };
      const nextScores = {
        ...(session.quiz_scores || {}),
        [moduleId]: scorePct,
      };
      updateSessionState({ progress: nextProgress, quiz_scores: nextScores });

      try {
        await recordModuleProgress({
          moduleId,
          completed,
          score: scorePct,
          currentRoute: window.location.pathname,
        });
      } catch (_) {}
    },
    [session.progress, session.quiz_scores, updateSessionState]
  );

  const capabilities = useMemo(
    () => getTierCapabilities(session.access_tier, session.role),
    [session.access_tier, session.role]
  );

  const setAudienceTrack = useCallback(
    (nextTrack) => {
      if (nextTrack === 'engineering' && !capabilities.allowEngineeringDepth) {
        return false;
      }
      setAudienceTrackState(nextTrack);
      updateSessionState({ audience_track: nextTrack });
      return true;
    },
    [capabilities.allowEngineeringDepth, updateSessionState]
  );

  const signOut = useCallback(async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut().catch(() => {});
    }
    const resetGuest = {
      id: `guest_${deviceFingerprint.slice(0, 12)}`,
      display_name: 'Guest Student',
      device_fingerprint: deviceFingerprint,
      role: 'guest',
      access_tier: 'guest_restricted',
      audience_track: 'foundation',
      event_code: null,
      progress: {},
      quiz_scores: {},
      is_guest: true,
      is_initialized: false,
    };
    saveStoredSession(null);
    setSession(resetGuest);
  }, [deviceFingerprint]);

  const canAccessSubsystem = useCallback(
    (subsystemId) => {
      const allowed = capabilities.allowedHangarZones || [];
      return allowed.includes(subsystemId);
    },
    [capabilities.allowedHangarZones]
  );

  const canAccessCockpitStation = useCallback(
    (stationId) => {
      if (
        session.access_tier === 'vip_full' ||
        session.access_tier === 'event_cohort' ||
        session.access_tier === 'pro_student'
      ) {
        return true;
      }
      return stationId === 'aircraft';
    },
    [session.access_tier]
  );

  const startGuestSession = useCallback(
    async (name) => {
      return enterAsGuestOrEvent({
        displayName: name,
        eventCode: null,
        track: audienceTrack,
      });
    },
    [enterAsGuestOrEvent, audienceTrack]
  );

  const joinEventCohort = useCallback(
    async (name, code) => {
      const cleanCode = String(code || '').trim().toUpperCase();
      const track = cleanCode === 'VG-YOUTH' ? 'foundation' : 'engineering';
      return enterAsGuestOrEvent({
        displayName: name,
        eventCode: cleanCode,
        track,
      });
    },
    [enterAsGuestOrEvent]
  );

  const applyLocalFounderOverride = useCallback(
    (newTier, newRole = 'vip_professor') => {
      updateSessionState({
        access_tier: newTier,
        role: newRole,
        audience_track: newTier === 'guest_restricted' ? 'foundation' : 'engineering',
      });
    },
    [updateSessionState]
  );

  const progressObj = useMemo(
    () => ({
      completedSubsystems: Object.keys(session.progress || {}).filter(
        (k) => session.progress[k]?.completed
      ),
      quizScores: session.quiz_scores || {},
    }),
    [session.progress, session.quiz_scores]
  );

  const value = useMemo(
    () => ({
      theme,
      toggleTheme,
      session,
      displayName: session.display_name || 'Guest Student',
      accessTier: session.access_tier || 'guest_restricted',
      role: session.role || 'guest',
      eventCode: session.event_code || null,
      authLoading,
      deviceFingerprint,
      capabilities,
      tierPolicy: capabilities,
      audienceTrack,
      setAudienceTrack,
      curriculumDepth: audienceTrack,
      setCurriculumDepth: setAudienceTrack,
      canAccessSubsystem,
      canAccessCockpitStation,
      enterAsGuestOrEvent,
      startGuestSession,
      joinEventCohort,
      applyLocalFounderOverride,
      updateSessionState,
      saveProgress,
      saveModuleProgress: saveProgress,
      progress: progressObj,
      signOut,
      altitudeMeters,
      setAltitudeMeters,
      windSpeedMs,
      setWindSpeedMs,
      units,
      setUnits,
      activeShapeId,
      setActiveShapeId,
      compareShapeId,
      setCompareShapeId,
      activeAirfoil,
      setActiveAirfoil,
      compareAirfoil,
      setCompareAirfoil,
      flightConditions,
      setFlightConditions,
      allAirfoils,
      customAirfoils,
      addCustomAirfoil,
    }),
    [
      theme,
      toggleTheme,
      session,
      authLoading,
      deviceFingerprint,
      capabilities,
      audienceTrack,
      setAudienceTrack,
      canAccessSubsystem,
      canAccessCockpitStation,
      enterAsGuestOrEvent,
      startGuestSession,
      joinEventCohort,
      applyLocalFounderOverride,
      updateSessionState,
      saveProgress,
      progressObj,
      signOut,
      altitudeMeters,
      windSpeedMs,
      units,
      activeShapeId,
      compareShapeId,
      activeAirfoil,
      compareAirfoil,
      flightConditions,
      allAirfoils,
      customAirfoils,
      addCustomAirfoil,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used inside an AppProvider');
  }
  return ctx;
}
