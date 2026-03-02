import React from 'react';
import { useAppData } from '../hooks/useAppData';

const ICON_MAP: Record<string, string> = {
    gamepad: '🎮',
    pizza: '🍕',
    moon: '🌙',
    star: '⭐',
    trophy: '🏆',
    gift: '🎁',
};

export const Inventory: React.FC = () => {
    const { redemptions, useReward, loading } = useAppData();

    // Filter only unused items for the current view
    // Note: in useAppData, redemptions is already filtered for the profile in the context of hero dashboard?
    // Actually, redemptionsRes.data fetches for current profile in list? No, it fetched all for Master.
    // However, in HeroDashboard, useAppData's fetchAll should probably filter? 
    // Let's check useAppData's fetchAll again.

    const myItems = redemptions.filter(r => r.status === 'unused');

    if (loading && myItems.length === 0) {
        return (
            <div className="neo-box" style={{ padding: 'var(--space-4)', opacity: 0.5 }}>
                <div className="skeleton" style={{ height: 20, width: '40%', marginBottom: 10 }} />
                <div className="skeleton" style={{ height: 60, width: '100%' }} />
            </div>
        );
    }

    if (myItems.length === 0) {
        return null; // Don't show anything if empty, or show a nice message
    }

    return (
        <div className="flex-col gap-3" style={{ marginTop: 'var(--space-4)' }}>
            <h2 style={{ marginBottom: 'var(--space-1)', fontSize: 'var(--font-size-lg)' }}>🎒 Inventário</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--space-3)' }}>
                {myItems.map(item => (
                    <div key={item.id} className="neo-box flex items-center justify-between" style={{ padding: 'var(--space-3)', background: 'var(--color-surface)', borderLeft: '6px solid var(--color-success)' }}>
                        <div className="flex items-center gap-3">
                            <span style={{ fontSize: '1.5rem' }}>
                                {ICON_MAP[item.rewards?.icon_type || 'gift'] || '🎁'}
                            </span>
                            <div>
                                <h4 style={{ margin: 0, fontSize: 'var(--font-size-base)' }}>{item.rewards?.titulo}</h4>
                                <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', opacity: 0.7 }}>
                                    {item.rewards?.descricao || 'Resgatado em ' + new Date(item.created_at).toLocaleDateString()}
                                </p>
                            </div>
                        </div>
                        <button
                            className="neo-button"
                            style={{ background: 'var(--color-success)', color: 'white', padding: '6px 12px', fontSize: 'var(--font-size-xs)' }}
                            onClick={() => {
                                if (window.confirm(`Usar "${item.rewards?.titulo}" agora?`)) {
                                    useReward(item.id);
                                }
                            }}
                        >
                            USAR
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};
