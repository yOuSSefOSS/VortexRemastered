import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    Plane,
    Wind,
    Fan,
    Sliders,
    Sparkles,
    Download,
    FileText,
    Volume2,
    VolumeX,
    RotateCcw,
    Lock,
    Activity,
    Gauge,
    Layers,
    Compass,
    X,
    CheckCircle2,
    AlertTriangle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import AircraftViewer3D from '../components/AircraftViewer3D';
import F16FalconAssembly from '../components/three/F16FalconAssembly';
import TurbofanExplorer3D from '../components/three/TurbofanExplorer3D';
import NavierStokesTunnel2D from '../components/cfd/NavierStokesTunnel2D';
import SimulationView from '../components/SimulationView';
import SpotlightChart from '../components/SpotlightChart';
import ControlSlider from '../components/ControlSlider';
import Export3DModal from '../components/Export3DModal';
import {
    STANDARD_AIRFOILS,
    computeAnalyticalAero,
    generateOptimizationCandidates,
    formatNacaCode,
} from '../domain/nacaGeometry';
import {
    computeISAAtmosphere,
    computeCabinPressurization,
} from '../domain/isaAtmosphere';
import {
    computeWingPlanformAero,
    computeLongitudinalStability,
    computeAdverseYaw,
    computeTurbofanPerformance,
} from '../domain/flightMechanics';
import { analyzeAirfoil, analyzeAirfoilBatch } from '../services/apiService';

export default function CockpitLab() {
    const [searchParams, setSearchParams] = useSearchParams();
    const {
        activeAirfoil,
        setActiveAirfoil,
        compareAirfoil,
        setCompareAirfoil,
        flightConditions,
        setFlightConditions,
        canAccessCockpitStation,
        deviceFingerprint,
        displayName,
        tierPolicy,
        joinEventCohort,
    } = useApp();

    const initialStation = searchParams.get('station') || 'aircraft';
    const [station, setStation] = useState(
        ['aircraft', 'windtunnel', 'propulsion'].includes(initialStation)
            ? initialStation
            : 'aircraft'
    );

    // High-lift, planform, stability & engine rig parameters shared across cockpit stations
    const [aircraftModelMode, setAircraftModelMode] = useState('f16'); // 'f16' | 'transport'
    const [f16Explode, setF16Explode] = useState(0.0);
    const [f16Flight, setF16Flight] = useState(false);
    const [selectedF16Part, setSelectedF16Part] = useState('radome');
    const [tunnelDimension, setTunnelDimension] = useState('2d_cfd'); // '2d_cfd' | '3d_wing'

    const [flapDeg, setFlapDeg] = useState(10);
    const [slatDeg, setSlatDeg] = useState(5);
    const [sweepDeg, setSweepDeg] = useState(25);
    const [aspectRatio, setAspectRatio] = useState(8.8);
    const [aileronDeg, setAileronDeg] = useState(0);
    const [elevatorDeg, setElevatorDeg] = useState(0);
    const [rudderDeg, setRudderDeg] = useState(0);
    const [cgPercentMac, setCgPercentMac] = useState(25);
    const [tailVolumeRatio, setTailVolumeRatio] = useState(0.9);
    const [cutawayRatio, setCutawayRatio] = useState(0.25);
    const [throttlePct, setThrottlePct] = useState(78);
    const [bypassRatio, setBypassRatio] = useState(9.0);

    // NeuralFoil backend evaluation state
    const [backendAero, setBackendAero] = useState(null);
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [optMessage, setOptMessage] = useState(null);

    // Gust impulse response simulation state (Station 1)
    const [gustPitchOffset, setGustPitchOffset] = useState(0);
    const gustTimerRef = useRef(null);

    // Modals & Audio state
    const [stlModalOpen, setStlModalOpen] = useState(false);
    const [accessModalOpen, setAccessModalOpen] = useState(false);
    const [lockedStationLabel, setLockedStationLabel] = useState('');
    const [eventCodeInput, setEventCodeInput] = useState('');
    const [joinNameInput, setJoinNameInput] = useState(displayName || '');
    const [unlockFeedback, setUnlockFeedback] = useState(null);

    // Single-instance Web Audio API synthesizer for wind/stall acoustic feedback
    const [audioEnabled, setAudioEnabled] = useState(false);
    const audioCtxRef = useRef(null);
    const oscRef = useRef(null);
    const gainRef = useRef(null);

    // Sync URL query param
    const handleSelectStation = (targetStation, label) => {
        if (!canAccessCockpitStation(targetStation)) {
            setLockedStationLabel(label);
            setAccessModalOpen(true);
            return;
        }
        setStation(targetStation);
        setSearchParams({ station: targetStation });
    };

    // Shared ISA Atmosphere & Reynolds calculation
    const isa = useMemo(
        () => computeISAAtmosphere(flightConditions.altitudeMeters),
        [flightConditions.altitudeMeters]
    );
    const cabin = useMemo(
        () => computeCabinPressurization(flightConditions.altitudeMeters),
        [flightConditions.altitudeMeters]
    );

    const mach = useMemo(
        () => Math.max(0.05, Math.min(0.92, flightConditions.airspeedMs / isa.speedOfSoundMs)),
        [flightConditions.airspeedMs, isa.speedOfSoundMs]
    );

    const reynolds = useMemo(() => {
        const re =
            (isa.densityKgM3 * flightConditions.airspeedMs * flightConditions.chordMeters) /
            isa.viscosityPaS;
        return Math.max(50000, Math.min(25000000, Math.round(re)));
    }, [isa.densityKgM3, isa.viscosityPaS, flightConditions.airspeedMs, flightConditions.chordMeters]);

    // Debounced NeuralFoil evaluation with instant analytical physics fallback
    useEffect(() => {
        let cancelled = false;
        const timer = setTimeout(async () => {
            try {
                const res = await analyzeAirfoil({
                    camber: activeAirfoil.camber,
                    maxCamberLoc: activeAirfoil.maxCamberLoc,
                    thickness: activeAirfoil.thickness,
                    aoa: activeAirfoil.aoa,
                    reynolds,
                });
                if (!cancelled && res && typeof res.cl === 'number') {
                    setBackendAero(res);
                }
            } catch {
                if (!cancelled) {
                    setBackendAero(null);
                }
            }
        }, 180);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [activeAirfoil, reynolds]);

    const raw2DAero = useMemo(() => {
        const analytical = computeAnalyticalAero(
            activeAirfoil.camber,
            activeAirfoil.maxCamberLoc,
            activeAirfoil.thickness,
            activeAirfoil.aoa,
            reynolds
        );
        if (backendAero && typeof backendAero.cl === 'number') {
            return {
                ...analytical,
                cl: backendAero.cl,
                cd: backendAero.cd,
                cm: backendAero.cm ?? analytical.cm,
                source: backendAero.source || 'neuralfoil',
            };
        }
        return analytical;
    }, [activeAirfoil, reynolds, backendAero]);

    // 3D Wing Planform + High-Lift + Compressibility evaluation
    const wingAero = useMemo(
        () =>
            computeWingPlanformAero({
                cl2D: raw2DAero.cl,
                cd2D: raw2DAero.cd,
                cm2D: raw2DAero.cm,
                aoaDeg: activeAirfoil.aoa + gustPitchOffset,
                aspectRatio,
                sweepDeg,
                mach,
                thicknessRatio: activeAirfoil.thickness / 100,
                flapDeg,
                slatDeg,
            }),
        [raw2DAero, activeAirfoil, gustPitchOffset, aspectRatio, sweepDeg, mach, flapDeg, slatDeg]
    );

    // Longitudinal Stability (CG vs Neutral Point) & Lateral Adverse Yaw
    const stability = useMemo(
        () =>
            computeLongitudinalStability({
                cgPercentMac,
                tailVolumeRatio,
                aoaDeg: activeAirfoil.aoa + gustPitchOffset,
                elevatorDeg,
                clWing: wingAero.cl3D,
                cm0Airfoil: raw2DAero.cm,
            }),
        [cgPercentMac, tailVolumeRatio, activeAirfoil.aoa, gustPitchOffset, elevatorDeg, wingAero.cl3D, raw2DAero.cm]
    );

    const lateral = useMemo(
        () =>
            computeAdverseYaw({
                aileronDeg,
                rudderDeg,
                clWing: wingAero.cl3D,
            }),
        [aileronDeg, rudderDeg, wingAero.cl3D]
    );

    // Turbofan Propulsion Cycle
    const propulsion = useMemo(
        () =>
            computeTurbofanPerformance({
                throttlePct,
                bypassRatio,
                mach,
                altitudeMeters: flightConditions.altitudeMeters,
            }),
        [throttlePct, bypassRatio, mach, flightConditions.altitudeMeters]
    );

    // Single-Instance Web Audio API Controller
    useEffect(() => {
        if (!audioEnabled) {
            if (gainRef.current && audioCtxRef.current) {
                gainRef.current.gain.setTargetAtTime(0, audioCtxRef.current.currentTime, 0.05);
            }
            return;
        }

        if (!audioCtxRef.current) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) {
                const ctx = new AudioCtx();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.value = 140;
                gain.gain.value = 0.02;
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start();
                audioCtxRef.current = ctx;
                oscRef.current = osc;
                gainRef.current = gain;
            }
        }

        if (audioCtxRef.current && oscRef.current && gainRef.current) {
            if (audioCtxRef.current.state === 'suspended') {
                audioCtxRef.current.resume();
            }
            const baseFreq = wingAero.isStalled
                ? 290
                : 110 + Math.min(220, Math.abs(wingAero.cl3D) * 75);
            oscRef.current.type = wingAero.isStalled ? 'sawtooth' : 'sine';
            oscRef.current.frequency.setTargetAtTime(
                baseFreq,
                audioCtxRef.current.currentTime,
                0.08
            );
            gainRef.current.gain.setTargetAtTime(
                wingAero.isStalled ? 0.06 : 0.025,
                audioCtxRef.current.currentTime,
                0.08
            );
        }
    }, [audioEnabled, wingAero.cl3D, wingAero.isStalled]);

    useEffect(() => {
        return () => {
            if (gustTimerRef.current) clearInterval(gustTimerRef.current);
            if (audioCtxRef.current) {
                audioCtxRef.current.close().catch(() => {});
            }
        };
    }, []);

    // Inject Vertical Gust Impulse (Time-domain pitch stability verification)
    const handleTriggerGust = () => {
        if (gustTimerRef.current) clearInterval(gustTimerRef.current);
        let t = 0;
        const sm = stability.staticMarginPct;
        gustTimerRef.current = setInterval(() => {
            t += 0.06;
            if (t > 3.2) {
                clearInterval(gustTimerRef.current);
                setGustPitchOffset(0);
                return;
            }
            if (sm >= 2) {
                // Positively damped short-period oscillation returning to trim
                const damping = Math.exp(-t * (0.8 + sm * 0.06));
                const freq = 4.5 + sm * 0.25;
                setGustPitchOffset(4.5 * damping * Math.cos(freq * t));
            } else if (sm >= -1) {
                // Neutrally stable slow wander
                setGustPitchOffset(3.5 * Math.cos(2.2 * t));
            } else {
                // Aft-CG statically unstable pitch divergence (clamped at stall limit)
                const growth = Math.min(10, 1.5 * Math.exp(t * 0.85));
                setGustPitchOffset(growth);
            }
        }, 40);
    };

    // AI / Batch Airfoil Optimization for maximum L/D at current AoA & Reynolds
    const handleOptimizeAirfoil = async () => {
        setIsOptimizing(true);
        setOptMessage('Evaluating candidate NACA geometries...');
        try {
            const candidates = generateOptimizationCandidates(activeAirfoil, reynolds);
            let bestCandidate = null;
            let bestLd = -Infinity;

            try {
                const batchRes = await analyzeAirfoilBatch(candidates);
                if (batchRes?.results?.length) {
                    batchRes.results.forEach((r, idx) => {
                        const c = candidates[idx];
                        const ld = r.cd > 0.0005 ? r.cl / r.cd : 0;
                        if (ld > bestLd) {
                            bestLd = ld;
                            bestCandidate = c;
                        }
                    });
                }
            } catch {
                // Local analytical fallback if Python daemon is offline
            }

            if (!bestCandidate) {
                candidates.forEach((c) => {
                    const aero = computeAnalyticalAero(
                        c.camber,
                        c.maxCamberLoc,
                        c.thickness,
                        c.aoa,
                        reynolds
                    );
                    if (aero.ld > bestLd) {
                        bestLd = aero.ld;
                        bestCandidate = c;
                    }
                });
            }

            if (bestCandidate) {
                setCompareAirfoil({ ...activeAirfoil });
                setActiveAirfoil({
                    camber: bestCandidate.camber,
                    maxCamberLoc: bestCandidate.maxCamberLoc,
                    thickness: bestCandidate.thickness,
                    aoa: activeAirfoil.aoa,
                });
                const code = formatNacaCode(
                    bestCandidate.camber,
                    bestCandidate.maxCamberLoc,
                    bestCandidate.thickness
                );
                setOptMessage(`Autotuned to ${code} (L/D = ${bestLd.toFixed(1)} vs prior baseline)`);
            }
        } finally {
            setIsOptimizing(false);
        }
    };

    const handleUnlockSubmit = async (e) => {
        e.preventDefault();
        if (!eventCodeInput.trim()) return;
        setUnlockFeedback({ type: 'info', text: 'Verifying event cohort code...' });
        try {
            await joinEventCohort(
                joinNameInput || displayName || 'Cadet',
                eventCodeInput.trim().toUpperCase()
            );
            setUnlockFeedback({ type: 'success', text: 'Simulation station unlocked.' });
            setTimeout(() => {
                setAccessModalOpen(false);
                setUnlockFeedback(null);
            }, 500);
        } catch (err) {
            setUnlockFeedback({
                type: 'error',
                text: err?.message || 'Invalid event code.',
            });
        }
    };

    const rigStateFor3D = {
        cutawayRatio,
        altitudeMeters: flightConditions.altitudeMeters,
        flapDeg,
        slatDeg,
        aileronDeg,
        sweepDeg,
        aoaDeg: activeAirfoil.aoa + gustPitchOffset,
        camberPct: activeAirfoil.camber,
        elevatorDeg,
        rudderDeg,
        cgPercentMac,
        throttlePct,
        bypassRatio,
        mach,
    };

    return (
        <div
            style={{
                minHeight: 'calc(100vh - 56px)',
                background: 'var(--bg-canvas)',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            {/* Top Cockpit Station Bar & Unified ISA Environment Strip */}
            <div
                style={{
                    background: 'var(--bg-surface)',
                    borderBottom: '1px solid var(--border-subtle)',
                    padding: '12px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                    flexWrap: 'wrap',
                }}
            >
                {/* 3-Station Mode Switcher */}
                <div className="vg-segmented" role="tablist" aria-label="Simulation cockpit stations">
                    <button
                        type="button"
                        role="tab"
                        aria-selected={station === 'aircraft'}
                        className={`vg-segmented-btn ${station === 'aircraft' ? 'active' : ''}`}
                        onClick={() => handleSelectStation('aircraft', 'Aircraft flight & stability')}
                    >
                        <Plane size={14} style={{ marginRight: '6px', verticalAlign: '-2px' }} />
                        1. Aircraft flight & stability
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={station === 'windtunnel'}
                        className={`vg-segmented-btn ${station === 'windtunnel' ? 'active' : ''}`}
                        onClick={() => handleSelectStation('windtunnel', 'Wing & airfoil CFD wind tunnel')}
                    >
                        {!canAccessCockpitStation('windtunnel') && (
                            <Lock size={12} style={{ marginRight: '4px', verticalAlign: '-1px' }} />
                        )}
                        <Wind size={14} style={{ marginRight: '6px', verticalAlign: '-2px' }} />
                        2. Wing & airfoil CFD tunnel
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={station === 'propulsion'}
                        className={`vg-segmented-btn ${station === 'propulsion' ? 'active' : ''}`}
                        onClick={() => handleSelectStation('propulsion', '3D turbofan propulsion rig')}
                    >
                        {!canAccessCockpitStation('propulsion') && (
                            <Lock size={12} style={{ marginRight: '4px', verticalAlign: '-1px' }} />
                        )}
                        <Fan size={14} style={{ marginRight: '6px', verticalAlign: '-2px' }} />
                        3. 3D turbofan propulsion
                    </button>
                </div>

                {/* Shared ISA Flight Condition Telemetry Pill Bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <span className="vg-badge vg-tabular">
                        ISA {Math.round(flightConditions.altitudeMeters).toLocaleString()} m (
                        {isa.temperatureC.toFixed(1)} °C)
                    </span>
                    <span className="vg-badge vg-tabular">
                        Mach {mach.toFixed(2)} ({flightConditions.airspeedMs} m/s)
                    </span>
                    <span className="vg-badge vg-tabular">
                        Re {(reynolds / 1e6).toFixed(2)}M
                    </span>

                    <button
                        type="button"
                        onClick={() => setAudioEnabled((a) => !a)}
                        className="vg-btn vg-btn-secondary vg-btn-sm"
                        title="Toggle acoustic wind & stall tone"
                    >
                        {audioEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
                        {audioEnabled ? 'Audio on' : 'Audio muted'}
                    </button>

                    <button
                        type="button"
                        onClick={() => setStlModalOpen(true)}
                        className="vg-btn vg-btn-secondary vg-btn-sm"
                    >
                        <Download size={14} />
                        Export STL
                    </button>

                    <button
                        type="button"
                        onClick={async () => {
                            const { generateAerospacePdfReport } = await import(
                                '../components/PdfReportTemplate'
                            );
                            generateAerospacePdfReport({
                                shape: activeAirfoil,
                                compareShape: compareAirfoil,
                                flapDeg,
                                slatDeg,
                                sweepDeg,
                                aspectRatio,
                                altitudeMeters: flightConditions.altitudeMeters,
                                airspeedMs: flightConditions.airspeedMs,
                                chordMeters: flightConditions.chordMeters,
                                aeroMetrics: {
                                    cl: wingAero.cl3D,
                                    cd: wingAero.cdTotal,
                                    cm: wingAero.cm3D,
                                    ld: wingAero.ld3D,
                                    isStalled: wingAero.isStalled,
                                },
                                authorName: displayName || 'Engineering Cadet',
                            });
                        }}
                        className="vg-btn vg-btn-primary vg-btn-sm"
                    >
                        <FileText size={14} />
                        PDF report
                    </button>
                </div>
            </div>

            {/* Main Cockpit Workspace Grid */}
            <div
                style={{
                    flex: 1,
                    padding: '20px 24px',
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1fr) 400px',
                    gap: '20px',
                    maxWidth: '1600px',
                    width: '100%',
                    margin: '0 auto',
                }}
            >
                {/* Left Column: 3D Viewport + Telemetry / Spotlight Chart */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>
                    {/* Primary Viewport (Station 1: F-16 / Airliner · Station 2: 2D Navier-Stokes CFD / 3D Wing · Station 3: 3D Turbofan Cutaway) */}
                    {station === 'windtunnel' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    background: 'var(--bg-surface)',
                                    border: '1px solid var(--border-subtle)',
                                    borderRadius: 'var(--radius-sm)',
                                    padding: '8px 12px',
                                }}
                            >
                                <div className="mono" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                    AERODYNAMICS STUDIO · SOLVER VIEWPORT
                                </div>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                    <button
                                        type="button"
                                        onClick={() => setTunnelDimension('2d_cfd')}
                                        className={`btn btn-sm ${
                                            tunnelDimension === '2d_cfd' ? 'btn-primary' : 'btn-secondary'
                                        }`}
                                        style={{ fontSize: '11px' }}
                                    >
                                        2D Navier-Stokes Fluid Tunnel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setTunnelDimension('3d_wing')}
                                        className={`btn btn-sm ${
                                            tunnelDimension === '3d_wing' ? 'btn-primary' : 'btn-secondary'
                                        }`}
                                        style={{ fontSize: '11px' }}
                                    >
                                        3D Extruded Wing Tunnel
                                    </button>
                                </div>
                            </div>

                            {tunnelDimension === '2d_cfd' ? (
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
                                        setFlightConditions((prev) => ({
                                            ...prev,
                                            airspeedMs: newVel,
                                        }))
                                    }
                                    cl={wingAero.cl3D}
                                    cd={wingAero.cdTotal}
                                />
                            ) : (
                                <div
                                    style={{
                                        height: '420px',
                                        borderRadius: 'var(--radius-md)',
                                        overflow: 'hidden',
                                        position: 'relative',
                                        border: '1px solid var(--border-subtle)',
                                    }}
                                >
                                    <SimulationView
                                        shape={{
                                            ...activeAirfoil,
                                            aoa: activeAirfoil.aoa + gustPitchOffset,
                                        }}
                                        compareShape={compareAirfoil}
                                        flapDeg={flapDeg}
                                        slatDeg={slatDeg}
                                        sweepDeg={sweepDeg}
                                        aeroMetrics={{
                                            cl: wingAero.cl3D,
                                            cd: wingAero.cdTotal,
                                            cm: wingAero.cm3D,
                                            isStalled: wingAero.isStalled,
                                        }}
                                        airspeedMs={flightConditions.airspeedMs}
                                    />
                                </div>
                            )}
                        </div>
                    ) : station === 'propulsion' ? (
                        <TurbofanExplorer3D
                            throttlePct={throttlePct}
                            bypassRatio={bypassRatio}
                            height="540px"
                        />
                    ) : (
                        <div
                            style={{
                                height: '500px',
                                borderRadius: 'var(--radius-md)',
                                overflow: 'hidden',
                                position: 'relative',
                                border: '1px solid var(--border-subtle)',
                            }}
                        >
                            {/* Top-Left Aircraft Rig Selector (F-16 Falcon vs Transport Airliner) */}
                            <div
                                style={{
                                    position: 'absolute',
                                    top: '12px',
                                    left: '12px',
                                    zIndex: 20,
                                    display: 'flex',
                                    gap: '6px',
                                    flexWrap: 'wrap',
                                    background: 'rgba(8, 12, 20, 0.86)',
                                    backdropFilter: 'blur(10px)',
                                    border: '1px solid rgba(148, 163, 184, 0.28)',
                                    borderRadius: '4px',
                                    padding: '6px',
                                }}
                            >
                                <button
                                    type="button"
                                    onClick={() => setAircraftModelMode('f16')}
                                    className={`btn btn-sm ${
                                        aircraftModelMode === 'f16' ? 'btn-primary' : 'btn-secondary'
                                    }`}
                                    style={{ fontSize: '11px' }}
                                >
                                    F-16 Fighting Falcon (12-Part)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setAircraftModelMode('transport')}
                                    className={`btn btn-sm ${
                                        aircraftModelMode === 'transport' ? 'btn-primary' : 'btn-secondary'
                                    }`}
                                    style={{ fontSize: '11px' }}
                                >
                                    Transport Airliner Stability Rig
                                </button>
                                {aircraftModelMode === 'f16' && (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setF16Flight(false);
                                                setF16Explode((v) => (v > 0.5 ? 0.0 : 1.0));
                                            }}
                                            className="btn btn-secondary btn-sm"
                                            style={{ fontSize: '11px' }}
                                        >
                                            {f16Explode > 0.5 ? 'Reassemble' : 'Explode Parts'}
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
                                            className={`btn btn-sm ${
                                                f16Flight ? 'btn-primary' : 'btn-secondary'
                                            }`}
                                            style={{ fontSize: '11px' }}
                                        >
                                            {f16Flight ? 'Exit Flight' : 'Launch Flight'}
                                        </button>
                                    </>
                                )}
                            </div>

                            {aircraftModelMode === 'f16' ? (
                                <F16FalconAssembly
                                    explodeFactor={f16Explode}
                                    selectedPartId={selectedF16Part}
                                    onSelectPart={setSelectedF16Part}
                                    flightMode={f16Flight}
                                    showLabels
                                    controlDeflections={{
                                        aileron: aileronDeg,
                                        elevator: elevatorDeg + gustPitchOffset,
                                        rudder: rudderDeg,
                                        flaps: flapDeg,
                                    }}
                                />
                            ) : (
                                <AircraftViewer3D
                                    subject="aircraft"
                                    selectedSubsystem="wings"
                                    rigState={rigStateFor3D}
                                    showVectors
                                />
                            )}
                        </div>
                    )}

                    {/* Station-Specific Lower Telemetry / Chart Deck */}
                    {station === 'windtunnel' && (
                        <SpotlightChart
                            shape={activeAirfoil}
                            compareShape={compareAirfoil}
                            flapDeg={flapDeg}
                            slatDeg={slatDeg}
                            sweepDeg={sweepDeg}
                            aspectRatio={aspectRatio}
                            mach={mach}
                            reynolds={reynolds}
                            activeMetrics={{
                                cl: wingAero.cl3D,
                                cd: wingAero.cdTotal,
                                cm: wingAero.cm3D,
                            }}
                        />
                    )}

                    {station === 'aircraft' && (
                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(4, 1fr)',
                                gap: '12px',
                            }}
                        >
                            <div className="vg-card" style={{ padding: '16px' }}>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                    Static margin (NP - CG)
                                </div>
                                <div
                                    className="vg-tabular"
                                    style={{
                                        fontSize: '1.25rem',
                                        fontWeight: 600,
                                        color: stability.isStable
                                            ? 'var(--status-success)'
                                            : 'var(--status-danger)',
                                        margin: '4px 0',
                                    }}
                                >
                                    {stability.staticMarginPct > 0 ? '+' : ''}
                                    {stability.staticMarginPct.toFixed(1)}% MAC
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                                    NP at {stability.neutralPointPctMac.toFixed(1)}% MAC ({stability.stabilityStatus})
                                </div>
                            </div>

                            <div className="vg-card" style={{ padding: '16px' }}>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                    Pitching moment (CM,cg)
                                </div>
                                <div
                                    className="vg-tabular"
                                    style={{ fontSize: '1.25rem', fontWeight: 600, margin: '4px 0' }}
                                >
                                    {stability.cmTotal >= 0 ? '+' : ''}
                                    {stability.cmTotal.toFixed(3)}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                                    Trim pitch: {stability.pitchResponseDeg.toFixed(1)}°
                                </div>
                            </div>

                            <div className="vg-card" style={{ padding: '16px' }}>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                    Lateral turn coordination
                                </div>
                                <div
                                    className="vg-tabular"
                                    style={{
                                        fontSize: '1.25rem',
                                        fontWeight: 600,
                                        color: lateral.isCoordinated
                                            ? 'var(--status-success)'
                                            : 'var(--status-warning)',
                                        margin: '4px 0',
                                    }}
                                >
                                    {lateral.slipAngleDeg >= 0 ? '+' : ''}
                                    {lateral.slipAngleDeg.toFixed(1)}° slip
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                                    Recommended rudder: {lateral.recommendedRudderDeg.toFixed(1)}°
                                </div>
                            </div>

                            <div className="vg-card" style={{ padding: '16px' }}>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                    Cabin differential ΔP
                                </div>
                                <div
                                    className="vg-tabular"
                                    style={{
                                        fontSize: '1.25rem',
                                        fontWeight: 600,
                                        color: 'var(--accent-primary)',
                                        margin: '4px 0',
                                    }}
                                >
                                    {cabin.differentialPsi.toFixed(2)} psi
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                                    Cabin alt: {Math.round(cabin.cabinAltitudeFt).toLocaleString()} ft
                                </div>
                            </div>
                        </div>
                    )}

                    {station === 'propulsion' && (
                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(4, 1fr)',
                                gap: '12px',
                            }}
                        >
                            <div className="vg-card" style={{ padding: '16px' }}>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                    Net thrust (Fn)
                                </div>
                                <div
                                    className="vg-tabular"
                                    style={{
                                        fontSize: '1.25rem',
                                        fontWeight: 600,
                                        color: 'var(--accent-primary)',
                                        margin: '4px 0',
                                    }}
                                >
                                    {propulsion.netThrustKN.toFixed(1)} kN
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                                    Gross {propulsion.grossThrustKN.toFixed(1)} kN - Ram{' '}
                                    {propulsion.ramDragKN.toFixed(1)} kN
                                </div>
                            </div>

                            <div className="vg-card" style={{ padding: '16px' }}>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                    Specific fuel (TSFC)
                                </div>
                                <div
                                    className="vg-tabular"
                                    style={{ fontSize: '1.25rem', fontWeight: 600, margin: '4px 0' }}
                                >
                                    {propulsion.tsfcMgNs.toFixed(2)} g/(kN·s)
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                                    Fuel flow: {propulsion.fuelFlowKgS.toFixed(2)} kg/s
                                </div>
                            </div>

                            <div className="vg-card" style={{ padding: '16px' }}>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                    Exhaust gas temp (EGT)
                                </div>
                                <div
                                    className="vg-tabular"
                                    style={{
                                        fontSize: '1.25rem',
                                        fontWeight: 600,
                                        color:
                                            propulsion.egtStatus === 'critical'
                                                ? 'var(--status-danger)'
                                                : propulsion.egtStatus === 'caution'
                                                ? 'var(--status-warning)'
                                                : 'var(--status-success)',
                                        margin: '4px 0',
                                    }}
                                >
                                    {Math.round(propulsion.egtCelsius)} °C
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                                    N1 {propulsion.n1Pct.toFixed(0)}% / N2 {propulsion.n2Pct.toFixed(0)}%
                                </div>
                            </div>

                            <div className="vg-card" style={{ padding: '16px' }}>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                    Total air mass flow
                                </div>
                                <div
                                    className="vg-tabular"
                                    style={{ fontSize: '1.25rem', fontWeight: 600, margin: '4px 0' }}
                                >
                                    {propulsion.totalMassFlowKgS.toFixed(0)} kg/s
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                                    Bypass {propulsion.bypassMassFlowKgS.toFixed(0)} / Core{' '}
                                    {propulsion.coreMassFlowKgS.toFixed(0)} kg/s
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column: Station Control Rack */}
                <div
                    className="vg-card"
                    style={{
                        padding: '20px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px',
                        maxHeight: 'calc(100vh - 140px)',
                        overflowY: 'auto',
                    }}
                >
                    {/* Shared ISA Environment Controls */}
                    <div
                        className="vg-card-nested"
                        style={{
                            padding: '14px',
                            background: 'var(--bg-canvas)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                        }}
                    >
                        <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                            Shared ISA flight environment
                        </div>
                        <ControlSlider
                            label="Pressure altitude"
                            unit=" m"
                            value={flightConditions.altitudeMeters}
                            min={0}
                            max={14000}
                            step={250}
                            onChange={(val) =>
                                setFlightConditions((prev) => ({ ...prev, altitudeMeters: val }))
                            }
                        />
                        <ControlSlider
                            label="True airspeed (TAS)"
                            unit=" m/s"
                            value={flightConditions.airspeedMs}
                            min={25}
                            max={260}
                            step={5}
                            onChange={(val) =>
                                setFlightConditions((prev) => ({ ...prev, airspeedMs: val }))
                            }
                        />
                        <ControlSlider
                            label="Angle of attack (α)"
                            unit="°"
                            value={activeAirfoil.aoa}
                            min={-8}
                            max={20}
                            step={0.5}
                            onChange={(val) =>
                                setActiveAirfoil((prev) => ({ ...prev, aoa: val }))
                            }
                        />
                    </div>

                    {/* Station 1 Controls: Aircraft Flight Dynamics, Stability & Cutaway */}
                    {station === 'aircraft' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                }}
                            >
                                <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>
                                    Longitudinal stability & trim
                                </span>
                                <button
                                    type="button"
                                    onClick={handleTriggerGust}
                                    className="vg-btn vg-btn-primary vg-btn-sm"
                                >
                                    <Activity size={13} />
                                    Inject vertical gust
                                </button>
                            </div>

                            <ControlSlider
                                label="Center of gravity (x_CG)"
                                unit="% MAC"
                                value={cgPercentMac}
                                min={12}
                                max={42}
                                step={0.5}
                                description="Move aft past Neutral Point (~32% MAC) to observe pitch instability"
                                onChange={setCgPercentMac}
                            />
                            <ControlSlider
                                label="Horizontal tail volume (VH)"
                                unit=""
                                value={tailVolumeRatio}
                                min={0.4}
                                max={1.4}
                                step={0.05}
                                onChange={setTailVolumeRatio}
                            />
                            <ControlSlider
                                label="Elevator deflection (δe)"
                                unit="°"
                                value={elevatorDeg}
                                min={-20}
                                max={20}
                                step={1}
                                onChange={setElevatorDeg}
                            />

                            <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)', margin: '4px 0' }} />

                            <div style={{ fontSize: '0.8125rem', fontWeight: 600 }}>
                                Lateral-directional & high-lift actuators
                            </div>
                            <ControlSlider
                                label="Aileron roll input (δa)"
                                unit="°"
                                value={aileronDeg}
                                min={-25}
                                max={25}
                                step={1}
                                onChange={setAileronDeg}
                            />
                            <ControlSlider
                                label="Rudder yaw input (δr)"
                                unit="°"
                                value={rudderDeg}
                                min={-25}
                                max={25}
                                step={1}
                                onChange={setRudderDeg}
                            />
                            <ControlSlider
                                label="Trailing-edge Fowler flaps"
                                unit="°"
                                value={flapDeg}
                                min={0}
                                max={40}
                                step={1}
                                onChange={setFlapDeg}
                            />
                            <ControlSlider
                                label="Leading-edge slats"
                                unit="°"
                                value={slatDeg}
                                min={0}
                                max={25}
                                step={1}
                                onChange={setSlatDeg}
                            />
                            <ControlSlider
                                label="Fuselage structural cutaway"
                                unit=""
                                value={cutawayRatio}
                                min={0}
                                max={1}
                                step={0.05}
                                onChange={setCutawayRatio}
                            />
                        </div>
                    )}

                    {/* Station 2 Controls: NACA Airfoil Geometry, Planform & AI Autotune */}
                    {station === 'windtunnel' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            {/* Live 3D Aerodynamic Metric Readout */}
                            <div
                                className="vg-card-nested"
                                style={{
                                    padding: '12px',
                                    background: 'var(--bg-canvas)',
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(3, 1fr)',
                                    gap: '8px',
                                }}
                            >
                                <div>
                                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>
                                        Lift (CL,3D)
                                    </div>
                                    <div className="vg-tabular" style={{ fontSize: '1rem', fontWeight: 600 }}>
                                        {wingAero.cl3D.toFixed(3)}
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>
                                        Drag (CD,tot)
                                    </div>
                                    <div className="vg-tabular" style={{ fontSize: '1rem', fontWeight: 600 }}>
                                        {wingAero.cdTotal.toFixed(4)}
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>
                                        Efficiency (L/D)
                                    </div>
                                    <div
                                        className="vg-tabular"
                                        style={{
                                            fontSize: '1rem',
                                            fontWeight: 600,
                                            color: 'var(--accent-primary)',
                                        }}
                                    >
                                        {wingAero.ld3D.toFixed(1)}
                                    </div>
                                </div>
                            </div>

                            {/* Preset Selector & Autotune Button */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                <select
                                    aria-label="Standard NACA airfoil presets"
                                    className="vg-input"
                                    style={{ height: '32px', padding: '0 8px', fontSize: '0.75rem' }}
                                    value=""
                                    onChange={(e) => {
                                        const preset = STANDARD_AIRFOILS.find((p) => p.id === e.target.value);
                                        if (preset) {
                                            setActiveAirfoil((prev) => ({
                                                ...prev,
                                                camber: preset.camber,
                                                maxCamberLoc: preset.maxCamberLoc,
                                                thickness: preset.thickness,
                                            }));
                                        }
                                    }}
                                >
                                    <option value="" disabled>
                                        Load standard NACA preset...
                                    </option>
                                    {STANDARD_AIRFOILS.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.name} — {p.role}
                                        </option>
                                    ))}
                                </select>

                                <button
                                    type="button"
                                    disabled={isOptimizing}
                                    onClick={handleOptimizeAirfoil}
                                    className="vg-btn vg-btn-primary vg-btn-sm"
                                    style={{ flexShrink: 0 }}
                                >
                                    <Sparkles size={13} />
                                    {isOptimizing ? 'Tuning...' : 'Autotune L/D'}
                                </button>
                            </div>

                            {optMessage && (
                                <div
                                    style={{
                                        fontSize: '0.75rem',
                                        padding: '8px 10px',
                                        borderRadius: 'var(--radius-xs)',
                                        background: 'var(--accent-subtle)',
                                        color: 'var(--accent-primary)',
                                        fontWeight: 500,
                                    }}
                                >
                                    {optMessage}
                                </div>
                            )}

                            <ControlSlider
                                label="Maximum camber (m)"
                                unit="% c"
                                value={activeAirfoil.camber}
                                min={0}
                                max={9}
                                step={0.5}
                                onChange={(val) =>
                                    setActiveAirfoil((prev) => ({ ...prev, camber: val }))
                                }
                            />
                            <ControlSlider
                                label="Max camber position (p)"
                                unit="×10% c"
                                value={activeAirfoil.maxCamberLoc}
                                min={1}
                                max={8}
                                step={1}
                                onChange={(val) =>
                                    setActiveAirfoil((prev) => ({ ...prev, maxCamberLoc: val }))
                                }
                            />
                            <ControlSlider
                                label="Maximum thickness (t)"
                                unit="% c"
                                value={activeAirfoil.thickness}
                                min={6}
                                max={24}
                                step={1}
                                onChange={(val) =>
                                    setActiveAirfoil((prev) => ({ ...prev, thickness: val }))
                                }
                            />

                            <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)', margin: '2px 0' }} />

                            <div style={{ fontSize: '0.8125rem', fontWeight: 600 }}>
                                3D planform, high-lift & compressibility
                            </div>
                            <ControlSlider
                                label="Quarter-chord sweep (Λ)"
                                unit="°"
                                value={sweepDeg}
                                min={0}
                                max={45}
                                step={1}
                                description={`Critical Mach Mcr = ${wingAero.mCrit.toFixed(2)} | Wave drag = ${wingAero.cdWave.toFixed(4)}`}
                                onChange={setSweepDeg}
                            />
                            <ControlSlider
                                label="Wing aspect ratio (AR)"
                                unit=""
                                value={aspectRatio}
                                min={4}
                                max={16}
                                step={0.2}
                                onChange={setAspectRatio}
                            />
                            <ControlSlider
                                label="Trailing-edge Fowler flap"
                                unit="°"
                                value={flapDeg}
                                min={0}
                                max={40}
                                step={1}
                                onChange={setFlapDeg}
                            />
                            <ControlSlider
                                label="Leading-edge slat"
                                unit="°"
                                value={slatDeg}
                                min={0}
                                max={25}
                                step={1}
                                onChange={setSlatDeg}
                            />
                        </div>
                    )}

                    {/* Station 3 Controls: 3D Turbofan Propulsion Rig */}
                    {station === 'propulsion' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div style={{ fontSize: '0.8125rem', fontWeight: 600 }}>
                                High-bypass turbofan cycle controls
                            </div>
                            <ControlSlider
                                label="FADEC throttle lever (PLA)"
                                unit="%"
                                value={throttlePct}
                                min={0}
                                max={100}
                                step={1}
                                description="Controls fuel metering, N1/N2 spool speed, and combustor exit temperature"
                                onChange={setThrottlePct}
                            />
                            <ControlSlider
                                label="Engine bypass ratio (BPR)"
                                unit=" : 1"
                                value={bypassRatio}
                                min={1.0}
                                max={12.0}
                                step={0.5}
                                description="Ratio of cold fan duct mass flow to hot gas-generator core flow"
                                onChange={setBypassRatio}
                            />

                            <div
                                className="vg-card-nested"
                                style={{
                                    padding: '14px',
                                    background: 'var(--bg-canvas)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '8px',
                                }}
                            >
                                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                    Stage thermodynamic breakdown
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                                    <span>Overall pressure ratio (OPR)</span>
                                    <strong className="vg-tabular">{propulsion.opr}:1</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                                    <span>Fan spool speed (N1)</span>
                                    <strong className="vg-tabular">{propulsion.n1Pct.toFixed(1)}%</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                                    <span>Core spool speed (N2)</span>
                                    <strong className="vg-tabular">{propulsion.n2Pct.toFixed(1)}%</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                                    <span>Inlet momentum ram drag</span>
                                    <strong className="vg-tabular">{propulsion.ramDragKN.toFixed(1)} kN</strong>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* 3D STL CAD Export Modal */}
            <Export3DModal
                isOpen={stlModalOpen}
                onClose={() => setStlModalOpen(false)}
                shape={activeAirfoil}
            />

            {/* Station Access / Event Code Unlock Modal */}
            {accessModalOpen && (
                <div
                    role="dialog"
                    aria-modal="true"
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(15, 18, 23, 0.65)',
                        backdropFilter: 'blur(4px)',
                        zIndex: 100,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '16px',
                    }}
                >
                    <div
                        className="vg-card"
                        style={{
                            width: '100%',
                            maxWidth: '460px',
                            padding: '24px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '16px',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                            <div>
                                <span className="vg-badge vg-badge-warning" style={{ marginBottom: '6px' }}>
                                    <Lock size={12} />
                                    Cohort / VIP cockpit station
                                </span>
                                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>
                                    Unlock {lockedStationLabel}
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setAccessModalOpen(false)}
                                className="vg-btn vg-btn-ghost vg-btn-sm"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
                            Enter an event cohort code below or share your hardware device ID with the session host for an instant live upgrade.
                        </p>

                        <div
                            className="vg-card-nested"
                            style={{
                                padding: '12px',
                                background: 'var(--bg-canvas)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                            }}
                        >
                            <div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                    Your device ID
                                </div>
                                <code
                                    style={{
                                        fontFamily: 'var(--font-mono)',
                                        fontSize: '0.875rem',
                                        fontWeight: 600,
                                        color: 'var(--accent-primary)',
                                    }}
                                >
                                    {deviceFingerprint}
                                </code>
                            </div>
                            <span className="vg-badge">{tierPolicy?.label}</span>
                        </div>

                        <form onSubmit={handleUnlockSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <input
                                type="text"
                                className="vg-input"
                                placeholder="Your display name"
                                value={joinNameInput}
                                onChange={(e) => setJoinNameInput(e.target.value)}
                            />
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <input
                                    type="text"
                                    className="vg-input"
                                    placeholder="Event code (e.g. VG-UNI26)"
                                    value={eventCodeInput}
                                    onChange={(e) => setEventCodeInput(e.target.value.toUpperCase())}
                                    style={{ fontFamily: 'var(--font-mono)' }}
                                />
                                <button type="submit" className="vg-btn vg-btn-primary">
                                    Unlock
                                </button>
                            </div>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                {['VG-YOUTH', 'VG-UNI26', 'VG-VIP01'].map((code) => (
                                    <button
                                        key={code}
                                        type="button"
                                        onClick={() => setEventCodeInput(code)}
                                        className="vg-badge"
                                        style={{ cursor: 'pointer', fontFamily: 'var(--font-mono)' }}
                                    >
                                        {code}
                                    </button>
                                ))}
                            </div>
                            {unlockFeedback && (
                                <div style={{ fontSize: '0.75rem', color: 'var(--accent-primary)' }}>
                                    {unlockFeedback.text}
                                </div>
                            )}
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
