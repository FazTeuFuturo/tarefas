import React from 'react';
import { Modal } from './Modal';

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
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`⚠️ ${title}`}
            showCloseButton={false}
        >
            <div style={{ padding: '0 0 var(--space-3)' }}>
                <p style={{ marginBottom: 'var(--space-4)', opacity: 0.8, lineHeight: 1.5 }}>
                    {message}
                </p>

                <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                    <button
                        className="neo-button neo-button--ghost"
                        onClick={onClose}
                        style={{ flex: 1, fontSize: '0.9rem' }}
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
        </Modal>
    );
};
