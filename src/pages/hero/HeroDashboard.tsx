import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { LogOut } from 'lucide-react';
import { StatusBar } from '../../components/StatusBar';
import { Tavern } from '../../components/Tavern';
import { LeaderboardWidget } from '../../components/LeaderboardWidget';
import { Inventory } from '../../components/Inventory';
import { QuestList } from '../../components/QuestList';

// Placeholder for logic hook
import { useAppData } from '../../hooks/useAppData';

export default function HeroDashboard() {
    const { profile, signOut } = useAuth();
    const { myQuests, leaderboard, updateFCBalance, completeQuest, startQuestTimer, pauseQuestTimer, resetQuestTimer } = useAppData();
    const [view, setView] = useState('quests'); // 'quests', 'tavern', 'leaderboard'

    const dailyTasks = myQuests.filter(q => q.is_recurring);
    const adventureQuests = myQuests.filter(q => !q.is_recurring);
    const completedDaily = dailyTasks.filter(q => q.status === 'pending' || q.status === 'completed').length;

    if (!profile) return <div>Herói não encontrado.</div>;

    return (
        <div className="mobile-app-container">
            <header className="flex items-center justify-between neo-box" style={{ padding: 'var(--space-3)', marginBottom: 'var(--space-2)', marginTop: 'var(--space-3)', background: 'var(--color-primary)', marginInline: 'var(--space-2)' }}>
                <div className="flex-col">
                    <h1 style={{ margin: 0, fontSize: 'var(--font-size-xl)', letterSpacing: '-0.5px' }}>Olá, {profile.nome}!</h1>
                    <p style={{ margin: 0, fontWeight: 800 }}>O que vamos conquistar hoje?</p>
                </div>
                <button onClick={signOut} className="neo-button" style={{ padding: '8px', background: 'var(--color-danger)', color: 'white' }} aria-label="Sair">
                    <LogOut size={20} />
                </button>
            </header>

            <div style={{ padding: '0 var(--space-2)', paddingBottom: 'var(--space-8)' }}>
                {view === 'quests' && (
                    <div className="flex-col gap-3">
                        <StatusBar level={profile.nivel} xp={profile.xp} xpMax={profile.nivel * 100 + 500} credits={profile.fc_balance} />

                        <Inventory />

                        {dailyTasks.length > 0 && (
                            <div className="flex-col gap-2" style={{ marginTop: 'var(--space-4)' }}>
                                <div className="flex justify-between items-center">
                                    <h2 style={{ fontSize: 'var(--font-size-lg)', margin: 0 }}>☀️ Deveres Diários</h2>
                                    <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 800, color: 'var(--color-secondary)' }}>
                                        {completedDaily}/{dailyTasks.length} FEITOS
                                    </span>
                                </div>
                                <QuestList
                                    quests={dailyTasks}
                                    onCompleteQuest={completeQuest}
                                    profiles={leaderboard}
                                    onStartTimer={startQuestTimer}
                                    onPauseTimer={pauseQuestTimer}
                                    onResetTimer={resetQuestTimer}
                                />
                            </div>
                        )}

                        <h2 style={{ marginTop: 'var(--space-4)', marginBottom: 'var(--space-2)', fontSize: 'var(--font-size-lg)' }}>⚔️ Missões de Aventura</h2>
                        <QuestList
                            quests={adventureQuests}
                            onCompleteQuest={completeQuest}
                            profiles={leaderboard}
                            onStartTimer={startQuestTimer}
                            onPauseTimer={pauseQuestTimer}
                            onResetTimer={resetQuestTimer}
                        />
                    </div>
                )}

                {view === 'tavern' && (
                    <div style={{ marginTop: 'var(--space-8)' }}>
                        <Tavern profileId={profile.id} fcBalance={profile.fc_balance} onPurchase={updateFCBalance} />
                    </div>
                )}

                {view === 'leaderboard' && (
                    <div style={{ marginTop: 'var(--space-8)' }}>
                        <LeaderboardWidget users={leaderboard.map(u => ({ id: u.id, name: u.nome, level: u.nivel, xp: u.xp, avatarUrl: u.avatar || '', color: 'var(--color-primary)' }))} />
                    </div>
                )}
            </div>

            {/* Bottom Navigation */}
            <nav className="bottom-nav">
                <button className={`nav-item ${view === 'quests' ? 'active' : ''}`} onClick={() => setView('quests')}>
                    <span style={{ fontSize: '1.5rem', marginBottom: '4px' }}>📋</span>
                    Missões
                </button>
                <button className={`nav-item ${view === 'tavern' ? 'active' : ''}`} onClick={() => setView('tavern')}>
                    <span style={{ fontSize: '1.5rem', marginBottom: '4px' }}>🍺</span>
                    Taverna
                </button>
                <button className={`nav-item ${view === 'leaderboard' ? 'active' : ''}`} onClick={() => setView('leaderboard')}>
                    <span style={{ fontSize: '1.5rem', marginBottom: '4px' }}>🏆</span>
                    Ranking
                </button>
            </nav>
        </div>
    );
}
