import React, { useState, useEffect, useRef, useCallback } from 'react';

import { DeleteConfirmationModal } from './DeleteConfirmationModal';

export interface Quest {
    id: string;
    titulo: string;
    descricao?: string;
    xp_reward: number;
    fc_reward: number;
    status: 'active' | 'pending' | 'completed';
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
                className="neo-box"
                style={{
                    padding: 'var(--space-3)',
                    position: 'relative',
                    borderLeft: `6px solid ${quest.is_recurring ? 'var(--color-warning)' : stateColor}`,
                    background: quest.is_recurring ? 'rgba(255, 230, 100, 0.05)' : 'white',
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
                                    background: 'var(--color-secondary)',
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
                                title="Editar Missão"
                            >
                                ✏️
                            </button>
                        )}
                        {onDelete && (
                            <button
                                onClick={() => setIsDeleteModalOpen(true)}
                                style={{
                                    background: 'var(--color-danger)',
                                    color: 'white',
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
                                title="Excluir Missão"
                            >
                                ✕
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
                            ✕
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
                        <div className="flex gap-2 items-center" style={{ marginTop: 'var(--space-1)', opacity: 0.9 }}>
                            <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-secondary)' }}>★ {quest.xp_reward} XP</span>
                            <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-primary-dark)' }}>💰 {quest.fc_reward} FC</span>
                            <span style={{ fontSize: '10px', background: '#eee', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>👤 {assigneeName || 'Todos'}</span>
                        </div>
                    </div>

                    <div className="flex-col items-center gap-2" style={{ minWidth: 90, textAlign: 'center' }}>
                        {quest.status === 'pending' ? (
                            <div className="flex-col gap-2 w-full">
                                <div className="neo-box" style={{
                                    background: 'var(--color-warning)',
                                    padding: 'var(--space-2)',
                                    fontSize: 'var(--font-size-sm)',
                                    fontWeight: 800,
                                    textAlign: 'center',
                                    minWidth: 120
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
                                    <button className="neo-button" onClick={handleFinish} style={{ width: '100%', background: 'var(--color-success)' }}>
                                        ✅ CONCLUIR
                                    </button>
                                )}

                                {hasTimer && questState === 'idle' && (
                                    <button className="neo-button" onClick={handleStart} style={{ width: '100%' }}>
                                        ▶ INICIAR
                                    </button>
                                )}

                                {hasTimer && questState === 'running' && (
                                    <>
                                        <div style={{
                                            fontFamily: 'monospace',
                                            fontSize: 'var(--font-size-xl)',
                                            fontWeight: 800,
                                            color: timeLeft < 30 ? 'var(--color-danger)' : 'var(--color-secondary)',
                                            animation: timeLeft < 10 ? 'pulse 1s infinite' : 'none',
                                        }}>
                                            {formatTime(timeLeft)}
                                        </div>
                                        <div className="flex gap-2 w-full">
                                            <button className="neo-button" onClick={handlePause} style={{ flex: 1, padding: '4px', fontSize: '12px' }}>
                                                ⏸ PAUSAR
                                            </button>
                                            <button
                                                className="neo-button"
                                                onClick={handleFinish}
                                                style={{ flex: 1, padding: '4px', fontSize: '10px', background: 'var(--color-success)' }}
                                            >
                                                ✓ FINALIZAR
                                            </button>
                                        </div>
                                    </>
                                )}

                                {hasTimer && questState === 'paused' && (
                                    <>
                                        <div style={{
                                            fontFamily: 'monospace',
                                            fontSize: 'var(--font-size-xl)',
                                            fontWeight: 800,
                                            color: 'var(--color-warning)',
                                            opacity: 0.7
                                        }}>
                                            {formatTime(timeLeft)}
                                        </div>
                                        <button className="neo-button" onClick={handleResume} style={{ width: '100%', background: 'var(--color-warning)' }}>
                                            ▶ RETOMAR
                                        </button>
                                    </>
                                )}

                                {hasTimer && questState === 'done' && (
                                    <button
                                        className="neo-button"
                                        onClick={handleFinish}
                                        style={{ width: '100%', background: 'var(--color-success)' }}
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
                    <div style={{
                        marginTop: 'var(--space-2)',
                        height: 8,
                        background: '#eee',
                        border: '2px solid var(--color-border)',
                        borderRadius: 0,
                        overflow: 'hidden',
                    }}>
                        <div style={{
                            width: `${progress}%`,
                            height: '100%',
                            background: questState === 'done' ? 'var(--color-success)' : stateColor,
                            transition: 'width 1s linear, background 0.3s',
                        }} />
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
