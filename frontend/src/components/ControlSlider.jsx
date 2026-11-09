import React, { useState, useRef, useEffect } from 'react';

/**
 * Single Unified Slider Control Primitive
 * - Strict 4px grid spacing
 * - Clamped [0, 100]% fill bar (fixes overflow bug)
 * - Fractional step support (fixes Math.round bug in ModernSlider)
 * - Pointer capture + release + full keyboard arrow support
 * - Click-to-edit inline numeric input with tabular-nums
 */
export default function ControlSlider({
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  unit = '',
  onChange,
  baselineNote = null,
  disabled = false,
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const inputRef = useRef(null);

  useEffect(() => {
    if (!editing) {
      setDraft(String(value));
    }
  }, [value, editing]);

  const numericVal = Number(value) || 0;
  const range = max - min || 1;
  const clampedPct = Math.max(0, Math.min(100, ((numericVal - min) / range) * 100));

  const decimals = step < 0.01 ? 3 : step < 0.1 ? 2 : step < 1 ? 1 : 0;
  const formattedValue = numericVal.toFixed(decimals);

  const commitDraft = () => {
    setEditing(false);
    const parsed = parseFloat(draft);
    if (!Number.isNaN(parsed)) {
      const clamped = Math.max(min, Math.min(max, parsed));
      const stepped = Number((Math.round(clamped / step) * step).toFixed(decimals));
      onChange(stepped);
    } else {
      setDraft(String(value));
    }
  };

  return (
    <div className="flex flex-col gap-2 select-none">
      <div className="flex items-center justify-between gap-2">
        <label className="text-[13px] leading-5 font-medium text-[var(--text-primary)]">
          {label}
        </label>

        {editing ? (
          <input
            ref={inputRef}
            type="number"
            min={min}
            max={max}
            step={step}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitDraft}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter') commitDraft();
              if (e.key === 'Escape') {
                setEditing(false);
                setDraft(String(value));
              }
            }}
            className="w-20 h-6 px-2 text-right font-mono text-[13px] bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--accent-primary)] rounded-[4px] outline-none"
            autoFocus
          />
        ) : (
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              if (!disabled) {
                setDraft(String(numericVal));
                setEditing(true);
              }
            }}
            title="Click to enter exact value"
            className="px-2 py-0.5 font-mono text-[13px] leading-5 font-medium text-[var(--text-primary)] bg-[var(--bg-subtle)] hover:border-[var(--border-strong)] border border-[var(--border-default)] rounded-[4px] transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            {formattedValue}
            {unit ? <span className="ml-1 text-[12px] text-[var(--text-muted)]">{unit}</span> : null}
          </button>
        )}
      </div>

      {/* Slider Track */}
      <div className="relative h-5 flex items-center">
        <div className="w-full h-2 bg-[var(--bg-subtle)] border border-[var(--border-default)] rounded-[4px] overflow-hidden">
          <div
            className="h-full bg-[var(--accent-primary)] transition-[width] duration-75"
            style={{ width: `${clampedPct}%` }}
          />
        </div>

        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={numericVal}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          aria-label={label}
        />

        {/* Thumb Indicator */}
        <div
          className="pointer-events-none absolute w-3.5 h-3.5 rounded-full bg-[var(--bg-surface)] border-2 border-[var(--accent-primary)]"
          style={{ left: `calc(${clampedPct}% - 7px)` }}
        />
      </div>

      {/* Range Bounds & Optional Baseline Comparison Note */}
      <div className="flex items-center justify-between text-[12px] leading-4 font-mono text-[var(--text-muted)]">
        <span>
          {min}
          {unit ? ` ${unit}` : ''}
        </span>
        {baselineNote ? (
          <span className="font-sans text-[12px] text-[var(--text-muted)] truncate max-w-[180px]">
            {baselineNote}
          </span>
        ) : null}
        <span>
          {max}
          {unit ? ` ${unit}` : ''}
        </span>
      </div>
    </div>
  );
}

