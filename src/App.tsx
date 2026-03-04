import React from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import MasterDashboard from './pages/parent/MasterDashboard';
import HeroDashboard from './pages/hero/HeroDashboard';
import { ProfilePicker } from './components/ProfilePicker';
import { PinEntry } from './components/PinEntry';
import { SetupPin } from './components/SetupPin';
import { supabase } from './lib/supabase';

// ------------------------------------------------------------------
// Persistent hero session on child's device
// ------------------------------------------------------------------
const HERO_SESSION_KEY = 'fq_saved_hero_token';
const getSavedHeroToken = () => localStorage.getItem(HERO_SESSION_KEY);
const saveHeroToken = (token: string) => localStorage.setItem(HERO_SESSION_KEY, token);
const clearHeroToken = () => localStorage.removeItem(HERO_SESSION_KEY);

// ------------------------------------------------------------------
// AppRouter — core routing logic
// ------------------------------------------------------------------
function AppRouter() {
    const { user, profile, activeProfile, isLoading, isHeroMode, switchToHero, exitHeroMode } = useAuth();
    const params = React.useMemo(() => new URLSearchParams(window.location.search), []);

    const [authView, setAuthView] = React.useState<'login' | 'register'>(
        params.has('invite_clan') ? 'register' : 'login'
    );
    const [showPicker, setShowPicker] = React.useState(false);
    const [heroes] = React.useState<any[]>([]);
    const [pendingHero, setPendingHero] = React.useState<any | null>(null);

    // One-time invite token from URL: ?invite=<temp_token>
    const inviteToken = React.useMemo(() => params.get('invite'), []);

    // Persistent token stored on this device after first access
    const savedToken = React.useMemo(() => getSavedHeroToken(), []);

    // Verified hero — once set shows HeroDashboard
    const [inviteHero, setInviteHero] = React.useState<any | null>(null);

    // Hero data fetched via savedToken, awaiting PIN
    const [savedHero, setSavedHero] = React.useState<any | null>(null);
    const [savedHeroLoaded, setSavedHeroLoaded] = React.useState(false);

    // Load returning hero from saved token (runs once on mount)
    React.useEffect(() => {
        if (user || inviteToken || !savedToken) {
            setSavedHeroLoaded(true);
            return;
        }
        supabase
            .rpc('get_hero_by_invite', { token: savedToken })
            .then(({ data }) => {
                if (data) setSavedHero(data);
                else clearHeroToken(); // token no longer valid
                setSavedHeroLoaded(true);
            });
    }, []);

    // Loading
    if (isLoading || (!savedHeroLoaded && !user && !inviteToken)) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#1a1a1a' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>⚔️</div>
                    <p style={{ fontWeight: 800, color: '#fff' }}>Carregando aventura...</p>
                </div>
            </div>
        );
    }

    // ─── HERO INVITE FLOW (one-time link) ────────────────────────────────────
    if (!user && inviteToken && !inviteHero) {
        return (
            <HeroInviteFlow
                inviteToken={inviteToken}
                onSuccess={(hero) => {
                    saveHeroToken(hero.invite_token);
                    window.history.replaceState({}, '', '/');
                    setInviteHero(hero);
                }}
                onCancel={() => { window.history.replaceState({}, '', '/'); window.location.reload(); }}
            />
        );
    }

    // ─── VERIFIED HERO — show dashboard ─────────────────────────────────────
    const exitBtn = (onExit: () => void) => (
        <button
            onClick={onExit}
            style={{
                background: 'none', border: '2px solid #000',
                borderRadius: 6, padding: '4px 10px',
                fontWeight: 800, fontSize: 12, cursor: 'pointer'
            }}
        >↩ Sair</button>
    );

    if (!user && inviteHero) {
        return (
            <HeroDashboard
                heroOverride={inviteHero}
                heroExitButton={exitBtn(() => { clearHeroToken(); setInviteHero(null); window.location.href = '/'; })}
            />
        );
    }

    // ─── RETURNING CHILD — saved session, ask PIN ────────────────────────────
    if (!user && savedHero) {
        return (
            <PinEntry
                hero={savedHero}
                onSuccess={(verifiedHero) => {
                    setInviteHero(verifiedHero);
                    setSavedHero(null);
                }}
                onCancel={() => { clearHeroToken(); setSavedHero(null); }}
            />
        );
    }

    // ─── SUPABASE AUTH FLOWS ─────────────────────────────────────────────────
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
                        await supabase.auth.signInWithPassword({ email, password });
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

    // ─── AUTHENTICATED — hero mode on same device ────────────────────────────
    if (isHeroMode && activeProfile) {
        return (
            <HeroDashboard
                heroExitButton={exitBtn(exitHeroMode)}
            />
        );
    }

    if (profile.role === 'parent') {
        return (
            <MasterDashboard
                onSwitchToHero={(hero) => switchToHero(hero)}
            />
        );
    }

    return <HeroDashboard />;
}

// ------------------------------------------------------------------
// HeroInviteFlow — handles the one-time ?invite= token flow
// Detects if hero has a PIN (returning) or not (first time → SetupPin)
// ------------------------------------------------------------------
interface HeroInviteFlowProps {
    inviteToken: string;
    onSuccess: (hero: any) => void;
    onCancel: () => void;
}

function HeroInviteFlow({ inviteToken, onSuccess, onCancel }: HeroInviteFlowProps) {
    const [state, setState] = React.useState<'loading' | 'setup_pin' | 'enter_pin' | 'invalid'>('loading');
    const [hero, setHero] = React.useState<any | null>(null);

    React.useEffect(() => {
        supabase
            .rpc('claim_hero_invite', { p_token: inviteToken })
            .then(({ data, error }) => {
                if (error || !data) { setState('invalid'); return; }
                setHero({ ...data, temp_token: inviteToken });
                setState(data.pin_set ? 'enter_pin' : 'setup_pin');
            });
    }, [inviteToken]);

    if (state === 'loading') return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#1a1a1a' }}>
            <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>⚔️</div>
                <p style={{ color: '#fff', fontWeight: 800 }}>Procurando herói...</p>
            </div>
        </div>
    );

    if (state === 'invalid' || !hero) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#1a1a1a' }}>
            <div style={{ textAlign: 'center', color: '#fff' }}>
                <p style={{ fontSize: 40 }}>⏰</p>
                <p style={{ fontWeight: 800 }}>Link expirado ou inválido.</p>
                <p style={{ opacity: 0.5, fontSize: 13 }}>Peça ao Mestre um novo link de convite.</p>
                <button
                    onClick={onCancel}
                    style={{ marginTop: 16, padding: '8px 20px', border: '2px solid #fff', background: 'none', color: '#fff', fontWeight: 800, borderRadius: 8, cursor: 'pointer' }}
                >
                    ← Voltar
                </button>
            </div>
        </div>
    );

    // First time — child sets their own PIN
    if (state === 'setup_pin') {
        return (
            <SetupPin
                hero={hero}
                onSuccess={(h) => onSuccess(h)}
                onCancel={onCancel}
            />
        );
    }

    // Returning via link (e.g. different device) — verify existing PIN
    return (
        <PinEntry
            hero={hero}
            onSuccess={(h) => onSuccess(h)}
            onCancel={onCancel}
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
