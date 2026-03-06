import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Edit2, X } from 'lucide-react';

import { DeleteConfirmationModal } from './DeleteConfirmationModal';

export interface Quest {
    id: string;
    titulo: string;
    descricao?: string;
    xp_reward: number;
    fc_reward: number;
    status: 'active' | 'pending' | 'completed' | 'approved';
    duracao_minutos?: number; // tempo do timer em minutos
    assignee_id?: string | null; // ID do heroi designado. null = todos
    is_recurring: boolean;
    timer_status?: 'idle' | 'running' | 'paused';
    timer_remaining_seconds?: number | null;
    timer_updated_at?: string | null;
}

type QuestState = 'idle' | 'running' | 'paused' | 'done';

interface QuestCardProps {
    quest: Quest;
    onComplete: (id: string, timeSaved: number) => void;
    onDelete?: (id: string) => void;
    onEdit?: (quest: Quest) => void;
    isParent?: boolean; // Pais podem finalizar antes do tempo
    assigneeName?: string;
    onStartTimer?: (id: string, rem: number) => void;
    onPauseTimer?: (id: string, rem: number) => void;
    onResetTimer?: (id: string, init: number) => void;
    onApprove?: (id: string) => void;
    onReject?: (id: string) => void;
}

const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
};

export const QuestCard: React.FC<QuestCardProps> = ({
    quest,
    onComplete,
    onDelete,
    onEdit,
    isParent = false,
    assigneeName,
    onStartTimer,
    onPauseTimer,
    onResetTimer,
    onApprove,
    onReject
}) => {
    const duration = (quest.duracao_minutos ?? 0) * 60;
    const hasTimer = duration > 0;
    const [questState, setQuestState] = useState<QuestState>(hasTimer ? (quest.timer_status || 'idle') : 'idle');
    const [timeLeft, setTimeLeft] = useState(duration);
    const [showXP, setShowXP] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Calc initial time based on persistent data
    useEffect(() => {
        if (!hasTimer) return;
        if (!quest.timer_status || quest.timer_status === 'idle') {
            setTimeLeft(duration);
            setQuestState('idle');
        } else if (quest.timer_status === 'paused') {
            setTimeLeft(quest.timer_remaining_seconds ?? duration);
            setQuestState('paused');
        } else if (quest.timer_status === 'running') {
            const lastUpdate = quest.timer_updated_at ? new Date(quest.timer_updated_at).getTime() : Date.now();
            const elapsed = Math.floor((Date.now() - lastUpdate) / 1000);
            const remaining = (quest.timer_remaining_seconds ?? duration) - elapsed;

            if (remaining <= 0) {
                setTimeLeft(0);
                setQuestState('done');
            } else {
                setTimeLeft(remaining);
                setQuestState('running');
            }
        }
    }, [quest.id, quest.timer_status, quest.timer_remaining_seconds, quest.timer_updated_at, duration]);

    const clearTimer = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    }, []);

    useEffect(() => {
        if (questState !== 'running' || !hasTimer) {
            clearTimer();
            return;
        }
        intervalRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearTimer();
                    setQuestState('done');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return clearTimer;
    }, [questState, clearTimer]);

    const handleStart = () => {
        if (onStartTimer) onStartTimer(quest.id, duration);
    };

    const handlePause = () => {
        if (onPauseTimer) onPauseTimer(quest.id, timeLeft);
    };

    const handleResume = () => {
        if (onStartTimer) onStartTimer(quest.id, timeLeft);
    };

    const handleFinish = () => {
        clearTimer();
        const timeSaved = hasTimer ? timeLeft : 0;
        if (onResetTimer) onResetTimer(quest.id, duration);
        setShowXP(true);
        setTimeout(() => {
            onComplete(quest.id, timeSaved);
        }, 800);
    };

    const handleAbandon = () => {
        clearTimer();
        setQuestState('idle');
        setTimeLeft(duration);
        if (onResetTimer) onResetTimer(quest.id, duration);
    };

    const progress = hasTimer ? ((duration - timeLeft) / duration) * 100 : 100;
    const stateColor = {
        idle: 'var(--color-primary)',
        running: 'var(--color-secondary)',
        paused: 'var(--color-warning)',
        done: 'var(--color-success)',
        pending: 'var(--color-warning)',
    }[questState] || (quest.status === 'pending' ? 'var(--color-warning)' : 'var(--color-primary)');

    return (
        <>
            <div
                className="quest-card"
                style={{
                    padding: 'var(--space-3)',
                    position: 'relative',
                    borderLeft: `6px solid ${quest.is_recurring ? 'var(--color-warning)' : stateColor}`,
                    marginBottom: 'var(--space-3)',
                    transition: 'border-color 0.3s',
                }}
            >
                {/* PARENT CONTROLS */}
                {isParent && (
                    <div style={{
                        position: 'absolute',
                        top: '-10px',
                        right: '10px',
                        display: 'flex',
                        gap: '8px',
                        zIndex: 10
                    }}>
                        {onEdit && (
                            <button
                                onClick={() => onEdit(quest)}
                                style={{
                                    background: 'var(--color-surface-alt)',
                                    color: 'var(--gold-200)',
                                    border: '2px solid var(--color-border)',
                                    borderRadius: '50%',
                                    width: '28px',
                                    height: '28px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: 0,
                                    boxShadow: '2px 2px 0 var(--color-border)',
                                    transition: 'all 0.2s',
                                }}
                                title="Editar Missão"
                                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translate(-2px, -2px)'; e.currentTarget.style.boxShadow = '4px 4px 0 var(--color-border)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '2px 2px 0 var(--color-border)'; }}
                            >
                                <Edit2 size={14} strokeWidth={2.5} />
                            </button>
                        )}
                        {onDelete && (
                            <button
                                onClick={() => setIsDeleteModalOpen(true)}
                                style={{
                                    background: 'var(--color-danger)',
                                    color: 'white',
                                    border: '2px solid var(--color-border)',
                                    borderRadius: '50%',
                                    width: '28px',
                                    height: '28px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: 0,
                                    boxShadow: '2px 2px 0 var(--color-border)',
                                    transition: 'all 0.2s',
                                }}
                                title="Excluir Missão"
                                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translate(-2px, -2px)'; e.currentTarget.style.boxShadow = '4px 4px 0 var(--color-border)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '2px 2px 0 var(--color-border)'; }}
                            >
                                <X size={16} strokeWidth={3} />
                            </button>
                        )}
                    </div>
                )}
                {!isParent && hasTimer && (questState === 'running' || questState === 'paused') && (
                    <div style={{
                        position: 'absolute',
                        top: '-10px',
                        right: '10px',
                        display: 'flex',
                        zIndex: 10
                    }}>
                        <button
                            onClick={handleAbandon}
                            style={{
                                background: 'var(--color-warning)',
                                color: 'black',
                                fontWeight: 800,
                                border: '2px solid var(--color-border)',
                                borderRadius: '50%',
                                width: '28px',
                                height: '28px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: 0,
                                boxShadow: '2px 2px 0 var(--color-border)'
                            }}
                            title="Desistir da Missão"
                        >
                            <X size={16} strokeWidth={3} />
                        </button>
                    </div>
                )}
                {showXP && (
                    <div className="xp-floating" style={{ top: '-10px', right: '20px' }}>
                        +{quest.xp_reward} XP · +{quest.fc_reward} FC
                    </div>
                )}

                <div className="flex justify-between items-start gap-2">
                    <div style={{ flex: 1 }}>
                        <h3 style={{ margin: 0, fontSize: 'var(--font-size-base)' }}>
                            {quest.is_recurring ? '☀️' : '⚔️'} {quest.titulo}
                        </h3>
                        {quest.descricao && (
                            <p style={{ margin: '4px 0 0', fontSize: 'var(--font-size-sm)', opacity: 0.7 }}>
                                {quest.descricao}
                            </p>
                        )}
                        <div className="flex gap-2 items-center" style={{ marginTop: 'var(--space-1)' }}>
                            <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-tertiary-light)' }}>★ {quest.xp_reward} XP</span>
                            <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-primary)' }}>🪙 {quest.fc_reward} FC</span>
                            <span style={{ fontSize: 'var(--font-size-xs)', background: 'var(--color-overlay-white)', border: '1px solid var(--color-border-subtle)', padding: '2px 6px', borderRadius: 'var(--border-radius-sm)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-muted)' }}>👤 {assigneeName || 'Todos'}</span>
                        </div>
                    </div>

                    <div className="flex-col items-center gap-2" style={{ minWidth: 90, textAlign: 'center' }}>
                        {quest.status === 'pending' ? (
                            <div className="flex-col gap-2 w-full">
                                <div style={{
                                    background: 'var(--color-overlay-gold)',
                                    border: 'var(--border-width) solid var(--color-warning)',
                                    borderRadius: 'var(--border-radius-sm)',
                                    padding: 'var(--space-2)',
                                    fontSize: 'var(--font-size-sm)',
                                    fontWeight: 'var(--font-weight-bold)',
                                    textAlign: 'center',
                                    minWidth: 120,
                                    color: 'var(--color-warning)',
                                    boxShadow: 'var(--glow-gold)',
                                }}>
                                    ⏳ EM VALIDAÇÃO
                                </div>
                                {isParent && (
                                    <div className="flex-col gap-1 w-full">
                                        <button
                                            className="neo-button"
                                            onClick={() => onApprove && onApprove(quest.id)}
                                            style={{ background: 'var(--color-success)', color: '#fff', fontSize: '12px', padding: '6px' }}
                                        >
                                            ✅ APROVAR
                                        </button>
                                        <button
                                            onClick={() => onReject && onReject(quest.id)}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 11, color: 'var(--color-danger)', textDecoration: 'underline' }}
                                        >
                                            ✕ Recusar
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <>
                                {!hasTimer && (
                                    <button className="neo-button neo-button--success w-full" onClick={handleFinish}>
                                        ✅ CONCLUIR
                                    </button>
                                )}

                                {hasTimer && questState === 'idle' && (
                                    <button className="neo-button w-full" onClick={handleStart}>
                                        ▶ INICIAR
                                    </button>
                                )}

                                {hasTimer && questState === 'running' && (
                                    <>
                                        <div style={{
                                            fontFamily: 'var(--font-family-mono)',
                                            fontSize: 'var(--font-size-xl)',
                                            fontWeight: 'var(--font-weight-black)',
                                            color: timeLeft < 30 ? 'var(--color-danger)' : 'var(--color-secondary)',
                                            animation: timeLeft < 10 ? 'pulse 1s infinite' : 'none',
                                            textShadow: timeLeft < 30 ? 'var(--glow-danger)' : 'var(--glow-green)',
                                        }}>
                                            {formatTime(timeLeft)}
                                        </div>
                                        <div className="flex gap-2 w-full">
                                            <button className="neo-button neo-button--ghost" onClick={handlePause} style={{ flex: 1, padding: '4px', fontSize: 'var(--font-size-xs)' }}>
                                                ⏸ PAUSAR
                                            </button>
                                            <button
                                                className="neo-button neo-button--success"
                                                onClick={handleFinish}
                                                style={{ flex: 1, padding: '4px', fontSize: 'var(--font-size-xs)' }}
                                            >
                                                ✓ FINALIZAR
                                            </button>
                                        </div>
                                    </>
                                )}

                                {hasTimer && questState === 'paused' && (
                                    <>
                                        <div style={{
                                            fontFamily: 'var(--font-family-mono)',
                                            fontSize: 'var(--font-size-xl)',
                                            fontWeight: 'var(--font-weight-black)',
                                            color: 'var(--color-warning)',
                                            opacity: 0.8,
                                        }}>
                                            {formatTime(timeLeft)}
                                        </div>
                                        <button className="neo-button w-full" onClick={handleResume} style={{ background: 'linear-gradient(180deg, var(--amber-300), var(--amber-500))', borderColor: 'var(--amber-700)', color: 'var(--night-300)' }}>
                                            ▶ RETOMAR
                                        </button>
                                    </>
                                )}

                                {hasTimer && questState === 'done' && (
                                    <button
                                        className="neo-button neo-button--success w-full"
                                        onClick={handleFinish}
                                    >
                                        ✅ FEITO!
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* Timer Progress Bar */}
                {hasTimer && questState !== 'idle' && (
                    <div className="xp-bar-track" style={{ marginTop: 'var(--space-2)', height: 8, borderRadius: 'var(--border-radius-sm)' }}>
                        <div
                            className="xp-bar-fill"
                            style={{
                                width: `${progress}%`,
                                background: questState === 'done' ? 'var(--color-success)' : stateColor,
                                transition: 'width 1s linear, background 0.3s',
                            }}
                        />
                    </div>
                )}

                <DeleteConfirmationModal
                    isOpen={isDeleteModalOpen}
                    onClose={() => setIsDeleteModalOpen(false)}
                    onConfirm={() => onDelete && onDelete(quest.id)}
                    title="Excluir Missão"
                    message={`Você tem certeza que deseja deletar a missão "${quest.titulo}"?`}
                />
            </div>
        </>
    );
};

// Skeleton para loading
export const QuestCardSkeleton: React.FC = () => (
    <div className="neo-box" style={{ padding: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'space-between' }}>
            <div style={{ flex: 1 }}>
                <div className="skeleton" style={{ height: 20, width: '60%', marginBottom: 8 }} />
                <div className="skeleton" style={{ height: 14, width: '40%' }} />
            </div>
            <div className="skeleton" style={{ height: 40, width: 110 }} />
        </div>
    </div>
);
