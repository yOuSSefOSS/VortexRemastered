import React, { useState, useMemo } from 'react';
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
  Plane,
  Fan,
  Wind,
  Sparkles,
  Compass,
  CheckCircle2,
  MousePointerClick,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import VortexLogo from '../components/brand/VortexLogo';
import F16FalconAssembly, { F16_PARTS } from '../components/three/F16FalconAssembly';
import TurbofanExplorer3D from '../components/three/TurbofanExplorer3D';
import NavierStokesTunnel2D from '../components/cfd/NavierStokesTunnel2D';
import { formatNacaCode } from '../domain/nacaGeometry';
import { computeWingPlanformAero } from '../domain/flightMechanics';
import { preloadRoute } from '../App';

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

const MISSION_CARDS = [
  {
    id: 'f16',
    badge: 'EXPERIENCE 01 · 3D AIRCRAFT HANGAR',
    title: 'F-16 Fighting Falcon (12-Part Disassembly)',
    kidSummary:
      'Spin a real supersonic fighter jet in 3D! Pull all 12 parts apart like LEGO blocks, light the glowing afterburner, or click any part to see what it does.',
    engSummary:
      'Inspect the 12 structural & avionics sub-assemblies of the Block 50 F-16C with free 360° orbit, exploded vector scrubbing, and relaxed static stability telemetry.',
    icon: Plane,
    accent: 'var(--accent-primary)',
    ctaLabel: 'Launch 3D Fighter Stage',
    fullRoute: '/explore?subject=f16',
    fullRouteLabel: 'Open Fullscreen Hangar',
  },
  {
    id: 'turbofan',
    badge: 'EXPERIENCE 02 · JET PROPULSION LAB',
    title: 'Turbofan Jet Engine (Suck · Squeeze · Bang · Blow)',
    kidSummary:
      'Open the jet engine doors to see inside! Watch the giant front fan suck in air, squeeze it, light the fire in the burner, and blast out the back.',
    engSummary:
      'Dual-spool high-bypass Brayton cycle cutaway featuring hinged clamshell cowlings, concentric N1/N2 shafts, 8 axial stages, and a 28-second guided camera tour.',
    icon: Fan,
    accent: 'var(--accent-gold)',
    ctaLabel: 'Launch 3D Engine Stage',
    fullRoute: '/explore?subject=engine',
    fullRouteLabel: 'Open Engine Cutaway',
  },
  {
    id: 'cfd',
    badge: 'EXPERIENCE 03 · LIVE SMOKE WIND TUNNEL',
    title: '2D Navier-Stokes Smoke & Airfoil Tunnel',
    kidSummary:
      'Grab and tilt an airplane wing inside real moving smoke streams! See how tilting the wing pushes air down to lift the airplane up—or tilts too far and stalls.',
    engSummary:
      'Real-time 60 FPS Eulerian Navier-Stokes PDE fluid solver with vorticity confinement, Schlieren density gradients, pressure fields, and multi-obstacle wake interaction.',
    icon: Wind,
    accent: '#22C55E',
    ctaLabel: 'Launch Smoke Wind Tunnel',
    fullRoute: '/lab?station=windtunnel',
    fullRouteLabel: 'Open Full CFD Lab',
  },
];

export default function LandingPage() {
  const {
    activeAirfoil,
    setActiveAirfoil,
    flightConditions,
    setFlightConditions,
    audienceTrack,
    setAudienceTrack,
  } = useApp();

  // Single Active Interactive Exhibit Stage ('f16' | 'turbofan' | 'cfd')
  // Mounting only ONE heavy WebGL/CFD canvas at a time guarantees 60 FPS and zero scroll lag!
  const [activeExhibit, setActiveExhibit] = useState('f16');

  // F-16 3D Interactive Disassembly State
  // Default selectedPartId to `null` (Free Orbit mode) so users can orbit/pan/zoom freely!
  const [explodeFactor, setExplodeFactor] = useState(0.0);
  const [flightMode, setFlightMode] = useState(false);
  const [wireframeMode, setWireframeMode] = useState(false);
  const [showLabels, setShowLabels] = useState(true);
  const [cameraView, setCameraView] = useState('overview');
  const [selectedPartId, setSelectedPartId] = useState(null);

  const isSimpleMode = audienceTrack === 'foundation';

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

  // Live aerodynamic coefficients for the 2D Navier-Stokes Wind Tunnel
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

  const launchExhibitOnStage = (exhibitId) => {
    setActiveExhibit(exhibitId);
    scrollToSection('sec-interactive-stage');
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
          HERO FIRST PAGE // OFFICIAL VORTEX-GEN BRAND CREST & 3-CARD LAUNCHER
         =================================================================== */}
      <section
        id="sec-hero"
        className="vg-cad-grid"
        style={{
          position: 'relative',
          padding: '52px 24px 64px',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--hero-gradient)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            maxWidth: '1360px',
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '40px',
          }}
        >
          {/* Top Hero Grid: Left Brand Story + Right Official Winged Crest Card */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '36px',
              alignItems: 'center',
            }}
          >
            {/* Left Column: Logo, Clear Headline, Kid/Engineer Switcher & Primary CTAs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <span className="vg-badge vg-badge-accent">
                  INTERACTIVE 3D AEROSPACE &amp; WIND TUNNEL LAB
                </span>
                <span className="vg-badge vg-badge-gold">
                  BUILT FOR EVERYONE · KIDS TO ENGINEERS
                </span>
              </div>

              <h1
                style={{
                  fontSize: 'clamp(2.2rem, 4.4vw, 3.75rem)',
                  fontWeight: 700,
                  letterSpacing: '-0.035em',
                  lineHeight: 1.06,
                  margin: 0,
                  color: 'var(--text-primary)',
                }}
              >
                See How Airplanes &amp;{' '}
                <span className="vg-text-brand">Jet Engines Actually Fly.</span>
              </h1>

              <p
                style={{
                  fontSize: '1.05rem',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.65,
                  margin: 0,
                  maxWidth: '58ch',
                }}
              >
                {isSimpleMode
                  ? 'Welcome to Vortex-Gen! Touch, spin, and pull apart a real F-16 fighter jet, peek inside a spinning jet engine, and test wings inside a live smoke wind tunnel. Every part is explained in simple, friendly words anyone can understand.'
                  : 'Welcome to Vortex-Gen — an interactive aerospace engineering platform uniting a 12-part F-16C Block 50 3D CAD disassembly, an 8-stage dual-spool turbofan cutaway, and a 60 FPS 2D Eulerian Navier-Stokes fluid solver.'}
              </p>

              {/* Simple / Kid Mode vs Engineering Mode Quick Switcher Bar */}
              <div
                className="vg-card"
                style={{
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                  background: 'var(--bg-surface)',
                  maxWidth: '560px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Sparkles size={18} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Choose Your Explanation Style
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                      {isSimpleMode
                        ? 'Simple Mode active — plain English for kids, students & curious minds'
                        : 'Engineer Mode active — full aerodynamic equations & Mach telemetry'}
                    </div>
                  </div>
                </div>

                <div className="vg-segmented">
                  <button
                    type="button"
                    onClick={() => setAudienceTrack('foundation')}
                    className={`vg-segmented-btn ${isSimpleMode ? 'active' : ''}`}
                  >
                    Simple Mode
                  </button>
                  <button
                    type="button"
                    onClick={() => setAudienceTrack('engineering')}
                    className={`vg-segmented-btn ${!isSimpleMode ? 'active' : ''}`}
                  >
                    Engineer Mode
                  </button>
                </div>
              </div>

              {/* Primary Hero Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => scrollToSection('sec-interactive-stage')}
                  className="btn btn-primary btn-lg"
                >
                  <MousePointerClick size={17} />
                  Try Interactive 3D Stage Below
                </button>

                <Link
                  to="/explore"
                  onMouseEnter={() => preloadRoute('/explore')}
                  className="btn btn-secondary btn-lg"
                >
                  <Compass size={17} />
                  Open Fullscreen 3D Hangar
                  <ArrowUpRight size={16} />
                </Link>

                <Link
                  to="/lab"
                  onMouseEnter={() => preloadRoute('/lab')}
                  className="btn btn-secondary btn-lg"
                >
                  <Sliders size={16} />
                  Wind Tunnel &amp; Cockpit Lab
                </Link>
              </div>
            </div>

            {/* Right Column: Official Winged "V" Brand Crest Showcase Card */}
            <div
              className="vg-card vg-interactive-card"
              style={{
                padding: '28px',
                background:
                  'radial-gradient(circle at 50% 25%, rgba(46, 139, 255, 0.16), transparent 70%), var(--bg-surface)',
                borderColor: 'var(--border-strong)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                gap: '18px',
              }}
            >
              {/* Crisp Scalable Vector Emblem + Official Lockup */}
              <div
                style={{
                  padding: '18px 26px',
                  borderRadius: 'var(--radius-lg)',
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px',
                  width: '100%',
                }}
              >
                <VortexLogo size={76} showWordmark showTagline variant="hero" />
                <div
                  style={{
                    fontSize: '12.5px',
                    color: 'var(--text-secondary)',
                    maxWidth: '42ch',
                    lineHeight: 1.55,
                  }}
                >
                  Interactive Flight Physics, 3D Aircraft Disassembly &amp; Real-Time Fluid Dynamics
                </div>
              </div>

              {/* 3 Easy Steps for Any Visitor */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '10px',
                  width: '100%',
                  textAlign: 'left',
                }}
              >
                {[
                  {
                    step: 'STEP 1',
                    title: 'Pick an Experience',
                    desc: 'Choose the 3D Jet, Jet Engine, or Smoke Tunnel below.',
                  },
                  {
                    step: 'STEP 2',
                    title: 'Spin & Explode',
                    desc: 'Drag to rotate 360° or click Explode to pull parts apart.',
                  },
                  {
                    step: 'STEP 3',
                    title: 'Click Any Part',
                    desc: 'Read both the Simple Explanation and Engineering Specs.',
                  },
                ].map((item) => (
                  <div
                    key={item.step}
                    className="vg-card-nested"
                    style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}
                  >
                    <span
                      className="mono"
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        color: 'var(--accent-primary)',
                        letterSpacing: '0.12em',
                      }}
                    >
                      {item.step}
                    </span>
                    <div
                      style={{
                        fontSize: '12.5px',
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                      }}
                    >
                      {item.title}
                    </div>
                    <div
                      style={{
                        fontSize: '11.5px',
                        color: 'var(--text-secondary)',
                        lineHeight: 1.45,
                      }}
                    >
                      {item.desc}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 3 Flagship Mission Launcher Cards with Hover Lift & Glow */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '20px',
            }}
          >
            {MISSION_CARDS.map((card) => {
              const Icon = card.icon;
              const isSelected = activeExhibit === card.id;
              return (
                <div
                  key={card.id}
                  onClick={() => launchExhibitOnStage(card.id)}
                  onMouseEnter={() => preloadRoute(card.fullRoute)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      launchExhibitOnStage(card.id);
                    }
                  }}
                  className="vg-launch-card"
                  style={{
                    borderColor: isSelected ? 'var(--accent-primary)' : undefined,
                    background: isSelected
                      ? 'linear-gradient(180deg, var(--accent-subtle), var(--bg-surface))'
                      : 'var(--bg-surface)',
                  }}
                >
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '14px',
                        gap: '10px',
                      }}
                    >
                      <span
                        className="mono"
                        style={{
                          fontSize: '10.5px',
                          fontWeight: 700,
                          letterSpacing: '0.12em',
                          color: card.accent,
                        }}
                      >
                        {card.badge}
                      </span>
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '10px',
                          background: 'var(--bg-subtle)',
                          border: '1px solid var(--border-subtle)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: card.accent,
                        }}
                      >
                        <Icon size={18} />
                      </div>
                    </div>

                    <h2
                      style={{
                        fontSize: '1.22rem',
                        fontWeight: 700,
                        margin: '0 0 10px 0',
                        color: 'var(--text-primary)',
                        letterSpacing: '-0.02em',
                      }}
                    >
                      {card.title}
                    </h2>

                    <p
                      style={{
                        fontSize: '13.5px',
                        color: 'var(--text-secondary)',
                        lineHeight: 1.6,
                        margin: '0 0 18px 0',
                      }}
                    >
                      {isSimpleMode ? card.kidSummary : card.engSummary}
                    </p>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px',
                      paddingTop: '14px',
                      borderTop: '1px solid var(--border-subtle)',
                      flexWrap: 'wrap',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '12.5px',
                        fontWeight: 700,
                        color: 'var(--accent-primary)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <CheckCircle2 size={14} />
                      {card.ctaLabel} ↓
                    </span>

                    <Link
                      to={card.fullRoute}
                      onClick={(e) => e.stopPropagation()}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '11.5px' }}
                    >
                      {card.fullRouteLabel}
                      <ArrowUpRight size={13} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===================================================================
          CHAPTER 01 // SINGLE-ACTIVE-CANVAS INTERACTIVE 3D & CFD STAGE
          (Only 1 heavy WebGL or CFD loop runs at a time = ZERO SCROLL LAG!)
         =================================================================== */}
      <section
        id="sec-interactive-stage"
        style={{
          padding: '48px 24px 64px',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--bg-canvas)',
        }}
      >
        <div style={{ maxWidth: '1440px', margin: '0 auto' }}>
          {/* Stage Header & 3-Experience Switcher Bar */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              flexWrap: 'wrap',
              gap: '16px',
              marginBottom: '20px',
            }}
          >
            <div>
              <div className="vg-eyebrow" style={{ marginBottom: '6px' }}>
                LIVE INTERACTIVE SIMULATOR STAGE · 60 FPS HARDWARE ACCELERATED
              </div>
              <h2
                style={{
                  fontSize: 'clamp(1.65rem, 2.8vw, 2.35rem)',
                  fontWeight: 700,
                  letterSpacing: '-0.03em',
                  margin: 0,
                  color: 'var(--text-primary)',
                }}
              >
                {activeExhibit === 'f16' && 'General Dynamics F-16C Fighting Falcon (12-Part 3D Disassembly)'}
                {activeExhibit === 'turbofan' && 'High-Bypass Turbofan Engine Cutaway (Suck · Squeeze · Bang · Blow)'}
                {activeExhibit === 'cfd' && '2D Navier-Stokes Smoke Wind Tunnel & Airfoil Lab'}
              </h2>
            </div>

            {/* Prominent 3-Tab Experience Switcher */}
            <div
              className="vg-card"
              style={{
                padding: '6px',
                display: 'flex',
                gap: '6px',
                flexWrap: 'wrap',
                background: 'var(--bg-surface)',
              }}
            >
              <button
                type="button"
                onClick={() => setActiveExhibit('f16')}
                className={`btn btn-sm ${
                  activeExhibit === 'f16' ? 'btn-primary' : 'btn-ghost'
                }`}
              >
                <Plane size={14} />
                1. 3D F-16 Jet (12 Parts)
              </button>
              <button
                type="button"
                onClick={() => setActiveExhibit('turbofan')}
                className={`btn btn-sm ${
                  activeExhibit === 'turbofan' ? 'btn-primary' : 'btn-ghost'
                }`}
              >
                <Fan size={14} />
                2. 3D Jet Engine (8 Stages)
              </button>
              <button
                type="button"
                onClick={() => setActiveExhibit('cfd')}
                className={`btn btn-sm ${
                  activeExhibit === 'cfd' ? 'btn-primary' : 'btn-ghost'
                }`}
              >
                <Wind size={14} />
                3. 2D Smoke Wind Tunnel
              </button>
            </div>
          </div>

          {/* Friendly Helper Guide Bar (So Even a Kid Knows Exactly What to Do) */}
          <div
            className="vg-card"
            style={{
              padding: '10px 16px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              background: 'var(--bg-subtle)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span className="vg-badge vg-badge-accent">HOW TO PLAY</span>
              <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>
                {activeExhibit === 'f16' &&
                  '🖱️ Drag anywhere to spin the jet 360° · Click "Explode (12 Parts)" to pull the jet apart · Click any numbered pin to inspect it · Click "Free Orbit" to unlock the camera!'}
                {activeExhibit === 'turbofan' &&
                  '🖱️ Click "Open Cowling" to swing open the engine doors · Click "Play Guided Tour" for an automatic tour of Suck, Squeeze, Bang, Blow · Click "Free Orbit" anytime!'}
                {activeExhibit === 'cfd' &&
                  '🖱️ Drag the wing inside the wind tunnel to move it · Drag the green handle in front of the wing to tilt its nose up or down · Add extra shapes with the top buttons!'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Link
                to={
                  activeExhibit === 'f16'
                    ? '/explore?subject=f16'
                    : activeExhibit === 'turbofan'
                      ? '/explore?subject=engine'
                      : '/lab?station=windtunnel'
                }
                className="btn btn-secondary btn-sm"
              >
                Open Fullscreen Mode
                <ArrowUpRight size={13} />
              </Link>
            </div>
          </div>

          {/* ===============================================================
              ACTIVE EXHIBIT 1: F-16 3D DISASSEMBLY STAGE
             =============================================================== */}
          {activeExhibit === 'f16' && (
            <div
              style={{
                position: 'relative',
                width: '100%',
                height: '680px',
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden',
                border: '1px solid var(--border-subtle)',
                boxShadow: 'var(--shadow-lg)',
              }}
            >
              <F16FalconAssembly
                explodeFactor={explodeFactor}
                selectedPartId={selectedPartId}
                onSelectPart={(id) => setSelectedPartId(id)}
                flightMode={flightMode}
                wireframe={wireframeMode}
                cameraView={cameraView}
                showLabels={showLabels}
              />

              {/* Top-Left Quick Action Bar inside 3D Viewport */}
              <div
                className="vg-glass"
                style={{
                  position: 'absolute',
                  top: '16px',
                  left: '16px',
                  zIndex: 20,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  flexWrap: 'wrap',
                  padding: '8px 10px',
                }}
              >
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
                    setFlightMode(false);
                    setExplodeFactor((prev) => (prev > 0.5 ? 0.0 : 1.0));
                  }}
                  className={`btn btn-sm ${
                    explodeFactor > 0.5 ? 'btn-primary' : 'btn-secondary'
                  }`}
                >
                  <Boxes size={13} />
                  {explodeFactor > 0.5 ? 'Reassemble Jet' : 'Explode (12 Parts)'}
                </button>

                <button
                  type="button"
                  onClick={() => {
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
                  {flightMode ? 'Exit Flight' : 'Launch Afterburner Flight'}
                </button>
              </div>

              {/* Right-Side Floating Component Inspector Card (Kid + Engineer Ready) */}
              <div
                className="vg-glass"
                style={{
                  position: 'absolute',
                  right: '16px',
                  top: '16px',
                  width: '356px',
                  maxWidth: 'calc(100% - 32px)',
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
                      : 'FREE ORBIT · CAMERA UNLOCKED'}
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
                        Free Orbit
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
                    <h3
                      style={{
                        fontSize: '1.08rem',
                        fontWeight: 700,
                        margin: 0,
                        color: 'var(--glass-text)',
                      }}
                    >
                      {activePart.name}
                    </h3>

                    {/* Simple / Kid-Friendly Explanation Callout */}
                    {activePart.kidExplanation && (
                      <div
                        style={{
                          padding: '10px 12px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'rgba(34, 197, 94, 0.12)',
                          border: '1px solid rgba(34, 197, 94, 0.35)',
                          fontSize: '12.5px',
                          lineHeight: 1.5,
                          color: 'var(--glass-text)',
                        }}
                      >
                        <div
                          className="mono"
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            color: '#4ADE80',
                            marginBottom: '3px',
                            letterSpacing: '0.08em',
                          }}
                        >
                          💡 SIMPLE EXPLANATION (HOW IT WORKS)
                        </div>
                        {activePart.kidExplanation}
                      </div>
                    )}

                    {!isSimpleMode && (
                      <>
                        <p
                          style={{
                            fontSize: '12px',
                            color: 'var(--glass-text-soft)',
                            lineHeight: 1.5,
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
                      </>
                    )}

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
                    <h3
                      style={{
                        fontSize: '1.05rem',
                        fontWeight: 700,
                        margin: 0,
                        color: 'var(--glass-text)',
                      }}
                    >
                      360° Free Orbit Mode
                    </h3>
                    <p
                      style={{
                        fontSize: '12.5px',
                        color: 'var(--glass-text-soft)',
                        lineHeight: 1.55,
                        margin: 0,
                      }}
                    >
                      Move freely! Left-drag to spin the jet, right-drag to slide, or scroll to zoom. Hover or click any part on the jet (or click the button below) to learn what each piece does.
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
                  bottom: '16px',
                  left: '16px',
                  right: '16px',
                  zIndex: 20,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px',
                  pointerEvents: 'none',
                }}
              >
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

                {/* Manual Explosion Scrubber */}
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
                    EXPLODE JET
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={explodeFactor}
                    onChange={(e) => {
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
          )}

          {/* ===============================================================
              ACTIVE EXHIBIT 2: TURBOFAN ENGINE CUTAWAY STAGE
             =============================================================== */}
          {activeExhibit === 'turbofan' && (
            <TurbofanExplorer3D throttlePct={84} bypassRatio={8.5} height="680px" />
          )}

          {/* ===============================================================
              ACTIVE EXHIBIT 3: 2D NAVIER-STOKES SMOKE WIND TUNNEL STAGE
             =============================================================== */}
          {activeExhibit === 'cfd' && (
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
          )}
        </div>
      </section>

      {/* ===================================================================
          CHAPTER 02 // "EVERY PART. A PURPOSE." — 12-PART ANATOMICAL INDEX
          (Features Both Kid-Friendly Simple Explanation & Engineering Specs)
         =================================================================== */}
      <section
        id="sec-components"
        style={{
          padding: '84px 28px',
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
          <div style={{ position: 'sticky', top: '84px' }}>
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
                margin: '0 0 24px 0',
                maxWidth: '50ch',
              }}
            >
              {isSimpleMode
                ? 'An airplane is a team of 12 amazing parts working together! Click any part on the right to read a super-clear explanation of what it does, or click "Show on 3D Jet" to zoom right to it.'
                : 'The F-16 was the first production combat aircraft intentionally designed with relaxed static longitudinal stability and a quad-redundant digital fly-by-wire flight control system. Select any of the 12 primary assemblies to inspect its engineering role.'}
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
                  fontWeight: 700,
                }}
              >
                {activePart
                  ? `ACTIVE SELECTION · PART ${inspectedPart.index} / 12 · ${inspectedPart.code}`
                  : `FEATURED SUB-ASSEMBLY · PART ${inspectedPart.index} / 12 · ${inspectedPart.code}`}
              </div>
              <h3
                style={{
                  fontSize: '1.3rem',
                  fontWeight: 700,
                  margin: '0 0 12px 0',
                  color: 'var(--text-primary)',
                }}
              >
                {inspectedPart.name}
              </h3>

              {/* Always Show Kid-Friendly Simple Explanation First */}
              {inspectedPart.kidExplanation && (
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--status-success-subtle)',
                    border: '1px solid rgba(34, 197, 94, 0.35)',
                    marginBottom: '14px',
                  }}
                >
                  <div
                    className="mono"
                    style={{
                      fontSize: '10.5px',
                      fontWeight: 700,
                      color: 'var(--status-success)',
                      marginBottom: '4px',
                      letterSpacing: '0.08em',
                    }}
                  >
                    💡 HOW IT WORKS (SIMPLE EXPLANATION)
                  </div>
                  <div
                    style={{
                      fontSize: '13.5px',
                      color: 'var(--text-primary)',
                      lineHeight: 1.6,
                    }}
                  >
                    {inspectedPart.kidExplanation}
                  </div>
                </div>
              )}

              {/* Engineering Note & Formula */}
              <div
                className="mono"
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  color: 'var(--text-secondary)',
                  letterSpacing: '0.1em',
                  marginBottom: '4px',
                }}
              >
                AEROSPACE ENGINEERING FORMULATION
              </div>
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
                  marginBottom: '16px',
                }}
              >
                {inspectedPart.formula}
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => {
                    setActiveExhibit('f16');
                    setSelectedPartId(inspectedPart.id);
                    setExplodeFactor(0.75);
                    scrollToSection('sec-interactive-stage');
                  }}
                  className="btn btn-primary btn-sm"
                >
                  Show on 3D Jet ↑
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

          {/* Right 12-Part Interactive List with Hover Lift */}
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
                  className="vg-part-row"
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
                        fontSize: '12.5px',
                        color: 'var(--text-secondary)',
                        marginTop: '3px',
                        lineHeight: 1.45,
                      }}
                    >
                      {isSimpleMode && part.kidExplanation
                        ? part.kidExplanation
                        : part.summary}
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
          CHAPTER 03 // TECHNICAL SPECIFICATIONS & FLIGHT ENVELOPE MATRIX
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
              CHAPTER 03 · TECHNICAL SPECIFICATION MATRIX
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
                className="vg-card vg-interactive-card"
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
