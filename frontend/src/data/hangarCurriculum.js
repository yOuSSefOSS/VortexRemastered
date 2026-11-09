// ============================================================================
// Unified Aerospace Curriculum Data for the 3D Hangar Explorer & Drawers
// Consolidates /explore/* and /principles-of-flight/* into 5 interactive
// 3D subsystems with Foundation (K-12) and Engineering (University) tracks.
// ============================================================================

export const HANGAR_SUBSYSTEMS = [
  {
    id: 'fuselage',
    title: 'Fuselage & cabin pressurization',
    shortLabel: 'Fuselage',
    subtitle: 'Primary structural body, payload bay, and cylindrical pressure vessel',
    cockpitMode: 'flight_dynamics',
    cameraTarget: [0.6, 0.1, 0],
    cameraPosition: [5.5, 2.2, 6.2],
    keyMetrics: [
      { label: 'Structural form', value: 'Semi-monocoque Al-2024 / CFRP', baseline: 'Frames, stringers & stressed skin' },
      { label: 'Max differential pressure', value: '8.6 PSI (59.3 kPa)', baseline: '8,000 ft cabin at 41,000 ft cruise' },
      { label: 'Fineness ratio (L/D)', value: '8.5 : 1 to 11.0 : 1', baseline: 'Minimizes pressure & skin-friction drag' },
    ],
    foundationContent: {
      overview:
        'The fuselage is the central body of the aircraft that holds the flight deck, passengers, and cargo, while tying the wings, tail, and landing gear into one rigid frame.',
      sections: [
        {
          heading: 'Why airplanes are shaped like cylindrical tubes',
          body:
            'At 35,000 feet, outside air pressure is only about one-quarter of sea-level pressure. To let passengers breathe normally, the cabin is pumped full of compressed air. A circular cylinder resists this outward push evenly in every direction without bending.',
          formula: 'Hoop stress: σ = (ΔP × r) / t',
        },
        {
          heading: 'Internal skeleton: Frames, stringers, and skin',
          body:
            'Instead of using thick, heavy metal walls, modern airliners use a thin aluminum or carbon-fiber skin (~2 mm thick) stiffened by ring-shaped frames and lengthwise stringers. Enable the 3D cutaway toggle below to inspect the internal floor beams and aft pressure bulkhead.',
          formula: 'Weight = Mass × Gravity (g = 9.81 m/s²)',
        },
      ],
    },
    engineeringContent: {
      overview:
        'A commercial transport fuselage operates simultaneously as a thin-walled biaxial pressure vessel and a cantilevered bending beam subjected to wing root reactions, empennage trim loads, and landing gear impact.',
      sections: [
        {
          heading: 'Thin-walled pressure vessel mechanics',
          body:
            'Across a pressure differential ΔP = P_cabin − P_ambient, circumferential (hoop) stress σ_θ = (ΔP·r)/t is exactly twice the longitudinal axial stress σ_z = (ΔP·r)/(2t). Consequently, longitudinal skin splices and tear straps are engineered to arrest axial crack propagation between circumferential frames.',
          formula: 'σ_θ = (ΔP · r) / t ,   σ_z = (ΔP · r) / (2t)',
        },
        {
          heading: 'Boundary layer & fineness ratio optimization',
          body:
            'Fuselage parasite drag comprises turbulent skin-friction drag (governed by wetted area S_wet and Reynolds number Re_L) and aft-body form drag. A fineness ratio L/d between 8.5 and 10.5 minimizes total zero-lift drag CD,0 while preventing aft upsweep flow separation during rotation.',
          formula: 'CD,0,fuse = Cf(ReL) · FF · (Swet / Sref)',
        },
      ],
    },
    interactiveControls: [
      { key: 'cutaway', type: 'toggle', label: 'Show internal structural cutaway' },
      { key: 'cruiseAltFt', type: 'slider', label: 'Simulated cruise altitude', min: 0, max: 41000, step: 1000, unit: 'ft' },
    ],
    quiz: [
      {
        question: 'Why do high-altitude transport aircraft use a circular fuselage cross-section rather than a square box?',
        options: [
          'A circle carries internal cabin pressure uniformly in tension without severe corner bending stresses',
          'A square cross-section cannot generate thrust',
          'Circular fuselages eliminate gravity inside the cabin',
          'Square windows are required for supersonic flight',
        ],
        correctAnswer: 0,
        explanation:
          'Internal pressurization creates uniform hoop tension in a cylindrical shell, whereas flat panels and corners experience high bending moments and fatigue.',
      },
      {
        question: 'In a pressurized cylindrical fuselage of radius r and wall thickness t, how does hoop stress compare to longitudinal stress?',
        options: [
          'Hoop stress is half of longitudinal stress',
          'Hoop stress is twice longitudinal stress',
          'Both stresses are always zero below 10,000 ft',
          'They are equal regardless of radius',
        ],
        correctAnswer: 1,
        explanation:
          'From equilibrium of a thin cylindrical shell, σ_θ = (ΔP·r)/t is twice the axial stress σ_z = (ΔP·r)/(2t).',
      },
    ],
  },
  {
    id: 'wings',
    title: 'Swept wings, high-lift devices & roll control',
    shortLabel: 'Main wings',
    subtitle: 'Planform geometry, aspect ratio, flaps/slats, ailerons, and transonic sweep',
    cockpitMode: 'wind_tunnel',
    cameraTarget: [0.0, -0.1, 2.2],
    cameraPosition: [3.8, 2.6, 5.8],
    keyMetrics: [
      { label: 'Aspect ratio (AR = b²/S)', value: '9.4 : 1', baseline: 'Reduces wingtip vortex induced drag CDi' },
      { label: 'Quarter-chord sweep (Λ)', value: '25.0°', baseline: 'Delays shockwave onset above Mach 0.78' },
      { label: 'High-lift system', value: 'Leading-edge slats + Fowler flaps', baseline: '+75% CL,max for low-speed approach' },
    ],
    foundationContent: {
      overview:
        'The wings generate the upward Lift force that overcomes the aircraft’s Weight. Their span, sweep angle, and movable edge panels allow the plane to fly fast at cruise yet land safely at low speeds.',
      sections: [
        {
          heading: 'Flaps and slats: Changing wing shape for takeoff and landing',
          body:
            'Cruising at 500 mph requires a thin, sleek wing, but landing safely requires high lift at 150 mph. Extending trailing-edge Fowler flaps slides the rear of the wing backward and downward—increasing both wing area and curvature (camber). Leading-edge slats open a slot at the front to delay stall at steep angles.',
          formula: 'L = ½ ρ V² (S + ΔS) (CL + ΔCL)',
        },
        {
          heading: 'Ailerons and roll control',
          body:
            'Near the outer wingtips sit the ailerons. When the pilot banks left, the left aileron deflects up (decreasing lift) and the right aileron deflects down (increasing lift), rolling the aircraft around its longitudinal axis.',
          formula: 'Rolling moment: L_roll = ΔLift × Moment arm y',
        },
      ],
    },
    engineeringContent: {
      overview:
        'Finite wing aerodynamics balances lift-induced vortex drag at low speeds against compressible wave drag in the transonic cruise regime.',
      sections: [
        {
          heading: 'Finite span, wingtip vortices & induced drag (CDi)',
          body:
            'High-pressure air beneath the wing spills around the wingtips toward the low-pressure upper surface, shedding trailing vortices that induce downwash w_i. This tilts the local relative wind downward by α_i = CL / (π·e·AR), rotating the aerodynamic force vector rearward to create induced drag.',
          formula: 'CDi = CL² / (π · e · AR)',
        },
        {
          heading: 'Sweep theory & critical Mach number (M_crit)',
          body:
            'By sweeping the wing quarter-chord line by angle Λ, only the velocity component normal to the leading edge (M_n = M_∞ cos Λ) accelerates over the airfoil thickness distribution. This raises the critical Mach number and delays transonic shock formation and wave drag divergence.',
          formula: 'Mn = M∞ cos(Λ) ,   CLα,swept ≈ CLα cos(Λ)',
        },
      ],
    },
    interactiveControls: [
      { key: 'flapAngle', type: 'slider', label: 'Fowler flap deflection', min: 0, max: 40, step: 1, unit: '°' },
      { key: 'slatExt', type: 'slider', label: 'Leading-edge slat extension', min: 0, max: 100, step: 5, unit: '%' },
      { key: 'aileronDeflection', type: 'slider', label: 'Differential aileron roll input', min: -25, max: 25, step: 1, unit: '°' },
    ],
    quiz: [
      {
        question: 'How does increasing a wing’s Aspect Ratio (AR = b²/S) affect induced drag at a given lift coefficient?',
        options: [
          'It decreases induced drag because wingtip vortices affect a smaller fraction of the span',
          'It increases induced drag linearly',
          'It has no effect on induced drag',
          'It eliminates skin-friction drag',
        ],
        correctAnswer: 0,
        explanation:
          'Induced drag is inversely proportional to Aspect Ratio: CDi = CL² / (π · e · AR). Longer, narrower wings suffer less tip-vortex downwash loss.',
      },
      {
        question: 'What is the primary aerodynamic difference between trailing-edge flaps and leading-edge slats?',
        options: [
          'Flaps increase camber and lift at a given AoA, whereas slats energize the boundary layer to increase the stall angle',
          'Flaps only work in supersonic flight',
          'Slats decrease the stall angle to make the wing stall earlier',
          'Flaps control yaw while slats control pitch',
        ],
        correctAnswer: 0,
        explanation:
          'Trailing-edge flaps shift the lift curve upward (higher CL at a given α), while leading-edge slats delay flow separation so the wing can reach a higher critical angle of attack.',
      },
    ],
  },
  {
    id: 'airfoil',
    title: 'Airfoil cross-section, lift equation & stall physics',
    shortLabel: 'Airfoil section',
    subtitle: '2D wing rib geometry, Bernoulli & Newton pressure distribution, and boundary-layer separation',
    cockpitMode: 'wind_tunnel',
    cameraTarget: [0.1, -0.05, 1.85],
    cameraPosition: [2.4, 0.9, 3.1],
    keyMetrics: [
      { label: 'Reference profile', value: 'NACA 2412 (2% camber, 12% thick)', baseline: 'Max camber at 40% chord' },
      { label: 'Critical stall angle (α_crit)', value: '+15.0° to +16.0°', baseline: 'Onset of upper-surface flow separation' },
      { label: 'Peak L/D efficiency', value: 'α = +4.0° to +6.5°', baseline: 'Minimum total drag per unit lift' },
    ],
    foundationContent: {
      overview:
        'Slice a wing from front to back and you reveal its airfoil shape. The curved upper surface and angled chord line deflect oncoming air downward and create a strong low-pressure suction zone on top of the wing.',
      sections: [
        {
          heading: 'How Bernoulli and Newton work together to create lift',
          body:
            'As air flows over the curved upper surface, streamlines squeeze together and accelerate (Continuity: A₁V₁ = A₂V₂). By Bernoulli’s principle, faster flow reduces static pressure above the wing. Simultaneously, the wing deflects a mass of air downward (downwash), and by Newton’s Third Law, the air pushes the wing upward.',
          formula: 'P + ½ ρ V² = Constant ,   L = ½ ρ V² S CL',
        },
        {
          heading: 'Angle of attack (α) and aerodynamic stall',
          body:
            'Tilting the nose of the airfoil up increases the Angle of Attack (α) and generates more lift—up to about 15°. Beyond this critical angle, air can no longer follow the steep upper curve; it breaks away into turbulent swirls, causing a sudden drop in lift known as a Stall.',
          formula: 'Stall occurs when α > α_critical (~15°)',
        },
      ],
    },
    engineeringContent: {
      overview:
        'Two-dimensional airfoil performance is governed by surface pressure coefficient integration Cp(x), circulation Γ (Kutta-Joukowski theorem), and adverse pressure gradient boundary-layer transition.',
      sections: [
        {
          heading: 'NACA 4-digit parameterization & circulation',
          body:
            'In a NACA MPXX profile, M is maximum camber in percent chord, P is camber location in tenths of chord, and XX is maximum thickness t/c in percent chord. Positive camber shifts the zero-lift angle α_L=0 to negative values, producing positive circulation Γ = ∮ V·ds even at α = 0°.',
          formula: 'L′ = ρ∞ V∞ Γ ,   CL ≈ 2π (α − α_L=0)',
        },
        {
          heading: 'Adverse pressure gradients & boundary-layer separation',
          body:
            'Downstream of the minimum-pressure suction peak near the leading edge, flow must decelerate against a rising (adverse) pressure gradient dP/dx > 0. At high α, viscous momentum loss inside the boundary layer causes wall shear stress τ_w to reach zero, triggering flow reversal and stall.',
          formula: 'Cp = (p − p∞) / (½ ρ∞ V∞²)',
        },
      ],
    },
    interactiveControls: [
      { key: 'aoaDeg', type: 'slider', label: 'Section angle of attack (α)', min: -10, max: 20, step: 0.5, unit: '°' },
      { key: 'showVectors', type: 'toggle', label: 'Display 3D lift & drag vectors' },
    ],
    quiz: [
      {
        question: 'In the NACA 2412 airfoil designation, what do the digits 2, 4, and 12 represent?',
        options: [
          '2% maximum camber, located at 40% chord, with 12% maximum thickness-to-chord ratio',
          '24% thickness and 12% camber',
          '2.4 meters chord length and 12 degrees stall angle',
          'Symmetrical airfoil with 24.12% flap chord',
        ],
        correctAnswer: 0,
        explanation:
          'NACA 4-digit codes define: 1st digit = max camber (% chord), 2nd digit = position of max camber (tenths of chord), last 2 digits = max thickness (% chord).',
      },
      {
        question: 'If you double the true airspeed (V) of an aircraft while keeping density, wing area, and CL constant, what happens to Lift?',
        options: [
          'Lift doubles (2×)',
          'Lift quadruples (4×)',
          'Lift stays the same',
          'Lift is cut in half',
        ],
        correctAnswer: 1,
        explanation:
          'Because dynamic pressure q = ½ρV² depends on the square of velocity, doubling V multiplies Lift by 2² = 4.',
      },
    ],
  },
  {
    id: 'tail',
    title: 'Empennage, longitudinal stability & 3-axis controls',
    shortLabel: 'Tail & stability',
    subtitle: 'Horizontal & vertical stabilizers, CG vs. Neutral Point, elevator pitch, and rudder yaw',
    cockpitMode: 'flight_dynamics',
    cameraTarget: [-3.2, 0.5, 0],
    cameraPosition: [-6.2, 2.5, 4.8],
    keyMetrics: [
      { label: 'Static margin (x_NP − x_CG)', value: '+8% to +15% MAC', baseline: 'Positive restoring pitching moment' },
      { label: 'Horizontal tail role', value: 'Downward trim lift & pitch damping', baseline: 'Balances nose-down wing-body moment' },
      { label: 'Vertical tail & rudder', value: 'Directional stability & turn coordination', baseline: 'Counters aileron adverse yaw' },
    ],
    foundationContent: {
      overview:
        'The tail assembly (empennage) acts like the feathers on an arrow. It keeps the aircraft pointed stably into the wind and houses the Elevator (pitch up/down) and Rudder (yaw left/right).',
      sections: [
        {
          heading: 'Center of Gravity (CG) vs. Neutral Point (NP)',
          body:
            'For an airplane to be naturally stable, its Center of Gravity (CG) must sit ahead of its aerodynamic Neutral Point (NP). That way, if an upward wind gust pitches the nose up, the tail generates a strong restoring force that pushes the nose back down to level flight.',
          formula: 'Static margin = x_NP − x_CG > 0 (Stable)',
        },
        {
          heading: 'Elevator, Rudder, and Adverse Yaw',
          body:
            'The Elevator on the horizontal tail pitches the nose up or down. The Rudder on the vertical fin yaws the nose left or right—primarily to keep turns coordinated when banking with the ailerons.',
          formula: 'Pitch moment: M = F_tail × L_tail',
        },
      ],
    },
    engineeringContent: {
      overview:
        'Longitudinal static and dynamic stability depend on the Horizontal Tail Volume Ratio VH and the negative slope of the pitching moment coefficient ∂Cm/∂α < 0.',
      sections: [
        {
          heading: 'Horizontal tail volume ratio (VH) & Neutral Point',
          body:
            'Increasing horizontal tail area St or moment arm Lt increases the tail volume ratio VH = (St·Lt)/(Sw·c̄), shifting the aircraft Neutral Point aft and increasing static margin. A statically stable aircraft (∂Cm/∂CL = −SM < 0) exhibits two longitudinal dynamic eigenmodes: a heavily damped fast Short-Period mode and a lightly damped slow Phugoid mode.',
          formula: 'x_NP = x_AC,w + η_h (a_t / a_w)(1 − dε/dα) V_H',
        },
        {
          heading: 'Adverse yaw & lateral-directional coupling',
          body:
            'During a roll entry, the downward-deflected aileron on the rising wing produces higher lift and therefore higher induced drag than the upward-deflected aileron on the descending wing. This asymmetric drag creates a yawing moment opposite to the roll direction (Adverse Yaw), requiring coordinated rudder input.',
          formula: 'N_yaw = Y_v · l_v + ΔD_aileron · (b / 2)',
        },
      ],
    },
    interactiveControls: [
      { key: 'elevatorDeflection', type: 'slider', label: 'Elevator deflection (pitch)', min: -25, max: 25, step: 1, unit: '°' },
      { key: 'rudderDeflection', type: 'slider', label: 'Rudder deflection (yaw)', min: -25, max: 25, step: 1, unit: '°' },
      { key: 'cgPositionPct', type: 'slider', label: 'Center of gravity (% MAC)', min: 15, max: 50, step: 1, unit: '% MAC' },
    ],
    quiz: [
      {
        question: 'What happens if an aircraft is loaded so tail-heavy that its Center of Gravity (CG) moves behind the Neutral Point (NP)?',
        options: [
          'Static margin becomes negative and the aircraft becomes longitudinally unstable (pitch disturbances diverge)',
          'The aircraft becomes twice as stable',
          'Fuel burn drops to zero',
          'The rudder stops working',
        ],
        correctAnswer: 0,
        explanation:
          'When CG is aft of NP, ∂Cm/∂α > 0. Any nose-up disturbance creates an additional nose-up pitching moment, causing rapid divergence.',
      },
      {
        question: 'What is the Golden Rule connecting Static Stability and Dynamic Stability?',
        options: [
          'An aircraft must have positive static stability before it can achieve positive dynamic stability',
          'Dynamic stability does not require static stability',
          'Neutral static stability guarantees damped oscillations',
          'Only supersonic aircraft have dynamic stability',
        ],
        correctAnswer: 0,
        explanation:
          'Without an initial restoring tendency toward equilibrium (positive static stability), oscillations or divergences cannot damp back to trim.',
      },
    ],
  },
  {
    id: 'engines',
    title: 'High-bypass turbofan propulsion & Brayton cycle',
    shortLabel: 'Turbofan engines',
    subtitle: '3D multi-stage fan, compressor, combustor, turbine, bypass ratio, and altitude thrust',
    cockpitMode: 'turbofan',
    cameraTarget: [0.4, -0.65, 1.35],
    cameraPosition: [3.2, -0.1, 3.6],
    keyMetrics: [
      { label: 'Bypass ratio (BPR)', value: '8.5 : 1 to 11.0 : 1', baseline: '~75% of thrust produced by cold bypass fan' },
      { label: 'Thermodynamic cycle', value: 'Open Brayton cycle', baseline: 'Intake → Compression → Combustion → Expansion' },
      { label: 'Tropopause boundary', value: '11.0 km (−56.5°C isothermal)', baseline: 'High cold-air thermal efficiency at cruise' },
    ],
    foundationContent: {
      overview:
        'Modern airliners use High-Bypass Turbofan engines. Instead of blasting all air through the fiery core, a giant front fan pushes 8 to 10 times more cool air around the outside of the core—producing massive, quiet, fuel-efficient thrust.',
      sections: [
        {
          heading: 'Suck, Squeeze, Bang, Blow: The 4 stages of a jet engine',
          body:
            '1. Fan & Inlet (Suck): Draws in a huge volume of air. 2. Low & High Pressure Compressors (Squeeze): Spinning blades pack the core air to 40× atmospheric pressure. 3. Combustor (Bang): Fuel sprays and burns continuously at ~1,500°C. 4. Turbines & Nozzle (Blow): Expanding hot gas spins the turbines (which drive the front fan via concentric shafts) and accelerates out the nozzle.',
          formula: 'Net thrust: F_N = ṁ_total · V_exit − ṁ_total · V_flight',
        },
        {
          heading: 'Why Bypass Ratio matters',
          body:
            'Accelerating a huge mass of air by a moderate amount wastes far less kinetic energy in the wake than accelerating a tiny jet of air to extreme speed. Switch the 3D Hangar view to the 3D Turbofan Cutaway to watch the N1 fan and N2 core spools rotate.',
          formula: 'Bypass Ratio (BPR) = ṁ_bypass / ṁ_core',
        },
      ],
    },
    engineeringContent: {
      overview:
        'High-bypass two-spool turbofans decouple specific thrust from propulsive efficiency η_p by extracting shaft work in a multi-stage Low-Pressure Turbine (LPT) to drive a large-diameter ducted fan.',
      sections: [
        {
          heading: 'Momentum thrust, ram drag & propulsive efficiency',
          body:
            'Net thrust is the sum of core and bypass momentum fluxes minus inlet ram drag: FN = ṁ_core(V_e,core − V0) + ṁ_core·BPR·(V_e,fan − V0). Propulsive efficiency η_p = 2V0 / (V0 + V_eff) increases as effective exhaust velocity V_eff approaches flight speed V0, explaining why higher BPR reduces Thrust Specific Fuel Consumption (TSFC).',
          formula: 'FN = ṁc[(Ve,c − V0) + BPR(Ve,f − V0)] ,   ηp = 2V0 / (V0 + Veff)',
        },
        {
          heading: 'ISA altitude lapse & stratospheric cruise',
          body:
            'In the troposphere (0–11 km), ambient temperature drops at 6.5 K/km. Above the 11 km tropopause, temperature remains isothermal at 216.65 K (−56.5°C) while density decays exponentially. Cold ambient inlet temperature T0 lowers compressor work for a given pressure ratio (T04/T02), maximizing thermal efficiency at 35,000–40,000 ft.',
          formula: 'P(h > 11 km) = P_11 · exp[−g0(h − 11000) / (R · T_11)]',
        },
      ],
    },
    interactiveControls: [
      { key: 'throttlePct', type: 'slider', label: 'Engine throttle (N1 RPM)', min: 20, max: 100, step: 1, unit: '%' },
      { key: 'cutaway', type: 'toggle', label: 'Expose internal compressor & combustor stages' },
    ],
    quiz: [
      {
        question: 'In a modern high-bypass turbofan engine (e.g., BPR = 9:1), which component generates the majority of the forward thrust?',
        options: [
          'The large front bypass fan accelerating cold air through the outer duct',
          'The afterburner nozzle',
          'The starter motor',
          'The cabin pressurization bleed valve',
        ],
        correctAnswer: 0,
        explanation:
          'In a high-bypass turbofan, 70%–80% of total net thrust is produced by the cold bypass airflow driven by the front fan stage.',
      },
      {
        question: 'According to the International Standard Atmosphere (ISA), how does ambient temperature behave between 11 km and 20 km altitude (the lower stratosphere)?',
        options: [
          'It remains constant (isothermal) at −56.5°C (216.65 K) while pressure continues to decrease exponentially',
          'It jumps back to +15°C sea-level temperature',
          'It rises to +100°C',
          'Pressure and density increase with altitude',
        ],
        correctAnswer: 0,
        explanation:
          'Above the 11 km tropopause up to 20 km, the lower stratosphere is isothermal at 216.65 K (−56.5°C), while pressure decays exponentially with height.',
      },
    ],
  },
];

// Normalize subsystem metadata & controls so all Hangar and Drawer views share a consistent contract
const SUBSYSTEM_META = {
  fuselage: {
    code: 'SYS-01',
    category: 'Airframe structure',
    controls: [
      { key: 'cutawayRatio', label: 'Structural skin cutaway', unit: '', min: 0, max: 1, step: 0.05, defaultValue: 0.35 },
      { key: 'altitudeMeters', label: 'Cruise pressure altitude', unit: ' m', min: 0, max: 13000, step: 250, defaultValue: 10668 },
    ],
  },
  wings: {
    code: 'SYS-02',
    category: 'Lifting planform',
    controls: [
      { key: 'flapDeg', label: 'Trailing-edge Fowler flaps', unit: '°', min: 0, max: 40, step: 1, defaultValue: 15 },
      { key: 'slatDeg', label: 'Leading-edge slats', unit: '°', min: 0, max: 25, step: 1, defaultValue: 10 },
      { key: 'aileronDeg', label: 'Differential ailerons', unit: '°', min: -25, max: 25, step: 1, defaultValue: 0 },
      { key: 'sweepDeg', label: 'Quarter-chord wing sweep', unit: '°', min: 0, max: 40, step: 1, defaultValue: 25 },
    ],
  },
  airfoil: {
    code: 'SYS-03',
    category: 'Boundary layer section',
    controls: [
      { key: 'aoaDeg', label: 'Section angle of attack (α)', unit: '°', min: -6, max: 18, step: 0.5, defaultValue: 4 },
      { key: 'camberPct', label: 'Maximum camber (m)', unit: '% c', min: 0, max: 8, step: 0.5, defaultValue: 2 },
    ],
  },
  tail: {
    code: 'SYS-04',
    category: 'Stability & trim',
    controls: [
      { key: 'elevatorDeg', label: 'Elevator pitch deflection', unit: '°', min: -20, max: 20, step: 1, defaultValue: 0 },
      { key: 'rudderDeg', label: 'Vertical rudder deflection', unit: '°', min: -25, max: 25, step: 1, defaultValue: 0 },
      { key: 'cgPercentMac', label: 'Center of gravity (% MAC)', unit: '%', min: 14, max: 40, step: 0.5, defaultValue: 25 },
    ],
  },
  engines: {
    code: 'SYS-05',
    category: 'High-bypass propulsion',
    controls: [
      { key: 'throttlePct', label: 'FADEC throttle setting', unit: '%', min: 15, max: 100, step: 1, defaultValue: 78 },
      { key: 'bypassRatio', label: 'Engine bypass ratio (BPR)', unit: ' : 1', min: 2, max: 12, step: 0.5, defaultValue: 9 },
      { key: 'cutawayRatio', label: 'Nacelle & core cowling cutaway', unit: '', min: 0, max: 1, step: 0.05, defaultValue: 0.5 },
    ],
  },
};

HANGAR_SUBSYSTEMS.forEach((sub) => {
  const meta = SUBSYSTEM_META[sub.id] || {};
  sub.name = sub.name || sub.title;
  sub.code = sub.code || meta.code || 'SYS-00';
  sub.category = sub.category || meta.category || 'Aerospace subsystem';
  sub.controls = meta.controls || [];

  if (sub.foundationContent) {
    sub.foundationContent.summary = sub.foundationContent.summary || sub.foundationContent.overview;
  }
  if (sub.engineeringContent) {
    sub.engineeringContent.summary = sub.engineeringContent.summary || sub.engineeringContent.overview;
    sub.engineeringContent.equations =
      sub.engineeringContent.equations ||
      (sub.engineeringContent.sections || [])
        .filter((s) => s.formula)
        .map((s) => ({
          label: s.heading,
          formula: s.formula,
          variables: 'Standard SI aerospace nomenclature',
        }));
  }
  if (Array.isArray(sub.quiz)) {
    sub.quiz.forEach((q) => {
      if (q.correctIndex === undefined) {
        q.correctIndex = q.correctAnswer ?? 0;
      }
    });
  }
});

export function getSubsystemById(id) {
  return HANGAR_SUBSYSTEMS.find((s) => s.id === id) || null;
}
