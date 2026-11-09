import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, FileText } from 'lucide-react';

export function PrivacyPolicy() {
    return (
        <div
            style={{
                minHeight: 'calc(100vh - 56px)',
                background: 'var(--bg-canvas)',
                padding: '40px 24px 64px',
            }}
        >
            <div className="vg-container" style={{ maxWidth: '760px' }}>
                <div className="vg-card" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <Link
                        to="/"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '0.8125rem',
                            color: 'var(--accent-primary)',
                            textDecoration: 'none',
                            fontWeight: 500,
                        }}
                    >
                        <ArrowLeft size={14} />
                        Back to platform
                    </Link>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Shield size={18} style={{ color: 'var(--accent-primary)' }} />
                        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, margin: 0 }}>Privacy policy</h1>
                    </div>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.65, margin: 0 }}>
                        Vortex-Gen stores minimal telemetry necessary to preserve your aerospace curriculum progress, quiz scores, and workshop cohort assignment. When using guest mode, a deterministic hardware/browser fingerprint is used strictly to persist your progress across sessions and enable instructor-assisted tier upgrades during live academic events.
                    </p>
                    <h2 style={{ fontSize: '1.0625rem', fontWeight: 600, margin: '8px 0 0 0' }}>
                        Data collection & storage
                    </h2>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.65, margin: 0 }}>
                        We do not sell or share student or faculty data with third-party advertisers. Simulation parameters (airfoil coordinates, Reynolds numbers, and flight mechanics inputs) are processed ephemerally in memory for aerodynamic analysis.
                    </p>
                </div>
            </div>
        </div>
    );
}

export function TermsOfService() {
    return (
        <div
            style={{
                minHeight: 'calc(100vh - 56px)',
                background: 'var(--bg-canvas)',
                padding: '40px 24px 64px',
            }}
        >
            <div className="vg-container" style={{ maxWidth: '760px' }}>
                <div className="vg-card" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <Link
                        to="/"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '0.8125rem',
                            color: 'var(--accent-primary)',
                            textDecoration: 'none',
                            fontWeight: 500,
                        }}
                    >
                        <ArrowLeft size={14} />
                        Back to platform
                    </Link>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileText size={18} style={{ color: 'var(--accent-primary)' }} />
                        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, margin: 0 }}>Terms of service</h1>
                    </div>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.65, margin: 0 }}>
                        Vortex-Gen is an educational aerospace engineering and flight simulation platform intended for K-12 STEM instruction, university aerodynamics coursework, and conceptual wind-tunnel experimentation.
                    </p>
                    <h2 style={{ fontSize: '1.0625rem', fontWeight: 600, margin: '8px 0 0 0' }}>
                        Engineering disclaimer
                    </h2>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.65, margin: 0 }}>
                        Aerodynamic coefficients, longitudinal stability margins, and exported STL geometries are provided for academic instruction and sub-scale wind tunnel testing only and must not be used for certified manned flight hardware without independent airworthiness verification.
                    </p>
                </div>
            </div>
        </div>
    );
}

