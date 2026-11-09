import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    X,
    Sliders,
    BookOpen,
    GraduationCap,
    CheckCircle2,
    AlertCircle,
    ArrowRight,
    Lock,
    Layers,
    Compass,
    Gauge,
    Award,
    RotateCcw,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import ControlSlider from '../ControlSlider';
import { computeISAAtmosphere, computeCabinPressurization } from '../../domain/isaAtmosphere';

export default function SubsystemDrawer({
    subsystem,
    onClose,
    rigState,
    onUpdateRig,
    onResetRig,
    onOpenAccessModal,
}) {
    const navigate = useNavigate();
    const {
        curriculumDepth,
        setCurriculumDepth,
        tierPolicy,
        saveModuleProgress,
        progress,
    } = useApp();

    const [activeTab, setActiveTab] = useState('curriculum'); // 'curriculum' | 'controls' | 'quiz'
    const [quizAnswers, setQuizAnswers] = useState({});
    const [quizSubmitted, setQuizSubmitted] = useState(false);

    useEffect(() => {
        setQuizAnswers({});
        setQuizSubmitted(false);
        setActiveTab('curriculum');
    }, [subsystem?.id]);

    if (!subsystem) return null;

    const canViewEngineering = tierPolicy?.allowEngineeringDepth;
    const effectiveDepth = curriculumDepth === 'engineering' && canViewEngineering ? 'engineering' : 'foundation';
    const content = effectiveDepth === 'engineering' ? subsystem.engineeringContent : subsystem.foundationContent;

    const isa = computeISAAtmosphere(rigState.altitudeMeters || 0);
    const cabin = computeCabinPressurization(rigState.altitudeMeters || 0);

    const handleQuizSelect = (qIndex, optionIndex) => {
        if (quizSubmitted) return;
        setQuizAnswers((prev) => ({ ...prev, [qIndex]: optionIndex }));
    };

    const handleQuizSubmit = () => {
        if (!subsystem.quiz || subsystem.quiz.length === 0) return;
        setQuizSubmitted(true);
        let correctCount = 0;
        subsystem.quiz.forEach((q, idx) => {
            if (quizAnswers[idx] === q.correctIndex) correctCount += 1;
        });
        const scorePct = Math.round((correctCount / subsystem.quiz.length) * 100);
        saveModuleProgress(subsystem.id, scorePct);
    };

    const existingScore = progress?.quizScores?.[subsystem.id];

    const handleLaunchCockpit = () => {
        const stationMap = {
            fuselage: 'aircraft',
            wings: 'windtunnel',
            airfoil: 'windtunnel',
            tail: 'aircraft',
            engines: 'propulsion',
        };
        const targetStation = stationMap[subsystem.id] || 'aircraft';
        navigate(`/lab?station=${targetStation}&from=${subsystem.id}`);
    };

    return (
        <aside
            aria-label={`${subsystem.name} engineering drawer`}
            style={{
                width: '460px',
                maxWidth: '100vw',
                height: 'calc(100vh - 56px)',
                background: 'var(--bg-surface)',
                borderLeft: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                zIndex: 30,
                boxShadow: 'var(--shadow-lg)',
                color: 'var(--text-primary)',
                overflow: 'hidden',
            }}
        >
            {/* Header */}
            <div
                style={{
                    padding: '16px 20px',
                    borderBottom: '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    background: 'var(--bg-canvas)',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span className="vg-badge vg-badge-accent">{subsystem.code}</span>
                            <span className="vg-badge">{subsystem.category}</span>
                            {typeof existingScore === 'number' && (
                                <span className="vg-badge vg-badge-success">
                                    <CheckCircle2 size={12} />
                                    Quiz {existingScore}%
                                </span>
                            )}
                        </div>
                        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                            {subsystem.name}
                        </h2>
                        <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                            {subsystem.subtitle}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="vg-btn vg-btn-ghost vg-btn-sm"
                        aria-label="Close subsystem drawer"
                        style={{ padding: '6px' }}
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Track Depth Switcher + Tab Bar */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                    <div className="vg-segmented" role="tablist" aria-label="Subsystem drawer sections">
                        <button
                            type="button"
                            role="tab"
                            aria-selected={activeTab === 'curriculum'}
                            className={`vg-segmented-btn ${activeTab === 'curriculum' ? 'active' : ''}`}
                            onClick={() => setActiveTab('curriculum')}
                        >
                            <BookOpen size={13} style={{ marginRight: '4px', verticalAlign: '-2px' }} />
                            Theory
                        </button>
                        <button
                            type="button"
                            role="tab"
                            aria-selected={activeTab === 'controls'}
                            className={`vg-segmented-btn ${activeTab === 'controls' ? 'active' : ''}`}
                            onClick={() => setActiveTab('controls')}
                        >
                            <Sliders size={13} style={{ marginRight: '4px', verticalAlign: '-2px' }} />
                            3D rig ({subsystem.controls?.length || 0})
                        </button>
                        <button
                            type="button"
                            role="tab"
                            aria-selected={activeTab === 'quiz'}
                            className={`vg-segmented-btn ${activeTab === 'quiz' ? 'active' : ''}`}
                            onClick={() => setActiveTab('quiz')}
                        >
                            <Award size={13} style={{ marginRight: '4px', verticalAlign: '-2px' }} />
                            Check ({subsystem.quiz?.length || 0})
                        </button>
                    </div>

                    {/* Foundation vs Engineering Depth Selector */}
                    <div className="vg-segmented" role="group" aria-label="Curriculum depth">
                        <button
                            type="button"
                            className={`vg-segmented-btn ${effectiveDepth === 'foundation' ? 'active' : ''}`}
                            onClick={() => setCurriculumDepth('foundation')}
                        >
                            Foundation
                        </button>
                        <button
                            type="button"
                            className={`vg-segmented-btn ${effectiveDepth === 'engineering' ? 'active' : ''}`}
                            onClick={() => {
                                if (!canViewEngineering) {
                                    onOpenAccessModal?.();
                                } else {
                                    setCurriculumDepth('engineering');
                                }
                            }}
                            title={
                                canViewEngineering
                                    ? 'University engineering formulations'
                                    : 'Requires event cohort or VIP access'
                            }
                        >
                            {!canViewEngineering && <Lock size={11} style={{ marginRight: '4px', verticalAlign: '-1px' }} />}
                            Engineering
                        </button>
                    </div>
                </div>
            </div>

            {/* Scrollable Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {activeTab === 'curriculum' && (
                    <>
                        {/* Primary Summary Card */}
                        <div
                            className="vg-card-nested"
                            style={{
                                padding: '16px',
                                background: 'var(--bg-canvas)',
                                borderLeft: '3px solid var(--accent-primary)',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                                <GraduationCap size={15} style={{ color: 'var(--accent-primary)' }} />
                                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-primary)' }}>
                                    {effectiveDepth === 'engineering'
                                        ? 'University aerospace engineering track'
                                        : 'Foundation flight principles track'}
                                </span>
                            </div>
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', margin: 0, lineHeight: 1.6 }}>
                                {content.summary}
                            </p>
                        </div>

                        {/* Governing Equations (Engineering mode) */}
                        {effectiveDepth === 'engineering' && content.equations && content.equations.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <h3 style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', margin: 0 }}>
                                    Governing physical formulations
                                </h3>
                                {content.equations.map((eq, idx) => (
                                    <div
                                        key={idx}
                                        className="vg-card-nested"
                                        style={{
                                            padding: '12px',
                                            background: 'var(--bg-canvas)',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '4px',
                                        }}
                                    >
                                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                            {eq.label}
                                        </span>
                                        <code
                                            style={{
                                                fontFamily: 'var(--font-mono)',
                                                fontSize: '0.8125rem',
                                                color: 'var(--accent-primary)',
                                                background: 'var(--accent-subtle)',
                                                padding: '6px 8px',
                                                borderRadius: 'var(--radius-xs)',
                                                display: 'block',
                                            }}
                                        >
                                            {eq.formula}
                                        </code>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                                            {eq.variables}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Detailed Sections */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {content.sections?.map((sec, idx) => (
                                <div
                                    key={idx}
                                    className="vg-card-nested"
                                    style={{
                                        padding: '16px',
                                        background: 'var(--bg-surface)',
                                    }}
                                >
                                    <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 6px 0' }}>
                                        {sec.heading}
                                    </h4>
                                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.65 }}>
                                        {sec.body}
                                    </p>
                                </div>
                            ))}
                        </div>

                        {/* Key Takeaways */}
                        {content.keyTakeaways && (
                            <div
                                className="vg-card-nested"
                                style={{
                                    padding: '16px',
                                    background: 'var(--bg-canvas)',
                                }}
                            >
                                <h4 style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 8px 0' }}>
                                    Key operational takeaways
                                </h4>
                                <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    {content.keyTakeaways.map((point, idx) => (
                                        <li key={idx} style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                            {point}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </>
                )}

                {activeTab === 'controls' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '12px',
                                background: 'var(--bg-canvas)',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid var(--border-subtle)',
                            }}
                        >
                            <div>
                                <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                    Live 3D rig actuators
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                    Adjust sliders to articulate the 3D assembly in real time
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={onResetRig}
                                className="vg-btn vg-btn-secondary vg-btn-sm"
                            >
                                <RotateCcw size={13} />
                                Reset rig
                            </button>
                        </div>

                        <div
                            className="vg-card-nested"
                            style={{
                                padding: '16px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '16px',
                            }}
                        >
                            {subsystem.controls?.map((ctrl) => (
                                <ControlSlider
                                    key={ctrl.key}
                                    label={ctrl.label}
                                    unit={ctrl.unit}
                                    value={rigState[ctrl.key] ?? ctrl.defaultValue}
                                    min={ctrl.min}
                                    max={ctrl.max}
                                    step={ctrl.step}
                                    description={ctrl.description}
                                    onChange={(val) => onUpdateRig(ctrl.key, val)}
                                />
                            ))}
                        </div>

                        {/* Live Telemetry Feedback specific to this subsystem */}
                        {subsystem.id === 'fuselage' && (
                            <div
                                className="vg-card-nested"
                                style={{
                                    padding: '16px',
                                    background: 'var(--bg-canvas)',
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr',
                                    gap: '12px',
                                }}
                            >
                                <div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Ambient pressure</div>
                                    <div className="vg-tabular" style={{ fontSize: '1rem', fontWeight: 600 }}>
                                        {isa.pressureKPa.toFixed(1)} kPa
                                    </div>
                                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>
                                        vs 101.3 kPa ISA sea level
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Hull differential ΔP</div>
                                    <div className="vg-tabular" style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--accent-primary)' }}>
                                        {cabin.differentialPsi.toFixed(2)} psi
                                    </div>
                                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>
                                        Cabin alt: {Math.round(cabin.cabinAltitudeFt).toLocaleString()} ft
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'quiz' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {subsystem.quiz?.map((q, qIdx) => {
                            const selected = quizAnswers[qIdx];
                            return (
                                <div
                                    key={qIdx}
                                    className="vg-card-nested"
                                    style={{
                                        padding: '16px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '10px',
                                    }}
                                >
                                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                        {qIdx + 1}. {q.question}
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {q.options.map((opt, oIdx) => {
                                            const isSelected = selected === oIdx;
                                            const isCorrect = q.correctIndex === oIdx;
                                            let borderColor = 'var(--border-subtle)';
                                            let bg = 'var(--bg-canvas)';
                                            if (quizSubmitted) {
                                                if (isCorrect) {
                                                    borderColor = 'var(--status-success)';
                                                    bg = 'var(--status-success-subtle)';
                                                } else if (isSelected && !isCorrect) {
                                                    borderColor = 'var(--status-danger)';
                                                    bg = 'var(--status-danger-subtle)';
                                                }
                                            } else if (isSelected) {
                                                borderColor = 'var(--accent-primary)';
                                                bg = 'var(--accent-subtle)';
                                            }

                                            return (
                                                <button
                                                    key={oIdx}
                                                    type="button"
                                                    onClick={() => handleQuizSelect(qIdx, oIdx)}
                                                    style={{
                                                        textAlign: 'left',
                                                        padding: '10px 12px',
                                                        borderRadius: 'var(--radius-xs)',
                                                        border: `1px solid ${borderColor}`,
                                                        background: bg,
                                                        color: 'var(--text-primary)',
                                                        fontSize: '0.8125rem',
                                                        cursor: quizSubmitted ? 'default' : 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        gap: '8px',
                                                    }}
                                                >
                                                    <span>{opt}</span>
                                                    {quizSubmitted && isCorrect && (
                                                        <CheckCircle2 size={15} style={{ color: 'var(--status-success)', flexShrink: 0 }} />
                                                    )}
                                                    {quizSubmitted && isSelected && !isCorrect && (
                                                        <AlertCircle size={15} style={{ color: 'var(--status-danger)', flexShrink: 0 }} />
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {quizSubmitted && (
                                        <div
                                            style={{
                                                fontSize: '0.75rem',
                                                color: 'var(--text-secondary)',
                                                padding: '8px 10px',
                                                background: 'var(--bg-canvas)',
                                                borderRadius: 'var(--radius-xs)',
                                                borderLeft: '2px solid var(--accent-primary)',
                                            }}
                                        >
                                            {q.explanation}
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                            {!quizSubmitted ? (
                                <button
                                    type="button"
                                    className="vg-btn vg-btn-primary"
                                    style={{ width: '100%' }}
                                    disabled={Object.keys(quizAnswers).length < (subsystem.quiz?.length || 0)}
                                    onClick={handleQuizSubmit}
                                >
                                    Verify answers
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    className="vg-btn vg-btn-secondary"
                                    style={{ width: '100%' }}
                                    onClick={() => {
                                        setQuizAnswers({});
                                        setQuizSubmitted(false);
                                    }}
                                >
                                    Retry check
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Footer Action: Deep Link into Unified 3D Simulation Cockpit */}
            <div
                style={{
                    padding: '16px 20px',
                    borderTop: '1px solid var(--border-subtle)',
                    background: 'var(--bg-canvas)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                }}
            >
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Test {subsystem.name.toLowerCase()} in full CFD & telemetry
                </div>
                <button
                    type="button"
                    onClick={handleLaunchCockpit}
                    className="vg-btn vg-btn-primary vg-btn-sm"
                >
                    Open in 3D cockpit
                    <ArrowRight size={14} />
                </button>
            </div>
        </aside>
    );
}

