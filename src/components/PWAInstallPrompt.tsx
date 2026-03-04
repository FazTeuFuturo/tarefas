import React, { useState, useEffect } from 'react';

export const PWAInstallPrompt: React.FC = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [showInstallButton, setShowInstallButton] = useState(false);
    const [showIosPrompt, setShowIosPrompt] = useState(false);
    const [isDismissed, setIsDismissed] = useState(localStorage.getItem('fq_pwa_dismissed') === 'true');

    useEffect(() => {
        if (isDismissed) return;

        // Verifica se já está instalado (standalone)
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
        if (isStandalone) return;

        // Verifica iOS
        const isIos = /ipad|iphone|ipod/.test(navigator.userAgent.toLowerCase()) && !(window as any).MSStream;
        if (isIos) {
            setShowIosPrompt(true);
        }

        // Intercepta Android/Chrome
        const handleBeforeInstallPrompt = (e: any) => {
            e.preventDefault(); // Impede o mini-infobar automático
            setDeferredPrompt(e);
            setShowInstallButton(true);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, [isDismissed]);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;

        // Mostra o prompt nativo
        deferredPrompt.prompt();

        // Aguarda a resposta do usuário
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            console.log('PWA instalado pelo usuário');
            setShowInstallButton(false);
        }

        setDeferredPrompt(null);
    };

    const handleDismiss = () => {
        setIsDismissed(true);
        setShowInstallButton(false);
        setShowIosPrompt(false);
        localStorage.setItem('fq_pwa_dismissed', 'true');
    };

    if (!showInstallButton && !showIosPrompt) return null;

    return (
        <div style={{
            background: 'var(--color-primary)',
            color: '#fff',
            padding: '16px 20px',
            borderRadius: '16px',
            margin: '0 20px 30px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
            maxWidth: '500px',
            width: 'calc(100% - 40px)',
            position: 'relative'
        }}>
            <button
                onClick={handleDismiss}
                style={{
                    position: 'absolute', top: '8px', right: '8px',
                    background: 'rgba(0,0,0,0.2)', color: '#fff',
                    border: 'none', borderRadius: '50%', width: '24px', height: '24px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', fontWeight: 800, fontSize: '10px'
                }}
            >
                ✕
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '28px' }}>⚔️</span>
                <div>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>Melhor Experiência</h3>
                    <p style={{ margin: '4px 0 0', fontSize: '13px', opacity: 0.9 }}>
                        {showInstallButton ? 'Instale o aplicativo para jogar sem interrupções e não deslogar sua conta.' : 'Adicione à Tela de Início para jogar em tela cheia e não perder sua sessão.'}
                    </p>
                </div>
            </div>

            {showInstallButton && (
                <button
                    onClick={handleInstallClick}
                    style={{
                        background: '#fff', color: 'var(--color-primary)',
                        border: 'none', padding: '12px', borderRadius: '12px',
                        fontWeight: 800, fontSize: '15px', cursor: 'pointer',
                        marginTop: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}
                >
                    Instalar Aplicativo Agora
                </button>
            )}

            {showIosPrompt && (
                <div style={{
                    background: 'rgba(255,255,255,0.2)', padding: '12px',
                    borderRadius: '12px', fontSize: '13px', marginTop: '4px',
                    display: 'flex', alignItems: 'center', gap: '8px'
                }}>
                    <span style={{ fontSize: '20px' }}>📤</span>
                    <span>Toque no botão de <b>Compartilhar</b> abaixo e depois em <b>"Adicionar à Tela de Início"</b>.</span>
                </div>
            )}
        </div>
    );
};
