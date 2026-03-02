import React from 'react';

interface StatusBarProps {
  level: number;
  xp: number;
  xpMax: number;
  credits: number;
}

export const StatusBar: React.FC<StatusBarProps> = ({ level, xp, xpMax, credits }) => {
  const fillPercentage = Math.min((xp / xpMax) * 100, 100);

  return (
    <div className="neo-box mb-4 p-3 flex-col gap-2" style={{ padding: 'var(--space-3)' }}>
      
      <div className="flex justify-between items-center mb-1">
        <h2 style={{ margin: 0 }}>Nível {level}</h2>
        <span style={{ fontWeight: 800, fontSize: 'var(--font-size-lg)' }}>💰 {credits} FC</span>
      </div>

      <div 
        style={{ 
          height: '24px', 
          border: 'var(--border-width) solid var(--color-border)', 
          borderRadius: '4px',
          overflow: 'hidden',
          backgroundColor: 'var(--color-bg)',
          position: 'relative'
        }}
      >
        <div 
          style={{
            height: '100%',
            width: `${fillPercentage}%`,
            backgroundColor: 'var(--color-primary)',
            borderRight: fillPercentage > 0 && fillPercentage < 100 ? 'var(--border-width) solid var(--color-border)' : 'none',
            transition: 'width 0.3s ease-out'
          }}
        />
        <span 
          style={{ 
            position: 'absolute', 
            top: 0, 
            left: '50%', 
            transform: 'translateX(-50%)', 
            fontWeight: 800,
            lineHeight: '20px',
            fontSize: 'var(--font-size-sm)'
          }}
        >
          {xp} / {xpMax} XP
        </span>
      </div>
      
    </div>
  );
};
