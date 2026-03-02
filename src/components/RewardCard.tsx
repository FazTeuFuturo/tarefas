import React from 'react';
import { Reward } from '../hooks/useAppData';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';

export const ICON_MAP: Record<string, string> = {
    gamepad: '🎮',
    pizza: '🍕',
    moon: '🌙',
    star: '⭐',
    trophy: '🏆',
    gift: '🎁',
};

interface RewardCardProps {
    reward: Reward;
    onAction?: (reward: Reward) => void;
    actionLabel?: string;
    actionColor?: string;
    onDelete?: (id: string) => void;
    showDelete?: boolean;
    disabled?: boolean;
    celebrating?: boolean;
    insufficient?: boolean;
}

export const RewardCard: React.FC<RewardCardProps> = ({
    reward,
    onAction,
    actionLabel,
    actionColor,
    onDelete,
    showDelete = false,
    disabled = false,
    celebrating = false,
    insufficient = false,
}) => {
    const [isModalOpen, setIsModalOpen] = React.useState(false);

    // Se o icon_type for uma chave do mapa, usa o emoji. Se não, usa o próprio icon_type (caso já seja um emoji)
    const iconKey = (reward.icon_type || '').toLowerCase();
    const icon = celebrating ? '✨' : (ICON_MAP[iconKey] ?? reward.icon_type ?? '🎁');

    return (
        <>
            <div
                className={`neo-box ${insufficient ? 'shake-animation' : ''}`}
                style={{
                    padding: 'var(--space-3)',
                    textAlign: 'center',
                    position: 'relative',
                    opacity: disabled ? 0.55 : 1,
                    borderColor: celebrating ? 'var(--color-success)' : undefined,
                    transform: celebrating ? 'scale(1.05)' : 'none',
                    transition: 'transform 0.2s, border-color 0.2s',
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                    justifyContent: 'space-between',
                    minHeight: '150px'
                }}
            >
                {showDelete && onDelete && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setIsModalOpen(true);
                        }}
                        style={{
                            position: 'absolute',
                            top: '-10px',
                            right: '-10px',
                            background: 'var(--color-danger)',
                            border: '3px solid var(--color-border)',
                            color: 'white',
                            borderRadius: '50%',
                            width: '32px',
                            height: '32px',
                            fontSize: '16px',
                            cursor: 'pointer',
                            fontWeight: '900',
                            zIndex: 9999,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '2px 2px 0 var(--color-border)',
                            pointerEvents: 'auto'
                        }}
                    >
                        ×
                    </button>
                )}


                <div>
                    <div style={{ fontSize: 40, marginBottom: 'var(--space-1)', filter: celebrating ? 'drop-shadow(0 0 10px gold)' : 'none' }}>
                        {icon}
                    </div>
                    <h4 style={{ margin: '0 0 4px', fontSize: 'var(--font-size-sm)', lineHeight: 1.2 }}>
                        {reward.titulo}
                    </h4>
                    {reward.descricao && (
                        <p style={{ margin: '0 0 var(--space-2)', fontSize: 11, opacity: 0.7, lineHeight: 1.3 }}>
                            {reward.descricao}
                        </p>
                    )}
                </div>

                <div style={{ marginTop: 'auto' }}>
                    {onAction ? (
                        <button
                            className="neo-button"
                            onClick={() => onAction(reward)}
                            disabled={disabled}
                            style={{
                                width: '100%',
                                fontSize: 'var(--font-size-sm)',
                                padding: 'var(--space-1)',
                                background: actionColor || 'var(--color-primary)',
                            }}
                        >
                            {actionLabel || `${reward.cost_fc} FC`}
                        </button>
                    ) : (
                        <div style={{
                            fontWeight: 800,
                            color: 'var(--color-primary)',
                            fontSize: 'var(--font-size-sm)',
                            background: 'var(--color-bg)',
                            padding: '4px',
                            border: '2px solid var(--color-border)'
                        }}>
                            🪙 {reward.cost_fc} FC
                        </div>
                    )}
                </div>
            </div>

            <DeleteConfirmationModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onConfirm={() => onDelete(reward.id)}
                title="Excluir Recompensa"
                message={`Você tem certeza que deseja deletar "${reward.titulo}"? Esta ação não pode ser desfeita.`}
            />
        </>
    );
};
