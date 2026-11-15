import React, { useState } from 'react';
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
    Menu,
    X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

const NAV_ITEMS = [
    { to: '/explore', label: '3D Hangar', icon: Compass },
    { to: '/lab', label: 'Simulation Cockpit', icon: Sliders },
    { to: '/events', label: 'Workshops & Cohorts', icon: Users },
    { to: '/admin', label: 'Host Console', icon: ShieldCheck },
];

export default function AppShell({ children }) {
    const location = useLocation();
    const navigate = useNavigate();
    const [mobileOpen, setMobileOpen] = useState(false);

    const {
        theme,
        toggleTheme,
        session,
        deviceFingerprint,
        capabilities,
        audienceTrack,
        setAudienceTrack,
    } = useApp();

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
            {/* Clean, Modern "Fly Higher" Glass Header Bar */}
            <header
                style={{
                    height: '60px',
                    flexShrink: 0,
                    background: 'var(--glass-bg-strong)',
                    backdropFilter: 'blur(16px) saturate(140%)',
                    WebkitBackdropFilter: 'blur(16px) saturate(140%)',
                    borderBottom: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 20px',
                    position: 'sticky',
                    top: 0,
                    zIndex: 50,
                    gap: '16px',
                }}
            >
                {/* Left Segment: Brand Identity + Pill Navigation */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <Link
                        to="/"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            textDecoration: 'none',
                            color: 'var(--text-primary)',
                        }}
                    >
                        <img
                            src="/brand/logo-icon.jpg"
                            alt="Vortex-Gen"
                            style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '8px',
                                border: '1px solid var(--border-strong)',
                                objectFit: 'cover',
                            }}
                        />
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span
                                className="vg-display"
                                style={{
                                    fontSize: '0.95rem',
                                    fontWeight: 700,
                                    lineHeight: 1.15,
                                    color: 'var(--text-primary)',
                                }}
                            >
                                Vortex-Gen
                            </span>
                            <span
                                className="mono"
                                style={{
                                    fontSize: '0.625rem',
                                    letterSpacing: '0.12em',
                                    color: 'var(--accent-primary)',
                                    lineHeight: 1.2,
                                    fontWeight: 600,
                                }}
                            >
                                FLY HIGHER · AERO LAB
                            </span>
                        </div>
                    </Link>

                    {/* Pill Navigation Links */}
                    <nav className="hidden md:flex" style={{ alignItems: 'center', gap: '6px' }}>
                        {NAV_ITEMS.map((item) => {
                            const Icon = item.icon;
                            const isActive =
                                location.pathname === item.to ||
                                location.pathname.startsWith(`${item.to}/`);
                            return (
                                <Link
                                    key={item.to}
                                    to={item.to}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '7px',
                                        height: '36px',
                                        padding: '0 14px',
                                        borderRadius: 'var(--radius-pill)',
                                        background: isActive
                                            ? 'var(--accent-subtle)'
                                            : 'transparent',
                                        border: isActive
                                            ? '1px solid var(--border-strong)'
                                            : '1px solid transparent',
                                        color: isActive
                                            ? 'var(--accent-primary)'
                                            : 'var(--text-secondary)',
                                        fontSize: '0.8125rem',
                                        fontWeight: isActive ? 600 : 500,
                                        textDecoration: 'none',
                                        transition: 'all 150ms ease',
                                    }}
                                >
                                    <Icon size={14} />
                                    <span>{item.label}</span>
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                {/* Right Segment: Track Depth Switcher, Session Badge & Theme Toggle */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {/* Curriculum Depth Selector */}
                    <div className="hidden sm:flex" style={{ alignItems: 'center' }}>
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

                    {/* Device Identity & Tier Pill */}
                    <Link
                        to="/login"
                        title={`Hardware Fingerprint: ${deviceFingerprint}`}
                        className="hidden lg:flex"
                        style={{
                            alignItems: 'center',
                            gap: '8px',
                            height: '36px',
                            padding: '0 14px',
                            borderRadius: 'var(--radius-pill)',
                            background: 'var(--bg-subtle)',
                            border: '1px solid var(--border-subtle)',
                            textDecoration: 'none',
                            color: 'var(--text-primary)',
                            fontSize: '0.75rem',
                            fontWeight: 500,
                        }}
                    >
                        <Cpu size={14} style={{ color: 'var(--accent-primary)' }} />
                        <span style={{ fontWeight: 600 }}>{session.display_name}</span>
                        <span
                            className="mono"
                            style={{
                                fontSize: '0.6875rem',
                                color: 'var(--text-secondary)',
                            }}
                        >
                            · {capabilities.label}
                        </span>
                    </Link>

                    {/* Theme Polarity Switcher (Dark <-> Light) */}
                    <button
                        type="button"
                        onClick={toggleTheme}
                        aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
                        className="vg-btn vg-btn-secondary vg-btn-sm"
                        style={{
                            gap: '6px',
                            padding: '0 12px',
                        }}
                    >
                        {theme === 'light' ? (
                            <>
                                <Moon size={14} />
                                <span className="hidden sm:inline">Dark</span>
                            </>
                        ) : (
                            <>
                                <Sun size={14} />
                                <span className="hidden sm:inline">Light</span>
                            </>
                        )}
                    </button>

                    {/* Mobile Menu Button */}
                    <button
                        type="button"
                        onClick={() => setMobileOpen((v) => !v)}
                        className="flex md:hidden vg-btn vg-btn-secondary vg-btn-sm"
                        style={{ padding: '0 10px' }}
                        aria-label="Toggle navigation menu"
                    >
                        {mobileOpen ? <X size={17} /> : <Menu size={17} />}
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
                    {NAV_ITEMS.map((item) => {
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.to}
                                to={item.to}
                                onClick={() => setMobileOpen(false)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    padding: '10px 14px',
                                    borderRadius: 'var(--radius-sm)',
                                    fontSize: '0.875rem',
                                    fontWeight: 500,
                                    color: 'var(--text-primary)',
                                    textDecoration: 'none',
                                    background: 'var(--bg-subtle)',
                                    border: '1px solid var(--border-subtle)',
                                }}
                            >
                                <Icon size={15} style={{ color: 'var(--accent-primary)' }} />
                                <span>{item.label}</span>
                            </Link>
                        );
                    })}
                </div>
            )}

            <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>{children}</main>
        </div>
    );
}
