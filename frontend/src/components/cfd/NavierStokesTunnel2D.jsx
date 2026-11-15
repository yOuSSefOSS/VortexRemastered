import React, { useRef, useState, useEffect, useCallback } from 'react';
import { generateNaca4Coordinates } from '../../domain/nacaGeometry';

const NX = 220;
const NY = 110;
const NCELLS = NX * NY;
const NUM_PARTICLES = 750;

const idx = (i, j) => i + j * NX;

/**
 * Jet / Rainbow colormap (0..1 -> [R, G, B])
 */
function jetColor(t) {
  const v = Math.max(0, Math.min(1, t));
  const r = Math.max(0, Math.min(1, 1.5 - Math.abs(4 * v - 3)));
  const g = Math.max(0, Math.min(1, 1.5 - Math.abs(4 * v - 2)));
  const b = Math.max(0, Math.min(1, 1.5 - Math.abs(4 * v - 1)));
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

/**
 * Point-in-polygon check (local obstacle coordinates)
 */
function pointInPolygon(px, py, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x;
    const yi = poly[i].y;
    const xj = poly[j].x;
    const yj = poly[j].y;
    const intersect =
      yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi + 1e-9) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Build polygon vertices in normalized obstacle space [-0.5 .. +0.5]
 */
function buildObstacleLocalPoly(obs, m = 2, p = 4, t = 12) {
  if (obs.type === 'triangle') {
    return [
      { x: -0.5, y: 0.0 },
      { x: 0.5, y: -0.34 },
      { x: 0.5, y: 0.34 },
    ];
  }
  if (obs.type === 'square') {
    return [
      { x: -0.34, y: -0.34 },
      { x: 0.34, y: -0.34 },
      { x: 0.34, y: 0.34 },
      { x: -0.34, y: 0.34 },
    ];
  }
  if (obs.type === 'plate') {
    return [
      { x: -0.5, y: -0.045 },
      { x: 0.5, y: -0.045 },
      { x: 0.5, y: 0.045 },
      { x: -0.5, y: 0.045 },
    ];
  }
  if (obs.type === 'cylinder') {
    const pts = [];
    for (let k = 0; k < 28; k++) {
      const a = (k / 28) * Math.PI * 2;
      pts.push({ x: Math.cos(a) * 0.32, y: Math.sin(a) * 0.32 });
    }
    return pts;
  }
  // Default: NACA 4-digit airfoil centered at (0, 0)
  const useM = obs.isPrimary ? m : obs.m ?? 2;
  const useP = obs.isPrimary ? p : obs.p ?? 4;
  const useT = obs.isPrimary ? t : obs.t ?? 12;
  const naca = generateNaca4Coordinates(useM, useP, useT, 32);
  const boundary = naca?.boundary || naca?.coordinates || [];
  // NACA x is 0..1, y is positive up; in screen/grid space y-down is positive, so flip y
  return boundary.map((pt) => ({
    x: pt.x - 0.5,
    y: -pt.y,
  }));
}

export const VISUALIZATION_MODES = [
  { id: 'smoke_vel', label: 'Smoke + Velocity' },
  { id: 'velocity_jet', label: 'Velocity (Jet)' },
  { id: 'vorticity_curl', label: 'Vorticity (Curl)' },
  { id: 'pressure_field', label: 'Pressure (Field)' },
  { id: 'schlieren', label: 'Schlieren |∇ω|' },
  { id: 'particles_only', label: 'Particles Only' },
];

/**
 * Experience 3 (Video 3): Real-Time 2D Eulerian Navier-Stokes Fluid & Wind Tunnel Simulator
 * Includes direct on-canvas drag & rotation handles, multi-obstacle support, and 5 CFD field modes.
 */
export default function NavierStokesTunnel2D({
  nacaCode = '2412',
  m = 2,
  p = 4,
  t = 12,
  aoa = 4.0,
  onAoaChange,
  velocityMs = 60,
  onVelocityChange,
  cl = 0.68,
  cd = 0.014,
}) {
  const canvasRef = useRef(null);

  // Visualization & solver controls
  const [visMode, setVisMode] = useState('smoke_vel');
  const [vorticityStrength, setVorticityStrength] = useState(2.6);
  const [showVectors, setShowVectors] = useState(true);
  const [showStreamParticles, setShowStreamParticles] = useState(true);
  const [showCpOverlay, setShowCpOverlay] = useState(false);
  const [showBoundaryLayer, setShowBoundaryLayer] = useState(false);
  const [paused, setPaused] = useState(false);

  // Multi-obstacle list in grid coordinates (x in [0..NX], y in [0..NY])
  const [obstacles, setObstacles] = useState(() => [
    {
      id: 'primary-airfoil',
      type: 'airfoil',
      name: `NACA ${nacaCode}`,
      isPrimary: true,
      cx: NX * 0.34,
      cy: NY * 0.5,
      chord: 50,
      angleDeg: aoa,
      m,
      p,
      t,
    },
  ]);
  const [selectedObsId, setSelectedObsId] = useState('primary-airfoil');

  // Keep primary airfoil synced with external Lab props (m, p, t, aoa)
  useEffect(() => {
    setObstacles((prev) =>
      prev.map((obs) =>
        obs.isPrimary
          ? {
              ...obs,
              name: `NACA ${nacaCode}`,
              angleDeg: aoa,
              m,
              p,
              t,
            }
          : obs
      )
    );
  }, [nacaCode, m, p, t, aoa]);

  // Persistent TypedArray Fluid Solver State
  const solverRef = useRef(null);
  const obstaclesRef = useRef(obstacles);

  const ensureSolver = useCallback(() => {
    if (!solverRef.current) {
      const u = new Float32Array(NCELLS);
      const v = new Float32Array(NCELLS);
      const uNew = new Float32Array(NCELLS);
      const vNew = new Float32Array(NCELLS);
      const pr = new Float32Array(NCELLS);
      const div = new Float32Array(NCELLS);
      const curl = new Float32Array(NCELLS);
      const smoke = new Float32Array(NCELLS);
      const smokeNew = new Float32Array(NCELLS);
      const solid = new Uint8Array(NCELLS);

      const particles = new Float32Array(NUM_PARTICLES * 2);
      for (let k = 0; k < NUM_PARTICLES; k++) {
        particles[k * 2] = ((k * 37) % (NX - 6)) + 3;
        particles[k * 2 + 1] = ((k * 73) % (NY - 8)) + 4;
      }

      for (let i = 0; i < NCELLS; i++) {
        u[i] = 1.0;
      }

      const offscreen = document.createElement('canvas');
      offscreen.width = NX;
      offscreen.height = NY;

      solverRef.current = {
        u,
        v,
        uNew,
        vNew,
        pr,
        div,
        curl,
        smoke,
        smokeNew,
        solid,
        particles,
        offscreen,
      };
    }
    return solverRef.current;
  }, []);

  // Rasterize all obstacles into `solid` grid whenever obstacles or NACA geometry change
  const rasterizeSolids = useCallback(
    (obsList) => {
      const s = ensureSolver();
      s.solid.fill(0);

      // Top and bottom wind-tunnel walls
      for (let i = 0; i < NX; i++) {
        s.solid[idx(i, 0)] = 1;
        s.solid[idx(i, NY - 1)] = 1;
      }

      obsList.forEach((obs) => {
        const poly = buildObstacleLocalPoly(obs, m, p, t);
        const rad = (obs.angleDeg * Math.PI) / 180;
        const cosA = Math.cos(rad);
        const sinA = Math.sin(rad);
        const scale = obs.chord;
        const halfBox = Math.ceil(scale * 0.62);

        const iMin = Math.max(2, Math.floor(obs.cx - halfBox));
        const iMax = Math.min(NX - 3, Math.ceil(obs.cx + halfBox));
        const jMin = Math.max(2, Math.floor(obs.cy - halfBox));
        const jMax = Math.min(NY - 3, Math.ceil(obs.cy + halfBox));

        for (let j = jMin; j <= jMax; j++) {
          for (let i = iMin; i <= iMax; i++) {
            const dx = (i - obs.cx) / scale;
            const dy = (j - obs.cy) / scale;
            // Positive AoA pitches leading edge (left, x < 0) UP (y < 0 in screen coords)
            const lx = dx * cosA - dy * sinA;
            const ly = dx * sinA + dy * cosA;
            if (pointInPolygon(lx, ly, poly)) {
              const c = idx(i, j);
              s.solid[c] = 1;
              s.u[c] = 0;
              s.v[c] = 0;
              s.smoke[c] = 0;
            }
          }
        }
      });
    },
    [ensureSolver, m, p, t]
  );

  useEffect(() => {
    obstaclesRef.current = obstacles;
    rasterizeSolids(obstacles);
  }, [obstacles, rasterizeSolids]);

  // Drag / Rotate interaction ref
  const dragStateRef = useRef({
    mode: null, // 'move' | 'rotate'
    obsId: null,
    offsetX: 0,
    offsetY: 0,
  });

  // Main 60 FPS Navier-Stokes loop
  useEffect(() => {
    let animId;
    const s = ensureSolver();
    const offCtx = s.offscreen.getContext('2d');
    const imgData = offCtx.createImageData(NX, NY);
    const pixels = imgData.data;

    const stepFluid = () => {
      const { u, v, uNew, vNew, pr, div, curl, smoke, smokeNew, solid, particles } = s;
      const uInflow = Math.max(0.45, Math.min(2.2, velocityMs / 55));
      const dt = 0.42;

      // 1. Inflow boundary conditions (Left wall i = 0, 1) & Outflow (Right wall i = NX - 1)
      for (let j = 1; j < NY - 1; j++) {
        u[idx(0, j)] = uInflow;
        u[idx(1, j)] = uInflow;
        v[idx(0, j)] = 0;
        v[idx(1, j)] = 0;

        // 15 wind-tunnel smoke rake nozzles along the left inlet
        const nozzleWave = Math.sin((j / NY) * Math.PI * 30);
        const isNozzle = nozzleWave > 0.48 && j > 8 && j < NY - 8;
        smoke[idx(0, j)] = isNozzle ? 1.0 : 0.0;
        smoke[idx(1, j)] = isNozzle ? 1.0 : 0.0;

        // Zero-gradient outflow on right boundary
        u[idx(NX - 1, j)] = u[idx(NX - 2, j)];
        v[idx(NX - 1, j)] = v[idx(NX - 2, j)];
        smoke[idx(NX - 1, j)] = smoke[idx(NX - 2, j)];
      }

      // 2. Vorticity (Curl) computation + Vorticity Confinement Force
      for (let j = 2; j < NY - 2; j++) {
        for (let i = 2; i < NX - 2; i++) {
          const c = idx(i, j);
          if (solid[c]) {
            curl[c] = 0;
            continue;
          }
          const dvdx = (v[idx(i + 1, j)] - v[idx(i - 1, j)]) * 0.5;
          const dudy = (u[idx(i, j + 1)] - u[idx(i, j - 1)]) * 0.5;
          curl[c] = dvdx - dudy;
        }
      }

      const vcEps = vorticityStrength * 0.14;
      for (let j = 2; j < NY - 2; j++) {
        for (let i = 2; i < NX - 2; i++) {
          const c = idx(i, j);
          if (solid[c]) continue;
          const dwDx =
            (Math.abs(curl[idx(i + 1, j)]) - Math.abs(curl[idx(i - 1, j)])) * 0.5;
          const dwDy =
            (Math.abs(curl[idx(i, j + 1)]) - Math.abs(curl[idx(i, j - 1)])) * 0.5;
          const len = Math.hypot(dwDx, dwDy) + 1e-5;
          const nx = dwDx / len;
          const ny = dwDy / len;
          const w = curl[c];
          u[c] += dt * vcEps * (ny * w);
          v[c] += dt * vcEps * (-nx * w);
        }
      }

      // 3. Divergence & Gauss-Seidel Over-Relaxed Pressure-Poisson Solver
      for (let j = 1; j < NY - 1; j++) {
        for (let i = 1; i < NX - 1; i++) {
          const c = idx(i, j);
          if (solid[c]) {
            div[c] = 0;
            pr[c] = 0;
            continue;
          }
          div[c] =
            -0.5 *
            (u[idx(i + 1, j)] -
              u[idx(i - 1, j)] +
              v[idx(i, j + 1)] -
              v[idx(i, j - 1)]);
          pr[c] *= 0.85; // Warm start pressure
        }
      }

      for (let iter = 0; iter < 20; iter++) {
        for (let j = 1; j < NY - 1; j++) {
          for (let i = 1; i < NX - 1; i++) {
            const c = idx(i, j);
            if (solid[c]) continue;
            const sL = 1 - solid[idx(i - 1, j)];
            const sR = 1 - solid[idx(i + 1, j)];
            const sB = 1 - solid[idx(i, j - 1)];
            const sT = 1 - solid[idx(i, j + 1)];
            const sSum = sL + sR + sB + sT;
            if (sSum === 0) continue;
            const pTarget =
              (div[c] +
                sL * pr[idx(i - 1, j)] +
                sR * pr[idx(i + 1, j)] +
                sB * pr[idx(i, j - 1)] +
                sT * pr[idx(i, j + 1)]) /
              sSum;
            pr[c] = pr[c] + 1.75 * (pTarget - pr[c]);
          }
        }
      }

      // Subtract pressure gradient to enforce divergence-free velocity
      for (let j = 1; j < NY - 1; j++) {
        for (let i = 1; i < NX - 1; i++) {
          const c = idx(i, j);
          if (solid[c]) {
            u[c] = 0;
            v[c] = 0;
            continue;
          }
          if (!solid[idx(i - 1, j)] && !solid[idx(i + 1, j)]) {
            u[c] -= 0.5 * (pr[idx(i + 1, j)] - pr[idx(i - 1, j)]);
          }
          if (!solid[idx(i, j - 1)] && !solid[idx(i, j + 1)]) {
            v[c] -= 0.5 * (pr[idx(i, j + 1)] - pr[idx(i, j - 1)]);
          }
        }
      }

      // 4. Semi-Lagrangian Bilinear Advection of Velocity (u, v) and Smoke Dye
      const sampleField = (field, x, y) => {
        const cx = Math.max(0.5, Math.min(NX - 1.5, x));
        const cy = Math.max(0.5, Math.min(NY - 1.5, y));
        const i0 = Math.floor(cx);
        const j0 = Math.floor(cy);
        const tx = cx - i0;
        const ty = cy - j0;
        const c00 = field[idx(i0, j0)];
        const c10 = field[idx(i0 + 1, j0)];
        const c01 = field[idx(i0, j0 + 1)];
        const c11 = field[idx(i0 + 1, j0 + 1)];
        return (
          (1 - tx) * (1 - ty) * c00 +
          tx * (1 - ty) * c10 +
          (1 - tx) * ty * c01 +
          tx * ty * c11
        );
      };

      for (let j = 1; j < NY - 1; j++) {
        for (let i = 1; i < NX - 1; i++) {
          const c = idx(i, j);
          if (solid[c]) {
            uNew[c] = 0;
            vNew[c] = 0;
            smokeNew[c] = 0;
            continue;
          }
          const prevX = i - dt * u[c];
          const prevY = j - dt * v[c];
          uNew[c] = sampleField(u, prevX, prevY);
          vNew[c] = sampleField(v, prevX, prevY);
          smokeNew[c] = sampleField(smoke, prevX, prevY) * 0.997;
        }
      }

      for (let j = 1; j < NY - 1; j++) {
        for (let i = 2; i < NX - 1; i++) {
          const c = idx(i, j);
          u[c] = uNew[c];
          v[c] = vNew[c];
          smoke[c] = smokeNew[c];
        }
      }

      // 5. Advect Lagrangian tracer particles
      for (let k = 0; k < NUM_PARTICLES; k++) {
        let px = particles[k * 2];
        let py = particles[k * 2 + 1];
        const ci = Math.min(NX - 1, Math.max(0, Math.floor(px)));
        const cj = Math.min(NY - 1, Math.max(0, Math.floor(py)));
        const cell = idx(ci, cj);
        if (solid[cell] || px >= NX - 2 || py <= 1 || py >= NY - 2) {
          px = 2 + Math.random() * 6;
          py = 6 + Math.random() * (NY - 12);
        } else {
          px += u[cell] * dt * 1.45;
          py += v[cell] * dt * 1.45;
        }
        particles[k * 2] = px;
        particles[k * 2 + 1] = py;
      }
    };

    const renderFrame = () => {
      if (!paused) {
        stepFluid();
        stepFluid();
      }

      const canvas = canvasRef.current;
      if (!canvas) {
        animId = requestAnimationFrame(renderFrame);
        return;
      }
      const ctx = canvas.getContext('2d');
      const W = canvas.width;
      const H = canvas.height;
      const scaleX = W / NX;
      const scaleY = H / NY;

      const { u, v, pr, curl, smoke, solid, particles } = s;
      const uInflow = Math.max(0.45, Math.min(2.2, velocityMs / 55));

      // Render Eulerian field into offscreen ImageData
      for (let j = 0; j < NY; j++) {
        for (let i = 0; i < NX; i++) {
          const c = idx(i, j);
          const pIdx = c * 4;

          if (solid[c]) {
            pixels[pIdx] = 28;
            pixels[pIdx + 1] = 36;
            pixels[pIdx + 2] = 48;
            pixels[pIdx + 3] = 255;
            continue;
          }

          const speed = Math.hypot(u[c], v[c]) / (uInflow * 1.65);

          if (visMode === 'smoke_vel') {
            const sm = Math.min(1, smoke[c] * 1.25);
            const [jr, jg, jb] = jetColor(speed * 0.85);
            pixels[pIdx] = Math.round(7 + sm * (195 + jr * 0.22));
            pixels[pIdx + 1] = Math.round(10 + sm * (225 + jg * 0.12));
            pixels[pIdx + 2] = Math.round(16 + sm * 245 + speed * 28);
            pixels[pIdx + 3] = 255;
          } else if (visMode === 'velocity_jet') {
            const [r, g, b] = jetColor(speed);
            pixels[pIdx] = r;
            pixels[pIdx + 1] = g;
            pixels[pIdx + 2] = b;
            pixels[pIdx + 3] = 255;
          } else if (visMode === 'vorticity_curl') {
            const w = curl[c] * 4.5;
            const pos = Math.max(0, Math.min(1, w));
            const neg = Math.max(0, Math.min(1, -w));
            pixels[pIdx] = Math.round(8 + pos * 245);
            pixels[pIdx + 1] = Math.round(11 + (pos + neg) * 45);
            pixels[pIdx + 2] = Math.round(18 + neg * 245);
            pixels[pIdx + 3] = 255;
          } else if (visMode === 'pressure_field') {
            const pNorm = pr[c] * 3.8;
            const hi = Math.max(0, Math.min(1, pNorm));
            const lo = Math.max(0, Math.min(1, -pNorm));
            pixels[pIdx] = Math.round(10 + hi * 240);
            pixels[pIdx + 1] = Math.round(14 + lo * 165 + hi * 55);
            pixels[pIdx + 2] = Math.round(22 + lo * 245);
            pixels[pIdx + 3] = 255;
          } else if (visMode === 'schlieren') {
            // Optical Schlieren: magnitude of spatial gradient of vorticity & pressure
            const im = Math.max(0, i - 1);
            const ip = Math.min(NX - 1, i + 1);
            const jm = Math.max(0, j - 1);
            const jp = Math.min(NY - 1, j + 1);
            const gx = (curl[idx(ip, j)] - curl[idx(im, j)]) * 2.2 + (pr[idx(ip, j)] - pr[idx(im, j)]) * 1.8;
            const gy = (curl[idx(i, jp)] - curl[idx(i, jm)]) * 2.2 + (pr[idx(i, jp)] - pr[idx(i, jm)]) * 1.8;
            const grad = Math.min(1, Math.hypot(gx, gy) * 3.6);
            const lum = Math.round(14 + Math.pow(grad, 0.72) * 238);
            pixels[pIdx] = Math.round(lum * 0.88);
            pixels[pIdx + 1] = Math.round(lum * 0.96);
            pixels[pIdx + 2] = Math.min(255, Math.round(lum * 1.08));
            pixels[pIdx + 3] = 255;
          } else {
            // particles_only dark background
            pixels[pIdx] = 7;
            pixels[pIdx + 1] = 10;
            pixels[pIdx + 2] = 16;
            pixels[pIdx + 3] = 255;
          }
        }
      }

      offCtx.putImageData(imgData, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(s.offscreen, 0, 0, W, H);

      // Optional glowing Lagrangian particles overlay
      if (showStreamParticles || visMode === 'particles_only') {
        ctx.lineWidth = visMode === 'particles_only' ? 1.8 : 1.1;
        for (let k = 0; k < NUM_PARTICLES; k++) {
          const px = particles[k * 2];
          const py = particles[k * 2 + 1];
          const ci = Math.min(NX - 1, Math.max(0, Math.floor(px)));
          const cj = Math.min(NY - 1, Math.max(0, Math.floor(py)));
          const c = idx(ci, cj);
          if (solid[c]) continue;
          const vx = u[c];
          const vy = v[c];
          const sx = px * scaleX;
          const sy = py * scaleY;
          ctx.strokeStyle =
            visMode === 'particles_only'
              ? 'rgba(56, 189, 248, 0.85)'
              : 'rgba(255, 255, 255, 0.35)';
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx - vx * 6.5, sy - vy * 6.5);
          ctx.stroke();
        }
      }

      // Draw crisp vector obstacles, green CAD selection box, rotation handle, and Lift/Drag vectors
      obstaclesRef.current.forEach((obs) => {
        const isSelected = obs.id === selectedObsId;
        const poly = buildObstacleLocalPoly(obs, m, p, t);
        const cxScreen = obs.cx * scaleX;
        const cyScreen = obs.cy * scaleY;
        const rad = (-obs.angleDeg * Math.PI) / 180; // Canvas rotation

        ctx.save();
        ctx.translate(cxScreen, cyScreen);
        ctx.rotate(rad);

        // Draw obstacle silhouette
        ctx.beginPath();
        poly.forEach((pt, index) => {
          const x = pt.x * obs.chord * scaleX;
          const y = pt.y * obs.chord * scaleY;
          if (index === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.closePath();
        ctx.fillStyle = '#E2E8F0';
        ctx.fill();
        ctx.lineWidth = isSelected ? 2.0 : 1.2;
        ctx.strokeStyle = isSelected ? '#22C55E' : '#94A3B8';
        ctx.stroke();

        // Green CAD selection frame + Rotation Ring Handle (Video 3 signature feature)
        if (isSelected) {
          const boxW = obs.chord * scaleX * 1.1;
          const boxH = obs.chord * scaleY * 0.42;
          ctx.setLineDash([4, 4]);
          ctx.strokeStyle = '#22C55E';
          ctx.lineWidth = 1.3;
          ctx.strokeRect(-boxW * 0.5, -boxH * 0.5, boxW, boxH);
          ctx.setLineDash([]);

          // Rotation arm extending from leading edge
          const handleDist = -boxW * 0.65;
          ctx.beginPath();
          ctx.moveTo(-boxW * 0.5, 0);
          ctx.lineTo(handleDist, 0);
          ctx.strokeStyle = '#22C55E';
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(handleDist, 0, 6.5, 0, Math.PI * 2);
          ctx.fillStyle = '#22C55E';
          ctx.fill();
          ctx.strokeStyle = '#052E16';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        // Optional Boundary Layer & Stagnation Point Envelope (Video 3 Feature)
        if (showBoundaryLayer && obs.isPrimary) {
          const halfC = obs.chord * scaleX * 0.5;
          const blThick = Math.max(6, Math.abs(obs.angleDeg) * 1.45 + 7);
          ctx.beginPath();
          ctx.moveTo(-halfC, 0);
          ctx.quadraticCurveTo(0, -blThick * 1.6, halfC * 1.12, -blThick * 2.25);
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
          ctx.lineWidth = 1.6;
          ctx.setLineDash([3, 3]);
          ctx.stroke();
          ctx.setLineDash([]);

          // Leading-Edge Stagnation Point Marker (Red-Amber Dot)
          const stagY = Math.sin((obs.angleDeg * Math.PI) / 180) * 10;
          ctx.beginPath();
          ctx.arc(-halfC + 2, stagY, 4.5, 0, Math.PI * 2);
          ctx.fillStyle = '#EF4444';
          ctx.fill();
          ctx.strokeStyle = '#FEF2F2';
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }

        // Optional Live Cp Surface Pressure Distribution Curve above Airfoil
        if (showCpOverlay && obs.isPrimary) {
          const halfC = obs.chord * scaleX * 0.5;
          ctx.beginPath();
          for (let sIdx = 0; sIdx <= 20; sIdx++) {
            const frac = sIdx / 20;
            const xLoc = -halfC + frac * (halfC * 2);
            const suction =
              Math.pow(1 - frac, 0.65) *
              Math.sin(Math.pow(frac, 0.35) * Math.PI) *
              (28 + obs.angleDeg * 2.6);
            const yLoc = -14 - suction;
            if (sIdx === 0) ctx.moveTo(xLoc, yLoc);
            else ctx.lineTo(xLoc, yLoc);
          }
          ctx.strokeStyle = '#38BDF8';
          ctx.lineWidth = 2.0;
          ctx.stroke();
        }

        ctx.restore();

        // Draw Live Lift (L) and Drag (D) Force Vectors + Angle Badge at Center
        if (showVectors && obs.isPrimary) {
          const liftLen = Math.max(-95, Math.min(95, cl * 56));
          const dragLen = Math.max(18, Math.min(85, cd * 950));

          // Lift Vector (Upward Green/Cyan)
          ctx.save();
          ctx.strokeStyle = '#22C55E';
          ctx.fillStyle = '#22C55E';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(cxScreen, cyScreen);
          ctx.lineTo(cxScreen, cyScreen - liftLen);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(cxScreen, cyScreen - liftLen, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.font = 'bold 11px monospace';
          ctx.fillText(`L (CL ${cl.toFixed(2)})`, cxScreen + 8, cyScreen - liftLen + 4);

          // Drag Vector (Rightward Amber/Red)
          ctx.strokeStyle = '#F59E0B';
          ctx.fillStyle = '#F59E0B';
          ctx.beginPath();
          ctx.moveTo(cxScreen, cyScreen);
          ctx.lineTo(cxScreen + dragLen, cyScreen);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(cxScreen + dragLen, cyScreen, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillText(`D (CD ${cd.toFixed(3)})`, cxScreen + dragLen + 6, cyScreen + 4);

          // Angle of Attack Badge
          ctx.fillStyle = 'rgba(7, 10, 18, 0.85)';
          ctx.fillRect(cxScreen - 34, cyScreen + 24, 68, 18);
          ctx.strokeStyle = '#22C55E';
          ctx.lineWidth = 1;
          ctx.strokeRect(cxScreen - 34, cyScreen + 24, 68, 18);
          ctx.fillStyle = '#F8FAFC';
          ctx.font = 'bold 10px monospace';
          ctx.fillText(
            `α ${obs.angleDeg >= 0 ? '+' : ''}${obs.angleDeg.toFixed(1)}°`,
            cxScreen - 24,
            cyScreen + 36
          );
          ctx.restore();
        }
      });

      animId = requestAnimationFrame(renderFrame);
    };

    animId = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(animId);
  }, [
    ensureSolver,
    visMode,
    vorticityStrength,
    showVectors,
    showStreamParticles,
    showCpOverlay,
    showBoundaryLayer,
    paused,
    velocityMs,
    selectedObsId,
    m,
    p,
    t,
    cl,
    cd,
  ]);

  // Pointer Events for Direct On-Canvas Drag & AoA Rotation
  const getGridCoords = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * NX;
    const y = ((e.clientY - rect.top) / rect.height) * NY;
    return { x, y };
  };

  const handlePointerDown = (e) => {
    const { x, y } = getGridCoords(e);
    // Check if clicking rotation handle of selected obstacle first
    const sel = obstacles.find((o) => o.id === selectedObsId);
    if (sel) {
      const rad = (-sel.angleDeg * Math.PI) / 180;
      const handleDist = -sel.chord * 1.1 * 0.65;
      const hx = sel.cx + Math.cos(rad) * handleDist;
      const hy = sel.cy + Math.sin(rad) * handleDist;
      if (Math.hypot(x - hx, y - hy) < 7.5) {
        dragStateRef.current = { mode: 'rotate', obsId: sel.id };
        return;
      }
    }

    // Check if clicking inside any obstacle body
    for (let k = obstacles.length - 1; k >= 0; k--) {
      const obs = obstacles[k];
      if (Math.hypot(x - obs.cx, y - obs.cy) < obs.chord * 0.55) {
        setSelectedObsId(obs.id);
        dragStateRef.current = {
          mode: 'move',
          obsId: obs.id,
          offsetX: x - obs.cx,
          offsetY: y - obs.cy,
        };
        return;
      }
    }
  };

  const handlePointerMove = (e) => {
    const st = dragStateRef.current;
    if (!st.mode || !st.obsId) return;
    const { x, y } = getGridCoords(e);

    setObstacles((prev) =>
      prev.map((obs) => {
        if (obs.id !== st.obsId) return obs;
        if (st.mode === 'move') {
          return {
            ...obs,
            cx: Math.max(24, Math.min(NX - 24, x - st.offsetX)),
            cy: Math.max(16, Math.min(NY - 16, y - st.offsetY)),
          };
        }
        if (st.mode === 'rotate') {
          const dx = x - obs.cx;
          const dy = y - obs.cy;
          // Handle is on the leading edge (-x axis)
          let deg = -(Math.atan2(dy, dx) * 180) / Math.PI - 180;
          while (deg > 180) deg -= 360;
          while (deg < -180) deg += 360;
          const clamped = Math.max(-20, Math.min(20, Math.round(deg * 2) / 2));
          if (obs.isPrimary && onAoaChange) {
            onAoaChange(clamped);
          }
          return { ...obs, angleDeg: clamped };
        }
        return obs;
      })
    );
  };

  const handlePointerUp = () => {
    dragStateRef.current = { mode: null, obsId: null, offsetX: 0, offsetY: 0 };
  };

  const addObstacle = (type) => {
    const id = `${type}-${Date.now()}`;
    const newObs = {
      id,
      type,
      name:
        type === 'triangle'
          ? 'Delta Wedge'
          : type === 'cylinder'
            ? 'Bluff Cylinder'
            : type === 'square'
              ? 'Square Bluff Body'
              : type === 'plate'
                ? 'Flat Plate'
                : 'Secondary Airfoil',
      isPrimary: false,
      cx: NX * 0.62,
      cy: NY * 0.5 + (obstacles.length % 2 === 0 ? -16 : 16),
      chord: type === 'cylinder' || type === 'square' ? 28 : 38,
      angleDeg: type === 'plate' ? 8 : 0,
    };
    setObstacles((prev) => [...prev, newObs]);
    setSelectedObsId(id);
  };

  const removeSelectedObstacle = () => {
    if (selectedObsId === 'primary-airfoil') return;
    setObstacles((prev) => prev.filter((o) => o.id !== selectedObsId));
    setSelectedObsId('primary-airfoil');
  };

  const clearWake = () => {
    const s = solverRef.current;
    if (!s) return;
    const uInflow = Math.max(0.45, Math.min(2.2, velocityMs / 55));
    for (let i = 0; i < NCELLS; i++) {
      s.u[i] = s.solid[i] ? 0 : uInflow;
      s.v[i] = 0;
      s.pr[i] = 0;
      s.smoke[i] = 0;
    }
  };

  const isTurbulentWake = Math.abs(aoa) > 11.5 || velocityMs > 95 || obstacles.length > 1;
  const ldRatio = cd > 0.0001 ? (cl / cd).toFixed(1) : '0.0';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        padding: '12px',
      }}
    >
      {/* ================================================================= */}
      {/* TOP CFD TOOLBAR: 6 VISUALIZATION MODES + OBSTACLE SPAWNER         */}
      {/* ================================================================= */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {VISUALIZATION_MODES.map((mItem) => (
            <button
              key={mItem.id}
              type="button"
              onClick={() => setVisMode(mItem.id)}
              className={`btn btn-sm ${
                visMode === mItem.id ? 'btn-primary' : 'btn-secondary'
              }`}
              style={{ fontSize: '11px', padding: '5px 10px' }}
            >
              {mItem.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => addObstacle('airfoil')}
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '11px' }}
          >
            + Airfoil
          </button>
          <button
            type="button"
            onClick={() => addObstacle('cylinder')}
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '11px' }}
          >
            + Cylinder
          </button>
          <button
            type="button"
            onClick={() => addObstacle('square')}
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '11px' }}
          >
            + Square
          </button>
          <button
            type="button"
            onClick={() => addObstacle('triangle')}
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '11px' }}
          >
            + Wedge
          </button>
          <button
            type="button"
            onClick={() => addObstacle('plate')}
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '11px' }}
          >
            + Flat Plate
          </button>
          {selectedObsId !== 'primary-airfoil' && (
            <button
              type="button"
              onClick={removeSelectedObstacle}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '11px', color: '#EF4444' }}
            >
              Delete Selected
            </button>
          )}
          <button
            type="button"
            onClick={clearWake}
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '11px' }}
          >
            Reset Wake
          </button>
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '11px' }}
          >
            {paused ? '▶ Resume' : '❚❚ Pause'}
          </button>
        </div>
      </div>

      {/* ================================================================= */}
      {/* INTERACTIVE 2D EULERIAN NAVIER-STOKES CANVAS                      */}
      {/* ================================================================= */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '2 / 1',
          minHeight: '340px',
          borderRadius: '4px',
          overflow: 'hidden',
          border: '1px solid var(--border-strong)',
          cursor: 'grab',
        }}
      >
        <canvas
          ref={canvasRef}
          width={880}
          height={440}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          style={{ width: '100%', height: '100%', display: 'block' }}
        />

        {/* Top-Left Live Solver Telemetry Overlay */}
        <div
          className="vg-glass mono"
          style={{
            position: 'absolute',
            top: '10px',
            left: '12px',
            padding: '6px 12px',
            fontSize: '10px',
            color: 'var(--glass-text)',
            pointerEvents: 'none',
            display: 'flex',
            gap: '12px',
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <span>GRID: {NX}×{NY} EULERIAN MAC</span>
          <span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>V∞: {velocityMs} m/s</span>
          <span style={{ color: 'var(--status-success)', fontWeight: 700 }}>α: {aoa.toFixed(1)}°</span>
          <span style={{ color: 'var(--accent-gold)', fontWeight: 700 }}>L/D: {ldRatio}</span>
          <span
            style={{
              padding: '1px 6px',
              borderRadius: '999px',
              background: isTurbulentWake ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)',
              color: isTurbulentWake ? 'var(--status-warn)' : 'var(--status-success)',
              fontWeight: 700,
            }}
          >
            {isTurbulentWake ? 'WAKE: VORTEX SHEDDING' : 'FLOW: LAMINAR ATTACHED'}
          </span>
          <span style={{ color: 'var(--glass-muted)' }}>DRAG BODY OR GREEN RING TO ROTATE</span>
        </div>
      </div>

      {/* ================================================================= */}
      {/* BOTTOM TUNNEL CONTROLS: VORTICITY CONFINEMENT & VECTOR OVERLAYS   */}
      {/* ================================================================= */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          paddingTop: '4px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <label
            className="mono"
            style={{
              fontSize: '11px',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span>VORTICITY SHEDDING:</span>
            <input
              type="range"
              min="0"
              max="5"
              step="0.2"
              value={vorticityStrength}
              onChange={(e) => setVorticityStrength(Number(e.target.value))}
              style={{ width: '110px' }}
            />
            <span style={{ color: 'var(--accent-primary)' }}>
              {vorticityStrength.toFixed(1)}
            </span>
          </label>

          {onVelocityChange && (
            <label
              className="mono"
              style={{
                fontSize: '11px',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>TUNNEL SPEED:</span>
              <input
                type="range"
                min="15"
                max="150"
                step="1"
                value={velocityMs}
                onChange={(e) => onVelocityChange(Number(e.target.value))}
                style={{ width: '110px' }}
              />
              <span style={{ color: 'var(--accent-primary)' }}>{velocityMs} m/s</span>
            </label>
          )}
        </div>

        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setShowVectors((v) => !v)}
            className={`btn btn-sm ${showVectors ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '11px' }}
          >
            Force Vectors (L/D): {showVectors ? 'ON' : 'OFF'}
          </button>
          <button
            type="button"
            onClick={() => setShowStreamParticles((v) => !v)}
            className={`btn btn-sm ${
              showStreamParticles ? 'btn-primary' : 'btn-secondary'
            }`}
            style={{ fontSize: '11px' }}
          >
            Tracer Streaks: {showStreamParticles ? 'ON' : 'OFF'}
          </button>
          <button
            type="button"
            onClick={() => setShowCpOverlay((v) => !v)}
            className={`btn btn-sm ${showCpOverlay ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '11px' }}
          >
            Cp Envelope: {showCpOverlay ? 'ON' : 'OFF'}
          </button>
          <button
            type="button"
            onClick={() => setShowBoundaryLayer((v) => !v)}
            className={`btn btn-sm ${showBoundaryLayer ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '11px' }}
          >
            Boundary Layer: {showBoundaryLayer ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>
    </div>
  );
}

