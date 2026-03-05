import React, { useEffect, useState } from 'react';
import { useAuth, Profile } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { PinEntry } from './PinEntry';
import { PWAInstallPrompt } from './PWAInstallPrompt';

export const ProfilePicker: React.FC = () => {
    const { profile: masterProfile, switchToProfile } = useAuth();
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedHero, setSelectedHero] = useState<Profile | null>(null);

    useEffect(() => {
        if (!masterProfile) return;

        const loadFamily = async () => {
            const { data } = await supabase
                .from('profiles')
                .select('*')
                .eq('clan_id', masterProfile.clan_id)
                .order('role', { ascending: false }); // Parent first

            if (data) {
                setProfiles(data as Profile[]);
            }
            setLoading(false);
        };

        loadFamily();
    }, [masterProfile]);

    const handleSelectProfile = (p: Profile) => {
        // Agora tanto Mestre quanto Herói passam pela tela de PIN
        setSelectedHero(p);
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--color-background)' }}>
                <div style={{ fontSize: 48 }}>⚔️</div>
            </div>
        );
    }

    if (selectedHero) {
        // Renderiza a tela de PIN, adaptada para o modo local
        return (
            <PinEntry
                hero={selectedHero}
                onSuccess={() => {
                    switchToProfile(selectedHero);
                }}
                onCancel={() => setSelectedHero(null)}
            />
        );
    }

    return (
        <div style={{
            minHeight: '100vh',
            background: 'var(--color-background)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
        }}>
            <h1 style={{ color: 'var(--color-primary-light)', fontSize: '2rem', marginBottom: '20px', fontWeight: 800, fontFamily: 'var(--font-family-heading)', textShadow: '0 0 14px rgba(245,166,35,0.5)' }}>Quem está jogando?</h1>

            <PWAInstallPrompt />

            <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '10px' }}>
                {profiles.map(p => (
                    <div
                        key={p.id}
                        onClick={() => handleSelectProfile(p)}
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            cursor: 'pointer',
                            transition: 'transform 0.2s',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                        <div style={{
                            width: '120px',
                            height: '120px',
                            borderRadius: '20px',
                            background: p.role === 'parent' ? 'var(--color-primary)' : 'var(--color-secondary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: '10px',
                            border: '4px solid transparent',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                            overflow: 'hidden'
                        }}>
                            {(() => {
                                const isUrl = p.foto_url || p.avatar?.startsWith('http') || p.avatar?.startsWith('data:');
                                const displayUrl = p.foto_url || (isUrl ? p.avatar : null);
                                const emoji = !displayUrl && p.avatar ? p.avatar : (p.role === 'parent' ? '👑' : '⚔️');
                                if (displayUrl) {
                                    return <img src={displayUrl} alt={p.nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />;
                                }
                                return <span style={{ fontSize: '4rem' }}>{emoji}</span>;
                            })()}
                        </div>
                        <span style={{ color: 'var(--color-text)', fontSize: '1.2rem', fontWeight: 600 }}>
                            {p.nome}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};
