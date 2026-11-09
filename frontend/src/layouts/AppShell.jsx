import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
    Compass,
    Sliders,
    Users,
    ShieldCheck,
    Sun,
    Moon,
    Lock,
    Cpu,
    Radio,
    Menu,
    X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

const NAV_ITEMS = [
    { to: '/explore', code: '01', label: '3D hangar', icon: Compass },
    { to: '/lab', code: '02', label: 'Simulation cockpit', icon: Sliders },
    { to: '/events', code: '03', label: 'Event cohorts', icon: Users },
    { to: '/admin', code: '04', label: 'Host console', icon: ShieldCheck },
];

export default function AppShell({ children }) {
    const location = useLocation();
    const navigate = useNavigate();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [utcClock, setUtcClock] = useState('');

    const {
        theme,
        toggleTheme,
        session,
        deviceFingerprint,
        capabilities,
        audienceTrack,
        setAudienceTrack,
    } = useApp();

    // Live ArcMarumo / Mission Control UTC Timecode
    useEffect(() => {
        const updateClock = () => {
            const now = new Date();
            const hh = String(now.getUTCHours()).padStart(2, '0');
            const mm = String(now.getUTCMinutes()).padStart(2, '0');
            const ss = String(now.getUTCSeconds()).padStart(2, '0');
            setUtcClock(`${hh}:${mm}:${ss} UTC`);
        };
        updateClock();
        const timer = setInterval(updateClock, 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div
            style={{
                minHeight: '100dvh',
                display: 'flex',
                flexDirection: 'column',
                background: 'var(--bg-canvas)',
                color: 'var(--text-primary)',
            }}
        >
            {/* 56px Tactical Instrument Header Bar (EnduroSat × ArcMarumo Hairline Grid) */}
            <header
                style={{
                    height: '56px',
                    flexShrink: 0,
                    background: 'var(--bg-surface)',
                    borderBottom: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'stretch',
                    justifyContent: 'space-between',
                    position: 'sticky',
                    top: 0,
                    zIndex: 50,
                }}
            >
                {/* Left Segment: Brand Identity + Live Telemetry Timecode */}
                <div style={{ display: 'flex', alignItems: 'stretch' }}>
                    <Link
                        to="/"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '0 20px',
                            borderRight: '1px solid var(--border-subtle)',
                            textDecoration: 'none',
                            color: 'var(--text-primary)',
                        }}
                    >
                        <img
                            src="/brand/logo-icon.jpg"
                            alt="Vortex-Gen"
                            style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '2px',
                                border: '1px solid var(--border-strong)',
                                objectFit: 'cover',
                            }}
                        />
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span
                                style={{
                                    fontFamily: 'var(--font-mono)',
                                    fontSize: '0.8125rem',
                                    fontWeight: 600,
                                    letterSpacing: '0.03em',
                                    lineHeight: 1.2,
                                }}
                            >
                                VORTEX-GEN // SYS.02
                            </span>
                            <span
                                style={{
                                    fontFamily: 'var(--font-mono)',
                                    fontSize: '0.625rem',
                                    color: 'var(--text-secondary)',
                                    lineHeight: 1.2,
                                }}
                            >
                                ORBITAL &amp; AERO TELEMETRY
                            </span>
                        </div>
                    </Link>

                    {/* Live Timecode Cell (ArcMarumo Instrument Readout) */}
                    <div
                        className="hidden xl:flex"
                        style={{
                            alignItems: 'center',
                            gap: '8px',
                            padding: '0 16px',
                            borderRight: '1px solid var(--border-subtle)',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.6875rem',
                            color: 'var(--text-secondary)',
                        }}
                    >
                        <Radio size={12} style={{ color: 'var(--status-success)' }} />
                        <span className="vg-tabular">{utcClock}</span>
                        <span style={{ color: 'var(--text-tertiary)' }}>//</span>
                        <span style={{ color: 'var(--accent-primary)' }}>WEBGL 60FPS</span>
                    </div>

                    {/* Numbered Tactical Navigation Cells */}
                    <nav className="hidden md:flex" style={{ alignItems: 'stretch' }}>
                        {NAV_ITEMS.map((item) => {
                            const isActive =
                                location.pathname === item.to ||
                                location.pathname.startsWith(`${item.to}/`);
                            return (
                                <Link
                                    key={item.to}
                                    to={item.to}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '0 18px',
                                        borderRight: '1px solid var(--border-subtle)',
                                        borderBottom: isActive
                                            ? '2px solid var(--accent-primary)'
                                            : '2px solid transparent',
                                        background: isActive
                                            ? 'var(--accent-subtle)'
                                            : 'transparent',
                                        color: isActive
                                            ? 'var(--text-primary)'
                                            : 'var(--text-secondary)',
                                        fontFamily: 'var(--font-mono)',
                                        fontSize: '0.75rem',
                                        fontWeight: isActive ? 600 : 500,
                                        textDecoration: 'none',
                                        transition: 'all 120ms ease',
                                    }}
                                >
                                    <span
                                        style={{
                                            fontSize: '0.6875rem',
                                            color: isActive
                                                ? 'var(--accent-primary)'
                                                : 'var(--text-tertiary)',
                                        }}
                                    >
                                        [{item.code}]
                                    </span>
                                    <span>{item.label}</span>
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                {/* Right Segment: Track Depth Switcher, Hardware Device Terminal & Polarity */}
                <div style={{ display: 'flex', alignItems: 'stretch' }}>
                    {/* Curriculum Depth Selector */}
                    <div
                        className="hidden sm:flex"
                        style={{
                            alignItems: 'center',
                            padding: '0 14px',
                            borderLeft: '1px solid var(--border-subtle)',
                        }}
                    >
                        <div className="vg-segmented" role="group" aria-label="Curriculum depth">
                            <button
                                type="button"
                                className={`vg-segmented-btn ${audienceTrack === 'foundation' ? 'active' : ''}`}
                                onClick={() => setAudienceTrack('foundation')}
                            >
                                Foundation
                            </button>
                            <button
                                type="button"
                                className={`vg-segmented-btn ${audienceTrack === 'engineering' ? 'active' : ''}`}
                                onClick={() => {
                                    if (!capabilities.allowEngineeringDepth) {
                                        navigate('/login?reason=engineering_track');
                                    } else {
                                        setAudienceTrack('engineering');
                                    }
                                }}
                            >
                                {!capabilities.allowEngineeringDepth && (
                                    <Lock size={11} style={{ marginRight: '4px', verticalAlign: '-1px' }} />
                                )}
                                Engineering
                            </button>
                        </div>
                    </div>

                    {/* Device Identity & Tier Cell */}
                    <Link
                        to="/login"
                        title={`Hardware Fingerprint: ${deviceFingerprint}`}
                        className="hidden lg:flex"
                        style={{
                            alignItems: 'center',
                            gap: '10px',
                            padding: '0 16px',
                            borderLeft: '1px solid var(--border-subtle)',
                            textDecoration: 'none',
                            color: 'var(--text-primary)',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.75rem',
                        }}
                    >
                        <Cpu size={14} style={{ color: 'var(--accent-primary)' }} />
                        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
                            <span style={{ fontWeight: 600, fontSize: '0.75rem' }}>
                                {session.display_name}
                            </span>
                            <span style={{ fontSize: '0.625rem', color: 'var(--text-secondary)' }}>
                                {deviceFingerprint.slice(0, 12)} // {capabilities.label}
                            </span>
                        </div>
                    </Link>

                    {/* Polarity Switcher */}
                    <button
                        type="button"
                        onClick={toggleTheme}
                        aria-label={`Switch to ${theme === 'light' ? 'orbital dark' : 'blueprint light'} mode`}
                        style={{
                            width: '52px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'transparent',
                            border: 'none',
                            borderLeft: '1px solid var(--border-subtle)',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                        }}
                    >
                        {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
                    </button>

                    {/* Mobile Menu Button */}
                    <button
                        type="button"
                        onClick={() => setMobileOpen((v) => !v)}
                        className="flex md:hidden"
                        style={{
                            width: '52px',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'transparent',
                            border: 'none',
                            borderLeft: '1px solid var(--border-subtle)',
                            color: 'var(--text-primary)',
                            cursor: 'pointer',
                        }}
                    >
                        {mobileOpen ? <X size={18} /> : <Menu size={18} />}
                    </button>
                </div>
            </header>

            {mobileOpen && (
                <div
                    style={{
                        background: 'var(--bg-surface)',
                        borderBottom: '1px solid var(--border-subtle)',
                        padding: '12px 16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                    }}
                >
                    {NAV_ITEMS.map((item) => (
                        <Link
                            key={item.to}
                            to={item.to}
                            onClick={() => setMobileOpen(false)}
                            style={{
                                padding: '8px 12px',
                                fontFamily: 'var(--font-mono)',
                                fontSize: '0.8125rem',
                                color: 'var(--text-primary)',
                                textDecoration: 'none',
                                border: '1px solid var(--border-subtle)',
                            }}
                        >
                            [{item.code}] {item.label}
                        </Link>
                    ))}
                </div>
            )}

            <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>{children}</main>
        </div>
    );
}
