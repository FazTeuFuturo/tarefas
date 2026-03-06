import React from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import MasterDashboard from './pages/parent/MasterDashboard';
import HeroDashboard from './pages/hero/HeroDashboard';
import { ProfilePicker } from './components/ProfilePicker';

// ─── AppRouter ────────────────────────────────────────────────────────────────
function AppRouter() {
    const { user, profile, activeProfile, isLoading, isHeroMode, clearActiveProfile, switchToHero } = useAuth();
    const params = React.useMemo(() => new URLSearchParams(window.location.search), []);

    const [authView, setAuthView] = React.useState<'login' | 'register'>(
        params.has('invite_clan') ? 'register' : 'login'
    );

    // ─── Loading ─────────────────────────────────────────────────────────────
    if (isLoading) {
        return (
            <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-background)', flexDirection: 'column', gap: 'var(--space-2)' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>⚔️</div>
                    <p style={{ fontWeight: 800, color: 'var(--color-primary-light)', fontSize: '1.2rem', fontFamily: 'var(--font-family-heading)', textShadow: '0 0 10px rgba(245,166,35,0.3)' }}>Carregando aventura...</p>
                </div>
            </div>
        );
    }

    // ─── Supabase auth flows (Mestre deslogado) ───────────────────────────────
    if (!user || !profile) {
        if (authView === 'register') {
            return <Register onRegisterSuccess={() => { }} onNavigateLogin={() => setAuthView('login')} />;
        }
        return <Login onLoginSuccess={() => { }} onNavigateRegister={() => setAuthView('register')} />;
    }

    // ─── Authenticated mas sem perfil selecionado (Netflix Style) ─────────────
    if (!activeProfile) {
        return <ProfilePicker />;
    }

    // ─── Authenticated & Perfil Selecionado ───────────────────────────────────
    if (isHeroMode) {
        return (
            <HeroDashboard
                heroExitButton={
                    <button onClick={clearActiveProfile}
                        className="neo-button"
                        title="Trocar de Perfil"
                        style={{ padding: '8px', background: 'var(--color-danger)', color: 'white', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    ><span style={{ fontSize: 18, fontWeight: 900 }}>X</span></button>
                }
            />
        );
    }

    // Perfil selecionado é o do Mestre (activeProfile e isHeroMode=false)
    return <MasterDashboard onSwitchToHero={(hero) => switchToHero(hero)} />;

}

import { AudioProvider } from './contexts/AudioContext';

export default function App() {
    return (
        <AuthProvider>
            <AudioProvider>
                <AppRouter />
            </AudioProvider>
        </AuthProvider>
    );
}
