import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    User,
    Calendar,
    KeyRound,
    Shield,
    ArrowRight,
    CheckCircle2,
    AlertCircle,
    Cpu,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { supabase } from '../services/supabaseClient';

export default function Login() {
    const navigate = useNavigate();
    const {
        displayName,
        deviceFingerprint,
        tierPolicy,
        eventCode: currentEventCode,
        startGuestSession,
        joinEventCohort,
    } = useApp();

    const [mode, setMode] = useState('guest'); // 'guest' | 'event' | 'account'
    const [nameInput, setNameInput] = useState(displayName || '');
    const [codeInput, setCodeInput] = useState(currentEventCode || 'VG-UNI26');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [status, setStatus] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const handleGuestSubmit = async (e) => {
        e.preventDefault();
        if (!nameInput.trim()) {
            setStatus({ type: 'error', message: 'Enter your display name to continue.' });
            return;
        }
        setSubmitting(true);
        setStatus(null);
        try {
            await startGuestSession(nameInput.trim());
            setStatus({
                type: 'success',
                message: 'Device session registered. Redirecting to 3D hangar...',
            });
            setTimeout(() => navigate('/explore'), 450);
        } catch (err) {
            setStatus({
                type: 'error',
                message: err?.message || 'Unable to start guest session.',
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleEventSubmit = async (e) => {
        e.preventDefault();
        if (!nameInput.trim() || !codeInput.trim()) {
            setStatus({
                type: 'error',
                message: 'Enter both your display name and the 6-character event code.',
            });
            return;
        }
        setSubmitting(true);
        setStatus(null);
        try {
            await joinEventCohort(nameInput.trim(), codeInput.trim().toUpperCase());
            setStatus({
                type: 'success',
                message: `Joined cohort ${codeInput.trim().toUpperCase()}. Redirecting to 3D hangar...`,
            });
            setTimeout(() => navigate('/explore'), 450);
        } catch (err) {
            setStatus({
                type: 'error',
                message: err?.message || 'Invalid event code.',
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleAccountSubmit = async (e) => {
        e.preventDefault();
        if (!supabase) {
            setStatus({
                type: 'error',
                message:
                    'Supabase credentials are not configured in this environment. Use guest or event cohort access.',
            });
            return;
        }
        setSubmitting(true);
        setStatus(null);
        try {
            if (isSignUp) {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: nameInput.trim() || email.split('@')[0],
                        },
                    },
                });
                if (error) throw error;
                setStatus({
                    type: 'success',
                    message: 'Account created. Check your email or proceed to the hangar.',
                });
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                setStatus({
                    type: 'success',
                    message: 'Signed in. Redirecting to 3D hangar...',
                });
                setTimeout(() => navigate('/explore'), 450);
            }
        } catch (err) {
            setStatus({
                type: 'error',
                message: err?.message || 'Authentication failed.',
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div
            style={{
                minHeight: 'calc(100vh - 56px)',
                background: 'var(--bg-canvas)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '32px 24px',
            }}
        >
            <div
                style={{
                    width: '100%',
                    maxWidth: '920px',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
                    gap: '24px',
                    alignItems: 'stretch',
                }}
            >
                {/* Left Column: Session Entry Card */}
                <div
                    className="vg-card"
                    style={{
                        padding: '28px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '20px',
                    }}
                >
                    <div>
                        <span className="vg-badge vg-badge-accent" style={{ marginBottom: '8px' }}>
                            Session configuration
                        </span>
                        <h1 style={{ fontSize: '1.375rem', fontWeight: 600, margin: 0 }}>
                            Access Vortex-Gen aerospace platform
                        </h1>
                        <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                            Choose name-only device access, join a live workshop cohort, or sign in with an account
                        </p>
                    </div>

                    {/* 3-Mode Segmented Switcher */}
                    <div className="vg-segmented" role="tablist" aria-label="Access methods" style={{ width: '100%' }}>
                        <button
                            type="button"
                            role="tab"
                            aria-selected={mode === 'guest'}
                            className={`vg-segmented-btn ${mode === 'guest' ? 'active' : ''}`}
                            style={{ flex: 1 }}
                            onClick={() => {
                                setMode('guest');
                                setStatus(null);
                            }}
                        >
                            Guest (Name only)
                        </button>
                        <button
                            type="button"
                            role="tab"
                            aria-selected={mode === 'event'}
                            className={`vg-segmented-btn ${mode === 'event' ? 'active' : ''}`}
                            style={{ flex: 1 }}
                            onClick={() => {
                                setMode('event');
                                setStatus(null);
                            }}
                        >
                            Event code
                        </button>
                        <button
                            type="button"
                            role="tab"
                            aria-selected={mode === 'account'}
                            className={`vg-segmented-btn ${mode === 'account' ? 'active' : ''}`}
                            style={{ flex: 1 }}
                            onClick={() => {
                                setMode('account');
                                setStatus(null);
                            }}
                        >
                            Account
                        </button>
                    </div>

                    {/* Tab 1: Guest Access (Name Only + Device ID) */}
                    {mode === 'guest' && (
                        <form onSubmit={handleGuestSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label
                                    htmlFor="guest-display-name"
                                    style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '6px' }}
                                >
                                    Display name
                                </label>
                                <input
                                    id="guest-display-name"
                                    type="text"
                                    className="vg-input"
                                    placeholder="Your name or title (e.g. Dr. Ahmed)"
                                    value={nameInput}
                                    onChange={(e) => setNameInput(e.target.value)}
                                />
                            </div>

                            <div
                                className="vg-card-nested"
                                style={{
                                    padding: '12px 14px',
                                    background: 'var(--bg-canvas)',
                                    fontSize: '0.75rem',
                                    color: 'var(--text-secondary)',
                                    lineHeight: 1.55,
                                }}
                            >
                                Your progress and quiz scores are automatically saved to hardware fingerprint{' '}
                                <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)', fontWeight: 600 }}>
                                    {deviceFingerprint}
                                </code>
                                . The session host can upgrade your device to VIP access at any time without registration.
                            </div>

                            <button
                                type="submit"
                                disabled={submitting}
                                className="vg-btn vg-btn-primary vg-btn-lg"
                                style={{ width: '100%' }}
                            >
                                Continue as {nameInput.trim() || 'guest'}
                                <ArrowRight size={16} />
                            </button>
                        </form>
                    )}

                    {/* Tab 2: Live Event Cohort Join */}
                    {mode === 'event' && (
                        <form onSubmit={handleEventSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label
                                    htmlFor="event-display-name"
                                    style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '6px' }}
                                >
                                    Participant name
                                </label>
                                <input
                                    id="event-display-name"
                                    type="text"
                                    className="vg-input"
                                    placeholder="Your name"
                                    value={nameInput}
                                    onChange={(e) => setNameInput(e.target.value)}
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="event-cohort-code"
                                    style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '6px' }}
                                >
                                    6-character event code
                                </label>
                                <input
                                    id="event-cohort-code"
                                    type="text"
                                    className="vg-input"
                                    placeholder="VG-UNI26"
                                    value={codeInput}
                                    onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                                    style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}
                                />
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Select active cohort:</span>
                                {[
                                    { code: 'VG-YOUTH', label: 'Youth camp' },
                                    { code: 'VG-UNI26', label: 'University lab' },
                                    { code: 'VG-VIP01', label: 'VIP / Faculty' },
                                ].map((item) => (
                                    <button
                                        key={item.code}
                                        type="button"
                                        onClick={() => setCodeInput(item.code)}
                                        className={`vg-badge ${codeInput === item.code ? 'vg-badge-accent' : ''}`}
                                        style={{ cursor: 'pointer', fontFamily: 'var(--font-mono)' }}
                                    >
                                        {item.code} ({item.label})
                                    </button>
                                ))}
                            </div>

                            <button
                                type="submit"
                                disabled={submitting}
                                className="vg-btn vg-btn-primary vg-btn-lg"
                                style={{ width: '100%' }}
                            >
                                Join event cohort
                                <ArrowRight size={16} />
                            </button>
                        </form>
                    )}

                    {/* Tab 3: Registered Account Sign-In / Sign-Up */}
                    {mode === 'account' && (
                        <form onSubmit={handleAccountSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            {isSignUp && (
                                <div>
                                    <label
                                        htmlFor="account-name"
                                        style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '6px' }}
                                    >
                                        Full name
                                    </label>
                                    <input
                                        id="account-name"
                                        type="text"
                                        className="vg-input"
                                        placeholder="Your name"
                                        value={nameInput}
                                        onChange={(e) => setNameInput(e.target.value)}
                                    />
                                </div>
                            )}
                            <div>
                                <label
                                    htmlFor="account-email"
                                    style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '6px' }}
                                >
                                    Email address
                                </label>
                                <input
                                    id="account-email"
                                    type="email"
                                    className="vg-input"
                                    placeholder="name@university.edu"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                            <div>
                                <label
                                    htmlFor="account-password"
                                    style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '6px' }}
                                >
                                    Password
                                </label>
                                <input
                                    id="account-password"
                                    type="password"
                                    className="vg-input"
                                    placeholder="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={submitting}
                                className="vg-btn vg-btn-primary vg-btn-lg"
                                style={{ width: '100%' }}
                            >
                                {isSignUp ? 'Create account' : 'Sign in'}
                            </button>

                            <button
                                type="button"
                                onClick={() => setIsSignUp((v) => !v)}
                                className="vg-btn vg-btn-ghost vg-btn-sm"
                            >
                                {isSignUp
                                    ? 'Already have an account? Sign in'
                                    : 'Need an account? Register'}
                            </button>
                        </form>
                    )}

                    {status && (
                        <div
                            style={{
                                padding: '10px 12px',
                                borderRadius: 'var(--radius-xs)',
                                fontSize: '0.8125rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                background:
                                    status.type === 'error'
                                        ? 'var(--status-danger-subtle)'
                                        : 'var(--status-success-subtle)',
                                color:
                                    status.type === 'error'
                                        ? 'var(--status-danger)'
                                        : 'var(--status-success)',
                            }}
                        >
                            {status.type === 'error' ? <AlertCircle size={15} /> : <CheckCircle2 size={15} />}
                            <span>{status.message}</span>
                        </div>
                    )}
                </div>

                {/* Right Column: Active Device Telemetry & Tier Comparison */}
                <div
                    className="vg-card"
                    style={{
                        padding: '28px',
                        background: 'var(--bg-surface)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '20px',
                    }}
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Cpu size={20} style={{ color: 'var(--accent-primary)' }} />
                            <div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                    Active device session
                                </div>
                                <div
                                    style={{
                                        fontFamily: 'var(--font-mono)',
                                        fontSize: '1rem',
                                        fontWeight: 600,
                                        color: 'var(--text-primary)',
                                    }}
                                >
                                    {deviceFingerprint}
                                </div>
                            </div>
                        </div>

                        <div
                            className="vg-card-nested"
                            style={{
                                padding: '16px',
                                background: 'var(--bg-canvas)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Current display name</span>
                                <strong>{displayName || 'Guest'}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Access tier</span>
                                <span className="vg-badge vg-badge-accent">{tierPolicy?.label}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Unlocked hangar subsystems</span>
                                <strong className="vg-tabular">
                                    {tierPolicy?.unlockedSubsystems?.length || 2} / 5
                                </strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Unlocked cockpit stations</span>
                                <strong className="vg-tabular">
                                    {tierPolicy?.unlockedCockpitModes?.length || 1} / 3
                                </strong>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ fontSize: '0.8125rem', fontWeight: 600 }}>
                                How live host override works
                            </div>
                            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
                                When you enter your name as a guest, your session appears immediately in the founder host console. The host can elevate your device to VIP or University Cohort access with a single click—no password or page reload required.
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => navigate('/admin')}
                        className="vg-btn vg-btn-secondary"
                        style={{ width: '100%' }}
                    >
                        <Shield size={15} />
                        Open founder host console
                    </button>
                </div>
            </div>
        </div>
    );
}

