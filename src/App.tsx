import React from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import MasterDashboard from './pages/parent/MasterDashboard';
import HeroDashboard from './pages/hero/HeroDashboard';
import { ProfilePicker } from './components/ProfilePicker';
import { PinEntry } from './components/PinEntry';
import { supabase } from './lib/supabase';

// ------------------------------------------------------------------
// Helpers for the child's local session (independent device)
// ------------------------------------------------------------------
const HERO_SESSION_KEY = 'fq_saved_hero_token';

function getSavedHeroToken(): string | null {
    return localStorage.getItem(HERO_SESSION_KEY);
}

function saveHeroToken(token: string) {
    localStorage.setItem(HERO_SESSION_KEY, token);
}

function clearHeroToken() {
    localStorage.removeItem(HERO_SESSION_KEY);
}

// ------------------------------------------------------------------
// Main router
// ------------------------------------------------------------------
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

    // Verified hero (from invite link or saved session). Once set, renders HeroDashboard.
    const [inviteHero, setInviteHero] = React.useState<any | null>(null);

    // Saved token from a previous visit on this device
    const savedToken = React.useMemo(() => getSavedHeroToken(), []);

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

    // ─── INVITE LINK FLOW ─────────────────────────────────────────────────────
    // Fresh invite link: ?hero=<token> — show PIN and, on success, save token to localStorage
    if (!user && heroInviteToken && !inviteHero) {
        return (
            <HeroInviteLogin
                inviteToken={heroInviteToken}
                onSuccess={(hero) => {
                    saveHeroToken(hero.invite_token); // remember this device
                    window.history.replaceState({}, '', '/'); // clean URL
                    setInviteHero(hero);
                }}
            />
        );
    }

    // Saved session: returning child on same device — ask for PIN then open HeroDashboard
    if (!user && !inviteHero && savedToken && !heroInviteToken) {
        return (
            <HeroInviteLogin
                inviteToken={savedToken}
                onSuccess={(hero) => {
                    setInviteHero(hero);
                }}
                savedSession // flag to show "logout" option instead of generic back
                onLogout={() => {
                    clearHeroToken();
                    window.location.href = '/';
                }}
            />
        );
    }

    // Hero authenticated — show HeroDashboard
    if (!user && inviteHero) {
        return (
            <HeroDashboard
                heroOverride={inviteHero}
                heroExitButton={
                    <button
                        onClick={() => {
                            clearHeroToken();
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

    // ─── SUPABASE AUTH FLOWS ──────────────────────────────────────────────────
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

    // AUTHENTICATED — same-device hero mode via profile picker
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

// ------------------------------------------------------------------
// HeroInviteLogin — fetches hero by invite_token, shows PinEntry
// ------------------------------------------------------------------
interface HeroInviteLoginProps {
    inviteToken: string;
    onSuccess: (hero: any) => void;
    savedSession?: boolean;
    onLogout?: () => void;
}

function HeroInviteLogin({ inviteToken, onSuccess, savedSession, onLogout }: HeroInviteLoginProps) {
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
                {savedSession && onLogout && (
                    <button
                        onClick={onLogout}
                        style={{ marginTop: 16, padding: '8px 20px', border: '2px solid #fff', background: 'none', color: '#fff', fontWeight: 800, borderRadius: 8, cursor: 'pointer' }}
                    >
                        🔄 Trocar de herói
                    </button>
                )}
                {!savedSession && (
                    <button onClick={() => window.location.href = '/'} style={{ marginTop: 16, padding: '8px 20px', border: '2px solid #fff', background: 'none', color: '#fff', fontWeight: 800, borderRadius: 8, cursor: 'pointer' }}>
                        Voltar ao início
                    </button>
                )}
            </div>
        </div>
    );

    return (
        <PinEntry
            hero={hero}
            onSuccess={(heroData) => {
                onSuccess(heroData);
            }}
            onCancel={savedSession && onLogout ? onLogout : () => { window.location.href = '/'; }}
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
