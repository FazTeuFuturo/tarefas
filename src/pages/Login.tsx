import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Mascot } from '../components/Mascot';
export type MascotState = 'idle' | 'happy' | 'focused_password' | 'error';

interface LoginProps {
    onLoginSuccess: (email: string) => void;
    onNavigateRegister: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess, onNavigateRegister }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [mascotState, setMascotState] = useState<MascotState>('idle');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [shake, setShake] = useState(false);

    const playSound = (type: 'blip' | 'error' | 'success') => {
        try {
            const AudioCtx = window.AudioContext || (window as Window & typeof globalThis & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
            const audioCtx = new AudioCtx();
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            const now = audioCtx.currentTime;
            if (type === 'error') {
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(150, now);
                gain.gain.setValueAtTime(0.15, now);
                gain.gain.linearRampToValueAtTime(0.01, now + 0.25);
                osc.start(now);
                osc.stop(now + 0.25);
            } else if (type === 'success') {
                osc.type = 'square';
                osc.frequency.setValueAtTime(523, now);
                osc.frequency.setValueAtTime(659, now + 0.1);
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
                osc.start(now);
                osc.stop(now + 0.2);
            }
        } catch (soundErr) { console.warn('AudioContext unavailable', soundErr); }
    };

    const triggerError = (msg: string) => {
        setError(msg);
        setMascotState('error');
        setShake(true);
        playSound('error');
        setTimeout(() => {
            setMascotState('idle');
            setShake(false);
        }, 1000);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;

        setIsSubmitting(true);
        setError(null);

        try {
            const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
            if (authError) throw authError;

            playSound('success');
            setMascotState('happy');
            setTimeout(() => onLoginSuccess(email), 600);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Erro desconhecido';
            triggerError(`E-mail ou senha inválidos. ${message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div
            className="mobile-app-container flex items-center justify-center w-full"
            style={{ padding: 'var(--space-4)', background: 'var(--color-surface)' }}
        >
            <div
                className={`neo-box flex-col items-center ${shake ? 'shake-animation' : ''}`}
                style={{ width: '100%', maxWidth: 420, padding: 'var(--space-6)', textAlign: 'center', background: 'var(--color-surface)' }}
            >
                {/* Mascote */}
                <Mascot size={110} state={mascotState} />

                <h1 style={{ marginTop: 'var(--space-3)', marginBottom: 'var(--space-1)', fontSize: 'var(--font-size-2xl)' }}>
                    Portal do Mestre
                </h1>
                <p style={{ marginBottom: 'var(--space-5)', fontWeight: 800, opacity: 0.8 }}>
                    Acesse para gerenciar seu clã
                </p>

                <form onSubmit={handleSubmit} style={{ width: '100%' }}>
                    {/* Email */}
                    <div style={{ marginBottom: 'var(--space-3)', textAlign: 'left' }}>
                        <label className="neo-label" htmlFor="email">E-mail</label>
                        <input
                            id="email"
                            type="email"
                            className="neo-input"
                            placeholder="heroi@aventura.com"
                            value={email}
                            onChange={(e) => {
                                setEmail(e.target.value);
                                setMascotState('idle');
                            }}
                            onFocus={() => setMascotState('idle')}
                            required
                            autoComplete="email"
                            disabled={isSubmitting}
                        />
                    </div>

                    {/* Senha */}
                    <div style={{ marginBottom: 'var(--space-4)', textAlign: 'left' }}>
                        <label className="neo-label" htmlFor="password">Senha</label>
                        <input
                            id="password"
                            type="password"
                            className="neo-input"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onFocus={() => setMascotState('focused_password')}
                            onBlur={() => setMascotState('idle')}
                            required
                            autoComplete="current-password"
                            disabled={isSubmitting}
                        />
                    </div>

                    {/* Erro */}
                    {error && (
                        <div
                            style={{
                                marginBottom: 'var(--space-3)',
                                padding: 'var(--space-2)',
                                background: 'var(--color-danger)',
                                color: '#fff',
                                border: '3px solid #111',
                                fontWeight: 800,
                                fontSize: 'var(--font-size-sm)',
                            }}
                        >
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="neo-button w-full"
                        style={{ width: '100%', padding: 'var(--space-3)', fontSize: 'var(--font-size-lg)', marginTop: 'var(--space-2)' }}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? '🕹️ ENTRANDO...' : '🕹️ ACESSAR PAINEL'}
                    </button>
                </form>

                <button
                    type="button"
                    onClick={onNavigateRegister}
                    className="neo-link"
                    style={{ marginTop: 'var(--space-4)', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                    Novo por aqui? Crie sua conta de Mestre →
                </button>
            </div>
        </div>
    );
};
