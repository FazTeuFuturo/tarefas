import React from 'react';

interface HeroCard {
    id: string;
    nome: string;
    avatar: string;
    nivel: number;
    xp: number;
    role: string;
    pin_hash?: string;
    invite_token?: string;
}

interface ProfilePickerProps {
    heroes: HeroCard[];
    onSelectHero: (hero: HeroCard) => void;
    onMasterLogin: () => void;
}

export const ProfilePicker: React.FC<ProfilePickerProps> = ({ heroes, onSelectHero, onMasterLogin }) => {
    const childHeroes = heroes.filter(h => h.role === 'child' && h.pin_hash && h.invite_token);

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 2500,
            background: '#1a1a1a',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: 24, gap: 32,
        }}>
            <div style={{ textAlign: 'center' }}>
                <h1 style={{ color: '#fff', fontSize: 28, margin: '0 0 8px' }}>⚔️ FamilyQuest</h1>
                <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0, fontSize: 15 }}>Quem vai jogar?</p>
            </div>

            {/* Grid de heróis */}
            {childHeroes.length > 0 ? (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${Math.min(childHeroes.length, 3)}, 1fr)`,
                    gap: 20, width: '100%', maxWidth: 400
                }}>
                    {childHeroes.map(hero => (
                        <button
                            key={hero.id}
                            onClick={() => onSelectHero(hero)}
                            style={{
                                background: 'rgba(255,255,255,0.07)',
                                border: '2px solid rgba(255,255,255,0.15)',
                                borderRadius: 16, padding: '20px 12px',
                                cursor: 'pointer', textAlign: 'center',
                                transition: 'all 0.15s ease',
                                color: '#fff',
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
                                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)';
                                e.currentTarget.style.transform = 'translateY(-4px)';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.background = 'rgba(255,255,255,0.07)';
                                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                                e.currentTarget.style.transform = 'translateY(0)';
                            }}
                        >
                            <div style={{ fontSize: 44, marginBottom: 10 }}>{hero.avatar}</div>
                            <p style={{ margin: '0 0 4px', fontWeight: 800, fontSize: 14 }}>{hero.nome}</p>
                            <p style={{ margin: 0, fontSize: 11, opacity: 0.5 }}>Nv {hero.nivel}</p>
                        </button>
                    ))}
                </div>
            ) : (
                <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
                    <p style={{ fontSize: 40 }}>👥</p>
                    <p style={{ margin: 0, fontWeight: 800 }}>Nenhum herói cadastrado ainda.</p>
                    <p style={{ margin: '4px 0 0', fontSize: 13 }}>Entre como Mestre para criar heróis.</p>
                </div>
            )}

            {/* Entrada do Mestre */}
            <button
                onClick={onMasterLogin}
                style={{
                    background: 'none', border: '2px solid rgba(255,255,255,0.3)',
                    color: 'rgba(255,255,255,0.7)', fontWeight: 800,
                    fontSize: 14, borderRadius: 8, padding: '10px 24px',
                    cursor: 'pointer', transition: 'all 0.1s',
                    marginTop: 8,
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.7)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'}
            >
                👑 Entrar como Mestre
            </button>
        </div>
    );
};
