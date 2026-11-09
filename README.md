# Vortex-Gen Remastered — 3D Aerospace Engineering & Flight Simulation Platform

Vortex-Gen Remastered is an interactive aerospace education, 3D aircraft & turbofan hangar, and digital CFD wind tunnel platform built for K-12 STEM camps, university aerodynamics labs, and faculty demonstrations.

## Core Architecture

1. **3D Hangar Explorer (`/explore`)**:
   - Full-scale articulated 3D commercial airliner (`fuselage`, `wings`, `airfoil`, `tail`, `engines`) and 3D cutaway high-bypass turbofan engine.
   - Slide-over subsystem theory drawers with dual-depth curriculum (`Foundation` K-12 track vs `Engineering` University track), real-time 3D actuator sliders, and inline knowledge checks.
2. **Unified 3D Simulation Cockpit (`/lab`)**:
   - **Station 1 — Aircraft Flight Dynamics, Stability & Pressurization**: 3-axis flight controls, CG vs Neutral Point static margin ($V_H$-coupled), vertical gust impulse response, adverse yaw, and proportional ISA cabin pressurization schedule.
   - **Station 2 — Wing & Airfoil CFD Wind Tunnel**: Parametric NACA 4-digit generator, NeuralFoil AI autotune (`/api/analyze` & `/api/analyze-batch`), Prandtl lifting-line 3D planform corrections, Korn-Lock transonic wave drag, single-spotlight Recharts polar suite, watertight Shoelace-integrated `.stl` CAD export, and Sutherland-viscosity `.pdf` engineering reports.
   - **Station 3 — 3D Turbofan Propulsion Rig**: Real-time Brayton cycle telemetry (net thrust, gross thrust, ram drag, TSFC, N1/N2 spool speeds, and unified EGT) coupled to a rotating 3D cutaway turbofan mesh.
3. **Device-Bound Guest Mode, Event Cohorts & Founder Live Host Console (`/events`, `/login`, `/admin`)**:
   - Visitors can enter immediately with their display name bound to a hardware/browser fingerprint (`DEV-...`), or join a workshop cohort (`VG-YOUTH`, `VG-UNI26`, `VG-VIP01`).
   - From `/admin`, the founder or instructor can upgrade any active guest device to `vip_full` or `event_cohort` in one click—unlocking their session in real time without registration or page reload.

## Local Development

### 1. Frontend (`frontend/`)
```bash
cd frontend
npm install
npm run dev
```

### 2. Backend & NeuralFoil Daemon (`backend/`)
```bash
cd backend
npm install
node server.js
```

## Architecture & Design Specification
See [`DESIGN_AND_ARCHITECTURE.md`](./DESIGN_AND_ARCHITECTURE.md) for the complete codebase audit, design system tokens, WCAG contrast ratios, and security hardening blueprint.
