import React, { useRef, useState, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  OrbitControls,
  Html,
  Line,
  ContactShadows,
  PerspectiveCamera,
} from '@react-three/drei';
import * as THREE from 'three';

/**
 * 8 Axial Turbofan Stages + Dual Concentric Shafts (Video 2: TURBOFAN EXPLORER)
 * Suck · Squeeze · Bang · Blow
 */
export const TURBOFAN_STAGES = [
  {
    id: 'fan',
    code: 'STG-01',
    name: 'FAN',
    phase: 'SUCK',
    phaseColor: '#38BDF8',
    baseX: -3.2,
    explodeX: -6.4,
    calloutOffset: [0, 2.35, 0.9],
    rpmLabel: 'N1 · 2,850 RPM (100%)',
    shaft: 'Inner LP Shaft (Cyan)',
    tempK: 288,
    pressureRatio: '1.6 : 1',
    summary:
      '22 wide-chord swept titanium fan blades accelerate a massive column of ambient air into the nacelle inlet.',
    detail:
      'Driven by the inner cyan Low-Pressure (LP) shaft, the front fan splits incoming air into the outer cold bypass stream (80–90% of mass flow) and the inner engine core. In high-bypass turbofans, the fan alone produces over 75% of total net thrust.',
  },
  {
    id: 'bypass_duct',
    code: 'STG-02',
    name: 'BYPASS DUCT',
    phase: 'SUCK',
    phaseColor: '#38BDF8',
    baseX: -2.15,
    explodeX: -4.65,
    calloutOffset: [-0.2, 2.55, -0.9],
    rpmLabel: 'Stationary OGVs',
    shaft: 'Nacelle Outer Annulus',
    tempK: 315,
    pressureRatio: '1.58 : 1',
    summary:
      'Annular cold-stream duct and Outlet Guide Vanes (OGVs) straighten swirl from the fan and route bypass air around the core.',
    detail:
      'By accelerating a huge mass of air to a moderate velocity rather than a small mass to extreme velocity, the bypass duct drastically increases propulsive efficiency and reduces jet noise and TSFC.',
  },
  {
    id: 'lp_compressor',
    code: 'STG-03',
    name: 'LP COMPRESSOR',
    phase: 'SQUEEZE',
    phaseColor: '#00E5FF',
    baseX: -1.65,
    explodeX: -2.95,
    calloutOffset: [0, 2.15, 0.7],
    rpmLabel: 'N1 · 2,850 RPM',
    shaft: 'Inner LP Shaft (Cyan)',
    tempK: 420,
    pressureRatio: '3.8 : 1',
    summary:
      '3-stage axial low-pressure booster compresses core airflow before it enters the high-pressure spool.',
    detail:
      'Rotating at the same speed as the front fan on the inner cyan LP shaft, alternating rows of rotor blades and stationary stator vanes diffuse the air, trading kinetic energy for a steady rise in static pressure.',
  },
  {
    id: 'hp_compressor',
    code: 'STG-04',
    name: 'HP COMPRESSOR',
    phase: 'SQUEEZE',
    phaseColor: '#00E5FF',
    baseX: -0.35,
    explodeX: -0.85,
    calloutOffset: [0, 2.35, -0.6],
    rpmLabel: 'N2 · 11,400 RPM',
    shaft: 'Outer HP Shaft (Amber)',
    tempK: 860,
    pressureRatio: '38.0 : 1',
    summary:
      '9-stage high-pressure axial compressor driven by the concentric outer amber HP shaft squeezes air to nearly 40 atmospheres.',
    detail:
      'Notice how blade height shrinks progressively from stage 1 to stage 9 as air density increases. By the exit guide vanes, air temperature reaches ~860 K from mechanical compression alone prior to fuel ignition.',
  },
  {
    id: 'combustor',
    code: 'STG-05',
    name: 'COMBUSTOR',
    phase: 'BANG',
    phaseColor: '#F59E0B',
    baseX: 0.95,
    explodeX: 1.35,
    calloutOffset: [0, 2.45, 0.5],
    rpmLabel: '20 Swirl Fuel Nozzles',
    shaft: 'Annular Flame Liner',
    tempK: 1720,
    pressureRatio: '36.5 : 1 (Isobaric)',
    summary:
      'High-pressure air mixes with atomized Jet-A1 kerosene and burns continuously at ~1,720 K in an annular flame ring.',
    detail:
      'Swirl vanes anchor a recirculation vortex so the flame does not blow out. Cooling air film-bleeds through thousands of laser-drilled liner holes to prevent the nickel-superalloy walls from melting.',
  },
  {
    id: 'hp_turbine',
    code: 'STG-06',
    name: 'HP TURBINE',
    phase: 'BLOW',
    phaseColor: '#EF4444',
    baseX: 1.95,
    explodeX: 3.35,
    calloutOffset: [0, 2.2, -0.6],
    rpmLabel: 'N2 · 11,400 RPM',
    shaft: 'Outer HP Shaft (Amber)',
    tempK: 1280,
    pressureRatio: '11.2 : 1',
    summary:
      '2-stage single-crystal high-pressure turbine extracts intense thermal energy from the combustor exit stream to drive the HP compressor.',
    detail:
      'Connected directly to the hollow outer amber HP shaft, these blades operate above the melting point of their metal alloy, surviving via internal serpentine cooling passages and thermal barrier coatings.',
  },
  {
    id: 'lp_turbine',
    code: 'STG-07',
    name: 'LP TURBINE',
    phase: 'BLOW',
    phaseColor: '#FB7185',
    baseX: 3.1,
    explodeX: 5.35,
    calloutOffset: [0, 2.4, 0.6],
    rpmLabel: 'N1 · 2,850 RPM',
    shaft: 'Inner LP Shaft (Cyan)',
    tempK: 820,
    pressureRatio: '2.1 : 1',
    summary:
      '5-stage expanding low-pressure turbine extracts remaining gas energy to torque the inner cyan LP shaft and spin the front Titanium Fan.',
    detail:
      'As gas pressure drops and specific volume expands rapidly across the 5 stages, blade span increases outward toward the rear casing.',
  },
  {
    id: 'exhaust_nozzle',
    code: 'STG-08',
    name: 'EXHAUST NOZZLE',
    phase: 'BLOW',
    phaseColor: '#A78BFA',
    baseX: 4.35,
    explodeX: 7.45,
    calloutOffset: [0, 2.15, -0.4],
    rpmLabel: 'Convergent Core + Mixer',
    shaft: 'Tailcone & Acoustic Chevrons',
    tempK: 690,
    pressureRatio: '1.0 : 1 (Ambient)',
    summary:
      'Convergent exhaust nozzle and centerbody tailcone accelerate core gas into a high-momentum propulsive jet.',
    detail:
      'Sawtooth acoustic chevrons along the nozzle lip promote gentle shear-layer mixing between the hot core jet, the cold bypass stream, and ambient freestream air to reduce low-frequency cabin rumble.',
  },
];

export const TOUR_SEGMENTS = [
  {
    start: 0,
    end: 4.5,
    phase: 'SUCK',
    stageId: 'fan',
    title: '01 · NACELLE & CLAMSHELL COWLING ACCESS',
    caption:
      'Clamshell maintenance cowlings swing open on upper pylon hinges, exposing the dual-spool high-bypass turbofan core.',
    camPos: [-5.6, 1.8, 7.2],
    camTarget: [0.0, 0.1, 0],
    cowlingOpen: true,
    explodeFactor: 0,
  },
  {
    start: 4.5,
    end: 9.5,
    phase: 'SUCK',
    stageId: 'fan',
    title: '02 · SUCK — TITANIUM FAN & HIGH-BYPASS COLD STREAM',
    caption:
      'The 22-blade front fan (driven by the inner cyan LP shaft) ingests massive airflow, routing 85% through the cold Bypass Duct.',
    camPos: [-6.2, 0.9, 4.4],
    camTarget: [-2.6, 0.0, 0],
    cowlingOpen: true,
    explodeFactor: 0,
  },
  {
    start: 9.5,
    end: 15.0,
    phase: 'SQUEEZE',
    stageId: 'hp_compressor',
    title: '03 · SQUEEZE — CONCENTRIC LP & 9-STAGE HP COMPRESSORS',
    caption:
      'Core air passes through the 3-stage LP booster (cyan shaft) into the 9-stage HP compressor (amber shaft), reaching 38:1 pressure.',
    camPos: [-1.4, 1.15, 4.8],
    camTarget: [-0.8, 0.0, 0],
    cowlingOpen: true,
    explodeFactor: 0.15,
  },
  {
    start: 15.0,
    end: 20.0,
    phase: 'BANG',
    stageId: 'combustor',
    title: '04 · BANG — ANNULAR COMBUSTOR AT 1,720 K',
    caption:
      '20 swirl fuel injectors atomize Jet-A1 fuel into a continuous 1,720 K flame ring inside the perforated superalloy liner.',
    camPos: [1.1, 1.1, 4.3],
    camTarget: [0.95, 0.0, 0],
    cowlingOpen: true,
    explodeFactor: 0.25,
  },
  {
    start: 20.0,
    end: 24.0,
    phase: 'BLOW',
    stageId: 'lp_turbine',
    title: '05 · BLOW — COOLED HP & 5-STAGE LP TURBINES',
    caption:
      'Expanding gas spins the 2-stage HP turbine (outer amber shaft) and 5-stage LP turbine (inner cyan shaft) before exiting the nozzle.',
    camPos: [4.2, 1.25, 5.2],
    camTarget: [2.8, 0.0, 0],
    cowlingOpen: true,
    explodeFactor: 0.2,
  },
  {
    start: 24.0,
    end: 28.0,
    phase: 'BLOW',
    stageId: 'exhaust_nozzle',
    title: '06 · AXIAL DISASSEMBLY — COMPLETE 8-STAGE EXPLODED VIEW',
    caption:
      'All 8 axial stages separate along the concentric LP (cyan) and HP (amber) rotor shafts for full cross-sectional inspection.',
    camPos: [0.2, 2.3, 11.2],
    camTarget: [0.4, 0.1, 0],
    cowlingOpen: true,
    explodeFactor: 1.0,
  },
];

/**
 * Helper to create a multi-blade axial rotor disk
 */
function BladedRotorDisk({
  radiusOuter = 1.2,
  radiusInner = 0.45,
  bladeCount = 24,
  bladeChord = 0.18,
  bladeThickness = 0.025,
  twistRad = 0.45,
  bladeColor = '#CBD5E1',
  hubColor = '#475569',
}) {
  const blades = useMemo(() => {
    const arr = [];
    for (let i = 0; i < bladeCount; i++) {
      const angle = (i / bladeCount) * Math.PI * 2;
      arr.push(angle);
    }
    return arr;
  }, [bladeCount]);

  const bladeLen = Math.max(0.12, radiusOuter - radiusInner);
  const midR = radiusInner + bladeLen * 0.5;

  return (
    <group>
      {/* Rotor Hub Ring */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[radiusInner, radiusInner, bladeChord * 1.15, 28]} />
        <meshStandardMaterial color={hubColor} metalness={0.82} roughness={0.28} />
      </mesh>
      {/* Individual Twisted Airfoil Blades */}
      {blades.map((angle, idx) => (
        <group key={idx} rotation={[angle, 0, 0]}>
          <mesh
            position={[0, midR, 0]}
            rotation={[0, twistRad, 0]}
          >
            <boxGeometry args={[bladeChord, bladeLen, bladeThickness]} />
            <meshStandardMaterial color={bladeColor} metalness={0.88} roughness={0.2} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/**
 * Camera controller that supports both guided timeline tour and stage inspection
 */
function TurbofanCameraRig({
  followCamera,
  tourPlaying,
  tourTime,
  selectedStageId,
  explodeFactor,
  controlsRef,
}) {
  const { camera } = useThree();
  const desiredPos = useRef(new THREE.Vector3(-4.5, 2.1, 8.2));
  const desiredTarget = useRef(new THREE.Vector3(0.2, 0.1, 0));

  useEffect(() => {
    if (followCamera && tourPlaying) return;
    const stg = TURBOFAN_STAGES.find((s) => s.id === selectedStageId);
    if (stg) {
      const currentX = THREE.MathUtils.lerp(stg.baseX, stg.explodeX, explodeFactor);
      desiredPos.current.set(currentX - 1.2, 1.55, 5.6 + explodeFactor * 2.5);
      desiredTarget.current.set(currentX, 0.1, 0);
    }
  }, [selectedStageId, explodeFactor, followCamera, tourPlaying]);

  useFrame((_, dt) => {
    if (followCamera && tourPlaying) {
      const seg =
        TOUR_SEGMENTS.find((s) => tourTime >= s.start && tourTime <= s.end) ||
        TOUR_SEGMENTS[TOUR_SEGMENTS.length - 1];
      desiredPos.current.set(...seg.camPos);
      desiredTarget.current.set(...seg.camTarget);
      camera.position.lerp(desiredPos.current, Math.min(1, dt * 2.8));
      if (controlsRef.current) {
        controlsRef.current.target.lerp(desiredTarget.current, Math.min(1, dt * 3.5));
        controlsRef.current.update();
      }
    }
  });

  return null;
}

/**
 * Core 3D Scene inside Canvas
 */
function TurbofanAssemblyScene({
  selectedStageId,
  onSelectStage,
  cowlingOpen,
  explodeFactor,
  throttlePct = 82,
  bypassRatio = 8.5,
  showLabels = true,
}) {
  const lpSpoolRef = useRef();
  const hpSpoolRef = useRef();
  const portCowlingRef = useRef();
  const stbdCowlingRef = useRef();
  const flameRingRef = useRef();
  const bypassFlowRef = useRef();
  const coreFlowRef = useRef();

  // Stage X positions interpolated by explodeFactor
  const stageRefs = useRef({});
  const currentStageX = useRef(
    Object.fromEntries(TURBOFAN_STAGES.map((s) => [s.id, s.baseX]))
  );

  // Combustor spark & flow particle data
  const flowParticles = useMemo(() => {
    const bypass = [];
    for (let i = 0; i < 36; i++) {
      const angle = (i / 36) * Math.PI * 2;
      const r = 1.48 + (i % 3) * 0.08;
      bypass.push({
        angle,
        r,
        phase: (i * 0.19) % 1,
      });
    }
    const core = [];
    for (let i = 0; i < 28; i++) {
      const angle = (i / 28) * Math.PI * 2;
      const r = 0.72 + (i % 2) * 0.09;
      core.push({
        angle,
        r,
        phase: (i * 0.23) % 1,
      });
    }
    return { bypass, core };
  }, []);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const throttleNorm = Math.max(0.15, throttlePct / 100);

    // 1. Dual-spool independent rotation speeds:
    // Inner LP Shaft (N1) spins moderate; Outer HP Shaft (N2) spins ~2.7x faster
    if (lpSpoolRef.current) {
      lpSpoolRef.current.rotation.x += dt * 4.2 * throttleNorm;
    }
    if (hpSpoolRef.current) {
      hpSpoolRef.current.rotation.x += dt * 11.4 * throttleNorm;
    }

    // 2. Smooth axial stage explosion interpolation
    TURBOFAN_STAGES.forEach((stg) => {
      const targetX = THREE.MathUtils.lerp(stg.baseX, stg.explodeX, explodeFactor);
      currentStageX.current[stg.id] = THREE.MathUtils.lerp(
        currentStageX.current[stg.id] ?? stg.baseX,
        targetX,
        Math.min(1, dt * 7)
      );
      const grp = stageRefs.current[stg.id];
      if (grp) {
        grp.position.x = currentStageX.current[stg.id];
      }
    });

    // 3. Hinged Clamshell Cowling Doors (swing open up to 78 degrees)
    const targetCowlingAngle = cowlingOpen ? 1.28 : 0.0;
    if (portCowlingRef.current) {
      portCowlingRef.current.rotation.x = THREE.MathUtils.lerp(
        portCowlingRef.current.rotation.x,
        -targetCowlingAngle,
        Math.min(1, dt * 5.5)
      );
    }
    if (stbdCowlingRef.current) {
      stbdCowlingRef.current.rotation.x = THREE.MathUtils.lerp(
        stbdCowlingRef.current.rotation.x,
        targetCowlingAngle,
        Math.min(1, dt * 5.5)
      );
    }

    // 4. Combustor volumetric fire pulse
    if (flameRingRef.current) {
      const pulse = 0.92 + Math.sin(t * 28) * 0.08;
      flameRingRef.current.scale.set(1, pulse, pulse);
    }

    // 5. Bypass & Core particle stream animation
    if (bypassFlowRef.current) {
      bypassFlowRef.current.children.forEach((mesh, i) => {
        const p = flowParticles.bypass[i];
        if (!p) return;
        const prog = (p.phase + t * 0.55 * throttleNorm) % 1;
        const x = -3.4 + prog * 7.8;
        mesh.position.set(x, Math.cos(p.angle) * p.r, Math.sin(p.angle) * p.r);
      });
    }
    if (coreFlowRef.current) {
      coreFlowRef.current.children.forEach((mesh, i) => {
        const p = flowParticles.core[i];
        if (!p) return;
        const prog = (p.phase + t * 0.85 * throttleNorm) % 1;
        const x = -2.8 + prog * 7.4;
        mesh.position.set(x, Math.cos(p.angle) * p.r, Math.sin(p.angle) * p.r);
      });
    }
  });

  // Wing & Pylon fades back slightly when stages are exploded so nothing blocks the view
  const wingOffsetY = explodeFactor * 0.85;

  return (
    <group>
      {/* ================================================================= */}
      {/* COMMERCIAL AIRLINER WING SECTION & STRUCTURAL PYLON (TOP MOUNT)   */}
      {/* ================================================================= */}
      <group position={[0.4, 2.35 + wingOffsetY, 0]}>
        {/* Swept Wing Box Section */}
        <mesh position={[0.8, 0.85, 0]} rotation={[0.04, -0.18, -0.05]}>
          <boxGeometry args={[5.8, 0.36, 9.6]} />
          <meshStandardMaterial color="#CBD5E1" metalness={0.65} roughness={0.32} />
        </mesh>
        {/* Leading Edge Slat Highlight */}
        <mesh position={[-1.95, 0.72, 0]} rotation={[0.04, -0.18, -0.12]}>
          <cylinderGeometry args={[0.16, 0.16, 9.6, 20]} rotation={[Math.PI / 2, 0, 0]} />
          <meshStandardMaterial color="#94A3B8" metalness={0.85} roughness={0.2} />
        </mesh>
        {/* Under-wing Flap Track Fairings (Canoes) */}
        {[-2.8, 2.8].map((zPos, i) => (
          <mesh key={i} position={[2.6, 0.48, zPos]} rotation={[0, 0, Math.PI / 2]}>
            <coneGeometry args={[0.22, 2.2, 16]} />
            <meshStandardMaterial color="#94A3B8" metalness={0.6} roughness={0.35} />
          </mesh>
        ))}
        {/* Aerodynamic Engine Pylon Strut */}
        <mesh position={[-0.2, -0.15, 0]}>
          <boxGeometry args={[4.6, 1.45, 0.44]} />
          <meshStandardMaterial color="#64748B" metalness={0.72} roughness={0.3} />
        </mesh>
        {/* Pylon Forward Fairing */}
        <mesh position={[-2.4, -0.45, 0]} rotation={[0, 0, -0.45]}>
          <boxGeometry args={[1.4, 0.85, 0.38]} />
          <meshStandardMaterial color="#475569" metalness={0.75} roughness={0.28} />
        </mesh>
      </group>

      {/* ================================================================= */}
      {/* CONCENTRIC DUAL-SPOOL SHAFTS (INNER CYAN LP + OUTER AMBER HP)     */}
      {/* ================================================================= */}
      <group>
        {/* Inner Cyan LP Shaft (N1) running from Fan (-3.4) to LP Turbine (+3.6) */}
        <mesh rotation={[0, 0, Math.PI / 2]} position={[0.1, 0, 0]}>
          <cylinderGeometry args={[0.14, 0.14, 7.6 + explodeFactor * 6.2, 28]} />
          <meshStandardMaterial
            color="#00E5FF"
            emissive="#00E5FF"
            emissiveIntensity={0.45}
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>

        {/* Outer Concentric Amber HP Shaft (N2) running from HP Compressor (-0.9) to HP Turbine (+2.1) */}
        <mesh rotation={[0, 0, Math.PI / 2]} position={[0.75, 0, 0]}>
          <cylinderGeometry
            args={[0.26, 0.26, 3.1 + explodeFactor * 2.4, 28, 1, true]}
          />
          <meshStandardMaterial
            color="#F59E0B"
            emissive="#F59E0B"
            emissiveIntensity={0.35}
            metalness={0.85}
            roughness={0.2}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>

      {/* ================================================================= */}
      {/* STAGE 1: TITANIUM FAN & CHROME INLET LIP (SUCK)                   */}
      {/* ================================================================= */}
      <group
        ref={(el) => (stageRefs.current.fan = el)}
        position={[-3.2, 0, 0]}
        onClick={(e) => {
          e.stopPropagation();
          onSelectStage('fan');
        }}
      >
        {/* Polished Chrome Acoustic Inlet Lip Ring */}
        <mesh rotation={[0, Math.PI / 2, 0]} position={[-0.35, 0, 0]}>
          <torusGeometry args={[1.76, 0.16, 24, 64]} />
          <meshStandardMaterial color="#E2E8F0" metalness={0.95} roughness={0.12} />
        </mesh>
        {/* Fan Containment Ring (Kevlar-wrapped Titanium Case) */}
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[1.78, 1.74, 0.68, 48, 1, true]} />
          <meshStandardMaterial
            color={selectedStageId === 'fan' ? '#38BDF8' : '#334155'}
            metalness={0.78}
            roughness={0.28}
            side={THREE.DoubleSide}
            transparent
            opacity={cowlingOpen ? 0.55 : 0.92}
          />
        </mesh>

        {/* Rotating LP Spool Assembly (Fan + LP Booster + LP Turbine) */}
        <group ref={lpSpoolRef}>
          {/* Conical Black/Titanium Spinner with White Spiral */}
          <mesh rotation={[0, 0, Math.PI / 2]} position={[-0.48, 0, 0]}>
            <coneGeometry args={[0.48, 0.85, 32]} />
            <meshStandardMaterial color="#1E293B" metalness={0.7} roughness={0.3} />
          </mesh>
          {/* 22 Wide-Chord Swept Titanium Fan Blades */}
          <BladedRotorDisk
            radiusOuter={1.68}
            radiusInner={0.46}
            bladeCount={22}
            bladeChord={0.32}
            bladeThickness={0.035}
            twistRad={0.52}
            bladeColor="#E2E8F0"
            hubColor="#0284C7"
          />
        </group>
      </group>

      {/* ================================================================= */}
      {/* STAGE 2: BYPASS DUCT & HINGED CLAMSHELL COWLING DOORS (SUCK)      */}
      {/* ================================================================= */}
      <group
        ref={(el) => (stageRefs.current.bypass_duct = el)}
        position={[-2.15, 0, 0]}
        onClick={(e) => {
          e.stopPropagation();
          onSelectStage('bypass_duct');
        }}
      >
        {/* Outlet Guide Vane (OGV) Stator Ring */}
        <BladedRotorDisk
          radiusOuter={1.68}
          radiusInner={1.08}
          bladeCount={32}
          bladeChord={0.22}
          bladeThickness={0.02}
          twistRad={-0.35}
          bladeColor="#38BDF8"
          hubColor="#1E293B"
        />
        {/* Inner Core Splitter Fairing */}
        <mesh rotation={[0, 0, Math.PI / 2]} position={[0.25, 0, 0]}>
          <cylinderGeometry args={[1.08, 1.02, 0.95, 36, 1, true]} />
          <meshStandardMaterial
            color="#475569"
            metalness={0.75}
            roughness={0.3}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* HINGED PORT CLAMSHELL COWLING DOOR (Pivots at top Y = +1.76) */}
        <group position={[1.4, 1.76, 0]} ref={portCowlingRef}>
          <mesh
            position={[0, -1.76, 0]}
            rotation={[0, 0, Math.PI / 2]}
          >
            <cylinderGeometry
              args={[1.78, 1.62, 4.8, 36, 1, true, 0.12, Math.PI - 0.24]}
            />
            <meshStandardMaterial
              color="#E2E8F0"
              metalness={0.68}
              roughness={0.26}
              side={THREE.DoubleSide}
            />
          </mesh>
          {/* Interior Cyan Acoustic Lining */}
          <mesh
            position={[0, -1.76, 0]}
            rotation={[0, 0, Math.PI / 2]}
          >
            <cylinderGeometry
              args={[1.75, 1.59, 4.7, 36, 1, true, 0.14, Math.PI - 0.28]}
            />
            <meshStandardMaterial
              color="#0284C7"
              metalness={0.5}
              roughness={0.4}
              side={THREE.DoubleSide}
            />
          </mesh>
          {/* Hydraulic Hold-Open Strut */}
          {cowlingOpen && (
            <mesh position={[-0.6, -0.95, 1.05]} rotation={[0.5, 0, 0]}>
              <cylinderGeometry args={[0.025, 0.025, 1.65, 12]} />
              <meshStandardMaterial color="#F59E0B" metalness={0.85} roughness={0.2} />
            </mesh>
          )}
        </group>

        {/* HINGED STARBOARD CLAMSHELL COWLING DOOR (Pivots at top Y = +1.76) */}
        <group position={[1.4, 1.76, 0]} ref={stbdCowlingRef}>
          <mesh
            position={[0, -1.76, 0]}
            rotation={[0, 0, Math.PI / 2]}
          >
            <cylinderGeometry
              args={[1.78, 1.62, 4.8, 36, 1, true, Math.PI + 0.12, Math.PI - 0.24]}
            />
            <meshStandardMaterial
              color="#E2E8F0"
              metalness={0.68}
              roughness={0.26}
              side={THREE.DoubleSide}
            />
          </mesh>
          {/* Hydraulic Hold-Open Strut */}
          {cowlingOpen && (
            <mesh position={[-0.6, -0.95, -1.05]} rotation={[-0.5, 0, 0]}>
              <cylinderGeometry args={[0.025, 0.025, 1.65, 12]} />
              <meshStandardMaterial color="#F59E0B" metalness={0.85} roughness={0.2} />
            </mesh>
          )}
        </group>
      </group>

      {/* ================================================================= */}
      {/* STAGE 3: 3-STAGE LP COMPRESSOR BOOSTER (SQUEEZE)                  */}
      {/* ================================================================= */}
      <group
        ref={(el) => (stageRefs.current.lp_compressor = el)}
        position={[-1.65, 0, 0]}
        onClick={(e) => {
          e.stopPropagation();
          onSelectStage('lp_compressor');
        }}
      >
        {[-0.28, 0.0, 0.28].map((dx, idx) => (
          <group key={idx} position={[dx, 0, 0]}>
            <BladedRotorDisk
              radiusOuter={1.0 - idx * 0.05}
              radiusInner={0.44}
              bladeCount={28}
              bladeChord={0.14}
              bladeThickness={0.02}
              twistRad={0.42}
              bladeColor={selectedStageId === 'lp_compressor' ? '#38BDF8' : '#7DD3FC'}
              hubColor="#0369A1"
            />
          </group>
        ))}
        {/* Semi-transparent LP Booster Case */}
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[1.04, 0.94, 0.85, 32, 1, true, 0, Math.PI]} />
          <meshStandardMaterial
            color="#0284C7"
            metalness={0.8}
            roughness={0.25}
            transparent
            opacity={0.45}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>

      {/* ================================================================= */}
      {/* STAGE 4: 9-STAGE HP COMPRESSOR (SQUEEZE — AMBER HP SHAFT)         */}
      {/* ================================================================= */}
      <group
        ref={(el) => (stageRefs.current.hp_compressor = el)}
        position={[-0.35, 0, 0]}
        onClick={(e) => {
          e.stopPropagation();
          onSelectStage('hp_compressor');
        }}
      >
        <group ref={hpSpoolRef}>
          {[-0.64, -0.48, -0.32, -0.16, 0.0, 0.16, 0.32, 0.48, 0.64].map((dx, idx) => (
            <group key={idx} position={[dx, 0, 0]}>
              <BladedRotorDisk
                radiusOuter={0.88 - idx * 0.026}
                radiusInner={0.42 + idx * 0.012}
                bladeCount={34}
                bladeChord={0.095}
                bladeThickness={0.016}
                twistRad={0.38}
                bladeColor={selectedStageId === 'hp_compressor' ? '#38BDF8' : '#CBD5E1'}
                hubColor="#D97706"
              />
            </group>
          ))}
        </group>
        {/* Cutaway HP Compressor Casing */}
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.92, 0.72, 1.48, 36, 1, true, 0, Math.PI]} />
          <meshStandardMaterial
            color="#334155"
            metalness={0.82}
            roughness={0.28}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>

      {/* ================================================================= */}
      {/* STAGE 5: ANNULAR COMBUSTOR & VOLUMETRIC FLAME RING (BANG)         */}
      {/* ================================================================= */}
      <group
        ref={(el) => (stageRefs.current.combustor = el)}
        position={[0.95, 0, 0]}
        onClick={(e) => {
          e.stopPropagation();
          onSelectStage('combustor');
        }}
      >
        {/* Perforated Combustor Outer Liner (Upper half cutaway) */}
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.86, 0.86, 0.92, 36, 1, true, 0, Math.PI * 1.15]} />
          <meshStandardMaterial
            color="#78350F"
            metalness={0.78}
            roughness={0.32}
            side={THREE.DoubleSide}
          />
        </mesh>
        {/* Glowing Annular Flame Torus */}
        <group ref={flameRingRef}>
          <mesh rotation={[0, Math.PI / 2, 0]} position={[-0.08, 0, 0]}>
            <torusGeometry args={[0.62, 0.16, 20, 48]} />
            <meshBasicMaterial color="#F97316" transparent opacity={0.85} />
          </mesh>
          <mesh rotation={[0, Math.PI / 2, 0]} position={[0.08, 0, 0]}>
            <torusGeometry args={[0.62, 0.11, 18, 48]} />
            <meshBasicMaterial color="#FEF08A" transparent opacity={0.92} />
          </mesh>
        </group>
        {/* 16 Fuel Atomizer Nozzles around perimeter */}
        {Array.from({ length: 16 }).map((_, idx) => {
          const a = (idx / 16) * Math.PI * 2;
          return (
            <mesh
              key={idx}
              position={[-0.36, Math.cos(a) * 0.64, Math.sin(a) * 0.64]}
              rotation={[0, 0, Math.PI / 2]}
            >
              <cylinderGeometry args={[0.03, 0.03, 0.24, 10]} />
              <meshStandardMaterial color="#FBBF24" metalness={0.9} roughness={0.18} />
            </mesh>
          );
        })}
      </group>

      {/* ================================================================= */}
      {/* STAGE 6: 2-STAGE COOLED HP TURBINE (BLOW — AMBER HP SHAFT)        */}
      {/* ================================================================= */}
      <group
        ref={(el) => (stageRefs.current.hp_turbine = el)}
        position={[1.95, 0, 0]}
        onClick={(e) => {
          e.stopPropagation();
          onSelectStage('hp_turbine');
        }}
      >
        {[-0.18, 0.18].map((dx, idx) => (
          <group key={idx} position={[dx, 0, 0]}>
            <BladedRotorDisk
              radiusOuter={0.78 + idx * 0.05}
              radiusInner={0.42}
              bladeCount={36}
              bladeChord={0.15}
              bladeThickness={0.022}
              twistRad={-0.44}
              bladeColor={selectedStageId === 'hp_turbine' ? '#FCA5A5' : '#F87171'}
              hubColor="#B45309"
            />
          </group>
        ))}
        {/* HP Turbine Thermal Shroud */}
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.88, 0.94, 0.68, 32, 1, true, 0, Math.PI]} />
          <meshStandardMaterial
            color="#991B1B"
            metalness={0.75}
            roughness={0.3}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>

      {/* ================================================================= */}
      {/* STAGE 7: 5-STAGE EXPANDING LP TURBINE (BLOW — CYAN LP SHAFT)      */}
      {/* ================================================================= */}
      <group
        ref={(el) => (stageRefs.current.lp_turbine = el)}
        position={[3.1, 0, 0]}
        onClick={(e) => {
          e.stopPropagation();
          onSelectStage('lp_turbine');
        }}
      >
        {[-0.52, -0.26, 0.0, 0.26, 0.52].map((dx, idx) => (
          <group key={idx} position={[dx, 0, 0]}>
            <BladedRotorDisk
              radiusOuter={0.88 + idx * 0.075}
              radiusInner={0.36}
              bladeCount={32}
              bladeChord={0.14}
              bladeThickness={0.02}
              twistRad={-0.4}
              bladeColor={selectedStageId === 'lp_turbine' ? '#FDA4AF' : '#FB7185'}
              hubColor="#0284C7"
            />
          </group>
        ))}
        {/* LP Turbine Expanding Case */}
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.94, 1.24, 1.32, 36, 1, true, 0, Math.PI]} />
          <meshStandardMaterial
            color="#475569"
            metalness={0.8}
            roughness={0.28}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>

      {/* ================================================================= */}
      {/* STAGE 8: CONVERGENT EXHAUST NOZZLE & TAILCONE (BLOW)              */}
      {/* ================================================================= */}
      <group
        ref={(el) => (stageRefs.current.exhaust_nozzle = el)}
        position={[4.35, 0, 0]}
        onClick={(e) => {
          e.stopPropagation();
          onSelectStage('exhaust_nozzle');
        }}
      >
        {/* Outer Convergent Core Exhaust Nozzle */}
        <mesh rotation={[0, 0, Math.PI / 2]} position={[-0.1, 0, 0]}>
          <cylinderGeometry args={[0.92, 1.22, 1.15, 36, 1, true]} />
          <meshStandardMaterial
            color={selectedStageId === 'exhaust_nozzle' ? '#A78BFA' : '#334155'}
            metalness={0.84}
            roughness={0.25}
            side={THREE.DoubleSide}
          />
        </mesh>
        {/* Inner Acoustic Centerbody Tailcone */}
        <mesh rotation={[0, 0, -Math.PI / 2]} position={[0.45, 0, 0]}>
          <coneGeometry args={[0.56, 1.65, 32]} />
          <meshStandardMaterial color="#1E293B" metalness={0.82} roughness={0.28} />
        </mesh>
      </group>

      {/* ================================================================= */}
      {/* LIVE BYPASS (COLD CYAN) & CORE (HOT ORANGE) AIRFLOW PARTICLES     */}
      {/* ================================================================= */}
      <group ref={bypassFlowRef}>
        {flowParticles.bypass.map((_, idx) => (
          <mesh key={idx} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.014, 0.014, 0.42, 6]} />
            <meshBasicMaterial color="#38BDF8" transparent opacity={0.55} />
          </mesh>
        ))}
      </group>
      <group ref={coreFlowRef}>
        {flowParticles.core.map((_, idx) => (
          <mesh key={idx} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.016, 0.016, 0.36, 6]} />
            <meshBasicMaterial color="#FB923C" transparent opacity={0.65} />
          </mesh>
        ))}
      </group>

      {/* ================================================================= */}
      {/* FLOATING 3D CALLOUT LABELS WITH LEADER LINES (VIDEO 2 STYLE)      */}
      {/* ================================================================= */}
      {showLabels &&
        TURBOFAN_STAGES.map((stg) => {
          const isSelected = selectedStageId === stg.id;
          const xPos = THREE.MathUtils.lerp(stg.baseX, stg.explodeX, explodeFactor);
          const anchor = [xPos, 0.65, 0];
          const labelPos = [
            xPos + stg.calloutOffset[0],
            stg.calloutOffset[1] - (explodeFactor > 0.2 ? 0.25 : 0),
            stg.calloutOffset[2],
          ];

          return (
            <group key={stg.id}>
              <Line
                points={[anchor, labelPos]}
                color={isSelected ? stg.phaseColor : '#64748B'}
                lineWidth={isSelected ? 2.0 : 1.1}
                transparent
                opacity={isSelected ? 0.95 : 0.55}
              />
              <mesh position={anchor}>
                <sphereGeometry args={[isSelected ? 0.075 : 0.05, 12, 12]} />
                <meshBasicMaterial color={stg.phaseColor} />
              </mesh>
              <Html position={labelPos} center distanceFactor={13} zIndexRange={[10, 0]}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectStage(stg.id);
                  }}
                  style={{
                    background: 'var(--glass-bg-strong)',
                    backdropFilter: 'blur(12px)',
                    border: `1px solid ${isSelected ? stg.phaseColor : 'var(--glass-border)'}`,
                    borderRadius: '999px',
                    padding: '4px 10px',
                    color: isSelected ? stg.phaseColor : 'var(--glass-text)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    fontWeight: 700,
                    letterSpacing: '0.07em',
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    boxShadow: isSelected ? `0 0 14px ${stg.phaseColor}55` : 'var(--shadow-sm)',
                  }}
                >
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: stg.phaseColor,
                    }}
                  />
                  <span>{stg.name}</span>
                </button>
              </Html>
            </group>
          );
        })}
    </group>
  );
}

/**
 * Complete Self-Contained 3D Turbofan Explorer Component (Video 2 Experience)
 * Can be rendered inside `/explore` or inside `/lab` Propulsion Station.
 */
export default function TurbofanExplorer3D({
  selectedStageId: externalStageId,
  onSelectStage: externalOnSelectStage,
  throttlePct = 84,
  bypassRatio = 8.5,
  height = '640px',
}) {
  const [internalStageId, setInternalStageId] = useState('fan');
  const selectedStageId = externalStageId || internalStageId;
  const setSelectedStageId = externalOnSelectStage || setInternalStageId;

  const [cowlingOpen, setCowlingOpen] = useState(true);
  const [explodeFactor, setExplodeFactor] = useState(0.0);
  const [skyBackdrop, setSkyBackdrop] = useState(true);
  const [followCamera, setFollowCamera] = useState(true);
  const [tourPlaying, setTourPlaying] = useState(false);
  const [tourTime, setTourTime] = useState(0.0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const controlsRef = useRef();

  // Guided Tour Timer Loop (0.0s -> 28.0s)
  useEffect(() => {
    if (!tourPlaying) return undefined;
    const interval = setInterval(() => {
      setTourTime((prev) => {
        const next = prev + 0.1 * playbackSpeed;
        if (next >= 28.0) {
          setTourPlaying(false);
          return 28.0;
        }
        return next;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [tourPlaying, playbackSpeed]);

  // Synchronize stage selection, cowling, and axial explosion with tour timeline
  const currentTourSegment = useMemo(() => {
    return (
      TOUR_SEGMENTS.find((s) => tourTime >= s.start && tourTime <= s.end) ||
      TOUR_SEGMENTS[0]
    );
  }, [tourTime]);

  useEffect(() => {
    if (!tourPlaying) return;
    setSelectedStageId(currentTourSegment.stageId);
    setCowlingOpen(currentTourSegment.cowlingOpen);
    setExplodeFactor(currentTourSegment.explodeFactor);
  }, [tourPlaying, currentTourSegment, setSelectedStageId]);

  const activeStage = useMemo(
    () => TURBOFAN_STAGES.find((s) => s.id === selectedStageId) || TURBOFAN_STAGES[0],
    [selectedStageId]
  );

  const handlePhaseButton = (phase) => {
    setTourPlaying(false);
    setCowlingOpen(true);
    const firstMatch = TURBOFAN_STAGES.find((s) => s.phase === phase);
    if (firstMatch) {
      setSelectedStageId(firstMatch.id);
    }
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height,
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        border: '1px solid var(--border-subtle)',
        background: skyBackdrop ? 'var(--scene-sky)' : 'var(--scene-bg)',
      }}
    >
      {/* ================================================================= */}
      {/* TOP BAR: TURBOFAN EXPLORER + SUCK / SQUEEZE / BANG / BLOW         */}
      {/* ================================================================= */}
      <div
        style={{
          position: 'absolute',
          top: '14px',
          left: '16px',
          right: '16px',
          zIndex: 15,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '12px',
          pointerEvents: 'none',
        }}
      >
        {/* Left Title & SUCK · SQUEEZE · BANG · BLOW Pills */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            pointerEvents: 'auto',
          }}
        >
          <div
            className="vg-glass"
            style={{
              padding: '10px 14px',
            }}
          >
            <div
              className="mono"
              style={{
                fontSize: '12px',
                fontWeight: 700,
                letterSpacing: '0.14em',
                color: 'var(--glass-text)',
              }}
            >
              TURBOFAN EXPLORER
            </div>
            <div style={{ fontSize: '11px', color: 'var(--glass-text-soft)', marginTop: '2px' }}>
              Suck · Squeeze · Bang · Blow — Two-Spool High-Bypass Cutaway
            </div>
          </div>

          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {[
              { id: 'SUCK', color: '#38BDF8' },
              { id: 'SQUEEZE', color: '#00E5FF' },
              { id: 'BANG', color: '#F59E0B' },
              { id: 'BLOW', color: '#EF4444' },
            ].map((p) => {
              const isActive = activeStage.phase === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handlePhaseButton(p.id)}
                  className="mono"
                  style={{
                    padding: '6px 12px',
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    borderRadius: 'var(--radius-pill)',
                    cursor: 'pointer',
                    background: isActive ? p.color : 'var(--glass-bg-strong)',
                    color: isActive ? '#06080C' : 'var(--glass-text)',
                    border: `1px solid ${isActive ? p.color : 'var(--glass-border)'}`,
                    backdropFilter: 'blur(12px)',
                  }}
                >
                  {p.id}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Engine Controls Card */}
        <div
          className="vg-glass"
          style={{
            padding: '10px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            pointerEvents: 'auto',
            minWidth: '240px',
          }}
        >
          <div
            className="mono"
            style={{
              fontSize: '10px',
              letterSpacing: '0.12em',
              color: 'var(--glass-muted)',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <span>ENGINE CONTROLS</span>
            <span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>BPR {bypassRatio}:1</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            <button
              type="button"
              onClick={() => {
                setTourPlaying(false);
                setExplodeFactor(0);
                setCowlingOpen(true);
              }}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '11px' }}
            >
              Reset view
            </button>
            <button
              type="button"
              onClick={() => {
                setTourPlaying(false);
                setCowlingOpen((v) => !v);
              }}
              className={`btn btn-sm ${cowlingOpen ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '11px' }}
            >
              {cowlingOpen ? 'Cowling open' : 'Cowling closed'}
            </button>
            <button
              type="button"
              onClick={() => {
                setTourPlaying(false);
                setCowlingOpen(true);
                setExplodeFactor((prev) => (prev > 0.5 ? 0.0 : 1.0));
              }}
              className={`btn btn-sm ${explodeFactor > 0.5 ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '11px' }}
            >
              {explodeFactor > 0.5 ? 'Reassemble' : 'Explode stages'}
            </button>
            <button
              type="button"
              onClick={() => setSkyBackdrop((v) => !v)}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '11px' }}
            >
              {skyBackdrop ? 'Sky horizon' : 'Hangar studio'}
            </button>
          </div>

          {/* Axial Stage Explosion Slider */}
          <div>
            <div
              className="mono"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '10px',
                color: 'var(--glass-text-soft)',
                marginBottom: '3px',
              }}
            >
              <span>AXIAL STAGE SEPARATION</span>
              <span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>{Math.round(explodeFactor * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.02"
              value={explodeFactor}
              onChange={(e) => {
                setTourPlaying(false);
                setCowlingOpen(true);
                setExplodeFactor(Number(e.target.value));
              }}
            />
          </div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* THREE.JS 3D CANVAS                                                */}
      {/* ================================================================= */}
      <Canvas shadows dpr={[1, 2]}>
        <PerspectiveCamera makeDefault position={[-4.5, 2.0, 8.2]} fov={40} />
        <TurbofanCameraRig
          followCamera={followCamera}
          tourPlaying={tourPlaying}
          tourTime={tourTime}
          selectedStageId={selectedStageId}
          explodeFactor={explodeFactor}
          controlsRef={controlsRef}
        />
        <OrbitControls
          ref={controlsRef}
          enableDamping
          dampingFactor={0.07}
          maxDistance={22}
          minDistance={2.8}
        />

        <ambientLight intensity={0.85} />
        <directionalLight position={[10, 14, 10]} intensity={1.65} castShadow />
        <directionalLight position={[-10, -4, -8]} intensity={0.65} color="#38BDF8" />
        <pointLight position={[0.95, 0, 0]} intensity={2.4} color="#F97316" distance={4.5} />

        <TurbofanAssemblyScene
          selectedStageId={selectedStageId}
          onSelectStage={(id) => {
            setTourPlaying(false);
            setSelectedStageId(id);
          }}
          cowlingOpen={cowlingOpen}
          explodeFactor={explodeFactor}
          throttlePct={throttlePct}
          bypassRatio={bypassRatio}
          showLabels
        />

        <ContactShadows
          position={[0, -2.5, 0]}
          opacity={0.45}
          scale={22}
          blur={2.4}
          far={6}
        />
      </Canvas>

      {/* ================================================================= */}
      {/* BOTTOM-LEFT NARRATIVE STAGE INSPECTOR + BOTTOM TIMELINE SCRUBBER  */}
      {/* ================================================================= */}
      <div
        style={{
          position: 'absolute',
          left: '16px',
          right: '16px',
          bottom: '14px',
          zIndex: 15,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          pointerEvents: 'none',
        }}
      >
        {/* Stage Caption & Thermodynamic Readout Card */}
        <div
          className="vg-glass"
          style={{
            borderLeft: `3px solid ${activeStage.phaseColor}`,
            padding: '10px 14px',
            maxWidth: '680px',
            pointerEvents: 'auto',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '12px',
              flexWrap: 'wrap',
              marginBottom: '4px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                className="mono"
                style={{
                  fontSize: '10px',
                  padding: '2px 8px',
                  borderRadius: '999px',
                  background: `${activeStage.phaseColor}22`,
                  color: activeStage.phaseColor,
                  border: `1px solid ${activeStage.phaseColor}66`,
                  fontWeight: 700,
                }}
              >
                {activeStage.phase} · {activeStage.code}
              </span>
              <strong style={{ fontSize: '13px', color: 'var(--glass-text)' }}>
                {tourPlaying ? currentTourSegment.title : activeStage.name}
              </strong>
            </div>
            <div className="mono" style={{ fontSize: '11px', color: 'var(--glass-muted)' }}>
              {activeStage.shaft} ·{' '}
              <span style={{ color: 'var(--accent-gold)', fontWeight: 600 }}>{activeStage.tempK} K</span> ·{' '}
              <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>PR {activeStage.pressureRatio}</span>
            </div>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--glass-text-soft)', lineHeight: 1.5, margin: 0 }}>
            {tourPlaying ? currentTourSegment.caption : activeStage.summary}
          </p>
        </div>

        {/* Guided Tour Scrubber Bar */}
        <div
          className="vg-glass"
          style={{
            padding: '8px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap',
            pointerEvents: 'auto',
          }}
        >
          <button
            type="button"
            onClick={() => {
              if (!tourPlaying && tourTime >= 27.9) {
                setTourTime(0);
              }
              setTourPlaying((p) => !p);
            }}
            className="btn btn-primary btn-sm"
            style={{ minWidth: '86px' }}
          >
            {tourPlaying ? '❚❚ Pause' : '▶ Play Tour'}
          </button>

          <span className="mono" style={{ fontSize: '11px', color: 'var(--glass-text)', minWidth: '88px', fontWeight: 600 }}>
            {tourTime.toFixed(1)}s / 28.0s
          </span>

          <div style={{ flex: 1, minWidth: '160px' }}>
            <input
              type="range"
              min="0"
              max="28"
              step="0.1"
              value={tourTime}
              onChange={(e) => {
                const t = Number(e.target.value);
                setTourTime(t);
                const seg =
                  TOUR_SEGMENTS.find((s) => t >= s.start && t <= s.end) || TOUR_SEGMENTS[0];
                setSelectedStageId(seg.stageId);
                setCowlingOpen(seg.cowlingOpen);
                setExplodeFactor(seg.explodeFactor);
              }}
            />
          </div>

          <button
            type="button"
            onClick={() => setFollowCamera((v) => !v)}
            className={`btn btn-sm ${followCamera ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '11px' }}
          >
            Follow camera: {followCamera ? 'ON' : 'OFF'}
          </button>

          <div style={{ display: 'flex', gap: '4px' }}>
            {[0.5, 1.0, 1.5].map((spd) => (
              <button
                key={spd}
                type="button"
                onClick={() => setPlaybackSpeed(spd)}
                className={`btn btn-sm ${
                  playbackSpeed === spd ? 'btn-primary' : 'btn-secondary'
                }`}
                style={{ padding: '0 10px', height: '28px', fontSize: '10px' }}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

