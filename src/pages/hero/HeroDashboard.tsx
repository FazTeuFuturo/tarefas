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
    const [filterMember, setFilterMember] = useState<string>(activeProfile?.id || 'all');

    const clanQuests = managedQuests.length > 0 ? managedQuests : myQuests;
    const filteredQuests = filterMember === 'all'
        ? clanQuests
        : filterMember === 'unassigned'
            ? clanQuests.filter(q => !q.assignee_id)
            : clanQuests.filter(q => q.assignee_id === filterMember);

    const dailyTasks = filteredQuests.filter(q => q.is_recurring && (q.status === 'active' || q.status === 'pending'));
    const adventureQuests = filteredQuests.filter(q => !q.is_recurring && (q.status === 'active' || q.status === 'pending'));
    const completedDaily = filteredQuests.filter(q => q.is_recurring && (q.status === 'pending' || q.status === 'completed')).length;

    if (!activeProfile) return <div>Herói não selecionado.</div>;

    return (
        <div className="mobile-app-container">
            <header style={{
                position: 'sticky', top: 0, zIndex: 100,
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
                    {heroExitButton}
                </div>
            </header>

            <div style={{ padding: '0 var(--space-2)', paddingBottom: 'var(--space-8)' }}>

                {/* ─── MISSÕES ─── */}
                {view === 'quests' && (
                    <div className="flex-col gap-3" style={{ paddingTop: 'var(--space-3)', animation: 'slideIn 0.2s ease' }}>
                        <StatusBar level={activeProfile.nivel} xp={activeProfile.xp} xpMax={activeProfile.nivel * 100 + 500} credits={activeProfile.fc_balance} />

                        <Inventory />

                        <div className="hide-scroll" style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, marginTop: 'var(--space-2)' }}>
                            <button
                                onClick={() => setFilterMember('all')}
                                style={{
                                    padding: '6px 12px', borderRadius: 20, border: '2px solid #000', fontWeight: 800, fontSize: 12, whiteSpace: 'nowrap',
                                    background: filterMember === 'all' ? '#000' : '#fff', color: filterMember === 'all' ? '#fff' : '#000'
                                }}
                            >Todos</button>
                            {leaderboard.map(hero => (
                                <button
                                    key={hero.id}
                                    onClick={() => setFilterMember(hero.id)}
                                    style={{
                                        padding: '6px 12px', borderRadius: 20, border: '2px solid #000', fontWeight: 800, fontSize: 12, whiteSpace: 'nowrap',
                                        background: filterMember === hero.id ? '#000' : '#fff', color: filterMember === hero.id ? '#fff' : '#000'
                                    }}
                                >{hero.id === activeProfile.id ? 'Eu' : (hero.nome || 'Herói')}</button>
                            ))}
                        </div>

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
                        {/* Ranking da Família */}
                        <div className="neo-box" style={{ padding: 'var(--space-3)', background: 'var(--color-primary)' }}>
                            <h3 style={{ margin: '0 0 var(--space-2)', fontSize: 'var(--font-size-base)', display: 'flex', alignItems: 'center', gap: 8 }}>
                                🎖️ Ranking da Família
                            </h3>
                            <div className="flex-col gap-2">
                                {leaderboard.map((member, idx) => (
                                    <div key={member.id} className="neo-box flex items-center gap-3"
                                        style={{ padding: 'var(--space-2)', background: '#fff' }}>
                                        <span style={{ fontWeight: 800, fontSize: idx === 0 ? 26 : 20, width: 34, textAlign: 'center', flexShrink: 0 }}>
                                            {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                                        </span>
                                        <img
                                            src={/^https?:\/\//.test(member.avatar || '') ? member.avatar : `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.nome}`}
                                            style={{ width: 38, height: 38, borderRadius: '50%', border: '3px solid #000', flexShrink: 0, objectFit: 'cover' }}
                                            alt={member.nome}
                                            onError={(e) => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.nome}`; }}
                                        />
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div className="flex items-center gap-2">
                                                <strong style={{ fontSize: 13 }}>{member.nome}</strong>
                                                {member.id === activeProfile.id && (
                                                    <span style={{ fontSize: 9, fontWeight: 900, background: '#000', color: '#fff', padding: '1px 5px', borderRadius: 3, letterSpacing: '0.5px' }}>
                                                        VOCÊ
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                                                <span style={{ fontSize: 11, fontWeight: 700 }}>Nv {member.nivel}</span>
                                                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-tertiary)' }}>⭐ {member.xp} XP</span>
                                                <span style={{ fontSize: 11, fontWeight: 700 }}>🪙 {member.fc_balance} FC</span>
                                            </div>
                                            {/* XP progress bar */}
                                            <div style={{ marginTop: 4, height: 5, background: 'rgba(0,0,0,0.1)', borderRadius: 3, border: '1px solid rgba(0,0,0,0.15)', overflow: 'hidden' }}>
                                                <div style={{ height: '100%', background: 'var(--color-tertiary)', width: `${Math.min(100, (member.xp / (member.nivel * 100 + 500)) * 100)}%`, borderRadius: 3 }} />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Heróis do Clã */}
                        <div>
                            <h3 style={{ margin: '0 0 var(--space-2)', fontSize: 'var(--font-size-base)' }}>⚔️ Heróis do Clã</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                                {leaderboard.filter(m => m.role === 'child').map(hero => (
                                    <div key={hero.id} className="neo-box" style={{ position: 'relative', padding: 'var(--space-3)', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 8, background: '#fff' }}>
                                        {hero.id === activeProfile.id && (
                                            <button
                                                onClick={() => setIsSettingsOpen(true)}
                                                style={{
                                                    position: 'absolute', top: 5, right: 5,
                                                    background: 'none', border: 'none', cursor: 'pointer',
                                                    fontSize: 16, padding: 4, opacity: 0.6
                                                }}
                                                title="Editar Perfil"
                                            >
                                                ✏️
                                            </button>
                                        )}
                                        {/^https?:\/\//.test(hero.avatar || '') ? (
                                            <img
                                                src={hero.avatar}
                                                style={{ width: 56, height: 56, borderRadius: '50%', border: '3px solid #000', margin: '0 auto', display: 'block', objectFit: 'cover' }}
                                                alt={hero.nome}
                                                onError={(e) => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${hero.nome}`; }}
                                            />
                                        ) : (
                                            <div style={{ width: 56, height: 56, borderRadius: '50%', border: '3px solid #000', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, background: 'var(--color-primary-light)' }}>
                                                {hero.avatar || '🦸'}
                                            </div>
                                        )}
                                        <div>
                                            <strong style={{ fontSize: 13, display: 'block' }}>{hero.nome}</strong>
                                            <span style={{ fontSize: 11, opacity: 0.8 }}>
                                                Nv {hero.nivel} · <span style={{ fontWeight: 700, color: 'var(--color-tertiary-dark)' }}>💰 {hero.fc_balance} FC</span>
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Mestres do Clã */}
                        <div style={{ marginTop: 'var(--space-2)' }}>
                            <h3 style={{ margin: '0 0 var(--space-2)', fontSize: 'var(--font-size-base)' }}>🧙‍♂️ Mestres</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                                {leaderboard.filter(m => m.role === 'parent').map(master => (
                                    <div key={master.id} className="neo-box" style={{ padding: 'var(--space-3)', opacity: 0.9, textAlign: 'center', background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                        <img
                                            src={/^https?:\/\//.test(master.avatar || '') ? master.avatar : `https://api.dicebear.com/7.x/avataaars/svg?seed=${master.nome}`}
                                            style={{ width: 48, height: 48, borderRadius: '50%', border: '3px solid #000', margin: '0 auto 8px', display: 'block', objectFit: 'cover' }}
                                            alt={master.nome}
                                            onError={(e) => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${master.nome}`; }}
                                        />
                                        <p style={{ margin: '0', fontWeight: 800, fontSize: 13, lineHeight: 1.2 }}>{master.nome}</p>
                                        <p style={{ margin: 0, fontSize: 11, opacity: 0.6 }}>Mestre</p>
                                    </div>
                                ))}
                            </div>
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

            <HeroSettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                hero={activeProfile}
                onSaved={() => {
                    window.location.reload();
                }}
            />

            <style>{`
                @keyframes slideIn {
                    from { transform: translateY(16px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `}</style>
        </div>
    );
}
