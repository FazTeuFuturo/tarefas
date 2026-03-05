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
    <div style={{
      background: 'linear-gradient(135deg, var(--color-surface), var(--color-surface-alt))',
      border: 'var(--border-width) solid var(--color-border)',
      borderRadius: 'var(--border-radius)',
      padding: 'var(--space-3)',
      boxShadow: 'var(--shadow-card)',
      marginBottom: 'var(--space-2)',
    }}>
      <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-1)' }}>
        <div className="flex items-center gap-1">
          <span className="level-badge">Nv {level}</span>
          <span style={{
            fontSize: 'var(--font-size-xs)',
            color: 'var(--color-text-muted)',
            fontWeight: 'var(--font-weight-semibold)',
            marginLeft: 'var(--space-sm)',
          }}>
            {xp} / {xpMax} XP
          </span>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-sm)',
          background: 'var(--color-overlay-gold)',
          border: 'var(--border-width) solid var(--color-border-gold)',
          borderRadius: 'var(--border-radius-pill)',
          padding: '4px 12px',
          boxShadow: 'var(--glow-gold)',
        }}>
          <span>🪙</span>
          <span style={{
            fontWeight: 'var(--font-weight-black)',
            fontSize: 'var(--font-size-base)',
            color: 'var(--color-primary-light)',
          }}>
            {credits} FC
          </span>
        </div>
      </div>
      <div className="xp-bar-track">
        <div className="xp-bar-fill" style={{ width: `${fillPercentage}%` }} />
      </div>
    </div>
  );
};
