import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html, Line } from '@react-three/drei';
import * as THREE from 'three';

/**
 * ============================================================================
 * AERO / ARCHIVE — F-16 FIGHTING FALCON 3D INTERACTIVE DISASSEMBLY & FLIGHT RIG
 * Inspired directly by the Aero Archive F-16 Interactive Exhibit (Video 1):
 * - 12 sculpted, individually selectable & explodable 3D aircraft sub-assemblies
 * - Smooth 3D explosion vector interpolation (Explode <-> Reassemble + slider)
 * - Floating 3D Callout Labels with 3D leader lines to each component
 * - Launch Flight mode: retracts gear, ignites volumetric afterburner plume
 *   with shock diamonds, streams high-speed airflow ribbons & wingtip vortices
 * - Camera aspect presets: Overview, Top view, Side profile, Front aspect
 * ============================================================================
 */

export const F16_PARTS = [
    {
        id: 'radome',
        index: '01',
        name: 'Radome & APG-68 fire-control radar',
        shortLabel: 'Radome & nose',
        category: 'Avionics & sensors',
        code: 'F16-01',
        subsystemMap: 'avionics',
        basePos: [3.55, -0.04, 0],
        explodeOffset: [2.2, 0.35, 0],
        anchorOffset: [0.4, 0.15, 0],
        labelOffset: [0.8, 0.95, 0.4],
        summary:
            'Dielectric ogive nose cone housing the Westinghouse AN/APG-68 pulse-Doppler radar array and pitot-static air data probe.',
        engineeringNote:
            'Contoured to minimize transonic wave drag (CD,wave) while maintaining radar transparency across X-band frequencies.',
        engineering:
            'Contoured to minimize transonic wave drag (CD,wave) while maintaining radar transparency across X-band frequencies.',
        formula: 'θ_cone = arctan(d / 2L) ,  M_crit = 0.88',
        specs: [
            { label: 'Radar Array', value: 'AN/APG-68(V)9 X-Band Pulse-Doppler' },
            { label: 'Fineness Ratio', value: 'L/D = 3.4 Sears-Haack Ogive' },
            { label: 'Detection Range', value: '296 km Look-Down / Shoot-Down' },
        ],
    },
    {
        id: 'cockpit',
        index: '02',
        name: 'Cockpit section & polycarbonate canopy',
        shortLabel: 'Cockpit section',
        category: 'Crew station',
        code: 'F16-02',
        subsystemMap: 'avionics',
        basePos: [1.75, 0.36, 0],
        explodeOffset: [0.85, 1.45, 0],
        anchorOffset: [0, 0.25, 0],
        labelOffset: [0.3, 1.15, -0.5],
        summary:
            'Frameless single-piece polycarbonate bubble canopy providing 360° upper-hemisphere visibility, paired with a 30° reclined ACES II ejection seat and side-stick controller.',
        engineeringNote:
            'The 30° seat tilt reduces head-to-heart hydrostatic blood column height h, raising pilot G-tolerance up to +9.0 Gz sustained.',
        engineering:
            'The 30° seat tilt reduces head-to-heart hydrostatic blood column height h, raising pilot G-tolerance up to +9.0 Gz sustained.',
        formula: 'ΔP_hydrostatic = ρ_blood · g · Gz · h · cos(30°)',
        specs: [
            { label: 'Canopy Glazing', value: '19 mm Gold-Indium-Tin Polycarbonate' },
            { label: 'Ejection Seat', value: 'ACES II Zero-Zero (30° Reclined)' },
            { label: 'Flight Control', value: 'Force-Sensing Side-Stick + Quad FBW' },
        ],
    },
    {
        id: 'airframe',
        index: '03',
        name: 'Central wing-body blended airframe',
        shortLabel: 'Central airframe',
        category: 'Primary structure',
        code: 'F16-03',
        subsystemMap: 'fuselage',
        basePos: [0, 0, 0],
        explodeOffset: [0, 0.15, 0],
        anchorOffset: [0, 0.2, 0],
        labelOffset: [-0.2, 1.35, 0],
        summary:
            'Blended wing-body (BWB) forebody strakes and multi-frame Al-2024/Ti-6Al-4V fuselage spine carrying wing bending moments and internal fuel.',
        engineeringNote:
            'Forebody strakes generate controlled leading-edge vortex lift at high angles of attack (α > 15°), energizing flow over the vertical tail.',
        engineering:
            'Forebody strakes generate controlled leading-edge vortex lift at high angles of attack (α > 15°), energizing flow over the vertical tail.',
        formula: 'CL,total = CL,potential + CL,vortex(α²)',
        specs: [
            { label: 'Alloy Composition', value: '78% Al-2024/7075 · 8% Ti-6Al-4V' },
            { label: 'Design Load Limit', value: '+9.0 G / -3.0 G Full Internal Fuel' },
            { label: 'Static Margin', value: '-2.0% MAC (Relaxed Static Stability)' },
        ],
    },
    {
        id: 'intake',
        index: '04',
        name: 'Ventral normal-shock inlet duct',
        shortLabel: 'Supersonic inlet',
        category: 'Air induction',
        code: 'F16-04',
        subsystemMap: 'engines',
        basePos: [0.95, -0.46, 0],
        explodeOffset: [0.9, -1.25, 0],
        anchorOffset: [0.2, -0.15, 0],
        labelOffset: [0.6, -0.95, 0.7],
        summary:
            'Fixed-geometry ventral chin intake positioned beneath the forebody to prevent gun-gas ingestion and maintain clean airflow at high α.',
        engineeringNote:
            'Decelerates supersonic freestream flow (Mach 1.6–2.0) to subsonic Mach ~0.45 at the fan face through a normal shock and diffuser duct.',
        engineering:
            'Decelerates supersonic freestream flow (Mach 1.6–2.0) to subsonic Mach ~0.45 at the fan face through a normal shock and diffuser duct.',
        formula: 'P02 / P01 = f(M1) ,  ṁ = ρ · A_inlet · V',
        specs: [
            { label: 'Inlet Type', value: 'Fixed-Geometry Normal-Shock Pitot' },
            { label: 'Pressure Recovery', value: '0.96 Subsonic / 0.89 at Mach 1.6' },
            { label: 'Core Mass Flow', value: '122 kg/s Corrected Fan Airflow' },
        ],
    },
    {
        id: 'port_wing',
        index: '05',
        name: 'Port cropped-delta wing & flaperon',
        shortLabel: 'Port wing',
        category: 'Lifting surface',
        code: 'F16-05',
        subsystemMap: 'wings',
        basePos: [-0.35, 0.02, -0.65],
        explodeOffset: [-0.15, 0.25, -1.85],
        anchorOffset: [0, 0.05, -1.2],
        labelOffset: [0.2, 0.85, -2.1],
        summary:
            '40° leading-edge sweep cropped-delta planform using a thin NACA 64A204 section (4% thickness-to-chord ratio) with automatic leading-edge maneuvering flaps.',
        engineeringNote:
            'Trailing-edge flaperons operate differentially for roll rate (up to 324°/s) and droop symmetrically as high-lift flaps during approach.',
        engineering:
            'Trailing-edge flaperons operate differentially for roll rate (up to 324°/s) and droop symmetrically as high-lift flaps during approach.',
        formula: 'AR = b² / S = 3.2 ,  Λ_LE = 40° ,  t/c = 0.04',
        specs: [
            { label: 'Airfoil Section', value: 'NACA 64A204 (t/c = 4.0%)' },
            { label: 'Leading-Edge Sweep', value: '40° Cropped Delta · AR 3.2' },
            { label: 'High-Lift Device', value: 'Auto-Scheduled LE Flap (-2° to +25°)' },
        ],
    },
    {
        id: 'starboard_wing',
        index: '06',
        name: 'Starboard cropped-delta wing & flaperon',
        shortLabel: 'Starboard wing',
        category: 'Lifting surface',
        code: 'F16-06',
        subsystemMap: 'wings',
        basePos: [-0.35, 0.02, 0.65],
        explodeOffset: [-0.15, 0.25, 1.85],
        anchorOffset: [0, 0.05, 1.2],
        labelOffset: [0.2, 0.85, 2.1],
        summary:
            'Starboard primary lifting surface featuring integrated fuel bays, hardpoint pylons, and fly-by-wire flaperon actuators.',
        engineeringNote:
            'Relaxed static stability (negative subsonic static margin ~ -2% MAC) reduces trim drag and maximizes sustained turn rate.',
        engineering:
            'Relaxed static stability (negative subsonic static margin ~ -2% MAC) reduces trim drag and maximizes sustained turn rate.',
        formula: 'L = ½ · ρ · V² · S · CL(α, δ_LE, δ_flaperon)',
        specs: [
            { label: 'Reference Wing Area', value: '27.87 m² (300.0 ft²)' },
            { label: 'Max Roll Rate', value: '324 deg/s via Differential Flaperons' },
            { label: 'Hardpoints', value: '3 Under-Wing + 1 Wingtip Rail' },
        ],
    },
    {
        id: 'vertical_tail',
        index: '07',
        name: 'Vertical stabilizer & rudder assembly',
        shortLabel: 'Vertical stabilizer',
        category: 'Directional control',
        code: 'F16-07',
        subsystemMap: 'tail',
        basePos: [-2.55, 0.85, 0],
        explodeOffset: [-1.45, 1.55, 0],
        anchorOffset: [-0.2, 0.55, 0],
        labelOffset: [-0.9, 1.45, -0.4],
        summary:
            'High-sweep carbon-epoxy composite vertical tail fin with dorsal avionics fairing, rudder servo-actuator, and threat-warning receiver pod.',
        engineeringNote:
            'Provides directional weathercock stability (Cnβ > 0) and yaw authority for crosswind landings and high-α coordination.',
        engineering:
            'Provides directional weathercock stability (Cnβ > 0) and yaw authority for crosswind landings and high-α coordination.',
        formula: 'Cn = Cnβ · β + Cnδr · δr ,  VV = (Sv · lv) / (S · b)',
        specs: [
            { label: 'Fin Structure', value: 'Graphite-Epoxy Skins / Al Honeycomb' },
            { label: 'Leading-Edge Sweep', value: '47.5° Biconvex Supersonic Section' },
            { label: 'Rudder Authority', value: '±30° Electro-Hydrostatic Servo' },
        ],
    },
    {
        id: 'port_stabilator',
        index: '08',
        name: 'Port all-moving horizontal stabilator',
        shortLabel: 'Port stabilator',
        category: 'Pitch & roll trim',
        code: 'F16-08',
        subsystemMap: 'tail',
        basePos: [-2.75, -0.08, -0.58],
        explodeOffset: [-1.55, -0.35, -1.45],
        anchorOffset: [-0.1, 0, -0.6],
        labelOffset: [-0.8, -0.55, -1.4],
        summary:
            'All-moving pivoted horizontal tail surface providing primary longitudinal pitch control and differential roll augmentation (tailerons).',
        engineeringNote:
            'In supersonic flight where the aerodynamic center shifts aft from 25% to ~50% MAC, all-moving stabilators retain pitch authority without elevator blanking.',
        engineering:
            'In supersonic flight where the aerodynamic center shifts aft from 25% to ~50% MAC, all-moving stabilators retain pitch authority without elevator blanking.',
        formula: 'Cm,cg = Cm0 + Cmα · α + Cmδh · δh',
        specs: [
            { label: 'Actuation Type', value: 'All-Moving Titanium Pivot Spindle' },
            { label: 'Deflection Range', value: '±25° Symmetric & Differential' },
            { label: 'Dihedral Angle', value: '-10° Anhedral for Wake Clearance' },
        ],
    },
    {
        id: 'starboard_stabilator',
        index: '09',
        name: 'Starboard all-moving horizontal stabilator',
        shortLabel: 'Starboard stabilator',
        category: 'Pitch & roll trim',
        code: 'F16-09',
        subsystemMap: 'tail',
        basePos: [-2.75, -0.08, 0.58],
        explodeOffset: [-1.55, -0.35, 1.45],
        anchorOffset: [-0.1, 0, 0.6],
        labelOffset: [-0.8, -0.55, 1.4],
        summary:
            'Starboard composite honeycomb stabilator pivoted on a titanium spindle shaft and commanded at 400 Hz by the quad-redundant digital flight control computer.',
        engineeringNote:
            'Operates symmetrically with the port stabilator for pitch rate command and differentially for high-speed roll augmentation.',
        engineering:
            'Operates symmetrically with the port stabilator for pitch rate command and differentially for high-speed roll augmentation.',
        formula: 'δh,port / δh,stbd = δ_pitch ± δ_roll_taileron',
        specs: [
            { label: 'Control Loop Rate', value: '400 Hz Quad-Redundant Digital FBW' },
            { label: 'Surface Skin', value: 'Carbon-Epoxy Laminate over Honeycomb' },
            { label: 'Slew Rate', value: '60 deg/s Under Full Aerodynamic Load' },
        ],
    },
    {
        id: 'nozzle',
        index: '10',
        name: 'F110 afterburning turbofan & convergent-divergent nozzle',
        shortLabel: 'Exhaust / afterburner',
        category: 'Propulsion',
        code: 'F16-10',
        subsystemMap: 'engines',
        basePos: [-2.95, 0.0, 0],
        explodeOffset: [-2.35, 0.05, 0],
        anchorOffset: [-0.35, 0, 0],
        labelOffset: [-1.4, 0.65, 0.6],
        summary:
            'Variable-area convergent-divergent (C-D) iris exhaust nozzle mated to the GE F110-GE-129 afterburning turbofan (131 kN wet thrust).',
        engineeringNote:
            'Modulates throat area A* and exit area Ae to expand exhaust gases isentropically to supersonic Mach > 1.8 during full afterburner operation.',
        engineering:
            'Modulates throat area A* and exit area Ae to expand exhaust gases isentropically to supersonic Mach > 1.8 during full afterburner operation.',
        formula: 'FN = ṁ · (Ve − V0) + (Pe − P0) · Ae',
        specs: [
            { label: 'Powerplant', value: 'GE F110-GE-129 Augmented Turbofan' },
            { label: 'Max Wet Thrust', value: '131.2 kN (29,500 lbf) w/ Afterburner' },
            { label: 'Overall Pressure Ratio', value: '30.7 : 1 · Bypass Ratio 0.76 : 1' },
        ],
    },
    {
        id: 'undercarriage',
        index: '11',
        name: 'Tricycle hydro-pneumatic undercarriage',
        shortLabel: 'Undercarriage',
        category: 'Landing gear',
        code: 'F16-11',
        subsystemMap: 'fuselage',
        basePos: [0.1, -0.78, 0],
        explodeOffset: [0, -1.65, 0],
        anchorOffset: [0, -0.25, 0],
        labelOffset: [-0.2, -1.05, -0.9],
        summary:
            'Steerable nose gear aft of the chin intake and wide-track fuselage-retracting main gear with oleo-pneumatic shock struts and anti-skid carbon brakes.',
        engineeringNote:
            'Absorbs vertical sink-rate kinetic energy (½·m·Vz²) during touchdown and retracts flush into the lower fuselage bays to eliminate parasite drag.',
        engineering:
            'Absorbs vertical sink-rate kinetic energy (½·m·Vz²) during touchdown and retracts flush into the lower fuselage bays to eliminate parasite drag.',
        formula: 'E_impact = ½ · m · V_sink² = ∫ F_oleo(s) ds',
        specs: [
            { label: 'Shock Absorption', value: 'Nitrogen-Oil Oleo-Pneumatic Struts' },
            { label: 'Braking System', value: 'Multi-Disc Carbon w/ Digital Anti-Skid' },
            { label: 'Max Gear Speed', value: '300 KIAS Extension / Retraction' },
        ],
    },
    {
        id: 'stores',
        index: '12',
        name: 'Wingtip AIM-9 rails & external fuel stores',
        shortLabel: 'External stores',
        category: 'Payload & stores',
        code: 'F16-12',
        subsystemMap: 'wings',
        basePos: [-0.35, -0.22, 0],
        explodeOffset: [0.35, -1.05, 1.65],
        anchorOffset: [0, -0.1, 1.5],
        labelOffset: [0.6, -0.75, 2.2],
        summary:
            'Wingtip launch rails carrying AIM-9 Sidewinder air-to-air missiles and under-wing 370-gallon external drop tanks.',
        engineeringNote:
            'Mounting missiles on the wingtips acts like aerodynamic endplates/winglets, attenuating wingtip vortex roll-up and reducing induced drag CD,i.',
        engineering:
            'Mounting missiles on the wingtips acts like aerodynamic endplates/winglets, attenuating wingtip vortex roll-up and reducing induced drag CD,i.',
        formula: 'CD,i = CL² / (π · AR_eff · e)',
        specs: [
            { label: 'Wingtip Stations', value: '2 × LAU-129 Rails (AIM-9X / AIM-120)' },
            { label: 'External Fuel', value: '2 × 370 US gal Under-Wing Drop Tanks' },
            { label: 'Wingtip Vortex Effect', value: '-6% Induced Drag via Endplate Effect' },
        ],
    },
];

const CAMERA_VIEWS = {
    overview: { pos: [6.2, 2.5, 6.8], target: [0.1, 0.0, 0] },
    top: { pos: [0.1, 9.2, 0.01], target: [0.1, 0, 0] },
    side: { pos: [0.1, 0.6, 8.8], target: [0.1, 0.0, 0] },
    front: { pos: [8.4, 0.8, 0.01], target: [0, 0.0, 0] },
};

function SmoothViewCamera({ viewPreset, selectedPart, explodeFactor, controlsRef }) {
    const { camera } = useThree();
    const desiredPos = useRef(new THREE.Vector3(6.2, 2.5, 6.8));
    const desiredTarget = useRef(new THREE.Vector3(0.1, 0, 0));
    const animFrames = useRef(0);

    useEffect(() => {
        if (selectedPart && viewPreset === 'overview') {
            const p = F16_PARTS.find((item) => item.id === selectedPart);
            if (p) {
                const tx = p.basePos[0] + p.explodeOffset[0] * explodeFactor;
                const ty = p.basePos[1] + p.explodeOffset[1] * explodeFactor;
                const tz = p.basePos[2] + p.explodeOffset[2] * explodeFactor;
                desiredTarget.current.set(tx, ty, tz);
                desiredPos.current.set(
                    tx + 3.8,
                    ty + 1.8,
                    tz + (tz >= 0 ? 4.4 : -4.4)
                );
                animFrames.current = 65;
                return;
            }
        }
        const preset = CAMERA_VIEWS[viewPreset] || CAMERA_VIEWS.overview;
        desiredPos.current.set(...preset.pos);
        desiredTarget.current.set(...preset.target);
        animFrames.current = 65;
    }, [viewPreset, selectedPart, explodeFactor]);

    useFrame((_, delta) => {
        if (animFrames.current <= 0) return;
        animFrames.current -= 1;
        const alpha = Math.min(1, delta * 5.0);
        camera.position.lerp(desiredPos.current, alpha);
        if (controlsRef.current) {
            controlsRef.current.target.lerp(desiredTarget.current, alpha);
            controlsRef.current.update();
        }
    });

    return null;
}

/**
 * Animated Part Wrapper that smoothly interpolates its position along explodeOffset
 */
function ExplodablePartGroup({
    part,
    explodeFactor,
    isSelected,
    isHovered,
    onSelect,
    onHover,
    showLabels,
    children,
}) {
    const groupRef = useRef();
    const currentPos = useRef(new THREE.Vector3(...part.basePos));

    useFrame((_, delta) => {
        if (!groupRef.current) return;
        const tx = part.basePos[0] + part.explodeOffset[0] * explodeFactor;
        const ty = part.basePos[1] + part.explodeOffset[1] * explodeFactor;
        const tz = part.basePos[2] + part.explodeOffset[2] * explodeFactor;
        currentPos.current.lerp(new THREE.Vector3(tx, ty, tz), Math.min(1, delta * 7.5));
        groupRef.current.position.copy(currentPos.current);
    });

    const showPin = showLabels && (explodeFactor > 0.12 || isSelected || isHovered);

    return (
        <group
            ref={groupRef}
            position={part.basePos}
            onClick={(e) => {
                e.stopPropagation();
                onSelect(part.id);
            }}
            onPointerOver={(e) => {
                e.stopPropagation();
                document.body.style.cursor = 'pointer';
                onHover(part.id);
            }}
            onPointerOut={() => {
                document.body.style.cursor = 'auto';
                onHover(null);
            }}
        >
            {children}

            {showPin && (
                <>
                    <Line
                        points={[part.anchorOffset, part.labelOffset]}
                        color={isSelected ? '#FBBF24' : '#94A3B8'}
                        lineWidth={isSelected ? 1.8 : 1.0}
                        transparent
                        opacity={isSelected ? 0.95 : 0.55}
                    />
                    <mesh position={part.anchorOffset}>
                        <sphereGeometry args={[0.045, 12, 12]} />
                        <meshBasicMaterial color={isSelected ? '#FBBF24' : '#60A5FA'} />
                    </mesh>
                    <Html position={part.labelOffset} center distanceFactor={11} zIndexRange={[10, 0]}>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onSelect(part.id);
                            }}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '4px 9px',
                                borderRadius: '4px',
                                background: isSelected
                                    ? 'rgba(20, 26, 38, 0.96)'
                                    : 'rgba(12, 16, 23, 0.86)',
                                border: isSelected
                                    ? '1px solid #FBBF24'
                                    : '1px solid rgba(148, 163, 184, 0.32)',
                                color: isSelected ? '#FDE68A' : '#E2E8F0',
                                fontFamily: 'var(--font-mono)',
                                fontSize: '10px',
                                fontWeight: isSelected ? 600 : 500,
                                whiteSpace: 'nowrap',
                                cursor: 'pointer',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.55)',
                            }}
                        >
                            <span
                                style={{
                                    width: '6px',
                                    height: '6px',
                                    borderRadius: '99px',
                                    background: isSelected ? '#FBBF24' : '#60A5FA',
                                }}
                            />
                            <span>{part.shortLabel}</span>
                        </button>
                    </Html>
                </>
            )}
        </group>
    );
}

/**
 * Sculpted High-Detail 3D F-16 Fighting Falcon Mesh Assembly
 */
function F16SculptedModel({
    explodeFactor = 0,
    selectedPart = null,
    hoveredPart = null,
    onSelectPart,
    onHoverPart,
    flightMode = false,
    wireframe = false,
    showLabels = true,
    rigState = {},
}) {
    const aircraftRootRef = useRef();
    const afterburnerRef = useRef();
    const streamlinesRef = useRef();

    // Custom extruded swept wing & tail geometries
    const {
        wingGeometry,
        vTailGeometry,
        stabilatorGeometry,
        strakeGeometry,
    } = useMemo(() => {
        // 1. Cropped-delta wing shape (root chord 2.2, tip chord 0.55, span 2.1)
        const wShape = new THREE.Shape();
        wShape.moveTo(1.1, 0);
        wShape.lineTo(-0.35, 2.05);
        wShape.lineTo(-0.95, 2.05);
        wShape.lineTo(-1.1, 0);
        wShape.closePath();
        const wGeo = new THREE.ExtrudeGeometry(wShape, {
            depth: 0.06,
            bevelEnabled: true,
            bevelThickness: 0.015,
            bevelSize: 0.015,
            bevelSegments: 2,
        });
        wGeo.rotateX(Math.PI / 2);

        // 2. Vertical stabilizer shape
        const vShape = new THREE.Shape();
        vShape.moveTo(0.85, 0);
        vShape.lineTo(-0.35, 1.38);
        vShape.lineTo(-0.92, 1.38);
        vShape.lineTo(-0.75, 0);
        vShape.closePath();
        const vGeo = new THREE.ExtrudeGeometry(vShape, {
            depth: 0.05,
            bevelEnabled: true,
            bevelThickness: 0.01,
            bevelSize: 0.01,
            bevelSegments: 2,
        });
        vGeo.translate(0, 0, -0.025);

        // 3. All-moving horizontal stabilator shape
        const sShape = new THREE.Shape();
        sShape.moveTo(0.48, 0);
        sShape.lineTo(-0.18, 0.98);
        sShape.lineTo(-0.55, 0.98);
        sShape.lineTo(-0.48, 0);
        sShape.closePath();
        const sGeo = new THREE.ExtrudeGeometry(sShape, {
            depth: 0.035,
            bevelEnabled: true,
            bevelThickness: 0.008,
            bevelSize: 0.008,
            bevelSegments: 2,
        });
        sGeo.rotateX(Math.PI / 2);

        // 4. Forebody LERX strake shape
        const lShape = new THREE.Shape();
        lShape.moveTo(2.4, 0);
        lShape.lineTo(0.6, 0.65);
        lShape.lineTo(-1.2, 0.68);
        lShape.lineTo(-1.2, 0);
        lShape.closePath();
        const lGeo = new THREE.ExtrudeGeometry(lShape, {
            depth: 0.05,
            bevelEnabled: true,
            bevelThickness: 0.012,
            bevelSize: 0.012,
        });
        lGeo.rotateX(Math.PI / 2);

        return {
            wingGeometry: wGeo,
            vTailGeometry: vGeo,
            stabilatorGeometry: sGeo,
            strakeGeometry: lGeo,
        };
    }, []);

    useEffect(() => {
        return () => {
            wingGeometry.dispose();
            vTailGeometry.dispose();
            stabilatorGeometry.dispose();
            strakeGeometry.dispose();
        };
    }, [wingGeometry, vTailGeometry, stabilatorGeometry, strakeGeometry]);

    // Flight mode gentle banking, pitch & afterburner pulse
    useFrame(({ clock }, delta) => {
        const t = clock.getElapsedTime();
        if (aircraftRootRef.current) {
            const targetPitch = flightMode
                ? ((rigState.aoaDeg ?? 5) * Math.PI) / 180 + Math.sin(t * 1.4) * 0.03
                : ((rigState.aoaDeg ?? 0) * Math.PI) / 180 * 0.25;
            const targetRoll = flightMode
                ? ((rigState.aileronDeg ?? 0) * Math.PI) / 180 * 0.6 + Math.sin(t * 0.9) * 0.08
                : ((rigState.aileronDeg ?? 0) * Math.PI) / 180 * 0.35;
            const targetY = flightMode ? 0.22 + Math.sin(t * 1.8) * 0.08 : 0;

            aircraftRootRef.current.rotation.z = THREE.MathUtils.lerp(
                aircraftRootRef.current.rotation.z,
                targetPitch,
                delta * 4
            );
            aircraftRootRef.current.rotation.x = THREE.MathUtils.lerp(
                aircraftRootRef.current.rotation.x,
                targetRoll,
                delta * 4
            );
            aircraftRootRef.current.position.y = THREE.MathUtils.lerp(
                aircraftRootRef.current.position.y,
                targetY,
                delta * 4
            );
        }

        if (afterburnerRef.current) {
            const pulse = 0.92 + Math.sin(t * 28) * 0.12;
            afterburnerRef.current.scale.set(pulse, 1, pulse);
        }

        if (streamlinesRef.current && flightMode) {
            const pos = streamlinesRef.current.geometry.attributes.position;
            for (let i = 0; i < pos.count; i++) {
                let x = pos.getX(i) - delta * 14.0;
                if (x < -5.2) x = 5.2;
                pos.setX(i, x);
            }
            pos.needsUpdate = true;
        }
    });

    // Deterministic flight streamlines
    const streamPositions = useMemo(() => {
        const count = 160;
        const arr = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            const s1 = ((i * 73 + 11) % 101) / 101;
            const s2 = ((i * 139 + 29) % 97) / 97;
            const s3 = ((i * 197 + 47) % 89) / 89;
            arr[i * 3] = (s1 - 0.5) * 10.4;
            arr[i * 3 + 1] = (s2 - 0.45) * 2.2;
            arr[i * 3 + 2] = (s3 - 0.5) * 5.8;
        }
        return arr;
    }, []);

    const matProps = (partId, baseColor = '#CBD5E1', metalness = 0.48, roughness = 0.36) => {
        const isSel = selectedPart === partId;
        const isHov = hoveredPart === partId;
        if (wireframe) {
            return {
                color: isSel ? '#FBBF24' : isHov ? '#93C5FD' : '#3B82F6',
                emissive: isSel ? '#D97706' : '#1D4ED8',
                emissiveIntensity: isSel ? 0.65 : 0.3,
                wireframe: true,
            };
        }
        return {
            color: isSel ? '#FDE68A' : isHov ? '#93C5FD' : baseColor,
            emissive: isSel ? '#D97706' : isHov ? '#1F5BD8' : '#000000',
            emissiveIntensity: isSel ? 0.38 : isHov ? 0.25 : 0,
            metalness,
            roughness,
        };
    };

    const getPart = (id) => F16_PARTS.find((p) => p.id === id);

    const flapRad = ((rigState.flapDeg ?? 0) * Math.PI) / 180;
    const elevRad = ((rigState.elevatorDeg ?? 0) * Math.PI) / 180;
    const rudderRad = ((rigState.rudderDeg ?? 0) * Math.PI) / 180;

    return (
        <group ref={aircraftRootRef}>
            {/* 01 // RADOME & APG-68 RADAR */}
            <ExplodablePartGroup
                part={getPart('radome')}
                explodeFactor={explodeFactor}
                isSelected={selectedPart === 'radome'}
                isHovered={hoveredPart === 'radome'}
                onSelect={onSelectPart}
                onHover={onHoverPart}
                showLabels={showLabels}
            >
                {/* Ogive nose cone */}
                <mesh rotation={[0, 0, -Math.PI / 2]}>
                    <coneGeometry args={[0.34, 1.45, 28]} />
                    <meshStandardMaterial {...matProps('radome', '#94A3B8', 0.35, 0.45)} />
                </mesh>
                {/* Internal APG-68 Planar Phased-Array Radar Dish (visible when exploded) */}
                <mesh position={[-0.62, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                    <cylinderGeometry args={[0.28, 0.28, 0.08, 24]} />
                    <meshStandardMaterial color="#FBBF24" metalness={0.8} roughness={0.2} />
                </mesh>
                {/* Pitot nose probe */}
                <mesh position={[0.85, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
                    <cylinderGeometry args={[0.008, 0.018, 0.45, 8]} />
                    <meshStandardMaterial color="#E2E8F0" metalness={0.85} roughness={0.2} />
                </mesh>
            </ExplodablePartGroup>

            {/* 02 // COCKPIT & BUBBLE CANOPY */}
            <ExplodablePartGroup
                part={getPart('cockpit')}
                explodeFactor={explodeFactor}
                isSelected={selectedPart === 'cockpit'}
                isHovered={hoveredPart === 'cockpit'}
                onSelect={onSelectPart}
                onHover={onHoverPart}
                showLabels={showLabels}
            >
                {/* Cockpit tub & ACES II 30° reclined ejection seat */}
                <mesh position={[0, -0.08, 0]}>
                    <boxGeometry args={[1.45, 0.22, 0.48]} />
                    <meshStandardMaterial {...matProps('cockpit', '#334155', 0.4, 0.6)} />
                </mesh>
                <mesh position={[-0.1, 0.12, 0]} rotation={[0, 0, 0.52]}>
                    <boxGeometry args={[0.14, 0.48, 0.34]} />
                    <meshStandardMaterial color="#1E293B" roughness={0.7} />
                </mesh>
                {/* Holographic HUD combiner glass */}
                <mesh position={[0.48, 0.22, 0]} rotation={[0, 0, -0.45]}>
                    <boxGeometry args={[0.02, 0.18, 0.22]} />
                    <meshPhysicalMaterial
                        color="#34D399"
                        transparent
                        opacity={0.65}
                        roughness={0.1}
                    />
                </mesh>
                {/* Frameless Polycarbonate Bubble Canopy */}
                <mesh position={[0.05, 0.16, 0]} scale={[1.65, 0.52, 0.56]}>
                    <sphereGeometry args={[0.62, 28, 20, 0, Math.PI * 2, 0, Math.PI * 0.58]} />
                    <meshPhysicalMaterial
                        color={selectedPart === 'cockpit' ? '#FDE68A' : '#93C5FD'}
                        transparent
                        opacity={wireframe ? 0.85 : 0.42}
                        metalness={0.15}
                        roughness={0.08}
                        wireframe={wireframe}
                    />
                </mesh>
            </ExplodablePartGroup>

            {/* 03 // CENTRAL WING-BODY BLENDED AIRFRAME */}
            <ExplodablePartGroup
                part={getPart('airframe')}
                explodeFactor={explodeFactor}
                isSelected={selectedPart === 'airframe'}
                isHovered={hoveredPart === 'airframe'}
                onSelect={onSelectPart}
                onHover={onHoverPart}
                showLabels={showLabels}
            >
                {/* Main fuselage spine */}
                <mesh rotation={[0, 0, Math.PI / 2]} position={[0.1, 0.04, 0]}>
                    <cylinderGeometry args={[0.36, 0.44, 5.4, 28]} />
                    <meshStandardMaterial {...matProps('airframe', '#CBD5E1', 0.48, 0.35)} />
                </mesh>
                {/* Dorsal avionics spine */}
                <mesh position={[-0.35, 0.34, 0]}>
                    <boxGeometry args={[3.9, 0.24, 0.38]} />
                    <meshStandardMaterial {...matProps('airframe', '#B8C4D4', 0.45, 0.38)} />
                </mesh>
                {/* Blended Forebody Strakes (LERX) */}
                <mesh geometry={strakeGeometry} position={[0.1, 0.05, 0]}>
                    <meshStandardMaterial {...matProps('airframe', '#CBD5E1', 0.48, 0.35)} />
                </mesh>
                <mesh geometry={strakeGeometry} position={[0.1, 0.05, 0]} scale={[1, 1, -1]}>
                    <meshStandardMaterial {...matProps('airframe', '#CBD5E1', 0.48, 0.35)} />
                </mesh>
            </ExplodablePartGroup>

            {/* 04 // VENTRAL SUPERSONIC CHIN INTAKE */}
            <ExplodablePartGroup
                part={getPart('intake')}
                explodeFactor={explodeFactor}
                isSelected={selectedPart === 'intake'}
                isHovered={hoveredPart === 'intake'}
                onSelect={onSelectPart}
                onHover={onHoverPart}
                showLabels={showLabels}
            >
                {/* Outer chin intake cowling */}
                <mesh position={[0, 0.04, 0]} rotation={[0, 0, Math.PI / 2]}>
                    <cylinderGeometry args={[0.31, 0.35, 2.2, 20, 1, false, Math.PI * 0.5, Math.PI]} />
                    <meshStandardMaterial {...matProps('intake', '#BCC6D4', 0.45, 0.38)} />
                </mesh>
                {/* Dark inlet throat */}
                <mesh position={[1.08, 0.06, 0]} rotation={[0, 0, -Math.PI / 2]}>
                    <circleGeometry args={[0.26, 20]} />
                    <meshBasicMaterial color="#090D16" side={THREE.DoubleSide} />
                </mesh>
            </ExplodablePartGroup>

            {/* 05 // PORT CROPPED-DELTA WING & FLAPERON */}
            <ExplodablePartGroup
                part={getPart('port_wing')}
                explodeFactor={explodeFactor}
                isSelected={selectedPart === 'port_wing'}
                isHovered={hoveredPart === 'port_wing'}
                onSelect={onSelectPart}
                onHover={onHoverPart}
                showLabels={showLabels}
            >
                <group scale={[1, 1, -1]}>
                    <mesh geometry={wingGeometry}>
                        <meshStandardMaterial {...matProps('port_wing', '#D1D9E4', 0.48, 0.34)} />
                    </mesh>
                    {/* Articulated Flaperon */}
                    <mesh
                        position={[-0.75, 0, 0.95]}
                        rotation={[0, 0, flapRad]}
                    >
                        <boxGeometry args={[0.34, 0.04, 1.35]} />
                        <meshStandardMaterial {...matProps('port_wing', '#94A3B8', 0.55, 0.3)} />
                    </mesh>
                </group>
            </ExplodablePartGroup>

            {/* 06 // STARBOARD CROPPED-DELTA WING & FLAPERON */}
            <ExplodablePartGroup
                part={getPart('starboard_wing')}
                explodeFactor={explodeFactor}
                isSelected={selectedPart === 'starboard_wing'}
                isHovered={hoveredPart === 'starboard_wing'}
                onSelect={onSelectPart}
                onHover={onHoverPart}
                showLabels={showLabels}
            >
                <mesh geometry={wingGeometry}>
                    <meshStandardMaterial {...matProps('starboard_wing', '#D1D9E4', 0.48, 0.34)} />
                </mesh>
                {/* Articulated Flaperon */}
                <mesh
                    position={[-0.75, 0, 0.95]}
                    rotation={[0, 0, -flapRad]}
                >
                    <boxGeometry args={[0.34, 0.04, 1.35]} />
                    <meshStandardMaterial {...matProps('starboard_wing', '#94A3B8', 0.55, 0.3)} />
                </mesh>
            </ExplodablePartGroup>

            {/* 07 // VERTICAL STABILIZER & RUDDER */}
            <ExplodablePartGroup
                part={getPart('vertical_tail')}
                explodeFactor={explodeFactor}
                isSelected={selectedPart === 'vertical_tail'}
                isHovered={hoveredPart === 'vertical_tail'}
                onSelect={onSelectPart}
                onHover={onHoverPart}
                showLabels={showLabels}
            >
                <mesh geometry={vTailGeometry} position={[0, -0.5, 0]}>
                    <meshStandardMaterial {...matProps('vertical_tail', '#CBD5E1', 0.45, 0.38)} />
                </mesh>
                {/* Top ECM tip pod */}
                <mesh position={[-0.64, 0.88, 0]} rotation={[0, 0, Math.PI / 2]}>
                    <cylinderGeometry args={[0.04, 0.04, 0.68, 12]} />
                    <meshStandardMaterial color="#475569" metalness={0.5} roughness={0.4} />
                </mesh>
                {/* Articulated Rudder */}
                <mesh position={[-0.78, 0.15, 0]} rotation={[0, rudderRad, 0]}>
                    <boxGeometry args={[0.24, 1.15, 0.04]} />
                    <meshStandardMaterial {...matProps('vertical_tail', '#94A3B8', 0.5, 0.35)} />
                </mesh>
            </ExplodablePartGroup>

            {/* 08 // PORT ALL-MOVING STABILATOR */}
            <ExplodablePartGroup
                part={getPart('port_stabilator')}
                explodeFactor={explodeFactor}
                isSelected={selectedPart === 'port_stabilator'}
                isHovered={hoveredPart === 'port_stabilator'}
                onSelect={onSelectPart}
                onHover={onHoverPart}
                showLabels={showLabels}
            >
                <group scale={[1, 1, -1]} rotation={[0, 0, elevRad]}>
                    <mesh geometry={stabilatorGeometry}>
                        <meshStandardMaterial {...matProps('port_stabilator', '#BCC6D4', 0.5, 0.35)} />
                    </mesh>
                </group>
            </ExplodablePartGroup>

            {/* 09 // STARBOARD ALL-MOVING STABILATOR */}
            <ExplodablePartGroup
                part={getPart('starboard_stabilator')}
                explodeFactor={explodeFactor}
                isSelected={selectedPart === 'starboard_stabilator'}
                isHovered={hoveredPart === 'starboard_stabilator'}
                onSelect={onSelectPart}
                onHover={onHoverPart}
                showLabels={showLabels}
            >
                <group rotation={[0, 0, elevRad]}>
                    <mesh geometry={stabilatorGeometry}>
                        <meshStandardMaterial {...matProps('starboard_stabilator', '#BCC6D4', 0.5, 0.35)} />
                    </mesh>
                </group>
            </ExplodablePartGroup>

            {/* 10 // F110 AFTERBURNING TURBOFAN & IRIS NOZZLE */}
            <ExplodablePartGroup
                part={getPart('nozzle')}
                explodeFactor={explodeFactor}
                isSelected={selectedPart === 'nozzle'}
                isHovered={hoveredPart === 'nozzle'}
                onSelect={onSelectPart}
                onHover={onHoverPart}
                showLabels={showLabels}
            >
                {/* Internal Turbofan Core Drum (visible when exploded) */}
                <mesh position={[0.85, 0.04, 0]} rotation={[0, 0, Math.PI / 2]}>
                    <cylinderGeometry args={[0.28, 0.31, 1.45, 24]} />
                    <meshStandardMaterial color="#64748B" metalness={0.8} roughness={0.25} />
                </mesh>
                {/* Iris C-D Exhaust Nozzle Petals */}
                <mesh position={[0, 0.04, 0]} rotation={[0, 0, Math.PI / 2]}>
                    <cylinderGeometry args={[0.29, 0.36, 0.65, 20]} />
                    <meshStandardMaterial {...matProps('nozzle', '#334155', 0.78, 0.28)} />
                </mesh>
                {/* Inner Glowing Afterburner Flame Holder */}
                <mesh position={[-0.28, 0.04, 0]} rotation={[0, 0, Math.PI / 2]}>
                    <cylinderGeometry args={[0.24, 0.24, 0.08, 20]} />
                    <meshBasicMaterial color={flightMode ? '#60A5FA' : '#F97316'} />
                </mesh>

                {/* Volumetric Afterburner Shock-Diamond Plume (Active in Launch Flight mode) */}
                {flightMode && (
                    <group ref={afterburnerRef} position={[-1.35, 0.04, 0]} rotation={[0, 0, Math.PI / 2]}>
                        <mesh>
                            <coneGeometry args={[0.26, 2.2, 20, 1, true]} />
                            <meshBasicMaterial
                                color="#3B82F6"
                                transparent
                                opacity={0.65}
                                side={THREE.DoubleSide}
                            />
                        </mesh>
                        <mesh position={[0, 0.35, 0]}>
                            <coneGeometry args={[0.16, 1.35, 16]} />
                            <meshBasicMaterial color="#FDE047" transparent opacity={0.85} />
                        </mesh>
                        {/* Shock diamonds */}
                        {[-0.2, 0.15, 0.5].map((yOff, idx) => (
                            <mesh key={idx} position={[0, yOff, 0]} scale={[1, 0.4, 1]}>
                                <octahedronGeometry args={[0.14 - idx * 0.025, 0]} />
                                <meshBasicMaterial color="#FFFFFF" transparent opacity={0.8} />
                            </mesh>
                        ))}
                    </group>
                )}
            </ExplodablePartGroup>

            {/* 11 // TRICYCLE UNDERCARRIAGE (Retracts in Flight Mode) */}
            {!flightMode && (
                <ExplodablePartGroup
                    part={getPart('undercarriage')}
                    explodeFactor={explodeFactor}
                    isSelected={selectedPart === 'undercarriage'}
                    isHovered={hoveredPart === 'undercarriage'}
                    onSelect={onSelectPart}
                    onHover={onHoverPart}
                    showLabels={showLabels}
                >
                    {/* Nose gear strut & wheel */}
                    <mesh position={[1.15, 0.15, 0]}>
                        <cylinderGeometry args={[0.03, 0.03, 0.55, 10]} />
                        <meshStandardMaterial color="#E2E8F0" metalness={0.8} roughness={0.2} />
                    </mesh>
                    <mesh position={[1.15, -0.14, 0]} rotation={[Math.PI / 2, 0, 0]}>
                        <cylinderGeometry args={[0.13, 0.13, 0.08, 18]} />
                        <meshStandardMaterial color="#1E293B" roughness={0.85} />
                    </mesh>

                    {/* Port & Starboard Main Gear */}
                    {[-0.65, 0.65].map((zSide, idx) => (
                        <group key={idx} position={[-0.55, 0.15, zSide]}>
                            <mesh rotation={[zSide > 0 ? -0.35 : 0.35, 0, 0]}>
                                <cylinderGeometry args={[0.04, 0.04, 0.62, 10]} />
                                <meshStandardMaterial color="#E2E8F0" metalness={0.8} roughness={0.2} />
                            </mesh>
                            <mesh position={[0, -0.28, zSide > 0 ? 0.12 : -0.12]} rotation={[Math.PI / 2, 0, 0]}>
                                <cylinderGeometry args={[0.19, 0.19, 0.12, 20]} />
                                <meshStandardMaterial color="#1E293B" roughness={0.85} />
                            </mesh>
                        </group>
                    ))}
                </ExplodablePartGroup>
            )}

            {/* 12 // WINGTIP AIM-9 RAILS & UNDER-WING STORES */}
            <ExplodablePartGroup
                part={getPart('stores')}
                explodeFactor={explodeFactor}
                isSelected={selectedPart === 'stores'}
                isHovered={hoveredPart === 'stores'}
                onSelect={onSelectPart}
                onHover={onHoverPart}
                showLabels={showLabels}
            >
                {[-1, 1].map((side) => (
                    <group key={side}>
                        {/* Wingtip AIM-9 Sidewinder Rail & Missile */}
                        <group position={[-0.65, 0.24, side * 2.72]}>
                            <mesh rotation={[0, 0, Math.PI / 2]}>
                                <cylinderGeometry args={[0.035, 0.035, 1.35, 12]} />
                                <meshStandardMaterial {...matProps('stores', '#E2E8F0', 0.5, 0.3)} />
                            </mesh>
                            <mesh position={[0.72, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
                                <coneGeometry args={[0.035, 0.18, 12]} />
                                <meshStandardMaterial color="#334155" metalness={0.6} roughness={0.3} />
                            </mesh>
                        </group>

                        {/* Under-wing 370-gal External Fuel Drop Tank */}
                        <group position={[-0.35, -0.02, side * 1.25]}>
                            <mesh position={[0, 0.14, 0]}>
                                <boxGeometry args={[0.65, 0.16, 0.05]} />
                                <meshStandardMaterial color="#94A3B8" />
                            </mesh>
                            <mesh rotation={[0, 0, Math.PI / 2]}>
                                <cylinderGeometry args={[0.14, 0.14, 1.55, 18]} />
                                <meshStandardMaterial {...matProps('stores', '#CBD5E1', 0.45, 0.38)} />
                            </mesh>
                            <mesh position={[0.92, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
                                <coneGeometry args={[0.14, 0.35, 18]} />
                                <meshStandardMaterial {...matProps('stores', '#CBD5E1', 0.45, 0.38)} />
                            </mesh>
                            <mesh position={[-0.92, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                                <coneGeometry args={[0.14, 0.35, 18]} />
                                <meshStandardMaterial {...matProps('stores', '#CBD5E1', 0.45, 0.38)} />
                            </mesh>
                        </group>
                    </group>
                ))}
            </ExplodablePartGroup>

            {/* High-Speed Flight Streamlines */}
            {flightMode && (
                <points ref={streamlinesRef}>
                    <bufferGeometry>
                        <bufferAttribute
                            attach="attributes-position"
                            count={streamPositions.length / 3}
                            array={streamPositions}
                            itemSize={3}
                        />
                    </bufferGeometry>
                    <pointsMaterial color="#60A5FA" size={0.045} transparent opacity={0.75} />
                </points>
            )}
        </group>
    );
}

export default function F16FalconAssembly({
    explodeFactor = 0,
    selectedPart,
    selectedPartId,
    onSelectPart = () => {},
    flightMode = false,
    wireframe = false,
    viewPreset,
    cameraView,
    showLabels = true,
    rigState = {},
    controlDeflections = {},
}) {
    const controlsRef = useRef();
    const [hoveredPart, setHoveredPart] = React.useState(null);
    const activeSelectedPart = selectedPartId || selectedPart || 'cockpit';
    const activeViewPreset = cameraView || viewPreset || 'overview';
    const mergedRigState = {
        ...rigState,
        aileronDeg: controlDeflections.aileron ?? rigState.aileronDeg ?? 0,
        elevatorDeg: controlDeflections.elevator ?? rigState.elevatorDeg ?? 0,
        rudderDeg: controlDeflections.rudder ?? rigState.rudderDeg ?? 0,
        flapDeg: controlDeflections.flaps ?? rigState.flapDeg ?? 0,
    };

    return (
        <div
            style={{
                width: '100%',
                height: '100%',
                position: 'relative',
                background:
                    'radial-gradient(circle at 50% 42%, #172030 0%, #090C12 68%, #05070B 100%)',
                overflow: 'hidden',
            }}
        >
            <Canvas
                dpr={[1, 1.5]}
                camera={{ position: [6.2, 2.5, 6.8], fov: 40, near: 0.1, far: 120 }}
                gl={{ powerPreference: 'high-performance', antialias: true }}
            >
                <ambientLight intensity={0.95} />
                <directionalLight position={[10, 14, 8]} intensity={1.65} color="#F8FAFC" />
                <directionalLight position={[-8, -5, -6]} intensity={0.65} color="#60A5FA" />
                <pointLight position={[-4, 1, 0]} intensity={flightMode ? 2.4 : 0.4} color="#3B82F6" />

                {/* Subtle Studio Hangar Floor Grid */}
                <gridHelper args={[28, 28, '#263142', '#131924']} position={[0, -1.15, 0]} />

                <F16SculptedModel
                    explodeFactor={explodeFactor}
                    selectedPart={activeSelectedPart}
                    hoveredPart={hoveredPart}
                    onSelectPart={onSelectPart}
                    onHoverPart={setHoveredPart}
                    flightMode={flightMode}
                    wireframe={wireframe}
                    showLabels={showLabels}
                    rigState={mergedRigState}
                />

                <OrbitControls
                    ref={controlsRef}
                    enableDamping
                    dampingFactor={0.08}
                    minDistance={2.2}
                    maxDistance={16.5}
                />

                <SmoothViewCamera
                    viewPreset={activeViewPreset}
                    selectedPart={activeSelectedPart}
                    explodeFactor={explodeFactor}
                    controlsRef={controlsRef}
                />
            </Canvas>
        </div>
    );
}

