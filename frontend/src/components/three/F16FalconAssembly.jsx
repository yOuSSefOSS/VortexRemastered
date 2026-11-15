import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html, Line, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';

/**
 * ============================================================================
 * AERO / ARCHIVE — F-16C BLOCK 50 FIGHTING FALCON (SEMI-REALISTIC 12-PART RIG)
 * - Continuous lofted Blended Wing-Body (BWB) airframe with integrated chine
 *   strakes (LERX), dorsal avionics spine, and twin ventral stability fins.
 * - Flush Sears-Haack elliptical radome with slight nose droop & APG-68 array.
 * - Sculpted frameless teardrop gold-tinted bubble canopy & recessed ACES II tub.
 * - Lofted D-section normal-shock ventral supersonic intake & splitter plate.
 * - True 3D tapered NACA 64A204 airfoil wings, vertical tail with USAF tail
 *   markings ("AF 80 025"), tapered anhedral stabilators, and conical 16-petal
 *   F110-GE-129 iris exhaust nozzle.
 * - Free-Orbit support: `selectedPart = null` by default; clicking empty space
 *   or clicking the active part clears selection for unrestricted 360° orbit.
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
    basePos: [2.65, 0.0, 0],
    explodeOffset: [2.35, 0.2, 0],
    anchorOffset: [0.85, 0.12, 0],
    labelOffset: [1.35, 0.92, 0.45],
    summary:
      'Sears-Haack dielectric ogive nose cone housing the Northrop Grumman AN/APG-68(V)9 pulse-Doppler fire-control radar and nose pitot-static boom.',
    kidExplanation:
      'Think of the nose cone as the jet’s eyes and weather sensor! Inside is a powerful radar dish that can spot other airplanes hundreds of kilometers away, even through clouds or at night, while the sharp needle on the tip measures how fast the jet is flying.',
    engineeringNote:
      'Sears-Haack ogive curvature minimizes transonic wave drag (CD,wave) while maintaining X-band radar transparency and lightning diversion.',
    engineering:
      'Sears-Haack ogive curvature minimizes transonic wave drag (CD,wave) while maintaining X-band radar transparency and lightning diversion.',
    formula: 'θ_cone = arctan(d / 2L) ,  M_crit = 0.88',
    specs: [
      { label: 'Radar Array', value: 'AN/APG-68(V)9 X-Band Planar Array' },
      { label: 'Fineness Ratio', value: 'L/D = 3.6 Sears-Haack Ogive' },
      { label: 'Detection Range', value: '296 km Look-Down / Shoot-Down' },
    ],
  },
  {
    id: 'cockpit',
    index: '02',
    name: 'Cockpit tub & frameless bubble canopy',
    shortLabel: 'Cockpit & canopy',
    category: 'Crew station',
    code: 'F16-02',
    subsystemMap: 'avionics',
    basePos: [1.42, 0.26, 0],
    explodeOffset: [0.65, 1.48, 0],
    anchorOffset: [0.05, 0.34, 0],
    labelOffset: [0.35, 1.18, -0.55],
    summary:
      'Frameless single-piece gold-indium-tin coated polycarbonate bubble canopy providing 360° upper-hemisphere visibility, paired with a 30° reclined ACES II seat.',
    kidExplanation:
      'This is where the pilot sits! Unlike most jets that have metal bars across the windshield, the F-16 has a giant see-through bubble so the pilot can look all the way around. The seat tilts back like a recliner chair to help the pilot handle super-strong gravity forces during sharp turns.',
    engineeringNote:
      'The 30° seat tilt reduces vertical heart-to-brain hydrostatic column height h, raising pilot sustained G-tolerance to +9.0 Gz.',
    engineering:
      'The 30° seat tilt reduces vertical heart-to-brain hydrostatic column height h, raising pilot sustained G-tolerance to +9.0 Gz.',
    formula: 'ΔP_hydrostatic = ρ_blood · g · Gz · h · cos(30°)',
    specs: [
      { label: 'Canopy Glazing', value: '19 mm Gold-Coated Polycarbonate' },
      { label: 'Ejection Seat', value: 'ACES II Zero-Zero (30° Reclined)' },
      { label: 'Flight Control', value: 'Force-Sensing Side-Stick + Quad FBW' },
    ],
  },
  {
    id: 'airframe',
    index: '03',
    name: 'Blended wing-body fuselage & LERX strakes',
    shortLabel: 'Central airframe',
    category: 'Primary structure',
    code: 'F16-03',
    subsystemMap: 'fuselage',
    basePos: [0, 0, 0],
    explodeOffset: [0, 0.16, 0],
    anchorOffset: [-0.25, 0.42, 0],
    labelOffset: [-0.35, 1.42, 0],
    summary:
      'Blended wing-body (BWB) fuselage with sharp forebody chine strakes (LERX), dorsal avionics spine, M61A1 20mm rotary cannon bay, and integral fuel cells.',
    kidExplanation:
      'The main body of the F-16 blends smoothly into the wings like a manta ray! Those sharp ledges along the sides of the nose create spinning whirlwinds of air that help keep the jet steady when it points its nose steeply upward.',
    engineeringNote:
      'Forebody LERX strakes shed stable leading-edge vortices at high α (>15°), generating vortex lift and energizing boundary-layer flow over the tail.',
    engineering:
      'Forebody LERX strakes shed stable leading-edge vortices at high α (>15°), generating vortex lift and energizing boundary-layer flow over the tail.',
    formula: 'CL,total = CL,potential + CL,vortex · sin²(α)cos(α)',
    specs: [
      { label: 'Alloy Composition', value: '78% Al-2024/7075 · 8% Ti-6Al-4V' },
      { label: 'Design Load Limit', value: '+9.0 G / −3.0 G Full Internal Fuel' },
      { label: 'Static Margin', value: '−2.0% MAC (Relaxed Static Stability)' },
    ],
  },
  {
    id: 'intake',
    index: '04',
    name: 'Ventral normal-shock supersonic inlet',
    shortLabel: 'Supersonic inlet',
    category: 'Air induction',
    code: 'F16-04',
    subsystemMap: 'engines',
    basePos: [0.85, -0.38, 0],
    explodeOffset: [0.85, -1.28, 0],
    anchorOffset: [0.45, -0.14, 0],
    labelOffset: [0.85, -0.92, 0.75],
    summary:
      'Fixed-geometry ventral chin intake with boundary-layer diverter splitter plate positioned beneath the forebody to prevent flow separation at high α.',
    kidExplanation:
      'A jet engine needs to breathe a huge amount of air! This smiling scoop under the chin gulps in air at twice the speed of sound and slows it down smoothly before it reaches the spinning engine fan inside.',
    engineeringNote:
      'Forebody compression plus a normal shock at the inlet lip decelerates Mach 1.6–2.0 freestream air to Mach ~0.45 at the F110 fan face.',
    engineering:
      'Forebody compression plus a normal shock at the inlet lip decelerates Mach 1.6–2.0 freestream air to Mach ~0.45 at the F110 fan face.',
    formula: 'P02 / P01 = f(M1) ,  ṁ = ρ · A_inlet · V',
    specs: [
      { label: 'Inlet Geometry', value: 'Fixed-Geometry Normal-Shock Pitot' },
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
    basePos: [-0.35, 0.0, -0.62],
    explodeOffset: [-0.15, 0.22, -1.95],
    anchorOffset: [-0.35, 0.04, -1.15],
    labelOffset: [0.1, 0.88, -2.05],
    summary:
      '40° leading-edge sweep cropped-delta planform using a thin NACA 64A204 section (t/c = 4%) with automatic leading-edge maneuvering flaps and trailing-edge flaperons.',
    kidExplanation:
      'The left wing slices through the air to create lift that holds the 19-ton jet in the sky! Moving panels on the front and back edges tilt automatically to help the jet roll and turn in the blink of an eye.',
    engineeringNote:
      'Leading-edge flaps automatically schedule with Angle of Attack α and Mach number to delay leading-edge stall and minimize camber drag.',
    engineering:
      'Leading-edge flaps automatically schedule with Angle of Attack α and Mach number to delay leading-edge stall and minimize camber drag.',
    formula: 'AR = b² / S = 3.2 ,  Λ_LE = 40° ,  t/c = 0.04',
    specs: [
      { label: 'Airfoil Section', value: 'NACA 64A204 (t/c = 4.0%)' },
      { label: 'Leading-Edge Sweep', value: '40° Cropped Delta · AR 3.2' },
      { label: 'High-Lift Device', value: 'Auto-Scheduled LE Flap (−2° to +25°)' },
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
    basePos: [-0.35, 0.0, 0.62],
    explodeOffset: [-0.15, 0.22, 1.95],
    anchorOffset: [-0.35, 0.04, 1.15],
    labelOffset: [0.1, 0.88, 2.05],
    summary:
      'Starboard multi-spar primary lifting surface featuring integral wing fuel bays, weapons pylons, and high-rate electro-hydraulic flaperon actuators.',
    kidExplanation:
      'The right wing works together with the left wing to lift the jet and roll it 360 degrees in just over one second! Inside the wing are sealed tanks that also store jet fuel.',
    engineeringNote:
      'Relaxed static stability (negative subsonic static margin ~ −2% MAC) allows the horizontal tail to upload rather than download in maneuvering flight.',
    engineering:
      'Relaxed static stability (negative subsonic static margin ~ −2% MAC) allows the horizontal tail to upload rather than download in maneuvering flight.',
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
    name: 'Vertical stabilizer, ECM pod & rudder',
    shortLabel: 'Vertical stabilizer',
    category: 'Directional control',
    code: 'F16-07',
    subsystemMap: 'tail',
    basePos: [-2.25, 0.36, 0],
    explodeOffset: [-1.35, 1.55, 0],
    anchorOffset: [-0.25, 0.95, 0],
    labelOffset: [-0.95, 1.85, -0.35],
    summary:
      '47.5°-swept graphite-epoxy composite vertical tail fin with dorsal brake-chute/ECM fairing, RWR blister, and hydraulic rudder servo.',
    kidExplanation:
      'Just like the tail fin on a fish or a dart, this tall vertical fin keeps the jet pointing straight ahead so it doesn’t slide sideways. The hinged rudder on the back swings left and right to steer the nose.',
    engineeringNote:
      'Provides directional weathercock stability (Cnβ > 0) and high-α yaw authority in the energized vortex wake shed by the forebody strakes.',
    engineering:
      'Provides directional weathercock stability (Cnβ > 0) and high-α yaw authority in the energized vortex wake shed by the forebody strakes.',
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
    name: 'Port all-moving anhedral stabilator',
    shortLabel: 'Port stabilator',
    category: 'Pitch & roll trim',
    code: 'F16-08',
    subsystemMap: 'tail',
    basePos: [-2.55, -0.04, -0.52],
    explodeOffset: [-1.55, -0.35, -1.45],
    anchorOffset: [-0.2, -0.06, -0.65],
    labelOffset: [-0.85, -0.58, -1.45],
    summary:
      'All-moving pivoted horizontal tail surface with 10° anhedral droop providing longitudinal pitch control and differential roll augmentation (taileron).',
    kidExplanation:
      'Unlike small planes where only a back flap moves, this entire back wing tilts up and down! Tilting it pitches the F-16’s nose up to climb or down to dive.',
    engineeringNote:
      'In supersonic flight where the aerodynamic center shifts aft from 25% to ~50% MAC, all-moving stabilators retain full pitch authority without shock blanking.',
    engineering:
      'In supersonic flight where the aerodynamic center shifts aft from 25% to ~50% MAC, all-moving stabilators retain full pitch authority without shock blanking.',
    formula: 'Cm,cg = Cm0 + Cmα · α + Cmδh · δh',
    specs: [
      { label: 'Actuation Type', value: 'All-Moving Titanium Pivot Spindle' },
      { label: 'Deflection Range', value: '±25° Symmetric & Differential' },
      { label: 'Anhedral Angle', value: '−10° Droop for Wing-Wake Clearance' },
    ],
  },
  {
    id: 'starboard_stabilator',
    index: '09',
    name: 'Starboard all-moving anhedral stabilator',
    shortLabel: 'Starboard stabilator',
    category: 'Pitch & roll trim',
    code: 'F16-09',
    subsystemMap: 'tail',
    basePos: [-2.55, -0.04, 0.52],
    explodeOffset: [-1.55, -0.35, 1.45],
    anchorOffset: [-0.2, -0.06, 0.65],
    labelOffset: [-0.85, -0.58, 1.45],
    summary:
      'Starboard composite honeycomb stabilator pivoted on a titanium spindle shaft and commanded at 400 Hz by the quad-redundant digital flight control computer.',
    kidExplanation:
      'Controlled 400 times every second by four flight computers, the right tail wing tilts together with the left one to pitch up/down, or in opposite directions to help roll the jet faster!',
    engineeringNote:
      'Continuously makes micro-adjustments to artificially stabilize the airframe’s negative static margin in subsonic flight.',
    engineering:
      'Continuously makes micro-adjustments to artificially stabilize the airframe’s negative static margin in subsonic flight.',
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
    name: 'F110-GE-129 afterburner & 16-petal iris nozzle',
    shortLabel: 'F110 exhaust nozzle',
    category: 'Propulsion',
    code: 'F16-10',
    subsystemMap: 'engines',
    basePos: [-2.82, 0.0, 0],
    explodeOffset: [-2.35, 0.05, 0],
    anchorOffset: [-0.45, 0, 0],
    labelOffset: [-1.45, 0.72, 0.55],
    summary:
      'Variable-area convergent-divergent (C-D) 16-petal iris exhaust nozzle mated to the GE F110-GE-129 afterburning turbofan (131.2 kN wet thrust).',
    kidExplanation:
      'This is the rocket-like exhaust pipe at the back! Its 16 metal petals open and close like the pupil of an eye. When the pilot hits "Launch Flight" (afterburner), extra fuel ignites into a giant glowing flame with diamond-shaped shock rings!',
    engineeringNote:
      'Modulates throat area A* and exit area Ae to expand exhaust gas supersonic, forming visible Mach shock diamonds in the afterburner plume.',
    engineering:
      'Modulates throat area A* and exit area Ae to expand exhaust gas supersonic, forming visible Mach shock diamonds in the afterburner plume.',
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
    name: 'Tricycle oleo-pneumatic undercarriage',
    shortLabel: 'Undercarriage',
    category: 'Landing gear',
    code: 'F16-11',
    subsystemMap: 'fuselage',
    basePos: [0.0, -0.68, 0],
    explodeOffset: [0, -1.65, 0],
    anchorOffset: [-0.2, -0.25, 0.55],
    labelOffset: [-0.25, -1.05, -0.95],
    summary:
      'Steerable nose gear aft of the chin intake and wide-track fuselage-retracting main gear with oleo-pneumatic shock struts, scissors links, and carbon brakes.',
    kidExplanation:
      'The landing wheels and shock absorbers! They cushion the bump when the jet touches down on the runway and fold neatly inside the belly after takeoff so they don’t slow the jet down.',
    engineeringNote:
      'Absorbs vertical sink-rate kinetic energy (½·m·Vz²) on touchdown and retracts flush into white-painted lower fuselage bays.',
    engineering:
      'Absorbs vertical sink-rate kinetic energy (½·m·Vz²) on touchdown and retracts flush into white-painted lower fuselage bays.',
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
    name: 'Wingtip AIM-9X, AIM-120 & 370-gal drop tanks',
    shortLabel: 'Ordnance & stores',
    category: 'Payload & stores',
    code: 'F16-12',
    subsystemMap: 'wings',
    basePos: [-0.35, -0.18, 0],
    explodeOffset: [0.25, -1.15, 1.55],
    anchorOffset: [-0.2, -0.08, 1.85],
    labelOffset: [0.55, -0.78, 2.35],
    summary:
      'Wingtip LAU-129 rails carrying AIM-9X Sidewinders, mid-wing AIM-120 AMRAAMs, and inboard 370-gallon external fuel drop tanks.',
    kidExplanation:
      'The equipment carried under the wings and on the wingtips! Those big torpedo-shaped tanks hold extra fuel for long flights, and placing missiles right on the wingtips actually helps stop swirling air drag.',
    engineeringNote:
      'Mounting missiles on the wingtips acts as aerodynamic endplates, attenuating wingtip vortex roll-up and reducing induced drag CD,i by ~6%.',
    engineering:
      'Mounting missiles on the wingtips acts as aerodynamic endplates, attenuating wingtip vortex roll-up and reducing induced drag CD,i by ~6%.',
    formula: 'CD,i = CL² / (π · AR_eff · e)',
    specs: [
      { label: 'Wingtip Stations', value: '2 × LAU-129 Rails (AIM-9X Sidewinder)' },
      { label: 'Under-Wing Stations', value: '2 × AIM-120 AMRAAM + 2 × 370-gal Tanks' },
      { label: 'Wingtip Vortex Effect', value: '−6% Induced Drag via Endplate Effect' },
    ],
  },
];

const CAMERA_VIEWS = {
  overview: { pos: [6.4, 2.3, 6.8], target: [0.1, 0.0, 0] },
  top: { pos: [0.1, 9.5, 0.01], target: [0.1, 0, 0] },
  side: { pos: [0.1, 0.65, 9.0], target: [0.1, 0.0, 0] },
  front: { pos: [8.6, 0.85, 0.01], target: [0, 0.0, 0] },
};

/**
 * Builds a general lofted BufferGeometry from an array of cross-section rings.
 * Each ring in `rings` is an array of ` radialCount` [x, y, z] points.
 */
function buildLoftedBufferGeometry(rings, closeCaps = true) {
  const numRings = rings.length;
  const numRadial = rings[0].length;
  const positions = [];
  const uvs = [];
  const indices = [];

  for (let i = 0; i < numRings; i++) {
    const u = i / Math.max(1, numRings - 1);
    const ring = rings[i];
    for (let j = 0; j <= numRadial; j++) {
      const v = j / numRadial;
      const pt = ring[j % numRadial];
      positions.push(pt[0], pt[1], pt[2]);
      uvs.push(u, v);
    }
  }

  const stride = numRadial + 1;
  for (let i = 0; i < numRings - 1; i++) {
    for (let j = 0; j < numRadial; j++) {
      const a = i * stride + j;
      const b = (i + 1) * stride + j;
      const c = (i + 1) * stride + (j + 1);
      const d = i * stride + (j + 1);
      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  if (closeCaps && numRings >= 2) {
    // Rear cap (ring 0)
    const firstRing = rings[0];
    let cx0 = 0;
    let cy0 = 0;
    let cz0 = 0;
    firstRing.forEach((p) => {
      cx0 += p[0];
      cy0 += p[1];
      cz0 += p[2];
    });
    cx0 /= numRadial;
    cy0 /= numRadial;
    cz0 /= numRadial;
    const centerIdx0 = positions.length / 3;
    positions.push(cx0, cy0, cz0);
    uvs.push(0, 0.5);
    for (let j = 0; j < numRadial; j++) {
      indices.push(centerIdx0, (j + 1) % numRadial, j);
    }

    // Front cap (last ring)
    const lastRing = rings[numRings - 1];
    let cx1 = 0;
    let cy1 = 0;
    let cz1 = 0;
    lastRing.forEach((p) => {
      cx1 += p[0];
      cy1 += p[1];
      cz1 += p[2];
    });
    cx1 /= numRadial;
    cy1 /= numRadial;
    cz1 /= numRadial;
    const centerIdx1 = positions.length / 3;
    positions.push(cx1, cy1, cz1);
    uvs.push(1, 0.5);
    const baseLast = (numRings - 1) * stride;
    for (let j = 0; j < numRadial; j++) {
      indices.push(centerIdx1, baseLast + j, baseLast + j + 1);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Builds a 3D tapered supersonic airfoil surface (wing, stabilator, or vertical fin)
 * using NACA 64A204 / biconvex cross-sections lofted from root to tip.
 */
function buildTaperedAirfoilGeo({
  rootX0,
  rootX1,
  tipX0,
  tipX1,
  spanZ,
  rootThick,
  tipThick,
  camber = 0.012,
  spanSteps = 20,
  chordSteps = 28,
  vertical = false,
}) {
  const rings = [];
  for (let s = 0; s <= spanSteps; s++) {
    const v = s / spanSteps;
    const xLE = THREE.MathUtils.lerp(rootX0, tipX0, v);
    const xTE = THREE.MathUtils.lerp(rootX1, tipX1, v);
    const chord = Math.max(0.05, xLE - xTE);
    const thick = THREE.MathUtils.lerp(rootThick, tipThick, v);
    const zPos = v * spanZ;

    const ring = [];
    for (let k = 0; k < chordSteps * 2; k++) {
      const isUpper = k < chordSteps;
      const frac = isUpper
        ? k / (chordSteps - 1)
        : 1 - (k - chordSteps) / (chordSteps - 1);
      // Cosine spacing for crisp leading and trailing edges
      const cFrac = 0.5 * (1 - Math.cos(frac * Math.PI));
      const x = xLE - cFrac * chord;

      // NACA-style thickness distribution + slight camber
      const yt =
        5 *
        thick *
        chord *
        (0.2969 * Math.sqrt(cFrac) -
          0.126 * cFrac -
          0.3516 * cFrac * cFrac +
          0.2843 * Math.pow(cFrac, 3) -
          0.1015 * Math.pow(cFrac, 4));
      const yc = camber * chord * Math.sin(cFrac * Math.PI);
      const y = isUpper ? yc + yt : yc - yt * 0.85;

      if (vertical) {
        // Vertical fin: span is along +Y, thickness is along Z
        ring.push([x, zPos, isUpper ? yt : -yt]);
      } else {
        ring.push([x, y, zPos]);
      }
    }
    rings.push(ring);
  }
  return buildLoftedBufferGeometry(rings, true);
}

/**
 * Generates (and caches at module scope) a high-DPI procedural canvas texture
 * for the F-16C vertical tail fin ("AF 80 025" tail code, tactical squadron stripe).
 */
let CACHED_TAIL_TEXTURE = null;
function getTailFinTexture() {
  if (CACHED_TAIL_TEXTURE) return CACHED_TAIL_TEXTURE;
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#94A3B8';
  ctx.fillRect(0, 0, 512, 512);

  ctx.strokeStyle = 'rgba(30, 41, 59, 0.28)';
  ctx.lineWidth = 2;
  for (let y = 80; y < 460; y += 75) {
    ctx.beginPath();
    ctx.moveTo(20, y);
    ctx.lineTo(490, y - 25);
    ctx.stroke();
  }

  ctx.fillStyle = '#1E293B';
  ctx.fillRect(0, 54, 512, 34);
  ctx.fillStyle = '#2E8BFF';
  ctx.fillRect(0, 88, 512, 8);
  ctx.fillStyle = '#F4B740';
  ctx.fillRect(0, 96, 512, 5);

  ctx.fillStyle = '#1E293B';
  ctx.font = 'bold 28px monospace';
  ctx.fillText('AF', 160, 155);
  ctx.font = 'bold 22px monospace';
  ctx.fillText('80', 205, 155);
  ctx.font = 'bold 46px monospace';
  ctx.fillText('025', 155, 202);

  ctx.font = 'bold 64px sans-serif';
  ctx.fillStyle = '#0F172A';
  ctx.fillText('SW', 155, 310);

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  CACHED_TAIL_TEXTURE = tex;
  return tex;
}

let CACHED_F16_GEOMETRIES = null;
export function getF16Geometries() {
  if (CACHED_F16_GEOMETRIES) return CACHED_F16_GEOMETRIES;
  const radialSegs = 56;

  // 1. RADOME
  const radomeRings = [];
  const rSteps = 36;
  for (let i = 0; i <= rSteps; i++) {
    const u = i / rSteps;
    const x = u * 1.85;
    const shapeFactor = Math.pow(1 - u, 0.58) * (1 + 0.16 * u * (1 - u));
    const ry = Math.max(0.004, 0.31 * shapeFactor);
    const rz = Math.max(0.004, 0.36 * shapeFactor * (1 + 0.08 * Math.sin(u * Math.PI)));
    const yDroop = -0.045 * Math.pow(u, 1.55);

    const ring = [];
    for (let j = 0; j < radialSegs; j++) {
      const theta = (j / radialSegs) * Math.PI * 2;
      const chinePinch = 1 + 0.06 * Math.pow(Math.cos(theta), 2) * (1 - u);
      ring.push([
        x,
        yDroop + ry * Math.sin(theta),
        rz * Math.cos(theta) * chinePinch,
      ]);
    }
    radomeRings.push(ring);
  }
  const radomeGeo = buildLoftedBufferGeometry(radomeRings, true);

  // 2. AIRFRAME (Blended Wing-Body + Chine Strakes + Dorsal Spine)
  const fuseRings = [];
  const fSteps = 56;
  for (let i = 0; i <= fSteps; i++) {
    const u = i / fSteps;
    const x = -2.82 + u * 5.47;
    const endBlend = Math.sin(u * Math.PI);
    const baseRy =
      0.39 * (1 - u) + 0.31 * u + 0.08 * Math.sin(u * Math.PI * 0.9);
    const baseRz =
      0.39 * (1 - u) + 0.36 * u + 0.16 * Math.pow(endBlend, 0.85);

    let chineWidth = 0;
    if (x > -1.8 && x < 2.58) {
      const tChine = (x - -1.8) / (2.58 - -1.8);
      chineWidth = 0.38 * Math.sin(tChine * Math.PI) * (1 - 0.25 * tChine);
    }

    let spineHeight = 0;
    if (x > -2.65 && x < 0.95) {
      const tSpine = (x - -2.65) / (0.95 - -2.65);
      spineHeight = 0.19 * Math.sin(tSpine * Math.PI);
    }

    let cockpitRecess = 0;
    if (x > 0.6 && x < 2.3) {
      const tCockpit = (x - 0.6) / (2.3 - 0.6);
      cockpitRecess = 0.06 * Math.sin(tCockpit * Math.PI);
    }

    const ring = [];
    for (let j = 0; j < radialSegs; j++) {
      const theta = (j / radialSegs) * Math.PI * 2;
      const cosT = Math.cos(theta);
      const sinT = Math.sin(theta);
      const chineLobe =
        Math.pow(Math.abs(cosT), 3.2) * Math.exp(-Math.pow(sinT - 0.1, 2) * 8.0);
      const spineLobe =
        sinT > 0 ? Math.pow(sinT, 5.0) * Math.pow(1 - Math.abs(cosT), 1.5) : 0;

      const z = (baseRz + chineWidth * chineLobe) * cosT;
      let y = baseRy * sinT + spineHeight * spineLobe;
      if (sinT > 0.4) {
        y -= cockpitRecess * Math.pow(sinT, 2);
      }
      if (sinT < -0.5 && x > 0.4) {
        y *= 0.88;
      }
      ring.push([x, y, z]);
    }
    fuseRings.push(ring);
  }
  const fuselageGeo = buildLoftedBufferGeometry(fuseRings, true);

  // 3. COCKPIT CANOPY
  const canopyRings = [];
  const cSteps = 32;
  const cRadial = 36;
  for (let i = 0; i <= cSteps; i++) {
    const u = i / cSteps;
    const x = -1.12 + u * 2.1;
    const env = Math.sin(u * Math.PI);
    const tear = Math.pow(env, 0.72) * (1 + 0.22 * Math.sin(u * Math.PI * 2 - 0.6));
    const widthZ = Math.max(0.005, 0.31 * Math.pow(env, 0.65));
    const heightY = Math.max(0.005, 0.37 * tear);
    const sillY = -0.04 * Math.sin(u * Math.PI);

    const ring = [];
    for (let j = 0; j < cRadial; j++) {
      const theta = (j / cRadial) * Math.PI * 2;
      const cosT = Math.cos(theta);
      const sinT = Math.sin(theta);
      const y =
        sinT >= 0
          ? sillY + heightY * Math.pow(sinT, 0.88)
          : sillY + 0.045 * sinT * env;
      const z = widthZ * cosT;
      ring.push([x, y, z]);
    }
    canopyRings.push(ring);
  }
  const canopyGeo = buildLoftedBufferGeometry(canopyRings, true);

  // 4. SUPERSONIC VENTRAL INTAKE
  const intakeRings = [];
  const inSteps = 28;
  const inRadial = 40;
  for (let i = 0; i <= inSteps; i++) {
    const u = i / inSteps;
    const x = -2.15 + u * 3.07;
    const aftTaper = u < 0.25 ? Math.pow(u / 0.25, 0.6) : 1.0;
    const widthZ = (0.36 + 0.05 * Math.sin(u * Math.PI)) * aftTaper;
    const heightY = (0.21 + 0.03 * Math.sin(u * Math.PI)) * aftTaper;

    const ring = [];
    for (let j = 0; j < inRadial; j++) {
      const theta = (j / inRadial) * Math.PI * 2;
      const cosT = Math.cos(theta);
      const sinT = Math.sin(theta);
      const y =
        sinT > 0
          ? heightY * 0.62 * Math.tanh(sinT * 2.4)
          : heightY * 1.15 * sinT;
      const z = widthZ * cosT * (1 - 0.08 * Math.max(0, -sinT));
      const xRake = u > 0.85 ? ((u - 0.85) / 0.15) * 0.14 * sinT : 0;
      ring.push([x + xRake, y, z]);
    }
    intakeRings.push(ring);
  }
  const intakeGeo = buildLoftedBufferGeometry(intakeRings, false);

  // 5. CROPPED-DELTA WING
  const wingGeo = buildTaperedAirfoilGeo({
    rootX0: 1.18,
    rootX1: -1.16,
    tipX0: -0.34,
    tipX1: -1.04,
    spanZ: 2.16,
    rootThick: 0.048,
    tipThick: 0.038,
    camber: 0.01,
    spanSteps: 22,
    chordSteps: 28,
    vertical: false,
  });

  // 6. VERTICAL STABILIZER FIN
  const vTailGeo = buildTaperedAirfoilGeo({
    rootX0: 1.02,
    rootX1: -0.82,
    tipX0: -0.34,
    tipX1: -0.98,
    spanZ: 1.52,
    rootThick: 0.052,
    tipThick: 0.038,
    camber: 0.0,
    spanSteps: 18,
    chordSteps: 24,
    vertical: true,
  });

  // 7. ALL-MOVING STABILATOR
  const stabilatorGeo = buildTaperedAirfoilGeo({
    rootX0: 0.56,
    rootX1: -0.52,
    tipX0: -0.18,
    tipX1: -0.62,
    spanZ: 1.08,
    rootThick: 0.042,
    tipThick: 0.03,
    camber: 0.0,
    spanSteps: 14,
    chordSteps: 20,
    vertical: false,
  });

  // 8. 370-GALLON SEARS-HAACK DROP TANK
  const tankPts = [];
  const tLen = 2.15;
  for (let i = 0; i <= 36; i++) {
    const u = i / 36;
    const y = (u - 0.5) * tLen;
    const r = 0.16 * Math.sin(u * Math.PI) * (1 + 0.16 * Math.sin(u * Math.PI));
    tankPts.push(new THREE.Vector2(Math.max(0.003, r), y));
  }
  const dropTankGeo = new THREE.LatheGeometry(tankPts, 36);
  dropTankGeo.rotateZ(-Math.PI / 2);

  CACHED_F16_GEOMETRIES = {
    radomeGeo,
    fuselageGeo,
    canopyGeo,
    intakeGeo,
    wingGeo,
    vTailGeo,
    stabilatorGeo,
    dropTankGeo,
  };
  return CACHED_F16_GEOMETRIES;
}

export function preloadF16Assets() {
  getTailFinTexture();
  getF16Geometries();
}

/**
 * Camera controller that ONLY tweens when `selectedPart` or `viewPreset` changes,
 * and immediately yields when the user drags/zooms OrbitControls (`animFrames = 0`).
 */
function SmoothViewCamera({
  viewPreset,
  selectedPart,
  explodeFactor,
  controlsRef,
  animFramesRef,
}) {
  const { camera } = useThree();
  const desiredPos = useRef(new THREE.Vector3(6.4, 2.3, 6.8));
  const desiredTarget = useRef(new THREE.Vector3(0.1, 0, 0));
  const explodeRef = useRef(explodeFactor);

  useEffect(() => {
    explodeRef.current = explodeFactor;
  }, [explodeFactor]);

  useEffect(() => {
    if (selectedPart && viewPreset === 'overview') {
      const p = F16_PARTS.find((item) => item.id === selectedPart);
      if (p) {
        const ef = explodeRef.current;
        const tx = p.basePos[0] + p.explodeOffset[0] * ef;
        const ty = p.basePos[1] + p.explodeOffset[1] * ef;
        const tz = p.basePos[2] + p.explodeOffset[2] * ef;
        desiredTarget.current.set(tx, ty, tz);
        desiredPos.current.set(
          tx + 3.8,
          ty + 1.75,
          tz + (tz >= 0 ? 4.4 : -4.4)
        );
        animFramesRef.current = 45;
        return;
      }
    }
    const preset = CAMERA_VIEWS[viewPreset] || CAMERA_VIEWS.overview;
    desiredPos.current.set(...preset.pos);
    desiredTarget.current.set(...preset.target);
    animFramesRef.current = 45;
  }, [viewPreset, selectedPart, animFramesRef]);

  useFrame((_, delta) => {
    if (animFramesRef.current <= 0) return;
    animFramesRef.current -= 1;
    const alpha = Math.min(1, delta * 5.5);
    camera.position.lerp(desiredPos.current, alpha);
    if (controlsRef.current) {
      controlsRef.current.target.lerp(desiredTarget.current, alpha);
      controlsRef.current.update();
    }
  });

  return null;
}

/**
 * Animated Part Wrapper with theme-aware callout pill and toggle-deselect on click
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
    currentPos.current.lerp(new THREE.Vector3(tx, ty, tz), Math.min(1, delta * 8.0));
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
            lineWidth={isSelected ? 2.0 : 1.2}
            transparent
            opacity={isSelected ? 0.95 : 0.65}
          />
          <mesh position={part.anchorOffset}>
            <sphereGeometry args={[isSelected ? 0.055 : 0.042, 16, 16]} />
            <meshBasicMaterial color={isSelected ? '#F4B740' : '#2E8BFF'} />
          </mesh>
          <Html
            position={part.labelOffset}
            center
            distanceFactor={11}
            zIndexRange={[10, 0]}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelect(isSelected ? null : part.id);
              }}
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
                fontWeight: isSelected ? 700 : 600,
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                boxShadow: isSelected
                  ? '0 0 16px rgba(244, 183, 64, 0.35)'
                  : 'var(--shadow-sm)',
              }}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '99px',
                  background: isSelected ? 'var(--accent-gold)' : 'var(--accent-primary)',
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
 * Cohesive, Semi-Realistic Lofted 3D F-16C Block 50 Fighting Falcon
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
  const intakeFanRef = useRef();
  const tailTexture = useMemo(() => getTailFinTexture(), []);
  const geometries = useMemo(() => getF16Geometries(), []);

  // Flight mode animation, afterburner shock-diamond pulse & intake compressor spin
  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    if (aircraftRootRef.current) {
      const targetPitch = flightMode
        ? ((rigState.aoaDeg ?? 4.5) * Math.PI) / 180 + Math.sin(t * 1.4) * 0.025
        : ((rigState.aoaDeg ?? 0) * Math.PI) / 180 * 0.25;
      const targetRoll = flightMode
        ? ((rigState.aileronDeg ?? 0) * Math.PI) / 180 * 0.6 + Math.sin(t * 0.9) * 0.06
        : ((rigState.aileronDeg ?? 0) * Math.PI) / 180 * 0.35;
      const targetY = flightMode ? 0.22 + Math.sin(t * 1.8) * 0.06 : 0;

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

    if (intakeFanRef.current) {
      intakeFanRef.current.rotation.x += delta * (flightMode ? 18.0 : 5.5);
    }

    if (afterburnerRef.current) {
      const pulse = 0.94 + Math.sin(t * 32) * 0.1;
      afterburnerRef.current.scale.set(pulse, 1, pulse);
    }

    if (streamlinesRef.current && flightMode) {
      const pos = streamlinesRef.current.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        let x = pos.getX(i) - delta * 15.0;
        if (x < -5.4) x = 5.4;
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
      arr[i * 3] = (s1 - 0.5) * 10.8;
      arr[i * 3 + 1] = (s2 - 0.45) * 2.2;
      arr[i * 3 + 2] = (s3 - 0.5) * 6.0;
    }
    return arr;
  }, []);

  const matProps = (
    partId,
    baseColor = '#CBD5E1',
    metalness = 0.42,
    roughness = 0.36
  ) => {
    const isSel = selectedPart === partId;
    const isHov = hoveredPart === partId;
    if (wireframe) {
      return {
        color: isSel ? '#F4B740' : isHov ? '#5AA6FF' : '#2E8BFF',
        emissive: isSel ? '#D97706' : '#1463E0',
        emissiveIntensity: isSel ? 0.65 : 0.32,
        wireframe: true,
      };
    }
    return {
      color: isSel ? '#FDE68A' : isHov ? '#93C5FD' : baseColor,
      emissive: isSel ? '#D97706' : isHov ? '#1F5BD8' : '#000000',
      emissiveIntensity: isSel ? 0.28 : isHov ? 0.18 : 0,
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
      {/* ================================================================= */}
      {/* 01 // RADOME & AN/APG-68(V)9 FIRE-CONTROL RADAR                   */}
      {/* ================================================================= */}
      <ExplodablePartGroup
        part={getPart('radome')}
        explodeFactor={explodeFactor}
        isSelected={selectedPart === 'radome'}
        isHovered={hoveredPart === 'radome'}
        onSelect={onSelectPart}
        onHover={onHoverPart}
        showLabels={showLabels}
      >
        {/* Drooped Sears-Haack Elliptical Radome (Flush with x=2.65 bulkhead) */}
        <mesh geometry={geometries.radomeGeo}>
          <meshStandardMaterial {...matProps('radome', '#526071', 0.32, 0.44)} />
        </mesh>
        {/* Radome-Fuselage Metallic Bulkhead Seal Ring */}
        <mesh position={[0.01, 0, 0]} rotation={[0, Math.PI / 2, 0]} scale={[1.15, 0.98, 1]}>
          <torusGeometry args={[0.31, 0.012, 16, 48]} />
          <meshStandardMaterial color="#E2E8F0" metalness={0.85} roughness={0.22} />
        </mesh>
        {/* Internal AN/APG-68 Slotted Planar Phased-Array Radar Dish & Gimbal */}
        <group position={[-0.04, 0, 0]}>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.27, 0.27, 0.05, 36]} />
            <meshStandardMaterial color="#F4B740" metalness={0.88} roughness={0.18} />
          </mesh>
          <mesh position={[-0.1, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.13, 0.2, 0.18, 24]} />
            <meshStandardMaterial color="#334155" metalness={0.75} roughness={0.3} />
          </mesh>
        </group>
        {/* Supersonic Nose Pitot-Static Boom */}
        <mesh position={[2.08, -0.045, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <cylinderGeometry args={[0.005, 0.018, 0.52, 16]} />
          <meshStandardMaterial color="#F1F5F9" metalness={0.92} roughness={0.15} />
        </mesh>
      </ExplodablePartGroup>

      {/* ================================================================= */}
      {/* 02 // COCKPIT TUB, ACES II EJECTION SEAT & GOLD BUBBLE CANOPY     */}
      {/* ================================================================= */}
      <ExplodablePartGroup
        part={getPart('cockpit')}
        explodeFactor={explodeFactor}
        isSelected={selectedPart === 'cockpit'}
        isHovered={hoveredPart === 'cockpit'}
        onSelect={onSelectPart}
        onHover={onHoverPart}
        showLabels={showLabels}
      >
        {/* Contoured Cockpit Coaming Sill (tucked inside fuselage crown) */}
        <mesh position={[-0.08, -0.03, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[2.9, 0.85, 1]}>
          <torusGeometry args={[0.31, 0.032, 14, 48]} />
          <meshStandardMaterial color="#1E293B" metalness={0.55} roughness={0.45} />
        </mesh>
        {/* 30-Degree Reclined ACES II Ejection Seat */}
        <group position={[-0.05, 0.02, 0]} rotation={[0, 0, 0.52]}>
          <mesh position={[0, 0.13, 0]}>
            <boxGeometry args={[0.09, 0.44, 0.28]} />
            <meshStandardMaterial color="#1E293B" metalness={0.4} roughness={0.55} />
          </mesh>
          <mesh position={[0.12, -0.06, 0]}>
            <boxGeometry args={[0.24, 0.07, 0.28]} />
            <meshStandardMaterial color="#334155" />
          </mesh>
          <mesh position={[-0.03, 0.34, 0]}>
            <boxGeometry args={[0.1, 0.14, 0.2]} />
            <meshStandardMaterial color="#475569" metalness={0.7} roughness={0.3} />
          </mesh>
        </group>
        {/* Wide-Angle Holographic HUD Combiner Glass */}
        <mesh position={[0.52, 0.14, 0]} rotation={[0, 0, -0.42]}>
          <boxGeometry args={[0.016, 0.19, 0.18]} />
          <meshStandardMaterial
            color="#34D399"
            emissive="#10B981"
            emissiveIntensity={0.85}
            transparent
            opacity={0.72}
          />
        </mesh>
        {/* Sculpted Teardrop Bubble Canopy (Gold-Indium-Tin Coating) */}
        <mesh geometry={geometries.canopyGeo}>
          <meshPhysicalMaterial
            color={selectedPart === 'cockpit' ? '#FDE68A' : '#38BDF8'}
            emissive={selectedPart === 'cockpit' ? '#B45309' : '#0369A1'}
            emissiveIntensity={0.14}
            metalness={0.22}
            roughness={0.06}
            clearcoat={1.0}
            clearcoatRoughness={0.05}
            transmission={0.64}
            transparent
            opacity={0.56}
            wireframe={wireframe}
          />
        </mesh>
        {/* Aft Canopy Structural Bow Arch */}
        <mesh position={[-0.42, -0.01, 0]} rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[0.29, 0.018, 16, 36, Math.PI]} />
          <meshStandardMaterial color="#334155" metalness={0.82} roughness={0.26} />
        </mesh>
      </ExplodablePartGroup>

      {/* ================================================================= */}
      {/* 03 // CENTRAL BLENDED WING-BODY AIRFRAME, LERX & DORSAL SPINE     */}
      {/* ================================================================= */}
      <ExplodablePartGroup
        part={getPart('airframe')}
        explodeFactor={explodeFactor}
        isSelected={selectedPart === 'airframe'}
        isHovered={hoveredPart === 'airframe'}
        onSelect={onSelectPart}
        onHover={onHoverPart}
        showLabels={showLabels}
      >
        {/* Continuous Lofted Blended Wing-Body + Chine Strakes + Dorsal Spine */}
        <mesh geometry={geometries.fuselageGeo}>
          <meshStandardMaterial {...matProps('airframe', '#CBD5E1', 0.44, 0.34)} />
        </mesh>
        {/* M61A1 Vulcan 20mm Rotary Cannon Muzzle Port (Port LERX Root) */}
        <mesh position={[1.15, 0.14, -0.44]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.036, 0.036, 0.28, 16]} />
          <meshStandardMaterial color="#1E293B" metalness={0.85} roughness={0.25} />
        </mesh>
        {/* Dual Aft Ventral Stability Fins (Canted Outward 15°) */}
        {[-1, 1].map((side) => (
          <mesh
            key={side}
            position={[-1.85, -0.34, side * 0.26]}
            rotation={[side * 0.26, 0, 0.15]}
          >
            <boxGeometry args={[0.92, 0.28, 0.022]} />
            <meshStandardMaterial {...matProps('airframe', '#94A3B8', 0.48, 0.34)} />
          </mesh>
        ))}
      </ExplodablePartGroup>

      {/* ================================================================= */}
      {/* 04 // VENTRAL NORMAL-SHOCK SUPERSONIC INLET & FAN FACE            */}
      {/* ================================================================= */}
      <ExplodablePartGroup
        part={getPart('intake')}
        explodeFactor={explodeFactor}
        isSelected={selectedPart === 'intake'}
        isHovered={hoveredPart === 'intake'}
        onSelect={onSelectPart}
        onHover={onHoverPart}
        showLabels={showLabels}
      >
        {/* Sculpted D-Duct Ventral Supersonic Intake Fairing */}
        <mesh geometry={geometries.intakeGeo}>
          <meshStandardMaterial
            {...matProps('intake', '#CBD5E1', 0.44, 0.34)}
            side={THREE.DoubleSide}
          />
        </mesh>
        {/* Boundary-Layer Diverter Strut */}
        <mesh position={[0.45, 0.16, 0]}>
          <boxGeometry args={[0.85, 0.06, 0.36]} />
          <meshStandardMaterial color="#475569" metalness={0.7} roughness={0.32} />
        </mesh>
        {/* Deep Dark Intake Throat Cavity & Spinning Fan Face */}
        <mesh
          position={[0.82, -0.02, 0]}
          rotation={[0, 0, Math.PI / 2]}
          scale={[0.58, 1, 1.05]}
        >
          <cylinderGeometry args={[0.31, 0.31, 0.12, 32]} />
          <meshBasicMaterial color="#050B16" />
        </mesh>
        <group ref={intakeFanRef} position={[0.52, -0.02, 0]}>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.25, 0.25, 0.06, 18]} />
            <meshStandardMaterial
              color="#64748B"
              metalness={0.9}
              roughness={0.2}
              wireframe
            />
          </mesh>
        </group>
      </ExplodablePartGroup>

      {/* ================================================================= */}
      {/* 05 // PORT CROPPED-DELTA WING, LE FLAP & FLAPERON                 */}
      {/* ================================================================= */}
      <ExplodablePartGroup
        part={getPart('port_wing')}
        explodeFactor={explodeFactor}
        isSelected={selectedPart === 'port_wing'}
        isHovered={hoveredPart === 'port_wing'}
        onSelect={onSelectPart}
        onHover={onHoverPart}
        showLabels={showLabels}
      >
        {/* 3D Tapered NACA 64A204 Port Wing */}
        <mesh geometry={geometries.wingGeo} scale={[1, 1, -1]}>
          <meshStandardMaterial
            {...matProps('port_wing', '#CBD5E1', 0.44, 0.34)}
            side={THREE.DoubleSide}
          />
        </mesh>
        {/* Articulated Port Flaperon */}
        <group
          position={[-1.02, 0.0, -0.95]}
          rotation={[0, 0, flapRad - ((rigState.aileronDeg ?? 0) * Math.PI) / 180]}
        >
          <mesh>
            <boxGeometry args={[0.26, 0.026, 1.25]} />
            <meshStandardMaterial {...matProps('port_wing', '#94A3B8', 0.52, 0.32)} />
          </mesh>
        </group>
        {/* Red Port Wingtip Navigation Strobe */}
        <mesh position={[-0.68, 0.0, -2.18]}>
          <sphereGeometry args={[0.032, 12, 12]} />
          <meshBasicMaterial color="#EF4444" />
        </mesh>
      </ExplodablePartGroup>

      {/* ================================================================= */}
      {/* 06 // STARBOARD CROPPED-DELTA WING, LE FLAP & FLAPERON            */}
      {/* ================================================================= */}
      <ExplodablePartGroup
        part={getPart('starboard_wing')}
        explodeFactor={explodeFactor}
        isSelected={selectedPart === 'starboard_wing'}
        isHovered={hoveredPart === 'starboard_wing'}
        onSelect={onSelectPart}
        onHover={onHoverPart}
        showLabels={showLabels}
      >
        {/* 3D Tapered NACA 64A204 Starboard Wing */}
        <mesh geometry={geometries.wingGeo}>
          <meshStandardMaterial
            {...matProps('starboard_wing', '#CBD5E1', 0.44, 0.34)}
            side={THREE.DoubleSide}
          />
        </mesh>
        {/* Articulated Starboard Flaperon */}
        <group
          position={[-1.02, 0.0, 0.95]}
          rotation={[0, 0, flapRad + ((rigState.aileronDeg ?? 0) * Math.PI) / 180]}
        >
          <mesh>
            <boxGeometry args={[0.26, 0.026, 1.25]} />
            <meshStandardMaterial
              {...matProps('starboard_wing', '#94A3B8', 0.52, 0.32)}
            />
          </mesh>
        </group>
        {/* Green Starboard Wingtip Navigation Strobe */}
        <mesh position={[-0.68, 0.0, 2.18]}>
          <sphereGeometry args={[0.032, 12, 12]} />
          <meshBasicMaterial color="#10B981" />
        </mesh>
      </ExplodablePartGroup>

      {/* ================================================================= */}
      {/* 07 // VERTICAL STABILIZER, ECM FAIRING & RUDDER                   */}
      {/* ================================================================= */}
      <ExplodablePartGroup
        part={getPart('vertical_tail')}
        explodeFactor={explodeFactor}
        isSelected={selectedPart === 'vertical_tail'}
        isHovered={hoveredPart === 'vertical_tail'}
        onSelect={onSelectPart}
        onHover={onHoverPart}
        showLabels={showLabels}
      >
        {/* 3D Tapered Supersonic Vertical Fin with USAF Tail Markings */}
        <mesh geometry={geometries.vTailGeo}>
          <meshStandardMaterial
            {...matProps('vertical_tail', '#CBD5E1', 0.42, 0.36)}
            map={wireframe ? null : tailTexture}
          />
        </mesh>
        {/* Dorsal Drag-Chute / ECM Pod Housing at Fin Root */}
        <mesh position={[-0.08, 0.04, 0]} rotation={[0, 0, Math.PI / 2]}>
          <capsuleGeometry args={[0.095, 1.55, 12, 24]} />
          <meshStandardMaterial
            {...matProps('vertical_tail', '#94A3B8', 0.5, 0.34)}
          />
        </mesh>
        {/* Leading-Edge Radar Warning Receiver (RWR) Blister */}
        <mesh position={[0.16, 0.98, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <capsuleGeometry args={[0.04, 0.22, 12, 16]} />
          <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.28} />
        </mesh>
        {/* Fin-Tip Anti-Collision Strobe */}
        <mesh position={[-0.68, 1.54, 0]}>
          <sphereGeometry args={[0.028, 12, 12]} />
          <meshBasicMaterial color="#F4B740" />
        </mesh>
        {/* Articulated Rudder */}
        <group position={[-0.84, 0.72, 0]} rotation={[0, rudderRad, 0]}>
          <mesh>
            <boxGeometry args={[0.22, 1.18, 0.032]} />
            <meshStandardMaterial
              {...matProps('vertical_tail', '#64748B', 0.52, 0.34)}
            />
          </mesh>
        </group>
      </ExplodablePartGroup>

      {/* ================================================================= */}
      {/* 08 // PORT ALL-MOVING ANHEDRAL HORIZONTAL STABILATOR              */}
      {/* ================================================================= */}
      <ExplodablePartGroup
        part={getPart('port_stabilator')}
        explodeFactor={explodeFactor}
        isSelected={selectedPart === 'port_stabilator'}
        isHovered={hoveredPart === 'port_stabilator'}
        onSelect={onSelectPart}
        onHover={onHoverPart}
        showLabels={showLabels}
      >
        <group rotation={[-0.17, 0, elevRad]}>
          <mesh geometry={geometries.stabilatorGeo} scale={[1, 1, -1]}>
            <meshStandardMaterial
              {...matProps('port_stabilator', '#94A3B8', 0.46, 0.34)}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      </ExplodablePartGroup>

      {/* ================================================================= */}
      {/* 09 // STARBOARD ALL-MOVING ANHEDRAL HORIZONTAL STABILATOR         */}
      {/* ================================================================= */}
      <ExplodablePartGroup
        part={getPart('starboard_stabilator')}
        explodeFactor={explodeFactor}
        isSelected={selectedPart === 'starboard_stabilator'}
        isHovered={hoveredPart === 'starboard_stabilator'}
        onSelect={onSelectPart}
        onHover={onHoverPart}
        showLabels={showLabels}
      >
        <group rotation={[0.17, 0, elevRad]}>
          <mesh geometry={geometries.stabilatorGeo}>
            <meshStandardMaterial
              {...matProps('starboard_stabilator', '#94A3B8', 0.46, 0.34)}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      </ExplodablePartGroup>

      {/* ================================================================= */}
      {/* 10 // F110-GE-129 16-PETAL IRIS NOZZLE & AFTERBURNER PLUME        */}
      {/* ================================================================= */}
      <ExplodablePartGroup
        part={getPart('nozzle')}
        explodeFactor={explodeFactor}
        isSelected={selectedPart === 'nozzle'}
        isHovered={hoveredPart === 'nozzle'}
        onSelect={onSelectPart}
        onHover={onHoverPart}
        showLabels={showLabels}
      >
        {/* Forward Titanium Engine Shroud (Flush with aft airframe at x=-2.82) */}
        <mesh position={[0.18, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.37, 0.39, 0.42, 36]} />
          <meshStandardMaterial {...matProps('nozzle', '#475569', 0.82, 0.26)} />
        </mesh>
        {/* Conical Convergent-Divergent Carbon-Titanium Iris Nozzle */}
        <mesh position={[-0.22, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.29, 0.37, 0.46, 16, 1, true]} />
          <meshStandardMaterial
            {...matProps('nozzle', '#1E293B', 0.88, 0.24)}
            side={THREE.DoubleSide}
          />
        </mesh>
        {/* 16 Overlapping Turkey-Feather Actuator Ribs */}
        {Array.from({ length: 16 }).map((_, idx) => {
          const angle = (idx / 16) * Math.PI * 2;
          return (
            <group key={idx} rotation={[angle, 0, 0]}>
              <mesh position={[-0.22, 0.33, 0]} rotation={[0, 0, 0.16]}>
                <boxGeometry args={[0.46, 0.018, 0.09]} />
                <meshStandardMaterial
                  {...matProps('nozzle', '#334155', 0.86, 0.22)}
                />
              </mesh>
            </group>
          );
        })}
        {/* Deep Exhaust Core & Glowing Flameholder Ring */}
        <mesh position={[-0.15, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.27, 0.27, 0.3, 28]} />
          <meshBasicMaterial color="#090D16" />
        </mesh>
        <mesh position={[-0.32, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[0.21, 0.038, 16, 36]} />
          <meshBasicMaterial color={flightMode ? '#F97316' : '#7C2D12'} />
        </mesh>

        {/* Volumetric Afterburner Plume & Mach Shock Diamonds (Flight Mode) */}
        {flightMode && (
          <group
            ref={afterburnerRef}
            position={[-1.65, 0, 0]}
            rotation={[0, 0, Math.PI / 2]}
          >
            <mesh>
              <coneGeometry args={[0.32, 2.75, 32, 1, true]} />
              <meshBasicMaterial
                color="#3B82F6"
                transparent
                opacity={0.42}
                side={THREE.DoubleSide}
              />
            </mesh>
            <mesh position={[0, 0.35, 0]}>
              <coneGeometry args={[0.2, 1.95, 28]} />
              <meshBasicMaterial color="#F59E0B" transparent opacity={0.85} />
            </mesh>
            {[-0.65, -0.32, 0.0, 0.32, 0.62, 0.9].map((dy, idx) => (
              <mesh key={idx} position={[0, dy, 0]} scale={[1, 1.45, 1]}>
                <octahedronGeometry args={[0.12 - idx * 0.014, 1]} />
                <meshBasicMaterial color="#FEF08A" transparent opacity={0.92} />
              </mesh>
            ))}
          </group>
        )}
      </ExplodablePartGroup>

      {/* ================================================================= */}
      {/* 11 // RETRACTABLE TRICYCLE OLEO-PNEUMATIC UNDERCARRIAGE           */}
      {/* ================================================================= */}
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
          {/* Steerable Nose Gear Strut, Drag Brace & Wheel (aft of chin lip) */}
          <group position={[0.92, 0.02, 0]}>
            <mesh position={[0, 0.16, 0]} rotation={[0, 0, -0.1]}>
              <cylinderGeometry args={[0.028, 0.028, 0.48, 16]} />
              <meshStandardMaterial color="#F8FAFC" metalness={0.8} roughness={0.2} />
            </mesh>
            <mesh position={[0.08, 0.22, 0]} rotation={[0, 0, 0.55]}>
              <cylinderGeometry args={[0.016, 0.016, 0.32, 12]} />
              <meshStandardMaterial color="#E2E8F0" metalness={0.75} roughness={0.25} />
            </mesh>
            <mesh position={[0, -0.1, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.13, 0.13, 0.08, 24]} />
              <meshStandardMaterial color="#0F172A" roughness={0.85} />
            </mesh>
            <mesh position={[0, -0.1, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.06, 0.06, 0.085, 16]} />
              <meshStandardMaterial color="#F8FAFC" metalness={0.75} roughness={0.25} />
            </mesh>
          </group>

          {/* Port & Starboard Wide-Track Main Gear Assemblies */}
          {[-0.64, 0.64].map((zPos, idx) => (
            <group key={idx} position={[-0.68, 0.02, zPos]}>
              <mesh
                position={[0, 0.2, zPos > 0 ? -0.18 : 0.18]}
                rotation={[zPos > 0 ? 0.38 : -0.38, 0, 0]}
              >
                <cylinderGeometry args={[0.038, 0.038, 0.62, 16]} />
                <meshStandardMaterial color="#F8FAFC" metalness={0.8} roughness={0.2} />
              </mesh>
              <mesh
                position={[0, 0.28, zPos > 0 ? 0.06 : -0.06]}
                rotation={[zPos > 0 ? -0.22 : 0.22, 0, 0]}
              >
                <boxGeometry args={[0.64, 0.24, 0.02]} />
                <meshStandardMaterial color="#E2E8F0" metalness={0.5} roughness={0.35} />
              </mesh>
              <mesh position={[0, -0.08, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.2, 0.2, 0.12, 28]} />
                <meshStandardMaterial color="#0F172A" roughness={0.88} />
              </mesh>
              <mesh position={[0, -0.08, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.095, 0.095, 0.125, 20]} />
                <meshStandardMaterial color="#F8FAFC" metalness={0.8} roughness={0.22} />
              </mesh>
            </group>
          ))}
        </ExplodablePartGroup>
      )}

      {/* ================================================================= */}
      {/* 12 // WINGTIP AIM-9X, AIM-120 AMRAAMS & 370-GAL DROP TANKS        */}
      {/* ================================================================= */}
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
            {/* Wingtip LAU-129 Rail + AIM-9X Sidewinder (Flush with wingtip at x_local=-0.68, z=±2.78) */}
            <group position={[-0.68, 0.18, side * 2.78]}>
              <mesh>
                <boxGeometry args={[1.15, 0.045, 0.048]} />
                <meshStandardMaterial
                  {...matProps('stores', '#64748B', 0.6, 0.32)}
                />
              </mesh>
              {/* AIM-9X Missile Body */}
              <mesh position={[0.14, 0, side * 0.045]} rotation={[0, 0, -Math.PI / 2]}>
                <cylinderGeometry args={[0.032, 0.032, 1.52, 20]} />
                <meshStandardMaterial color="#E2E8F0" metalness={0.55} roughness={0.3} />
              </mesh>
              {/* Seeker Nose Dome */}
              <mesh position={[0.96, 0, side * 0.045]} rotation={[0, 0, -Math.PI / 2]}>
                <coneGeometry args={[0.032, 0.14, 20]} />
                <meshStandardMaterial color="#1E293B" metalness={0.9} roughness={0.12} />
              </mesh>
              {/* Forward Canard & Aft Tail Cruciform Fins */}
              {[0.58, -0.52].map((fx, fIdx) => (
                <group key={fIdx} position={[fx, 0, side * 0.045]}>
                  <mesh rotation={[Math.PI / 4, 0, 0]}>
                    <boxGeometry args={[0.14, 0.16, 0.008]} />
                    <meshStandardMaterial color="#334155" metalness={0.7} />
                  </mesh>
                  <mesh rotation={[-Math.PI / 4, 0, 0]}>
                    <boxGeometry args={[0.14, 0.16, 0.008]} />
                    <meshStandardMaterial color="#334155" metalness={0.7} />
                  </mesh>
                </group>
              ))}
            </group>

            {/* Mid-Span Under-Wing AIM-120 AMRAAM Pylon & Missile */}
            <group position={[-0.42, 0.04, side * 1.88]}>
              <mesh position={[0, 0.08, 0]}>
                <boxGeometry args={[0.64, 0.1, 0.042]} />
                <meshStandardMaterial color="#64748B" metalness={0.6} roughness={0.35} />
              </mesh>
              <mesh rotation={[0, 0, -Math.PI / 2]}>
                <cylinderGeometry args={[0.04, 0.04, 1.78, 20]} />
                <meshStandardMaterial color="#CBD5E1" metalness={0.6} roughness={0.28} />
              </mesh>
              <mesh position={[1.0, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
                <coneGeometry args={[0.04, 0.22, 20]} />
                <meshStandardMaterial color="#F8FAFC" metalness={0.4} roughness={0.3} />
              </mesh>
            </group>

            {/* Inboard 370-Gallon Sears-Haack External Drop Tank & Pylon */}
            <group position={[-0.18, -0.06, side * 1.14]}>
              <mesh position={[0, 0.16, 0]}>
                <boxGeometry args={[0.8, 0.16, 0.05]} />
                <meshStandardMaterial
                  {...matProps('stores', '#64748B', 0.58, 0.35)}
                />
              </mesh>
              <mesh geometry={geometries.dropTankGeo}>
                <meshStandardMaterial
                  {...matProps('stores', '#CBD5E1', 0.48, 0.34)}
                />
              </mesh>
              <mesh position={[-0.88, 0, 0]} rotation={[Math.PI / 4, 0, 0]}>
                <boxGeometry args={[0.24, 0.32, 0.014]} />
                <meshStandardMaterial color="#64748B" />
              </mesh>
              <mesh position={[-0.88, 0, 0]} rotation={[-Math.PI / 4, 0, 0]}>
                <boxGeometry args={[0.24, 0.32, 0.014]} />
                <meshStandardMaterial color="#64748B" />
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
          <pointsMaterial color="#5AA6FF" size={0.048} transparent opacity={0.8} />
        </points>
      )}
    </group>
  );
}

export default function F16FalconAssembly({
  explodeFactor = 0,
  selectedPart = null,
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
  const containerRef = useRef();
  const controlsRef = useRef();
  const animFramesRef = useRef(0);
  const [hoveredPart, setHoveredPart] = React.useState(null);
  const [isInView, setIsInView] = React.useState(true);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const obs = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
      },
      { threshold: 0.05 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Respect explicit `null` so the user can enter Free Orbit with no selection!
  const activeSelectedPart =
    selectedPartId !== undefined ? selectedPartId : selectedPart;
  const activeViewPreset = cameraView || viewPreset || 'overview';
  const hoveredPartObj = useMemo(
    () => (hoveredPart ? F16_PARTS.find((p) => p.id === hoveredPart) || null : null),
    [hoveredPart]
  );
  const mergedRigState = {
    ...rigState,
    aileronDeg: controlDeflections.aileron ?? rigState.aileronDeg ?? 0,
    elevatorDeg: controlDeflections.elevator ?? rigState.elevatorDeg ?? 0,
    rudderDeg: controlDeflections.rudder ?? rigState.rudderDeg ?? 0,
    flapDeg: controlDeflections.flaps ?? rigState.flapDeg ?? 0,
  };

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        background: 'var(--scene-bg)',
        overflow: 'hidden',
      }}
    >
      {/* Floating Live Hover HUD Pill (Instant visual feedback when hovering over any 3D part) */}
      {hoveredPartObj && (
        <div
          className="vg-glass"
          style={{
            position: 'absolute',
            top: '16px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 25,
            padding: '6px 14px',
            borderRadius: 'var(--radius-pill)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            pointerEvents: 'none',
            border: '1px solid var(--accent-gold)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
          }}
        >
          <span
            className="mono"
            style={{
              fontSize: '10px',
              fontWeight: 700,
              color: 'var(--accent-gold)',
            }}
          >
            PART {hoveredPartObj.index} / 12
          </span>
          <strong style={{ fontSize: '12px', color: 'var(--glass-text)' }}>
            {hoveredPartObj.name}
          </strong>
          <span
            className="mono"
            style={{ fontSize: '10px', color: 'var(--glass-muted)' }}
          >
            · {activeSelectedPart === hoveredPartObj.id ? 'Click to unlock Free Orbit' : 'Click to inspect'}
          </span>
        </div>
      )}

      <Canvas
        frameloop={isInView ? 'always' : 'demand'}
        dpr={[1, 1.75]}
        camera={{ position: [6.4, 2.3, 6.8], fov: 38, near: 0.1, far: 120 }}
        gl={{ powerPreference: 'high-performance', antialias: true }}
        onPointerMissed={() => {
          // Clicking empty space clears any active selection so the user can move freely!
          onSelectPart(null);
        }}
      >
        <ambientLight intensity={1.1} />
        <directionalLight position={[10, 14, 8]} intensity={1.85} color="#FFFFFF" />
        <directionalLight position={[-10, 4, -8]} intensity={0.85} color="#5AA6FF" />
        <directionalLight position={[0, -8, 4]} intensity={0.45} color="#93C5FD" />
        <pointLight
          position={[-4.2, 0.5, 0]}
          intensity={flightMode ? 2.8 : 0.5}
          color={flightMode ? '#F97316' : '#2E8BFF'}
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

        <ContactShadows
          position={[0, -1.15, 0]}
          opacity={0.42}
          scale={18}
          blur={2.4}
          far={4.5}
        />

        <OrbitControls
          ref={controlsRef}
          enableDamping
          dampingFactor={0.07}
          minDistance={2.2}
          maxDistance={18.0}
          onStart={() => {
            // Immediately stop any camera tween as soon as the user touches the mouse/trackpad
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
