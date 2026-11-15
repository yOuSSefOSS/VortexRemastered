# Vortex-Gen Remastered — Saved Project Context & Reference Analysis

> **Read This First in Any Future Session**: This document stores the complete analysis of the user's reference videos, brand identity, design tokens, 3D/CFD architecture, and completed commits so **no agent or session ever needs to re-analyze the videos, images, or codebase from scratch.**

---

## 1. Repository & Workspace Locations
- **Target Project Directory (Work Here Exclusively)**: `C:\Users\youssef\Desktop\Vortex-Gen remastered`
- **GitHub Remote**: `https://github.com/yOuSSefOSS/VortexRemastered.git` (`main` branch)
- **Original Legacy Folder (Leave Untouched)**: `c:\Users\youssef\.gemini\antigravity\scratch\Vortex-Gen`
- **Local Dev Servers**:
  - Frontend (Vite + React 19 + Three.js): `http://localhost:5173/` (`C:\Users\youssef\Desktop\Vortex-Gen remastered\frontend`)
  - Backend (Express + Python NeuralFoil worker): `http://localhost:5000` (`C:\Users\youssef\Desktop\Vortex-Gen remastered\backend`)
  - One-click launcher: [`start.bat`](file:///C:/Users/youssef/Desktop/Vortex-Gen%20remastered/start.bat)

---

## 2. User Brand Identity & Theme Polarity ("Fly Higher" System)
- **Uploaded Brand Assets** (`frontend/public/brand/`):
  - `logo-crest.jpg`, `logo-banner.jpg`, `logo-icon.jpg`: Winged chrome-silver & electric-blue **"V"** crest wrapped by an afterburner-gold orbital swoosh over a deep night-sky horizon (`VORTEX-GEN — FLY HIGHER`).
- **Design System ([`frontend/src/index.css`](file:///C:/Users/youssef/Desktop/Vortex-Gen%20remastered/frontend/src/index.css))**:
  - **Dark Mode (`:root, :root[data-theme="dark"]`)**:
    - `--bg-canvas: #050B1A`, `--bg-surface: #0A1428`, `--bg-subtle: #0F1C36`, `--bg-elevated: #12234A`
    - `--text-primary: #EAF2FF`, `--text-secondary: #A3B6D9`, `--text-tertiary: #7085AD`
    - `--accent-primary: #2E8BFF`, `--accent-cyan: #2BC8FF`, `--accent-gold: #F4B740`
    - `--glass-bg: rgba(8, 18, 40, 0.72)`, `--glass-text: #EAF2FF`
  - **Light Mode (`:root[data-theme="light"]`)**:
    - `--bg-canvas: #F2F6FC`, `--bg-surface: #FFFFFF`, `--bg-subtle: #EAF1FB`, `--bg-elevated: #FFFFFF`
    - `--text-primary: #0B1F44`, `--text-secondary: #3F5480`, `--text-tertiary: #667BA3`
    - `--accent-primary: #1463E0`, `--accent-cyan: #0A93D1`, `--accent-gold: #C4860E`
    - `--glass-bg: rgba(255, 255, 255, 0.82)`, `--glass-text: #0B1F44`
  - **Strict UI Rules**:
    - Never use hardcoded `#07090E` backgrounds or `#F8FAFC` text on page surfaces; always use CSS custom properties (`var(--bg-canvas)`, `var(--bg-surface)`, `var(--text-primary)`, `var(--text-secondary)`, `.vg-glass`) so Light Mode and Dark Mode both maintain full contrast.
    - No L-shaped corner reticle boxes (`.vg-card::before/after` removed) and no cramped "AI dashboard" boxes.

---

## 3. Three Reference Videos & Corresponding Modules

### Experience 1 — Video 1 (`c:\Users\youssef\Desktop\New folder\WhatsApp Video 2026-11-09 at 18.41.37.mp4`)
- **Reference**: *"AERO / ARCHIVE: General Dynamics F-16 Fighting Falcon"*
- **Implementation**: [`frontend/src/components/three/F16FalconAssembly.jsx`](file:///C:/Users/youssef/Desktop/Vortex-Gen%20remastered/frontend/src/components/three/F16FalconAssembly.jsx)
- **Key Features**:
  - **Cohesive Semi-Realistic Lofted 3D Geometry**: Continuous 2D cross-section station lofting for the F-16 fuselage, chine/LERX strakes, ventral diffuser intake, NACA 64A204 airfoil-section wings/stabilators/vertical tail, frameless gold-tinted bubble canopy with ACES II seat & HUD, 16-petal convergent-divergent F110 nozzle, retractable tricycle landing gear, and AIM-9X / AIM-120 / 370-gal external stores.
  - **12 Explodable Sub-Assemblies (`F16_PARTS`)**: Smooth 3D explosion vector interpolation (`[Explode]` / `[Reassemble]` button + continuous `0%–100%` slider + scroll-choreographed explosion on [`LandingPage.jsx`](file:///C:/Users/youssef/Desktop/Vortex-Gen%20remastered/frontend/src/pages/LandingPage.jsx)).
  - **Unrestricted Free-Orbit Camera (`selectedPart = null`)**:
    - Defaults to `null` ("Free Orbit" mode) so the user can freely rotate, pan, and zoom without the camera snapping or fighting mouse input.
    - Clicking an active part again, clicking empty space, or clicking the **`Free Orbit`** button clears selection.
  - **`[Launch Flight]` Afterburner Mode**: Retracts landing gear, ignites volumetric afterburner plume with Mach shock diamonds, and animates high-speed airflow streamlines.
  - **Scrollable `"Every part. A purpose."` Section**: Sticky editorial header + 12-part interactive component index on [`LandingPage.jsx`](file:///C:/Users/youssef/Desktop/Vortex-Gen%20remastered/frontend/src/pages/LandingPage.jsx) and [`Explorer.jsx`](file:///C:/Users/youssef/Desktop/Vortex-Gen%20remastered/frontend/src/pages/Explorer.jsx).

### Experience 2 — Video 2 (`c:\Users\youssef\Desktop\New folder\WhatsApp Video 2026-11-09 at 18.41.37 (1).mp4`)
- **Reference**: *"TURBOFAN EXPLORER: Suck · Squeeze · Bang · Blow"*
- **Implementation**: [`frontend/src/components/three/TurbofanExplorer3D.jsx`](file:///C:/Users/youssef/Desktop/Vortex-Gen%20remastered/frontend/src/components/three/TurbofanExplorer3D.jsx)
- **Key Features**:
  - Swept supercritical airliner wing section + sculpted under-wing pylon + aerodynamic lathe-profiled nacelle with **hinged clamshell cowling doors** (`Cowling open / closed`).
  - **Concentric Dual-Spool Shafts**: Inner cyan `LP Shaft (N1)` + outer amber `HP Shaft (N2)` rotating at independent physical RPMs.
  - **8 Explodable Axial Stages (`TURBOFAN_STAGES`)**: `FAN` (twisted wide-chord titanium blades), `BYPASS DUCT` (OGVs), `LP COMPRESSOR` (3 stages), `HP COMPRESSOR` (9 stages), `COMBUSTOR` (annular liner + fuel nozzles + volumetric flame), `HP TURBINE` (2 stages), `LP TURBINE` (5 stages), `EXHAUST NOZZLE` (chevrons + tailcone).
  - **Top `SUCK · SQUEEZE · BANG · BLOW` Bar + Bottom `0.0s – 28.0s` Guided Camera Tour Scrubber**.

### Experience 3 — Video 3 (`c:\Users\youssef\Desktop\New folder\WhatsApp Video 2026-11-09 at 18.41.37 (2).mp4`)
- **Reference**: *"Aerodynamics Studio: 2D Fluid & Wind Tunnel Simulator"*
- **Implementation**: [`frontend/src/components/cfd/NavierStokesTunnel2D.jsx`](file:///C:/Users/youssef/Desktop/Vortex-Gen%20remastered/frontend/src/components/cfd/NavierStokesTunnel2D.jsx)
- **Key Features**:
  - Real-time 60 FPS `220 × 110` Eulerian MAC-grid incompressible Navier-Stokes solver (Gauss-Seidel SOR pressure-Poisson projection, semi-Lagrangian advection, and Vorticity Confinement for von Kármán vortex streets).
  - **5 Visualization Modes**: `Smoke + Velocity`, `Velocity (Jet)`, `Vorticity (Curl)`, `Pressure (Field)`, `Particles Only`.
  - **Direct On-Canvas Manipulation**: Click and drag any obstacle inside the live flow, or drag the green CAD rotation ring handle to adjust Angle of Attack $\alpha$ in real time with live Lift $\vec{L}$ and Drag $\vec{D}$ vectors.

---

## 4. Completed Git Commit History (`origin/main`)
- `0e246aa`: `feat(3d): replace primitive boxes with cohesive lofted F-16, turbofan wing/nacelle, and widebody airliner models + light/dark glass callouts`
- `cda6d6e`: `feat(ui,3d): Fly Higher theme light/dark contrast fix, high-poly F-16 Falcon, and free-orbit deselection`
- `60342be`: `fix(explorer-landing): fix F16_PARTS specs crash and add scroll-choreographed 3D disassembly & interactive chapters`
- `d65967c`: `feat(3d-cfd): add F-16 12-part interactive disassembly, 8-stage concentric Turbofan Explorer, and 2D Eulerian Navier-Stokes CFD wind tunnel`

