import React, { useState, useMemo } from 'react';
import { X, Download, Box, Layers, Ruler } from 'lucide-react';
import {
    generateNaca4Coordinates,
    computeAirfoilAreaRatio,
    formatNacaCode,
} from '../domain/nacaGeometry';
import ControlSlider from './ControlSlider';

export default function Export3DModal({
    isOpen,
    onClose,
    shape = { camber: 2, maxCamberLoc: 4, thickness: 12, aoa: 4 },
}) {
    const [chordMm, setChordMm] = useState(120);
    const [spanMm, setSpanMm] = useState(200);
    const [infillPct, setInfillPct] = useState(20);
    const [wallPerimeters, setWallPerimeters] = useState(3);
    const [materialDensity, setMaterialDensity] = useState(1.24); // PLA 1.24 g/cm³

    const coords = useMemo(
        () => generateNaca4Coordinates(shape.camber, shape.maxCamberLoc, shape.thickness, 80),
        [shape.camber, shape.maxCamberLoc, shape.thickness]
    );

    // Exact dimensionless cross-sectional area A / c^2 via Shoelace polygon integration
    const areaRatio = useMemo(
        () => computeAirfoilAreaRatio(coords.coordinates),
        [coords.coordinates]
    );

    // Physical volume in cm³: A_ratio * (c_cm)^2 * (b_cm)
    const chordCm = chordMm / 10;
    const spanCm = spanMm / 10;
    const solidVolumeCm3 = areaRatio * chordCm * chordCm * spanCm;

    // Effective material fraction accounting for perimeters + sparse infill
    const shellFraction = Math.min(0.65, wallPerimeters * 0.08);
    const effectiveFraction = shellFraction + (1 - shellFraction) * (infillPct / 100);
    const estimatedMassGrams = solidVolumeCm3 * effectiveFraction * materialDensity;
    const printTimeMinutes = Math.max(18, Math.round((solidVolumeCm3 * effectiveFraction) / 0.19));

    if (!isOpen) return null;

    const nacaCode = formatNacaCode(shape.camber, shape.maxCamberLoc, shape.thickness);

    const handleDownloadStl = () => {
        const pts = coords.coordinates;
        const n = pts.length;
        const lines = [`solid ${nacaCode.replace(/\s+/g, '_')}`];

        const writeTriangle = (p1, p2, p3) => {
            const ux = p2[0] - p1[0];
            const uy = p2[1] - p1[1];
            const uz = p2[2] - p1[2];
            const vx = p3[0] - p1[0];
            const vy = p3[1] - p1[1];
            const vz = p3[2] - p1[2];
            let nx = uy * vz - uz * vy;
            let ny = uz * vx - ux * vz;
            let nz = ux * vy - uy * vx;
            const len = Math.hypot(nx, ny, nz) || 1;
            nx /= len;
            ny /= len;
            nz /= len;
            lines.push(`  facet normal ${nx.toFixed(5)} ${ny.toFixed(5)} ${nz.toFixed(5)}`);
            lines.push('    outer loop');
            lines.push(`      vertex ${p1[0].toFixed(4)} ${p1[1].toFixed(4)} ${p1[2].toFixed(4)}`);
            lines.push(`      vertex ${p2[0].toFixed(4)} ${p2[1].toFixed(4)} ${p2[2].toFixed(4)}`);
            lines.push(`      vertex ${p3[0].toFixed(4)} ${p3[1].toFixed(4)} ${p3[2].toFixed(4)}`);
            lines.push('    endloop');
            lines.push('  endfacet');
        };

        // Extrude along Z from 0 to spanMm
        for (let i = 0; i < n - 1; i++) {
            const x1 = pts[i].x * chordMm;
            const y1 = pts[i].y * chordMm;
            const x2 = pts[i + 1].x * chordMm;
            const y2 = pts[i + 1].y * chordMm;

            const a = [x1, y1, 0];
            const b = [x2, y2, 0];
            const c = [x2, y2, spanMm];
            const d = [x1, y1, spanMm];

            writeTriangle(a, b, c);
            writeTriangle(a, c, d);
        }

        // End caps (fan triangulation from centroid (0.5*chordMm, 0))
        const cx = 0.5 * chordMm;
        const cy = 0;
        for (let i = 0; i < n - 1; i++) {
            const x1 = pts[i].x * chordMm;
            const y1 = pts[i].y * chordMm;
            const x2 = pts[i + 1].x * chordMm;
            const y2 = pts[i + 1].y * chordMm;
            writeTriangle([cx, cy, 0], [x2, y2, 0], [x1, y1, 0]);
            writeTriangle([cx, cy, spanMm], [x1, y1, spanMm], [x2, y2, spanMm]);
        }

        lines.push(`endsolid ${nacaCode.replace(/\s+/g, '_')}`);
        const blob = new Blob([lines.join('\n')], { type: 'model/stl' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${nacaCode.replace(/\s+/g, '_')}_${chordMm}x${spanMm}mm.stl`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="stl-modal-title"
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(15, 18, 23, 0.65)',
                backdropFilter: 'blur(4px)',
                zIndex: 100,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '16px',
            }}
        >
            <div
                className="vg-card"
                style={{
                    width: '100%',
                    maxWidth: '520px',
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                    <div>
                        <span className="vg-badge vg-badge-accent" style={{ marginBottom: '6px' }}>
                            Additive manufacturing CAD export
                        </span>
                        <h3 id="stl-modal-title" style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>
                            Export 3D wing section ({nacaCode})
                        </h3>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="vg-btn vg-btn-ghost vg-btn-sm"
                    >
                        <X size={16} />
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <ControlSlider
                        label="Wing chord length (c)"
                        unit=" mm"
                        value={chordMm}
                        min={40}
                        max={300}
                        step={5}
                        onChange={setChordMm}
                    />
                    <ControlSlider
                        label="Test section span (b)"
                        unit=" mm"
                        value={spanMm}
                        min={50}
                        max={400}
                        step={10}
                        onChange={setSpanMm}
                    />
                    <ControlSlider
                        label="Internal sparse infill"
                        unit="%"
                        value={infillPct}
                        min={10}
                        max={100}
                        step={5}
                        onChange={setInfillPct}
                    />
                    <ControlSlider
                        label="Outer wall perimeters"
                        unit=""
                        value={wallPerimeters}
                        min={2}
                        max={6}
                        step={1}
                        onChange={setWallPerimeters}
                    />
                </div>

                {/* Exact Shoelace-Integrated Physical Metrics */}
                <div
                    className="vg-card-nested"
                    style={{
                        padding: '16px',
                        background: 'var(--bg-canvas)',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '12px',
                    }}
                >
                    <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Solid volume</div>
                        <div className="vg-tabular" style={{ fontSize: '1rem', fontWeight: 600 }}>
                            {solidVolumeCm3.toFixed(1)} cm³
                        </div>
                        <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>
                            A/c² = {areaRatio.toFixed(4)}
                        </div>
                    </div>
                    <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Filament mass</div>
                        <div className="vg-tabular" style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--accent-primary)' }}>
                            {estimatedMassGrams.toFixed(1)} g
                        </div>
                        <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>
                            PLA (1.24 g/cm³)
                        </div>
                    </div>
                    <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Est. print time</div>
                        <div className="vg-tabular" style={{ fontSize: '1rem', fontWeight: 600 }}>
                            {printTimeMinutes} min
                        </div>
                        <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>
                            0.20 mm layer height
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button type="button" onClick={onClose} className="vg-btn vg-btn-secondary">
                        Cancel
                    </button>
                    <button type="button" onClick={handleDownloadStl} className="vg-btn vg-btn-primary">
                        <Download size={15} />
                        Download watertight STL
                    </button>
                </div>
            </div>
        </div>
    );
}

