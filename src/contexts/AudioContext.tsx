import { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode } from 'react';
import { Howl, Howler } from 'howler';

const getLogarithmicVolume = (linearValue: number) => {
    if (linearValue === 0) return 0;
    return Math.pow(linearValue / 100, 2);
};

interface AudioContextType {
    isPlaying: boolean;
    isMuted: boolean;
    volume: number;
    startAudio: () => void;
    stopAudio: () => void;
    toggleMute: () => void;
    setVolume: (value: number) => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export const AudioProvider = ({ children }: { children: ReactNode }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(() => localStorage.getItem('family-quest-audio-muted') === 'true');
    const [volume, setVolumeState] = useState(() => {
        const saved = localStorage.getItem('family-quest-audio-volume');
        return saved ? parseInt(saved, 10) : 50;
    });

    const howlRef = useRef<Howl | null>(null);
    const initiated = useRef(false);
    const volumeRef = useRef(volume);
    const isMutedRef = useRef(isMuted);

    // Keep refs in sync for the event listener closure
    useEffect(() => {
        volumeRef.current = volume;
        isMutedRef.current = isMuted;
    }, [volume, isMuted]);

    useEffect(() => {
        const sound = new Howl({
            src: ['/audio/tavern-at-amberbridge.mp3'],
            loop: true,
            volume: 0,
            preload: true,
        });
        howlRef.current = sound;

        return () => {
            sound.unload();
            howlRef.current = null;
        };
    }, []); // Run ONLY once on mount

    // Chamado após confirmação de PIN.
    // Registra listeners de 1 disparo pois verifyPin é async (sem contexto de gesto direto).
    // O primeiro toque/clique no dashboard aciona o play.
    const startAudio = useCallback(() => {
        if (initiated.current) return;

        const doPlay = () => {
            if (initiated.current) return;
            initiated.current = true;

            const sound = howlRef.current;
            if (!sound) return;

            if (Howler.ctx && Howler.ctx.state === 'suspended') {
                Howler.ctx.resume();
            }

            if (!isMutedRef.current) {
                if (!sound.playing()) sound.play();
                sound.fade(0, getLogarithmicVolume(volumeRef.current), 2000);
                setIsPlaying(true);
            }
        };

        const events = ['click', 'touchstart'] as const;
        const handleEvent = () => {
            events.forEach(e => document.removeEventListener(e, handleEvent));
            doPlay();
        };
        events.forEach(e => document.addEventListener(e, handleEvent, { once: true }));
    }, []);

    const stopAudio = useCallback(() => {
        const sound = howlRef.current;
        if (!sound) return;

        // Reset the start flag so it requires interaction/pin next time
        initiated.current = false;
        setIsPlaying(false);

        if (sound.playing()) {
            sound.fade(sound.volume(), 0, 1000);
            setTimeout(() => {
                if (!initiated.current) {
                    sound.pause();
                }
            }, 1000);
        }
    }, []);

    useEffect(() => {
        const handleVisibilityChange = () => {
            const sound = howlRef.current;
            if (!sound || isMutedRef.current || !initiated.current) return;

            if (document.hidden) {
                sound.fade(sound.volume(), 0, 1000);
                setTimeout(() => {
                    // Check if still hidden to avoid pausing if user came back fast
                    if (document.hidden && sound.playing()) sound.pause();
                }, 1000);
            } else {
                if (Howler.ctx && Howler.ctx.state === 'suspended') Howler.ctx.resume();
                if (!sound.playing()) sound.play();
                sound.fade(0, getLogarithmicVolume(volumeRef.current), 1000);
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    const setVolume = (newVolume: number) => {
        setVolumeState(newVolume);
        volumeRef.current = newVolume;
        localStorage.setItem('family-quest-audio-volume', String(newVolume));

        if (howlRef.current && !isMutedRef.current && initiated.current) {
            howlRef.current.volume(getLogarithmicVolume(newVolume));
        }
    };

    const toggleMute = () => {
        const newVal = !isMuted;
        setIsMuted(newVal);
        isMutedRef.current = newVal;
        localStorage.setItem('family-quest-audio-muted', String(newVal));

        const sound = howlRef.current;
        if (!sound) return;

        if (newVal) {
            // Mute: Fade out and pause to save CPU
            sound.fade(sound.volume(), 0, 1000);
            setTimeout(() => {
                if (isMutedRef.current && sound.playing()) {
                    sound.pause();
                }
            }, 1000);
            setIsPlaying(false);
        } else {
            // Unmute: Resume and fade in
            initiated.current = true; // Ensure flagged as active
            if (Howler.ctx && Howler.ctx.state === 'suspended') {
                Howler.ctx.resume();
            }
            if (!sound.playing()) {
                sound.play();
            }
            sound.fade(0, getLogarithmicVolume(volumeRef.current), 1000);
            setIsPlaying(true);
        }
    };

    return (
        <AudioContext.Provider value={{ isPlaying, isMuted, volume, startAudio, stopAudio, toggleMute, setVolume }}>
            {children}
        </AudioContext.Provider>
    );
};

export const useAudio = () => {
    const context = useContext(AudioContext);
    if (context === undefined) throw new Error('useAudio must be used within an AudioProvider');
    return context;
};
