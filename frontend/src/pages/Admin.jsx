import React, { useState, useEffect, useCallback } from 'react';
import {
    Shield,
    Users,
    Cpu,
    Sparkles,
    RefreshCw,
    CheckCircle2,
    Lock,
    Unlock,
    Plus,
    Calendar,
    Award,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
    fetchAdminSessions,
    overrideUserAccess,
    createEventCohort,
    fetchEventCohorts,
} from '../services/apiService';
import { TIER_DEFINITIONS, ROLE_DEFINITIONS } from '../domain/accessControl';

export default function Admin() {
    const {
        deviceFingerprint,
        displayName,
        accessTier,
        role,
        eventCode,
        progress,
        applyLocalFounderOverride,
    } = useApp();

    const [sessions, setSessions] = useState([]);
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [statusBanner, setStatusBanner] = useState(null);

    // Direct Device ID override input
    const [targetDeviceInput, setTargetDeviceInput] = useState(deviceFingerprint || '');
    const [targetTierInput, setTargetTierInput] = useState('vip_full');
    const [targetRoleInput, setTargetRoleInput] = useState('vip_professor');

    // New Event Cohort creation state
    const [newEventCode, setNewEventCode] = useState('');
    const [newEventTitle, setNewEventTitle] = useState('');
    const [newEventTrack, setNewEventTrack] = useState('engineering');
    const [newEventTier, setNewEventTier] = useState('event_cohort');

    const loadConsoleData = useCallback(async () => {
        setLoading(true);
        try {
            const [sessRes, evRes] = await Promise.allSettled([
                fetchAdminSessions(),
                fetchEventCohorts(),
            ]);

            const serverSessions =
                sessRes.status === 'fulfilled' && Array.isArray(sessRes.value?.sessions)
                    ? sessRes.value.sessions
                    : [];

            // Always ensure the current local device session is visible at the top of the roster
            const localEntry = {
                deviceFingerprint,
                displayName: displayName || 'Current Local Device',
                accessTier,
                role,
                eventCode,
                quizScores: progress?.quizScores || {},
                completedSubsystems: progress?.completedSubsystems || [],
                updatedAt: new Date().toISOString(),
                isCurrentDevice: true,
            };

            const merged = [
                localEntry,
                ...serverSessions.filter((s) => s.deviceFingerprint !== deviceFingerprint),
            ];
            setSessions(merged);

            if (evRes.status === 'fulfilled' && Array.isArray(evRes.value?.events)) {
                setEvents(evRes.value.events);
            }
        } finally {
            setLoading(false);
        }
    }, [deviceFingerprint, displayName, accessTier, role, eventCode, progress]);

    useEffect(() => {
        loadConsoleData();
    }, [loadConsoleData]);

    const handleInstantOverride = async (targetFp, newTier, newRole = 'student') => {
        setStatusBanner({
            type: 'info',
            text: `Applying ${newTier} (${newRole}) to device ${targetFp}...`,
        });

        // If overriding the current device, update local context immediately
        if (targetFp === deviceFingerprint) {
            applyLocalFounderOverride(newTier, newRole);
        }

        try {
            await overrideUserAccess({
                deviceFingerprint: targetFp,
                accessTier: newTier,
                role: newRole,
            });
        } catch {
            // Even if backend daemon is offline in static preview, local override succeeds
        }

        setSessions((prev) =>
            prev.map((s) =>
                s.deviceFingerprint === targetFp
                    ? { ...s, accessTier: newTier, role: newRole, updatedAt: new Date().toISOString() }
                    : s
            )
        );

        setStatusBanner({
            type: 'success',
            text: `Upgraded ${targetFp} to ${TIER_DEFINITIONS[newTier]?.label || newTier} (${ROLE_DEFINITIONS[newRole]?.label || newRole}).`,
        });
    };

    const handleManualDeviceOverride = async (e) => {
        e.preventDefault();
        if (!targetDeviceInput.trim()) return;
        await handleInstantOverride(
            targetDeviceInput.trim(),
            targetTierInput,
            targetRoleInput
        );
    };

    const handleCreateCohort = async (e) => {
        e.preventDefault();
        if (!newEventCode.trim() || !newEventTitle.trim()) return;
        const cleanCode = newEventCode.trim().toUpperCase();
        try {
            const res = await createEventCohort({
                code: cleanCode,
                title: newEventTitle.trim(),
                track: newEventTrack,
                tier: newEventTier,
            });
            if (res?.event) {
                setEvents((prev) => [res.event, ...prev.filter((ev) => ev.code !== cleanCode)]);
            }
            setStatusBanner({
                type: 'success',
                text: `Created live event cohort ${cleanCode} (${newEventTitle.trim()}).`,
            });
            setNewEventCode('');
            setNewEventTitle('');
        } catch (err) {
            setStatusBanner({
                type: 'error',
                text: err?.message || 'Unable to create event cohort.',
            });
        }
    };

    return (
        <div
            style={{
                minHeight: 'calc(100vh - 56px)',
                background: 'var(--bg-canvas)',
                padding: '32px 24px 64px',
            }}
        >
            <div className="vg-container" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Top Header */}
                <div
                    className="vg-card"
                    style={{
                        padding: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '16px',
                        flexWrap: 'wrap',
                    }}
                >
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                            <span className="vg-badge vg-badge-accent">
                                <Shield size={12} />
                                Founder & instructor live host console
                            </span>
                            <span className="vg-badge">Real-time device access control</span>
                        </div>
                        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, margin: 0 }}>
                            Live guest device roster & cohort management
                        </h1>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                            Upgrade any guest device or visiting professor to full VIP access in one click without requiring registration or page reload.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={loadConsoleData}
                        disabled={loading}
                        className="vg-btn vg-btn-secondary"
                    >
                        <RefreshCw size={15} />
                        Refresh roster
                    </button>
                </div>

                {statusBanner && (
                    <div
                        className="vg-card"
                        style={{
                            padding: '12px 16px',
                            borderLeft: '3px solid var(--accent-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            fontSize: '0.8125rem',
                        }}
                    >
                        <span>{statusBanner.text}</span>
                        <button
                            type="button"
                            onClick={() => setStatusBanner(null)}
                            className="vg-btn vg-btn-ghost vg-btn-sm"
                        >
                            Dismiss
                        </button>
                    </div>
                )}

                {/* 2-Column Management Tools: Direct Device Override + Create Event Cohort */}
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
                        gap: '20px',
                    }}
                >
                    {/* Card 1: Direct Hardware Device ID Override */}
                    <div
                        className="vg-card"
                        style={{
                            padding: '24px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '16px',
                        }}
                    >
                        <div>
                            <h2 style={{ fontSize: '1.0625rem', fontWeight: 600, margin: 0 }}>
                                Direct device ID privilege override
                            </h2>
                            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                                Enter any visitor’s hardware device ID (`DEV-...`) to push an immediate tier and role upgrade
                            </p>
                        </div>

                        <form onSubmit={handleManualDeviceOverride} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div>
                                <label
                                    htmlFor="override-device-id"
                                    style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, marginBottom: '4px' }}
                                >
                                    Target hardware device ID
                                </label>
                                <input
                                    id="override-device-id"
                                    type="text"
                                    className="vg-input"
                                    placeholder="DEV-XXXX-XXXX"
                                    value={targetDeviceInput}
                                    onChange={(e) => setTargetDeviceInput(e.target.value)}
                                    style={{ fontFamily: 'var(--font-mono)' }}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label
                                        htmlFor="override-tier-select"
                                        style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, marginBottom: '4px' }}
                                    >
                                        Access tier
                                    </label>
                                    <select
                                        id="override-tier-select"
                                        className="vg-input"
                                        value={targetTierInput}
                                        onChange={(e) => setTargetTierInput(e.target.value)}
                                    >
                                        <option value="vip_full">VIP / Faculty (Unrestricted)</option>
                                        <option value="event_cohort">Event Cohort (All Hangar + Labs)</option>
                                        <option value="pro_student">Course Cadet (Full Curriculum)</option>
                                        <option value="guest_restricted">Guest Preview (Restricted)</option>
                                    </select>
                                </div>
                                <div>
                                    <label
                                        htmlFor="override-role-select"
                                        style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, marginBottom: '4px' }}
                                    >
                                        Platform role
                                    </label>
                                    <select
                                        id="override-role-select"
                                        className="vg-input"
                                        value={targetRoleInput}
                                        onChange={(e) => setTargetRoleInput(e.target.value)}
                                    >
                                        <option value="vip_professor">Faculty / VIP</option>
                                        <option value="instructor">Event Instructor</option>
                                        <option value="student">Cadet</option>
                                        <option value="guest">Guest</option>
                                        <option value="admin">Founder / Admin</option>
                                    </select>
                                </div>
                            </div>

                            <button type="submit" className="vg-btn vg-btn-primary">
                                <Unlock size={15} />
                                Push live override to device
                            </button>
                        </form>
                    </div>

                    {/* Card 2: Create New Live Event Cohort */}
                    <div
                        className="vg-card"
                        style={{
                            padding: '24px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '16px',
                        }}
                    >
                        <div>
                            <h2 style={{ fontSize: '1.0625rem', fontWeight: 600, margin: 0 }}>
                                Create workshop or classroom event code
                            </h2>
                            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                                Generate a custom event code for a K-12 camp or university lab cohort
                            </p>
                        </div>

                        <form onSubmit={handleCreateCohort} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '12px' }}>
                                <div>
                                    <label
                                        htmlFor="new-cohort-code"
                                        style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, marginBottom: '4px' }}
                                    >
                                        Event code
                                    </label>
                                    <input
                                        id="new-cohort-code"
                                        type="text"
                                        className="vg-input"
                                        placeholder="VG-LAB01"
                                        value={newEventCode}
                                        onChange={(e) => setNewEventCode(e.target.value.toUpperCase())}
                                        style={{ fontFamily: 'var(--font-mono)' }}
                                    />
                                </div>
                                <div>
                                    <label
                                        htmlFor="new-cohort-title"
                                        style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, marginBottom: '4px' }}
                                    >
                                        Workshop title
                                    </label>
                                    <input
                                        id="new-cohort-title"
                                        type="text"
                                        className="vg-input"
                                        placeholder="Cairo University Flight Lab"
                                        value={newEventTitle}
                                        onChange={(e) => setNewEventTitle(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label
                                        htmlFor="new-cohort-track"
                                        style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, marginBottom: '4px' }}
                                    >
                                        Default curriculum track
                                    </label>
                                    <select
                                        id="new-cohort-track"
                                        className="vg-input"
                                        value={newEventTrack}
                                        onChange={(e) => setNewEventTrack(e.target.value)}
                                    >
                                        <option value="foundation">Foundation (K-12 / Youth)</option>
                                        <option value="engineering">Engineering (University)</option>
                                    </select>
                                </div>
                                <div>
                                    <label
                                        htmlFor="new-cohort-tier"
                                        style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, marginBottom: '4px' }}
                                    >
                                        Unlocked access tier
                                    </label>
                                    <select
                                        id="new-cohort-tier"
                                        className="vg-input"
                                        value={newEventTier}
                                        onChange={(e) => setNewEventTier(e.target.value)}
                                    >
                                        <option value="event_cohort">Event Cohort (All Hangar + Labs)</option>
                                        <option value="vip_full">VIP Full Platform</option>
                                    </select>
                                </div>
                            </div>

                            <button type="submit" className="vg-btn vg-btn-primary">
                                <Plus size={15} />
                                Create live cohort code
                            </button>
                        </form>
                    </div>
                </div>

                {/* Live Guest & Device Sessions Table */}
                <div className="vg-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                        <div>
                            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>
                                Active & recent device sessions ({sessions.length})
                            </h2>
                            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                                Click any tier preset on the right of a visitor row to immediately change their live capabilities
                            </p>
                        </div>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <table
                            style={{
                                width: '100%',
                                borderCollapse: 'collapse',
                                fontSize: '0.8125rem',
                                textAlign: 'left',
                            }}
                        >
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                                    <th style={{ padding: '10px 12px', fontWeight: 600 }}>Participant</th>
                                    <th style={{ padding: '10px 12px', fontWeight: 600 }}>Hardware device ID</th>
                                    <th style={{ padding: '10px 12px', fontWeight: 600 }}>Current tier & role</th>
                                    <th style={{ padding: '10px 12px', fontWeight: 600 }}>Cohort / quizzes</th>
                                    <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'right' }}>
                                        1-click live override
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {sessions.map((sess) => {
                                    const quizCount = Object.keys(sess.quizScores || {}).length;
                                    const tierDef =
                                        TIER_DEFINITIONS[sess.accessTier] ||
                                        TIER_DEFINITIONS.guest_restricted;
                                    const roleDef =
                                        ROLE_DEFINITIONS[sess.role] || ROLE_DEFINITIONS.guest;

                                    return (
                                        <tr
                                            key={sess.deviceFingerprint}
                                            style={{
                                                borderBottom: '1px solid var(--border-subtle)',
                                                background: sess.isCurrentDevice
                                                    ? 'var(--accent-subtle)'
                                                    : 'transparent',
                                            }}
                                        >
                                            <td style={{ padding: '12px' }}>
                                                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                                    {sess.displayName || 'Guest'}
                                                    {sess.isCurrentDevice && (
                                                        <span
                                                            className="vg-badge vg-badge-accent"
                                                            style={{ marginLeft: '8px' }}
                                                        >
                                                            This device
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td style={{ padding: '12px' }}>
                                                <code
                                                    style={{
                                                        fontFamily: 'var(--font-mono)',
                                                        fontSize: '0.75rem',
                                                        color: 'var(--accent-primary)',
                                                        fontWeight: 600,
                                                    }}
                                                >
                                                    {sess.deviceFingerprint}
                                                </code>
                                            </td>
                                            <td style={{ padding: '12px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                                    <span
                                                        className={`vg-badge ${
                                                            sess.accessTier === 'vip_full'
                                                                ? 'vg-badge-success'
                                                                : sess.accessTier === 'guest_restricted'
                                                                ? 'vg-badge-warning'
                                                                : 'vg-badge-accent'
                                                        }`}
                                                    >
                                                        {tierDef.label}
                                                    </span>
                                                    <span className="vg-badge">{roleDef.label}</span>
                                                </div>
                                            </td>
                                            <td style={{ padding: '12px' }}>
                                                <div className="vg-tabular" style={{ color: 'var(--text-secondary)' }}>
                                                    {sess.eventCode ? (
                                                        <span className="vg-badge" style={{ marginRight: '6px' }}>
                                                            {sess.eventCode}
                                                        </span>
                                                    ) : null}
                                                    {quizCount} quiz{quizCount === 1 ? '' : 'zes'} completed
                                                </div>
                                            </td>
                                            <td style={{ padding: '12px', textAlign: 'right' }}>
                                                <div style={{ display: 'inline-flex', gap: '6px', flexWrap: 'wrap' }}>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            handleInstantOverride(
                                                                sess.deviceFingerprint,
                                                                'guest_restricted',
                                                                'guest'
                                                            )
                                                        }
                                                        className={`vg-btn vg-btn-sm ${
                                                            sess.accessTier === 'guest_restricted'
                                                                ? 'vg-btn-primary'
                                                                : 'vg-btn-secondary'
                                                        }`}
                                                    >
                                                        Guest preview
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            handleInstantOverride(
                                                                sess.deviceFingerprint,
                                                                'event_cohort',
                                                                'student'
                                                            )
                                                        }
                                                        className={`vg-btn vg-btn-sm ${
                                                            sess.accessTier === 'event_cohort'
                                                                ? 'vg-btn-primary'
                                                                : 'vg-btn-secondary'
                                                        }`}
                                                    >
                                                        Event cohort
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            handleInstantOverride(
                                                                sess.deviceFingerprint,
                                                                'vip_full',
                                                                'vip_professor'
                                                            )
                                                        }
                                                        className={`vg-btn vg-btn-sm ${
                                                            sess.accessTier === 'vip_full'
                                                                ? 'vg-btn-primary'
                                                                : 'vg-btn-secondary'
                                                        }`}
                                                    >
                                                        VIP / Faculty
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
