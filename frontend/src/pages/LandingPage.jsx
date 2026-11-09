import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    Compass,
    Sliders,
    ArrowUpRight,
    ArrowRight,
    Cpu,
    Crosshair,
    Layers,
    Wind,
    Fan,
    Shield,
    Eye,
    Terminal,
    Activity,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import AircraftViewer3D from '../components/AircraftViewer3D';
import F16FalconAssembly, { F16_PARTS } from '../components/three/F16FalconAssembly';
import TurbofanExplorer3D from '../components/three/TurbofanExplorer3D';
import { HANGAR_SUBSYSTEMS } from '../data/hangarCurriculum';
import { computeISAAtmosphere, computeCabinPressurization } from '../domain/isaAtmosphere';
import {
    computeWingPlanformAero,
    computeLongitudinalStability,
    computeTurbofanPerformance,
} from '../domain/flightMechanics';

const MISSION_PROFILES = [
    {
        id: 'transonic_cruise',
        code: 'MSN-01',
        title: 'Transonic transport cruise',
        subtitle: 'Mach 0.78 // FL350 (10,668 m) // Sweep 25°',
        altitudeMeters: 10668,
        airspeedMs: 231,
        camber: 2,
        thickness: 12,
        aoa: 3.5,
        flapDeg: 0,
        slatDeg: 0,
        throttlePct: 82,
        station: 'aircraft',
    },
    {
        id: 'high_lift_approach',
        code: 'MSN-02',
        title: 'High-lift approach & Fowler deployment',
        subtitle: 'Mach 0.22 // 1,500 m // Flaps 30° + Slats 20°',
        altitudeMeters: 1500,
        airspeedMs: 72,
        camber: 4,
        thickness: 12,
        aoa: 7.5,
        flapDeg: 30,
        slatDeg: 20,
        throttlePct: 58,
        station: 'windtunnel',
    },
    {
        id: 'turbofan_testbed',
        code: 'MSN-03',
        title: 'High-bypass turbofan thermodynamic rig',
        subtitle: 'BPR 9.5:1 // N1 94% // Stratospheric ISA',
        altitudeMeters: 11500,
        airspeedMs: 240,
        camber: 2,
        thickness: 12,
        aoa: 4.0,
        flapDeg: 0,
        slatDeg: 0,
        throttlePct: 94,
        station: 'propulsion',
    },
];

export default function LandingPage() {
    const navigate = useNavigate();
    const {
        displayName,
        deviceFingerprint,
        tierPolicy,
        curriculumDepth,
        setCurriculumDepth,
        setActiveAirfoil,
        setFlightConditions,
    } = useApp();

    // Interactive 3D CAD state on the Landing Page (EnduroSat × ArcMarumo × Video 1/2/3)
    const [activeSubIdx, setActiveSubIdx] = useState(1); // Default 02 // Wings
    const [subject3D, setSubject3D] = useState('f16'); // 'f16' | 'engine' | 'aircraft'
    const [f16Explode, setF16Explode] = useState(0.0);
    const [f16Flight, setF16Flight] = useState(false);
    const [selectedF16Part, setSelectedF16Part] = useState('radome');
    const [wireframeMode, setWireframeMode] = useState(false);
    const [cutawayMode, setCutawayMode] = useState(true);
    const [selectedMissionId, setSelectedMissionId] = useState('transonic_cruise');

    const activeSubsystem = HANGAR_SUBSYSTEMS[activeSubIdx] || HANGAR_SUBSYSTEMS[0];
    const activeMission =
        MISSION_PROFILES.find((m) => m.id === selectedMissionId) || MISSION_PROFILES[0];

    // ArcMarumo Keyboard Deck Navigation ([1]-[5] subsystems, [W] Wireframe, [C] Cutaway, [E] Engine)
    useEffect(() => {
        const onKeyDown = (e) => {
            const tag = e.target?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
            if (e.key >= '1' && e.key <= '5') {
                const idx = parseInt(e.key, 10) - 1;
                setActiveSubIdx(idx);
                setSubject3D(idx === 4 ? 'engine' : 'aircraft');
            } else if (e.key === 'w' || e.key === 'W') {
                setWireframeMode((v) => !v);
            } else if (e.key === 'c' || e.key === 'C') {
                setCutawayMode((v) => !v);
            } else if (e.key === 'e' || e.key === 'E') {
                setSubject3D((s) => (s === 'aircraft' ? 'engine' : 'aircraft'));
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, []);

    // Live physics telemetry for the selected mission profile
    const isa = computeISAAtmosphere(activeMission.altitudeMeters);
    const cabin = computeCabinPressurization(activeMission.altitudeMeters);
    const wingAero = computeWingPlanformAero({
        sweepDeg: 25,
        mach: activeMission.airspeedMs / isa.speedOfSoundMs,
        altitudeMeters: activeMission.altitudeMeters,
        aoaDeg: activeMission.aoa,
        flapDeg: activeMission.flapDeg,
        slatDeg: activeMission.slatDeg,
    });
    const stability = computeLongitudinalStability({
        cgPercentMac: 25,
        tailVolumeRatio: 0.9,
        aoaDeg: activeMission.aoa,
    });
    const enginePerf = computeTurbofanPerformance({
        throttlePct: activeMission.throttlePct,
        bypassRatio: 9.0,
        mach: activeMission.airspeedMs / isa.speedOfSoundMs,
        altitudeMeters: activeMission.altitudeMeters,
    });

    const handleLaunchMission = (mission) => {
        setFlightConditions({
            altitudeMeters: mission.altitudeMeters,
            airspeedMs: mission.airspeedMs,
            chordMeters: 1.6,
        });
        setActiveAirfoil({
            camber: mission.camber,
            maxCamberLoc: 4,
            thickness: mission.thickness,
            aoa: mission.aoa,
        });
        navigate(`/lab?station=${mission.station}`);
    };

    return (
        <div
            className="vg-cad-grid"
            style={{
                backgroundColor: 'var(--bg-canvas)',
                color: 'var(--text-primary)',
                minHeight: 'calc(100vh - 56px)',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            {/* =====================================================================
                SECTION 01 // FULL-VIEWPORT 3D WEBGL MISSION DECK (ENDUROSAT × ARCMARUMO)
               ===================================================================== */}
            <section
                style={{
                    position: 'relative',
                    minHeight: 'calc(100vh - 56px)',
                    borderBottom: '1px solid var(--border-subtle)',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
                    overflow: 'hidden',
                }}
            >
                {/* Left Architectural Column: Mission Brief, Subsystem Telemetry & Command Triggers */}
                <div
                    style={{
                        position: 'relative',
                        zIndex: 10,
                        borderRight: '1px solid var(--border-subtle)',
                        background:
                            'linear-gradient(90deg, rgba(7,9,14,0.95) 0%, rgba(7,9,14,0.82) 100%)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                    }}
                >
                    {/* Top Telemetry Strip */}
                    <div
                        style={{
                            padding: '14px 24px',
                            borderBottom: '1px solid var(--border-subtle)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '12px',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.6875rem',
                            color: 'var(--text-secondary)',
                        }}
                    >
                        <span>SEC.01 // ORBITAL &amp; ATMOSPHERIC FLIGHT MECHANICS</span>
                        <span style={{ color: 'var(--accent-primary)' }}>
                            [ISA {Math.round(activeMission.altitudeMeters)}M // M{' '}
                            {(activeMission.airspeedMs / isa.speedOfSoundMs).toFixed(2)}]
                        </span>
                    </div>

                    {/* Center Hero Typography & Active 3D Module Readout */}
                    <div
                        style={{
                            padding: '36px 28px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '24px',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span className="vg-badge vg-badge-accent">
                                <Crosshair size={11} />
                                {activeSubsystem.code} // {activeSubsystem.category}
                            </span>
                            <span className="vg-badge">
                                TIER: {tierPolicy?.label || 'Guest preview'}
                            </span>
                        </div>

                        <h1
                            style={{
                                fontSize: 'clamp(2.1rem, 3.8vw, 3.35rem)',
                                fontWeight: 600,
                                lineHeight: 1.08,
                                letterSpacing: '-0.03em',
                                margin: 0,
                                color: 'var(--text-primary)',
                            }}
                        >
                            Precision 3D flight dynamics, propulsion &amp; digital CFD wind tunnel.
                        </h1>

                        <p
                            style={{
                                fontSize: '0.9375rem',
                                color: 'var(--text-secondary)',
                                lineHeight: 1.65,
                                margin: 0,
                                maxWidth: '56ch',
                            }}
                        >
                            Interact directly with the full-scale 3D aircraft CAD assembly and cutaway high-bypass turbofan on the right. Select any structural subsystem via keys{' '}
                            <kbd className="vg-kbd">1</kbd>–<kbd className="vg-kbd">5</kbd> or launch the 3-station simulation cockpit.
                        </p>

                        {/* Active Subsystem Telemetry Box (Updates live as user clicks 1-5) */}
                        <div
                            className="vg-card"
                            style={{
                                padding: '16px 20px',
                                background: 'rgba(12, 16, 23, 0.92)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '12px',
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    borderBottom: '1px solid var(--border-subtle)',
                                    paddingBottom: '8px',
                                }}
                            >
                                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 600 }}>
                                    ACTIVE RIG // {activeSubsystem.name}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => navigate(`/explore/${activeSubsystem.id}`)}
                                    className="vg-btn vg-btn-secondary vg-btn-sm"
                                >
                                    Open module drawer
                                    <ArrowUpRight size={13} />
                                </button>
                            </div>

                            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.55 }}>
                                {curriculumDepth === 'engineering'
                                    ? activeSubsystem.engineeringContent?.summary
                                    : activeSubsystem.foundationContent?.summary}
                            </p>

                            {/* Governing Formula Bar */}
                            {activeSubsystem.engineeringContent?.equations?.[0] && (
                                <div
                                    style={{
                                        padding: '8px 12px',
                                        background: 'var(--bg-canvas)',
                                        border: '1px solid var(--border-subtle)',
                                        fontFamily: 'var(--font-mono)',
                                        fontSize: '0.75rem',
                                        color: 'var(--accent-primary)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: '12px',
                                    }}
                                >
                                    <span>{activeSubsystem.engineeringContent.equations[0].formula}</span>
                                    <span style={{ color: 'var(--text-tertiary)', fontSize: '0.6875rem' }}>
                                        [EQ.01]
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Primary Tactical Command Buttons */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                            <Link to="/explore" className="vg-btn vg-btn-primary vg-btn-lg">
                                <Compass size={16} />
                                ENTER 3D HANGAR
                                <ArrowRight size={15} />
                            </Link>
                            <Link to="/lab" className="vg-btn vg-btn-secondary vg-btn-lg">
                                <Sliders size={16} />
                                LAUNCH SIMULATION COCKPIT
                            </Link>
                            <Link to="/events" className="vg-btn vg-btn-ghost vg-btn-lg">
                                JOIN COHORT [{deviceFingerprint.slice(0, 8)}]
                            </Link>
                        </div>
                    </div>

                    {/* Bottom 4-Cell Live ISA & Aerodynamic Readout Strip */}
                    <div
                        style={{
                            borderTop: '1px solid var(--border-subtle)',
                            display: 'grid',
                            gridTemplateColumns: 'repeat(4, 1fr)',
                        }}
                    >
                        {[
                            {
                                label: '3D LIFT / DRAG',
                                val: `L/D ${wingAero.ld3D.toFixed(1)}`,
                                sub: `CL ${wingAero.cl3D.toFixed(2)} // CD ${wingAero.cdTotal.toFixed(3)}`,
                            },
                            {
                                label: 'CRITICAL MACH',
                                val: `Mcr ${wingAero.mCrit.toFixed(2)}`,
                                sub: `Wave ΔCD ${wingAero.cdWave.toFixed(4)}`,
                            },
                            {
                                label: 'STATIC MARGIN',
                                val: `+${stability.staticMarginPct.toFixed(1)}% MAC`,
                                sub: `NP ${stability.neutralPointPctMac.toFixed(1)}% MAC`,
                            },
                            {
                                label: 'TURBOFAN THRUST',
                                val: `${enginePerf.netThrustKN.toFixed(1)} kN`,
                                sub: `EGT ${enginePerf.egtCelsius}°C // BPR 9:1`,
                            },
                        ].map((cell, i) => (
                            <div
                                key={i}
                                style={{
                                    padding: '14px 16px',
                                    borderRight: i < 3 ? '1px solid var(--border-subtle)' : 'none',
                                    fontFamily: 'var(--font-mono)',
                                }}
                            >
                                <div style={{ fontSize: '0.625rem', color: 'var(--text-tertiary)' }}>
                                    {cell.label}
                                </div>
                                <div
                                    className="vg-tabular"
                                    style={{
                                        fontSize: '0.9375rem',
                                        fontWeight: 600,
                                        color: 'var(--text-primary)',
                                        margin: '2px 0',
                                    }}
                                >
                                    {cell.val}
                                </div>
                                <div
                                    className="vg-tabular"
                                    style={{ fontSize: '0.625rem', color: 'var(--accent-primary)' }}
                                >
                                    {cell.sub}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Column: LIVE Interactive 3D WebGL CAD Viewport (EnduroSat Wireframe + ArcMarumo Deck) */}
                <div
                    style={{
                        position: 'relative',
                        minHeight: '580px',
                        height: '100%',
                        background: '#07090E',
                        display: 'flex',
                        flexDirection: 'column',
                    }}
                >
                    {/* Top 3D Viewport HUD Bar: CAD Render Mode Switches */}
                    <div
                        style={{
                            position: 'absolute',
                            top: '16px',
                            left: '16px',
                            right: '16px',
                            zIndex: 20,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '8px',
                            flexWrap: 'wrap',
                            pointerEvents: 'none',
                        }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '4px',
                                background: 'rgba(12, 16, 23, 0.88)',
                                border: '1px solid var(--border-subtle)',
                                pointerEvents: 'auto',
                            }}
                        >
                            <button
                                type="button"
                                onClick={() => setSubject3D('f16')}
                                className={`vg-segmented-btn ${subject3D === 'f16' ? 'active' : ''}`}
                            >
                                F-16 FALCON (12-PART)
                            </button>
                            <button
                                type="button"
                                onClick={() => setSubject3D('engine')}
                                className={`vg-segmented-btn ${subject3D === 'engine' ? 'active' : ''}`}
                            >
                                TURBOFAN CORE [E]
                            </button>
                            <button
                                type="button"
                                onClick={() => setSubject3D('aircraft')}
                                className={`vg-segmented-btn ${subject3D === 'aircraft' ? 'active' : ''}`}
                            >
                                TRANSPORT RIG
                            </button>
                        </div>

                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '4px',
                                background: 'rgba(12, 16, 23, 0.88)',
                                border: '1px solid var(--border-subtle)',
                                pointerEvents: 'auto',
                            }}
                        >
                            {subject3D === 'f16' && (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setF16Flight(false);
                                            setF16Explode((v) => (v > 0.5 ? 0.0 : 1.0));
                                        }}
                                        className={`vg-segmented-btn ${f16Explode > 0.5 ? 'active' : ''}`}
                                    >
                                        {f16Explode > 0.5 ? 'REASSEMBLE' : 'EXPLODE (12 PARTS)'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setF16Flight((v) => {
                                                const next = !v;
                                                if (next) setF16Explode(0);
                                                return next;
                                            });
                                        }}
                                        className={`vg-segmented-btn ${f16Flight ? 'active' : ''}`}
                                    >
                                        {f16Flight ? 'EXIT FLIGHT' : 'LAUNCH FLIGHT'}
                                    </button>
                                </>
                            )}
                            <button
                                type="button"
                                onClick={() => setWireframeMode((w) => !w)}
                                className={`vg-segmented-btn ${wireframeMode ? 'active' : ''}`}
                            >
                                WIREFRAME [W]
                            </button>
                        </div>
                    </div>

                    {/* Live Three.js WebGL Canvas */}
                    <div style={{ flex: 1, position: 'relative' }}>
                        {subject3D === 'f16' ? (
                            <F16FalconAssembly
                                explodeFactor={f16Explode}
                                selectedPartId={selectedF16Part}
                                onSelectPart={(partId) => {
                                    setSelectedF16Part(partId);
                                    const part = F16_PARTS.find((p) => p.id === partId);
                                    if (part?.subsystemMap) {
                                        const idx = HANGAR_SUBSYSTEMS.findIndex(
                                            (s) => s.id === part.subsystemMap
                                        );
                                        if (idx !== -1) setActiveSubIdx(idx);
                                    }
                                }}
                                flightMode={f16Flight}
                                wireframe={wireframeMode}
                                showLabels
                            />
                        ) : subject3D === 'engine' ? (
                            <div style={{ width: '100%', height: '100%', paddingTop: '54px' }}>
                                <TurbofanExplorer3D
                                    throttlePct={activeMission.throttlePct}
                                    bypassRatio={9.0}
                                    height="520px"
                                />
                            </div>
                        ) : (
                            <AircraftViewer3D
                                subject="aircraft"
                                selectedSubsystem={activeSubsystem.id}
                                onSelectSubsystem={(id) => {
                                    const idx = HANGAR_SUBSYSTEMS.findIndex((s) => s.id === id);
                                    if (idx !== -1) setActiveSubIdx(idx);
                                }}
                                wireframe={wireframeMode}
                                autoRotate
                                autoRotateSpeed={0.45}
                                rigState={{
                                    cutawayRatio: cutawayMode ? 0.5 : 0,
                                    flapDeg: activeMission.flapDeg,
                                    slatDeg: activeMission.slatDeg,
                                    aoaDeg: activeMission.aoa,
                                    throttlePct: activeMission.throttlePct,
                                    bypassRatio: 9.0,
                                }}
                                showVectors
                            />
                        )}
                    </div>

                    {/* Bottom ArcMarumo Tactile Hardware Selector Deck ([1]-[5]) */}
                    <div
                        style={{
                            position: 'absolute',
                            bottom: '16px',
                            left: '16px',
                            right: '16px',
                            zIndex: 20,
                            display: 'grid',
                            gridTemplateColumns: 'repeat(5, 1fr)',
                            gap: '6px',
                        }}
                    >
                        {HANGAR_SUBSYSTEMS.map((sub, idx) => {
                            const isSelected = idx === activeSubIdx;
                            return (
                                <button
                                    key={sub.id}
                                    type="button"
                                    onClick={() => {
                                        setActiveSubIdx(idx);
                                        setSubject3D(sub.id === 'engines' ? 'engine' : 'aircraft');
                                    }}
                                    style={{
                                        padding: '10px 10px',
                                        textAlign: 'left',
                                        background: isSelected
                                            ? 'rgba(79, 139, 255, 0.22)'
                                            : 'rgba(12, 16, 23, 0.88)',
                                        border: isSelected
                                            ? '1px solid var(--accent-primary)'
                                            : '1px solid var(--border-subtle)',
                                        color: 'var(--text-primary)',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '4px',
                                        transition: 'all 120ms ease',
                                    }}
                                >
                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            fontFamily: 'var(--font-mono)',
                                            fontSize: '0.6875rem',
                                            color: isSelected
                                                ? 'var(--accent-primary)'
                                                : 'var(--text-tertiary)',
                                        }}
                                    >
                                        <span>[{idx + 1}]</span>
                                        <span>{sub.code}</span>
                                    </div>
                                    <div
                                        style={{
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                        }}
                                    >
                                        {sub.shortLabel || sub.name}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* =====================================================================
                SECTION 02 // ENDUROSAT-STYLE MISSION PROFILE CONFIGURATOR MATRIX
               ===================================================================== */}
            <section
                style={{
                    borderBottom: '1px solid var(--border-subtle)',
                    background: 'var(--bg-surface)',
                }}
            >
                <div className="vg-container">
                    {/* Section Header Row */}
                    <div
                        style={{
                            padding: '20px 24px',
                            borderBottom: '1px solid var(--border-subtle)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '12px',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span className="vg-badge vg-badge-accent">SEC.02</span>
                            <h2
                                style={{
                                    fontFamily: 'var(--font-mono)',
                                    fontSize: '0.9375rem',
                                    fontWeight: 600,
                                    margin: 0,
                                }}
                            >
                                INTERACTIVE FLIGHT &amp; WIND-TUNNEL MISSION CONFIGURATOR
                            </h2>
                        </div>
                        <span
                            style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: '0.75rem',
                                color: 'var(--text-secondary)',
                            }}
                        >
                            SELECT AN OPERATING ENVELOPE TO PRE-LOAD THE 3D SIMULATION COCKPIT
                        </span>
                    </div>

                    {/* 3-Column Exposed Hairline Grid for Mission Profiles */}
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                        }}
                    >
                        {MISSION_PROFILES.map((m, idx) => {
                            const isSelected = m.id === selectedMissionId;
                            return (
                                <div
                                    key={m.id}
                                    onClick={() => setSelectedMissionId(m.id)}
                                    style={{
                                        padding: '28px 24px',
                                        borderRight:
                                            idx < MISSION_PROFILES.length - 1
                                                ? '1px solid var(--border-subtle)'
                                                : 'none',
                                        background: isSelected
                                            ? 'var(--accent-subtle)'
                                            : 'transparent',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'space-between',
                                        gap: '20px',
                                        transition: 'background 140ms ease',
                                    }}
                                >
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                fontFamily: 'var(--font-mono)',
                                                fontSize: '0.75rem',
                                            }}
                                        >
                                            <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>
                                                [{m.code}]
                                            </span>
                                            <span className="vg-badge">
                                                STATION // {m.station.toUpperCase()}
                                            </span>
                                        </div>

                                        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>
                                            {m.title}
                                        </h3>

                                        <div
                                            style={{
                                                fontFamily: 'var(--font-mono)',
                                                fontSize: '0.75rem',
                                                color: 'var(--text-secondary)',
                                            }}
                                        >
                                            {m.subtitle}
                                        </div>
                                    </div>

                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            paddingTop: '14px',
                                            borderTop: '1px solid var(--border-subtle)',
                                        }}
                                    >
                                        <span
                                            style={{
                                                fontFamily: 'var(--font-mono)',
                                                fontSize: '0.75rem',
                                                color: isSelected
                                                    ? 'var(--accent-primary)'
                                                    : 'var(--text-tertiary)',
                                            }}
                                        >
                                            {isSelected ? 'ACTIVE ENVELOPE' : 'CLICK TO PREVIEW IN 3D'}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleLaunchMission(m);
                                            }}
                                            className="vg-btn vg-btn-primary vg-btn-sm"
                                        >
                                            DEPLOY IN COCKPIT
                                            <ArrowRight size={13} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* =====================================================================
                SECTION 03 // ARCHITECTURAL SPEC MATRIX & LIVE HOST OVERRIDE TERMINAL
               ===================================================================== */}
            <section style={{ padding: '48px 24px 64px' }}>
                <div
                    className="vg-container"
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
                        gap: '24px',
                    }}
                >
                    {/* Left Panel: 5 Interactive Subsystems Specification Table */}
                    <div
                        className="vg-card"
                        style={{
                            padding: '24px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '16px',
                        }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                flexWrap: 'wrap',
                                gap: '12px',
                                borderBottom: '1px solid var(--border-subtle)',
                                paddingBottom: '14px',
                            }}
                        >
                            <div>
                                <span
                                    style={{
                                        fontFamily: 'var(--font-mono)',
                                        fontSize: '0.6875rem',
                                        color: 'var(--accent-primary)',
                                    }}
                                >
                                    SEC.03 // CURRICULUM &amp; CAD ARCHITECTURE
                                </span>
                                <h2 style={{ fontSize: '1.125rem', fontWeight: 600, margin: '2px 0 0 0' }}>
                                    Dual-depth aerospace engineering modules
                                </h2>
                            </div>

                            <div className="vg-segmented">
                                <button
                                    type="button"
                                    className={`vg-segmented-btn ${curriculumDepth === 'foundation' ? 'active' : ''}`}
                                    onClick={() => setCurriculumDepth('foundation')}
                                >
                                    FOUNDATION
                                </button>
                                <button
                                    type="button"
                                    className={`vg-segmented-btn ${curriculumDepth === 'engineering' ? 'active' : ''}`}
                                    onClick={() => setCurriculumDepth('engineering')}
                                >
                                    ENGINEERING
                                </button>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            {HANGAR_SUBSYSTEMS.map((sub, i) => (
                                <div
                                    key={sub.id}
                                    style={{
                                        padding: '12px 0',
                                        borderBottom:
                                            i < HANGAR_SUBSYSTEMS.length - 1
                                                ? '1px solid var(--border-subtle)'
                                                : 'none',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: '12px',
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <span
                                            style={{
                                                fontFamily: 'var(--font-mono)',
                                                fontSize: '0.75rem',
                                                color: 'var(--accent-primary)',
                                                fontWeight: 600,
                                            }}
                                        >
                                            [{sub.code}]
                                        </span>
                                        <div>
                                            <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                                                {sub.name}
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                {sub.subtitle}
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => navigate(`/explore/${sub.id}`)}
                                        className="vg-btn vg-btn-secondary vg-btn-sm"
                                    >
                                        INSPECT
                                        <ArrowUpRight size={13} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right Panel: Hardware Device Identity & Live Event Cohort Terminal */}
                    <div
                        className="vg-card"
                        style={{
                            padding: '24px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            gap: '20px',
                        }}
                    >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div
                                style={{
                                    borderBottom: '1px solid var(--border-subtle)',
                                    paddingBottom: '14px',
                                }}
                            >
                                <span
                                    style={{
                                        fontFamily: 'var(--font-mono)',
                                        fontSize: '0.6875rem',
                                        color: 'var(--accent-primary)',
                                    }}
                                >
                                    SEC.04 // TELEMETRY ACCESS &amp; HOST OVERRIDE
                                </span>
                                <h2 style={{ fontSize: '1.125rem', fontWeight: 600, margin: '2px 0 0 0' }}>
                                    Hardware-bound session &amp; live cohort codes
                                </h2>
                            </div>

                            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
                                Every guest or student session is bound to a deterministic hardware fingerprint. During university lab sessions or youth camps, the founder or instructor can elevate any device ID to full VIP access in real time from the host console.
                            </p>

                            <div
                                className="vg-card-nested"
                                style={{
                                    padding: '14px 16px',
                                    fontFamily: 'var(--font-mono)',
                                    fontSize: '0.75rem',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '8px',
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>DEVICE FINGERPRINT</span>
                                    <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>
                                        {deviceFingerprint}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>ACTIVE OPERATOR</span>
                                    <span>{displayName}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>COHORT CODES</span>
                                    <span style={{ color: 'var(--status-success)' }}>
                                        VG-YOUTH // VG-UNI26 // VG-VIP01
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <Link to="/login" className="vg-btn vg-btn-primary">
                                CONFIGURE SESSION
                            </Link>
                            <Link to="/admin" className="vg-btn vg-btn-secondary">
                                <Shield size={14} />
                                HOST CONSOLE
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer
                style={{
                    marginTop: 'auto',
                    background: 'var(--bg-surface)',
                    borderTop: '1px solid var(--border-subtle)',
                    padding: '16px 24px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.75rem',
                    color: 'var(--text-secondary)',
                }}
            >
                <div
                    className="vg-container"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '12px',
                    }}
                >
                    <span>VORTEX-GEN REMASTERED // DIGITAL WIND TUNNEL &amp; FLIGHT MECHANICS</span>
                    <div style={{ display: 'flex', gap: '16px' }}>
                        <Link to="/privacy" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
                            [PRIVACY]
                        </Link>
                        <Link to="/terms" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
                            [TERMS]
                        </Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
