import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  Plane,
  Fan,
  Lock,
  CheckCircle2,
  Eye,
  Layers,
  Flame,
  Boxes,
  Compass,
  BookOpen,
  X,
  Move3d,
} from 'lucide-react';
import AircraftViewer3D from '../components/AircraftViewer3D';
import F16FalconAssembly, { F16_PARTS } from '../components/three/F16FalconAssembly';
import TurbofanExplorer3D from '../components/three/TurbofanExplorer3D';
import SubsystemDrawer from '../components/hangar/SubsystemDrawer';
import { HANGAR_SUBSYSTEMS, getSubsystemById } from '../data/hangarCurriculum';
import { useApp } from '../context/AppContext';
import {
  computeLongitudinalStability,
} from '../domain/flightMechanics';
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

  const {
    canAccessSubsystem,
    tierPolicy,
    deviceFingerprint,
    displayName,
    joinEventCohort,
    progress,
  } = useApp();

  // Primary exhibit mode:
  // 'f16' (AERO / ARCHIVE F-16 12-Part Disassembly)
  // 'engine' (TURBOFAN EXPLORER Suck · Squeeze · Bang · Blow)
  // 'aircraft' (Commercial Transport Airliner 5-Subsystem Rig)
  const [viewSubject, setViewSubject] = useState('f16');

  // F-16 Disassembly Exhibit State
  // Default to `null` (Free Orbit / No Selection) so the user can move freely!
  const [selectedF16PartId, setSelectedF16PartId] = useState(null);
  const [f16ExplodeFactor, setF16ExplodeFactor] = useState(0.0);
  const [f16FlightMode, setF16FlightMode] = useState(false);
  const [f16CameraView, setF16CameraView] = useState('overview');
  const [showCalloutLabels, setShowCalloutLabels] = useState(true);

  // Subsystem Curriculum & Transport Rig State
  const [selectedId, setSelectedId] = useState(routeSubsystemId || 'wings');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [rigState, setRigState] = useState(DEFAULT_RIG_STATE);
  const [showVectorOverlay] = useState(true);
  const [wireframeMode, setWireframeMode] = useState(false);

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
          if (sub.id === 'engines') {
            setViewSubject('engine');
          } else {
            setDrawerOpen(true);
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
    if (modeParam === 'engine' || modeParam === 'aircraft' || modeParam === 'f16') {
      setViewSubject(modeParam);
    }
  }, [searchParams]);

  const activeF16Part = useMemo(
    () => (selectedF16PartId ? F16_PARTS.find((p) => p.id === selectedF16PartId) || null : null),
    [selectedF16PartId]
  );

  // Map F-16 part to closest curriculum subsystem when user opens curriculum drawer
  const handleSelectF16Part = (partId) => {
    setSelectedF16PartId(partId);
    if (!partId) return;
    const part = F16_PARTS.find((p) => p.id === partId);
    if (part?.subsystemMap && canAccessSubsystem(part.subsystemMap)) {
      setSelectedId(part.subsystemMap);
    }
  };

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
      await joinEventCohort(
        joinInputName || displayName || 'Cadet',
        eventCodeInput.trim().toUpperCase()
      );
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

  // Live physics telemetry for Transport Airliner HUD
  const isa = computeISAAtmosphere(rigState.altitudeMeters);
  const stability = computeLongitudinalStability({
    cgPercentMac: rigState.cgPercentMac,
    tailVolumeRatio: 0.9,
    aoaDeg: rigState.aoaDeg,
    elevatorDeg: rigState.elevatorDeg,
    clWing: 0.55 + rigState.aoaDeg * 0.09 + rigState.flapDeg * 0.018,
  });

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: 'calc(100vh - 60px)',
        display: 'flex',
        overflow: 'hidden',
        background: 'var(--scene-bg)',
      }}
    >
      {/* =================================================================== */}
      {/* LEFT / CENTER 3D INTERACTIVE EXHIBIT VIEWPORT                       */}
      {/* =================================================================== */}
      <div style={{ flex: 1, position: 'relative', height: '100%', minWidth: 0 }}>
        {/* Top Exhibit Mode Switcher Bar */}
        <div
          className="vg-glass"
          style={{
            position: 'absolute',
            top: '14px',
            left: '16px',
            zIndex: 25,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 8px',
          }}
        >
          <button
            type="button"
            onClick={() => setViewSubject('f16')}
            className={`btn btn-sm ${
              viewSubject === 'f16' ? 'btn-primary' : 'btn-ghost'
            }`}
            style={{ fontSize: '11.5px' }}
          >
            <Plane size={14} />
            F-16 Fighting Falcon
          </button>

          <button
            type="button"
            onClick={() => setViewSubject('engine')}
            className={`btn btn-sm ${
              viewSubject === 'engine' ? 'btn-primary' : 'btn-ghost'
            }`}
            style={{ fontSize: '11.5px' }}
          >
            <Fan size={14} />
            Turbofan Explorer (8-Stage)
          </button>

          <button
            type="button"
            onClick={() => {
              setViewSubject('aircraft');
              setDrawerOpen(true);
            }}
            className={`btn btn-sm ${
              viewSubject === 'aircraft' ? 'btn-primary' : 'btn-ghost'
            }`}
            style={{ fontSize: '11.5px' }}
          >
            <Compass size={14} />
            Transport Airliner Rig
          </button>

          <div
            style={{
              width: '1px',
              height: '20px',
              background: 'var(--glass-border)',
            }}
          />

          <button
            type="button"
            onClick={() => setDrawerOpen((d) => !d)}
            className={`btn btn-sm ${drawerOpen ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '11.5px' }}
          >
            <BookOpen size={13} />
            Curriculum &amp; Quiz
          </button>
        </div>

        {/* =============================================================== */}
        {/* VIEW 1: F-16 FIGHTING FALCON 12-PART DISASSEMBLY                */}
        {/* =============================================================== */}
        {viewSubject === 'f16' && (
          <>
            <F16FalconAssembly
              explodeFactor={f16ExplodeFactor}
              selectedPartId={selectedF16PartId}
              onSelectPart={handleSelectF16Part}
              flightMode={f16FlightMode}
              wireframe={wireframeMode}
              showLabels={showCalloutLabels}
              cameraView={f16CameraView}
              controlDeflections={{
                aileron: rigState.aileronDeg,
                elevator: rigState.elevatorDeg,
                rudder: rigState.rudderDeg,
                flaps: rigState.flapDeg,
              }}
            />

            {/* Bottom Interactive Disassembly & Flight Controls Bar */}
            <div
              style={{
                position: 'absolute',
                bottom: '20px',
                left: '16px',
                right: '16px',
                zIndex: 20,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-end',
                flexWrap: 'wrap',
                gap: '12px',
                pointerEvents: 'none',
              }}
            >
              {/* Free Orbit + Explode / Reassemble + Launch Flight + Explosion Slider */}
              <div
                className="vg-glass"
                style={{
                  padding: '12px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  pointerEvents: 'auto',
                  minWidth: '340px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setSelectedF16PartId(null)}
                    className={`btn btn-sm ${
                      selectedF16PartId === null ? 'btn-primary' : 'btn-secondary'
                    }`}
                    title="Clear part selection to orbit and move the camera freely"
                  >
                    <Move3d size={14} />
                    Free Orbit
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setF16FlightMode(false);
                      setF16ExplodeFactor((prev) => (prev > 0.5 ? 0.0 : 1.0));
                    }}
                    className={`btn btn-sm ${
                      f16ExplodeFactor > 0.5 ? 'btn-primary' : 'btn-secondary'
                    }`}
                  >
                    <Boxes size={14} />
                    {f16ExplodeFactor > 0.5 ? 'Reassemble' : 'Explode (12 Parts)'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setF16FlightMode((prev) => {
                        const next = !prev;
                        if (next) setF16ExplodeFactor(0.0);
                        return next;
                      });
                    }}
                    className={`btn btn-sm ${
                      f16FlightMode ? 'vg-btn-gold' : 'vg-btn-gold-outline'
                    }`}
                  >
                    <Flame size={14} />
                    {f16FlightMode ? 'Exit Flight Mode' : 'Launch Flight'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowCalloutLabels((v) => !v)}
                    className="btn btn-secondary btn-sm"
                  >
                    <Eye size={13} />
                    {showCalloutLabels ? 'Hide Pins' : 'Show Pins'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setWireframeMode((w) => !w)}
                    className="btn btn-secondary btn-sm"
                  >
                    <Layers size={13} />
                    Wireframe
                  </button>
                </div>

                {/* Explosion Distance Slider */}
                <div>
                  <div
                    className="mono"
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '10px',
                      color: 'var(--glass-muted)',
                      marginBottom: '4px',
                    }}
                  >
                    <span>DISASSEMBLY EXPLOSION VECTOR</span>
                    <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>
                      {Math.round(f16ExplodeFactor * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.02"
                    value={f16ExplodeFactor}
                    onChange={(e) => {
                      setF16FlightMode(false);
                      setF16ExplodeFactor(Number(e.target.value));
                    }}
                  />
                </div>
              </div>

              {/* Camera Aspect Presets (Overview / Top / Side / Front) */}
              <div
                className="vg-glass"
                style={{
                  padding: '8px',
                  display: 'flex',
                  gap: '6px',
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
                      setSelectedF16PartId(null);
                      setF16CameraView(cam.id);
                    }}
                    className={`btn btn-sm ${
                      f16CameraView === cam.id && !selectedF16PartId
                        ? 'btn-primary'
                        : 'btn-secondary'
                    }`}
                    style={{ fontSize: '11px' }}
                  >
                    {cam.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* =============================================================== */}
        {/* VIEW 2: TURBOFAN EXPLORER 3D CUTAWAY                            */}
        {/* =============================================================== */}
        {viewSubject === 'engine' && (
          <div style={{ width: '100%', height: '100%', paddingTop: '58px' }}>
            <TurbofanExplorer3D
              throttlePct={rigState.throttlePct}
              bypassRatio={rigState.bypassRatio}
              height="calc(100vh - 118px)"
            />
          </div>
        )}

        {/* =============================================================== */}
        {/* VIEW 3: COMMERCIAL TRANSPORT AIRLINER 5-SUBSYSTEM RIG           */}
        {/* =============================================================== */}
        {viewSubject === 'aircraft' && (
          <>
            <AircraftViewer3D
              subject="aircraft"
              selectedSubsystem={selectedId}
              onSelectSubsystem={handleSelectSubsystem}
              rigState={rigState}
              showVectors={showVectorOverlay}
              wireframe={wireframeMode}
            />

            {/* Compact Live Telemetry Readout */}
            <div
              className="vg-glass"
              style={{
                position: 'absolute',
                top: '68px',
                left: '16px',
                zIndex: 20,
                display: 'grid',
                gridTemplateColumns: 'repeat(4, auto)',
                gap: '18px',
                padding: '10px 18px',
              }}
            >
              <div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--glass-muted)' }}>ISA altitude</div>
                <div className="vg-tabular" style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--glass-text)' }}>
                  {Math.round(rigState.altitudeMeters).toLocaleString()} m
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--glass-muted)' }}>Static margin</div>
                <div
                  className="vg-tabular"
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: stability.isStable ? 'var(--status-success)' : 'var(--status-danger)',
                  }}
                >
                  {stability.staticMarginPct > 0 ? '+' : ''}
                  {stability.staticMarginPct.toFixed(1)}% MAC
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--glass-muted)' }}>Flaps / slats</div>
                <div className="vg-tabular" style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--glass-text)' }}>
                  {rigState.flapDeg}° / {rigState.slatDeg}°
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--glass-muted)' }}>Air density ρ</div>
                <div className="vg-tabular" style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--glass-text)' }}>
                  {isa.densityKgM3.toFixed(3)} kg/m³
                </div>
              </div>
            </div>

            {/* Bottom Subsystem Selector Bar */}
            <div
              className="vg-glass"
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
                    className={`btn btn-sm ${
                      isSelected ? 'btn-primary' : 'btn-secondary'
                    }`}
                    style={{
                      opacity: unlocked ? 1 : 0.75,
                    }}
                  >
                    <span
                      className="mono"
                      style={{
                        fontSize: '0.6875rem',
                        opacity: 0.85,
                      }}
                    >
                      {sub.code}
                    </span>
                    <span>{sub.name}</span>
                    {!unlocked && <Lock size={13} style={{ color: 'var(--accent-gold)' }} />}
                    {unlocked && completedQuiz && (
                      <CheckCircle2 size={13} style={{ color: 'var(--status-success)' }} />
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* =================================================================== */}
      {/* RIGHT-SIDE "EVERY PART. A PURPOSE." F-16 INSPECTOR                  */}
      {/* =================================================================== */}
      {viewSubject === 'f16' && !drawerOpen && (
        <aside
          style={{
            width: '390px',
            height: '100%',
            background: 'var(--bg-surface)',
            borderLeft: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            zIndex: 30,
          }}
        >
          {/* Editorial Header */}
          <div
            style={{
              padding: '20px',
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            <div className="vg-eyebrow" style={{ marginBottom: '6px' }}>
              AERO / ARCHIVE · F-16C BLOCK 50
            </div>
            <h2
              style={{
                fontSize: '1.35rem',
                fontWeight: 700,
                margin: '0 0 6px 0',
                letterSpacing: '-0.02em',
                color: 'var(--text-primary)',
              }}
            >
              Every part. A purpose.
            </h2>
            <p
              style={{
                fontSize: '0.8125rem',
                color: 'var(--text-secondary)',
                margin: 0,
                lineHeight: 1.55,
              }}
            >
              Select any callout pin in 3D space or choose an assembly below to inspect its structural, aerodynamic, and avionics architecture. Click an active part again to return to Free Orbit.
            </p>
          </div>

          {/* Active Part Specification Card OR Free Orbit Banner */}
          <div
            style={{
              padding: '20px',
              borderBottom: '1px solid var(--border-subtle)',
              background: 'var(--bg-subtle)',
            }}
          >
            {activeF16Part ? (
              <>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '8px',
                    gap: '8px',
                  }}
                >
                  <span className="badge badge-accent mono">
                    PART {activeF16Part.index} / 12 · {activeF16Part.category}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedF16PartId(null)}
                    className="btn btn-secondary btn-sm"
                    style={{ height: '24px', padding: '0 10px', fontSize: '11px' }}
                  >
                    Free Orbit (Unlock)
                  </button>
                </div>

                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 8px 0', color: 'var(--text-primary)' }}>
                  {activeF16Part.name}
                </h3>

                <p
                  style={{
                    fontSize: '0.8125rem',
                    color: 'var(--text-primary)',
                    lineHeight: 1.6,
                    margin: '0 0 10px 0',
                  }}
                >
                  {activeF16Part.summary}
                </p>

                <p
                  style={{
                    fontSize: '0.775rem',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.6,
                    margin: '0 0 12px 0',
                  }}
                >
                  {activeF16Part.engineeringNote || activeF16Part.engineering}
                </p>

                {activeF16Part.formula && (
                  <div
                    className="mono"
                    style={{
                      fontSize: '11px',
                      padding: '8px 10px',
                      background: 'var(--bg-canvas)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-xs)',
                      color: 'var(--accent-primary)',
                      marginBottom: '12px',
                    }}
                  >
                    {activeF16Part.formula}
                  </div>
                )}

                {/* Technical Specs Grid */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr',
                    gap: '6px',
                    borderTop: '1px solid var(--border-subtle)',
                    paddingTop: '12px',
                  }}
                >
                  {(activeF16Part.specs || []).map((sp) => (
                    <div
                      key={sp.label}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '12px',
                      }}
                    >
                      <span style={{ color: 'var(--text-secondary)' }}>{sp.label}</span>
                      <span className="mono" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                        {sp.value}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span className="badge badge-accent mono">FREE ORBIT ACTIVE</span>
                  <span className="mono" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    360° UNLOCKED CAMERA
                  </span>
                </div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  No Component Locked
                </h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.55 }}>
                  You can freely rotate, pan, and zoom around the F-16 without camera snap. Select any assembly below whenever you want to focus and inspect a specific part.
                </p>
              </div>
            )}
          </div>

          {/* 12-Part Interactive Component Index */}
          <div style={{ padding: '16px 20px', flex: 1 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '10px',
              }}
            >
              <span
                className="mono"
                style={{
                  fontSize: '10px',
                  letterSpacing: '0.12em',
                  color: 'var(--text-secondary)',
                  fontWeight: 600,
                }}
              >
                COMPONENT INDEX (12 SUB-ASSEMBLIES)
              </span>
              {selectedF16PartId && (
                <button
                  type="button"
                  onClick={() => setSelectedF16PartId(null)}
                  className="btn btn-ghost btn-sm"
                  style={{ height: '22px', padding: '0 8px', fontSize: '10px' }}
                >
                  Clear selection
                </button>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {F16_PARTS.map((part) => {
                const isSelected = part.id === selectedF16PartId;
                return (
                  <button
                    key={part.id}
                    type="button"
                    onClick={() => handleSelectF16Part(isSelected ? null : part.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-sm)',
                      border: `1px solid ${
                        isSelected ? 'var(--border-strong)' : 'var(--border-subtle)'
                      }`,
                      background: isSelected
                        ? 'var(--accent-subtle)'
                        : 'var(--bg-canvas)',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 140ms ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span
                        className="mono"
                        style={{
                          fontSize: '11px',
                          color: isSelected
                            ? 'var(--accent-primary)'
                            : 'var(--text-tertiary)',
                          fontWeight: 700,
                        }}
                      >
                        {part.index}
                      </span>
                      <span
                        style={{
                          fontSize: '12.5px',
                          fontWeight: isSelected ? 600 : 500,
                          color: isSelected
                            ? 'var(--accent-primary)'
                            : 'var(--text-primary)',
                        }}
                      >
                        {part.name}
                      </span>
                    </div>
                    <span
                      className="mono"
                      style={{ fontSize: '10px', color: 'var(--text-secondary)' }}
                    >
                      {part.category}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>
      )}

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
            background: 'rgba(5, 11, 26, 0.65)',
            backdropFilter: 'blur(6px)',
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
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: '12px',
              }}
            >
              <div>
                <span className="vg-badge vg-badge-warning" style={{ marginBottom: '8px' }}>
                  <Lock size={12} />
                  Restricted subsystem
                </span>
                <h3
                  id="unlock-modal-title"
                  style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}
                >
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

            <p
              style={{
                fontSize: '0.8125rem',
                color: 'var(--text-secondary)',
                margin: 0,
                lineHeight: 1.6,
              }}
            >
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
            <form
              onSubmit={handleEventUnlockSubmit}
              style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
            >
              <div>
                <label
                  htmlFor="explorer-guest-name"
                  style={{
                    display: 'block',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    marginBottom: '4px',
                  }}
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
                  style={{
                    display: 'block',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    marginBottom: '4px',
                  }}
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
                <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                  Active cohorts:
                </span>
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
