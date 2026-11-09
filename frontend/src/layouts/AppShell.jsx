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
  UserCheck,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

const NAV_ITEMS = [
  { to: '/explore', label: 'Explore hangar', icon: Compass },
  { to: '/lab', label: 'Simulation cockpit', icon: Sliders },
  { to: '/events', label: 'Events & cohorts', icon: Users },
  { to: '/admin', label: 'Host console', icon: ShieldCheck },
];

export default function AppShell({ children, fullBleed = false }) {
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
    signOut,
  } = useApp();

  return (
    <div className="min-h-dvh flex flex-col bg-[var(--bg-canvas)] text-[var(--text-primary)]">
      {/* 56px (14 * 4px) Unified Top Navigation Bar */}
      <header className="h-14 flex-shrink-0 bg-[var(--bg-surface)] border-b border-[var(--border-default)] px-4 lg:px-6 flex items-center justify-between gap-4 z-40">
        {/* Left: Brand & Primary Navigation */}
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-3 text-[var(--text-primary)] no-underline">
            <img
              src="/brand/logo-icon.jpg"
              alt="Vortex-Gen"
              className="w-8 h-8 rounded-[6px] object-cover border border-[var(--border-default)]"
            />
            <div className="flex flex-col">
              <span className="text-[15px] leading-5 font-semibold tracking-[-0.01em]">
                Vortex-Gen
              </span>
              <span className="text-[11px] leading-4 text-[var(--text-muted)]">
                Aerospace education & simulation
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive =
                location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`h-9 px-3 rounded-[6px] inline-flex items-center gap-2 text-[13px] leading-5 font-medium transition-colors no-underline ${
                    isActive
                      ? 'bg-[var(--accent-subtle)] text-[var(--accent-primary)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]'
                  }`}
                >
                  <Icon size={16} strokeWidth={1.75} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right: Audience Depth Switcher, Session Badge & Theme Toggle */}
        <div className="flex items-center gap-3">
          {/* Curriculum Depth Switcher: Foundation (K-12) vs Engineering (University) */}
          <div
            className="hidden sm:flex items-center p-1 bg-[var(--bg-subtle)] border border-[var(--border-default)] rounded-[8px]"
            role="group"
            aria-label="Curriculum depth"
          >
            <button
              type="button"
              onClick={() => setAudienceTrack('foundation')}
              className={`h-7 px-3 rounded-[6px] text-[12px] leading-4 font-medium transition-colors cursor-pointer ${
                audienceTrack === 'foundation'
                  ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-default)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Foundation track
            </button>
            <button
              type="button"
              onClick={() => {
                if (!capabilities.allowEngineeringDepth) {
                  navigate('/login?reason=engineering_track');
                } else {
                  setAudienceTrack('engineering');
                }
              }}
              title={
                capabilities.allowEngineeringDepth
                  ? 'Switch to university engineering derivations'
                  : 'Enter an event code or request host unlock for engineering depth'
              }
              className={`h-7 px-3 rounded-[6px] inline-flex items-center gap-1.5 text-[12px] leading-4 font-medium transition-colors cursor-pointer ${
                audienceTrack === 'engineering'
                  ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-default)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {!capabilities.allowEngineeringDepth && <Lock size={12} />}
              <span>Engineering track</span>
            </button>
          </div>

          {/* Active Session / Device Identity Badge */}
          <Link
            to="/login"
            title={`Device ID: ${deviceFingerprint} — Click to switch session or enter event code`}
            className="hidden lg:inline-flex items-center gap-2 h-9 px-3 rounded-[6px] bg-[var(--bg-subtle)] border border-[var(--border-default)] hover:border-[var(--border-strong)] no-underline transition-colors"
          >
            <UserCheck size={15} className="text-[var(--accent-primary)]" />
            <span className="text-[13px] leading-5 font-medium text-[var(--text-primary)] max-w-[140px] truncate">
              {session.display_name}
            </span>
            <span
              className={`vg-badge ${
                session.access_tier === 'vip_full'
                  ? 'vg-badge-success'
                  : session.access_tier === 'pro_student' || session.access_tier === 'event_cohort'
                  ? 'vg-badge-accent'
                  : ''
              }`}
            >
              {capabilities.label}
            </span>
          </Link>

          {/* Theme Polarity Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle color theme"
            title={theme === 'light' ? 'Switch to dark interface' : 'Switch to daylight interface'}
            className="w-9 h-9 rounded-[6px] inline-flex items-center justify-center bg-[var(--bg-surface)] border border-[var(--border-default)] hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer transition-colors"
          >
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          </button>

          {session.is_initialized && (
            <button
              type="button"
              onClick={signOut}
              title="Reset guest or user session"
              className="hidden md:inline-flex w-9 h-9 rounded-[6px] items-center justify-center bg-[var(--bg-surface)] border border-[var(--border-default)] hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--status-danger)] cursor-pointer transition-colors"
            >
              <LogOut size={15} />
            </button>
          )}

          {/* Mobile Drawer Button */}
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="md:hidden w-9 h-9 rounded-[6px] inline-flex items-center justify-center border border-[var(--border-default)] text-[var(--text-primary)]"
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      {mobileOpen && (
        <div className="md:hidden bg-[var(--bg-surface)] border-b border-[var(--border-default)] p-4 flex flex-col gap-2 z-30">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className="h-10 px-3 rounded-[6px] flex items-center gap-3 text-[14px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] no-underline"
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </Link>
            );
          })}
          <Link
            to="/login"
            onClick={() => setMobileOpen(false)}
            className="h-10 px-3 rounded-[6px] flex items-center justify-between bg-[var(--bg-subtle)] text-[13px] font-medium text-[var(--text-primary)] no-underline mt-2"
          >
            <span>{session.display_name}</span>
            <span className="vg-badge vg-badge-accent">{capabilities.label}</span>
          </Link>
        </div>
      )}

      {/* Main Content Container */}
      <main className={`flex-1 flex flex-col min-h-0 ${fullBleed ? 'overflow-hidden' : ''}`}>
        {children}
      </main>
    </div>
  );
}
