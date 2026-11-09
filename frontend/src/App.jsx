import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import AppShell from './layouts/AppShell';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import EventsPage from './pages/EventsPage';
import Admin from './pages/Admin';
import { PrivacyPolicy, TermsOfService } from './pages/LegalPages';

const Explorer = lazy(() => import('./pages/Explorer'));
const CockpitLab = lazy(() => import('./pages/CockpitLab'));

function RouteLoadingFallback() {
    return (
        <div
            style={{
                height: 'calc(100vh - 56px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--bg-canvas)',
                color: 'var(--text-secondary)',
                fontSize: '0.875rem',
            }}
        >
            Loading 3D aerospace workspace...
        </div>
    );
}

export default function App() {
    return (
        <AppProvider>
            <BrowserRouter>
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

