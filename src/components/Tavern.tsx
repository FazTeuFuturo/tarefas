import React, { useState } from 'react';
import { Reward, useAppData } from '../hooks/useAppData';
import { RewardCard } from './RewardCard';

interface TavernProps {
    profileId: string;
    fcBalance: number;
    onPurchase: (newBalance: number) => void;
}

const ICON_MAP: Record<string, string> = {
    gamepad: '🎮',
    pizza: '🍕',
    moon: '🌙',
    star: '⭐',
    trophy: '🏆',
    gift: '🎁',
};

const playCoinsSound = () => {
    try {
        const AudioCtx = window.AudioContext || (window as Window & typeof globalThis & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new AudioCtx();
        const notes = [523, 659, 784, 1047];
        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.08);
            gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.08);
            gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + i * 0.08 + 0.12);
            osc.start(ctx.currentTime + i * 0.08);
            osc.stop(ctx.currentTime + i * 0.08 + 0.12);
        });
    } catch (err) { console.warn('Audio not supported', err); }
};

export const Tavern: React.FC<TavernProps> = ({ profileId, fcBalance, onPurchase }) => {
    const { rewards, loading, buyReward } = useAppData();
    const [purchasing, setPurchasing] = useState<string | null>(null);
    const [celebration, setCelebration] = useState<string | null>(null);
    const [insufficientId, setInsufficientId] = useState<string | null>(null);

    const handleBuy = async (reward: Reward) => {
        if (fcBalance < reward.cost_fc) {
            setInsufficientId(reward.id);
            setTimeout(() => setInsufficientId(null), 600);
            return;
        }

        setPurchasing(reward.id);
        const success = await buyReward(reward);
        setPurchasing(null);

        if (success) {
            playCoinsSound();
            onPurchase(fcBalance - reward.cost_fc); // Mantém sincronia local se necessário
            setCelebration(reward.id);
            setTimeout(() => setCelebration(null), 2000);
        }
    };

    return (
        <div style={{ paddingBottom: 'var(--space-8)' }}>
            <div style={{ marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <h2 style={{ margin: 0 }}>🏰 Taverna</h2>
                    <p style={{ margin: 0, fontWeight: 800, fontSize: 'var(--font-size-sm)' }}>
                        Seu saldo: <span style={{ color: 'var(--color-primary)' }}>🪙 {fcBalance} FC</span>
                    </p>
                </div>
            </div>

            {loading ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 'var(--space-3)' }}>
                    {[1, 2, 3].map(i => (
                        <div key={i} className="neo-box" style={{ padding: 'var(--space-3)', height: 160 }}>
                            <div className="skeleton" style={{ width: 48, height: 48, borderRadius: '50%', marginBottom: 8 }} />
                            <div className="skeleton" style={{ height: 16, width: '80%', marginBottom: 6 }} />
                            <div className="skeleton" style={{ height: 12, width: '60%' }} />
                        </div>
                    ))}
                </div>
            ) : rewards.length === 0 ? (
                <div className="neo-box" style={{ padding: 'var(--space-6)', textAlign: 'center', opacity: 0.5 }}>
                    <p style={{ fontWeight: 800 }}>A taverna está vazia... Peça ao Mestre para adicionar recompensas!</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 'var(--space-3)' }}>
                    {rewards.map(reward => (
                        <RewardCard
                            key={reward.id}
                            reward={reward}
                            onAction={handleBuy}
                            disabled={purchasing === reward.id}
                            celebrating={celebration === reward.id}
                            insufficient={insufficientId === reward.id}
                            actionLabel={purchasing === reward.id ? '⏳' : celebration === reward.id ? '🎉 COMPRADO!' : undefined}
                            actionColor={celebration === reward.id ? 'var(--color-success)' : undefined}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};
