import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

interface RegisterProps {
    onRegisterSuccess: (email: string) => void;
    onNavigateLogin: () => void;
}

export const Register: React.FC<RegisterProps> = ({ onRegisterSuccess, onNavigateLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [role, setRole] = useState<'heroi' | 'mestre'>('heroi');

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        try {
            // 1. SignUp no Supabase Auth + Metadata pro DB Trigger
            const dbRole = role === 'mestre' ? 'parent' : 'child';
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        nome: username,
                        role: dbRole,
                        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`
                    }
                }
            });

            if (authError) throw authError;
            if (!authData.user) throw new Error('Falha ao criar usuário.');

            // O Perfil agora é criado automaticamente por um Trigger (handle_new_user) 
            // no banco de dados, ouvindo a tabela auth.users.

            // 2. Sucesso
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
        <div className="mobile-app-container flex items-center justify-center w-full" style={{ padding: 'var(--space-2)', background: 'var(--color-secondary)' }}>

            <div
                className={`neo-box p-4 flex-col items-center ${error ? 'shake-animation' : ''}`}
                style={{ width: '100%', maxWidth: '400px', padding: 'var(--space-4)', textAlign: 'center', background: 'var(--color-surface)' }}
            >
                <h1 style={{ marginBottom: 'var(--space-1)', fontSize: 'var(--font-size-2xl)' }}>Recrutamento</h1>
                <p style={{ marginBottom: 'var(--space-4)', fontWeight: 800, opacity: 0.8 }}>Junte-se à Guilda Familiar!</p>

                <form onSubmit={handleSubmit} style={{ width: '100%' }} className="flex-col gap-3">

                    <div className="flex-col gap-1" style={{ textAlign: 'left' }}>
                        <label className="neo-label">Nome do Personagem</label>
                        <input
                            type="text"
                            className="neo-input"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Ex: ArthurOInvisível"
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

                    <div className="flex-col gap-1" style={{ textAlign: 'left' }}>
                        <label className="neo-label">Classe no Jogo</label>
                        <select
                            className="neo-input"
                            value={role}
                            onChange={(e) => setRole(e.target.value as 'heroi' | 'mestre')}
                            style={{ cursor: 'pointer' }}
                        >
                            <option value="heroi">Herói (Faz as missões)</option>
                            <option value="mestre">Mestre (Cria as missões)</option>
                        </select>
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
                        {isSubmitting ? '🕹️ REGISTRANDO...' : '🕹️ CRIAR PERSONAGEM'}
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
