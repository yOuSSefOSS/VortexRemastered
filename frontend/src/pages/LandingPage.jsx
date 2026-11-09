import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  Boxes,
  Flame,
  Eye,
  Layers,
  ChevronLeft,
  ChevronRight,
  Compass,
  Sliders,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import F16FalconAssembly, { F16_PARTS } from '../components/three/F16FalconAssembly';
import TurbofanExplorer3D from '../components/three/TurbofanExplorer3D';
import NavierStokesTunnel2D from '../components/cfd/NavierStokesTunnel2D';
import { formatNacaCode } from '../domain/nacaGeometry';
import { computeWingPlanformAero } from '../domain/flightMechanics';

const SPEC_BLOCKS = [
  {
    category: '01 // DIMENSIONS & MASS',
    items: [
      { label: 'Length', value: '15.06 m (49 ft 5 in)' },
      { label: 'Wingspan', value: '9.96 m (32 ft 8 in)' },
      { label: 'Wing Area', value: '27.87 m² (300.0 ft²)' },
      { label: 'Empty / Max Takeoff', value: '8,570 kg / 19,187 kg' },
    ],
  },
  {
    category: '02 // PROPULSION & THRUST',
    items: [
      { label: 'Powerplant', value: '1 × GE F110-GE-129 Turbofan' },
      { label: 'Dry Military Thrust', value: '76.3 kN (17,155 lbf)' },
      { label: 'Afterburning Thrust', value: '131.2 kN (29,500 lbf)' },
      { label: 'Thrust-to-Weight', value: '1.095 : 1 (Loaded)' },
    ],
  },
  {
    category: '03 // AERODYNAMIC ENVELOPE',
    items: [
      { label: 'Maximum Speed', value: 'Mach 2.05 (2,178 km/h at FL400)' },
      { label: 'Service Ceiling', value: '15,240 m (50,000+ ft)' },
      { label: 'Design Load Limit', value: '+9.0 G / −3.0 G Sustained' },
      { label: 'Roll Rate Authority', value: '324 deg/s Full Deflection' },
    ],
  },
  {
    category: '04 // AVIONICS & CONTROL LAW',
    items: [
      { label: 'Flight Control System', value: 'Quad-Redundant Digital Fly-By-Wire' },
      { label: 'Static Margin (Subsonic)', value: '−2.0% MAC (Relaxed Stability)' },
      { label: 'Fire-Control Radar', value: 'AN/APG-68(V)9 Pulse-Doppler' },
      { label: 'Root Airfoil Section', value: 'NACA 64A204 (4% Thickness)' },
    ],
  },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { activeAirfoil, setActiveAirfoil, flightConditions, setFlightConditions } =
    useApp();

  // Chapter I: F-16 3D Interactive Disassembly & Scroll-Choreographed State
  const [explodeFactor, setExplodeFactor] = useState(0.0);
  const [manualOverride, setManualOverride] = useState(false);
  const [flightMode, setFlightMode] = useState(false);
  const [wireframeMode, setWireframeMode] = useState(false);
  const [showLabels, setShowLabels] = useState(true);
  const [cameraView, setCameraView] = useState('overview');
  const [selectedPartId, setSelectedPartId] = useState('radome');

  // Scroll-linked disassembly across the first 1200px of scroll unless manually overridden or in flight mode
  useEffect(() => {
    const handleScroll = () => {
      if (manualOverride || flightMode) return;
      const y = window.scrollY;
      // Smoothly map scroll 80px..950px -> explodeFactor 0..1
      const progress = Math.max(0, Math.min(1, (y - 80) / 850));
      setExplodeFactor(Number(progress.toFixed(3)));

      // Automatically step highlighted part as user scrolls through the explosion
      if (y > 120 && y < 1050) {
        const idx = Math.min(
          F16_PARTS.length - 1,
          Math.floor(progress * F16_PARTS.length)
        );
        if (F16_PARTS[idx]) {
          setSelectedPartId(F16_PARTS[idx].id);
        }
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [manualOverride, flightMode]);

  const activePartIndex = useMemo(() => {
    const idx = F16_PARTS.findIndex((p) => p.id === selectedPartId);
    return idx === -1 ? 0 : idx;
  }, [selectedPartId]);

  const activePart = F16_PARTS[activePartIndex] || F16_PARTS[0];

  const stepPart = (delta) => {
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
        backgroundColor: '#07090E',
        color: '#F8FAFC',
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
          borderBottom: '1px solid rgba(148, 163, 184, 0.16)',
        }}
      >
        <div
          style={{
            position: 'sticky',
            top: '56px',
            width: '100%',
            height: 'calc(100vh - 56px)',
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
            <div style={{ maxWidth: '480px', pointerEvents: 'auto' }}>
              <div
                className="mono"
                style={{
                  fontSize: '11px',
                  letterSpacing: '0.18em',
                  color: '#00E5FF',
                  marginBottom: '6px',
                }}
              >
                AERO / ARCHIVE · INTERACTIVE 3D DISASSEMBLY
              </div>
              <h1
                style={{
                  fontSize: 'clamp(1.75rem, 3vw, 2.65rem)',
                  fontWeight: 700,
                  letterSpacing: '-0.03em',
                  lineHeight: 1.08,
                  margin: '0 0 8px 0',
                  color: '#F8FAFC',
                }}
              >
                General Dynamics F-16 Fighting Falcon
              </h1>
              <p
                style={{
                  fontSize: '13px',
                  color: '#94A3B8',
                  margin: 0,
                  lineHeight: 1.55,
                }}
              >
                Scroll down to explode all 12 structural sub-assemblies in 3D space, click any leader-line pin to inspect its engineering formulation, or ignite full afterburner flight mode.
              </p>
            </div>

            {/* Right Action Pill Bar (Matches Video 1 Top-Right Bar) */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                flexWrap: 'wrap',
                pointerEvents: 'auto',
                background: 'rgba(8, 12, 20, 0.84)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(148, 163, 184, 0.25)',
                borderRadius: '6px',
                padding: '6px 8px',
              }}
            >
              <button
                type="button"
                onClick={() => scrollToSection('sec-components')}
                className="btn btn-ghost btn-sm"
                style={{ fontSize: '11px' }}
              >
                Components (12)
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('sec-turbofan')}
                className="btn btn-ghost btn-sm"
                style={{ fontSize: '11px' }}
              >
                Turbofan Cutaway
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('sec-cfd-tunnel')}
                className="btn btn-ghost btn-sm"
                style={{ fontSize: '11px' }}
              >
                2D CFD Tunnel
              </button>

              <div
                style={{
                  width: '1px',
                  height: '18px',
                  background: 'rgba(148, 163, 184, 0.25)',
                }}
              />

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
                className="btn btn-sm"
                style={{
                  background: flightMode ? '#F97316' : 'rgba(249, 115, 22, 0.15)',
                  border: '1px solid #F97316',
                  color: flightMode ? '#06080E' : '#FB923C',
                  fontWeight: 700,
                }}
              >
                <Flame size={13} />
                {flightMode ? 'Exit Flight' : 'Launch Flight'}
              </button>
            </div>
          </div>

          {/* Right-Side Floating Component Inspector Card (Video 1 Style) */}
          <div
            style={{
              position: 'absolute',
              right: '24px',
              top: '104px',
              width: '340px',
              zIndex: 20,
              background: 'rgba(9, 13, 22, 0.88)',
              backdropFilter: 'blur(14px)',
              border: '1px solid rgba(148, 163, 184, 0.26)',
              borderRadius: '6px',
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
              }}
            >
              <span
                className="mono"
                style={{
                  fontSize: '10px',
                  letterSpacing: '0.12em',
                  color: '#00E5FF',
                  fontWeight: 700,
                }}
              >
                PART {activePart.index} / 12 · {activePart.category.toUpperCase()}
              </span>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  type="button"
                  onClick={() => stepPart(-1)}
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '3px 6px' }}
                  title="Previous component"
                >
                  <ChevronLeft size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => stepPart(1)}
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '3px 6px' }}
                  title="Next component"
                >
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>

            <h2
              style={{
                fontSize: '1.05rem',
                fontWeight: 700,
                margin: 0,
                color: '#F8FAFC',
              }}
            >
              {activePart.name}
            </h2>

            <p
              style={{
                fontSize: '12.5px',
                color: '#CBD5E1',
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
                background: 'rgba(5, 8, 14, 0.85)',
                border: '1px solid rgba(0, 229, 255, 0.25)',
                borderRadius: '4px',
                color: '#00E5FF',
              }}
            >
              {activePart.formula}
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '5px',
                borderTop: '1px solid rgba(148, 163, 184, 0.16)',
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
                  <span style={{ color: '#94A3B8' }}>{sp.label}</span>
                  <span className="mono" style={{ color: '#F8FAFC', fontWeight: 600 }}>
                    {sp.value}
                  </span>
                </div>
              ))}
            </div>
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
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(8, 12, 20, 0.88)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(148, 163, 184, 0.25)',
                borderRadius: '6px',
                padding: '6px',
                pointerEvents: 'auto',
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
                  onClick={() => setCameraView(cam.id)}
                  className={`btn btn-sm ${
                    cameraView === cam.id ? 'btn-primary' : 'btn-secondary'
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
                  background: 'rgba(148, 163, 184, 0.25)',
                }}
              />

              <button
                type="button"
                onClick={() => setShowLabels((v) => !v)}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '11px' }}
              >
                <Eye size={13} />
                {showLabels ? 'Hide labels' : 'Show labels'}
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
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                background: 'rgba(8, 12, 20, 0.88)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(148, 163, 184, 0.25)',
                borderRadius: '6px',
                padding: '8px 14px',
                pointerEvents: 'auto',
                minWidth: '280px',
              }}
            >
              <span className="mono" style={{ fontSize: '10px', color: '#94A3B8' }}>
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
                style={{ fontSize: '11px', color: '#00E5FF', minWidth: '36px' }}
              >
                {Math.round(explodeFactor * 100)}%
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================
          CHAPTER 02 // "EVERY PART. A PURPOSE." — 12-PART ANATOMICAL INDEX
          (Exact Video 1 Scrollable Editorial Breakdown)
         =================================================================== */}
      <section
        id="sec-components"
        style={{
          padding: '88px 28px',
          borderBottom: '1px solid rgba(148, 163, 184, 0.16)',
          background: '#080B11',
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
            <div
              className="mono"
              style={{
                fontSize: '11px',
                letterSpacing: '0.16em',
                color: '#00E5FF',
                marginBottom: '10px',
              }}
            >
              CHAPTER 02 // STRUCTURAL &amp; AVIONICS ANATOMY
            </div>
            <h2
              style={{
                fontSize: 'clamp(2rem, 3.4vw, 3rem)',
                fontWeight: 700,
                letterSpacing: '-0.03em',
                lineHeight: 1.08,
                margin: '0 0 16px 0',
              }}
            >
              Every part. A purpose.
            </h2>
            <p
              style={{
                fontSize: '15px',
                color: '#94A3B8',
                lineHeight: 1.7,
                margin: '0 0 28px 0',
                maxWidth: '48ch',
              }}
            >
              The F-16 was the first production combat aircraft intentionally designed with relaxed static longitudinal stability and a quad-redundant digital fly-by-wire flight control system. Select any of the 12 primary assemblies to inspect its engineering role or focus it in the 3D hangar above.
            </p>

            {/* Selected Part Deep-Dive Card */}
            <div
              style={{
                padding: '24px',
                background: '#0C111B',
                border: '1px solid rgba(0, 229, 255, 0.3)',
                borderRadius: '6px',
              }}
            >
              <div
                className="mono"
                style={{ fontSize: '11px', color: '#00E5FF', marginBottom: '6px' }}
              >
                ACTIVE SELECTION · {activePart.code}
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 10px 0' }}>
                {activePart.name}
              </h3>
              <p
                style={{
                  fontSize: '13.5px',
                  color: '#CBD5E1',
                  lineHeight: 1.65,
                  margin: '0 0 12px 0',
                }}
              >
                {activePart.engineeringNote}
              </p>
              <div
                className="mono"
                style={{
                  fontSize: '12px',
                  color: '#38BDF8',
                  padding: '10px 12px',
                  background: '#07090E',
                  borderRadius: '4px',
                  marginBottom: '14px',
                }}
              >
                {activePart.formula}
              </div>
              <button
                type="button"
                onClick={() => {
                  setManualOverride(true);
                  setExplodeFactor(0.75);
                  scrollToSection('sec-f16-stage');
                }}
                className="btn btn-primary btn-sm"
              >
                Focus in 3D Stage ↑
              </button>
            </div>
          </div>

          {/* Right 12-Part Interactive Table */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              borderTop: '1px solid rgba(148, 163, 184, 0.2)',
            }}
          >
            {F16_PARTS.map((part) => {
              const isSelected = part.id === selectedPartId;
              return (
                <button
                  key={part.id}
                  type="button"
                  onClick={() => setSelectedPartId(part.id)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '44px 1fr auto',
                    alignItems: 'center',
                    gap: '16px',
                    padding: '16px 14px',
                    background: isSelected
                      ? 'rgba(0, 229, 255, 0.08)'
                      : 'transparent',
                    border: 'none',
                    borderBottom: '1px solid rgba(148, 163, 184, 0.16)',
                    color: '#F8FAFC',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'background 140ms ease',
                  }}
                >
                  <span
                    className="mono"
                    style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      color: isSelected ? '#00E5FF' : '#64748B',
                    }}
                  >
                    {part.index}
                  </span>
                  <div>
                    <div
                      style={{
                        fontSize: '14.5px',
                        fontWeight: 600,
                        color: isSelected ? '#00E5FF' : '#F8FAFC',
                      }}
                    >
                      {part.name}
                    </div>
                    <div
                      style={{
                        fontSize: '12px',
                        color: '#94A3B8',
                        marginTop: '2px',
                      }}
                    >
                      {part.summary}
                    </div>
                  </div>
                  <span
                    className="mono"
                    style={{
                      fontSize: '10px',
                      color: '#94A3B8',
                      padding: '3px 8px',
                      border: '1px solid rgba(148, 163, 184, 0.25)',
                      borderRadius: '3px',
                    }}
                  >
                    {part.category}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===================================================================
          CHAPTER 03 // TURBOFAN EXPLORER — SUCK · SQUEEZE · BANG · BLOW
          (Full-Bleed Interactive 3D Wing-Mounted Cutaway Jet Engine — Video 2)
         =================================================================== */}
      <section
        id="sec-turbofan"
        style={{
          padding: '84px 28px',
          borderBottom: '1px solid rgba(148, 163, 184, 0.16)',
          background: '#07090E',
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
              <div
                className="mono"
                style={{
                  fontSize: '11px',
                  letterSpacing: '0.16em',
                  color: '#00E5FF',
                  marginBottom: '8px',
                }}
              >
                CHAPTER 03 // BRAYTON THERMODYNAMIC CYCLE &amp; DUAL-SPOOL PROPULSION
              </div>
              <h2
                style={{
                  fontSize: 'clamp(1.85rem, 3vw, 2.6rem)',
                  fontWeight: 700,
                  letterSpacing: '-0.03em',
                  margin: 0,
                }}
              >
                Turbofan Explorer — Suck · Squeeze · Bang · Blow
              </h2>
            </div>
            <p
              style={{
                fontSize: '13.5px',
                color: '#94A3B8',
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
          (Real-Time 60 FPS Eulerian CFD Solver with On-Canvas Drag — Video 3)
         =================================================================== */}
      <section
        id="sec-cfd-tunnel"
        style={{
          padding: '84px 28px',
          borderBottom: '1px solid rgba(148, 163, 184, 0.16)',
          background: '#080B11',
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
              <div
                className="mono"
                style={{
                  fontSize: '11px',
                  letterSpacing: '0.16em',
                  color: '#22C55E',
                  marginBottom: '8px',
                }}
              >
                CHAPTER 04 // REAL-TIME 2D EULERIAN NAVIER-STOKES FLUID SOLVER
              </div>
              <h2
                style={{
                  fontSize: 'clamp(1.85rem, 3vw, 2.6rem)',
                  fontWeight: 700,
                  letterSpacing: '-0.03em',
                  margin: 0,
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
          background: '#07090E',
        }}
      >
        <div style={{ maxWidth: '1380px', margin: '0 auto' }}>
          <div style={{ marginBottom: '36px' }}>
            <div
              className="mono"
              style={{
                fontSize: '11px',
                letterSpacing: '0.16em',
                color: '#00E5FF',
                marginBottom: '8px',
              }}
            >
              CHAPTER 05 // TECHNICAL SPECIFICATION MATRIX
            </div>
            <h2
              style={{
                fontSize: 'clamp(1.85rem, 3vw, 2.5rem)',
                fontWeight: 700,
                letterSpacing: '-0.03em',
                margin: 0,
              }}
            >
              F-16C Block 50 Flight &amp; Structural Envelope
            </h2>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
              border: '1px solid rgba(148, 163, 184, 0.2)',
            }}
          >
            {SPEC_BLOCKS.map((block, bIdx) => (
              <div
                key={block.category}
                style={{
                  padding: '28px 24px',
                  borderRight:
                    bIdx < SPEC_BLOCKS.length - 1
                      ? '1px solid rgba(148, 163, 184, 0.16)'
                      : 'none',
                  borderBottom: '1px solid rgba(148, 163, 184, 0.16)',
                  background: '#090D16',
                }}
              >
                <div
                  className="mono"
                  style={{
                    fontSize: '11px',
                    color: '#00E5FF',
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
                        borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
                        paddingBottom: '10px',
                      }}
                    >
                      <span style={{ fontSize: '12px', color: '#94A3B8' }}>
                        {item.label}
                      </span>
                      <span
                        className="mono"
                        style={{
                          fontSize: '14px',
                          fontWeight: 700,
                          color: '#F8FAFC',
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
