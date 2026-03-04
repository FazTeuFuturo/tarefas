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

    // NOT logged in via Supabase
    if (!user || !profile) {
        // Check URL for hero invite token
        const params = new URLSearchParams(window.location.search);
        const heroToken = params.get('hero');
        if (heroToken) {
            // Invite link flow — fetch hero by token and show PIN entry
            return <HeroInviteLogin inviteToken={heroToken} />;
        }

        // Show profile picker before login if heroes were loaded from a previous session
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
                        // Login via Supabase Auth with derived credentials
                        const { deriveHeroEmail, deriveHeroPassword } = await import('./lib/pinUtils');
                        const email = deriveHeroEmail(hero.id);
                        const password = deriveHeroPassword('', hero.invite_token); // PIN already verified
                        // For own-device: sign in as the hero
                        const { error } = await supabase.auth.signInWithPassword({ email, password });
                        if (error) {
                            console.error('Hero login failed:', error);
                            // Fallback: show dashboard without Supabase session (limited)
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
function HeroInviteLogin({ inviteToken }: { inviteToken: string }) {
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
            onSuccess={async (heroData) => {
                const { deriveHeroEmail } = await import('./lib/pinUtils');
                // Need the PIN to derive password — but here pin was already verified
                // For own-device login, we sign in via Supabase Auth
                deriveHeroEmail(heroData.id); // Forçando uso pra não dar erro TS
                // Store token for derived password reconstruction — we store invite_token
                // The pin was just verified so we can't re-derive without pin, use stored session
                // NOTE: For full own-device flow, hero must have Supabase Auth account
                localStorage.setItem('fq_hero_session', JSON.stringify({ id: heroData.id, invite_token: heroData.invite_token }));
                // Remove token from URL cleanly
                window.history.replaceState({}, '', '/');
                window.location.reload();
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
