import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
    Plane,
    Fan,
    Lock,
    CheckCircle2,
    KeyRound,
    Sparkles,
    Eye,
    Layers,
    ArrowUpRight,
    RotateCcw,
    X,
} from 'lucide-react';
import AircraftViewer3D from '../components/AircraftViewer3D';
import SubsystemDrawer from '../components/hangar/SubsystemDrawer';
import { HANGAR_SUBSYSTEMS, getSubsystemById } from '../data/hangarCurriculum';
import { useApp } from '../context/AppContext';
import { computeTurbofanPerformance, computeLongitudinalStability } from '../domain/flightMechanics';
import { computeISAAtmosphere } from '../domain/isaAtmosphere';

const DEFAULT_RIG_STATE = {
    cutawayRatio: 0.35,
    altitudeMeters: 10668,
    flapDeg: 15,
    slatDeg: 10,
    aileronDeg: 0,
    sweepDeg: 25,
    aoaDeg: 4,
    camberPct: 2,
    elevatorDeg: 0,
    rudderDeg: 0,
    cgPercentMac: 25,
    throttlePct: 78,
    bypassRatio: 9.0,
    mach: 0.78,
};

export default function Explorer() {
    const { subsystemId: routeSubsystemId } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const {
        canAccessSubsystem,
        tierPolicy,
        deviceFingerprint,
        displayName,
        joinEventCohort,
        progress,
    } = useApp();

    const [viewSubject, setViewSubject] = useState('aircraft'); // 'aircraft' | 'engine'
    const [selectedId, setSelectedId] = useState(routeSubsystemId || 'wings');
    const [drawerOpen, setDrawerOpen] = useState(true);
    const [rigState, setRigState] = useState(DEFAULT_RIG_STATE);
    const [showVectorOverlay, setShowVectorOverlay] = useState(true);

    // Access / Event Code unlock modal state
    const [accessModalOpen, setAccessModalOpen] = useState(false);
    const [lockedTargetName, setLockedTargetName] = useState('');
    const [eventCodeInput, setEventCodeInput] = useState('');
    const [joinInputName, setJoinInputName] = useState(displayName || '');
    const [unlockStatus, setUnlockStatus] = useState(null);

    useEffect(() => {
        if (routeSubsystemId) {
            const sub = getSubsystemById(routeSubsystemId);
            if (sub) {
                if (canAccessSubsystem(sub.id)) {
                    setSelectedId(sub.id);
                    setDrawerOpen(true);
                    if (sub.id === 'engines') {
                        setViewSubject('engine');
                    }
                } else {
                    setLockedTargetName(sub.name);
                    setAccessModalOpen(true);
                }
            }
        }
    }, [routeSubsystemId, canAccessSubsystem]);

    useEffect(() => {
        const modeParam = searchParams.get('subject');
        if (modeParam === 'engine' || modeParam === 'aircraft') {
            setViewSubject(modeParam);
        }
    }, [searchParams]);

    const handleSelectSubsystem = (id) => {
        const sub = getSubsystemById(id);
        if (!sub) return;

        if (!canAccessSubsystem(id)) {
            setLockedTargetName(sub.name);
            setAccessModalOpen(true);
            return;
        }

        setSelectedId(id);
        setDrawerOpen(true);
    };

    const handleUpdateRig = (key, value) => {
        setRigState((prev) => ({
            ...prev,
            [key]: value,
        }));
    };

    const handleResetRig = () => {
        setRigState(DEFAULT_RIG_STATE);
    };

    const handleEventUnlockSubmit = async (e) => {
        e.preventDefault();
        if (!eventCodeInput.trim()) return;
        setUnlockStatus({ type: 'loading', message: 'Verifying event cohort code...' });
        try {
            await joinEventCohort(joinInputName || displayName || 'Cadet', eventCodeInput.trim().toUpperCase());
            setUnlockStatus({ type: 'success', message: 'Cohort access unlocked.' });
            setTimeout(() => {
                setAccessModalOpen(false);
                setUnlockStatus(null);
            }, 600);
        } catch (err) {
            setUnlockStatus({
                type: 'error',
                message: err?.message || 'Unable to verify event code.',
            });
        }
    };

    const activeSubsystem = getSubsystemById(selectedId) || HANGAR_SUBSYSTEMS[0];

    // Live physics telemetry for top-left HUD bar
    const isa = computeISAAtmosphere(rigState.altitudeMeters);
    const stability = computeLongitudinalStability({
        cgPercentMac: rigState.cgPercentMac,
        tailVolumeRatio: 0.9,
        aoaDeg: rigState.aoaDeg,
        elevatorDeg: rigState.elevatorDeg,
        clWing: 0.55 + rigState.aoaDeg * 0.09 + rigState.flapDeg * 0.018,
    });
    const engineTelemetry = computeTurbofanPerformance({
        throttlePct: rigState.throttlePct,
        bypassRatio: rigState.bypassRatio,
        mach: rigState.mach,
        altitudeMeters: rigState.altitudeMeters,
    });

    return (
        <div
            style={{
                position: 'relative',
                width: '100%',
                height: 'calc(100vh - 56px)',
                display: 'flex',
                overflow: 'hidden',
                background: 'var(--viewport-3d-bg)',
            }}
        >
            {/* 3D Viewport Area */}
            <div style={{ flex: 1, position: 'relative', height: '100%', minWidth: 0 }}>
                <AircraftViewer3D
                    subject={viewSubject}
                    selectedSubsystem={selectedId}
                    onSelectSubsystem={handleSelectSubsystem}
                    rigState={rigState}
                    showVectors={showVectorOverlay}
                />

                {/* Top-Left Subject Switcher & Telemetry HUD */}
                <div
                    style={{
                        position: 'absolute',
                        top: '16px',
                        left: '16px',
                        zIndex: 20,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        maxWidth: '540px',
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '6px',
                            background: 'var(--viewport-3d-panel)',
                            backdropFilter: 'blur(12px)',
                            border: '1px solid var(--viewport-3d-border)',
                            borderRadius: 'var(--radius-md)',
                        }}
                    >
                        <button
                            type="button"
                            onClick={() => setViewSubject('aircraft')}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '6px 12px',
                                borderRadius: 'var(--radius-xs)',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '0.8125rem',
                                fontWeight: 500,
                                background: viewSubject === 'aircraft' ? 'var(--accent-primary)' : 'transparent',
                                color: viewSubject === 'aircraft' ? '#FFFFFF' : '#CBD5E1',
                            }}
                        >
                            <Plane size={15} />
                            3D aircraft assembly
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                if (!canAccessSubsystem('engines')) {
                                    setLockedTargetName('High-bypass turbofan propulsion rig');
                                    setAccessModalOpen(true);
                                    return;
                                }
                                setViewSubject('engine');
                                setSelectedId('engines');
                                setDrawerOpen(true);
                            }}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '6px 12px',
                                borderRadius: 'var(--radius-xs)',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '0.8125rem',
                                fontWeight: 500,
                                background: viewSubject === 'engine' ? 'var(--accent-primary)' : 'transparent',
                                color: viewSubject === 'engine' ? '#FFFFFF' : '#CBD5E1',
                            }}
                        >
                            {!canAccessSubsystem('engines') && <Lock size={12} />}
                            <Fan size={15} />
                            3D turbofan cutaway
                        </button>

                        <div style={{ width: '1px', height: '20px', background: 'rgba(148,163,184,0.2)' }} />

                        <button
                            type="button"
                            onClick={() => setShowVectorOverlay((v) => !v)}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '6px 10px',
                                borderRadius: 'var(--radius-xs)',
                                border: '1px solid rgba(148,163,184,0.25)',
                                background: showVectorOverlay ? 'rgba(59,130,246,0.18)' : 'transparent',
                                color: '#E2E8F0',
                                fontSize: '0.75rem',
                                cursor: 'pointer',
                            }}
                        >
                            <Eye size={13} />
                            Vectors
                        </button>
                    </div>

                    {/* Compact Live Telemetry Readout */}
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(4, auto)',
                            gap: '16px',
                            padding: '10px 16px',
                            background: 'var(--viewport-3d-panel)',
                            backdropFilter: 'blur(12px)',
                            border: '1px solid var(--viewport-3d-border)',
                            borderRadius: 'var(--radius-md)',
                            color: '#F8FAFC',
                        }}
                    >
                        {viewSubject === 'aircraft' ? (
                            <>
                                <div>
                                    <div style={{ fontSize: '0.6875rem', color: '#94A3B8' }}>ISA altitude</div>
                                    <div className="vg-tabular" style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                                        {Math.round(rigState.altitudeMeters).toLocaleString()} m
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.6875rem', color: '#94A3B8' }}>Static margin</div>
                                    <div
                                        className="vg-tabular"
                                        style={{
                                            fontSize: '0.875rem',
                                            fontWeight: 600,
                                            color: stability.isStable ? '#34D399' : '#F87171',
                                        }}
                                    >
                                        {stability.staticMarginPct > 0 ? '+' : ''}
                                        {stability.staticMarginPct.toFixed(1)}% MAC
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.6875rem', color: '#94A3B8' }}>Flaps / slats</div>
                                    <div className="vg-tabular" style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                                        {rigState.flapDeg}° / {rigState.slatDeg}°
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.6875rem', color: '#94A3B8' }}>Air density ρ</div>
                                    <div className="vg-tabular" style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                                        {isa.densityKgM3.toFixed(3)} kg/m³
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                <div>
                                    <div style={{ fontSize: '0.6875rem', color: '#94A3B8' }}>Net thrust</div>
                                    <div className="vg-tabular" style={{ fontSize: '0.875rem', fontWeight: 600, color: '#60A5FA' }}>
                                        {engineTelemetry.netThrustKN.toFixed(1)} kN
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.6875rem', color: '#94A3B8' }}>Spool N1 / N2</div>
                                    <div className="vg-tabular" style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                                        {engineTelemetry.n1Pct.toFixed(0)}% / {engineTelemetry.n2Pct.toFixed(0)}%
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.6875rem', color: '#94A3B8' }}>Turbine EGT</div>
                                    <div
                                        className="vg-tabular"
                                        style={{
                                            fontSize: '0.875rem',
                                            fontWeight: 600,
                                            color: engineTelemetry.egtCelsius > 950 ? '#F87171' : '#FBBF24',
                                        }}
                                    >
                                        {Math.round(engineTelemetry.egtCelsius)} °C
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.6875rem', color: '#94A3B8' }}>Bypass ratio</div>
                                    <div className="vg-tabular" style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                                        {rigState.bypassRatio.toFixed(1)} : 1
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Bottom Subsystem Selector Bar */}
                <div
                    style={{
                        position: 'absolute',
                        bottom: '20px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        zIndex: 20,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px',
                        background: 'var(--viewport-3d-panel)',
                        backdropFilter: 'blur(12px)',
                        border: '1px solid var(--viewport-3d-border)',
                        borderRadius: 'var(--radius-lg)',
                        boxShadow: 'var(--shadow-lg)',
                        maxWidth: '95%',
                        overflowX: 'auto',
                    }}
                >
                    {HANGAR_SUBSYSTEMS.map((sub) => {
                        const unlocked = canAccessSubsystem(sub.id);
                        const isSelected = selectedId === sub.id && drawerOpen;
                        const completedQuiz = typeof progress?.quizScores?.[sub.id] === 'number';

                        return (
                            <button
                                key={sub.id}
                                type="button"
                                onClick={() => handleSelectSubsystem(sub.id)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '8px 14px',
                                    borderRadius: 'var(--radius-sm)',
                                    border: isSelected
                                        ? '1px solid #60A5FA'
                                        : '1px solid rgba(148,163,184,0.18)',
                                    background: isSelected
                                        ? 'rgba(31, 91, 216, 0.35)'
                                        : 'rgba(15, 23, 42, 0.65)',
                                    color: unlocked ? '#F8FAFC' : '#94A3B8',
                                    fontSize: '0.8125rem',
                                    fontWeight: isSelected ? 600 : 500,
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                    transition: 'all 150ms ease',
                                }}
                            >
                                <span
                                    style={{
                                        fontSize: '0.6875rem',
                                        fontFamily: 'var(--font-mono)',
                                        color: isSelected ? '#93C5FD' : '#64748B',
                                    }}
                                >
                                    {sub.code}
                                </span>
                                <span>{sub.name}</span>
                                {!unlocked && <Lock size={13} style={{ color: '#F59E0B' }} />}
                                {unlocked && completedQuiz && (
                                    <CheckCircle2 size={13} style={{ color: '#34D399' }} />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Slide-Over Subsystem Theory & Controls Drawer */}
            {drawerOpen && activeSubsystem && (
                <SubsystemDrawer
                    subsystem={activeSubsystem}
                    onClose={() => setDrawerOpen(false)}
                    rigState={rigState}
                    onUpdateRig={handleUpdateRig}
                    onResetRig={handleResetRig}
                    onOpenAccessModal={() => {
                        setLockedTargetName('University engineering formulations');
                        setAccessModalOpen(true);
                    }}
                />
            )}

            {/* Access / Event Code Unlock Modal */}
            {accessModalOpen && (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="unlock-modal-title"
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
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                            <div>
                                <span className="vg-badge vg-badge-warning" style={{ marginBottom: '8px' }}>
                                    <Lock size={12} />
                                    Restricted subsystem
                                </span>
                                <h3 id="unlock-modal-title" style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>
                                    Unlock {lockedTargetName || 'full 3D hangar'}
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
                            Guest preview includes the fuselage and wing structure modules. Enter an active workshop event code or ask the session host to upgrade your device ID in real time.
                        </p>

                        {/* Device ID box for 1-click Founder Override */}
                        <div
                            className="vg-card-nested"
                            style={{
                                padding: '12px',
                                background: 'var(--bg-canvas)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '12px',
                            }}
                        >
                            <div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                    Your hardware device ID (for live host unlock)
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

                        {/* Event Code Form */}
                        <form onSubmit={handleEventUnlockSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div>
                                <label
                                    htmlFor="explorer-guest-name"
                                    style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, marginBottom: '4px' }}
                                >
                                    Display name
                                </label>
                                <input
                                    id="explorer-guest-name"
                                    type="text"
                                    className="vg-input"
                                    placeholder="Your name"
                                    value={joinInputName}
                                    onChange={(e) => setJoinInputName(e.target.value)}
                                />
                            </div>
                            <div>
                                <label
                                    htmlFor="explorer-event-code"
                                    style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, marginBottom: '4px' }}
                                >
                                    6-character event code
                                </label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <input
                                        id="explorer-event-code"
                                        type="text"
                                        className="vg-input"
                                        placeholder="VG-UNI26"
                                        value={eventCodeInput}
                                        onChange={(e) => setEventCodeInput(e.target.value.toUpperCase())}
                                        style={{ fontFamily: 'var(--font-mono)' }}
                                    />
                                    <button type="submit" className="vg-btn vg-btn-primary">
                                        Unlock
                                    </button>
                                </div>
                            </div>

                            {/* Quick Demo Event Code Pills */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Active cohorts:</span>
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

                            {unlockStatus && (
                                <div
                                    style={{
                                        fontSize: '0.75rem',
                                        padding: '8px 10px',
                                        borderRadius: 'var(--radius-xs)',
                                        background:
                                            unlockStatus.type === 'error'
                                                ? 'var(--status-danger-subtle)'
                                                : 'var(--status-success-subtle)',
                                        color:
                                            unlockStatus.type === 'error'
                                                ? 'var(--status-danger)'
                                                : 'var(--status-success)',
                                    }}
                                >
                                    {unlockStatus.message}
                                </div>
                            )}
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
