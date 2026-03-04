import React, { useEffect, useState } from 'react';
import { useAuth, Profile } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { PinEntry } from './PinEntry';
import { PWAInstallPrompt } from './PWAInstallPrompt';

export const ProfilePicker: React.FC = () => {
    const { profile: masterProfile, switchToHero, exitHeroMode } = useAuth();
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
        if (p.role === 'parent') {
            // Mestre entra direto (por enquanto - no futuro pediremos PIN do master)
            exitHeroMode();
        } else {
            // Herói precisa colocar o PIN
            setSelectedHero(p);
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#1a1a1a' }}>
                <div style={{ fontSize: 48 }}>⚔️</div>
            </div>
        );
    }

    if (selectedHero) {
        // Renderiza a tela de PIN, adaptada para o modo local
        return (
            <PinEntry
                hero={selectedHero}
                onSuccess={() => switchToHero(selectedHero)}
                onCancel={() => setSelectedHero(null)}
            />
        );
    }

    return (
        <div style={{
            minHeight: '100vh',
            background: '#1a1a1a',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
        }}>
            <h1 style={{ color: '#fff', fontSize: '2rem', marginBottom: '20px', fontWeight: 800 }}>Quem está jogando?</h1>

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
                            {p.avatar ? (
                                <img src={p.avatar} alt={p.nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <span style={{ fontSize: '3rem' }}>
                                    {p.role === 'parent' ? '👑' : '⚔️'}
                                </span>
                            )}
                        </div>
                        <span style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 600 }}>
                            {p.nome}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};
