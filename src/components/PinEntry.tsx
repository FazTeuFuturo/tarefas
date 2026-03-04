import React, { useState, useEffect } from 'react';
import { verifyPin, deriveHeroEmail, heroAuthPassword } from '../lib/pinUtils';
import { supabase } from '../lib/supabase';

interface HeroProfile {
    id: string;
    nome: string;
    avatar: string;
    pin_hash: string;
    invite_token: string;
    nivel: number;
    xp: number;
}

interface PinEntryProps {
    hero: HeroProfile;
    onSuccess: () => void; // Auth session created — caller just needs to re-render
    onCancel: () => void;
}

export const PinEntry: React.FC<PinEntryProps> = ({ hero, onSuccess, onCancel }) => {
    const [digits, setDigits] = useState<string[]>(['', '', '', '']);
    const [error, setError] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [shake, setShake] = useState(false);
    const [attempts, setAttempts] = useState(0);

    const MAX_ATTEMPTS = 5;
    const isLocked = attempts >= MAX_ATTEMPTS;

    useEffect(() => {
        const pin = digits.join('');
        if (pin.length === 4) {
            (async () => {
                setIsVerifying(true);
                try {
                    const ok = await verifyPin(pin, hero.invite_token, hero.pin_hash);
                    if (ok) {
                        setError('');
                        const email = deriveHeroEmail(hero.id);
                        const password = heroAuthPassword(hero.invite_token);

                        // Try sign in first
                        let { data: session, error: signInError } = await supabase.auth.signInWithPassword({ email, password });

                        if (signInError || !session.session) {
                            // Auth user doesn't exist yet — create it and sign in
                            await supabase.auth.signUp({ email, password });
                            const { data: session2, error: signIn2Error } = await supabase.auth.signInWithPassword({ email, password });
                            if (signIn2Error || !session2.session) {
                                setError('Erro ao iniciar sessão. Contacte o Mestre.');
                                setDigits(['', '', '', '']);
                                return;
                            }
                        }

                        onSuccess();
                    } else {
                        const newAttempts = attempts + 1;
                        setAttempts(newAttempts);
                        if (newAttempts >= MAX_ATTEMPTS) {
                            setError('Muitas tentativas erradas. Peça ao Mestre para resetar.');
                        } else {
                            setError(`PIN incorreto. ${MAX_ATTEMPTS - newAttempts} tentativa(s) restante(s).`);
                        }
                        setShake(true);
                        setTimeout(() => { setShake(false); setDigits(['', '', '', '']); }, 600);
                    }
                } finally {
                    setIsVerifying(false);
                }
            })();
        }
    }, [digits]);

    const handleKey = (key: string) => {
        if (isLocked || isVerifying) return;
        if (key === 'DEL') {
            setDigits(prev => {
                const arr = [...prev];
                // Find last filled position
                for (let i = 3; i >= 0; i--) {
                    if (arr[i] !== '') { arr[i] = ''; break; }
                }
                return arr;
            });
            setError('');
            return;
        }
        if (!/^\d$/.test(key)) return;
        setDigits(prev => {
            const arr = [...prev];
            // Find first empty position
            for (let i = 0; i < 4; i++) {
                if (arr[i] === '') { arr[i] = key; break; }
            }
            return arr;
        });
    };

    const filledCount = digits.filter(d => d !== '').length;

    const isAvatarUrl = /^https?:\/\//.test(hero.avatar || '');

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 3000,
            background: '#1a1a1a',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 24,
        }}>
            {/* Avatar + Nome */}
            <div style={{ textAlign: 'center' }}>
                <div style={{
                    width: 90, height: 90,
                    border: '4px solid #fff',
                    borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 12px',
                    background: 'var(--color-primary)',
                    boxShadow: '4px 4px 0 rgba(255,255,255,0.2)',
                    overflow: 'hidden',
                }}>
                    {isAvatarUrl ? (
                        <img src={hero.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={hero.nome} />
                    ) : (
                        <span style={{ fontSize: 50 }}>{hero.avatar || '🦸'}</span>
                    )}
                </div>
                <h2 style={{ color: '#fff', margin: 0, fontSize: 22 }}>{hero.nome}</h2>
                <p style={{ color: 'rgba(255,255,255,0.5)', margin: '4px 0 0', fontSize: 13 }}>Nível {hero.nivel} · ⭐ {hero.xp} XP</p>
            </div>

            <p style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 800, margin: 0 }}>Digite seu PIN</p>

            {/* PIN Dots */}
            <div
                className={shake ? 'shake-animation' : ''}
                style={{ display: 'flex', gap: 16 }}
            >
                {digits.map((d, i) => (
                    <div key={i} style={{
                        width: 20, height: 20,
                        borderRadius: '50%',
                        border: '3px solid #fff',
                        background: d !== '' ? '#fff' : 'transparent',
                        transition: 'background 0.1s ease',
                    }} />
                ))}
            </div>

            {/* Error */}
            {error && (
                <div style={{
                    background: 'var(--color-danger)', color: '#fff',
                    fontWeight: 800, fontSize: 13, padding: '8px 16px',
                    borderRadius: 8, border: '2px solid rgba(255,255,255,0.3)',
                    textAlign: 'center', maxWidth: 280
                }}>
                    {error}
                </div>
            )}

            {/* Numpad */}
            {!isLocked && (
                <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(3, 72px)',
                    gap: 12,
                }}>
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'DEL'].map((key, i) => {
                        if (key === '') return <div key={i} />;
                        return (
                            <button
                                key={key + i}
                                onClick={() => handleKey(key)}
                                disabled={isVerifying || (key !== 'DEL' && filledCount >= 4)}
                                style={{
                                    width: 72, height: 72,
                                    borderRadius: '50%',
                                    border: '3px solid rgba(255,255,255,0.3)',
                                    background: isVerifying ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)',
                                    color: '#fff',
                                    fontSize: key === 'DEL' ? 18 : 26,
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    transition: 'all 0.1s',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}
                                onMouseDown={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.25)')}
                                onMouseUp={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
                            >
                                {key === 'DEL' ? '⌫' : key}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Loading state */}
            {isVerifying && (
                <p style={{ color: 'rgba(255,255,255,0.6)', fontWeight: 800, margin: 0 }}>Verificando...</p>
            )}

            {/* Cancel */}
            <button
                onClick={onCancel}
                style={{
                    background: 'none', border: 'none',
                    color: 'rgba(255,255,255,0.5)', fontWeight: 800,
                    fontSize: 14, cursor: 'pointer', padding: '8px 16px',
                    textDecoration: 'underline'
                }}
            >
                ← Trocar de herói
            </button>
        </div>
    );
};
