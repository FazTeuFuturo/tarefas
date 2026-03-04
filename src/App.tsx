import React from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import MasterDashboard from './pages/parent/MasterDashboard';
import HeroDashboard from './pages/hero/HeroDashboard';
import { PinEntry } from './components/PinEntry';
import { SetupPin } from './components/SetupPin';
import { supabase } from './lib/supabase';

// ─── Local device session (remembers which hero is on this device) ────────────
const HERO_SESSION_KEY = 'fq_saved_hero_token';
const getSavedHeroToken = () => localStorage.getItem(HERO_SESSION_KEY);
const clearHeroToken = () => localStorage.removeItem(HERO_SESSION_KEY);

// ─── AppRouter ────────────────────────────────────────────────────────────────
function AppRouter() {
    const { user, profile, activeProfile, isLoading, isHeroMode, switchToHero, exitHeroMode } = useAuth();
    const params = React.useMemo(() => new URLSearchParams(window.location.search), []);

    const [authView, setAuthView] = React.useState<'login' | 'register'>(
        params.has('invite_clan') ? 'register' : 'login'
    );

    // One-time invite token from URL: ?invite=<temp_token>
    const inviteToken = React.useMemo(() => params.get('invite'), []);

    // Returning child: hero loaded from localStorage for PIN verification
    const [savedHero, setSavedHero] = React.useState<any | null>(null);
    const [savedHeroLoaded, setSavedHeroLoaded] = React.useState(false);

    // Invite link hero data (before PIN is set / auth session)
    const [inviteHeroData, setInviteHeroData] = React.useState<any | null>(null);
    const [inviteLoaded, setInviteLoaded] = React.useState(!inviteToken);

    // Load hero data from one-time invite token
    React.useEffect(() => {
        if (!inviteToken || user) { setInviteLoaded(true); return; }
        supabase.rpc('claim_hero_invite', { p_token: inviteToken }).then(({ data }) => {
            if (data) setInviteHeroData({ ...data, temp_token: inviteToken });
            window.history.replaceState({}, '', '/');
            setInviteLoaded(true);
        });
    }, []);

    // Load saved hero from localStorage (returning child, no URL token)
    React.useEffect(() => {
        if (user || inviteToken) { setSavedHeroLoaded(true); return; }
        const savedToken = getSavedHeroToken();
        if (!savedToken) { setSavedHeroLoaded(true); return; }
        supabase.rpc('get_hero_by_invite', { token: savedToken }).then(({ data }) => {
            if (data) setSavedHero(data);
            else clearHeroToken();
            setSavedHeroLoaded(true);
        });
    }, []);

    // ─── Loading ─────────────────────────────────────────────────────────────
    if (isLoading || !inviteLoaded || (!savedHeroLoaded && !user && !inviteToken)) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#1a1a1a' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>⚔️</div>
                    <p style={{ fontWeight: 800, color: '#fff' }}>Carregando aventura...</p>
                </div>
            </div>
        );
    }

    // ─── One-time invite link ─────────────────────────────────────────────────
    if (!user && inviteHeroData) {
        return (
            <SetupPin
                hero={inviteHeroData}
                onSuccess={() => {
                    setInviteHeroData(null);
                    // AuthContext will detect the new session and re-render
                }}
                onCancel={() => { setInviteHeroData(null); }}
            />
        );
    }

    if (!user && inviteToken && !inviteHeroData && inviteLoaded) {
        // Token was invalid or expired
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#1a1a1a' }}>
                <div style={{ textAlign: 'center', color: '#fff' }}>
                    <p style={{ fontSize: 40 }}>⏰</p>
                    <p style={{ fontWeight: 800 }}>Link expirado ou inválido.</p>
                    <p style={{ opacity: 0.5, fontSize: 13 }}>Peça ao Mestre um novo link.</p>
                    <button onClick={() => window.location.href = '/'}
                        style={{ marginTop: 16, padding: '8px 20px', border: '2px solid #fff', background: 'none', color: '#fff', fontWeight: 800, borderRadius: 8, cursor: 'pointer' }}>
                        ← Voltar
                    </button>
                </div>
            </div>
        );
    }

    // ─── Returning child (saved device) ──────────────────────────────────────
    if (!user && savedHero) {
        return (
            <PinEntry
                hero={savedHero}
                onSuccess={() => {
                    setSavedHero(null);
                    // AuthContext will detect the new Supabase session
                }}
                onCancel={() => { clearHeroToken(); setSavedHero(null); }}
            />
        );
    }

    // ─── Supabase auth flows ──────────────────────────────────────────────────
    if (!user || !profile) {
        if (authView === 'register') {
            return <Register onRegisterSuccess={() => { }} onNavigateLogin={() => setAuthView('login')} />;
        }
        return <Login onLoginSuccess={() => { }} onNavigateRegister={() => setAuthView('register')} />;
    }

    // ─── Authenticated ────────────────────────────────────────────────────────
    if (isHeroMode && activeProfile) {
        return (
            <HeroDashboard
                heroExitButton={
                    <button onClick={exitHeroMode}
                        className="neo-button"
                        title="Voltar para Mestre"
                        style={{ padding: '8px', background: 'var(--color-danger)', color: 'white', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    ><span style={{ fontSize: 18, fontWeight: 900 }}>X</span></button>
                }
            />
        );
    }

    if (profile.role === 'parent') {
        return <MasterDashboard onSwitchToHero={(hero) => switchToHero(hero)} />;
    }

    // Hero logged in directly (via auth session from invite link or returning device)
    return (
        <HeroDashboard
            heroExitButton={
                <button
                    className="neo-button"
                    title="Sair"
                    onClick={async () => {
                        clearHeroToken();
                        await supabase.auth.signOut({ scope: 'local' });
                    }}
                    style={{ padding: '8px', background: 'var(--color-danger)', color: 'white', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                ><span style={{ fontSize: 18, fontWeight: 900 }}>X</span></button>
            }
        />
    );
}

export default function App() {
    return (
        <AuthProvider>
            <AppRouter />
        </AuthProvider>
    );
}
