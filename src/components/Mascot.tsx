import React from 'react';

export type MascotState = 'idle' | 'focused_password' | 'worried' | 'happy' | 'error' | 'shy';

interface MascotProps {
    state: MascotState;
    size?: number;
}

export const Mascot: React.FC<MascotProps> = ({ state, size = 150 }) => {
    // Configurações Neobrutalistas
    const strokeWidth = 5;
    const strokeColor = '#000000';

    const getBackgroundColor = () => {
        switch (state) {
            case 'error': return '#EF4444'; // Red for errors
            case 'worried': return '#FACC15'; // Yellow
            case 'happy': return '#4ADE80'; // Green
            case 'focused_password':
            case 'shy': return '#F472B6'; // Pink
            case 'idle':
            default: return '#60A5FA'; // Blue
        }
    };

    const bodyColor = getBackgroundColor();

    // State-based Coordinates
    const isTimid = state === 'focused_password' || state === 'shy';
    const isError = state === 'error';
    const isHappy = state === 'happy';
    const isWorried = state === 'worried';

    // Olhos
    const getEyeComponent = () => {
        if (isTimid) {
            return (
                <g>
                    <path d="M 30 45 Q 35 48 40 45" fill="none" stroke={strokeColor} strokeWidth="3" strokeLinecap="round" />
                    <path d="M 60 45 Q 65 48 70 45" fill="none" stroke={strokeColor} strokeWidth="3" strokeLinecap="round" />
                </g>
            );
        }
        if (isError) {
            return (
                <g>
                    <line x1="30" y1="35" x2="40" y2="45" stroke={strokeColor} strokeWidth="3" strokeLinecap="round" />
                    <line x1="40" y1="35" x2="30" y2="45" stroke={strokeColor} strokeWidth="3" strokeLinecap="round" />
                    <line x1="60" y1="35" x2="70" y2="45" stroke={strokeColor} strokeWidth="3" strokeLinecap="round" />
                    <line x1="70" y1="35" x2="60" y2="45" stroke={strokeColor} strokeWidth="3" strokeLinecap="round" />
                </g>
            );
        }
        const eyeY = isWorried ? 45 : 40;
        const eyeScale = isHappy ? 'scale(1, 0.4)' : (isWorried ? 'scale(1, 1.2)' : 'scale(1, 1)');
        return (
            <g>
                <ellipse cx="35" cy={eyeY} rx="5" ry="5" fill={strokeColor} transform={eyeScale} transform-origin="35 45" />
                <ellipse cx="65" cy={eyeY} rx="5" ry="5" fill={strokeColor} transform={eyeScale} transform-origin="65 45" />
            </g>
        );
    };

    // Boca
    const getMouthComponent = () => {
        if (isError) {
            return <path d="M 40 65 Q 50 55 60 65" fill="none" stroke={strokeColor} strokeWidth="3" strokeLinecap="round" />;
        }
        if (isHappy) {
            return <path d="M 40 60 Q 50 70 60 60" fill="none" stroke={strokeColor} strokeWidth="3" strokeLinecap="round" />;
        }
        if (isWorried) {
            return <path d="M 40 65 Q 50 55 60 65" fill="none" stroke={strokeColor} strokeWidth="3" strokeLinecap="round" />;
        }
        if (isTimid) {
            return <circle cx="50" cy="62" r="2" fill={strokeColor} />;
        }
        // Idle
        return <line x1="45" y1="60" x2="55" y2="60" stroke={strokeColor} strokeWidth="3" strokeLinecap="round" />;
    };

    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ overflow: 'visible', transition: 'all 0.3s ease' }}
        >
            <rect x="15" y="20" width="70" height="70" rx="10" fill={bodyColor} stroke={strokeColor} strokeWidth={strokeWidth} style={{ boxShadow: 'var(--neo-shadow)' }} />
            <rect x="20" y="25" width="70" height="70" rx="10" fill={strokeColor} z="-1" style={{ transform: 'translateZ(-1px)' }} />
            <rect x="15" y="20" width="70" height="70" rx="10" fill={bodyColor} stroke={strokeColor} strokeWidth={strokeWidth} />

            <g style={{ transition: 'all 0.3s ease', transformOrigin: '50px 50px' }}>
                {isWorried && (
                    <>
                        <line x1="30" y1="35" x2="40" y2="30" stroke={strokeColor} strokeWidth="3" strokeLinecap="round" />
                        <line x1="70" y1="35" x2="60" y2="30" stroke={strokeColor} strokeWidth="3" strokeLinecap="round" />
                    </>
                )}
                {isHappy && (
                    <>
                        <path d="M 30 35 Q 35 30 40 35" fill="none" stroke={strokeColor} strokeWidth="3" strokeLinecap="round" />
                        <path d="M 60 35 Q 65 30 70 35" fill="none" stroke={strokeColor} strokeWidth="3" strokeLinecap="round" />
                    </>
                )}

                {getEyeComponent()}
                {getMouthComponent()}
            </g>

            <g
                style={{ transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)', transformOrigin: '50% 100%' }}
                transform={isTimid ? 'translate(0, -20)' : 'translate(0, 30)'}
            >
                <path d="M 10 90 Q 25 50 40 45" fill="none" stroke={bodyColor} strokeWidth="10" strokeLinecap="round" />
                <path d="M 10 90 Q 25 50 40 45" fill="none" stroke={strokeColor} strokeWidth="6" strokeLinecap="round" />
                <path d="M 90 90 Q 75 50 60 45" fill="none" stroke={bodyColor} strokeWidth="10" strokeLinecap="round" />
                <path d="M 90 90 Q 75 50 60 45" fill="none" stroke={strokeColor} strokeWidth="6" strokeLinecap="round" />
            </g>
        </svg>
    );
};
