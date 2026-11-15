import React from 'react';

/**
 * ============================================================================
 * VORTEX-GEN — OFFICIAL VECTOR WINGED "V" CREST & LOCKUP
 * Faithfully recreates the Vortex-Gen "FLY HIGHER" brand crest as an
 * ultra-crisp scalable SVG with metallic chrome, electric jet-stream blue,
 * and afterburner gold gradients — zero pixelated JPEG box borders!
 * ============================================================================
 */
export default function VortexLogo({
  size = 38,
  showText = true,
  subtitle = 'FLY HIGHER',
  variant = 'header', // 'header' | 'hero'
}) {
  const isHero = variant === 'hero';
  const crestWidth = isHero ? size * 1.45 : size * 1.28;
  const crestHeight = size;

  return (
    <div
      className="vg-logo-lockup"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: isHero ? '16px' : '10px',
        userSelect: 'none',
      }}
    >
      {/* Winged "V" + Golden Orbital Swoosh SVG Emblem */}
      <div
        className="vg-logo-emblem"
        style={{
          position: 'relative',
          width: `${crestWidth}px`,
          height: `${crestHeight}px`,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <svg
          viewBox="0 0 160 116"
          width="100%"
          height="100%"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{
            filter: 'drop-shadow(0 4px 14px rgba(46, 139, 255, 0.38))',
            overflow: 'visible',
          }}
        >
          <defs>
            {/* Metallic Chrome Gradient */}
            <linearGradient id="vgChrome" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="38%" stopColor="#DCE8F8" />
              <stop offset="72%" stopColor="#8AA4C8" />
              <stop offset="100%" stopColor="#E8F1FF" />
            </linearGradient>

            {/* Electric Jet-Stream Blue Gradient */}
            <linearGradient id="vgElectricBlue" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#5CE1FF" />
              <stop offset="45%" stopColor="#2E8BFF" />
              <stop offset="100%" stopColor="#0C3B8C" />
            </linearGradient>

            {/* Deep Sapphire Inner Wing Gradient */}
            <linearGradient id="vgDeepBlue" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0A2766" />
              <stop offset="55%" stopColor="#1D68E0" />
              <stop offset="100%" stopColor="#49C6FF" />
            </linearGradient>

            {/* Afterburner Gold Orbital Swoosh Gradient */}
            <linearGradient id="vgGoldSwoosh" x1="0%" y1="50%" x2="100%" y2="20%">
              <stop offset="0%" stopColor="#FFF3B0" />
              <stop offset="40%" stopColor="#F4B740" />
              <stop offset="80%" stopColor="#D97706" />
              <stop offset="100%" stopColor="#FEF08A" />
            </linearGradient>
          </defs>

          {/* Back Orbital Swoosh Arc (Behind Wings) */}
          <path
            d="M 22 72 C 4 56, 28 32, 82 28 C 126 24, 154 38, 144 56"
            stroke="url(#vgElectricBlue)"
            strokeWidth="3.2"
            strokeLinecap="round"
            opacity="0.55"
          />

          {/* Left Swept Wing — 3 Tiered Aerodynamic Feathers */}
          <path
            d="M 4 22 L 58 46 L 48 56 L 12 34 Z"
            fill="url(#vgChrome)"
          />
          <path
            d="M 12 38 L 62 56 L 52 65 L 20 48 Z"
            fill="url(#vgElectricBlue)"
          />
          <path
            d="M 24 52 L 66 66 L 58 74 L 32 60 Z"
            fill="url(#vgDeepBlue)"
          />

          {/* Right Swept Wing — 3 Tiered Aerodynamic Feathers */}
          <path
            d="M 156 22 L 102 46 L 112 56 L 148 34 Z"
            fill="url(#vgChrome)"
          />
          <path
            d="M 148 38 L 98 56 L 108 65 L 140 48 Z"
            fill="url(#vgElectricBlue)"
          />
          <path
            d="M 136 52 L 94 66 L 102 74 L 128 60 Z"
            fill="url(#vgDeepBlue)"
          />

          {/* Central Iconic Winged "V" Chevron */}
          {/* Left Outer Chrome Blade of V */}
          <path
            d="M 42 18 L 80 102 L 80 74 L 58 24 Z"
            fill="url(#vgChrome)"
          />
          {/* Right Outer Electric-Blue Blade of V */}
          <path
            d="M 118 18 L 80 102 L 80 74 L 102 24 Z"
            fill="url(#vgElectricBlue)"
          />
          {/* Inner Faceted Core of V */}
          <path
            d="M 59 24 L 80 72 L 101 24 L 91 21 L 80 48 L 69 21 Z"
            fill="url(#vgDeepBlue)"
          />

          {/* Foreground Golden & Cyan Orbital Swoosh Wrapping Over the "V" */}
          <path
            d="M 18 68 C 32 92, 98 88, 146 46 C 132 76, 62 98, 18 68 Z"
            fill="url(#vgGoldSwoosh)"
          />
          <path
            d="M 26 75 C 54 94, 112 84, 149 42"
            stroke="url(#vgChrome)"
            strokeWidth="2.2"
            strokeLinecap="round"
          />

          {/* 4-Point Star Flare at Apex of Orbital Swoosh */}
          <g transform="translate(145, 43)">
            <path
              d="M 0 -10 L 2.2 -2.2 L 10 0 L 2.2 2.2 L 0 10 L -2.2 2.2 L -10 0 L -2.2 -2.2 Z"
              fill="#FFFBEB"
            />
            <circle cx="0" cy="0" r="3" fill="#F4B740" />
          </g>
        </svg>
      </div>

      {/* Brand Wordmark Lockup */}
      {showText && (
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.05 }}>
          <div
            className="vg-display"
            style={{
              fontSize: isHero ? 'clamp(1.65rem, 2.8vw, 2.35rem)' : '1.05rem',
              fontWeight: 800,
              letterSpacing: '0.03em',
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
            }}
          >
            <span style={{ color: 'var(--text-primary)' }}>VORTEX</span>
            <span style={{ color: 'var(--accent-gold)' }}>-</span>
            <span className="vg-text-brand">GEN</span>
          </div>
          {subtitle && (
            <span
              className="mono"
              style={{
                fontSize: isHero ? '0.72rem' : '0.6rem',
                letterSpacing: '0.24em',
                color: 'var(--accent-gold)',
                fontWeight: 700,
                marginTop: '3px',
              }}
            >
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
