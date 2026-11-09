import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Calendar,
    Users,
    GraduationCap,
    Compass,
    Sliders,
    ArrowRight,
    CheckCircle2,
    Sparkles,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { fetchEventCohorts } from '../services/apiService';

const DEFAULT_COHORTS = [
    {
        code: 'VG-YOUTH',
        title: 'Youth Aviation & Flight Discovery Camp',
        audience: 'K-12 & STEM Foundation Track',
        track: 'foundation',
        tier: 'event_cohort',
        description:
            'Guided 3D exploration of aircraft control surfaces, wing lift generation, cabin pressurization, and interactive flight quizzes.',
        modules: ['Fuselage & Cabin', 'Swept Wing & High-Lift', 'NACA Airfoil Lab', 'Empennage & Stability', '3D Turbofan Cutaway'],
    },
    {
        code: 'VG-UNI26',
        title: 'University Aerodynamics & Propulsion Workshop',
        audience: 'Undergraduate Aerospace Engineering Track',
        track: 'engineering',
        tier: 'event_cohort',
        description:
            'Full differential equations, Prandtl lifting-line induced drag, Korn-Lock transonic wave drag, longitudinal static margin, and NeuralFoil CFD wind tunnel.',
        modules: ['3D Hangar + Equations', 'NeuralFoil CFD Wind Tunnel', 'Static Margin & Gust Lab', 'Turbofan Thermodynamic Cycle', 'STL & PDF Telemetry Export'],
    },
    {
        code: 'VG-VIP01',
        title: 'Faculty, Industry & VIP Evaluation Pass',
        audience: 'Professors, Instructors & Invited Guests',
        track: 'engineering',
        tier: 'vip_full',
        description:
            'Unrestricted platform-wide access to all 3D hangar cutaways, both curriculum tracks, all three simulation cockpit stations, and CAD/PDF reporting.',
        modules: ['Unrestricted 3D Hangar', 'All 3 Cockpit Stations', 'Foundation + Engineering Depth', 'Watertight STL Export', 'Full Engineering PDF Report'],
    },
];

export default function EventsPage() {
    const navigate = useNavigate();
    const {
        displayName,
        eventCode: activeEventCode,
        joinEventCohort,
        setCurriculumDepth,
    } = useApp();

    const [cohorts, setCohorts] = useState(DEFAULT_COHORTS);
    const [participantName, setParticipantName] = useState(displayName || '');
    const [joiningCode, setJoiningCode] = useState(null);
    const [feedback, setFeedback] = useState(null);

    useEffect(() => {
        let mounted = true;
        fetchEventCohorts()
            .then((res) => {
                if (mounted && Array.isArray(res?.events) && res.events.length > 0) {
                    const merged = [...DEFAULT_COHORTS];
                    res.events.forEach((ev) => {
                        if (!merged.some((m) => m.code === ev.code)) {
                            merged.push({
                                code: ev.code,
                                title: ev.title || `Cohort ${ev.code}`,
                                audience: ev.track === 'engineering' ? 'University Track' : 'Foundation Track',
                                track: ev.track || 'foundation',
                                tier: ev.tier || 'event_cohort',
                                description: ev.description || 'Live instructor-hosted aerospace workshop cohort.',
                                modules: ['Full 3D Hangar', '3D Simulation Cockpit', 'Interactive Quizzes'],
                            });
                        }
                    });
                    setCohorts(merged);
                }
            })
            .catch(() => {});
        return () => {
            mounted = false;
        };
    }, []);

    const handleJoinCohort = async (cohort) => {
        const nameToUse = participantName.trim() || displayName || 'Workshop Cadet';
        setJoiningCode(cohort.code);
        setFeedback(null);
        try {
            await joinEventCohort(nameToUse, cohort.code);
            if (cohort.track === 'engineering' || cohort.track === 'foundation') {
                setCurriculumDepth(cohort.track);
            }
            setFeedback({
                code: cohort.code,
                message: `Joined ${cohort.title}. Launching 3D hangar...`,
            });
            setTimeout(() => navigate('/explore'), 500);
        } catch (err) {
            setFeedback({
                code: cohort.code,
                error: true,
                message: err?.message || 'Unable to join event cohort.',
            });
        } finally {
            setJoiningCode(null);
        }
    };

    return (
        <div
            style={{
                minHeight: 'calc(100vh - 56px)',
                background: 'var(--bg-canvas)',
                padding: '40px 24px 64px',
            }}
        >
            <div className="vg-container" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                {/* Header Card */}
                <div
                    className="vg-card"
                    style={{
                        padding: '28px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '24px',
                        flexWrap: 'wrap',
                    }}
                >
                    <div style={{ maxWidth: '640px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <span className="vg-badge vg-badge-accent">
                                <Calendar size={12} />
                                Live academic & youth cohorts
                            </span>
                            {activeEventCode && (
                                <span className="vg-badge vg-badge-success">
                                    <CheckCircle2 size={12} />
                                    Active code: {activeEventCode}
                                </span>
                            )}
                        </div>
                        <h1 style={{ fontSize: '1.625rem', fontWeight: 600, margin: 0 }}>
                            Aerospace workshops, youth camps, and university lab sessions
                        </h1>
                        <p style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)', margin: '6px 0 0 0', lineHeight: 1.6 }}>
                            Enter your name once and select your workshop cohort below to unlock the corresponding curriculum depth, 3D hangar cutaways, and simulation cockpit stations.
                        </p>
                    </div>

                    {/* Participant Name Input */}
                    <div
                        className="vg-card-nested"
                        style={{
                            padding: '16px',
                            background: 'var(--bg-canvas)',
                            minWidth: '280px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                        }}
                    >
                        <label
                            htmlFor="cohort-participant-name"
                            style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}
                        >
                            Your display name for cohort roster
                        </label>
                        <input
                            id="cohort-participant-name"
                            type="text"
                            className="vg-input"
                            placeholder="Enter your name"
                            value={participantName}
                            onChange={(e) => setParticipantName(e.target.value)}
                        />
                    </div>
                </div>

                {/* Cohort Cards Grid (Equal 24px internal padding) */}
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                        gap: '20px',
                    }}
                >
                    {cohorts.map((cohort) => {
                        const isCurrent = activeEventCode === cohort.code;
                        return (
                            <div
                                key={cohort.code}
                                className="vg-card"
                                style={{
                                    padding: '24px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                    gap: '20px',
                                    borderColor: isCurrent ? 'var(--accent-primary)' : undefined,
                                }}
                            >
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                        <span
                                            className="vg-badge vg-badge-accent"
                                            style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}
                                        >
                                            {cohort.code}
                                        </span>
                                        <span className="vg-badge">{cohort.audience}</span>
                                    </div>

                                    <h2 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>
                                        {cohort.title}
                                    </h2>

                                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
                                        {cohort.description}
                                    </p>

                                    <div
                                        className="vg-card-nested"
                                        style={{
                                            padding: '12px',
                                            background: 'var(--bg-canvas)',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '6px',
                                        }}
                                    >
                                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                            Included capabilities
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                            {cohort.modules.map((m, idx) => (
                                                <span key={idx} className="vg-badge">
                                                    {m}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {feedback && feedback.code === cohort.code && (
                                        <div
                                            style={{
                                                fontSize: '0.75rem',
                                                color: feedback.error
                                                    ? 'var(--status-danger)'
                                                    : 'var(--status-success)',
                                                fontWeight: 500,
                                            }}
                                        >
                                            {feedback.message}
                                        </div>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => handleJoinCohort(cohort)}
                                        disabled={joiningCode === cohort.code}
                                        className={`vg-btn ${isCurrent ? 'vg-btn-secondary' : 'vg-btn-primary'}`}
                                        style={{ width: '100%' }}
                                    >
                                        {isCurrent ? (
                                            <>
                                                <CheckCircle2 size={15} />
                                                Active cohort — Re-enter hangar
                                            </>
                                        ) : (
                                            <>
                                                Activate {cohort.code}
                                                <ArrowRight size={15} />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
