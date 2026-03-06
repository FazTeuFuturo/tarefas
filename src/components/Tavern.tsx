import React, { useState } from 'react';
import { Reward, useAppData } from '../hooks/useAppData';
import { RewardCard } from './RewardCard';

interface TavernProps {
    // profileId: string; (removido por não ser usado)
    fcBalance: number;
    onPurchase: (newBalance: number) => void;
}

// ICON_MAP removido pois já existe em RewardCard.tsx

const playCoinsSound = () => {
    try {
        const AudioCtx = window.AudioContext || (window as Window & typeof globalThis & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new AudioCtx();
        // Fanfarra ascendente: C5 E5 G5 C6 E6 + eco de moedas
        const melody = [
            { freq: 523,  t: 0,    dur: 0.18 },
            { freq: 659,  t: 0.10, dur: 0.18 },
            { freq: 784,  t: 0.20, dur: 0.18 },
            { freq: 1047, t: 0.30, dur: 0.28 },
            { freq: 1319, t: 0.38, dur: 0.40 },
            // eco de moedas
            { freq: 1047, t: 0.55, dur: 0.12 },
            { freq: 1047, t: 0.65, dur: 0.10 },
            { freq: 1047, t: 0.72, dur: 0.08 },
        ];
        melody.forEach(({ freq, t, dur }) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = t < 0.5 ? 'square' : 'sine';
            osc.frequency.setValueAtTime(freq, ctx.currentTime + t);
            gain.gain.setValueAtTime(t < 0.5 ? 0.12 : 0.07, ctx.currentTime + t);
            gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + t + dur);
            osc.start(ctx.currentTime + t);
            osc.stop(ctx.currentTime + t + dur);
        });
    } catch (err) { console.warn('Audio not supported', err); }
};

export const Tavern: React.FC<TavernProps> = ({ fcBalance, onPurchase }) => {
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
                    <h2 style={{ margin: 0, fontFamily: 'var(--font-family-heading)', color: 'var(--color-primary-light)', textShadow: '0 0 10px rgba(245,166,35,0.4)' }}>🏰 Taverna</h2>
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
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-3)' }}>
                    {rewards.map(reward => (
                        <RewardCard
                            key={reward.id}
                            reward={reward}
                            onAction={handleBuy}
                            disabled={purchasing === reward.id || celebration === reward.id}
                            celebrating={celebration === reward.id}
                            insufficient={insufficientId === reward.id}
                            actionLabel={
                                purchasing === reward.id ? '⏳ Comprando...' :
                                celebration === reward.id ? '🎉 COMPRADO!' :
                                undefined
                            }
                            actionColor={celebration === reward.id ? 'var(--color-success)' : undefined}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};
