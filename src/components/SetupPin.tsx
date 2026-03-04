import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { hashPin, deriveHeroEmail, heroAuthPassword } from '../lib/pinUtils';

interface SetupPinProps {
    hero: {
        id: string;
        nome: string;
        avatar: string;
        nivel: number;
        xp: number;
        invite_token: string;
        link_id: string;
        temp_token: string;
    };
    onSuccess: () => void; // just signals App.tsx that auth is done — no hero data needed
    onCancel: () => void;
}

export const SetupPin: React.FC<SetupPinProps> = ({ hero, onSuccess, onCancel }) => {
    const [step, setStep] = useState<'choose' | 'confirm'>('choose');
    const [pin, setPin] = useState<string[]>(['', '', '', '']);
    const [confirmPin, setConfirmPin] = useState<string[]>(['', '', '', '']);
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const [shake, setShake] = useState(false);

    const currentDigits = step === 'choose' ? pin : confirmPin;
    const setCurrentDigits = step === 'choose' ? setPin : setConfirmPin;
    const filledCount = currentDigits.filter(d => d !== '').length;

    const handleKey = (key: string) => {
        if (saving) return;
        if (key === 'DEL') {
            setCurrentDigits(prev => {
                const arr = [...prev];
                for (let i = 3; i >= 0; i--) {
                    if (arr[i] !== '') { arr[i] = ''; break; }
                }
                return arr;
            });
            setError('');
            return;
        }
        if (!/^\d$/.test(key)) return;
        setCurrentDigits(prev => {
            const arr = [...prev];
            for (let i = 0; i < 4; i++) {
                if (arr[i] === '') { arr[i] = key; break; }
            }
            return arr;
        });
    };

    React.useEffect(() => {
        const joined = currentDigits.join('');
        if (joined.length !== 4) return;

        if (step === 'choose') {
            setTimeout(() => setStep('confirm'), 150);
        } else {
            const firstPin = pin.join('');
            if (joined !== firstPin) {
                setError('Os PINs não coincidem. Tente novamente.');
                setShake(true);
                setTimeout(() => {
                    setShake(false);
                    setConfirmPin(['', '', '', '']);
                    setPin(['', '', '', '']);
                    setStep('choose');
                    setError('');
                }, 700);
                return;
            }

            (async () => {
                setSaving(true);
                try {
                    // 1. Hash the PIN and save it to DB via RPC
                    const pinHash = await hashPin(joined, hero.invite_token);
                    const { data: pinSaved, error: rpcErr } = await supabase.rpc('set_hero_pin', {
                        p_token: hero.temp_token,
                        p_link_id: hero.link_id,
                        p_pin_hash: pinHash,
                    });
                    if (rpcErr || pinSaved === false) {
                        setError('Erro ao salvar PIN. O link pode ter expirado.');
                        setSaving(false);
                        return;
                    }

                    // 2. Sign in to Supabase Auth with PIN-independent credentials
                    // (the auth identity was just securely created by the RPC with the exact hero ID)
                    const email = deriveHeroEmail(hero.id);
                    const password = heroAuthPassword(hero.invite_token);

                    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

                    if (signInError) {
                        setError('Erro ao entrar na sessão: ' + signInError.message);
                        setSaving(false);
                        return;
                    }

                    // 3. Save permanent invite_token to localStorage for future visits
                    localStorage.setItem('fq_saved_hero_token', hero.invite_token);

                    // 4. Success — AuthContext will pick up the session and route to HeroDashboard
                    onSuccess();
                } catch (err: any) {
                    setError('Erro: ' + err.message);
                    setSaving(false);
                }
            })();
        }
    }, [currentDigits]);

    const isAvatarUrl = /^https?:\/\//.test(hero.avatar || '');

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 3000,
            background: '#1a1a1a',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 24, padding: '0 24px',
            overflowY: 'auto',
        }}>
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
                <h2 style={{ color: '#fff', margin: 0, fontSize: 22 }}>Olá, {hero.nome}!</h2>
                <p style={{ color: 'rgba(255,255,255,0.6)', margin: '6px 0 0', fontSize: 14 }}>
                    {step === 'choose'
                        ? '🔐 Crie seu PIN secreto de 4 dígitos'
                        : '🔁 Repita o PIN para confirmar'}
                </p>
            </div>

            {/* Step dots */}
            <div style={{ display: 'flex', gap: 8 }}>
                {['choose', 'confirm'].map((stepLabel) => (
                    <div key={stepLabel} style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: step === stepLabel ? '#fff' : 'rgba(255,255,255,0.3)',
                        transition: 'background 0.2s',
                    }} />
                ))}
            </div>

            <p style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 800, margin: 0, fontSize: 16 }}>
                {step === 'choose' ? 'Digite seu novo PIN' : 'Confirme o PIN'}
            </p>

            {/* PIN Dots */}
            <div className={shake ? 'shake-animation' : ''} style={{ display: 'flex', gap: 16 }}>
                {currentDigits.map((d, i) => (
                    <div key={i} style={{
                        width: 20, height: 20,
                        borderRadius: '50%',
                        border: '3px solid #fff',
                        background: d !== '' ? '#fff' : 'transparent',
                        transition: 'background 0.1s ease',
                    }} />
                ))}
            </div>

            {error && (
                <div style={{
                    background: 'var(--color-danger)', color: '#fff',
                    fontWeight: 800, fontSize: 13, padding: '8px 16px',
                    borderRadius: 8, textAlign: 'center', maxWidth: 280,
                }}>
                    {error}
                </div>
            )}

            {!saving ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 72px)', gap: 12 }}>
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'DEL'].map((key, i) => {
                        if (key === '') return <div key={i} />;
                        return (
                            <button
                                key={key + i}
                                onClick={() => handleKey(key)}
                                disabled={key !== 'DEL' && filledCount >= 4}
                                style={{
                                    width: 72, height: 72, borderRadius: '50%',
                                    border: '3px solid rgba(255,255,255,0.3)',
                                    background: 'rgba(255,255,255,0.1)',
                                    color: '#fff',
                                    fontSize: key === 'DEL' ? 18 : 26,
                                    fontWeight: 800, cursor: 'pointer', transition: 'all 0.1s',
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
            ) : (
                <p style={{ color: 'rgba(255,255,255,0.6)', fontWeight: 800, margin: 0 }}>
                    Entrando na aventura... ⚔️
                </p>
            )}

            {!saving && (
                <button
                    onClick={onCancel}
                    style={{
                        background: 'none', border: 'none',
                        color: 'rgba(255,255,255,0.4)', fontWeight: 800,
                        fontSize: 13, cursor: 'pointer', textDecoration: 'underline',
                    }}
                >
                    ← Cancelar
                </button>
            )}
        </div>
    );
};
