import React, { useEffect, useState } from 'react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    title?: string;
    showCloseButton?: boolean;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, title, showCloseButton = true }) => {
    const [shouldRender, setShouldRender] = useState(isOpen);
    const [isClosing, setIsClosing] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setShouldRender(true);
            setIsClosing(false);
            // Prevenir scroll do body
            document.body.style.overflow = 'hidden';
        } else if (shouldRender) {
            setIsClosing(true);
            const timer = setTimeout(() => {
                setShouldRender(false);
                setIsClosing(false);
                document.body.style.overflow = 'auto';
            }, 300); // Sincronizado com a animação de saída no CSS
            return () => clearTimeout(timer);
        }
    }, [isOpen, shouldRender]);

    if (!shouldRender) return null;

    return (
        <div
            className={`modal-overlay ${isClosing ? 'modal-closing' : ''}`}
            onClick={onClose}
        >
            <div
                className={`modal-content neo-box ${isClosing ? 'modal-closing' : ''}`}
                onClick={e => e.stopPropagation()}
                style={{
                    position: 'relative',
                    paddingTop: 'var(--space-4)',
                    borderBottomLeftRadius: 0,
                    borderBottomRightRadius: 0,
                    borderBottom: 'none'
                }}
            >
                {/* Drawer handle */}
                <div style={{
                    width: 40, height: 4, background: '#ddd',
                    borderRadius: 2, margin: '0 auto var(--space-3)',
                    position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)'
                }} />

                {(title || showCloseButton) && (
                    <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-3)' }}>
                        {title && <h2 style={{ margin: 0, fontSize: 'var(--font-size-xl)' }}>{title}</h2>}
                        {showCloseButton && (
                            <button
                                onClick={onClose}
                                className="neo-button"
                                style={{
                                    padding: '6px 12px',
                                    background: 'var(--color-danger)',
                                    color: 'white',
                                    fontSize: 14
                                }}
                            >✕</button>
                        )}
                    </div>
                )}

                {children}
            </div>
        </div>
    );
};
