import React from 'react';
import { jsPDF } from 'jspdf';
import { computeISAAtmosphere } from '../domain/isaAtmosphere';
import { formatNacaCode } from '../domain/nacaGeometry';

/**
 * Generates a structured aerospace engineering PDF report with Sutherland viscosity Reynolds math
 * and null-safe comparison airfoil support.
 */
export function generateAerospacePdfReport({
    shape = { camber: 2, maxCamberLoc: 4, thickness: 12, aoa: 4 },
    compareShape = null,
    flapDeg = 0,
    slatDeg = 0,
    sweepDeg = 0,
    aspectRatio = 8.5,
    altitudeMeters = 0,
    airspeedMs = 70,
    chordMeters = 1.6,
    aeroMetrics = { cl: 0.65, cd: 0.012, cm: -0.04, ld: 54.2, isStalled: false },
    authorName = 'Engineering Cadet',
}) {
    const safeCompare = compareShape || { camber: 0, maxCamberLoc: 0, thickness: 12 };
    const isa = computeISAAtmosphere(altitudeMeters);

    // Exact Reynolds number using Sutherland dynamic viscosity: Re = (rho * V * c) / mu
    const reynolds = (isa.densityKgM3 * airspeedMs * chordMeters) / isa.viscosityPaS;
    const mach = airspeedMs / isa.speedOfSoundMs;

    const primaryCode = formatNacaCode(shape.camber, shape.maxCamberLoc, shape.thickness);
    const compareCode = formatNacaCode(
        safeCompare.camber,
        safeCompare.maxCamberLoc,
        safeCompare.thickness
    );

    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const margin = 44;
    let y = 52;

    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(15, 18, 23);
    doc.text('VORTEX-GEN AEROSPACE TELEMETRY REPORT', margin, y);

    y += 18;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(82, 92, 110);
    doc.text(
        `Prepared by: ${authorName}   |   Date: ${new Date().toISOString().slice(0, 10)}   |   Primary Section: ${primaryCode}`,
        margin,
        y
    );

    y += 16;
    doc.setDrawColor(218, 223, 232);
    doc.line(margin, y, 550, y);

    // Section 1: ISA Atmosphere & Flow Similarity
    y += 24;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(31, 91, 216);
    doc.text('1. ISA Atmosphere & Flow Similarity Parameters', margin, y);

    y += 18;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(15, 18, 23);

    const envRows = [
        ['Altitude (ISA)', `${Math.round(altitudeMeters)} m (${Math.round(isa.altitudeFt)} ft)`],
        ['Static Temperature (T)', `${isa.temperatureK.toFixed(2)} K (${isa.temperatureC.toFixed(2)} °C)`],
        ['Static Pressure (P)', `${isa.pressureKPa.toFixed(2)} kPa`],
        ['Air Density (rho)', `${isa.densityKgM3.toFixed(4)} kg/m^3`],
        ['Dynamic Viscosity (Sutherland mu)', `${isa.viscosityPaS.toExponential(3)} Pa·s`],
        ['Freestream Velocity (V)', `${airspeedMs.toFixed(1)} m/s (Mach ${mach.toFixed(3)})`],
        ['Chord Reynolds Number (Re)', `${Math.round(reynolds).toLocaleString()}`],
    ];

    envRows.forEach(([label, val]) => {
        doc.text(label, margin, y);
        doc.text(val, 310, y);
        y += 16;
    });

    // Section 2: Wing Planform & High-Lift Configuration
    y += 14;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(31, 91, 216);
    doc.text('2. Wing Planform & High-Lift Configuration', margin, y);

    y += 18;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(15, 18, 23);

    const geomRows = [
        ['Primary Airfoil Profile', `${primaryCode} (m=${shape.camber}%, p=${shape.maxCamberLoc * 10}%, t=${shape.thickness}%)`],
        ['Baseline Comparison Profile', `${compareCode}`],
        ['Angle of Attack (alpha)', `${Number(shape.aoa).toFixed(2)} deg`],
        ['Quarter-Chord Sweep (Lambda)', `${Number(sweepDeg).toFixed(1)} deg`],
        ['Wing Aspect Ratio (AR)', `${Number(aspectRatio).toFixed(2)}`],
        ['Trailing-Edge Fowler Flap / Slat', `${Number(flapDeg).toFixed(1)} deg / ${Number(slatDeg).toFixed(1)} deg`],
    ];

    geomRows.forEach(([label, val]) => {
        doc.text(label, margin, y);
        doc.text(val, 310, y);
        y += 16;
    });

    // Section 3: Aerodynamic Coefficients
    y += 14;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(31, 91, 216);
    doc.text('3. Evaluated 3D Aerodynamic Coefficients', margin, y);

    y += 18;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(15, 18, 23);

    const cl = Number(aeroMetrics.cl || 0);
    const cd = Number(aeroMetrics.cd || 0.012);
    const cm = Number(aeroMetrics.cm || 0);
    const ld = cd > 0.0001 ? cl / cd : 0;

    const aeroRows = [
        ['3D Lift Coefficient (CL)', cl.toFixed(4)],
        ['Total Drag Coefficient (CD)', cd.toFixed(4)],
        ['Quarter-Chord Pitching Moment (CM)', cm.toFixed(4)],
        ['Aerodynamic Efficiency (L/D)', ld.toFixed(2)],
        ['Boundary Layer Flow Regime', aeroMetrics.isStalled ? 'Separated / Post-Stall' : 'Attached Flow'],
    ];

    aeroRows.forEach(([label, val]) => {
        doc.text(label, margin, y);
        doc.text(val, 310, y);
        y += 16;
    });

    y += 24;
    doc.setDrawColor(218, 223, 232);
    doc.line(margin, y, 550, y);
    y += 16;
    doc.setFontSize(9);
    doc.setTextColor(122, 134, 153);
    doc.text(
        'Generated by Vortex-Gen Remastered Digital Wind Tunnel & Flight Mechanics Cockpit.',
        margin,
        y
    );

    doc.save(`${primaryCode.replace(/\s+/g, '_')}_Aerospace_Report.pdf`);
}

export default function PdfReportTemplate() {
    return null;
}

