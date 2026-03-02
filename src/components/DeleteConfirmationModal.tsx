import React from 'react';

interface DeleteConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message
}) => {
    if (!isOpen) return null;

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
            backdropFilter: 'blur(2px)'
        }}>
            <div className="neo-box" style={{
                maxWidth: '400px',
                width: '100%',
                background: 'white',
                padding: 'var(--space-4)',
                animation: 'popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
            }}>
                <h3 style={{ marginBottom: 'var(--space-2)', fontSize: '1.25rem' }}>⚠️ {title}</h3>
                <p style={{ marginBottom: 'var(--space-4)', opacity: 0.8, lineHeight: 1.5 }}>
                    {message}
                </p>

                <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                    <button
                        className="neo-button"
                        onClick={onClose}
                        style={{
                            flex: 1,
                            background: '#e5e7eb',
                            fontSize: '0.9rem'
                        }}
                    >
                        Cancelar
                    </button>
                    <button
                        className="neo-button"
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        style={{
                            flex: 1,
                            background: 'var(--color-danger)',
                            color: 'white',
                            fontSize: '0.9rem'
                        }}
                    >
                        Sim, Excluir
                    </button>
                </div>
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
