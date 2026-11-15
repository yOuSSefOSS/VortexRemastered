import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html, Line, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { computeNACA4Digit } from '../../domain/nacaGeometry';

/**
 * ============================================================================
 * AERO / ARCHIVE — HIGH-PRECISION F-16C BLOCK 50 FIGHTING FALCON 3D ASSEMBLY
 * - High-segment parametric aerodynamic meshes (tangent-ogive radome, lofted
 *   blended wing-body fuselage spine & LERX strakes, seamless teardrop bubble
 *   canopy with ACES II cockpit, NACA 64A204 lofted wings, biconvex tail,
 *   16-petal convergent-divergent F110 iris nozzle, detailed tricycle landing
 *   gear, and finned AIM-9X / drop-tank external stores).
 * - Full Free-Orbit Mode (`selectedPart = null`): users can clear selection or
 *   click empty space to orbit/pan/zoom freely without camera lock.
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
        basePos: [3.55, -0.03, 0],
        explodeOffset: [2.25, 0.32, 0],
        anchorOffset: [0.45, 0.14, 0],
        labelOffset: [0.85, 0.92, 0.4],
        summary:
            'Dielectric Sears-Haack ogive nose cone housing the Northrop Grumman AN/APG-68(V)9 pulse-Doppler radar array and nose pitot-static boom.',
        engineeringNote:
            'Contoured to minimize transonic wave drag (CD,wave) while maintaining radar transparency across X-band fire-control frequencies.',
        engineering:
            'Contoured to minimize transonic wave drag (CD,wave) while maintaining radar transparency across X-band fire-control frequencies.',
        formula: 'θ_cone = arctan(d / 2L) ,  M_crit = 0.88',
        specs: [
            { label: 'Radar Array', value: 'AN/APG-68(V)9 X-Band Pulse-Doppler' },
            { label: 'Fineness Ratio', value: 'L/D = 3.4 Tangent Ogive' },
            { label: 'Detection Range', value: '296 km Look-Down / Shoot-Down' },
        ],
    },
    {
        id: 'cockpit',
        index: '02',
        name: 'Cockpit section & polycarbonate canopy',
        shortLabel: 'Cockpit & canopy',
        category: 'Crew station',
        code: 'F16-02',
        subsystemMap: 'avionics',
        basePos: [1.75, 0.34, 0],
        explodeOffset: [0.85, 1.48, 0],
        anchorOffset: [0.05, 0.28, 0],
        labelOffset: [0.3, 1.15, -0.5],
        summary:
            'Frameless single-piece polycarbonate teardrop bubble canopy providing 360° upper-hemisphere visibility, paired with a 30° reclined ACES II ejection seat and force-sensing side-stick.',
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
        shortLabel: 'Blended airframe',
        category: 'Primary structure',
        code: 'F16-03',
        subsystemMap: 'fuselage',
        basePos: [0, 0, 0],
        explodeOffset: [0, 0.16, 0],
        anchorOffset: [0.1, 0.32, 0],
        labelOffset: [-0.2, 1.38, 0],
        summary:
            'Area-ruled blended wing-body (BWB) forebody strakes (LERX) and multi-frame Al-2024/Ti-6Al-4V dorsal fuselage spine carrying wing bending moments and internal fuel.',
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
        basePos: [0.95, -0.45, 0],
        explodeOffset: [0.9, -1.28, 0],
        anchorOffset: [0.3, -0.14, 0],
        labelOffset: [0.6, -0.95, 0.7],
        summary:
            'Fixed-geometry Modular Common Inlet Duct (MCID) positioned beneath the forebody with a boundary-layer splitter plate to prevent gun-gas ingestion and flow separation at high α.',
        engineeringNote:
            'Decelerates supersonic freestream flow (Mach 1.6–2.0) to subsonic Mach ~0.45 at the fan face through a normal shock and curved S-diffuser.',
        engineering:
            'Decelerates supersonic freestream flow (Mach 1.6–2.0) to subsonic Mach ~0.45 at the fan face through a normal shock and curved S-diffuser.',
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
        basePos: [-0.35, 0.02, -0.62],
        explodeOffset: [-0.15, 0.25, -1.85],
        anchorOffset: [-0.1, 0.04, -1.2],
        labelOffset: [0.2, 0.85, -2.1],
        summary:
            '40° leading-edge sweep cropped-delta planform lofted with a thin NACA 64A204 supersonic airfoil section (4% thickness-to-chord ratio) and auto-scheduled leading-edge flap.',
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
        basePos: [-0.35, 0.02, 0.62],
        explodeOffset: [-0.15, 0.25, 1.85],
        anchorOffset: [-0.1, 0.04, 1.2],
        labelOffset: [0.2, 0.85, 2.1],
        summary:
            'Starboard primary lifting surface featuring integral wet-wing fuel bays, multi-spar aluminum substructure, and electro-hydrostatic flaperon actuators.',
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
        basePos: [-2.52, 0.82, 0],
        explodeOffset: [-1.45, 1.55, 0],
        anchorOffset: [-0.2, 0.55, 0],
        labelOffset: [-0.9, 1.45, -0.4],
        summary:
            'High-sweep carbon-epoxy composite vertical tail fin with dorsal avionics fairing, RWR antenna blister, drag-chute/ECM housing, and rudder servo-actuator.',
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
            'All-moving pivoted horizontal tail surface with 10° anhedral droop, providing primary longitudinal pitch control and differential roll augmentation (tailerons).',
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
        basePos: [-2.95, 0.02, 0],
        explodeOffset: [-2.35, 0.05, 0],
        anchorOffset: [-0.35, 0, 0],
        labelOffset: [-1.4, 0.65, 0.6],
        summary:
            '16-petal variable-area convergent-divergent (C-D) iris exhaust nozzle mated to the GE F110-GE-129 afterburning turbofan (131.2 kN wet thrust).',
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
        basePos: [0.1, -0.76, 0],
        explodeOffset: [0, -1.65, 0],
        anchorOffset: [0, -0.25, 0],
        labelOffset: [-0.2, -1.05, -0.9],
        summary:
            'Steerable nose gear aft of the chin intake and wide-track fuselage-retracting main A-frame gear with oleo-pneumatic shock struts and multi-disc carbon brakes.',
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
        name: 'Wingtip AIM-9X rails & external fuel stores',
        shortLabel: 'External stores',
        category: 'Payload & stores',
        code: 'F16-12',
        subsystemMap: 'wings',
        basePos: [-0.35, -0.22, 0],
        explodeOffset: [0.35, -1.05, 1.65],
        anchorOffset: [0, -0.1, 1.5],
        labelOffset: [0.6, -0.75, 2.2],
        summary:
            'Wingtip LAU-129 launch rails carrying AIM-9X Sidewinder air-to-air missiles, under-wing AIM-120 AMRAAMs, and 370-gallon Sargent Fletcher external drop tanks.',
        engineeringNote:
            'Mounting missiles on the wingtips acts like aerodynamic endplates/winglets, attenuating wingtip vortex roll-up and reducing induced drag CD,i by ~6%.',
        engineering:
            'Mounting missiles on the wingtips acts like aerodynamic endplates/winglets, attenuating wingtip vortex roll-up and reducing induced drag CD,i by ~6%.',
        formula: 'CD,i = CL² / (π · AR_eff · e)',
        specs: [
            { label: 'Wingtip Stations', value: '2 × LAU-129 Rails (AIM-9X Sidewinder)' },
            { label: 'External Fuel', value: '2 × 370 US gal Finned Drop Tanks' },
            { label: 'Wingtip Vortex Effect', value: '-6% Induced Drag via Endplate Effect' },
        ],
    },
];

const CAMERA_VIEWS = {
    overview: { pos: [6.0, 2.35, 6.5], target: [0.15, 0.05, 0] },
    top: { pos: [0.1, 9.2, 0.01], target: [0.1, 0, 0] },
    side: { pos: [0.1, 0.55, 8.6], target: [0.1, 0.0, 0] },
    front: { pos: [8.4, 0.75, 0.01], target: [0, 0.0, 0] },
};

/**
 * Helper: Build a smooth 3D lofted tapered swept wing/fin BufferGeometry
 * using real NACA 4-digit airfoil coordinates at root and tip.
 */
function buildLoftedAirfoilGeometry({
    rootChord = 2.2,
    tipChord = 0.55,
    span = 2.1,
    sweepOffset = 0.72,
    dihedralOffset = 0.0,
    camber = 0.015,
    maxCamberLoc = 0.4,
    thickness = 0.045,
    profileSegments = 44,
    spanSegments = 16,
    vertical = false,
}) {
    const profile = computeNACA4Digit(camber, maxCamberLoc, thickness, profileSegments);
    const nPts = profile.length;
    const positions = [];
    const indices = [];

    for (let j = 0; j <= spanSegments; j++) {
        const v = j / spanSegments;
        const chord = THREE.MathUtils.lerp(rootChord, tipChord, v);
        const xShift = v * sweepOffset;
        const spanCoord = v * span;
        const orthoCoord = v * dihedralOffset;

        for (let i = 0; i < nPts; i++) {
            const [nx, ny] = profile[i];
            const lx = (0.45 - nx) * chord - xShift;
            const ly = ny * chord;
            if (vertical) {
                positions.push(lx, spanCoord, ly + orthoCoord);
            } else {
                positions.push(lx, ly + orthoCoord, spanCoord);
            }
        }
    }

    const ringSize = nPts;
    for (let j = 0; j < spanSegments; j++) {
        for (let i = 0; i < ringSize - 1; i++) {
            const a = j * ringSize + i;
            const b = (j + 1) * ringSize + i;
            const c = (j + 1) * ringSize + (i + 1);
            const d = j * ringSize + (i + 1);
            indices.push(a, b, d);
            indices.push(b, c, d);
        }
    }

    // Cap root and tip
    const rootCenterIdx = positions.length / 3;
    positions.push(0, 0, 0);
    const tipCenterIdx = rootCenterIdx + 1;
    if (vertical) {
        positions.push(-sweepOffset, span, dihedralOffset);
    } else {
        positions.push(-sweepOffset, dihedralOffset, span);
    }

    for (let i = 0; i < ringSize - 1; i++) {
        indices.push(rootCenterIdx, i + 1, i);
        const tipBase = spanSegments * ringSize;
        indices.push(tipCenterIdx, tipBase + i, tipBase + i + 1);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
}

/**
 * Helper: Build a smooth Sears-Haack / Tangent-Ogive LatheGeometry oriented along +X
 */
function buildOgiveRadomeGeometry(length = 1.55, baseRadius = 0.35, axialSegs = 44, radialSegs = 64) {
    const pts = [];
    for (let i = 0; i <= axialSegs; i++) {
        const t = i / axialSegs; // 0 at base, 1 at nose tip
        // Haack-series / tangent ogive blend for smooth curve
        const r = baseRadius * Math.pow(1 - t, 0.64) * (1 + 0.16 * t);
        const y = (t - 0.5) * length;
        pts.push(new THREE.Vector2(Math.max(0.002, r), y));
    }
    const geo = new THREE.LatheGeometry(pts, radialSegs);
    geo.rotateZ(-Math.PI / 2);
    geo.computeVertexNormals();
    return geo;
}

/**
 * Helper: Build a sculpted F-16 Teardrop Bubble Canopy Geometry
 */
function buildBubbleCanopyGeometry() {
    const geo = new THREE.SphereGeometry(1, 56, 36, 0, Math.PI * 2, 0, Math.PI * 0.52);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
        let x = pos.getX(i);
        let y = pos.getY(i);
        let z = pos.getZ(i);

        // Stretch longitudinally into F-16 teardrop profile: steeper front windscreen, long tapered aft spine
        const longX = x * 1.12;
        const taperZ = longX < 0 ? 1.0 - Math.min(0.48, Math.abs(longX) * 0.35) : 1.0 - longX * 0.22;
        const heightMod = longX > 0 ? 1.0 - longX * 0.18 : 1.0 - Math.abs(longX) * 0.12;

        x = longX + 0.08;
        y = Math.max(0, y) * 0.37 * heightMod;
        z = z * 0.34 * taperZ;

        pos.setXYZ(i, x, y, z);
    }
    geo.computeVertexNormals();
    return geo;
}

/**
 * Helper: Build a contoured area-ruled F-16 main fuselage hull along X
 */
function buildSculptedFuselageGeometry() {
    const pts = [];
    const steps = 56;
    const totalLen = 5.45;
    for (let i = 0; i <= steps; i++) {
        const u = i / steps; // 0 = aft nozzle junction, 1 = forward radome bulkhead
        const x = (u - 0.5) * totalLen;
        // Area-ruled wasp-waist contour + forebody taper
        let r = 0.38;
        if (u < 0.18) {
            r = THREE.MathUtils.lerp(0.34, 0.41, u / 0.18);
        } else if (u < 0.65) {
            const mid = (u - 0.18) / 0.47;
            r = 0.42 + Math.sin(mid * Math.PI) * 0.045;
        } else {
            const fwd = (u - 0.65) / 0.35;
            r = THREE.MathUtils.lerp(0.42, 0.35, fwd);
        }
        pts.push(new THREE.Vector2(r, x));
    }
    const geo = new THREE.LatheGeometry(pts, 64);
    geo.rotateZ(-Math.PI / 2);
    // Slightly flatten bottom & widen chine waist for blended wing-body cross-section
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        let y = pos.getY(i);
        let z = pos.getZ(i);
        const waistBoost = Math.exp(-Math.pow((x - 0.2) / 1.8, 2)) * 0.18;
        z *= 1.08 + waistBoost;
        if (y < 0) y *= 0.84;
        pos.setXYZ(i, x, y, z);
    }
    geo.computeVertexNormals();
    return geo;
}

/**
 * SmoothViewCamera:
 * - Only animates when `selectedPart` changes to a non-null part OR `viewPreset` changes.
 * - Immediately yields control (`animFrames.current = 0`) the instant the user interacts with OrbitControls,
 *   so manual orbiting/panning/zooming is never fought by the animation loop.
 */
function SmoothViewCamera({ viewPreset, selectedPart, explodeFactor, controlsRef, animFramesRef }) {
    const { camera } = useThree();
    const desiredPos = useRef(new THREE.Vector3(6.0, 2.35, 6.5));
    const desiredTarget = useRef(new THREE.Vector3(0.15, 0.05, 0));
    const prevSelectedRef = useRef(selectedPart);
    const prevPresetRef = useRef(viewPreset);

    useEffect(() => {
        const partChanged = selectedPart !== prevSelectedRef.current;
        const presetChanged = viewPreset !== prevPresetRef.current;
        prevSelectedRef.current = selectedPart;
        prevPresetRef.current = viewPreset;

        if (!partChanged && !presetChanged) {
            return;
        }

        if (selectedPart && partChanged) {
            const p = F16_PARTS.find((item) => item.id === selectedPart);
            if (p) {
                const tx = p.basePos[0] + p.explodeOffset[0] * explodeFactor;
                const ty = p.basePos[1] + p.explodeOffset[1] * explodeFactor;
                const tz = p.basePos[2] + p.explodeOffset[2] * explodeFactor;
                desiredTarget.current.set(tx, ty, tz);
                desiredPos.current.set(
                    tx + 3.6,
                    ty + 1.65,
                    tz + (tz >= 0 ? 4.2 : -4.2)
                );
                animFramesRef.current = 48;
                return;
            }
        }

        if (presetChanged || (partChanged && !selectedPart)) {
            const preset = CAMERA_VIEWS[viewPreset] || CAMERA_VIEWS.overview;
            desiredPos.current.set(...preset.pos);
            desiredTarget.current.set(...preset.target);
            animFramesRef.current = 45;
        }
    }, [viewPreset, selectedPart, explodeFactor, animFramesRef]);

    useFrame((_, delta) => {
        if (animFramesRef.current <= 0) return;
        animFramesRef.current -= 1;
        const alpha = Math.min(1, delta * 6.0);
        camera.position.lerp(desiredPos.current, alpha);
        if (controlsRef.current) {
            controlsRef.current.target.lerp(desiredTarget.current, alpha);
            controlsRef.current.update();
        }
        if (
            camera.position.distanceTo(desiredPos.current) < 0.03 &&
            controlsRef.current?.target.distanceTo(desiredTarget.current) < 0.03
        ) {
            animFramesRef.current = 0;
        }
    });

    return null;
}

/**
 * Animated Part Wrapper that smoothly interpolates its position along explodeOffset.
 * Clicking an already-selected part toggles it off (`null`) for Free Orbit mode.
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
    const targetVec = useMemo(() => new THREE.Vector3(), []);

    useFrame((_, delta) => {
        if (!groupRef.current) return;
        const tx = part.basePos[0] + part.explodeOffset[0] * explodeFactor;
        const ty = part.basePos[1] + part.explodeOffset[1] * explodeFactor;
        const tz = part.basePos[2] + part.explodeOffset[2] * explodeFactor;
        targetVec.set(tx, ty, tz);
        currentPos.current.lerp(targetVec, Math.min(1, delta * 7.5));
        groupRef.current.position.copy(currentPos.current);
    });

    const showPin = showLabels && (explodeFactor > 0.08 || isSelected || isHovered);

    return (
        <group
            ref={groupRef}
            position={part.basePos}
            onClick={(e) => {
                e.stopPropagation();
                onSelect(isSelected ? null : part.id);
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
                        color={isSelected ? '#F4B740' : '#2E8BFF'}
                        lineWidth={isSelected ? 2.0 : 1.15}
                        transparent
                        opacity={isSelected ? 0.96 : 0.65}
                    />
                    <mesh position={part.anchorOffset}>
                        <sphereGeometry args={[isSelected ? 0.052 : 0.04, 16, 16]} />
                        <meshBasicMaterial color={isSelected ? '#F4B740' : '#2BC8FF'} />
                    </mesh>
                    <Html position={part.labelOffset} center distanceFactor={11} zIndexRange={[10, 0]}>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onSelect(isSelected ? null : part.id);
                            }}
                            title={isSelected ? 'Click to deselect (Free Orbit)' : `Inspect ${part.name}`}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '4px 10px',
                                borderRadius: '999px',
                                background: 'var(--glass-bg-strong)',
                                backdropFilter: 'blur(12px)',
                                border: isSelected
                                    ? '1px solid var(--accent-gold)'
                                    : '1px solid var(--glass-border)',
                                color: isSelected ? 'var(--accent-gold)' : 'var(--glass-text)',
                                fontFamily: 'var(--font-mono)',
                                fontSize: '10px',
                                fontWeight: 600,
                                whiteSpace: 'nowrap',
                                cursor: 'pointer',
                                boxShadow: 'var(--shadow-md)',
                            }}
                        >
                            <span
                                style={{
                                    width: '6px',
                                    height: '6px',
                                    borderRadius: '99px',
                                    background: isSelected ? 'var(--accent-gold)' : 'var(--accent-cyan)',
                                }}
                            />
                            <span>{part.index} · {part.shortLabel}</span>
                        </button>
                    </Html>
                </>
            )}
        </group>
    );
}

/**
 * High-Detail Sculpted 3D F-16C Block 50 Fighting Falcon Mesh Assembly
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

    // High-resolution procedural aerodynamic geometries with automatic GPU cleanup
    const {
        radomeGeo,
        canopyGeo,
        fuselageGeo,
        wingGeo,
        flaperonGeo,
        vTailGeo,
        stabilatorGeo,
        strakeGeo,
    } = useMemo(() => {
        const rGeo = buildOgiveRadomeGeometry(1.52, 0.35, 48, 64);
        const cGeo = buildBubbleCanopyGeometry();
        const fGeo = buildSculptedFuselageGeometry();

        // NACA 64A204 cropped-delta main wing
        const wGeo = buildLoftedAirfoilGeometry({
            rootChord: 2.25,
            tipChord: 0.56,
            span: 2.08,
            sweepOffset: 0.68,
            dihedralOffset: 0.0,
            camber: 0.014,
            maxCamberLoc: 0.4,
            thickness: 0.046,
            profileSegments: 48,
            spanSegments: 18,
            vertical: false,
        });

        // Tapered trailing-edge flaperon
        const flpGeo = buildLoftedAirfoilGeometry({
            rootChord: 0.36,
            tipChord: 0.24,
            span: 1.42,
            sweepOffset: 0.08,
            dihedralOffset: 0.0,
            camber: 0.008,
            maxCamberLoc: 0.4,
            thickness: 0.06,
            profileSegments: 28,
            spanSegments: 8,
            vertical: false,
        });

        // High-sweep biconvex vertical stabilizer
        const vGeo = buildLoftedAirfoilGeometry({
            rootChord: 1.62,
            tipChord: 0.56,
            span: 1.42,
            sweepOffset: 0.82,
            dihedralOffset: 0.0,
            camber: 0.0,
            maxCamberLoc: 0.5,
            thickness: 0.055,
            profileSegments: 40,
            spanSegments: 14,
            vertical: true,
        });

        // Swept all-moving horizontal stabilator with 10° anhedral droop
        const sGeo = buildLoftedAirfoilGeometry({
            rootChord: 1.02,
            tipChord: 0.34,
            span: 1.05,
            sweepOffset: 0.42,
            dihedralOffset: -0.14,
            camber: 0.0,
            maxCamberLoc: 0.5,
            thickness: 0.042,
            profileSegments: 36,
            spanSegments: 12,
            vertical: false,
        });

        // Smooth contoured Forebody LERX Strake
        const lShape = new THREE.Shape();
        lShape.moveTo(2.48, 0);
        lShape.bezierCurveTo(1.85, 0.36, 1.15, 0.62, 0.45, 0.68);
        lShape.lineTo(-1.25, 0.7);
        lShape.lineTo(-1.25, 0);
        lShape.closePath();
        const lGeo = new THREE.ExtrudeGeometry(lShape, {
            depth: 0.045,
            bevelEnabled: true,
            bevelThickness: 0.022,
            bevelSize: 0.022,
            bevelSegments: 5,
            curveSegments: 32,
        });
        lGeo.rotateX(Math.PI / 2);
        lGeo.computeVertexNormals();

        return {
            radomeGeo: rGeo,
            canopyGeo: cGeo,
            fuselageGeo: fGeo,
            wingGeo: wGeo,
            flaperonGeo: flpGeo,
            vTailGeo: vGeo,
            stabilatorGeo: sGeo,
            strakeGeo: lGeo,
        };
    }, []);

    useEffect(() => {
        return () => {
            radomeGeo.dispose();
            canopyGeo.dispose();
            fuselageGeo.dispose();
            wingGeo.dispose();
            flaperonGeo.dispose();
            vTailGeo.dispose();
            stabilatorGeo.dispose();
            strakeGeo.dispose();
        };
    }, [radomeGeo, canopyGeo, fuselageGeo, wingGeo, flaperonGeo, vTailGeo, stabilatorGeo, strakeGeo]);

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
            const pulse = 0.92 + Math.sin(t * 30) * 0.1;
            afterburnerRef.current.scale.set(1, pulse, pulse);
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
        const count = 180;
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

    // Realistic USAF two-tone Ghost Grey tactical satin finish + clearcoat
    const matProps = (partId, baseColor = '#CBD5E1', metalness = 0.52, roughness = 0.32) => {
        const isSel = selectedPart === partId;
        const isHov = hoveredPart === partId;
        if (wireframe) {
            return {
                color: isSel ? '#F4B740' : isHov ? '#5AA6FF' : '#2E8BFF',
                emissive: isSel ? '#D97706' : '#1D4ED8',
                emissiveIntensity: isSel ? 0.65 : 0.3,
                wireframe: true,
            };
        }
        return {
            color: isSel ? '#FFE082' : isHov ? '#93C5FD' : baseColor,
            emissive: isSel ? '#B45309' : isHov ? '#1D4ED8' : '#000000',
            emissiveIntensity: isSel ? 0.32 : isHov ? 0.22 : 0,
            metalness,
            roughness,
        };
    };

    const getPart = (id) => F16_PARTS.find((p) => p.id === id);

    const flapRad = ((rigState.flapDeg ?? 0) * Math.PI) / 180;
    const aileronRad = ((rigState.aileronDeg ?? 0) * Math.PI) / 180;
    const elevRad = ((rigState.elevatorDeg ?? 0) * Math.PI) / 180;
    const rudderRad = ((rigState.rudderDeg ?? 0) * Math.PI) / 180;

    return (
        <group ref={aircraftRootRef}>
            {/* ============================================================= */}
            {/* 01 // RADOME & AN/APG-68 PULSE-DOPPLER FIRE-CONTROL RADAR     */}
            {/* ============================================================= */}
            <ExplodablePartGroup
                part={getPart('radome')}
                explodeFactor={explodeFactor}
                isSelected={selectedPart === 'radome'}
                isHovered={hoveredPart === 'radome'}
                onSelect={onSelectPart}
                onHover={onHoverPart}
                showLabels={showLabels}
            >
                {/* Sears-Haack Tangent-Ogive Dielectric Nose Cone */}
                <mesh geometry={radomeGeo} castShadow receiveShadow>
                    <meshStandardMaterial {...matProps('radome', '#8392A7', 0.32, 0.42)} />
                </mesh>
                {/* Radome hinged bulkhead collar ring */}
                <mesh position={[-0.75, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
                    <torusGeometry args={[0.345, 0.014, 16, 48]} />
                    <meshStandardMaterial color="#475569" metalness={0.75} roughness={0.25} />
                </mesh>
                {/* Internal AN/APG-68 Slotted Planar Phased-Array Radar & Gimbal (visible when exploded) */}
                <group position={[-0.68, 0, 0]}>
                    <mesh rotation={[0, 0, Math.PI / 2]}>
                        <cylinderGeometry args={[0.29, 0.29, 0.06, 40]} />
                        <meshStandardMaterial color="#F4B740" metalness={0.85} roughness={0.18} />
                    </mesh>
                    <mesh position={[-0.12, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                        <cylinderGeometry args={[0.14, 0.22, 0.22, 24]} />
                        <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.3} />
                    </mesh>
                </group>
                {/* Multi-step Pitot-Static Nose Boom & AoA Vanes */}
                <mesh position={[0.92, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
                    <cylinderGeometry args={[0.005, 0.018, 0.48, 16]} />
                    <meshStandardMaterial color="#E2E8F0" metalness={0.9} roughness={0.15} />
                </mesh>
                {/* Static discharge strips along radome sides */}
                {[-1, 1].map((s) => (
                    <mesh key={s} position={[0.05, 0, s * 0.28]} rotation={[0, s * 0.22, 0]}>
                        <boxGeometry args={[0.85, 0.008, 0.012]} />
                        <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.2} />
                    </mesh>
                ))}
            </ExplodablePartGroup>

            {/* ============================================================= */}
            {/* 02 // COCKPIT TUB, ACES II SEAT, HUD & TEARDROP BUBBLE CANOPY */}
            {/* ============================================================= */}
            <ExplodablePartGroup
                part={getPart('cockpit')}
                explodeFactor={explodeFactor}
                isSelected={selectedPart === 'cockpit'}
                isHovered={hoveredPart === 'cockpit'}
                onSelect={onSelectPart}
                onHover={onHoverPart}
                showLabels={showLabels}
            >
                {/* Contoured Cockpit Tub & Sill Coaming */}
                <mesh position={[0.05, -0.06, 0]} rotation={[0, 0, Math.PI / 2]}>
                    <cylinderGeometry args={[0.28, 0.31, 1.65, 32, 1, false, Math.PI * 0.5, Math.PI]} />
                    <meshStandardMaterial {...matProps('cockpit', '#1E293B', 0.45, 0.55)} />
                </mesh>
                {/* Forward Instrument Glare Shield */}
                <mesh position={[0.56, 0.06, 0]} rotation={[0, 0, -0.18]}>
                    <cylinderGeometry args={[0.22, 0.28, 0.45, 24, 1, false, 0, Math.PI]} />
                    <meshStandardMaterial color="#0F172A" roughness={0.8} />
                </mesh>
                {/* Wide-Angle Holographic HUD Combiner Glass */}
                <group position={[0.52, 0.19, 0]}>
                    <mesh rotation={[0, 0, -0.46]}>
                        <boxGeometry args={[0.014, 0.17, 0.18]} />
                        <meshPhysicalMaterial
                            color="#34D399"
                            emissive="#10B981"
                            emissiveIntensity={0.45}
                            transparent
                            opacity={0.68}
                            roughness={0.05}
                        />
                    </mesh>
                </group>
                {/* ACES II 30° Reclined Ejection Seat */}
                <group position={[-0.08, 0.04, 0]} rotation={[0, 0, 0.52]}>
                    {/* Seat back & cushion */}
                    <mesh position={[0, 0.12, 0]}>
                        <boxGeometry args={[0.08, 0.44, 0.28]} />
                        <meshStandardMaterial color="#1E293B" roughness={0.65} />
                    </mesh>
                    <mesh position={[0.1, -0.08, 0]}>
                        <boxGeometry args={[0.24, 0.07, 0.28]} />
                        <meshStandardMaterial color="#334155" roughness={0.7} />
                    </mesh>
                    {/* Parachute Headbox & Pitot Recovery Horns */}
                    <mesh position={[-0.02, 0.36, 0]}>
                        <boxGeometry args={[0.11, 0.14, 0.22]} />
                        <meshStandardMaterial color="#475569" roughness={0.5} />
                    </mesh>
                </group>
                {/* Canopy Arch Frame Bow */}
                <mesh position={[-0.36, 0.02, 0]} rotation={[0, 0, -0.12]}>
                    <torusGeometry args={[0.31, 0.022, 16, 36, Math.PI]} />
                    <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.3} />
                </mesh>
                {/* Seamless Gold-Indium-Tin Tinted Polycarbonate Teardrop Bubble Canopy */}
                <mesh geometry={canopyGeo} position={[0.02, 0.02, 0]}>
                    <meshPhysicalMaterial
                        color={selectedPart === 'cockpit' ? '#FDE68A' : '#7DD3FC'}
                        emissive={selectedPart === 'cockpit' ? '#D97706' : '#0284C7'}
                        emissiveIntensity={selectedPart === 'cockpit' ? 0.22 : 0.08}
                        transparent
                        opacity={wireframe ? 0.85 : 0.42}
                        metalness={0.22}
                        roughness={0.06}
                        clearcoat={1.0}
                        clearcoatRoughness={0.05}
                        wireframe={wireframe}
                    />
                </mesh>
            </ExplodablePartGroup>

            {/* ============================================================= */}
            {/* 03 // CENTRAL WING-BODY BLENDED AIRFRAME & LERX STRAKES       */}
            {/* ============================================================= */}
            <ExplodablePartGroup
                part={getPart('airframe')}
                explodeFactor={explodeFactor}
                isSelected={selectedPart === 'airframe'}
                isHovered={hoveredPart === 'airframe'}
                onSelect={onSelectPart}
                onHover={onHoverPart}
                showLabels={showLabels}
            >
                {/* Area-Ruled Blended Fuselage Hull */}
                <mesh geometry={fuselageGeo} position={[0.08, 0.03, 0]} castShadow receiveShadow>
                    <meshStandardMaterial {...matProps('airframe', '#CBD5E1', 0.52, 0.32)} />
                </mesh>
                {/* Smooth Contoured Dorsal Avionics Spine */}
                <mesh position={[-0.45, 0.31, 0]} rotation={[0, 0, Math.PI / 2]}>
                    <cylinderGeometry args={[0.19, 0.23, 3.85, 32, 1, false, 0, Math.PI]} />
                    <meshStandardMaterial {...matProps('airframe', '#94A3B8', 0.48, 0.35)} />
                </mesh>
                {/* Blended Forebody Strakes (LERX) — Port & Starboard */}
                <mesh geometry={strakeGeo} position={[0.1, 0.05, 0]} castShadow receiveShadow>
                    <meshStandardMaterial {...matProps('airframe', '#CBD5E1', 0.52, 0.32)} />
                </mesh>
                <mesh geometry={strakeGeo} position={[0.1, 0.05, 0]} scale={[1, 1, -1]} castShadow receiveShadow>
                    <meshStandardMaterial {...matProps('airframe', '#CBD5E1', 0.52, 0.32)} />
                </mesh>
                {/* M61A1 20mm Vulcan Rotary Cannon Port & Vent Louvers on Port Strake */}
                <mesh position={[1.15, 0.14, -0.38]} rotation={[0, 0, Math.PI / 2]}>
                    <cylinderGeometry args={[0.035, 0.048, 0.38, 16]} />
                    <meshStandardMaterial color="#1E293B" metalness={0.85} roughness={0.25} />
                </mesh>
                {/* Aft Speedbrake Split Fairings (Port & Starboard of Nozzle) */}
                {[-0.42, 0.42].map((zOff, i) => (
                    <mesh key={i} position={[-2.58, 0.02, zOff]}>
                        <boxGeometry args={[0.62, 0.12, 0.18]} />
                        <meshStandardMaterial {...matProps('airframe', '#94A3B8', 0.55, 0.32)} />
                    </mesh>
                ))}
            </ExplodablePartGroup>

            {/* ============================================================= */}
            {/* 04 // VENTRAL NORMAL-SHOCK SUPERSONIC CHIN INTAKE             */}
            {/* ============================================================= */}
            <ExplodablePartGroup
                part={getPart('intake')}
                explodeFactor={explodeFactor}
                isSelected={selectedPart === 'intake'}
                isHovered={hoveredPart === 'intake'}
                onSelect={onSelectPart}
                onHover={onHoverPart}
                showLabels={showLabels}
            >
                {/* Sculpted Smiling Ventral Intake Duct */}
                <mesh position={[-0.08, 0.06, 0]} rotation={[0, 0, Math.PI / 2]} scale={[1, 1, 1.24]} castShadow>
                    <cylinderGeometry args={[0.29, 0.33, 2.35, 36, 1, false, Math.PI * 0.45, Math.PI * 1.1]} />
                    <meshStandardMaterial {...matProps('intake', '#B8C4D4', 0.5, 0.34)} />
                </mesh>
                {/* Sharp Swept Intake Lip Rim */}
                <mesh position={[1.09, 0.06, 0]} rotation={[0, Math.PI / 2, 0]} scale={[1.24, 0.88, 1]}>
                    <torusGeometry args={[0.28, 0.022, 20, 48]} />
                    <meshStandardMaterial {...matProps('intake', '#E2E8F0', 0.72, 0.22)} />
                </mesh>
                {/* Boundary-Layer Splitter Plate & Upper Diverter Strut */}
                <mesh position={[1.18, 0.29, 0]}>
                    <boxGeometry args={[0.46, 0.018, 0.56]} />
                    <meshStandardMaterial {...matProps('intake', '#94A3B8', 0.6, 0.3)} />
                </mesh>
                <mesh position={[1.02, 0.35, 0]}>
                    <boxGeometry args={[0.38, 0.1, 0.04]} />
                    <meshStandardMaterial color="#475569" metalness={0.6} roughness={0.35} />
                </mesh>
                {/* Deep Acoustic Dark Inlet Throat + Visible Fan Face */}
                <mesh position={[1.06, 0.06, 0]} rotation={[0, 0, -Math.PI / 2]} scale={[0.85, 1, 1.2]}>
                    <circleGeometry args={[0.26, 32]} />
                    <meshBasicMaterial color="#050811" side={THREE.DoubleSide} />
                </mesh>
            </ExplodablePartGroup>

            {/* ============================================================= */}
            {/* 05 // PORT CROPPED-DELTA WING & FLAPERON                      */}
            {/* ============================================================= */}
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
                    <mesh geometry={wingGeo} castShadow receiveShadow>
                        <meshStandardMaterial {...matProps('port_wing', '#CBD5E1', 0.52, 0.32)} />
                    </mesh>
                    {/* Articulated Tapered Flaperon */}
                    <group
                        position={[-0.95, 0, 0.28]}
                        rotation={[0, 0, flapRad + aileronRad]}
                    >
                        <mesh geometry={flaperonGeo}>
                            <meshStandardMaterial {...matProps('port_wing', '#94A3B8', 0.58, 0.28)} />
                        </mesh>
                    </group>
                    {/* Under-wing Flap Actuator Fairing Pods */}
                    {[0.65, 1.35].map((zOff, i) => (
                        <mesh key={i} position={[-0.72, -0.05, zOff]} rotation={[0, 0, Math.PI / 2]}>
                            <coneGeometry args={[0.032, 0.42, 16]} />
                            <meshStandardMaterial {...matProps('port_wing', '#94A3B8', 0.55, 0.32)} />
                        </mesh>
                    ))}
                </group>
            </ExplodablePartGroup>

            {/* ============================================================= */}
            {/* 06 // STARBOARD CROPPED-DELTA WING & FLAPERON                 */}
            {/* ============================================================= */}
            <ExplodablePartGroup
                part={getPart('starboard_wing')}
                explodeFactor={explodeFactor}
                isSelected={selectedPart === 'starboard_wing'}
                isHovered={hoveredPart === 'starboard_wing'}
                onSelect={onSelectPart}
                onHover={onHoverPart}
                showLabels={showLabels}
            >
                <mesh geometry={wingGeo} castShadow receiveShadow>
                    <meshStandardMaterial {...matProps('starboard_wing', '#CBD5E1', 0.52, 0.32)} />
                </mesh>
                {/* Articulated Tapered Flaperon */}
                <group
                    position={[-0.95, 0, 0.28]}
                    rotation={[0, 0, flapRad - aileronRad]}
                >
                    <mesh geometry={flaperonGeo}>
                        <meshStandardMaterial {...matProps('starboard_wing', '#94A3B8', 0.58, 0.28)} />
                    </mesh>
                </group>
                {/* Under-wing Flap Actuator Fairing Pods */}
                {[0.65, 1.35].map((zOff, i) => (
                    <mesh key={i} position={[-0.72, -0.05, zOff]} rotation={[0, 0, Math.PI / 2]}>
                        <coneGeometry args={[0.032, 0.42, 16]} />
                        <meshStandardMaterial {...matProps('starboard_wing', '#94A3B8', 0.55, 0.32)} />
                    </mesh>
                ))}
            </ExplodablePartGroup>

            {/* ============================================================= */}
            {/* 07 // VERTICAL STABILIZER, ECM POD & RUDDER                   */}
            {/* ============================================================= */}
            <ExplodablePartGroup
                part={getPart('vertical_tail')}
                explodeFactor={explodeFactor}
                isSelected={selectedPart === 'vertical_tail'}
                isHovered={hoveredPart === 'vertical_tail'}
                onSelect={onSelectPart}
                onHover={onHoverPart}
                showLabels={showLabels}
            >
                {/* Lofted Supersonic Biconvex Vertical Fin */}
                <mesh geometry={vTailGeo} position={[0.1, -0.48, 0]} castShadow receiveShadow>
                    <meshStandardMaterial {...matProps('vertical_tail', '#CBD5E1', 0.5, 0.34)} />
                </mesh>
                {/* Dorsal Fin Root Base Fairing & ECM / Drag-Chute Housing */}
                <mesh position={[-0.08, -0.42, 0]} rotation={[0, 0, Math.PI / 2]}>
                    <cylinderGeometry args={[0.11, 0.13, 1.85, 24]} />
                    <meshStandardMaterial {...matProps('vertical_tail', '#94A3B8', 0.52, 0.35)} />
                </mesh>
                {/* Leading-Edge RWR Threat-Warning Blister Pod */}
                <mesh position={[-0.25, 0.32, 0]} rotation={[0, 0, -Math.PI / 2]}>
                    <capsuleGeometry args={[0.038, 0.24, 12, 20]} />
                    <meshStandardMaterial color="#334155" metalness={0.6} roughness={0.3} />
                </mesh>
                {/* Fin-Tip Fairing & Anti-Collision Strobe */}
                <mesh position={[-0.72, 0.94, 0]} rotation={[0, 0, Math.PI / 2]}>
                    <capsuleGeometry args={[0.036, 0.58, 12, 20]} />
                    <meshStandardMaterial color="#475569" metalness={0.55} roughness={0.35} />
                </mesh>
                {/* Articulated Rudder Control Surface */}
                <mesh position={[-0.84, 0.18, 0]} rotation={[0, rudderRad, 0.18]}>
                    <boxGeometry args={[0.24, 1.12, 0.032]} />
                    <meshStandardMaterial {...matProps('vertical_tail', '#94A3B8', 0.55, 0.32)} />
                </mesh>
            </ExplodablePartGroup>

            {/* ============================================================= */}
            {/* 08 // PORT ALL-MOVING HORIZONTAL STABILATOR                   */}
            {/* ============================================================= */}
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
                    <mesh geometry={stabilatorGeo} castShadow receiveShadow>
                        <meshStandardMaterial {...matProps('port_stabilator', '#B8C4D4', 0.54, 0.32)} />
                    </mesh>
                </group>
            </ExplodablePartGroup>

            {/* ============================================================= */}
            {/* 09 // STARBOARD ALL-MOVING HORIZONTAL STABILATOR              */}
            {/* ============================================================= */}
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
                    <mesh geometry={stabilatorGeo} castShadow receiveShadow>
                        <meshStandardMaterial {...matProps('starboard_stabilator', '#B8C4D4', 0.54, 0.32)} />
                    </mesh>
                </group>
            </ExplodablePartGroup>

            {/* ============================================================= */}
            {/* 10 // GE F110-GE-129 TURBOFAN & 16-PETAL C-D IRIS NOZZLE      */}
            {/* ============================================================= */}
            <ExplodablePartGroup
                part={getPart('nozzle')}
                explodeFactor={explodeFactor}
                isSelected={selectedPart === 'nozzle'}
                isHovered={hoveredPart === 'nozzle'}
                onSelect={onSelectPart}
                onHover={onHoverPart}
                showLabels={showLabels}
            >
                {/* Internal F110 Augmented Turbofan Core Drum & Gearbox Rings (visible when exploded) */}
                <group position={[0.88, 0.02, 0]}>
                    <mesh rotation={[0, 0, Math.PI / 2]}>
                        <cylinderGeometry args={[0.29, 0.32, 1.55, 36]} />
                        <meshStandardMaterial color="#475569" metalness={0.85} roughness={0.22} />
                    </mesh>
                    {[-0.45, 0.0, 0.45].map((xRing, idx) => (
                        <mesh key={idx} position={[xRing, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
                            <torusGeometry args={[0.315, 0.016, 12, 36]} />
                            <meshStandardMaterial color="#94A3B8" metalness={0.9} roughness={0.18} />
                        </mesh>
                    ))}
                </group>

                {/* Nozzle Carbon-Composite Shroud Collar */}
                <mesh position={[0.16, 0.02, 0]} rotation={[0, 0, Math.PI / 2]}>
                    <cylinderGeometry args={[0.35, 0.37, 0.32, 36]} />
                    <meshStandardMaterial {...matProps('nozzle', '#1E293B', 0.78, 0.26)} />
                </mesh>

                {/* 16 Sculpted Overlapping Turkey-Feather Divergent Nozzle Petals */}
                <group position={[-0.18, 0.02, 0]}>
                    {Array.from({ length: 16 }).map((_, idx) => {
                        const angle = (idx / 16) * Math.PI * 2;
                        const radius = 0.315;
                        const petalTilt = flightMode ? 0.04 : -0.14;
                        return (
                            <group key={idx} rotation={[angle, 0, 0]}>
                                <mesh
                                    position={[0, radius, 0]}
                                    rotation={[0, 0, petalTilt]}
                                >
                                    <boxGeometry args={[0.52, 0.024, 0.13]} />
                                    <meshStandardMaterial
                                        {...matProps(
                                            'nozzle',
                                            idx % 2 === 0 ? '#334155' : '#475569',
                                            0.86,
                                            0.22
                                        )}
                                    />
                                </mesh>
                            </group>
                        );
                    })}
                </group>

                {/* Internal Radial Afterburner Flameholder Rings & Glow */}
                <group position={[-0.24, 0.02, 0]}>
                    <mesh rotation={[0, 0, Math.PI / 2]}>
                        <cylinderGeometry args={[0.25, 0.28, 0.12, 32]} />
                        <meshBasicMaterial color={flightMode ? '#38BDF8' : '#EA580C'} />
                    </mesh>
                    <mesh rotation={[0, Math.PI / 2, 0]} position={[-0.05, 0, 0]}>
                        <torusGeometry args={[0.18, 0.015, 12, 32]} />
                        <meshBasicMaterial color="#FDE047" />
                    </mesh>
                </group>

                {/* Volumetric Afterburner Shock-Diamond Plume (Active in Launch Flight mode) */}
                {flightMode && (
                    <group ref={afterburnerRef} position={[-1.42, 0.02, 0]} rotation={[0, 0, Math.PI / 2]}>
                        <mesh>
                            <coneGeometry args={[0.29, 2.4, 32, 1, true]} />
                            <meshBasicMaterial
                                color="#2E8BFF"
                                transparent
                                opacity={0.62}
                                side={THREE.DoubleSide}
                            />
                        </mesh>
                        <mesh position={[0, 0.35, 0]}>
                            <coneGeometry args={[0.18, 1.5, 24]} />
                            <meshBasicMaterial color="#FDE047" transparent opacity={0.88} />
                        </mesh>
                        {/* Supersonic Mach Shock Diamonds */}
                        {[-0.35, 0.0, 0.35, 0.68].map((yOff, idx) => (
                            <mesh key={idx} position={[0, yOff, 0]} scale={[1, 0.42, 1]}>
                                <octahedronGeometry args={[0.15 - idx * 0.022, 1]} />
                                <meshBasicMaterial color="#FFFFFF" transparent opacity={0.85} />
                            </mesh>
                        ))}
                    </group>
                )}
            </ExplodablePartGroup>

            {/* ============================================================= */}
            {/* 11 // TRICYCLE HYDRO-PNEUMATIC UNDERCARRIAGE (Retracts in Flight) */}
            {/* ============================================================= */}
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
                    {/* Steerable Nose Landing Gear (Aft of Ventral Intake Lip) */}
                    <group position={[0.92, 0.12, 0]}>
                        {/* Oleo Shock Strut */}
                        <mesh position={[0, 0.05, 0]} rotation={[0, 0, -0.12]}>
                            <cylinderGeometry args={[0.028, 0.032, 0.56, 16]} />
                            <meshStandardMaterial color="#F8FAFC" metalness={0.85} roughness={0.18} />
                        </mesh>
                        {/* Drag brace & Landing Light */}
                        <mesh position={[-0.12, 0.16, 0]} rotation={[0, 0, 0.65]}>
                            <cylinderGeometry args={[0.014, 0.014, 0.38, 12]} />
                            <meshStandardMaterial color="#E2E8F0" metalness={0.8} roughness={0.2} />
                        </mesh>
                        {/* Nose Gear Bay Door */}
                        <mesh position={[0.02, 0.22, 0.16]}>
                            <boxGeometry args={[0.52, 0.18, 0.018]} />
                            <meshStandardMaterial {...matProps('undercarriage', '#CBD5E1', 0.5, 0.35)} />
                        </mesh>
                        {/* Nose Tire & White Wheel Hub */}
                        <group position={[0.04, -0.22, 0.04]} rotation={[Math.PI / 2, 0, 0]}>
                            <mesh>
                                <torusGeometry args={[0.1, 0.042, 16, 32]} />
                                <meshStandardMaterial color="#0F172A" roughness={0.88} />
                            </mesh>
                            <mesh>
                                <cylinderGeometry args={[0.068, 0.068, 0.065, 20]} />
                                <meshStandardMaterial color="#F8FAFC" metalness={0.6} roughness={0.3} />
                            </mesh>
                        </group>
                    </group>

                    {/* Wide-Track Fuselage-Mounted A-Frame Main Landing Gear */}
                    {[-1, 1].map((side) => (
                        <group key={side} position={[-0.58, 0.14, side * 0.68]}>
                            {/* Main Oleo Strut */}
                            <mesh rotation={[side * -0.38, 0, 0]}>
                                <cylinderGeometry args={[0.036, 0.04, 0.68, 16]} />
                                <meshStandardMaterial color="#F8FAFC" metalness={0.85} roughness={0.18} />
                            </mesh>
                            {/* Side Retraction Brace */}
                            <mesh position={[0, 0.08, side * -0.18]} rotation={[side * 0.52, 0, 0]}>
                                <cylinderGeometry args={[0.02, 0.02, 0.52, 12]} />
                                <meshStandardMaterial color="#E2E8F0" metalness={0.8} roughness={0.22} />
                            </mesh>
                            {/* Bulged Main Gear Bay Door */}
                            <mesh position={[0, 0.2, side * 0.14]} rotation={[side * -0.25, 0, 0]}>
                                <boxGeometry args={[0.72, 0.24, 0.022]} />
                                <meshStandardMaterial {...matProps('undercarriage', '#CBD5E1', 0.5, 0.35)} />
                            </mesh>
                            {/* Main Tire & Carbon Brake Hub */}
                            <group position={[0, -0.28, side * 0.14]} rotation={[Math.PI / 2, 0, 0]}>
                                <mesh>
                                    <torusGeometry args={[0.145, 0.06, 20, 36]} />
                                    <meshStandardMaterial color="#0F172A" roughness={0.88} />
                                </mesh>
                                <mesh>
                                    <cylinderGeometry args={[0.1, 0.1, 0.095, 24]} />
                                    <meshStandardMaterial color="#F8FAFC" metalness={0.65} roughness={0.28} />
                                </mesh>
                            </group>
                        </group>
                    ))}
                </ExplodablePartGroup>
            )}

            {/* ============================================================= */}
            {/* 12 // WINGTIP AIM-9X RAILS, AMRAAMS & FINNED 370-GAL TANKS    */}
            {/* ============================================================= */}
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
                        {/* Wingtip LAU-129 Launcher Rail + AIM-9X Sidewinder Missile */}
                        <group position={[-0.65, 0.24, side * 2.7]}>
                            {/* LAU-129 Rail Beam */}
                            <mesh position={[-0.08, 0, side * -0.04]}>
                                <boxGeometry args={[1.38, 0.045, 0.04]} />
                                <meshStandardMaterial {...matProps('stores', '#94A3B8', 0.55, 0.32)} />
                            </mesh>
                            {/* AIM-9X Missile Body */}
                            <mesh rotation={[0, 0, Math.PI / 2]}>
                                <cylinderGeometry args={[0.032, 0.032, 1.48, 20]} />
                                <meshStandardMaterial {...matProps('stores', '#E2E8F0', 0.55, 0.28)} />
                            </mesh>
                            {/* IR Seeker Glass Dome */}
                            <mesh position={[0.78, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
                                <coneGeometry args={[0.032, 0.14, 20]} />
                                <meshStandardMaterial color="#1E293B" metalness={0.85} roughness={0.12} />
                            </mesh>
                            {/* 4 Forward Canard Control Fins + 4 Aft Tailfins */}
                            {[0, Math.PI / 2].map((rotAngle, fIdx) => (
                                <React.Fragment key={fIdx}>
                                    <mesh position={[0.48, 0, 0]} rotation={[rotAngle, 0, 0]}>
                                        <boxGeometry args={[0.12, 0.16, 0.008]} />
                                        <meshStandardMaterial color="#334155" metalness={0.75} roughness={0.25} />
                                    </mesh>
                                    <mesh position={[-0.62, 0, 0]} rotation={[rotAngle, 0, 0]}>
                                        <boxGeometry args={[0.2, 0.22, 0.008]} />
                                        <meshStandardMaterial color="#334155" metalness={0.75} roughness={0.25} />
                                    </mesh>
                                </React.Fragment>
                            ))}
                        </group>

                        {/* Under-Wing 370-Gallon Finned External Fuel Drop Tank */}
                        <group position={[-0.32, -0.02, side * 1.25]}>
                            {/* Swept Wing Pylon */}
                            <mesh position={[0, 0.15, 0]}>
                                <boxGeometry args={[0.72, 0.16, 0.045]} />
                                <meshStandardMaterial {...matProps('stores', '#94A3B8', 0.52, 0.34)} />
                            </mesh>
                            {/* Cylindrical Tank Center Section */}
                            <mesh rotation={[0, 0, Math.PI / 2]}>
                                <cylinderGeometry args={[0.145, 0.145, 1.45, 32]} />
                                <meshStandardMaterial {...matProps('stores', '#CBD5E1', 0.48, 0.34)} />
                            </mesh>
                            {/* Ogive Forward Tank Nose */}
                            <mesh position={[0.98, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
                                <coneGeometry args={[0.145, 0.52, 32]} />
                                <meshStandardMaterial {...matProps('stores', '#CBD5E1', 0.48, 0.34)} />
                            </mesh>
                            {/* Tapered Aft Tank Tailcone + Cruciform Stabilizer Fins */}
                            <mesh position={[-0.98, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                                <coneGeometry args={[0.145, 0.52, 32]} />
                                <meshStandardMaterial {...matProps('stores', '#CBD5E1', 0.48, 0.34)} />
                            </mesh>
                            {[0.6, -0.6].map((fRot, fIdx) => (
                                <mesh key={fIdx} position={[-0.92, 0, 0]} rotation={[fRot, 0, 0]}>
                                    <boxGeometry args={[0.28, 0.38, 0.014]} />
                                    <meshStandardMaterial {...matProps('stores', '#94A3B8', 0.52, 0.34)} />
                                </mesh>
                            ))}
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
                    <pointsMaterial color="#2BC8FF" size={0.045} transparent opacity={0.78} />
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
    const animFramesRef = useRef(0);
    const [hoveredPart, setHoveredPart] = useState(null);

    // Support `null` ("Free Orbit / No Selection") without forcing a fallback part!
    const activeSelectedPart =
        selectedPartId !== undefined
            ? selectedPartId
            : selectedPart !== undefined
            ? selectedPart
            : null;

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
                background: 'var(--scene-bg)',
                overflow: 'hidden',
            }}
        >
            <Canvas
                shadows
                dpr={[1, 2]}
                camera={{ position: [6.0, 2.35, 6.5], fov: 38, near: 0.1, far: 120 }}
                gl={{ powerPreference: 'high-performance', antialias: true }}
                onPointerMissed={() => {
                    onSelectPart(null);
                }}
            >
                <ambientLight intensity={1.05} />
                <hemisphereLight args={['#E0F2FE', '#1E293B', 0.65]} />
                <directionalLight
                    position={[10, 14, 8]}
                    intensity={1.75}
                    color="#FFFFFF"
                    castShadow
                />
                <directionalLight position={[-8, -5, -6]} intensity={0.7} color="#5AA6FF" />
                <pointLight
                    position={[-4, 1, 0]}
                    intensity={flightMode ? 2.6 : 0.45}
                    color="#2E8BFF"
                />

                {/* Subtle Studio Hangar Floor Grid & Contact Shadow */}
                <gridHelper
                    args={[28, 28, '#2E8BFF', '#334155']}
                    position={[0, -1.16, 0]}
                    material-opacity={0.22}
                    material-transparent
                />
                <ContactShadows
                    position={[0, -1.15, 0]}
                    opacity={0.42}
                    scale={18}
                    blur={2.4}
                    far={4.5}
                />

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
                    dampingFactor={0.07}
                    minDistance={2.0}
                    maxDistance={18.0}
                    onStart={() => {
                        // Immediately stop programmatic camera transitions when the user drags/zooms
                        animFramesRef.current = 0;
                    }}
                />

                <SmoothViewCamera
                    viewPreset={activeViewPreset}
                    selectedPart={activeSelectedPart}
                    explodeFactor={explodeFactor}
                    controlsRef={controlsRef}
                    animFramesRef={animFramesRef}
                />
            </Canvas>
        </div>
    );
}
