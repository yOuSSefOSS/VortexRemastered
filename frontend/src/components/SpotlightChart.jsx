import React, { useState, useMemo } from 'react';
import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ReferenceLine,
} from 'recharts';
import { computeAnalyticalAero, formatNacaCode } from '../domain/nacaGeometry';
import { computeWingPlanformAero } from '../domain/flightMechanics';

const CHART_MODES = [
    { id: 'cl_aoa', label: 'Lift curve (CL vs α)', xKey: 'aoa', yKey: 'cl', xUnit: '°', yLabel: 'CL' },
    { id: 'cd_aoa', label: 'Drag curve (CD vs α)', xKey: 'aoa', yKey: 'cd', xUnit: '°', yLabel: 'CD' },
    { id: 'polar', label: 'Drag polar (CL vs CD)', xKey: 'cd', yKey: 'cl', xUnit: '', yLabel: 'CL' },
    { id: 'cm_aoa', label: 'Pitching moment (CM vs α)', xKey: 'aoa', yKey: 'cm', xUnit: '°', yLabel: 'CM' },
];

export default function SpotlightChart({
    shape = { camber: 2, maxCamberLoc: 4, thickness: 12, aoa: 4 },
    compareShape = null,
    flapDeg = 0,
    slatDeg = 0,
    sweepDeg = 0,
    aspectRatio = 8.5,
    mach = 0.2,
    reynolds = 1000000,
    activeMetrics = null,
}) {
    const [chartMode, setChartMode] = useState('cl_aoa');

    const activeModeConfig = CHART_MODES.find((m) => m.id === chartMode) || CHART_MODES[0];
    const primaryCode = formatNacaCode(shape.camber, shape.maxCamberLoc, shape.thickness);
    const baseCamber = compareShape?.camber ?? 0;
    const baseMaxCamberLoc = compareShape?.maxCamberLoc ?? 0;
    const baseThickness = compareShape?.thickness ?? 12;
    const baselineCode = compareShape
        ? formatNacaCode(baseCamber, baseMaxCamberLoc, baseThickness)
        : 'NACA 0012 baseline';

    // Sweep AoA from -8° to +22° to build smooth polar curves for both primary and baseline
    const curveData = useMemo(() => {
        const points = [];
        for (let alpha = -8; alpha <= 22; alpha += 1) {
            const rawPrimary = computeAnalyticalAero(
                shape.camber,
                shape.maxCamberLoc,
                shape.thickness,
                alpha,
                reynolds
            );
            const planformPrimary = computeWingPlanformAero({
                cl2D: rawPrimary.cl,
                cd2D: rawPrimary.cd,
                cm2D: rawPrimary.cm,
                aoaDeg: alpha,
                aspectRatio,
                sweepDeg,
                mach,
                thicknessRatio: shape.thickness / 100,
                flapDeg,
                slatDeg,
            });

            const rawBaseline = computeAnalyticalAero(
                baseCamber,
                baseMaxCamberLoc,
                baseThickness,
                alpha,
                reynolds
            );

            points.push({
                aoa: alpha,
                cl: Number(planformPrimary.cl3D.toFixed(3)),
                cd: Number(planformPrimary.cdTotal.toFixed(4)),
                cm: Number(planformPrimary.cm3D.toFixed(3)),
                baseline_cl: Number(rawBaseline.cl.toFixed(3)),
                baseline_cd: Number(rawBaseline.cd.toFixed(4)),
                baseline_cm: Number(rawBaseline.cm.toFixed(3)),
            });
        }
        return points;
    }, [
        shape.camber,
        shape.maxCamberLoc,
        shape.thickness,
        baseCamber,
        baseMaxCamberLoc,
        baseThickness,
        flapDeg,
        slatDeg,
        sweepDeg,
        aspectRatio,
        mach,
        reynolds,
    ]);

    // Compute explicit delta at the current operating AoA
    const currentRow = useMemo(() => {
        const roundedAoa = Math.round(shape.aoa);
        return (
            curveData.find((d) => d.aoa === roundedAoa) ||
            curveData[Math.floor(curveData.length / 2)]
        );
    }, [curveData, shape.aoa]);

    const currentCl = activeMetrics?.cl ?? currentRow?.cl ?? 0;
    const currentCd = activeMetrics?.cd ?? currentRow?.cd ?? 0.012;
    const currentLd = currentCd > 0.0001 ? currentCl / currentCd : 0;
    const baselineLd =
        currentRow?.baseline_cd > 0.0001
            ? currentRow.baseline_cl / currentRow.baseline_cd
            : 0;
    const ldDelta = currentLd - baselineLd;

    return (
        <div
            className="vg-card"
            style={{
                padding: '16px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
            }}
        >
            {/* Header & Segmented Switcher */}
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, margin: 0 }}>
                            {activeModeConfig.label}
                        </h3>
                        <span className="vg-badge vg-badge-accent">{primaryCode}</span>
                        <span className="vg-badge">vs {baselineCode}</span>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                        Operating point α = {Number(shape.aoa).toFixed(1)}° | L/D ={' '}
                        <strong className="vg-tabular">{currentLd.toFixed(1)}</strong> (
                        <span
                            className="vg-tabular"
                            style={{
                                color:
                                    ldDelta >= 0 ? 'var(--status-success)' : 'var(--status-danger)',
                                fontWeight: 600,
                            }}
                        >
                            {ldDelta >= 0 ? '+' : ''}
                            {ldDelta.toFixed(1)} vs {baselineCode}
                        </span>
                        )
                    </p>
                </div>

                <div className="vg-segmented" role="tablist" aria-label="Aerodynamic chart view">
                    {CHART_MODES.map((m) => (
                        <button
                            key={m.id}
                            type="button"
                            role="tab"
                            aria-selected={chartMode === m.id}
                            className={`vg-segmented-btn ${chartMode === m.id ? 'active' : ''}`}
                            onClick={() => setChartMode(m.id)}
                        >
                            {m.label.split(' (')[0]}
                        </button>
                    ))}
                </div>
            </div>

            {/* Single-Spotlight Recharts Canvas */}
            <div style={{ width: '100%', height: '210px' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={curveData} margin={{ top: 8, right: 16, left: -12, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                        <XAxis
                            dataKey={activeModeConfig.xKey}
                            type="number"
                            domain={['auto', 'auto']}
                            tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                            tickFormatter={(v) =>
                                activeModeConfig.xKey === 'cd' ? v.toFixed(2) : `${v}°`
                            }
                        />
                        <YAxis
                            tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                            domain={['auto', 'auto']}
                        />
                        <Tooltip
                            contentStyle={{
                                background: 'var(--bg-surface)',
                                border: '1px solid var(--border-strong)',
                                borderRadius: 'var(--radius-xs)',
                                fontSize: '0.75rem',
                                fontVariantNumeric: 'tabular-nums',
                                color: 'var(--text-primary)',
                            }}
                            labelFormatter={(label) =>
                                activeModeConfig.xKey === 'cd'
                                    ? `CD = ${Number(label).toFixed(4)}`
                                    : `Angle of attack α = ${label}°`
                            }
                        />
                        {activeModeConfig.xKey === 'aoa' && (
                            <ReferenceLine
                                x={Math.round(shape.aoa)}
                                stroke="var(--accent-primary)"
                                strokeDasharray="4 4"
                            />
                        )}
                        {/* Baseline / Comparison Curve (Neutral Dashed) */}
                        <Line
                            type="monotone"
                            dataKey={`baseline_${activeModeConfig.yKey}`}
                            name={baselineCode}
                            stroke="var(--text-tertiary)"
                            strokeWidth={1.75}
                            strokeDasharray="4 4"
                            dot={false}
                            isAnimationActive={false}
                        />
                        {/* Active Primary Curve (Single Aviation Royal Blue Accent) */}
                        <Line
                            type="monotone"
                            dataKey={activeModeConfig.yKey}
                            name={primaryCode}
                            stroke="var(--accent-primary)"
                            strokeWidth={2.5}
                            dot={false}
                            isAnimationActive={false}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
