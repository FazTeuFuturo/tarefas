import React from 'react';

export interface LeaderboardUser {
    id: string;
    name: string;
    avatarUrl: string;
    level: number;
    xp: number;
    color: string;
}

interface LeaderboardProps {
    users: LeaderboardUser[];
}

export const LeaderboardWidget: React.FC<LeaderboardProps> = ({ users }) => {
    // Sort users by level (desc) then by xp (desc)
    const sortedUsers = [...users].sort((a, b) => {
        if (a.level === b.level) {
            return b.xp - a.xp;
        }
        return b.level - a.level;
    });

    return (
        <div className="neo-box p-3" style={{ padding: 'var(--space-3)' }}>
            <h2 style={{ fontSize: 'var(--font-size-xl)', marginBottom: 'var(--space-3)' }}>
                🏆 Ranking Familiar
            </h2>
            <div className="flex-col gap-2">
                {sortedUsers.map((user, index) => (
                    <div
                        key={user.id}
                        className="flex items-center justify-between"
                        style={{
                            padding: 'var(--space-1) 0',
                            borderBottom: index < sortedUsers.length - 1 ? 'var(--border-width) solid var(--color-border)' : 'none'
                        }}
                    >
                        <div className="flex items-center gap-2">
                            <span style={{ fontWeight: 800, fontSize: 'var(--font-size-lg)', width: '24px' }}>
                                #{index + 1}
                            </span>
                            <img
                                src={user.avatarUrl}
                                alt={`${user.name} avatar`}
                                style={{
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: '0',
                                    border: `var(--border-width) solid ${user.color}`,
                                    objectFit: 'cover'
                                }}
                            />
                            <div>
                                <h3 style={{ margin: 0, fontSize: 'var(--font-size-base)' }}>{user.name}</h3>
                                <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 800 }}>Nível {user.level}</span>
                            </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 800 }}>{user.xp} XP</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
