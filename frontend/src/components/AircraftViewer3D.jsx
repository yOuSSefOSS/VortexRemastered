import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html, Line } from '@react-three/drei';
import * as THREE from 'three';
import { computeNACA4Digit } from '../domain/nacaGeometry';

// ============================================================================
// High-Detail, Zero-Lag Parametric 3D Aircraft & 3D Turbofan Engine Assemblies
// - Instant Frame-1 GPU rendering (0ms network stall)
// - Every aerospace subsystem is a named, interactive, animated 3D mesh:
//   Fuselage (with internal frame cutaway), Swept Wings, Fowler Flaps,
//   Leading-Edge Slats, Differential Ailerons, Highlighted NACA Airfoil Rib,
//   Horizontal/Vertical Stabilizers, Elevator, Rudder, and 3D Turbofan Engine
// ============================================================================

const SUBSYSTEM_COLORS = {
  defaultMetal: '#CBD1D9',
  defaultDark: '#3C434E',
  fuselage: '#1F5BD8',
  wings: '#1F5BD8',
  airfoil: '#47CD89',
  tail: '#1F5BD8',
  engines: '#FDB022',
  highlight: '#7AA5FF',
};

function SmoothCameraRig({ targetPosition, targetLookAt, controlsRef }) {
  const { camera } = useThree();
  const desiredPos = useRef(new THREE.Vector3(...targetPosition));
  const desiredLook = useRef(new THREE.Vector3(...targetLookAt));
  const isTransitioning = useRef(false);
  const transitionFrames = useRef(0);

  useEffect(() => {
    desiredPos.current.set(...targetPosition);
    desiredLook.current.set(...targetLookAt);
    isTransitioning.current = true;
    transitionFrames.current = 0;
  }, [targetPosition, targetLookAt]);

  useFrame((_, delta) => {
    if (!isTransitioning.current) return;
    transitionFrames.current += 1;
    const step = Math.min(1, delta * 4.5);

    camera.position.lerp(desiredPos.current, step);
    if (controlsRef.current) {
      controlsRef.current.target.lerp(desiredLook.current, step);
      controlsRef.current.update();
    }

    if (
      camera.position.distanceTo(desiredPos.current) < 0.04 ||
      transitionFrames.current > 90
    ) {
      isTransitioning.current = false;
    }
  });

  return null;
}

/**
 * Extruded NACA 2412 Wing & Rib Geometry Builder with Proper GPU Disposal
 */
function useExtrudedAirfoilGeometry(chord = 1.4, span = 4.2, thicknessScale = 1.0) {
  const geometry = useMemo(() => {
    const pts = computeNACA4Digit(0.02, 0.4, 0.12 * thicknessScale, 36);
    const shape = new THREE.Shape();
    pts.forEach(([x, y], idx) => {
      const px = (0.5 - x) * chord;
      const py = y * chord;
      if (idx === 0) shape.moveTo(px, py);
      else shape.lineTo(px, py);
    });
    shape.closePath();

    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: span,
      bevelEnabled: false,
      steps: 1,
    });
    geo.computeVertexNormals();
    return geo;
  }, [chord, span, thicknessScale]);

  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  return geometry;
}

/**
 * Full 3D Articulated Commercial Airliner Assembly
 */
export function ArticulatedAircraftMesh({
  selectedZone = null,
  hoveredZone = null,
  onSelectZone,
  onHoverZone,
  cutaway = false,
  flapAngle = 0,
  slatExt = 0,
  aileronDeflection = 0,
  elevatorDeflection = 0,
  rudderDeflection = 0,
  pitchDeg = 0,
  rollDeg = 0,
  yawDeg = 0,
  aoaDeg = 4,
  throttlePct = 75,
  cgPositionPct = 26,
  neutralPointPct = 38,
  showForceVectors = true,
}) {
  const fanLeftRef = useRef();
  const fanRightRef = useRef();
  const wingGeo = useExtrudedAirfoilGeometry(1.35, 4.1, 1.0);
  const ribGeo = useExtrudedAirfoilGeometry(1.38, 0.08, 1.05);

  useFrame((_, delta) => {
    const omega = (throttlePct / 100) * 18;
    if (fanLeftRef.current) fanLeftRef.current.rotation.x += omega * delta;
    if (fanRightRef.current) fanRightRef.current.rotation.x += omega * delta;
  });

  const isZoneActive = (zone) => selectedZone === zone || hoveredZone === zone;

  const zoneMaterialProps = (zone, baseColor = '#D5DCE4', metalness = 0.45, roughness = 0.35) => {
    const active = isZoneActive(zone);
    return {
      color: active ? '#7AA5FF' : baseColor,
      emissive: active ? '#1F5BD8' : '#000000',
      emissiveIntensity: active ? 0.35 : 0,
      metalness,
      roughness,
    };
  };

  const bindZoneEvents = (zone) => ({
    onClick: (e) => {
      e.stopPropagation();
      if (onSelectZone) onSelectZone(zone);
    },
    onPointerOver: (e) => {
      e.stopPropagation();
      document.body.style.cursor = 'pointer';
      if (onHoverZone) onHoverZone(zone);
    },
    onPointerOut: (e) => {
      e.stopPropagation();
      document.body.style.cursor = 'auto';
      if (onHoverZone) onHoverZone(null);
    },
  });

  const flapRad = (flapAngle * Math.PI) / 180;
  const slatOffset = (slatExt / 100) * 0.16;
  const aileronRad = (aileronDeflection * Math.PI) / 180;
  const elevatorRad = (elevatorDeflection * Math.PI) / 180;
  const rudderRad = (rudderDeflection * Math.PI) / 180;

  const pitchRad = (pitchDeg * Math.PI) / 180;
  const rollRad = (rollDeg * Math.PI) / 180;
  const yawRad = (yawDeg * Math.PI) / 180;

  // Map % MAC (15%..50%) to X coordinate along fuselage
  const cgX = 0.65 - ((cgPositionPct - 25) / 25) * 0.85;
  const npX = 0.65 - ((neutralPointPct - 25) / 25) * 0.85;

  return (
    <group rotation={[rollRad, yawRad, pitchRad]}>
      {/* ── 1. FUSELAGE ASSEMBLY ── */}
      <group {...bindZoneEvents('fuselage')}>
        {/* Main Cylindrical Cabin Hull */}
        <mesh rotation={[0, 0, Math.PI / 2]} position={[0, 0, 0]}>
          <cylinderGeometry args={[0.56, 0.56, 5.2, 36, 1, false, 0, cutaway ? Math.PI * 1.35 : Math.PI * 2]} />
          <meshStandardMaterial
            {...zoneMaterialProps('fuselage', '#E2E6EB', 0.5, 0.3)}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Aerodynamic Nose Cone & Radome */}
        <mesh rotation={[0, 0, -Math.PI / 2]} position={[3.25, -0.04, 0]}>
          <coneGeometry args={[0.56, 1.35, 36]} />
          <meshStandardMaterial {...zoneMaterialProps('fuselage', '#CBD1D9', 0.45, 0.32)} />
        </mesh>

        {/* Cockpit Windscreen Visor */}
        <mesh position={[2.72, 0.26, 0]} rotation={[0, 0, -0.32]}>
          <boxGeometry args={[0.62, 0.24, 0.76]} />
          <meshStandardMaterial color="#171B22" metalness={0.8} roughness={0.15} />
        </mesh>

        {/* Tailcone Taper */}
        <mesh rotation={[0, 0, Math.PI / 2]} position={[-3.35, 0.08, 0]}>
          <cylinderGeometry args={[0.16, 0.56, 1.55, 32]} />
          <meshStandardMaterial {...zoneMaterialProps('fuselage', '#D5DCE4', 0.5, 0.3)} />
        </mesh>

        {/* Internal Structural Cutaway: Circumferential Frames, Passenger Floor & Aft Pressure Bulkhead */}
        {cutaway && (
          <group>
            {[-2.0, -1.2, -0.4, 0.4, 1.2, 2.0].map((xPos) => (
              <mesh key={xPos} position={[xPos, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
                <torusGeometry args={[0.53, 0.018, 12, 32]} />
                <meshStandardMaterial color="#7AA5FF" metalness={0.6} roughness={0.25} />
              </mesh>
            ))}
            {/* Cabin Deck Floor Beam Grid */}
            <mesh position={[0, -0.12, 0]}>
              <boxGeometry args={[5.0, 0.03, 0.98]} />
              <meshStandardMaterial color="#3C434E" metalness={0.5} roughness={0.4} />
            </mesh>
            {/* Aft Hemispherical Pressure Bulkhead */}
            <mesh position={[-2.55, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
              <sphereGeometry args={[0.54, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
              <meshStandardMaterial color="#FDB022" metalness={0.4} roughness={0.35} side={THREE.DoubleSide} />
            </mesh>
          </group>
        )}
      </group>

      {/* ── 2. SWEPT MAIN WINGS & HIGH-LIFT SYSTEM ── */}
      <group {...bindZoneEvents('wings')}>
        {/* Starboard (Right, +Z) Swept Wing */}
        <group position={[0.35, -0.14, 0.45]} rotation={[0.04, -0.36, 0]}>
          <mesh geometry={wingGeo}>
            <meshStandardMaterial {...zoneMaterialProps('wings', '#D8DFE8', 0.52, 0.3)} />
          </mesh>

          {/* Winglet (+Z tip) */}
          <mesh position={[-0.35, 0.28, 4.08]} rotation={[0.25, 0, -0.2]}>
            <boxGeometry args={[0.48, 0.58, 0.05]} />
            <meshStandardMaterial color="#1F5BD8" metalness={0.5} roughness={0.3} />
          </mesh>

          {/* Animated Leading-Edge Slat (+Z) */}
          <mesh position={[0.68 + slatOffset, -0.02 - slatOffset * 0.25, 2.0]}>
            <boxGeometry args={[0.16, 0.05, 3.2]} />
            <meshStandardMaterial color="#47CD89" metalness={0.5} roughness={0.3} />
          </mesh>

          {/* Animated Trailing-Edge Fowler Flap (+Z Inboard) */}
          <group position={[-0.65 - flapRad * 0.18, -0.03, 1.35]} rotation={[0, 0, flapRad]}>
            <mesh position={[-0.18, 0, 0]}>
              <boxGeometry args={[0.36, 0.04, 1.8]} />
              <meshStandardMaterial color="#7AA5FF" metalness={0.5} roughness={0.3} />
            </mesh>
          </group>

          {/* Animated Starboard Aileron (+Z Outboard) */}
          <group position={[-0.65, -0.02, 3.15]} rotation={[0, 0, aileronRad]}>
            <mesh position={[-0.14, 0, 0]}>
              <boxGeometry args={[0.28, 0.035, 1.25]} />
              <meshStandardMaterial color="#FDB022" metalness={0.5} roughness={0.3} />
            </mesh>
          </group>
        </group>

        {/* Port (Left, -Z) Swept Wing */}
        <group position={[0.35, -0.14, -0.45]} rotation={[-0.04, 0.36, 0]} scale={[1, 1, -1]}>
          <mesh geometry={wingGeo}>
            <meshStandardMaterial {...zoneMaterialProps('wings', '#D8DFE8', 0.52, 0.3)} />
          </mesh>

          {/* Winglet (-Z tip) */}
          <mesh position={[-0.35, 0.28, 4.08]} rotation={[0.25, 0, -0.2]}>
            <boxGeometry args={[0.48, 0.58, 0.05]} />
            <meshStandardMaterial color="#1F5BD8" metalness={0.5} roughness={0.3} />
          </mesh>

          {/* Animated Leading-Edge Slat (-Z) */}
          <mesh position={[0.68 + slatOffset, -0.02 - slatOffset * 0.25, 2.0]}>
            <boxGeometry args={[0.16, 0.05, 3.2]} />
            <meshStandardMaterial color="#47CD89" metalness={0.5} roughness={0.3} />
          </mesh>

          {/* Animated Trailing-Edge Fowler Flap (-Z Inboard) */}
          <group position={[-0.65 - flapRad * 0.18, -0.03, 1.35]} rotation={[0, 0, flapRad]}>
            <mesh position={[-0.18, 0, 0]}>
              <boxGeometry args={[0.36, 0.04, 1.8]} />
              <meshStandardMaterial color="#7AA5FF" metalness={0.5} roughness={0.3} />
            </mesh>
          </group>

          {/* Animated Port Aileron (-Z Outboard — Differential deflection) */}
          <group position={[-0.65, -0.02, 3.15]} rotation={[0, 0, -aileronRad]}>
            <mesh position={[-0.14, 0, 0]}>
              <boxGeometry args={[0.28, 0.035, 1.25]} />
              <meshStandardMaterial color="#FDB022" metalness={0.5} roughness={0.3} />
            </mesh>
          </group>
        </group>
      </group>

      {/* ── 3. HIGHLIGHTED NACA AIRFOIL RIB CROSS-SECTION SLICE ── */}
      <group
        position={[0.02, -0.08, 1.95]}
        rotation={[0.04, -0.36, (aoaDeg * Math.PI) / 180]}
        {...bindZoneEvents('airfoil')}
      >
        <mesh geometry={ribGeo}>
          <meshStandardMaterial
            color={isZoneActive('airfoil') ? '#47CD89' : '#1F5BD8'}
            emissive="#47CD89"
            emissiveIntensity={isZoneActive('airfoil') ? 0.55 : 0.22}
            metalness={0.3}
            roughness={0.2}
          />
        </mesh>
        {/* Chord Reference Line */}
        <Line
          points={[
            [-0.85, 0, 0.04],
            [0.85, 0, 0.04],
          ]}
          color="#FDB022"
          lineWidth={2}
        />
      </group>

      {/* ── 4. EMPENNAGE (TAIL STABILIZERS, ELEVATOR & RUDDER) ── */}
      <group {...bindZoneEvents('tail')}>
        {/* Vertical Stabilizer Fin */}
        <mesh position={[-3.35, 0.95, 0]} rotation={[0, 0, 0.42]}>
          <boxGeometry args={[1.15, 1.65, 0.08]} />
          <meshStandardMaterial {...zoneMaterialProps('tail', '#CBD1D9', 0.5, 0.3)} />
        </mesh>

        {/* Animated Rudder */}
        <group position={[-3.82, 0.95, 0]} rotation={[0, rudderRad, 0.42]}>
          <mesh position={[-0.18, 0, 0]}>
            <boxGeometry args={[0.36, 1.55, 0.06]} />
            <meshStandardMaterial color="#7AA5FF" metalness={0.5} roughness={0.3} />
          </mesh>
        </group>

        {/* Horizontal Stabilizer Tailplane */}
        <mesh position={[-3.45, 0.18, 0]} rotation={[0, 0, 0]}>
          <boxGeometry args={[0.85, 0.06, 2.95]} />
          <meshStandardMaterial {...zoneMaterialProps('tail', '#D5DCE4', 0.5, 0.3)} />
        </mesh>

        {/* Animated Elevators */}
        <group position={[-3.85, 0.18, 0]} rotation={[0, 0, elevatorRad]}>
          <mesh position={[-0.15, 0, 0]}>
            <boxGeometry args={[0.3, 0.045, 2.85]} />
            <meshStandardMaterial color="#47CD89" metalness={0.5} roughness={0.3} />
          </mesh>
        </group>
      </group>

      {/* ── 5. UNDER-WING HIGH-BYPASS TURBOFAN NACELLES ── */}
      <group {...bindZoneEvents('engines')}>
        {[1.55, -1.55].map((zSide, idx) => (
          <group key={zSide} position={[0.45, -0.56, zSide]}>
            {/* Pylon Strut */}
            <mesh position={[-0.1, 0.28, 0]} rotation={[0, 0, -0.25]}>
              <boxGeometry args={[0.65, 0.28, 0.08]} />
              <meshStandardMaterial color="#848D9A" metalness={0.5} roughness={0.4} />
            </mesh>
            {/* Outer Bypass Cowling */}
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.34, 0.3, 1.15, 28, 1, true]} />
              <meshStandardMaterial
                {...zoneMaterialProps('engines', '#E2E6EB', 0.6, 0.25)}
                side={THREE.DoubleSide}
              />
            </mesh>
            {/* Core Exhaust Cone */}
            <mesh rotation={[0, 0, Math.PI / 2]} position={[-0.55, 0, 0]}>
              <coneGeometry args={[0.2, 0.48, 24]} />
              <meshStandardMaterial color="#3C434E" metalness={0.7} roughness={0.3} />
            </mesh>
            {/* Rotating Front Fan Stage */}
            <group ref={idx === 0 ? fanRightRef : fanLeftRef} position={[0.48, 0, 0]}>
              <mesh rotation={[0, 0, Math.PI / 2]}>
                <coneGeometry args={[0.1, 0.22, 16]} />
                <meshStandardMaterial color="#171B22" />
              </mesh>
              {Array.from({ length: 12 }).map((_, bIdx) => (
                <mesh
                  key={bIdx}
                  rotation={[(bIdx * Math.PI) / 6, 0.35, 0]}
                >
                  <boxGeometry args={[0.02, 0.62, 0.07]} />
                  <meshStandardMaterial color="#7AA5FF" metalness={0.75} roughness={0.2} />
                </mesh>
              ))}
            </group>
          </group>
        ))}
      </group>

      {/* ── LIVE 3D FORCE VECTORS & CG / NP STABILITY MARKERS ── */}
      {showForceVectors && (
        <group>
          {/* Lift Vector (Upward from Center of Pressure) */}
          <Line
            points={[
              [npX, 0, 0],
              [npX, 1.85, 0],
            ]}
            color="#47CD89"
            lineWidth={2.5}
          />
          <mesh position={[npX, 1.92, 0]}>
            <coneGeometry args={[0.08, 0.22, 16]} />
            <meshBasicMaterial color="#47CD89" />
          </mesh>

          {/* Weight Vector (Downward from Center of Gravity) */}
          <Line
            points={[
              [cgX, 0, 0],
              [cgX, -1.65, 0],
            ]}
            color="#F97066"
            lineWidth={2.5}
          />
          <mesh position={[cgX, -1.72, 0]} rotation={[Math.PI, 0, 0]}>
            <coneGeometry args={[0.08, 0.22, 16]} />
            <meshBasicMaterial color="#F97066" />
          </mesh>

          {/* CG & NP Markers */}
          <mesh position={[cgX, 0.05, 0]}>
            <sphereGeometry args={[0.09, 16, 16]} />
            <meshBasicMaterial color="#7AA5FF" />
          </mesh>
          <mesh position={[npX, 0.05, 0]}>
            <sphereGeometry args={[0.08, 16, 16]} />
            <meshBasicMaterial color="#FDB022" />
          </mesh>
        </group>
      )}
    </group>
  );
}

/**
 * Full-Scale 3D Cutaway High-Bypass Turbofan Engine Assembly
 * Used in Hangar Engine Inspection & Cockpit Mode 3 (Propulsion Rig)
 */
export function CutawayTurbofanMesh({
  throttlePct = 80,
  bypassRatio = 8.5,
  egtCelsius = 680,
  cutaway = true,
}) {
  const n1SpoolRef = useRef();
  const n2SpoolRef = useRef();
  const particlesRef = useRef();

  const particlePositions = useMemo(() => {
    const count = 180;
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const s1 = ((i * 73 + 19) % 101) / 101;
      const s2 = ((i * 137 + 41) % 97) / 97;
      const s3 = ((i * 199 + 11) % 89) / 89;
      arr[i * 3] = (s1 - 0.5) * 4.8; // axial X
      const r = 0.28 + s2 * 0.92;
      const theta = s3 * Math.PI * 2;
      arr[i * 3 + 1] = r * Math.cos(theta);
      arr[i * 3 + 2] = r * Math.sin(theta);
    }
    return arr;
  }, []);

  useFrame((_, delta) => {
    const n1Speed = (0.25 + (throttlePct / 100) * 0.95) * 12;
    const n2Speed = n1Speed * 1.45;
    if (n1SpoolRef.current) n1SpoolRef.current.rotation.x += n1Speed * delta;
    if (n2SpoolRef.current) n2SpoolRef.current.rotation.x += n2Speed * delta;

    if (particlesRef.current) {
      const posAttr = particlesRef.current.geometry.attributes.position;
      const arr = posAttr.array;
      const flowSpeed = 3.2 + (throttlePct / 100) * 7.5;
      for (let i = 0; i < arr.length / 3; i++) {
        arr[i * 3] -= flowSpeed * delta;
        if (arr[i * 3] < -2.6) {
          arr[i * 3] = 2.4;
        }
      }
      posAttr.needsUpdate = true;
    }
  });

  const outerRadius = 1.15 + (bypassRatio - 6) * 0.03;
  const combustorColor = egtCelsius > 780 ? '#F97066' : egtCelsius > 620 ? '#FDB022' : '#7AA5FF';

  return (
    <group>
      {/* Outer Nacelle Cowling (Half-Cutaway when cutaway=true) */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry
          args={[
            outerRadius,
            outerRadius * 0.92,
            4.2,
            40,
            1,
            true,
            cutaway ? Math.PI * 0.15 : 0,
            cutaway ? Math.PI * 1.25 : Math.PI * 2,
          ]}
        />
        <meshStandardMaterial
          color="#CBD1D9"
          metalness={0.65}
          roughness={0.25}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Core Gas-Generator Casing */}
      <mesh rotation={[0, 0, Math.PI / 2]} position={[-0.25, 0, 0]}>
        <cylinderGeometry
          args={[
            0.52,
            0.42,
            3.1,
            32,
            1,
            true,
            cutaway ? Math.PI * 0.2 : 0,
            cutaway ? Math.PI * 1.2 : Math.PI * 2,
          ]}
        />
        <meshStandardMaterial
          color="#505864"
          metalness={0.7}
          roughness={0.3}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* N1 Low-Pressure Spool: Wide-Chord Titanium Fan + 3-Stage LPC + 4-Stage LPT */}
      <group ref={n1SpoolRef}>
        {/* Spinner Cone */}
        <mesh rotation={[0, 0, -Math.PI / 2]} position={[2.05, 0, 0]}>
          <coneGeometry args={[0.32, 0.7, 28]} />
          <meshStandardMaterial color="#171B22" metalness={0.6} roughness={0.2} />
        </mesh>

        {/* 22 Wide-Chord Fan Blades */}
        <group position={[1.65, 0, 0]}>
          {Array.from({ length: 22 }).map((_, idx) => (
            <mesh key={idx} rotation={[(idx * Math.PI * 2) / 22, 0.38, 0]}>
              <boxGeometry args={[0.035, outerRadius * 1.88, 0.16]} />
              <meshStandardMaterial color="#7AA5FF" metalness={0.8} roughness={0.18} />
            </mesh>
          ))}
        </group>

        {/* Low-Pressure Turbine (LPT) Stages at Rear */}
        {[-1.35, -1.58, -1.8].map((xPos, sIdx) => (
          <group key={xPos} position={[xPos, 0, 0]}>
            {Array.from({ length: 18 }).map((_, bIdx) => (
              <mesh key={bIdx} rotation={[(bIdx * Math.PI * 2) / 18 + sIdx * 0.2, -0.3, 0]}>
                <boxGeometry args={[0.025, 0.82 + sIdx * 0.05, 0.08]} />
                <meshStandardMaterial color="#A9B1BC" metalness={0.75} roughness={0.25} />
              </mesh>
            ))}
          </group>
        ))}
      </group>

      {/* N2 High-Pressure Spool: 5-Stage HPC + 2-Stage HPT */}
      <group ref={n2SpoolRef}>
        {[0.85, 0.62, 0.4, 0.18, -0.04].map((xPos, sIdx) => (
          <group key={xPos} position={[xPos, 0, 0]}>
            {Array.from({ length: 20 }).map((_, bIdx) => (
              <mesh key={bIdx} rotation={[(bIdx * Math.PI * 2) / 20 + sIdx * 0.15, 0.32, 0]}>
                <boxGeometry args={[0.022, 0.92 - sIdx * 0.04, 0.07]} />
                <meshStandardMaterial color="#D5DCE4" metalness={0.8} roughness={0.2} />
              </mesh>
            ))}
          </group>
        ))}

        {/* High-Pressure Turbine (HPT) Stages */}
        {[-0.88, -1.08].map((xPos) => (
          <group key={xPos} position={[xPos, 0, 0]}>
            {Array.from({ length: 18 }).map((_, bIdx) => (
              <mesh key={bIdx} rotation={[(bIdx * Math.PI * 2) / 18, -0.35, 0]}>
                <boxGeometry args={[0.025, 0.78, 0.08]} />
                <meshStandardMaterial color="#FDB022" metalness={0.7} roughness={0.25} />
              </mesh>
            ))}
          </group>
        ))}
      </group>

      {/* Annular Combustor Chamber (Thermal EGT state) */}
      <mesh rotation={[0, 0, Math.PI / 2]} position={[-0.46, 0, 0]}>
        <cylinderGeometry args={[0.44, 0.44, 0.56, 28]} />
        <meshStandardMaterial
          color={combustorColor}
          emissive={combustorColor}
          emissiveIntensity={0.45 + (throttlePct / 100) * 0.4}
          roughness={0.3}
        />
      </mesh>

      {/* Exhaust Tailcone */}
      <mesh rotation={[0, 0, Math.PI / 2]} position={[-2.25, 0, 0]}>
        <coneGeometry args={[0.34, 0.85, 28]} />
        <meshStandardMaterial color="#3C434E" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Bypass & Core Airflow Streamline Particles */}
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={particlePositions.length / 3}
            array={particlePositions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial color="#7AA5FF" size={0.045} transparent opacity={0.75} />
      </points>
    </group>
  );
}

/**
 * Main Hangar 3D Viewport Wrapper
 */
const CAMERA_PRESETS = {
  fuselage: { pos: [5.5, 2.2, 6.2], target: [0.6, 0.1, 0] },
  wings: { pos: [3.2, 3.8, 5.6], target: [-0.2, 0.0, 2.2] },
  airfoil: { pos: [1.8, 1.4, 4.2], target: [-0.2, 0.1, 2.4] },
  tail: { pos: [-5.8, 2.6, 4.4], target: [-3.4, 0.8, 0] },
  engines: { pos: [3.6, 0.8, 3.8], target: [0.4, -0.5, 1.85] },
};

export default function AircraftViewer3D({
  subject = 'aircraft', // 'aircraft' | 'turbofan' | 'engine'
  selectedZone = null,
  selectedSubsystem = null,
  hoveredZone: externalHoveredZone = null,
  onSelectZone,
  onSelectSubsystem,
  onHoverZone,
  cameraTarget,
  cameraPosition,
  aircraftState = {},
  rigState = {},
  showVectors = true,
}) {
  const controlsRef = useRef();
  const [internalHover, setInternalHover] = React.useState(null);

  const activeZone = selectedZone || selectedSubsystem || 'wings';
  const hoveredZone = externalHoveredZone ?? internalHover;
  const handleSelect = onSelectZone || onSelectSubsystem || (() => {});
  const handleHover = onHoverZone || setInternalHover;

  const isEngineView = subject === 'turbofan' || subject === 'engine';
  const preset = isEngineView
    ? { pos: [3.2, 1.6, 4.2], target: [-0.3, 0, 0] }
    : CAMERA_PRESETS[activeZone] || { pos: [5.8, 2.6, 6.4], target: [0, 0, 0] };

  const effectiveCamPos = cameraPosition || preset.pos;
  const effectiveCamTarget = cameraTarget || preset.target;

  const mergedState = {
    cutaway:
      rigState.cutawayRatio !== undefined
        ? rigState.cutawayRatio > 0.15
        : (aircraftState.cutaway ?? false),
    flapAngle: rigState.flapDeg ?? aircraftState.flapAngle ?? 0,
    slatExt:
      rigState.slatDeg !== undefined
        ? (rigState.slatDeg / 25) * 100
        : (aircraftState.slatExt ?? 0),
    aileronDeflection: rigState.aileronDeg ?? aircraftState.aileronDeflection ?? 0,
    elevatorDeflection: rigState.elevatorDeg ?? aircraftState.elevatorDeflection ?? 0,
    rudderDeflection: rigState.rudderDeg ?? aircraftState.rudderDeflection ?? 0,
    pitchDeg: rigState.aoaDeg ? (rigState.aoaDeg - 4) * 0.65 : (aircraftState.pitchDeg ?? 0),
    rollDeg: rigState.aileronDeg ? rigState.aileronDeg * 0.45 : (aircraftState.rollDeg ?? 0),
    yawDeg: rigState.rudderDeg ? rigState.rudderDeg * 0.35 : (aircraftState.yawDeg ?? 0),
    aoaDeg: rigState.aoaDeg ?? aircraftState.aoaDeg ?? 4,
    throttlePct: rigState.throttlePct ?? aircraftState.throttlePct ?? 75,
    bypassRatio: rigState.bypassRatio ?? aircraftState.bypassRatio ?? 8.5,
    cgPositionPct: rigState.cgPercentMac ?? aircraftState.cgPositionPct ?? 26,
    neutralPointPct: aircraftState.neutralPointPct ?? 34,
    showVectors: showVectors ?? aircraftState.showVectors ?? true,
  };

  return (
    <div
      style={{ width: '100%', height: '100%', position: 'relative', background: '#0F1217', overflow: 'hidden' }}
      className="relative w-full h-full bg-[#0F1217] select-none overflow-hidden"
    >
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: effectiveCamPos, fov: 42, near: 0.1, far: 100 }}
        gl={{ powerPreference: 'high-performance', antialias: true }}
      >
        <color attach="background" args={['#0F1217']} />
        <ambientLight intensity={0.85} />
        <directionalLight position={[8, 12, 8]} intensity={1.45} />
        <directionalLight position={[-8, -4, -6]} intensity={0.55} color="#7AA5FF" />

        {/* Subtle Reference Hangar Floor Grid */}
        <gridHelper args={[24, 24, '#292F38', '#171B22']} position={[0, -1.85, 0]} />

        {isEngineView ? (
          <CutawayTurbofanMesh
            throttlePct={mergedState.throttlePct}
            bypassRatio={mergedState.bypassRatio}
            egtCelsius={420 + mergedState.throttlePct * 4.8}
            cutaway={mergedState.cutaway ?? true}
          />
        ) : (
          <ArticulatedAircraftMesh
            selectedZone={activeZone}
            hoveredZone={hoveredZone}
            onSelectZone={handleSelect}
            onHoverZone={handleHover}
            cutaway={mergedState.cutaway}
            flapAngle={mergedState.flapAngle}
            slatExt={mergedState.slatExt}
            aileronDeflection={mergedState.aileronDeflection}
            elevatorDeflection={mergedState.elevatorDeflection}
            rudderDeflection={mergedState.rudderDeflection}
            pitchDeg={mergedState.pitchDeg}
            rollDeg={mergedState.rollDeg}
            yawDeg={mergedState.yawDeg}
            aoaDeg={mergedState.aoaDeg}
            throttlePct={mergedState.throttlePct}
            cgPositionPct={mergedState.cgPositionPct}
            neutralPointPct={mergedState.neutralPointPct}
            showForceVectors={mergedState.showVectors}
          />
        )}

        <OrbitControls
          ref={controlsRef}
          enableDamping
          dampingFactor={0.08}
          minDistance={2.0}
          maxDistance={16.0}
        />

        <SmoothCameraRig
          targetPosition={effectiveCamPos}
          targetLookAt={effectiveCamTarget}
          controlsRef={controlsRef}
        />
      </Canvas>
    </div>
  );
}
