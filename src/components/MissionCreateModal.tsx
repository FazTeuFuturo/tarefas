import React, { useState } from 'react';
import { LeaderboardEntry } from '../hooks/useAppData';
import { Modal } from './Modal';

interface MissionCreateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (title: string, desc: string, xp: number, fc: number, assigneeId?: string, duration?: number | null, isRecurring?: boolean) => Promise<void>;
    allProfiles: LeaderboardEntry[];
    parentProfile: { id: string; nome: string } | null;
    canAddNormal?: boolean;
    canAddRecurring?: boolean;
}

export const MissionCreateModal: React.FC<MissionCreateModalProps> = ({
    isOpen, onClose, onSave, allProfiles, parentProfile,
    canAddNormal = true, canAddRecurring = true
}) => {
    const [title, setTitle] = useState('');
    const [desc, setDesc] = useState('');
    const [xp, setXp] = useState(100);
    const [fc, setFc] = useState(50);
    const [duration, setDuration] = useState<number | ''>(10);
    const [assigneeId, setAssigneeId] = useState('');
    const [isRecurring, setIsRecurring] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const isBlocked = isRecurring ? !canAddRecurring : !canAddNormal;

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        await onSave(title, desc, xp, fc, assigneeId || undefined, typeof duration === 'number' ? duration : null, isRecurring);
        // Reset form
        setTitle(''); setDesc(''); setXp(100); setFc(50);
        setDuration(10); setAssigneeId(''); setIsRecurring(false);
        setIsSaving(false);
        onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="✨ Nova Missão"
        >
            <form onSubmit={handleSubmit} className="flex-col gap-3">
                <div className="flex-col gap-1">
                    <label className="neo-label">Título da Missão *</label>
                    <input
                        type="text" className="neo-input"
                        placeholder="Ex: Arrumar o quarto"
                        value={title} onChange={e => setTitle(e.target.value)}
                        autoFocus required
                    />
                </div>

                <div className="flex-col gap-1">
                    <label className="neo-label">Descrição</label>
                    <textarea
                        className="neo-input" rows={2}
                        placeholder="Detalhes do que deve ser feito..."
                        value={desc} onChange={e => setDesc(e.target.value)}
                    />
                </div>

                {/* Atribuir + Duração */}
                <div className="flex gap-2">
                    <div className="flex-col gap-1" style={{ flex: 2 }}>
                        <label className="neo-label">Atribuir a</label>
                        <select className="neo-input" value={assigneeId} onChange={e => setAssigneeId(e.target.value)}>
                            <option value="">Qualquer membro</option>
                            {allProfiles.map(c => <option key={c.id} value={c.id}>{c.nome} {c.id === parentProfile?.id ? '(Eu)' : ''}</option>)}
                        </select>
                    </div>
                    <div className="flex-col gap-1" style={{ flex: 1 }}>
                        <label className="neo-label">Duração (min)</label>
                        <input
                            type="number" className="neo-input" placeholder="Sem tempo"
                            min={0} value={duration}
                            onChange={e => setDuration(e.target.value ? Number(e.target.value) : '')}
                        />
                    </div>
                </div>

                {/* XP + FC */}
                <div className="flex gap-2">
                    <div className="flex-col gap-1" style={{ flex: 1 }}>
                        <label className="neo-label">⭐ XP</label>
                        <input type="number" className="neo-input" min={10} value={xp} onChange={e => setXp(Number(e.target.value))} required />
                    </div>
                    <div className="flex-col gap-1" style={{ flex: 1 }}>
                        <label className="neo-label">🪙 Moedas (FC)</label>
                        <input type="number" className="neo-input" min={0} value={fc} onChange={e => setFc(Number(e.target.value))} required />
                    </div>
                </div>

                {/* Recorrente */}
                <div
                    className="flex items-center gap-2"
                    style={{
                        padding: 'var(--space-2)',
                        background: isRecurring ? 'var(--color-primary)' : '#f5f5f5',
                        borderRadius: 8,
                        border: '2px solid #000',
                        cursor: canAddRecurring || !isRecurring ? 'pointer' : 'not-allowed',
                        opacity: !isRecurring && !canAddRecurring ? 0.6 : 1
                    }}
                    onClick={() => {
                        if (!isRecurring && !canAddRecurring) {
                            alert("Limite de missões recorrentes atingido! Faça upgrade para criar mais.");
                            return;
                        }
                        setIsRecurring(!isRecurring);
                    }}
                >
                    <div style={{
                        width: 22, height: 22, border: '2px solid #000', borderRadius: 4,
                        background: isRecurring ? '#000' : '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                    }}>
                        {isRecurring && <span style={{ color: 'white', fontSize: 14, lineHeight: 1 }}>✓</span>}
                    </div>
                    <div>
                        <p style={{ margin: 0, fontWeight: 800, fontSize: 'var(--font-size-sm)' }}>🔁 Missão Recorrente (Diária)</p>
                        <p style={{ margin: 0, fontSize: 12, opacity: 0.7 }}>Volta automaticamente após aprovada</p>
                    </div>
                </div>

                {isBlocked && (
                    <p style={{ margin: 0, color: 'var(--color-danger)', fontSize: 11, fontWeight: 800, textAlign: 'center' }}>
                        ⚠️ Limite do plano gratuito atingido para este tipo de missão!
                    </p>
                )}

                <button
                    type="submit"
                    className="neo-button w-full"
                    style={{
                        background: isBlocked ? '#ccc' : 'var(--color-secondary)',
                        padding: 'var(--space-3)',
                        fontSize: 'var(--font-size-lg)',
                        marginTop: 'var(--space-1)',
                        cursor: isBlocked ? 'not-allowed' : 'pointer'
                    }}
                    disabled={isSaving || isBlocked}
                >
                    {isSaving ? '⏳ SALVANDO...' : isBlocked ? '🚫 LIMITE ATINGIDO' : '✨ CRIAR MISSÃO'}
                </button>
            </form>
        </Modal>
    );
};
