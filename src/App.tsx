import React from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import MasterDashboard from './pages/parent/MasterDashboard';
import HeroDashboard from './pages/hero/HeroDashboard';
import { PinEntry } from './components/PinEntry';
import { ProfilePicker } from './components/ProfilePicker';
import { supabase } from './lib/supabase';

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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#1a1a1a' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>⚔️</div>
                    <p style={{ fontWeight: 800, color: '#fff' }}>Carregando aventura...</p>
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

export default function App() {
    return (
        <AuthProvider>
            <AppRouter />
        </AuthProvider>
    );
}
