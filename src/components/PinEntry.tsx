import React, { useState, useEffect } from 'react';
import { hashPin, verifyPin } from '../lib/pinUtils';
import { supabase } from '../lib/supabase';

interface HeroProfile {
    id: string;
    nome: string;
    avatar: string;
    pin_hash?: string;
    invite_token?: string; // Mantido para caso precisemos de um salt persistente
    nivel: number;
    xp: number;
}

interface PinEntryProps {
    hero: HeroProfile;
    onSuccess: () => void;
    onCancel: () => void;
}

export const PinEntry: React.FC<PinEntryProps> = ({ hero, onSuccess, onCancel }) => {
    // Se o herói não tiver pin_hash, significa que é o 1º acesso e ele deve CRIAR o PIN
    const isSetupMode = !hero.pin_hash;
    const [step, setStep] = useState<'enter' | 'create' | 'confirm'>(isSetupMode ? 'create' : 'enter');

    const [digits, setDigits] = useState<string[]>(['', '', '', '']);
    const [firstPin, setFirstPin] = useState<string>('');

    const [error, setError] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [shake, setShake] = useState(false);
    const [attempts, setAttempts] = useState(0);

    const MAX_ATTEMPTS = 5;
    const isLocked = attempts >= MAX_ATTEMPTS;

    useEffect(() => {
        const pin = digits.join('');
        if (pin.length === 4) {
            handlePinComplete(pin);
        }
    }, [digits]);

    const handlePinComplete = async (pin: string) => {
        if (step === 'enter') {
            setIsVerifying(true);
            try {
                // Para compatibilidade, passamos hero.invite_token (ou string vazia se legado)
                const safeToken = hero.invite_token || hero.id;
                const safeHash = hero.pin_hash || '';
                const ok = await verifyPin(pin, safeToken, safeHash);

                if (ok) {
                    setError('');
                    onSuccess();
                } else {
                    const newAttempts = attempts + 1;
                    setAttempts(newAttempts);
                    if (newAttempts >= MAX_ATTEMPTS) {
                        setError('Muitas tentativas erradas. Peça ao Pai para resetar o PIN.');
                    } else {
                        setError(`PIN incorreto. ${MAX_ATTEMPTS - newAttempts} tentativa(s) restante(s).`);
                    }
                    setShake(true);
                    setTimeout(() => { setShake(false); setDigits(['', '', '', '']); }, 600);
                }
            } finally {
                setIsVerifying(false);
            }
        }
        else if (step === 'create') {
            setFirstPin(pin);
            setStep('confirm');
            setDigits(['', '', '', '']);
            setError('');
        }
        else if (step === 'confirm') {
            if (pin === firstPin) {
                setIsVerifying(true);
                try {
                    // Se não tiver invite_token, usamos o hero.id como salt base da criptografia do PIN
                    const saltToken = hero.invite_token || hero.id;
                    const newHash = await hashPin(pin, saltToken);

                    const { error: updateError } = await supabase
                        .from('profiles')
                        .update({ pin_hash: newHash, invite_token: saltToken })
                        .eq('id', hero.id);

                    if (updateError) throw updateError;

                    hero.pin_hash = newHash;
                    hero.invite_token = saltToken;
                    onSuccess();
                } catch (err: any) {
                    setError('Erro ao salvar PIN: ' + err.message);
                    setShake(true);
                    setTimeout(() => { setShake(false); setDigits(['', '', '', '']); }, 600);
                } finally {
                    setIsVerifying(false);
                }
            } else {
                setError('Os PINs não combinam. Tente novamente.');
                setShake(true);
                setTimeout(() => {
                    setShake(false);
                    setStep('create');
                    setFirstPin('');
                    setDigits(['', '', '', '']);
                }, 1000);
            }
        }
    };

    const handleKey = (key: string) => {
        if (isLocked || isVerifying) return;
        if (key === 'DEL') {
            setDigits(prev => {
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
        setDigits(prev => {
            const arr = [...prev];
            for (let i = 0; i < 4; i++) {
                if (arr[i] === '') { arr[i] = key; break; }
            }
            return arr;
        });
    };

    const isAvatarUrl = /^https?:\/\//.test(hero.avatar || '');

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 3000,
            background: '#1a1a1a',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 24,
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
                <h2 style={{ color: '#fff', margin: 0, fontSize: 22 }}>
                    {step === 'enter' ? `Bem-vindo de volta, ${hero.nome}!` : `Olá, ${hero.nome}!`}
                </h2>
                {step === 'enter' && (
                    <p style={{ color: 'rgba(255,255,255,0.5)', margin: '4px 0 0', fontSize: 13 }}>Nível {hero.nivel} · ⭐ {hero.xp} XP</p>
                )}
            </div>

            <p style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 800, margin: 0 }}>
                {step === 'enter' && 'Digite seu PIN secreto'}
                {step === 'create' && 'Crie um PIN secreto de 4 números'}
                {step === 'confirm' && 'Confirme seu novo PIN'}
            </p>

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

            {error && <p style={{ color: 'var(--color-danger)', fontWeight: 800, margin: 0 }}>{error}</p>}
            {isVerifying && <p style={{ color: 'var(--color-primary)', fontWeight: 800, margin: 0 }}>Validando...</p>}

            <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 16, marginTop: 16,
                opacity: (isLocked || isVerifying) ? 0.5 : 1,
                pointerEvents: (isLocked || isVerifying) ? 'none' : 'auto'
            }}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                    <button key={num} onClick={() => handleKey(num.toString())}
                        style={{
                            width: 70, height: 70, borderRadius: '50%',
                            background: 'rgba(255,255,255,0.1)', border: '2px solid rgba(255,255,255,0.2)',
                            color: '#fff', fontSize: 28, fontWeight: 800, cursor: 'pointer',
                        }}
                    >{num}</button>
                ))}
                <div />
                <button onClick={() => handleKey('0')}
                    style={{
                        width: 70, height: 70, borderRadius: '50%',
                        background: 'rgba(255,255,255,0.1)', border: '2px solid rgba(255,255,255,0.2)',
                        color: '#fff', fontSize: 28, fontWeight: 800, cursor: 'pointer',
                    }}
                >0</button>
                <button onClick={() => handleKey('DEL')}
                    style={{
                        width: 70, height: 70, borderRadius: '50%', background: 'transparent',
                        border: 'none', color: '#fff', fontSize: 24, fontWeight: 800, cursor: 'pointer',
                    }}
                >⌫</button>
            </div>

            <button
                onClick={onCancel}
                style={{
                    marginTop: 32, padding: '12px 24px',
                    background: 'transparent', border: '2px solid rgba(255,255,255,0.3)',
                    color: '#fff', borderRadius: 12, fontWeight: 800, cursor: 'pointer',
                }}
            >
                Cancelar
            </button>
        </div>
    );
};
