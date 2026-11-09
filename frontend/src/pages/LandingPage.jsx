import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    Compass,
    Sliders,
    Calendar,
    Shield,
    ArrowRight,
    Layers,
    Wind,
    Fan,
    GraduationCap,
    BookOpen,
    CheckCircle2,
    Box,
    FileText,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { HANGAR_SUBSYSTEMS } from '../data/hangarCurriculum';

export default function LandingPage() {
    const navigate = useNavigate();
    const {
        displayName,
        deviceFingerprint,
        tierPolicy,
        curriculumDepth,
        setCurriculumDepth,
    } = useApp();

    return (
        <div
            style={{
                background: 'var(--bg-canvas)',
                color: 'var(--text-primary)',
                minHeight: 'calc(100vh - 56px)',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            {/* Hero Section — Editorial Daylight Layout inspired by reference */}
            <section
                style={{
                    background: 'var(--bg-surface)',
                    borderBottom: '1px solid var(--border-subtle)',
                    padding: '64px 24px 56px',
                }}
            >
                <div
                    className="vg-container"
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
                        gap: '48px',
                        alignItems: 'center',
                    }}
                >
                    {/* Left Column: Editorial Headline & Primary Actions */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span className="vg-badge vg-badge-accent">
                                Aerospace education & digital wind tunnel
                            </span>
                            <span className="vg-badge">
                                Active tier: {tierPolicy?.label || 'Guest preview'}
                            </span>
                        </div>

                        <h1
                            style={{
                                fontSize: 'clamp(2rem, 3.5vw, 2.75rem)',
                                fontWeight: 600,
                                lineHeight: 1.15,
                                letterSpacing: '-0.025em',
                                margin: 0,
                                color: 'var(--text-primary)',
                            }}
                        >
                            Interactive 3D flight mechanics, propulsion, and airfoil simulation.
                        </h1>

                        <p
                            style={{
                                fontSize: '1.0625rem',
                                color: 'var(--text-secondary)',
                                lineHeight: 1.65,
                                margin: 0,
                                maxWidth: '58ch',
                            }}
                        >
                            Inspect a full-scale articulated aircraft and cutaway high-bypass turbofan in the 3D hangar, study foundation or university-grade aerodynamic theory, and test NACA wing profiles in a real-time CFD wind tunnel.
                        </p>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', paddingTop: '4px' }}>
                            <Link to="/explore" className="vg-btn vg-btn-primary vg-btn-lg">
                                <Compass size={18} />
                                Enter 3D hangar
                                <ArrowRight size={16} />
                            </Link>
                            <Link to="/lab" className="vg-btn vg-btn-secondary vg-btn-lg">
                                <Sliders size={18} />
                                Open 3D simulation cockpit
                            </Link>
                            <Link to="/events" className="vg-btn vg-btn-ghost vg-btn-lg">
                                <Calendar size={18} />
                                Join event cohort
                            </Link>
                        </div>

                        {/* Device & Track Status Strip */}
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '16px',
                                paddingTop: '12px',
                                borderTop: '1px solid var(--border-subtle)',
                                fontSize: '0.8125rem',
                                color: 'var(--text-secondary)',
                                flexWrap: 'wrap',
                            }}
                        >
                            <span>
                                Session: <strong style={{ color: 'var(--text-primary)' }}>{displayName || 'Guest'}</strong>
                            </span>
                            <span>
                                Device ID:{' '}
                                <code
                                    style={{
                                        fontFamily: 'var(--font-mono)',
                                        color: 'var(--accent-primary)',
                                        fontWeight: 500,
                                    }}
                                >
                                    {deviceFingerprint}
                                </code>
                            </span>
                            <Link
                                to="/login"
                                style={{
                                    color: 'var(--accent-primary)',
                                    textDecoration: 'none',
                                    fontWeight: 500,
                                }}
                            >
                                Switch session or enter event code →
                            </Link>
                        </div>
                    </div>

                    {/* Right Column: Framed Product Preview Card */}
                    <div
                        className="vg-card"
                        style={{
                            padding: '16px',
                            background: 'var(--bg-canvas)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                        }}
                    >
                        <div
                            style={{
                                borderRadius: 'var(--radius-sm)',
                                overflow: 'hidden',
                                border: '1px solid var(--border-subtle)',
                                background: '#0F1217',
                                position: 'relative',
                                aspectRatio: '16 / 9',
                            }}
                        >
                            <img
                                src="/brand/logo-banner.jpg"
                                alt="Vortex-Gen aerospace engineering platform"
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                    display: 'block',
                                }}
                            />
                            <div
                                style={{
                                    position: 'absolute',
                                    bottom: '12px',
                                    left: '12px',
                                    right: '12px',
                                    padding: '10px 14px',
                                    background: 'rgba(15, 18, 23, 0.86)',
                                    backdropFilter: 'blur(8px)',
                                    borderRadius: 'var(--radius-xs)',
                                    border: '1px solid rgba(148, 163, 184, 0.22)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    color: '#F8FAFC',
                                    fontSize: '0.75rem',
                                }}
                            >
                                <span>3D hangar + NeuralFoil CFD solver + ISA atmosphere</span>
                                <span className="vg-tabular" style={{ color: '#93C5FD', fontWeight: 600 }}>
                                    60 FPS WebGL
                                </span>
                            </div>
                        </div>

                        {/* Concentric Inner Telemetry Summary Row */}
                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(3, 1fr)',
                                gap: '8px',
                            }}
                        >
                            <div className="vg-card-nested" style={{ padding: '12px' }}>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                    3D subsystems
                                </div>
                                <div className="vg-tabular" style={{ fontSize: '1.125rem', fontWeight: 600 }}>
                                    5 interactive rigs
                                </div>
                                <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>
                                    Airframe + turbofan cutaway
                                </div>
                            </div>
                            <div className="vg-card-nested" style={{ padding: '12px' }}>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                    Simulation stations
                                </div>
                                <div className="vg-tabular" style={{ fontSize: '1.125rem', fontWeight: 600 }}>
                                    3 unified modes
                                </div>
                                <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>
                                    Stability, CFD, propulsion
                                </div>
                            </div>
                            <div className="vg-card-nested" style={{ padding: '12px' }}>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                    Hardware export
                                </div>
                                <div className="vg-tabular" style={{ fontSize: '1.125rem', fontWeight: 600 }}>
                                    STL + PDF
                                </div>
                                <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>
                                    Shoelace volume & Re math
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* 4-Pillar Feature Strip (Matched to Reference Card Row, Equal 24px Padding) */}
            <section style={{ padding: '48px 24px 24px' }}>
                <div className="vg-container">
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                            gap: '16px',
                        }}
                    >
                        {[
                            {
                                icon: Compass,
                                title: '3D hangar explorer',
                                body: 'Click directly on fuselage frames, swept wings, NACA airfoil ribs, empennage surfaces, or the cutaway turbofan engine.',
                                actionLabel: 'Inspect 3D models',
                                to: '/explore',
                            },
                            {
                                icon: Wind,
                                title: 'Unified 3D simulation cockpit',
                                body: 'Switch between full aircraft stability, NACA wind tunnel CFD with NeuralFoil autotuning, and turbofan cycle telemetry.',
                                actionLabel: 'Launch cockpit',
                                to: '/lab',
                            },
                            {
                                icon: GraduationCap,
                                title: 'Dual-depth aerospace curriculum',
                                body: 'Toggle any module between intuitive K-12 foundation concepts and university-level differential equations.',
                                actionLabel: 'Browse modules',
                                to: '/explore',
                            },
                            {
                                icon: Calendar,
                                title: 'Live cohorts & host console',
                                body: 'Join youth camps or university workshops with a 6-character code, or unlock guest devices in real time from the host console.',
                                actionLabel: 'View live events',
                                to: '/events',
                            },
                        ].map((item, idx) => {
                            const Icon = item.icon;
                            return (
                                <div
                                    key={idx}
                                    className="vg-card"
                                    style={{
                                        padding: '24px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'space-between',
                                        gap: '16px',
                                    }}
                                >
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        <div
                                            style={{
                                                width: '40px',
                                                height: '40px',
                                                borderRadius: 'var(--radius-sm)',
                                                background: 'var(--accent-subtle)',
                                                color: 'var(--accent-primary)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}
                                        >
                                            <Icon size={20} />
                                        </div>
                                        <h2 style={{ fontSize: '1.0625rem', fontWeight: 600, margin: 0 }}>
                                            {item.title}
                                        </h2>
                                        <p
                                            style={{
                                                fontSize: '0.875rem',
                                                color: 'var(--text-secondary)',
                                                margin: 0,
                                                lineHeight: 1.6,
                                            }}
                                        >
                                            {item.body}
                                        </p>
                                    </div>
                                    <Link
                                        to={item.to}
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            fontSize: '0.8125rem',
                                            fontWeight: 500,
                                            color: 'var(--accent-primary)',
                                            textDecoration: 'none',
                                        }}
                                    >
                                        {item.actionLabel}
                                        <ArrowRight size={14} />
                                    </Link>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* Asymmetric 8/4 Split Section: Interactive Curriculum Preview & Track Selector */}
            <section style={{ padding: '24px 24px 56px' }}>
                <div
                    className="vg-container"
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                        gap: '24px',
                    }}
                >
                    {/* Left Card: 5 Interactive Hangar Subsystems */}
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
                                gap: '12px',
                                flexWrap: 'wrap',
                            }}
                        >
                            <div>
                                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>
                                    3D hangar curriculum subsystems
                                </h2>
                                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                                    Select any aircraft or propulsion zone to open its 3D rig and theory drawer
                                </p>
                            </div>
                            <div className="vg-segmented">
                                <button
                                    type="button"
                                    className={`vg-segmented-btn ${curriculumDepth === 'foundation' ? 'active' : ''}`}
                                    onClick={() => setCurriculumDepth('foundation')}
                                >
                                    Foundation track
                                </button>
                                <button
                                    type="button"
                                    className={`vg-segmented-btn ${curriculumDepth === 'engineering' ? 'active' : ''}`}
                                    onClick={() => setCurriculumDepth('engineering')}
                                >
                                    Engineering track
                                </button>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {HANGAR_SUBSYSTEMS.map((sub) => (
                                <div
                                    key={sub.id}
                                    className="vg-card-nested"
                                    style={{
                                        padding: '14px 16px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: '16px',
                                        background: 'var(--bg-canvas)',
                                    }}
                                >
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span className="vg-badge vg-badge-accent">{sub.code}</span>
                                            <span style={{ fontSize: '0.9375rem', fontWeight: 600 }}>
                                                {sub.name}
                                            </span>
                                        </div>
                                        <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                                            {sub.subtitle}
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => navigate(`/explore/${sub.id}`)}
                                        className="vg-btn vg-btn-secondary vg-btn-sm"
                                        style={{ flexShrink: 0 }}
                                    >
                                        Inspect
                                        <ArrowRight size={13} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right Card: Direct Access & Live Host Override Overview */}
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
                            <span className="vg-badge vg-badge-accent" style={{ alignSelf: 'flex-start' }}>
                                Workshop & VIP access architecture
                            </span>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>
                                Designed for classrooms, engineering labs, and faculty demonstrations.
                            </h3>
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.65 }}>
                                Visitors can start immediately with their display name while their progress binds to their hardware device ID. During live university lectures or youth camps, the host can upgrade any guest device to full VIP access in one click.
                            </p>

                            <div
                                className="vg-card-nested"
                                style={{
                                    padding: '16px',
                                    background: 'var(--bg-canvas)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '10px',
                                }}
                            >
                                <div style={{ fontSize: '0.8125rem', fontWeight: 600 }}>
                                    Active cohort codes for instant testing
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                                    <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)', fontWeight: 600 }}>
                                        VG-YOUTH
                                    </code>
                                    <span style={{ color: 'var(--text-secondary)' }}>Youth aviation camp track</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                                    <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)', fontWeight: 600 }}>
                                        VG-UNI26
                                    </code>
                                    <span style={{ color: 'var(--text-secondary)' }}>University aerodynamics lab</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                                    <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)', fontWeight: 600 }}>
                                        VG-VIP01
                                    </code>
                                    <span style={{ color: 'var(--text-secondary)' }}>Faculty / VIP full platform</span>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <Link to="/login" className="vg-btn vg-btn-primary" style={{ width: '100%' }}>
                                Configure session or enter event code
                            </Link>
                            <Link to="/admin" className="vg-btn vg-btn-secondary" style={{ width: '100%' }}>
                                <Shield size={15} />
                                Open founder live host console
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
                    padding: '24px',
                }}
            >
                <div
                    className="vg-container"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '16px',
                        flexWrap: 'wrap',
                        fontSize: '0.8125rem',
                        color: 'var(--text-secondary)',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <img
                            src="/brand/logo-icon.jpg"
                            alt="Vortex-Gen"
                            style={{ width: '24px', height: '24px', borderRadius: '4px' }}
                        />
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Vortex-Gen</span>
                        <span>Aerospace Engineering & Flight Simulation Platform</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <Link to="/privacy" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
                            Privacy policy
                        </Link>
                        <Link to="/terms" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
                            Terms of service
                        </Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
