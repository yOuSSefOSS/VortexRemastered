import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    Home,
    Compass,
    Sliders,
    Users,
    ShieldCheck,
    Sun,
    Moon,
    Sparkles,
    Cpu,
    Menu,
    X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import VortexLogo from '../components/brand/VortexLogo';
import { preloadRoute } from '../App';

const NAV_ITEMS = [
    { to: '/', label: 'Home', icon: Home, exact: true },
    { to: '/explore', label: '3D Aircraft Hangar', icon: Compass },
    { to: '/lab', label: 'Wind Tunnel & Lab', icon: Sliders },
    { to: '/events', label: 'Workshops', icon: Users },
    { to: '/admin', label: 'Host Console', icon: ShieldCheck },
];

export default function AppShell({ children }) {
    const location = useLocation();
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
                    height: '62px',
                    flexShrink: 0,
                    background: 'var(--glass-bg-strong)',
                    backdropFilter: 'blur(16px) saturate(150%)',
                    WebkitBackdropFilter: 'blur(16px) saturate(150%)',
                    borderBottom: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 22px',
                    position: 'sticky',
                    top: 0,
                    zIndex: 50,
                    gap: '16px',
                }}
            >
                {/* Left Segment: Official Winged "V" Brand Identity + Pill Navigation */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '22px' }}>
                    <Link
                        to="/"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            textDecoration: 'none',
                            color: 'var(--text-primary)',
                        }}
                    >
                        <VortexLogo size={36} showWordmark showTagline variant="header" />
                    </Link>

                    {/* Pill Navigation Links with Hover Preload */}
                    <nav className="hidden md:flex" style={{ alignItems: 'center', gap: '6px' }}>
                        {NAV_ITEMS.map((item) => {
                            const Icon = item.icon;
                            const isActive = item.exact
                                ? location.pathname === item.to
                                : location.pathname === item.to ||
                                  location.pathname.startsWith(`${item.to}/`);
                            return (
                                <Link
                                    key={item.to}
                                    to={item.to}
                                    onMouseEnter={() => preloadRoute(item.to)}
                                    onFocus={() => preloadRoute(item.to)}
                                    className={`vg-nav-pill ${isActive ? 'is-active' : ''}`}
                                >
                                    <Icon size={14} />
                                    <span>{item.label}</span>
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                {/* Right Segment: Kid/Simple vs Engineer Explanation Switcher, Session & Theme */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {/* Kid-Friendly Simple Mode vs Engineering Mode Switcher */}
                    <div className="hidden sm:flex" style={{ alignItems: 'center' }}>
                        <div
                            className="vg-segmented"
                            role="group"
                            aria-label="Explanation complexity mode"
                            title="Switch between Simple (Kid-Friendly) and Engineering explanations across the website"
                        >
                            <button
                                type="button"
                                className={`vg-segmented-btn ${
                                    audienceTrack === 'foundation' ? 'active' : ''
                                }`}
                                onClick={() => setAudienceTrack('foundation')}
                            >
                                <Sparkles size={12} />
                                Simple Mode
                            </button>
                            <button
                                type="button"
                                className={`vg-segmented-btn ${
                                    audienceTrack === 'engineering' ? 'active' : ''
                                }`}
                                onClick={() => setAudienceTrack('engineering')}
                            >
                                Engineer Mode
                            </button>
                        </div>
                    </div>

                    {/* Device Identity & Tier Pill */}
                    <Link
                        to="/login"
                        title={`Hardware Fingerprint: ${deviceFingerprint}`}
                        className="hidden lg:flex vg-nav-pill"
                        style={{
                            background: 'var(--bg-subtle)',
                            border: '1px solid var(--border-subtle)',
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
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            paddingBottom: '6px',
                        }}
                    >
                        <span className="mono" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                            EXPLANATION LEVEL
                        </span>
                        <div className="vg-segmented">
                            <button
                                type="button"
                                className={`vg-segmented-btn ${
                                    audienceTrack === 'foundation' ? 'active' : ''
                                }`}
                                onClick={() => setAudienceTrack('foundation')}
                            >
                                Simple Mode
                            </button>
                            <button
                                type="button"
                                className={`vg-segmented-btn ${
                                    audienceTrack === 'engineering' ? 'active' : ''
                                }`}
                                onClick={() => setAudienceTrack('engineering')}
                            >
                                Engineer Mode
                            </button>
                        </div>
                    </div>

                    {NAV_ITEMS.map((item) => {
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.to}
                                to={item.to}
                                onMouseEnter={() => preloadRoute(item.to)}
                                onClick={() => setMobileOpen(false)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    padding: '10px 14px',
                                    borderRadius: 'var(--radius-sm)',
                                    fontSize: '0.875rem',
                                    fontWeight: 600,
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
