import { useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { useAudio } from '../../contexts/AudioContext';

export const AudioMixer = () => {
    const { isMuted, volume, toggleMute, setVolume } = useAudio();
    const [showSlider, setShowSlider] = useState(false);

    return (
        <div
            className="relative flex items-center group"
            onMouseEnter={() => setShowSlider(true)}
            onMouseLeave={() => setShowSlider(false)}
        >
            {/* Volume Slider - appears on hover */}
            <div
                className={`absolute right-full transition-all duration-300 origin-right flex items-center
          ${showSlider ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'}
        `}
                style={{ zIndex: 100, marginRight: 'var(--space-2)' }}
            >
                <div
                    className="neo-box flex items-center justify-center"
                    style={{ padding: '0 12px', width: '130px', height: '40px', borderRadius: 'var(--border-radius-sm)', backgroundColor: 'var(--color-surface)' }}
                >
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={volume}
                        onChange={(e) => setVolume(Number(e.target.value))}
                        className="w-full cursor-pointer"
                        style={{ accentColor: 'var(--gold-300)', height: '100%', outline: 'none' }}
                    />
                </div>
            </div>

            {/* Tactile Neo-brutalist Button */}
            <button
                onClick={toggleMute}
                className="neo-button"
                style={{ width: '40px', height: '40px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, zIndex: 101 }}
                title={isMuted ? "Ouvir Música Ambiente" : "Silenciar Música Ambiente"}
            >
                {isMuted ? (
                    <VolumeX size={20} className="text-white" />
                ) : (
                    <div className="relative flex items-center justify-center">
                        <Volume2 size={20} className="text-white" />
                        {/* Minimalist visualizer - 3 little bars bouncing */}
                        <div className="absolute -top-[2px] -right-2 flex items-end gap-[1px] h-3">
                            <span className="w-[3px] bg-white animate-[bounce_0.8s_infinite] h-1" />
                            <span className="w-[3px] bg-white animate-[bounce_1.2s_infinite] h-2" />
                            <span className="w-[3px] bg-white animate-[bounce_1.0s_infinite] h-1.5" />
                        </div>
                    </div>
                )}
            </button>

            <style>{`
        @keyframes bounce {
          0%, 100% { transform: scaleY(0.4); }
          50% { transform: scaleY(1); }
        }
      `}</style>
        </div>
    );
};
