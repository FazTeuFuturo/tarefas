import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { StatusBar } from '../../components/StatusBar';
import { Tavern } from '../../components/Tavern';
import { Inventory } from '../../components/Inventory';
import { HeroSettingsModal } from '../../components/HeroSettingsModal';
import { QuestList } from '../../components/QuestList';
import { useAppData } from '../../hooks/useAppData';

interface HeroDashboardProps {
    heroExitButton?: React.ReactNode;
}

export default function HeroDashboard({ heroExitButton }: HeroDashboardProps = {}) {
    const { activeProfile } = useAuth();
    const { myQuests, managedQuests, leaderboard, updateFCBalance, completeQuest, startQuestTimer, pauseQuestTimer, resetQuestTimer } = useAppData();
    const [view, setView] = useState('quests');
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    const dailyTasks = myQuests.filter(q => q.is_recurring);
    const adventureQuests = myQuests.filter(q => !q.is_recurring);
    const completedDaily = dailyTasks.filter(q => q.status === 'pending' || q.status === 'completed').length;

    if (!activeProfile) return <div>Herói não selecionado.</div>;

    return (
        <div className="mobile-app-container">
            <header style={{
                padding: 'var(--space-3) var(--space-2)',
                background: 'var(--color-primary)',
                borderBottom: '3px solid #000',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: 'var(--font-size-xl)' }}>⚔️ {activeProfile.nome}</h1>
                    <p style={{ margin: 0, fontWeight: 800, fontSize: 'var(--font-size-sm)', opacity: 0.8 }}>O que vamos conquistar hoje?</p>
                </div>
                <div className="flex gap-2 items-center">
                    <button
                        onClick={() => setIsSettingsOpen(true)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 24, padding: 0 }}
                        title="Configurações"
                    >
                        ⚙️
                    </button>
                    <span style={{ fontWeight: 800, fontSize: 'var(--font-size-sm)', background: '#fff', padding: '4px 8px', border: '2px solid #000', borderRadius: 6 }}>
                        🪙 {activeProfile.fc_balance} FC
                    </span>
                    {heroExitButton}
                </div>
            </header>

            <div style={{ padding: '0 var(--space-2)', paddingBottom: 'var(--space-8)' }}>

                {/* ─── MISSÕES ─── */}
                {view === 'quests' && (
                    <div className="flex-col gap-3" style={{ paddingTop: 'var(--space-3)', animation: 'slideIn 0.2s ease' }}>
                        <StatusBar level={activeProfile.nivel} xp={activeProfile.xp} xpMax={activeProfile.nivel * 100 + 500} credits={activeProfile.fc_balance} />

                        <Inventory />

                        {dailyTasks.length > 0 && (
                            <div className="flex-col gap-2">
                                <div className="flex justify-between items-center">
                                    <h2 style={{ fontSize: 'var(--font-size-lg)', margin: 0 }}>☀️ Deveres Diários</h2>
                                    <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 800, color: 'var(--color-tertiary)' }}>
                                        {completedDaily}/{dailyTasks.length} feitos
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

                        <h2 style={{ marginTop: 'var(--space-2)', marginBottom: 'var(--space-1)', fontSize: 'var(--font-size-lg)' }}>⚔️ Missões de Aventura</h2>
                        {adventureQuests.length === 0 && (
                            <div className="neo-box" style={{ padding: 'var(--space-3)', textAlign: 'center', opacity: 0.6 }}>
                                <p style={{ margin: 0 }}>😴 Nenhuma missão de aventura no momento.</p>
                            </div>
                        )}
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

                {/* ─── TAVERNA ─── */}
                {view === 'tavern' && (
                    <div style={{ paddingTop: 'var(--space-3)', animation: 'slideIn 0.2s ease' }}>
                        <Tavern fcBalance={activeProfile.fc_balance} onPurchase={updateFCBalance} />
                    </div>
                )}

                {/* ─── CLÃ (Ranking + missões ao vivo) ─── */}
                {view === 'clan' && (
                    <div className="flex-col gap-3" style={{ paddingTop: 'var(--space-3)', animation: 'slideIn 0.2s ease' }}>
                        {/* Ranking de Heróis */}
                        <div className="neo-box" style={{ padding: 'var(--space-3)', background: 'var(--color-secondary)' }}>
                            <h2 style={{ margin: '0 0 var(--space-2)' }}>🏆 Ranking de Heróis</h2>
                            <div className="flex-col gap-2">
                                {leaderboard.filter(m => m.role === 'child').map((member, idx) => (
                                    <div key={member.id} className="flex items-center gap-2 neo-box"
                                        style={{ padding: 'var(--space-2)', background: member.id === activeProfile.id ? '#fff' : 'rgba(255,255,255,0.7)' }}>
                                        <span style={{ fontWeight: 800, fontSize: idx === 0 ? 24 : 18, width: 32, textAlign: 'center' }}>
                                            {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                                        </span>
                                        <img
                                            src={member.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.nome}`}
                                            style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid #000' }}
                                            alt={member.nome}
                                        />
                                        <div style={{ flex: 1 }}>
                                            <strong style={{ fontSize: 'var(--font-size-sm)' }}>
                                                {member.nome}
                                                {member.id === activeProfile.id && (
                                                    <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 800, background: '#000', color: '#fff', padding: '1px 5px', borderRadius: 3 }}>VOCÊ</span>
                                                )}
                                            </strong>
                                            <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                                                <span style={{ fontSize: 11, fontWeight: 700 }}>Nv {member.nivel}</span>
                                                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-tertiary)' }}>⭐ {member.xp} XP</span>
                                            </div>
                                        </div>
                                        <div style={{ width: 60, height: 6, background: 'rgba(0,0,0,0.1)', borderRadius: 3, border: '1px solid #000', overflow: 'hidden' }}>
                                            <div style={{ height: '100%', background: 'var(--color-tertiary)', width: `${Math.min(100, (member.xp / (member.nivel * 100 + 500)) * 100)}%` }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Mestres do Clã */}
                        <div className="neo-box" style={{ padding: 'var(--space-3)' }}>
                            <h2 style={{ margin: '0 0 var(--space-2)', fontSize: 'var(--font-size-base)' }}>🧙‍♂️ Mestres do Clã</h2>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                                {leaderboard.filter(m => m.role === 'parent').map(master => (
                                    <div key={master.id} className="flex flex-col items-center gap-1 neo-box" style={{ padding: 'var(--space-2)', background: '#fff', textAlign: 'center' }}>
                                        <img
                                            src={master.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${master.nome}`}
                                            style={{ width: 40, height: 40, borderRadius: '50%', border: '2px solid #000' }}
                                            alt={master.nome}
                                        />
                                        <span style={{ fontWeight: 800, fontSize: 12 }}>{master.nome}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Missões ao vivo */}
                        <div className="neo-box" style={{ padding: 'var(--space-3)' }}>
                            <h2 style={{ margin: '0 0 var(--space-2)', fontSize: 'var(--font-size-base)' }}>⚡ Missões em Andamento</h2>
                            {managedQuests.filter(q => q.status === 'active' && q.assignee_id !== activeProfile.id).length === 0
                                ? <p style={{ margin: 0, opacity: 0.5, fontSize: 'var(--font-size-sm)' }}>Nenhum colega em missão agora.</p>
                                : managedQuests.filter(q => q.status === 'active' && q.assignee_id !== activeProfile.id).map(q => {
                                    const hero = leaderboard.find(p => p.id === q.assignee_id);
                                    return (
                                        <div key={q.id} className="flex items-center gap-2" style={{ padding: '8px 0', borderBottom: '1px solid #eee' }}>
                                            <img
                                                src={hero?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${hero?.nome || 'hero'}`}
                                                style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid #000', flexShrink: 0 }}
                                                alt={hero?.nome}
                                            />
                                            <div style={{ flex: 1 }}>
                                                <p style={{ margin: 0, fontWeight: 800, fontSize: 'var(--font-size-sm)' }}>{q.titulo}</p>
                                                <p style={{ margin: 0, fontSize: 11, opacity: 0.6 }}>{hero?.nome || 'Alguém'}</p>
                                            </div>
                                            <span style={{ fontSize: 11, fontWeight: 800, opacity: q.timer_status === 'running' ? 1 : 0.4, color: q.timer_status === 'running' ? 'var(--color-success)' : 'var(--color-text)' }}>
                                                {q.timer_status === 'running' ? '⏱️ EM CURSO' : q.timer_status === 'paused' ? '⏸️ PAUSADO' : '💤'}
                                            </span>
                                        </div>
                                    );
                                })
                            }
                        </div>
                    </div>
                )}
            </div>

            {/* ─── BOTTOM NAV ─── */}
            <nav className="bottom-nav">
                <button className={`nav-item ${view === 'quests' ? 'active' : ''}`} onClick={() => setView('quests')}>
                    <span style={{ fontSize: '1.5rem', marginBottom: '4px' }}>📋</span>
                    Missões
                </button>
                <button className={`nav-item ${view === 'tavern' ? 'active' : ''}`} onClick={() => setView('tavern')}>
                    <span style={{ fontSize: '1.5rem', marginBottom: '4px' }}>🍺</span>
                    Taverna
                </button>
                <button className={`nav-item ${view === 'clan' ? 'active' : ''}`} onClick={() => setView('clan')}>
                    <span style={{ fontSize: '1.5rem', marginBottom: '4px' }}>🏆</span>
                    Clã
                </button>
            </nav>

            <style>{`
                @keyframes slideIn {
                    from { transform: translateY(16px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `}</style>
        </div>
    );
}
