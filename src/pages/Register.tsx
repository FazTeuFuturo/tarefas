import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAudio } from '../contexts/AudioContext';

interface RegisterProps {
    onRegisterSuccess: (email: string) => void;
    onNavigateLogin: () => void;
}

export const Register: React.FC<RegisterProps> = ({ onRegisterSuccess, onNavigateLogin }) => {
    const { stopAudio } = useAudio();

    useEffect(() => {
        stopAudio();
    }, [stopAudio]);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        const params = new URLSearchParams(window.location.search);
        const inviteClanId = params.get('invite_clan');

        try {
            // 1. SignUp no Supabase Auth + Metadata pro DB Trigger
            // Note: Everyone starting via Register is a 'parent'
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        nome: username,
                        role: 'parent',
                        clan_id: inviteClanId || null,
                        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`
                    }
                }
            });

            if (authError) throw authError;
            if (!authData.user) throw new Error('Falha ao criar usuário.');

            onRegisterSuccess(email);

        } catch (err) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('Erro mágico ao tentar se alistar.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="mobile-app-container flex items-center justify-center w-full" style={{ padding: 'var(--space-2)', background: 'var(--color-surface)' }}>

            <div
                className={`neo-box p-4 flex-col items-center ${error ? 'shake-animation' : ''}`}
                style={{ width: '100%', maxWidth: '400px', padding: 'var(--space-4)', textAlign: 'center', background: 'var(--color-surface)' }}
            >
                <h1 style={{ marginBottom: 'var(--space-1)', fontSize: 'var(--font-size-2xl)' }}>Portal do Mestre</h1>
                <p style={{ marginBottom: 'var(--space-4)', fontWeight: 800, opacity: 0.8 }}>Crie seu clã e comece a aventura!</p>

                <form onSubmit={handleSubmit} style={{ width: '100%' }} className="flex-col gap-3">

                    <div className="flex-col gap-1" style={{ textAlign: 'left' }}>
                        <label className="neo-label">Seu Nome (Mestre)</label>
                        <input
                            type="text"
                            className="neo-input"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Ex: Mestre Arthur"
                            required
                        />
                    </div>

                    <div className="flex-col gap-1" style={{ textAlign: 'left' }}>
                        <label className="neo-label">E-mail</label>
                        <input
                            type="email"
                            className="neo-input"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="seu@email.com"
                            required
                        />
                    </div>

                    <div className="flex-col gap-1" style={{ textAlign: 'left' }}>
                        <label className="neo-label">Senha</label>
                        <input
                            type="password"
                            className="neo-input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••"
                            minLength={6}
                            required
                        />
                    </div>

                    {error && (
                        <div style={{ color: 'red', fontWeight: 800, fontSize: 'var(--font-size-sm)', marginTop: 'var(--space-1)' }}>
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className={`neo-button w-full ${isSubmitting ? 'is-pressed' : ''}`}
                        disabled={isSubmitting}
                        style={{ marginTop: 'var(--space-2)', padding: 'var(--space-3)', fontSize: 'var(--font-size-lg)' }}
                    >
                        {isSubmitting ? '🕹️ CRIANDO CONTA...' : '🕹️ CRIAR MINHA CONTA'}
                    </button>

                    <button
                        type="button"
                        onClick={onNavigateLogin}
                        className="neo-link"
                        style={{ marginTop: 'var(--space-1)', background: 'none', border: 'none', width: '100%', textAlign: 'center', cursor: 'pointer' }}
                    >
                        Já é recruta? Acesse o Portal
                    </button>

                </form>
            </div>

        </div>
    );
};
