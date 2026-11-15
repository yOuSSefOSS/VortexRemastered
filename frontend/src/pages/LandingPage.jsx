import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  Boxes,
  Flame,
  Eye,
  Layers,
  ChevronLeft,
  ChevronRight,
  Sliders,
  Move3d,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import F16FalconAssembly, { F16_PARTS } from '../components/three/F16FalconAssembly';
import TurbofanExplorer3D from '../components/three/TurbofanExplorer3D';
import NavierStokesTunnel2D from '../components/cfd/NavierStokesTunnel2D';
import { formatNacaCode } from '../domain/nacaGeometry';
import { computeWingPlanformAero } from '../domain/flightMechanics';

const SPEC_BLOCKS = [
  {
    category: '01 · DIMENSIONS & MASS',
    items: [
      { label: 'Length', value: '15.06 m (49 ft 5 in)' },
      { label: 'Wingspan', value: '9.96 m (32 ft 8 in)' },
      { label: 'Wing Area', value: '27.87 m² (300.0 ft²)' },
      { label: 'Empty / Max Takeoff', value: '8,570 kg / 19,187 kg' },
    ],
  },
  {
    category: '02 · PROPULSION & THRUST',
    items: [
      { label: 'Powerplant', value: '1 × GE F110-GE-129 Turbofan' },
      { label: 'Dry Military Thrust', value: '76.3 kN (17,155 lbf)' },
      { label: 'Afterburning Thrust', value: '131.2 kN (29,500 lbf)' },
      { label: 'Thrust-to-Weight', value: '1.095 : 1 (Loaded)' },
    ],
  },
  {
    category: '03 · AERODYNAMIC ENVELOPE',
    items: [
      { label: 'Maximum Speed', value: 'Mach 2.05 (2,178 km/h at FL400)' },
      { label: 'Service Ceiling', value: '15,240 m (50,000+ ft)' },
      { label: 'Design Load Limit', value: '+9.0 G / −3.0 G Sustained' },
      { label: 'Roll Rate Authority', value: '324 deg/s Full Deflection' },
    ],
  },
  {
    category: '04 · AVIONICS & CONTROL LAW',
    items: [
      { label: 'Flight Control System', value: 'Quad-Redundant Digital Fly-By-Wire' },
      { label: 'Static Margin (Subsonic)', value: '−2.0% MAC (Relaxed Stability)' },
      { label: 'Fire-Control Radar', value: 'AN/APG-68(V)9 Pulse-Doppler' },
      { label: 'Root Airfoil Section', value: 'NACA 64A204 (4% Thickness)' },
    ],
  },
];

export default function LandingPage() {
  const { activeAirfoil, setActiveAirfoil, flightConditions, setFlightConditions } =
    useApp();

  // Chapter I: F-16 3D Interactive Disassembly & Scroll-Choreographed State
  // Default selectedPartId to `null` (Free Orbit mode) so users can orbit/pan/zoom freely!
  const [explodeFactor, setExplodeFactor] = useState(0.0);
  const [manualOverride, setManualOverride] = useState(false);
  const [flightMode, setFlightMode] = useState(false);
  const [wireframeMode, setWireframeMode] = useState(false);
  const [showLabels, setShowLabels] = useState(true);
  const [cameraView, setCameraView] = useState('overview');
  const [selectedPartId, setSelectedPartId] = useState(null);

  // Scroll-linked disassembly across the first 1200px of scroll unless manually overridden or in flight mode.
  // Never hijacks `selectedPartId` so the user's free camera movement is never interrupted.
  useEffect(() => {
    const handleScroll = () => {
      if (manualOverride || flightMode) return;
      const y = window.scrollY;
      const progress = Math.max(0, Math.min(1, (y - 80) / 850));
      setExplodeFactor(Number(progress.toFixed(3)));
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [manualOverride, flightMode]);

  const activePartIndex = useMemo(() => {
    if (!selectedPartId) return -1;
    return F16_PARTS.findIndex((p) => p.id === selectedPartId);
  }, [selectedPartId]);

  const activePart = activePartIndex >= 0 ? F16_PARTS[activePartIndex] : null;
  const inspectedPart = activePart || F16_PARTS[0];

  const stepPart = (delta) => {
    if (activePartIndex === -1) {
      setSelectedPartId(delta >= 0 ? F16_PARTS[0].id : F16_PARTS[F16_PARTS.length - 1].id);
      return;
    }
    const nextIdx = (activePartIndex + delta + F16_PARTS.length) % F16_PARTS.length;
    setSelectedPartId(F16_PARTS[nextIdx].id);
  };

  // Live aerodynamic coefficients for Chapter IV (2D Navier-Stokes Wind Tunnel)
  const wingAero = useMemo(
    () =>
      computeWingPlanformAero({
        cl2D: 0.11 * activeAirfoil.aoa + 0.18,
        cd2D: 0.009 + 0.0004 * activeAirfoil.aoa * activeAirfoil.aoa,
        cm2D: -0.04,
        aoaDeg: activeAirfoil.aoa,
        aspectRatio: 8.8,
        sweepDeg: 25,
        mach: 0.25,
        thicknessRatio: activeAirfoil.thickness / 100,
        flapDeg: 0,
        slatDeg: 0,
      }),
    [activeAirfoil]
  );

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-canvas)',
        color: 'var(--text-primary)',
        minHeight: '100vh',
      }}
    >
      {/* ===================================================================
          CHAPTER 01 // SCROLL-CHOREOGRAPHED 3D F-16 DISASSEMBLY STAGE
          (215vh scroll runway with sticky 100vh 3D WebGL stage)
         =================================================================== */}
      <section
        id="sec-f16-stage"
        style={{
          position: 'relative',
          height: '215vh',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <div
          style={{
            position: 'sticky',
            top: '60px',
            width: '100%',
            height: 'calc(100vh - 60px)',
            overflow: 'hidden',
          }}
        >
          {/* Full-Viewport 3D F-16 Fighting Falcon Assembly */}
          <F16FalconAssembly
            explodeFactor={explodeFactor}
            selectedPartId={selectedPartId}
            onSelectPart={(id) => {
              setSelectedPartId(id);
            }}
            flightMode={flightMode}
            wireframe={wireframeMode}
            cameraView={cameraView}
            showLabels={showLabels}
          />

          {/* Top Floating Editorial Header & Chapter Jump Bar */}
          <div
            style={{
              position: 'absolute',
              top: '20px',
              left: '24px',
              right: '24px',
              zIndex: 20,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              flexWrap: 'wrap',
              gap: '16px',
              pointerEvents: 'none',
            }}
          >
            {/* Left Title Block */}
            <div
              className="vg-glass"
              style={{
                maxWidth: '480px',
                padding: '16px 20px',
                pointerEvents: 'auto',
              }}
            >
              <div className="vg-eyebrow" style={{ marginBottom: '6px' }}>
                AERO / ARCHIVE · INTERACTIVE 3D DISASSEMBLY
              </div>
              <h1
                style={{
                  fontSize: 'clamp(1.5rem, 2.6vw, 2.25rem)',
                  fontWeight: 700,
                  letterSpacing: '-0.03em',
                  lineHeight: 1.1,
                  margin: '0 0 8px 0',
                  color: 'var(--glass-text)',
                }}
              >
                General Dynamics F-16C Fighting Falcon
              </h1>
              <p
                style={{
                  fontSize: '13px',
                  color: 'var(--glass-text-soft)',
                  margin: 0,
                  lineHeight: 1.55,
                }}
              >
                Drag to orbit freely in 3D space, scroll down to explode all 12 sub-assemblies, or click any component pin to lock and inspect its formulation.
              </p>
            </div>

            {/* Right Action Pill Bar */}
            <div
              className="vg-glass"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                flexWrap: 'wrap',
                pointerEvents: 'auto',
                padding: '8px 10px',
              }}
            >
              <button
                type="button"
                onClick={() => scrollToSection('sec-components')}
                className="btn btn-ghost btn-sm"
                style={{ fontSize: '11.5px' }}
              >
                Components (12)
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('sec-turbofan')}
                className="btn btn-ghost btn-sm"
                style={{ fontSize: '11.5px' }}
              >
                Turbofan Cutaway
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('sec-cfd-tunnel')}
                className="btn btn-ghost btn-sm"
                style={{ fontSize: '11.5px' }}
              >
                2D CFD Tunnel
              </button>

              <div
                style={{
                  width: '1px',
                  height: '18px',
                  background: 'var(--glass-border)',
                }}
              />

              <button
                type="button"
                onClick={() => setSelectedPartId(null)}
                className={`btn btn-sm ${
                  selectedPartId === null ? 'btn-primary' : 'btn-secondary'
                }`}
                title="Clear part selection so you can move and orbit the camera freely"
              >
                <Move3d size={13} />
                Free Orbit
              </button>

              <button
                type="button"
                onClick={() => {
                  setManualOverride(true);
                  setFlightMode(false);
                  setExplodeFactor((prev) => (prev > 0.5 ? 0.0 : 1.0));
                }}
                className={`btn btn-sm ${
                  explodeFactor > 0.5 ? 'btn-primary' : 'btn-secondary'
                }`}
              >
                <Boxes size={13} />
                {explodeFactor > 0.5 ? 'Reassemble' : 'Explode'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setManualOverride(true);
                  setFlightMode((prev) => {
                    const next = !prev;
                    if (next) setExplodeFactor(0.0);
                    return next;
                  });
                }}
                className={`btn btn-sm ${
                  flightMode ? 'vg-btn-gold' : 'vg-btn-gold-outline'
                }`}
              >
                <Flame size={13} />
                {flightMode ? 'Exit Flight' : 'Launch Flight'}
              </button>
            </div>
          </div>

          {/* Right-Side Floating Component Inspector Card */}
          <div
            className="vg-glass"
            style={{
              position: 'absolute',
              right: '24px',
              top: '96px',
              width: '348px',
              zIndex: 20,
              padding: '18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span
                className="mono"
                style={{
                  fontSize: '10px',
                  letterSpacing: '0.12em',
                  color: 'var(--accent-primary)',
                  fontWeight: 700,
                }}
              >
                {activePart
                  ? `PART ${activePart.index} / 12 · ${activePart.category.toUpperCase()}`
                  : 'FREE ORBIT · NO PART LOCKED'}
              </span>
              <div style={{ display: 'flex', gap: '4px' }}>
                {activePart && (
                  <button
                    type="button"
                    onClick={() => setSelectedPartId(null)}
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '0 8px', height: '26px', fontSize: '10px' }}
                    title="Unlock camera & clear selection"
                  >
                    Unlock
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => stepPart(-1)}
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '0 6px', height: '26px' }}
                  title="Previous component"
                >
                  <ChevronLeft size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => stepPart(1)}
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '0 6px', height: '26px' }}
                  title="Next component"
                >
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>

            {activePart ? (
              <>
                <h2
                  style={{
                    fontSize: '1.05rem',
                    fontWeight: 700,
                    margin: 0,
                    color: 'var(--glass-text)',
                  }}
                >
                  {activePart.name}
                </h2>

                <p
                  style={{
                    fontSize: '12.5px',
                    color: 'var(--glass-text-soft)',
                    lineHeight: 1.55,
                    margin: 0,
                  }}
                >
                  {activePart.summary}
                </p>

                <div
                  className="mono"
                  style={{
                    fontSize: '11px',
                    padding: '7px 10px',
                    background: 'var(--accent-subtle)',
                    border: '1px solid var(--border-strong)',
                    borderRadius: 'var(--radius-xs)',
                    color: 'var(--accent-primary)',
                  }}
                >
                  {activePart.formula}
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '5px',
                    borderTop: '1px solid var(--glass-border)',
                    paddingTop: '8px',
                  }}
                >
                  {(activePart.specs || []).map((sp) => (
                    <div
                      key={sp.label}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '11.5px',
                      }}
                    >
                      <span style={{ color: 'var(--glass-muted)' }}>{sp.label}</span>
                      <span
                        className="mono"
                        style={{ color: 'var(--glass-text)', fontWeight: 600 }}
                      >
                        {sp.value}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <h2
                  style={{
                    fontSize: '1.05rem',
                    fontWeight: 700,
                    margin: 0,
                    color: 'var(--glass-text)',
                  }}
                >
                  Free Camera Exploration Mode
                </h2>
                <p
                  style={{
                    fontSize: '12.5px',
                    color: 'var(--glass-text-soft)',
                    lineHeight: 1.55,
                    margin: 0,
                  }}
                >
                  No component is locking the camera. Left-drag to orbit 360°, right-drag to pan, or scroll to zoom freely. Click any 3D part or use the arrows above to inspect individual assemblies.
                </p>
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  <button
                    type="button"
                    onClick={() => setSelectedPartId('radome')}
                    className="btn btn-primary btn-sm"
                    style={{ width: '100%' }}
                  >
                    Start Guided Part Tour (01 / 12)
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Bottom Floating Camera Aspect & Disassembly Scrubber Bar */}
          <div
            style={{
              position: 'absolute',
              bottom: '22px',
              left: '24px',
              right: '24px',
              zIndex: 20,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
              pointerEvents: 'none',
            }}
          >
            {/* Camera Aspect Pills */}
            <div
              className="vg-glass"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 8px',
                pointerEvents: 'auto',
                flexWrap: 'wrap',
              }}
            >
              {[
                { id: 'overview', label: 'Overview' },
                { id: 'top', label: 'Top view' },
                { id: 'side', label: 'Side profile' },
                { id: 'front', label: 'Front aspect' },
              ].map((cam) => (
                <button
                  key={cam.id}
                  type="button"
                  onClick={() => {
                    setSelectedPartId(null);
                    setCameraView(cam.id);
                  }}
                  className={`btn btn-sm ${
                    cameraView === cam.id && !selectedPartId
                      ? 'btn-primary'
                      : 'btn-secondary'
                  }`}
                  style={{ fontSize: '11px' }}
                >
                  {cam.label}
                </button>
              ))}

              <div
                style={{
                  width: '1px',
                  height: '18px',
                  background: 'var(--glass-border)',
                }}
              />

              <button
                type="button"
                onClick={() => setShowLabels((v) => !v)}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '11px' }}
              >
                <Eye size={13} />
                {showLabels ? 'Hide pins' : 'Show pins'}
              </button>

              <button
                type="button"
                onClick={() => setWireframeMode((w) => !w)}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '11px' }}
              >
                <Layers size={13} />
                Wireframe
              </button>
            </div>

            {/* Manual / Scroll Explosion Scrubber */}
            <div
              className="vg-glass"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '8px 16px',
                pointerEvents: 'auto',
                minWidth: '280px',
              }}
            >
              <span className="mono" style={{ fontSize: '10px', color: 'var(--glass-muted)' }}>
                EXPLODE
              </span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={explodeFactor}
                onChange={(e) => {
                  setManualOverride(true);
                  setFlightMode(false);
                  setExplodeFactor(Number(e.target.value));
                }}
                style={{ flex: 1 }}
              />
              <span
                className="mono"
                style={{
                  fontSize: '11px',
                  color: 'var(--accent-primary)',
                  minWidth: '36px',
                  fontWeight: 600,
                }}
              >
                {Math.round(explodeFactor * 100)}%
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================
          CHAPTER 02 // "EVERY PART. A PURPOSE." — 12-PART ANATOMICAL INDEX
         =================================================================== */}
      <section
        id="sec-components"
        style={{
          padding: '88px 28px',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--bg-surface)',
        }}
      >
        <div
          style={{
            maxWidth: '1380px',
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: '48px',
            alignItems: 'start',
          }}
        >
          {/* Left Editorial Column */}
          <div>
            <div className="vg-eyebrow" style={{ marginBottom: '10px' }}>
              CHAPTER 02 · STRUCTURAL &amp; AVIONICS ANATOMY
            </div>
            <h2
              style={{
                fontSize: 'clamp(2rem, 3.4vw, 3rem)',
                fontWeight: 700,
                letterSpacing: '-0.03em',
                lineHeight: 1.08,
                margin: '0 0 16px 0',
                color: 'var(--text-primary)',
              }}
            >
              Every part. A purpose.
            </h2>
            <p
              style={{
                fontSize: '15px',
                color: 'var(--text-secondary)',
                lineHeight: 1.7,
                margin: '0 0 28px 0',
                maxWidth: '48ch',
              }}
            >
              The F-16 was the first production combat aircraft intentionally designed with relaxed static longitudinal stability and a quad-redundant digital fly-by-wire flight control system. Select any of the 12 primary assemblies to inspect its engineering role or focus it in the 3D hangar above.
            </p>

            {/* Selected Part Deep-Dive Card */}
            <div
              className="vg-card"
              style={{
                padding: '24px',
                background: 'var(--bg-subtle)',
                borderColor: 'var(--border-strong)',
              }}
            >
              <div
                className="mono"
                style={{
                  fontSize: '11px',
                  color: 'var(--accent-primary)',
                  marginBottom: '6px',
                  fontWeight: 600,
                }}
              >
                {activePart
                  ? `ACTIVE SELECTION · ${inspectedPart.code}`
                  : `FEATURED SUB-ASSEMBLY · ${inspectedPart.code}`}
              </div>
              <h3
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  margin: '0 0 10px 0',
                  color: 'var(--text-primary)',
                }}
              >
                {inspectedPart.name}
              </h3>
              <p
                style={{
                  fontSize: '13.5px',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.65,
                  margin: '0 0 12px 0',
                }}
              >
                {inspectedPart.engineeringNote}
              </p>
              <div
                className="mono"
                style={{
                  fontSize: '12px',
                  color: 'var(--accent-primary)',
                  padding: '10px 12px',
                  background: 'var(--bg-canvas)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-xs)',
                  marginBottom: '14px',
                }}
              >
                {inspectedPart.formula}
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => {
                    setManualOverride(true);
                    setSelectedPartId(inspectedPart.id);
                    setExplodeFactor(0.75);
                    scrollToSection('sec-f16-stage');
                  }}
                  className="btn btn-primary btn-sm"
                >
                  Focus in 3D Stage ↑
                </button>
                {selectedPartId && (
                  <button
                    type="button"
                    onClick={() => setSelectedPartId(null)}
                    className="btn btn-secondary btn-sm"
                  >
                    Clear Selection (Free Orbit)
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right 12-Part Interactive List */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            {F16_PARTS.map((part) => {
              const isSelected = part.id === selectedPartId;
              return (
                <button
                  key={part.id}
                  type="button"
                  onClick={() =>
                    setSelectedPartId((prev) => (prev === part.id ? null : part.id))
                  }
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '40px 1fr auto',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '14px 16px',
                    background: isSelected
                      ? 'var(--accent-subtle)'
                      : 'var(--bg-subtle)',
                    border: `1px solid ${
                      isSelected ? 'var(--border-strong)' : 'var(--border-subtle)'
                    }`,
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 140ms ease',
                  }}
                >
                  <span
                    className="mono"
                    style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      color: isSelected
                        ? 'var(--accent-primary)'
                        : 'var(--text-tertiary)',
                    }}
                  >
                    {part.index}
                  </span>
                  <div>
                    <div
                      style={{
                        fontSize: '14.5px',
                        fontWeight: 600,
                        color: isSelected
                          ? 'var(--accent-primary)'
                          : 'var(--text-primary)',
                      }}
                    >
                      {part.name}
                    </div>
                    <div
                      style={{
                        fontSize: '12px',
                        color: 'var(--text-secondary)',
                        marginTop: '2px',
                      }}
                    >
                      {part.summary}
                    </div>
                  </div>
                  <span className="vg-badge">{part.category}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===================================================================
          CHAPTER 03 // TURBOFAN EXPLORER — SUCK · SQUEEZE · BANG · BLOW
         =================================================================== */}
      <section
        id="sec-turbofan"
        style={{
          padding: '84px 28px',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--bg-canvas)',
        }}
      >
        <div style={{ maxWidth: '1440px', margin: '0 auto' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              flexWrap: 'wrap',
              gap: '16px',
              marginBottom: '24px',
            }}
          >
            <div>
              <div className="vg-eyebrow" style={{ marginBottom: '8px' }}>
                CHAPTER 03 · BRAYTON THERMODYNAMIC CYCLE &amp; DUAL-SPOOL PROPULSION
              </div>
              <h2
                style={{
                  fontSize: 'clamp(1.85rem, 3vw, 2.6rem)',
                  fontWeight: 700,
                  letterSpacing: '-0.03em',
                  margin: 0,
                  color: 'var(--text-primary)',
                }}
              >
                Turbofan Explorer — Suck · Squeeze · Bang · Blow
              </h2>
            </div>
            <p
              style={{
                fontSize: '13.5px',
                color: 'var(--text-secondary)',
                maxWidth: '54ch',
                margin: 0,
                lineHeight: 1.6,
              }}
            >
              Swing open the hinged clamshell cowling doors, inspect the concentric inner cyan LP shaft (N1) and outer amber HP shaft (N2), press Play on the 28-second guided camera tour, or explode all 8 axial stages along the centerline.
            </p>
          </div>

          <TurbofanExplorer3D throttlePct={84} bypassRatio={8.5} height="660px" />
        </div>
      </section>

      {/* ===================================================================
          CHAPTER 04 // AERODYNAMICS STUDIO — 2D NAVIER-STOKES WIND TUNNEL
         =================================================================== */}
      <section
        id="sec-cfd-tunnel"
        style={{
          padding: '84px 28px',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--bg-surface)',
        }}
      >
        <div style={{ maxWidth: '1440px', margin: '0 auto' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              flexWrap: 'wrap',
              gap: '16px',
              marginBottom: '24px',
            }}
          >
            <div>
              <div className="vg-eyebrow" style={{ marginBottom: '8px' }}>
                CHAPTER 04 · REAL-TIME 2D EULERIAN NAVIER-STOKES FLUID SOLVER
              </div>
              <h2
                style={{
                  fontSize: 'clamp(1.85rem, 3vw, 2.6rem)',
                  fontWeight: 700,
                  letterSpacing: '-0.03em',
                  margin: 0,
                  color: 'var(--text-primary)',
                }}
              >
                Aerodynamics Studio &amp; Interactive Smoke Tunnel
              </h2>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Link to="/lab?station=windtunnel" className="btn btn-primary btn-sm">
                <Sliders size={14} />
                Open Full Polar &amp; NeuralFoil Lab
                <ArrowUpRight size={14} />
              </Link>
            </div>
          </div>

          <NavierStokesTunnel2D
            nacaCode={formatNacaCode(
              activeAirfoil.camber,
              activeAirfoil.maxCamberLoc,
              activeAirfoil.thickness
            )}
            m={activeAirfoil.camber}
            p={activeAirfoil.maxCamberLoc}
            t={activeAirfoil.thickness}
            aoa={activeAirfoil.aoa}
            onAoaChange={(newAoa) =>
              setActiveAirfoil((prev) => ({ ...prev, aoa: newAoa }))
            }
            velocityMs={flightConditions.airspeedMs}
            onVelocityChange={(newVel) =>
              setFlightConditions((prev) => ({ ...prev, airspeedMs: newVel }))
            }
            cl={wingAero.cl3D}
            cd={wingAero.cdTotal}
          />
        </div>
      </section>

      {/* ===================================================================
          CHAPTER 05 // TECHNICAL SPECIFICATIONS & FLIGHT ENVELOPE MATRIX
         =================================================================== */}
      <section
        id="sec-specs"
        style={{
          padding: '84px 28px 96px',
          background: 'var(--bg-canvas)',
        }}
      >
        <div style={{ maxWidth: '1380px', margin: '0 auto' }}>
          <div style={{ marginBottom: '36px' }}>
            <div className="vg-eyebrow" style={{ marginBottom: '8px' }}>
              CHAPTER 05 · TECHNICAL SPECIFICATION MATRIX
            </div>
            <h2
              style={{
                fontSize: 'clamp(1.85rem, 3vw, 2.5rem)',
                fontWeight: 700,
                letterSpacing: '-0.03em',
                margin: 0,
                color: 'var(--text-primary)',
              }}
            >
              F-16C Block 50 Flight &amp; Structural Envelope
            </h2>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '20px',
            }}
          >
            {SPEC_BLOCKS.map((block) => (
              <div
                key={block.category}
                className="vg-card"
                style={{
                  padding: '24px',
                }}
              >
                <div
                  className="mono"
                  style={{
                    fontSize: '11px',
                    color: 'var(--accent-primary)',
                    fontWeight: 700,
                    marginBottom: '18px',
                    letterSpacing: '0.1em',
                  }}
                >
                  {block.category}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {block.items.map((item) => (
                    <div
                      key={item.label}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                        borderBottom: '1px solid var(--border-subtle)',
                        paddingBottom: '10px',
                      }}
                    >
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {item.label}
                      </span>
                      <span
                        className="mono"
                        style={{
                          fontSize: '14px',
                          fontWeight: 700,
                          color: 'var(--text-primary)',
                        }}
                      >
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
