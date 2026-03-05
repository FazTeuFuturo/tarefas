import React, { useState, useEffect } from 'react';
import { Quest } from './QuestCard';
import { LeaderboardEntry } from '../hooks/useAppData';
import { Modal } from './Modal';

interface MissionEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (taskId: string, updates: Partial<Quest>) => void;
    quest: Quest | null;
    allProfiles: LeaderboardEntry[];
    parentProfile?: LeaderboardEntry | null;
}

export const MissionEditModal: React.FC<MissionEditModalProps> = ({
    isOpen,
    onClose,
    onSave,
    quest,
    allProfiles,
    parentProfile
}) => {
    const [title, setTitle] = useState('');
    const [desc, setDesc] = useState('');
    const [xp, setXp] = useState(100);
    const [fc, setFc] = useState(50);
    const [duration, setDuration] = useState<number | ''>(10);
    const [assignee, setAssignee] = useState('');

    useEffect(() => {
        if (quest) {
            setTitle(quest.titulo);
            setDesc(quest.descricao || '');
            setXp(quest.xp_reward);
            setFc(quest.fc_reward);
            setDuration(quest.duracao_minutos === null || quest.duracao_minutos === undefined ? '' : quest.duracao_minutos);
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
            duracao_minutos: typeof duration === 'number' ? duration : undefined,
            assignee_id: assignee || null
        });
        onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="📝 Editar Missão"
        >
            <form onSubmit={handleSubmit} className="flex-col gap-3">
                <div className="flex-col gap-1">
                    <label className="neo-label">Título da Tarefa</label>
                    <input
                        type="text"
                        className="neo-input"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        required
                    />
                </div>

                <div className="flex-col gap-1">
                    <label className="neo-label">Descrição</label>
                    <textarea
                        className="neo-input"
                        value={desc}
                        onChange={e => setDesc(e.target.value)}
                        rows={2}
                    />
                </div>

                <div className="flex gap-2">
                    <div className="flex-col gap-1" style={{ flex: 1 }}>
                        <label className="neo-label">Duração (Min)</label>
                        <input
                            type="number" className="neo-input" placeholder="Sem tempo"
                            value={duration}
                            onChange={e => setDuration(e.target.value ? Number(e.target.value) : '')}
                            min={0}
                        />
                    </div>
                    <div className="flex-col gap-1" style={{ flex: 1 }}>
                        <label className="neo-label">Atribuir a</label>
                        <select
                            className="neo-input"
                            value={assignee}
                            onChange={e => setAssignee(e.target.value)}
                        >
                            <option value="">Qualquer Herói</option>
                            {allProfiles.map(child => (
                                <option key={child.id} value={child.id}>{child.nome} {child.id === parentProfile?.id ? '(Eu)' : ''}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="flex gap-2">
                    <div className="flex-col gap-1" style={{ flex: 1 }}>
                        <label className="neo-label">Recompensa (XP)</label>
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
                        <label className="neo-label">Moedas (FC)</label>
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
        </Modal>
    );
};
