import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Line } from '@react-three/drei';
import * as THREE from 'three';
import { computeNACA4Digit } from '../domain/nacaGeometry';

// ============================================================================
// Cohesive, Sculpted 3D Widebody Airliner & 3D Cutaway Turbofan Assemblies
// - Continuous lofted aerodynamic surfaces (zero primitive cone+box+cylinder seams)
// - Every aerospace subsystem is a named, interactive, animated 3D mesh:
//   Fuselage (with internal frame cutaway), Tapered Swept Supercritical Wings
//   with Blended Winglets, Fowler Flaps, Leading-Edge Slats, Differential Ailerons,
//   Highlighted NACA Airfoil Rib, Swept Airfoil Empennage, and Contoured Turbofans.
// ============================================================================

function SmoothCameraRig({ targetPosition, targetLookAt, activeZone, controlsRef, isTransitioningRef }) {
  const { camera } = useThree();
  const desiredPos = useRef(new THREE.Vector3(...targetPosition));
  const desiredLook = useRef(new THREE.Vector3(...targetLookAt));
  const transitionFrames = useRef(0);

  useEffect(() => {
    if (!activeZone) {
      isTransitioningRef.current = false;
      return;
    }
    desiredPos.current.set(...targetPosition);
    desiredLook.current.set(...targetLookAt);
    isTransitioningRef.current = true;
    transitionFrames.current = 0;
  }, [activeZone, targetPosition, targetLookAt, isTransitioningRef]);

  useFrame((_, delta) => {
    if (!isTransitioningRef.current) return;
    transitionFrames.current += 1;
    const step = Math.min(1, delta * 4.5);

    camera.position.lerp(desiredPos.current, step);
    if (controlsRef.current) {
      controlsRef.current.target.lerp(desiredLook.current, step);
      controlsRef.current.update();
    }

    if (
      camera.position.distanceTo(desiredPos.current) < 0.05 ||
      transitionFrames.current > 65
    ) {
      isTransitioningRef.current = false;
    }
  });

  return null;
}

/**
 * Helper to build a continuous lofted BufferGeometry from cross-sectional stations
 */
function buildLoftedGeometry(stations, segs = 40, openEnded = false) {
  const numStations = stations.length;
  const positions = [];
  const uvs = [];
  const indices = [];

  for (let i = 0; i < numStations; i++) {
    const v = i / (numStations - 1);
    const ring = stations[i];
    for (let j = 0; j <= segs; j++) {
      const u = j / segs;
      const pt = openEnded ? ring[Math.min(j, ring.length - 1)] : ring[j % segs];
      positions.push(pt[0], pt[1], pt[2]);
      uvs.push(u, v);
    }
  }

  const ringVerts = segs + 1;
  for (let i = 0; i < numStations - 1; i++) {
    for (let j = 0; j < segs; j++) {
      const a = i * ringVerts + j;
      const b = (i + 1) * ringVerts + j;
      const c = (i + 1) * ringVerts + (j + 1);
      const d = i * ringVerts + (j + 1);
      indices.push(a, b, d);
      indices.push(b, c, d);
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
 * Generates an airfoil cross-section ring at a given spanwise station
 */
function makeAirfoilStation({
  xLead,
  yHeight,
  zSpan,
  chord,
  thicknessRatio = 0.11,
  camberRatio = 0.022,
  twistRad = 0,
  cantRad = 0,
  segs = 36,
}) {
  const ring = [];
  const maxT = chord * thicknessRatio;
  const maxC = chord * camberRatio;
  const cosT = Math.cos(twistRad);
  const sinT = Math.sin(twistRad);
  const cosC = Math.cos(cantRad);
  const sinC = Math.sin(cantRad);

  for (let j = 0; j < segs; j++) {
    const theta = (j / segs) * Math.PI * 2;
    const xc = 0.5 * (1 - Math.cos(theta)); // 0 at leading edge, 1 at trailing edge
    const yt =
      5 *
      maxT *
      (0.2969 * Math.sqrt(Math.max(0.0001, xc)) -
        0.126 * xc -
        0.3516 * xc * xc +
        0.2843 * xc * xc * xc -
        0.1015 * xc * xc * xc * xc);
    const yc = maxC * Math.sin(Math.PI * Math.pow(xc, 0.85));
    // Aircraft faces +X: leading edge is at xLead, trailing edge extends toward -X
    const localX = -xc * chord;
    const localY = theta < Math.PI ? yc + yt : yc - yt * 0.78;

    const rx = localX * cosT - localY * sinT;
    const ry = localX * sinT + localY * cosT;

    const finalY = yHeight + ry * cosC;
    const finalZ = zSpan + ry * sinC;
    ring.push([xLead + rx, finalY, finalZ]);
  }
  return ring;
}

/**
 * Extruded NACA 2412 Rib Geometry Builder for the highlighted aerodynamic chord slice
 */
function useExtrudedRibGeometry(chord = 1.48, span = 0.07, thicknessScale = 1.05) {
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
 * Full 3D Articulated Modern Widebody Airliner Assembly (787 / A350 Class)
 */
export function ArticulatedAircraftMesh({
  selectedZone = null,
  hoveredZone = null,
  onSelectZone,
  onHoverZone,
  cutaway = false,
  wireframe = false,
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
  const ribGeo = useExtrudedRibGeometry(1.36, 0.06, 1.08);

  // Build cohesive sculpted fuselage, wings, tail surfaces, and nacelles
  const {
    fuselageGeo,
    windscreenGeo,
    cheatlineGeo,
    stbdWingGeo,
    portWingGeo,
    vTailGeo,
    rudderGeo,
    stbdHTailGeo,
    portHTailGeo,
    nacelleGeo,
    pylonGeo,
  } = useMemo(() => {
    const segs = 44;
    const xStations = [
      4.15, 4.08, 3.92, 3.7, 3.42, 3.1, 2.75, 2.35, 1.9, 1.4, 0.9, 0.4, -0.1, -0.6,
      -1.1, -1.6, -2.05, -2.5, -2.95, -3.4, -3.85, -4.15, -4.3,
    ];

    const buildFuselageStations = (isCutaway) => {
      return xStations.map((x) => {
        let rx = 0.6;
        let ryTop = 0.62;
        let ryBot = 0.58;
        let yCenter = 0.0;
        let bellyBulge = 0.0;

        if (x > 2.35) {
          // Smooth Sears-Haack / 787-style drooped nose & streamlined cockpit brow
          const u = (4.15 - x) / (4.15 - 2.35); // 0 at tip, 1 at cabin join
          const profile = Math.pow(Math.max(0.001, Math.sin(u * Math.PI * 0.5)), 0.72);
          rx = 0.02 + 0.58 * profile;
          ryTop = 0.02 + 0.6 * Math.pow(profile, 0.92);
          ryBot = 0.02 + 0.56 * profile;
          // Nose droops downward toward tip
          yCenter = -0.16 * Math.pow(1 - u, 1.55);
        } else if (x >= -1.85) {
          // Main widebody cabin + aerodynamic wing-body belly fairing (-0.95 <= x <= 1.25)
          if (x >= -1.05 && x <= 1.35) {
            const wPhase = (x - -1.05) / 2.4;
            bellyBulge = 0.11 * Math.sin(wPhase * Math.PI);
          }
        } else {
          // Upswept aerodynamic tailcone to APU exhaust tip
          const u = (x - -1.85) / (-4.3 - -1.85); // 0 at rear cabin, 1 at tailcone tip
          const taper = Math.max(0.06, Math.cos(u * Math.PI * 0.47));
          rx = 0.6 * taper;
          ryTop = 0.62 * taper;
          ryBot = 0.58 * Math.pow(taper, 1.15);
          // Upswept lower tailcone line
          yCenter = 0.16 * Math.pow(u, 1.4);
        }

        const ring = [];
        const maxAngle = isCutaway && x > -2.2 && x < 2.1 ? Math.PI * 1.38 : Math.PI * 2;
        for (let j = 0; j <= segs; j++) {
          const frac = j / segs;
          const theta = frac * maxAngle;
          // theta = 0 is top (+Y), PI/2 is +Z, PI is bottom (-Y), 3PI/2 is -Z
          const cosA = Math.cos(theta);
          const sinA = Math.sin(theta);
          let y = yCenter + (cosA >= 0 ? cosA * ryTop : cosA * ryBot);
          let z = sinA * rx;

          // Wing-root belly fairing widens lower fuselage smoothly
          if (bellyBulge > 0 && cosA < -0.15) {
            const bFactor = Math.pow(Math.abs(cosA + 0.15) / 0.85, 1.2);
            z += Math.sign(sinA) * bellyBulge * bFactor * 0.95;
            y -= bellyBulge * bFactor * 0.45;
          }
          ring.push([x, y, z]);
        }
        return ring;
      });
    };

    const fGeo = buildLoftedGeometry(buildFuselageStations(cutaway), segs, true);

    // Conformal Wrap-Around Cockpit Windscreen (Flush 6-pane visor on nose contour)
    const wsStations = [3.48, 3.25, 3.0, 2.75].map((x, idx) => {
      const u = (4.15 - x) / (4.15 - 2.35);
      const profile = Math.pow(Math.sin(u * Math.PI * 0.5), 0.72);
      const rx = (0.02 + 0.58 * profile) * 1.012;
      const ryTop = (0.02 + 0.6 * Math.pow(profile, 0.92)) * 1.012;
      const yCenter = -0.16 * Math.pow(1 - u, 1.55);
      const spanAngle = 0.42 + idx * 0.14;
      const ring = [];
      const wSegs = 20;
      for (let j = 0; j <= wSegs; j++) {
        const a = -spanAngle + (j / wSegs) * (spanAngle * 2);
        const y = yCenter + Math.cos(a) * ryTop * 0.92;
        const z = Math.sin(a) * rx;
        ring.push([x, y, z]);
      }
      return ring;
    });
    const wScreenGeo = buildLoftedGeometry(wsStations, 20, true);

    // Conformal Livery Cheatline Ribbon along both sides of the fuselage
    const clStations = xStations.slice(3, 20).map((x) => {
      const u = x > 2.35 ? (4.15 - x) / 1.8 : x < -1.85 ? (-4.3 - x) / -2.45 : 1;
      const rx = 0.606 * Math.min(1, Math.pow(Math.max(0.1, u), 0.65));
      return [
        [x, 0.08, rx],
        [x, -0.02, rx],
        [x, -0.02, -rx],
        [x, 0.08, -rx],
      ];
    });
    const cLineGeo = buildLoftedGeometry(clStations, 3, true);

    // True 3D Tapered Swept Supercritical Wing + Blended Raked Winglet (Starboard +Z)
    const wingSpanStations = [
      { z: 0.48, xLead: 1.25, y: -0.18, chord: 1.98, t: 0.125, c: 0.026, twist: 0.035, cant: 0 },
      { z: 1.25, xLead: 0.88, y: -0.11, chord: 1.58, t: 0.115, c: 0.024, twist: 0.025, cant: 0 },
      { z: 2.35, xLead: 0.25, y: 0.0, chord: 1.18, t: 0.105, c: 0.02, twist: 0.01, cant: 0 },
      { z: 3.45, xLead: -0.38, y: 0.12, chord: 0.84, t: 0.095, c: 0.016, twist: -0.01, cant: 0 },
      { z: 4.35, xLead: -0.92, y: 0.23, chord: 0.56, t: 0.088, c: 0.012, twist: -0.02, cant: 0.15 },
      // Blended Raked Winglet curving smoothly upward
      { z: 4.65, xLead: -1.18, y: 0.44, chord: 0.42, t: 0.08, c: 0.008, twist: -0.025, cant: 0.65 },
      { z: 4.82, xLead: -1.42, y: 0.76, chord: 0.26, t: 0.075, c: 0.005, twist: -0.03, cant: 1.05 },
    ];

    const stbdStations = wingSpanStations.map((s) =>
      makeAirfoilStation({
        xLead: s.xLead,
        yHeight: s.y,
        zSpan: s.z,
        chord: s.chord,
        thicknessRatio: s.t,
        camberRatio: s.c,
        twistRad: s.twist,
        cantRad: s.cant,
      })
    );
    const sWingGeo = buildLoftedGeometry(stbdStations, 36);

    const portStations = wingSpanStations.map((s) =>
      makeAirfoilStation({
        xLead: s.xLead,
        yHeight: s.y,
        zSpan: -s.z,
        chord: s.chord,
        thicknessRatio: s.t,
        camberRatio: s.c,
        twistRad: s.twist,
        cantRad: -s.cant,
      }).reverse()
    );
    const pWingGeo = buildLoftedGeometry(portStations, 36);

    // Swept Tapered Airfoil Vertical Stabilizer
    const vTailSpan = [
      { y: 0.35, xLead: -2.25, chord: 1.65, t: 0.1 },
      { y: 0.85, xLead: -2.72, chord: 1.28, t: 0.095 },
      { y: 1.45, xLead: -3.25, chord: 0.92, t: 0.09 },
      { y: 2.02, xLead: -3.72, chord: 0.58, t: 0.085 },
    ];
    const vtStations = vTailSpan.map((s) =>
      makeAirfoilStation({
        xLead: s.xLead,
        yHeight: s.y,
        zSpan: 0,
        chord: s.chord,
        thicknessRatio: s.t,
        camberRatio: 0,
        cantRad: Math.PI / 2,
      })
    );
    const vtGeo = buildLoftedGeometry(vtStations, 36);

    // Tapered Airfoil Rudder
    const rudSpan = [
      { y: 0.42, xLead: 0.0, chord: 0.42, t: 0.09 },
      { y: 1.98, xLead: -0.45, chord: 0.24, t: 0.08 },
    ];
    const rGeo = buildLoftedGeometry(
      rudSpan.map((s) =>
        makeAirfoilStation({
          xLead: s.xLead,
          yHeight: s.y - 1.15,
          zSpan: 0,
          chord: s.chord,
          thicknessRatio: s.t,
          camberRatio: 0,
          cantRad: Math.PI / 2,
        })
      ),
      28
    );

    // Swept Tapered Horizontal Stabilizers (Starboard & Port)
    const hTailSpan = [
      { z: 0.18, xLead: -2.95, y: 0.18, chord: 1.05, t: 0.095 },
      { z: 0.95, xLead: -3.38, y: 0.26, chord: 0.76, t: 0.088 },
      { z: 1.72, xLead: -3.82, y: 0.35, chord: 0.44, t: 0.08 },
    ];
    const shGeo = buildLoftedGeometry(
      hTailSpan.map((s) =>
        makeAirfoilStation({
          xLead: s.xLead,
          yHeight: s.y,
          zSpan: s.z,
          chord: s.chord,
          thicknessRatio: s.t,
          camberRatio: -0.01,
        })
      ),
      32
    );
    const phGeo = buildLoftedGeometry(
      hTailSpan.map((s) =>
        makeAirfoilStation({
          xLead: s.xLead,
          yHeight: s.y,
          zSpan: -s.z,
          chord: s.chord,
          thicknessRatio: s.t,
          camberRatio: -0.01,
        }).reverse()
      ),
      32
    );

    // Barrel-Profiled High-Bypass Turbofan Nacelle Cowling (LatheGeometry)
    const nacPts = [];
    for (let i = 0; i <= 24; i++) {
      const u = i / 24; // 0 = inlet lip, 1 = aft bypass exit
      const r = 0.33 + 0.045 * Math.sin(u * Math.PI) - 0.05 * Math.pow(u, 1.5);
      const y = (0.5 - u) * 1.18;
      nacPts.push(new THREE.Vector2(r, y));
    }
    const nGeo = new THREE.LatheGeometry(nacPts, 36);
    nGeo.rotateZ(Math.PI / 2);

    // Streamlined Airfoil Engine Pylon
    const pylStations = [
      makeAirfoilStation({
        xLead: 0.42,
        yHeight: 0.34,
        zSpan: 0,
        chord: 0.92,
        thicknessRatio: 0.09,
        camberRatio: 0,
        cantRad: Math.PI / 2,
      }),
      makeAirfoilStation({
        xLead: 0.56,
        yHeight: 0.14,
        zSpan: 0,
        chord: 0.82,
        thicknessRatio: 0.085,
        camberRatio: 0,
        cantRad: Math.PI / 2,
      }),
    ];
    const pylGeo = buildLoftedGeometry(pylStations, 24);

    return {
      fuselageGeo: fGeo,
      windscreenGeo: wScreenGeo,
      cheatlineGeo: cLineGeo,
      stbdWingGeo: sWingGeo,
      portWingGeo: pWingGeo,
      vTailGeo: vtGeo,
      rudderGeo: rGeo,
      stbdHTailGeo: shGeo,
      portHTailGeo: phGeo,
      nacelleGeo: nGeo,
      pylonGeo: pylGeo,
    };
  }, [cutaway]);

  useFrame((_, delta) => {
    const omega = (throttlePct / 100) * 18;
    if (fanLeftRef.current) fanLeftRef.current.rotation.x += omega * delta;
    if (fanRightRef.current) fanRightRef.current.rotation.x += omega * delta;
  });

  const isZoneActive = (zone) => selectedZone === zone || hoveredZone === zone;

  const zoneMaterialProps = (zone, baseColor = '#E2E8F0', metalness = 0.52, roughness = 0.28) => {
    const active = isZoneActive(zone);
    if (wireframe) {
      return {
        color: active ? '#93C5FD' : '#3B82F6',
        emissive: active ? '#2563EB' : '#1E3A8A',
        emissiveIntensity: active ? 0.65 : 0.28,
        wireframe: true,
        metalness: 0.2,
        roughness: 0.4,
      };
    }
    return {
      color: active ? '#7AA5FF' : baseColor,
      emissive: active ? '#1F5BD8' : '#000000',
      emissiveIntensity: active ? 0.32 : 0,
      metalness,
      roughness,
    };
  };

  const bindZoneEvents = (zone) => ({
    onClick: (e) => {
      e.stopPropagation();
      if (onSelectZone) onSelectZone(selectedZone === zone ? null : zone);
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
  const slatOffset = (slatExt / 100) * 0.14;
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
      {/* ── 1. CONTINUOUS SCULPTED WIDEBODY FUSELAGE ASSEMBLY ── */}
      <group {...bindZoneEvents('fuselage')}>
        {/* Lofted Nose-to-Tailcone Widebody Hull with Integrated Wing-Body Belly Fairing */}
        <mesh geometry={fuselageGeo}>
          <meshStandardMaterial
            {...zoneMaterialProps('fuselage', '#E8EEF5', 0.55, 0.26)}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Flush Wrap-Around Curved Cockpit Windscreen */}
        <mesh geometry={windscreenGeo}>
          <meshPhysicalMaterial
            color="#0F172A"
            metalness={0.2}
            roughness={0.08}
            clearcoat={1}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Conformal Airline Cheatline Stripe */}
        {!wireframe && (
          <mesh geometry={cheatlineGeo}>
            <meshStandardMaterial
              color="#0284C7"
              metalness={0.65}
              roughness={0.25}
              side={THREE.DoubleSide}
            />
          </mesh>
        )}

        {/* Nose Radome Weather Bulkhead Ring */}
        <mesh position={[3.68, -0.05, 0]} rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[0.31, 0.008, 12, 36]} />
          <meshStandardMaterial color="#64748B" metalness={0.8} roughness={0.25} />
        </mesh>

        {/* Illuminated Passenger Cabin Windows (Port & Starboard Beltline) */}
        {!cutaway &&
          Array.from({ length: 18 }).map((_, idx) => {
            const xWin = 2.05 - idx * 0.22;
            return (
              <React.Fragment key={idx}>
                <mesh position={[xWin, 0.16, 0.585]}>
                  <sphereGeometry args={[0.024, 10, 10]} />
                  <meshStandardMaterial
                    color="#38BDF8"
                    emissive="#38BDF8"
                    emissiveIntensity={0.35}
                  />
                </mesh>
                <mesh position={[xWin, 0.16, -0.585]}>
                  <sphereGeometry args={[0.024, 10, 10]} />
                  <meshStandardMaterial
                    color="#38BDF8"
                    emissive="#38BDF8"
                    emissiveIntensity={0.35}
                  />
                </mesh>
              </React.Fragment>
            );
          })}

        {/* Internal Structural Cutaway: Circumferential Frames, Passenger Floor & Aft Pressure Bulkhead */}
        {cutaway && (
          <group>
            {[-2.0, -1.35, -0.7, -0.05, 0.6, 1.25, 1.9].map((xPos) => (
              <mesh key={xPos} position={[xPos, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
                <torusGeometry args={[0.56, 0.018, 12, 36]} />
                <meshStandardMaterial color="#7AA5FF" metalness={0.65} roughness={0.25} />
              </mesh>
            ))}
            {/* Cabin Deck Floor Beam Grid */}
            <mesh position={[0, -0.1, 0]}>
              <boxGeometry args={[4.2, 0.03, 1.06]} />
              <meshStandardMaterial color="#334155" metalness={0.55} roughness={0.38} />
            </mesh>
            {/* Aft Hemispherical Pressure Bulkhead */}
            <mesh position={[-2.2, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
              <sphereGeometry args={[0.56, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
              <meshStandardMaterial
                color="#FDB022"
                metalness={0.45}
                roughness={0.32}
                side={THREE.DoubleSide}
              />
            </mesh>
          </group>
        )}
      </group>

      {/* ── 2. TAPERED SWEPT SUPERCRITICAL WINGS & HIGH-LIFT SYSTEM ── */}
      <group {...bindZoneEvents('wings')}>
        {/* Starboard (+Z) Tapered Swept Wing with Blended Raked Winglet */}
        <mesh geometry={stbdWingGeo}>
          <meshStandardMaterial
            {...zoneMaterialProps('wings', '#DCE4EE', 0.56, 0.26)}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Port (-Z) Tapered Swept Wing with Blended Raked Winglet */}
        <mesh geometry={portWingGeo}>
          <meshStandardMaterial
            {...zoneMaterialProps('wings', '#DCE4EE', 0.56, 0.26)}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Articulated High-Lift Surfaces (Starboard +Z & Port -Z) */}
        {[1, -1].map((side) => (
          <group key={side}>
            {/* Leading-Edge Slat (Swept along leading edge) */}
            <group
              position={[
                0.35 + slatOffset,
                -0.02 - slatOffset * 0.22,
                side * 2.45,
              ]}
              rotation={[side * 0.045, side * -0.52, 0]}
            >
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <capsuleGeometry args={[0.032, 2.85, 8, 16]} />
                <meshStandardMaterial color="#47CD89" metalness={0.6} roughness={0.28} />
              </mesh>
            </group>

            {/* Inboard Trailing-Edge Fowler Flap */}
            <group
              position={[-0.72 - flapRad * 0.16, -0.1, side * 1.45]}
              rotation={[side * 0.04, side * -0.34, flapRad]}
            >
              <mesh position={[-0.16, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <capsuleGeometry args={[0.028, 1.55, 8, 16]} />
                <meshStandardMaterial color="#7AA5FF" metalness={0.6} roughness={0.28} />
              </mesh>
            </group>

            {/* Outboard Differential Aileron */}
            <group
              position={[-1.12, 0.08, side * 3.35]}
              rotation={[side * 0.04, side * -0.44, side * aileronRad]}
            >
              <mesh position={[-0.12, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <capsuleGeometry args={[0.022, 1.15, 8, 16]} />
                <meshStandardMaterial color="#FDB022" metalness={0.6} roughness={0.28} />
              </mesh>
            </group>
          </group>
        ))}
      </group>

      {/* ── 3. HIGHLIGHTED NACA AIRFOIL RIB CROSS-SECTION SLICE ── */}
      <group
        position={[0.12, -0.05, 1.85]}
        rotation={[0.04, -0.36, (aoaDeg * Math.PI) / 180]}
        {...bindZoneEvents('airfoil')}
      >
        <mesh geometry={ribGeo}>
          <meshStandardMaterial
            color={isZoneActive('airfoil') ? '#47CD89' : '#1F5BD8'}
            emissive="#47CD89"
            emissiveIntensity={isZoneActive('airfoil') ? 0.55 : 0.24}
            metalness={0.35}
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

      {/* ── 4. SWEPT AIRFOIL EMPENNAGE (VERTICAL FIN, RUDDER, TAILPLANES & ELEVATORS) ── */}
      <group {...bindZoneEvents('tail')}>
        {/* Tapered Swept Airfoil Vertical Stabilizer */}
        <mesh geometry={vTailGeo}>
          <meshStandardMaterial
            {...zoneMaterialProps('tail', '#CBD5E1', 0.55, 0.28)}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Articulated Tapered Airfoil Rudder */}
        <group position={[-3.72, 1.18, 0]} rotation={[0, rudderRad, 0]}>
          <mesh geometry={rudderGeo}>
            <meshStandardMaterial
              color="#7AA5FF"
              metalness={0.55}
              roughness={0.28}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>

        {/* Starboard & Port Tapered Swept Horizontal Stabilizers */}
        <mesh geometry={stbdHTailGeo}>
          <meshStandardMaterial
            {...zoneMaterialProps('tail', '#D5DCE4', 0.55, 0.28)}
            side={THREE.DoubleSide}
          />
        </mesh>
        <mesh geometry={portHTailGeo}>
          <meshStandardMaterial
            {...zoneMaterialProps('tail', '#D5DCE4', 0.55, 0.28)}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Articulated Swept Elevators */}
        {[1, -1].map((side) => (
          <group
            key={side}
            position={[-3.95, 0.26, side * 0.95]}
            rotation={[0, side * -0.42, elevatorRad]}
          >
            <mesh position={[-0.1, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <capsuleGeometry args={[0.022, 1.35, 8, 16]} />
              <meshStandardMaterial color="#47CD89" metalness={0.55} roughness={0.28} />
            </mesh>
          </group>
        ))}
      </group>

      {/* ── 5. BARREL-CONTOURED UNDER-WING HIGH-BYPASS TURBOFAN NACELLES ── */}
      <group {...bindZoneEvents('engines')}>
        {[1.52, -1.52].map((zSide, idx) => (
          <group key={zSide} position={[0.52, -0.48, zSide]}>
            {/* Streamlined Airfoil Engine Pylon */}
            <mesh geometry={pylonGeo}>
              <meshStandardMaterial
                color="#94A3B8"
                metalness={0.62}
                roughness={0.3}
                side={THREE.DoubleSide}
              />
            </mesh>
            {/* Barrel-Contoured Outer Bypass Nacelle */}
            <mesh geometry={nacelleGeo}>
              <meshStandardMaterial
                {...zoneMaterialProps('engines', '#E2E8F0', 0.65, 0.22)}
                side={THREE.DoubleSide}
              />
            </mesh>
            {/* Polished Chrome Acoustic Inlet Lip */}
            <mesh position={[0.59, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
              <torusGeometry args={[0.33, 0.032, 20, 48]} />
              <meshStandardMaterial color="#F8FAFC" metalness={0.95} roughness={0.1} />
            </mesh>
            {/* Core Exhaust Nozzle & Acoustic Tailcone */}
            <mesh rotation={[0, 0, Math.PI / 2]} position={[-0.64, 0, 0]}>
              <cylinderGeometry args={[0.18, 0.25, 0.36, 28, 1, true]} />
              <meshStandardMaterial
                color="#475569"
                metalness={0.78}
                roughness={0.26}
                side={THREE.DoubleSide}
              />
            </mesh>
            <mesh rotation={[0, 0, Math.PI / 2]} position={[-0.82, 0, 0]}>
              <coneGeometry args={[0.16, 0.42, 24]} />
              <meshStandardMaterial color="#1E293B" metalness={0.8} roughness={0.25} />
            </mesh>
            {/* Rotating 20-Blade Wide-Chord Front Titanium Fan Stage */}
            <group ref={idx === 0 ? fanRightRef : fanLeftRef} position={[0.42, 0, 0]}>
              <mesh rotation={[0, 0, -Math.PI / 2]} position={[0.1, 0, 0]}>
                <coneGeometry args={[0.1, 0.24, 24]} />
                <meshStandardMaterial color="#0F172A" metalness={0.7} roughness={0.25} />
              </mesh>
              {Array.from({ length: 20 }).map((_, bIdx) => (
                <mesh
                  key={bIdx}
                  rotation={[(bIdx * Math.PI * 2) / 20, 0.42, 0]}
                >
                  <boxGeometry args={[0.018, 0.62, 0.065]} />
                  <meshStandardMaterial color="#38BDF8" metalness={0.82} roughness={0.18} />
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
  wireframe = false,
  autoRotate = false,
  autoRotateSpeed = 0.55,
}) {
  const controlsRef = useRef();
  const isTransitioningRef = useRef(false);
  const [internalHover, setInternalHover] = React.useState(null);

  const activeZone =
    selectedZone !== null
      ? selectedZone
      : selectedSubsystem !== undefined
      ? selectedSubsystem
      : null;
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
    wireframe: wireframe || Boolean(rigState.wireframe),
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
      style={{ width: '100%', height: '100%', position: 'relative', background: 'var(--scene-bg)', overflow: 'hidden' }}
      className="relative w-full h-full select-none overflow-hidden"
    >
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: effectiveCamPos, fov: 42, near: 0.1, far: 100 }}
        gl={{ powerPreference: 'high-performance', antialias: true }}
        onPointerMissed={() => {
          isTransitioningRef.current = false;
          handleSelect(null);
        }}
      >
        <ambientLight intensity={0.95} />
        <directionalLight position={[8, 12, 8]} intensity={1.55} />
        <directionalLight position={[-8, -4, -6]} intensity={0.6} color="#4F8BFF" />

        {/* Orbital Reference CAD Floor Grid */}
        <gridHelper
          args={[28, 28, '#2E8BFF', '#334155']}
          position={[0, -1.85, 0]}
          material-opacity={0.22}
          material-transparent
        />

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
            wireframe={mergedState.wireframe}
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
          autoRotate={autoRotate}
          autoRotateSpeed={autoRotateSpeed}
          onStart={() => {
            isTransitioningRef.current = false;
          }}
        />

        <SmoothCameraRig
          targetPosition={effectiveCamPos}
          targetLookAt={effectiveCamTarget}
          activeZone={activeZone}
          controlsRef={controlsRef}
          isTransitioningRef={isTransitioningRef}
        />
      </Canvas>
    </div>
  );
}
