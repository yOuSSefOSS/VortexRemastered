import React, { useState, useEffect } from 'react';
import VortexLogo from './VortexLogo';
import { preloadF16Assets } from '../three/F16FalconAssembly';
import { preloadTurbofanAssets } from '../three/TurbofanExplorer3D';

const CACHE_KEY = 'vg_session_preloaded_v2';
const ASSET_CACHE_NAME = 'vortex-gen-static-v2';

const PRELOAD_STEPS = [
  {
    pct: 24,
    code: 'SYS-01 · CAD LOFTING',
    label: 'Compiling F-16C Block 50 3D fuselage, bubble canopy & tail decal...',
  },
  {
    pct: 58,
    code: 'SYS-02 · TURBOMACHINERY',
    label: 'Synthesizing & caching 8-stage dual-spool turbofan airfoil rings...',
  },
  {
    pct: 84,
    code: 'SYS-03 · CFD & HANGAR CHUNKS',
    label: 'Pre-loading 3D Aircraft Hangar & 2D Navier-Stokes Wind Tunnel...',
  },
  {
    pct: 100,
    code: 'SYS-04 · CACHE READY',
    label: 'All 3D models & fluid solvers cached in memory. Ready for flight.',
  },
];

/**
 * Persistent First-Load Preloader & 3D Asset Cache Warmer.
 * Guarantees that every 3D geometry, texture, merged blade ring, and lazy route
 * chunk is compiled and cached before the user interacts with the website.
 */
export default function InitialPreloader({ onPreloadRoutes, onComplete }) {
  const [stepIdx, setStepIdx] = useState(0);
  const [progress, setProgress] = useState(8);
  const [fadingOut, setFadingOut] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const isRepeatSession =
      typeof window !== 'undefined' &&
      window.sessionStorage?.getItem(CACHE_KEY) === 'true';

    // Faster cadence if already visited in this browser tab, full visual cadence on first open
    const stepDelay = isRepeatSession ? 90 : 240;

    const warmBrowserCache = async () => {
      try {
        if (typeof window !== 'undefined' && 'caches' in window) {
          const cache = await window.caches.open(ASSET_CACHE_NAME);
          await cache.addAll(['/brand/logo-primary.jpg', '/brand/logo-icon.jpg']).catch(() => {});
        }
      } catch {
        // Ignore CacheStorage errors in restricted contexts
      }
    };

    const runPipeline = async () => {
      // Step 1: Preload & Cache F-16 3D Lofted Geometries + High-Res Tail Texture
      await new Promise((r) => requestAnimationFrame(r));
      if (cancelled) return;
      setStepIdx(0);
      setProgress(28);
      try {
        preloadF16Assets();
      } catch {
        // ignore
      }

      await new Promise((r) => setTimeout(r, stepDelay));
      if (cancelled) return;

      // Step 2: Preload & Cache Turbofan 3D Wing, Pylon, Cowlings & 17 Merged Rotor Blade Disks
      setStepIdx(1);
      setProgress(62);
      await new Promise((r) => requestAnimationFrame(r));
      try {
        preloadTurbofanAssets();
      } catch {
        // ignore
      }

      await new Promise((r) => setTimeout(r, stepDelay));
      if (cancelled) return;

      // Step 3: Preload Lazy Route Bundles (/explore Hangar & /lab Wind Tunnel) + Browser CacheStorage
      setStepIdx(2);
      setProgress(88);
      try {
        if (onPreloadRoutes) {
          await onPreloadRoutes();
        }
        await warmBrowserCache();
      } catch {
        // ignore
      }

      await new Promise((r) => setTimeout(r, stepDelay));
      if (cancelled) return;

      // Step 4: Mark Session Cache Warm & Fade Out Smoothly
      setStepIdx(3);
      setProgress(100);
      try {
        window.sessionStorage?.setItem(CACHE_KEY, 'true');
      } catch {
        // ignore
      }

      await new Promise((r) => setTimeout(r, isRepeatSession ? 120 : 280));
      if (cancelled) return;
      setFadingOut(true);

      await new Promise((r) => setTimeout(r, 340));
      if (cancelled) return;
      setDone(true);
      if (onComplete) onComplete();
    };

    runPipeline();
    return () => {
      cancelled = true;
    };
  }, [onPreloadRoutes, onComplete]);

  if (done) return null;

  const activeStep = PRELOAD_STEPS[stepIdx] || PRELOAD_STEPS[0];

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background:
          'radial-gradient(circle at 50% 35%, rgba(46, 139, 255, 0.16), transparent 62%), var(--bg-canvas)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        opacity: fadingOut ? 0 : 1,
        pointerEvents: fadingOut ? 'none' : 'auto',
        transition: 'opacity 340ms cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      <div
        className="vg-card"
        style={{
          width: '100%',
          maxWidth: '480px',
          padding: '32px 28px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: '20px',
          background: 'var(--bg-surface)',
          borderColor: 'var(--border-strong)',
          boxShadow: 'var(--shadow-lg), var(--accent-glow)',
        }}
      >
        {/* Official Winged "V" Crest Lockup */}
        <VortexLogo size={82} showWordmark showTagline variant="hero" />

        <div style={{ width: '100%' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px',
              gap: '8px',
            }}
          >
            <span
              className="mono"
              style={{
                fontSize: '10.5px',
                fontWeight: 700,
                letterSpacing: '0.14em',
                color: 'var(--accent-primary)',
              }}
            >
              {activeStep.code}
            </span>
            <span
              className="mono vg-tabular"
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--text-primary)',
              }}
            >
              {progress}%
            </span>
          </div>

          {/* Smooth Hardware-Accelerated Progress Track */}
          <div
            style={{
              width: '100%',
              height: '8px',
              borderRadius: '999px',
              background: 'var(--bg-inset)',
              border: '1px solid var(--border-subtle)',
              overflow: 'hidden',
              marginBottom: '12px',
            }}
          >
            <div
              style={{
                width: `${progress}%`,
                height: '100%',
                borderRadius: '999px',
                background:
                  'linear-gradient(90deg, #1E70F0 0%, #38BDF8 65%, #F4B740 100%)',
                boxShadow: '0 0 16px rgba(56, 189, 248, 0.55)',
                transition: 'width 220ms cubic-bezier(0.22, 1, 0.36, 1)',
              }}
            />
          </div>

          <div
            style={{
              fontSize: '12.5px',
              color: 'var(--text-secondary)',
              minHeight: '20px',
              lineHeight: 1.45,
            }}
          >
            {activeStep.label}
          </div>
        </div>

        {/* 4-Chip Cache Status Matrix */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '6px',
            width: '100%',
            paddingTop: '8px',
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          {[
            { label: 'F-16 3D', ready: progress >= 28 },
            { label: 'Turbofan', ready: progress >= 62 },
            { label: 'CFD Lab', ready: progress >= 88 },
            { label: 'Cached', ready: progress >= 100 },
          ].map((chip) => (
            <div
              key={chip.label}
              className="mono"
              style={{
                fontSize: '10px',
                fontWeight: 700,
                padding: '5px 4px',
                borderRadius: '6px',
                background: chip.ready ? 'var(--accent-subtle)' : 'var(--bg-subtle)',
                color: chip.ready ? 'var(--accent-primary)' : 'var(--text-tertiary)',
                border: `1px solid ${
                  chip.ready ? 'var(--border-strong)' : 'var(--border-subtle)'
                }`,
                transition: 'all 180ms ease',
              }}
            >
              {chip.ready ? '✓ ' : '· '}
              {chip.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

