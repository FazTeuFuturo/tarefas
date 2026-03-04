import React from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import MasterDashboard from './pages/parent/MasterDashboard';
import HeroDashboard from './pages/hero/HeroDashboard';
import { ProfilePicker } from './components/ProfilePicker';
import { PinEntry } from './components/PinEntry';
import { supabase } from './lib/supabase';

function AppRouter() {
    const { user, profile, activeProfile, isLoading, isHeroMode, switchToHero, exitHeroMode } = useAuth();
    const params = React.useMemo(() => new URLSearchParams(window.location.search), []);
    const [authView, setAuthView] = React.useState<'login' | 'register'>(
        params.has('invite_clan') ? 'register' : 'login'
    );
    const [heroes, _setHeroes] = React.useState<any[]>([]);
    const [_, _setHeroesLoaded] = React.useState(false);
    const [showPicker, setShowPicker] = React.useState(false);
    const [pendingHero, setPendingHero] = React.useState<any | null>(null);

    // Invite link: ?hero=<invite_token>
    const heroInviteToken = React.useMemo(() => {
        return new URLSearchParams(window.location.search).get('hero');
    }, []);

    // Hero session via invite link (cross-device): verified hero stored by PinEntry success
    const [inviteHero, setInviteHero] = React.useState<any | null>(null);

    // Loading
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

    // ─── INVITE LINK FLOW (cross-device) ────────────────────────────────────────
    // If there's a ?hero= token and we're not yet logged in via Supabase
    if (!user && heroInviteToken && !inviteHero) {
        return (
            <HeroInviteLogin
                inviteToken={heroInviteToken}
                onSuccess={(hero) => {
                    // Clean the URL without reloading
                    window.history.replaceState({}, '', '/');
                    setInviteHero(hero);
                }}
            />
        );
    }

    // Hero logged in via invite link — show HeroDashboard directly with exit button
    if (!user && inviteHero) {
        return (
            <HeroDashboard
                heroOverride={inviteHero}
                heroExitButton={
                    <button
                        onClick={() => {
                            setInviteHero(null);
                            window.location.href = '/';
                        }}
                        style={{
                            background: 'none', border: '2px solid #000',
                            borderRadius: 6, padding: '4px 10px',
                            fontWeight: 800, fontSize: 12, cursor: 'pointer'
                        }}
                        title="Sair"
                    >↩ Sair</button>
                }
            />
        );
    }

    // NOT logged in via Supabase
    if (!user || !profile) {
        if (showPicker && heroes.length > 0 && !pendingHero) {
            return (
                <ProfilePicker
                    heroes={heroes}
                    onSelectHero={(h) => setPendingHero(h)}
                    onMasterLogin={() => setShowPicker(false)}
                />
            );
        }

        if (pendingHero) {
            return (
                <PinEntry
                    hero={pendingHero}
                    onSuccess={async (hero) => {
                        const { deriveHeroEmail, deriveHeroPassword } = await import('./lib/pinUtils');
                        const email = deriveHeroEmail(hero.id);
                        const password = deriveHeroPassword('', hero.invite_token);
                        const { error } = await supabase.auth.signInWithPassword({ email, password });
                        if (error) {
                            console.error('Hero login failed:', error);
                        }
                        setPendingHero(null);
                        setShowPicker(false);
                    }}
                    onCancel={() => setPendingHero(null)}
                />
            );
        }

        if (authView === 'register') {
            return <Register onRegisterSuccess={() => { }} onNavigateLogin={() => setAuthView('login')} />;
        }
        return <Login onLoginSuccess={() => { }} onNavigateRegister={() => setAuthView('register')} />;
    }

    // AUTHENTICATED — same-device hero mode via profile picker (PIN already verified in MasterDashboard)
    if (isHeroMode && activeProfile) {
        return (
            <HeroDashboard
                heroExitButton={
                    <button
                        onClick={exitHeroMode}
                        style={{
                            background: 'none', border: '2px solid #000',
                            borderRadius: 6, padding: '4px 10px',
                            fontWeight: 800, fontSize: 12, cursor: 'pointer'
                        }}
                        title="Trocar de herói"
                    >↩ Heróis</button>
                }
            />
        );
    }

    // Normal routing by role
    if (profile.role === 'parent') {
        return (
            <MasterDashboard
                onSwitchToHero={(hero) => {
                    setPendingHero(null);
                    switchToHero(hero);
                }}
            />
        );
    }

    return <HeroDashboard />;
}

/** Handles the ?hero=<token> invite link flow for own-device login */
function HeroInviteLogin({ inviteToken, onSuccess }: { inviteToken: string; onSuccess: (hero: any) => void }) {
    const [hero, setHero] = React.useState<any | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [notFound, setNotFound] = React.useState(false);

    React.useEffect(() => {
        supabase
            .rpc('get_hero_by_invite', { token: inviteToken })
            .then(({ data, error }) => {
                if (error || !data) { setNotFound(true); }
                else { setHero(data); }
                setLoading(false);
            });
    }, [inviteToken]);

    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#1a1a1a' }}>
            <p style={{ color: '#fff', fontWeight: 800 }}>Procurando herói...</p>
        </div>
    );

    if (notFound || !hero) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#1a1a1a' }}>
            <div style={{ textAlign: 'center', color: '#fff' }}>
                <p style={{ fontSize: 40 }}>❌</p>
                <p style={{ fontWeight: 800 }}>Link inválido ou expirado.</p>
                <p style={{ opacity: 0.5, fontSize: 13 }}>Peça ao Mestre um novo link.</p>
                <button onClick={() => window.location.href = '/'} style={{ marginTop: 16, padding: '8px 20px', border: '2px solid #fff', background: 'none', color: '#fff', fontWeight: 800, borderRadius: 8, cursor: 'pointer' }}>
                    Voltar ao início
                </button>
            </div>
        </div>
    );

    return (
        <PinEntry
            hero={hero}
            onSuccess={(heroData) => {
                // No reload — just pass the verified hero up via callback
                onSuccess(heroData);
            }}
            onCancel={() => { window.location.href = '/'; }}
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
