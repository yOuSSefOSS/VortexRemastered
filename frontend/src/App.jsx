import React, { Suspense, lazy, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import AppShell from './layouts/AppShell';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import EventsPage from './pages/EventsPage';
import Admin from './pages/Admin';
import { PrivacyPolicy, TermsOfService } from './pages/LegalPages';
import { preloadF16Assets } from './components/three/F16FalconAssembly';
import { preloadTurbofanAssets } from './components/three/TurbofanExplorer3D';
import InitialPreloader from './components/brand/InitialPreloader';

const loadExplorer = () => import('./pages/Explorer');
const loadCockpitLab = () => import('./pages/CockpitLab');

const Explorer = lazy(loadExplorer);
const CockpitLab = lazy(loadCockpitLab);

export function preloadRoute(path) {
    if (!path) return;
    if (path.startsWith('/explore')) {
        loadExplorer();
        preloadF16Assets();
        preloadTurbofanAssets();
    } else if (path.startsWith('/lab')) {
        loadCockpitLab();
    }
}

function RouteLoadingFallback() {
    return (
        <div
            style={{
                height: 'calc(100vh - 62px)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                background: 'var(--bg-canvas)',
                color: 'var(--text-secondary)',
                fontSize: '0.875rem',
            }}
        >
            <div
                className="mono"
                style={{
                    fontSize: '11px',
                    letterSpacing: '0.16em',
                    color: 'var(--accent-primary)',
                    fontWeight: 700,
                }}
            >
                VORTEX-GEN · PRELOADING 3D TELEMETRY
            </div>
            <div>Preparing interactive aerospace workspace...</div>
        </div>
    );
}

export default function App() {
    const handlePreloadRoutes = useCallback(async () => {
        await Promise.allSettled([loadExplorer(), loadCockpitLab()]);
    }, []);

    return (
        <AppProvider>
            <BrowserRouter>
                <InitialPreloader onPreloadRoutes={handlePreloadRoutes} />
                <AppShell>
                    <Suspense fallback={<RouteLoadingFallback />}>
                        <Routes>
                            <Route path="/" element={<LandingPage />} />
                            <Route path="/explore" element={<Explorer />} />
                            <Route path="/explore/:subsystemId" element={<Explorer />} />
                            <Route path="/lab" element={<CockpitLab />} />
                            <Route
                                path="/lab/airfoil"
                                element={<Navigate to="/lab?station=windtunnel" replace />}
                            />
                            {/* Legacy Principles of Flight routes redirect into unified 3D Hangar */}
                            <Route
                                path="/principles-of-flight"
                                element={<Navigate to="/explore/wings" replace />}
                            />
                            <Route
                                path="/principles-of-flight/:chapterId"
                                element={<Navigate to="/explore/wings" replace />}
                            />
                            <Route path="/events" element={<EventsPage />} />
                            <Route path="/login" element={<Login />} />
                            <Route path="/admin" element={<Admin />} />
                            <Route path="/privacy" element={<PrivacyPolicy />} />
                            <Route path="/terms" element={<TermsOfService />} />
                            <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                    </Suspense>
                </AppShell>
            </BrowserRouter>
        </AppProvider>
    );
}
