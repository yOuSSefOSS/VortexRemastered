import React, { useMemo, useRef, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, Html, Line } from '@react-three/drei';
import * as THREE from 'three';
import { generateNaca4Coordinates, formatNacaCode } from '../domain/nacaGeometry';

/**
 * Updates the camera coordinate readout in the DOM directly via ref
 * so OrbitControls movement never triggers 60fps React re-renders.
 */
function CameraHudUpdater({ hudRef }) {
    const { camera } = useThree();
    const lastUpdateRef = useRef(0);

    useFrame(({ clock }) => {
        if (!hudRef.current) return;
        const now = clock.getElapsedTime();
        if (now - lastUpdateRef.current < 0.12) return;
        lastUpdateRef.current = now;
        const { x, y, z } = camera.position;
        hudRef.current.textContent = `Cam (${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)})`;
    });

    return null;
}

/**
 * Keyboard shortcut controller for camera views (1 = Front, 3 = Side, 7 = Top, R = Reset)
 * Strictly ignores events when focus is inside an input, textarea, select, or contentEditable.
 */
function CameraShortcutController({ controlsRef }) {
    const { camera } = useThree();

    useEffect(() => {
        const handleKeyDown = (e) => {
            const tag = e.target?.tagName;
            if (
                tag === 'INPUT' ||
                tag === 'TEXTAREA' ||
                tag === 'SELECT' ||
                e.target?.isContentEditable
            ) {
                return;
            }
            if (!controlsRef.current) return;

            if (e.key === '1') {
                camera.position.set(0, 0, 5.2);
                controlsRef.current.target.set(0, 0, 0);
                controlsRef.current.update();
            } else if (e.key === '3') {
                camera.position.set(5.2, 0, 0);
                controlsRef.current.target.set(0, 0, 0);
                controlsRef.current.update();
            } else if (e.key === '7') {
                camera.position.set(0, 5.2, 0.01);
                controlsRef.current.target.set(0, 0, 0);
                controlsRef.current.update();
            } else if (e.key === 'r' || e.key === 'R') {
                camera.position.set(2.4, 1.5, 4.2);
                controlsRef.current.target.set(0, 0, 0);
                controlsRef.current.update();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [camera, controlsRef]);

    return null;
}

/**
 * Extruded 3D NACA Wing Section with proper GPU geometry disposal
 */
function ExtrudedWingMesh({
    camberPct,
    maxCamberLocPct,
    thicknessPct,
    aoaDeg,
    flapDeg = 0,
    slatDeg = 0,
    sweepDeg = 0,
    span = 2.8,
    chord = 1.6,
    wireframe = false,
    isComparison = false,
}) {
    const coords = useMemo(
        () => generateNaca4Coordinates(camberPct, maxCamberLocPct, thicknessPct, 65),
        [camberPct, maxCamberLocPct, thicknessPct]
    );

    const geometry = useMemo(() => {
        const shape = new THREE.Shape();
        const upper = coords.upper;
        const lower = coords.lower;

        // Incorporate leading-edge slat droop and trailing-edge flap deflection into the profile contour
        const slatRad = (slatDeg * Math.PI) / 180;
        const flapRad = (flapDeg * Math.PI) / 180;

        const transformPoint = (pt) => {
            let x = pt.x;
            let y = pt.y;
            if (x < 0.18 && slatDeg > 0) {
                const factor = (0.18 - x) / 0.18;
                y -= Math.sin(slatRad) * 0.08 * factor;
                x -= Math.cos(slatRad) * 0.02 * factor;
            } else if (x > 0.72 && flapDeg !== 0) {
                const dx = x - 0.72;
                x = 0.72 + dx * Math.cos(flapRad);
                y -= dx * Math.sin(flapRad);
            }
            return {
                x: (x - 0.45) * chord,
                y: y * chord,
            };
        };

        const first = transformPoint(upper[0]);
        shape.moveTo(first.x, first.y);
        for (let i = 1; i < upper.length; i++) {
            const p = transformPoint(upper[i]);
            shape.lineTo(p.x, p.y);
        }
        for (let i = lower.length - 2; i >= 0; i--) {
            const p = transformPoint(lower[i]);
            shape.lineTo(p.x, p.y);
        }
        shape.closePath();

        const geom = new THREE.ExtrudeGeometry(shape, {
            depth: span,
            bevelEnabled: true,
            bevelSegments: 2,
            steps: 1,
            bevelSize: 0.008,
            bevelThickness: 0.008,
        });
        geom.center();

        // Apply sweep shear along span axis (Z)
        if (Math.abs(sweepDeg) > 0.5) {
            const sweepTan = Math.tan((sweepDeg * Math.PI) / 180) * 0.35;
            const pos = geom.attributes.position;
            for (let i = 0; i < pos.count; i++) {
                const z = pos.getZ(i);
                const x = pos.getX(i);
                pos.setX(i, x + Math.abs(z) * sweepTan);
            }
            pos.needsUpdate = true;
            geom.computeVertexNormals();
        }

        return geom;
    }, [coords, flapDeg, slatDeg, sweepDeg, span, chord]);

    // Explicitly dispose GPU geometry on unmount or parameter update
    useEffect(() => {
        return () => {
            geometry.dispose();
        };
    }, [geometry]);

    const aoaRad = -(aoaDeg * Math.PI) / 180;

    return (
        <group rotation={[0, 0, aoaRad]} position={[0, isComparison ? 0.02 : 0, 0]}>
            <mesh geometry={geometry} castShadow receiveShadow>
                <meshStandardMaterial
                    color={isComparison ? '#94A3B8' : '#E2E8F0'}
                    metalness={isComparison ? 0.2 : 0.65}
                    roughness={isComparison ? 0.6 : 0.28}
                    wireframe={wireframe || isComparison}
                    transparent={isComparison}
                    opacity={isComparison ? 0.45 : 1}
                />
            </mesh>
        </group>
    );
}

/**
 * High-contrast CFD Streamlines & Smoke Particle Field
 */
function StreamlineField({
    aoaDeg,
    cl,
    isStalled,
    flowSpeed = 1,
    visualMode = 'streamlines', // 'streamlines' | 'smoke' | 'pressure'
}) {
    const linesGroupRef = useRef();
    const smokeRef = useRef();

    const numStreamlines = 15;
    const pointsPerLine = 48;

    const streamlineData = useMemo(() => {
        const lines = [];
        const aoaRad = (aoaDeg * Math.PI) / 180;
        const circulation = Math.max(-1.6, Math.min(2.4, cl || 0.5));

        for (let s = 0; s < numStreamlines; s++) {
            const y0 = -1.15 + (s / (numStreamlines - 1)) * 2.3;
            const pts = [];
            for (let i = 0; i < pointsPerLine; i++) {
                const t = i / (pointsPerLine - 1);
                const x = -2.8 + t * 5.6;
                const distSq = x * x + y0 * y0 + 0.18;

                // Upwash ahead of leading edge + downwash behind trailing edge
                let dy = (circulation * 0.22 * -x) / (distSq * 2.2);
                // Deflection around airfoil body
                if (Math.abs(x) < 0.95 && Math.abs(y0) < 0.55) {
                    const sign = y0 >= 0 ? 1 : -1;
                    dy += sign * 0.18 * Math.exp(-x * x * 2.5);
                }
                // Post-stall wake separation
                if (isStalled && x > -0.1 && y0 > -0.1 && y0 < 0.65) {
                    dy += Math.sin(x * 7 + s) * 0.16 * ((x + 0.2) / 2.5);
                }

                const y = y0 + dy - x * Math.sin(aoaRad) * 0.18;
                pts.push(new THREE.Vector3(x, y, 0));
            }

            // Color streamline by local acceleration (upper surface suction vs lower surface compression)
            const isUpperSuction = y0 > 0 && y0 < 0.55;
            const color = isStalled && isUpperSuction
                ? '#F87171'
                : isUpperSuction
                ? '#60A5FA'
                : '#94A3B8';

            lines.push({ pts, color, y0 });
        }
        return lines;
    }, [aoaDeg, cl, isStalled]);

    // Animated tracer particles along streamlines
    const particleCount = 180;
    const particlePositions = useMemo(() => {
        const arr = new Float32Array(particleCount * 3);
        for (let i = 0; i < particleCount; i++) {
            const s1 = ((i * 79 + 17) % 103) / 103;
            const s2 = ((i * 131 + 31) % 97) / 97;
            const s3 = ((i * 193 + 53) % 89) / 89;
            arr[i * 3] = -2.8 + s1 * 5.6;
            arr[i * 3 + 1] = -1.1 + s2 * 2.2;
            arr[i * 3 + 2] = (s3 - 0.5) * 2.2;
        }
        return arr;
    }, [particleCount]);

    useFrame((_, delta) => {
        if (!smokeRef.current) return;
        const pos = smokeRef.current.geometry.attributes.position;
        const speed = (1.8 + flowSpeed * 2.4) * delta;
        const circulation = Math.max(-1.5, Math.min(2.4, cl || 0.5));

        for (let i = 0; i < particleCount; i++) {
            let x = pos.getX(i) + speed;
            let y = pos.getY(i);
            const z = pos.getZ(i);

            if (x > 2.8) {
                x = -2.8;
                y = -1.1 + ((i * 19) % 100) * 0.022;
            }

            // Local velocity perturbation near wing
            const r2 = x * x + y * y + 0.25;
            const vy = (circulation * 0.012 * -x) / r2;
            y += vy;

            if (isStalled && x > 0 && y > 0 && y < 0.7) {
                y += Math.sin(x * 9 + i) * 0.012;
            }

            pos.setXYZ(i, x, y, z);
        }
        pos.needsUpdate = true;
    });

    return (
        <group ref={linesGroupRef}>
            {visualMode !== 'smoke' &&
                streamlineData.map((line, idx) => (
                    <Line
                        key={idx}
                        points={line.pts}
                        color={line.color}
                        lineWidth={1.6}
                        transparent
                        opacity={visualMode === 'pressure' ? 0.45 : 0.78}
                    />
                ))}

            <points ref={smokeRef}>
                <bufferGeometry key={`wind-particles-${particleCount}`}>
                    <bufferAttribute
                        attach="attributes-position"
                        count={particleCount}
                        array={particlePositions}
                        itemSize={3}
                    />
                </bufferGeometry>
                <pointsMaterial
                    color={isStalled ? '#FCA5A5' : '#93C5FD'}
                    size={visualMode === 'smoke' ? 0.055 : 0.035}
                    transparent
                    opacity={visualMode === 'smoke' ? 0.85 : 0.65}
                />
            </points>
        </group>
    );
}

export default function SimulationView({
    shape = { camber: 2, maxCamberLoc: 4, thickness: 12, aoa: 4 },
    compareShape = null,
    flapDeg = 0,
    slatDeg = 0,
    sweepDeg = 0,
    aeroMetrics = { cl: 0.65, cd: 0.012, cm: -0.04, isStalled: false },
    airspeedMs = 70,
}) {
    const controlsRef = useRef();
    const camHudRef = useRef();
    const [visualMode, setVisualMode] = useState('streamlines'); // 'streamlines' | 'smoke' | 'pressure'
    const [wireframe, setWireframe] = useState(false);

    const nacaCode = formatNacaCode(shape.camber, shape.maxCamberLoc, shape.thickness);
    const compareCode = compareShape
        ? formatNacaCode(compareShape.camber, compareShape.maxCamberLoc, compareShape.thickness)
        : null;

    return (
        <div
            style={{
                width: '100%',
                height: '100%',
                position: 'relative',
                background: 'var(--scene-bg)',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                border: '1px solid var(--border-subtle)',
            }}
        >
            <Canvas
                shadows
                camera={{ position: [2.4, 1.5, 4.2], fov: 40 }}
                gl={{ antialias: true, powerPreference: 'high-performance' }}
            >
                <ambientLight intensity={0.85} />
                <directionalLight position={[6, 8, 6]} intensity={1.45} castShadow />
                <directionalLight position={[-5, -3, -4]} intensity={0.55} color="#93C5FD" />

                <CameraHudUpdater hudRef={camHudRef} />
                <CameraShortcutController controlsRef={controlsRef} />

                <ExtrudedWingMesh
                    camberPct={shape.camber}
                    maxCamberLocPct={shape.maxCamberLoc}
                    thicknessPct={shape.thickness}
                    aoaDeg={shape.aoa}
                    flapDeg={flapDeg}
                    slatDeg={slatDeg}
                    sweepDeg={sweepDeg}
                    wireframe={wireframe}
                />

                {compareShape && (
                    <ExtrudedWingMesh
                        camberPct={compareShape.camber}
                        maxCamberLocPct={compareShape.maxCamberLoc}
                        thicknessPct={compareShape.thickness}
                        aoaDeg={shape.aoa}
                        flapDeg={0}
                        slatDeg={0}
                        sweepDeg={0}
                        isComparison
                    />
                )}

                <StreamlineField
                    aoaDeg={shape.aoa}
                    cl={aeroMetrics.cl}
                    isStalled={aeroMetrics.isStalled}
                    flowSpeed={airspeedMs / 100}
                    visualMode={visualMode}
                />

                {/* Aerodynamic Force Vector Overlay */}
                <group position={[0, 0, 0]}>
                    {/* Lift vector (perpendicular to freestream) */}
                    <arrowHelper
                        args={[
                            new THREE.Vector3(0, 1, 0),
                            new THREE.Vector3(-0.2, 0, 0),
                            Math.max(0.3, Math.min(1.6, Math.abs(aeroMetrics.cl || 0.5) * 0.9)),
                            0x34d399,
                            0.18,
                            0.1,
                        ]}
                    />
                    {/* Drag vector (parallel to freestream) */}
                    <arrowHelper
                        args={[
                            new THREE.Vector3(1, 0, 0),
                            new THREE.Vector3(-0.2, 0, 0),
                            Math.max(0.25, Math.min(1.4, (aeroMetrics.cd || 0.015) * 8)),
                            0xf87171,
                            0.14,
                            0.08,
                        ]}
                    />
                </group>

                <Grid
                    position={[0, -1.45, 0]}
                    args={[14, 14]}
                    cellSize={0.5}
                    cellThickness={0.5}
                    cellColor="#1E293B"
                    sectionSize={2}
                    sectionThickness={1}
                    sectionColor="#334155"
                    fadeDistance={14}
                    fadeStrength={1}
                />

                <OrbitControls
                    ref={controlsRef}
                    enableDamping
                    dampingFactor={0.08}
                    minDistance={1.6}
                    maxDistance={10}
                />
            </Canvas>

            {/* Top-Left Wind Tunnel Badge + Stall Alert */}
            <div
                style={{
                    position: 'absolute',
                    top: '12px',
                    left: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    flexWrap: 'wrap',
                    pointerEvents: 'none',
                }}
            >
                <span className="vg-badge vg-badge-accent mono">
                    {nacaCode}
                </span>
                {compareCode && (
                    <span className="vg-badge mono">
                        vs {compareCode}
                    </span>
                )}
                {aeroMetrics.isStalled && (
                    <span
                        className="vg-badge"
                        style={{
                            background: 'var(--status-danger)',
                            color: '#FFFFFF',
                            fontWeight: 600,
                        }}
                    >
                        Flow separation / stall warning
                    </span>
                )}
            </div>

            {/* Top-Right Flow Visualization Mode Switcher */}
            <div
                className="vg-glass"
                style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 6px',
                }}
            >
                {[
                    { id: 'streamlines', label: 'Streamlines' },
                    { id: 'smoke', label: 'Smoke tracers' },
                    { id: 'pressure', label: 'Vectors' },
                ].map((m) => (
                    <button
                        key={m.id}
                        type="button"
                        onClick={() => setVisualMode(m.id)}
                        className={`btn btn-sm ${
                            visualMode === m.id ? 'btn-primary' : 'btn-ghost'
                        }`}
                        style={{ height: '28px', padding: '0 10px', fontSize: '0.75rem' }}
                    >
                        {m.label}
                    </button>
                ))}
                <button
                    type="button"
                    onClick={() => setWireframe((w) => !w)}
                    className={`btn btn-sm ${wireframe ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ height: '28px', padding: '0 10px', fontSize: '0.75rem' }}
                >
                    Mesh
                </button>
            </div>

            {/* Bottom Keycap Legend & Ref-Updated Camera Readout */}
            <div
                style={{
                    position: 'absolute',
                    bottom: '10px',
                    left: '12px',
                    right: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    pointerEvents: 'none',
                    fontSize: '0.75rem',
                    color: 'var(--glass-text-soft)',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <span>
                        <kbd className="vg-kbd">1</kbd> Span
                    </span>
                    <span>
                        <kbd className="vg-kbd">3</kbd> Chord
                    </span>
                    <span>
                        <kbd className="vg-kbd">7</kbd> Planform
                    </span>
                    <span>
                        <kbd className="vg-kbd">R</kbd> Reset
                    </span>
                </div>
                <span
                    ref={camHudRef}
                    className="vg-tabular"
                    style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--glass-muted)' }}
                >
                    Cam (2.4, 1.5, 4.2)
                </span>
            </div>
        </div>
    );
}

