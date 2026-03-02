import React, { useState, useEffect } from 'react';
import { Quest } from './QuestCard';
import { LeaderboardEntry } from '../hooks/useAppData';

interface MissionEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (taskId: string, updates: Partial<Quest>) => void;
    quest: Quest | null;
    childProfiles: LeaderboardEntry[];
    parentProfile?: LeaderboardEntry | null;
}

export const MissionEditModal: React.FC<MissionEditModalProps> = ({
    isOpen,
    onClose,
    onSave,
    quest,
    childProfiles,
    parentProfile
}) => {
    const [title, setTitle] = useState('');
    const [desc, setDesc] = useState('');
    const [xp, setXp] = useState(100);
    const [fc, setFc] = useState(50);
    const [duration, setDuration] = useState(10);
    const [assignee, setAssignee] = useState('');

    useEffect(() => {
        if (quest) {
            setTitle(quest.titulo);
            setDesc(quest.descricao || '');
            setXp(quest.xp_reward);
            setFc(quest.fc_reward);
            setDuration(quest.duracao_minutos || 10);
            setAssignee(quest.assignee_id || '');
        }
    }, [quest]);

    if (!isOpen || !quest) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(quest.id, {
            titulo: title,
            descricao: desc,
            xp_reward: xp,
            fc_reward: fc,
            duracao_minutos: duration,
            assignee_id: assignee || null
        });
        onClose();
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: 'var(--space-4)',
            backdropFilter: 'blur(4px)'
        }}>
            <div className="neo-box" style={{
                maxWidth: '500px',
                width: '100%',
                background: 'var(--color-secondary)',
                padding: 'var(--space-4)',
                animation: 'popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
            }}>
                <h2 style={{ marginBottom: 'var(--space-3)', color: 'white' }}>📝 Editar Missão</h2>

                <form onSubmit={handleSubmit} className="flex-col gap-3">
                    <div className="flex-col gap-1">
                        <label className="neo-label" style={{ color: 'white' }}>Título da Tarefa</label>
                        <input
                            type="text"
                            className="neo-input"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            required
                        />
                    </div>

                    <div className="flex-col gap-1">
                        <label className="neo-label" style={{ color: 'white' }}>Descrição</label>
                        <textarea
                            className="neo-input"
                            value={desc}
                            onChange={e => setDesc(e.target.value)}
                            rows={2}
                        />
                    </div>

                    <div className="flex gap-2">
                        <div className="flex-col gap-1" style={{ flex: 1 }}>
                            <label className="neo-label" style={{ color: 'white' }}>Duração (Min)</label>
                            <input
                                type="number"
                                className="neo-input"
                                value={duration}
                                onChange={e => setDuration(Number(e.target.value))}
                                min={1}
                                required
                            />
                        </div>
                        <div className="flex-col gap-1" style={{ flex: 1 }}>
                            <label className="neo-label" style={{ color: 'white' }}>Atribuir a</label>
                            <select
                                className="neo-input"
                                value={assignee}
                                onChange={e => setAssignee(e.target.value)}
                            >
                                <option value="">Qualquer Herói</option>
                                {parentProfile && (
                                    <option value={parentProfile.id}>A mim mesmo ({parentProfile.nome})</option>
                                )}
                                {childProfiles.map(child => (
                                    <option key={child.id} value={child.id}>{child.nome}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <div className="flex-col gap-1" style={{ flex: 1 }}>
                            <label className="neo-label" style={{ color: 'white' }}>Recompensa (XP)</label>
                            <input
                                type="number"
                                className="neo-input"
                                value={xp}
                                onChange={e => setXp(Number(e.target.value))}
                                min={10}
                                required
                            />
                        </div>
                        <div className="flex-col gap-1" style={{ flex: 1 }}>
                            <label className="neo-label" style={{ color: 'white' }}>Moedas (FC)</label>
                            <input
                                type="number"
                                className="neo-input"
                                value={fc}
                                onChange={e => setFc(Number(e.target.value))}
                                min={0}
                                required
                            />
                        </div>
                    </div>

                    <div className="flex gap-3" style={{ marginTop: 'var(--space-2)' }}>
                        <button
                            type="button"
                            className="neo-button"
                            onClick={onClose}
                            style={{ flex: 1, background: '#e5e7eb' }}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="neo-button"
                            style={{ flex: 1, background: 'var(--color-success)', color: 'white' }}
                        >
                            Salvar Alterações
                        </button>
                    </div>
                </form>
            </div>

            <style>{`
                @keyframes popIn {
                    from { transform: scale(0.8); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
            `}</style>
        </div>
    );
};
