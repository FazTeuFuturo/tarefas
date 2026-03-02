import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { LogOut } from 'lucide-react';
import { Tavern } from '../../components/Tavern';
import { StatusBar } from '../../components/StatusBar';

// Placeholder for full logic hook
import { useAppData } from '../../hooks/useAppData';
import { QuestList } from '../../components/QuestList';
import { RewardCard } from '../../components/RewardCard';
import { MissionEditModal } from '../../components/MissionEditModal';
import { Quest } from '../../components/QuestCard';

export default function MasterDashboard() {
    const { profile, signOut } = useAuth();
    const { managedQuests, myQuests, rewards, redemptions, leaderboard, updateFCBalance, completeQuest, createTask, deleteTask, updateTask, approveQuest, rejectQuest, createTavernItem, deleteReward, startQuestTimer, pauseQuestTimer, resetQuestTimer } = useAppData();
    const [view, setView] = useState<'overview' | 'tasks' | 'tavern' | 'bonus' | 'hero' | 'validate'>('overview');

    // States for Mission Form
    const [isCreatingTask, setIsCreatingTask] = useState(false);
    const [taskTitle, setTaskTitle] = useState('');
    const [taskDesc, setTaskDesc] = useState('');
    const [taskXp, setTaskXp] = useState(100);
    const [taskFc, setTaskFc] = useState(50);
    const [taskDuration, setTaskDuration] = useState(10);
    const [taskAssignee, setTaskAssignee] = useState<string>(''); // For later when list of dependents is added
    const [taskIsRecurring, setTaskIsRecurring] = useState(false);

    // States for Editing Task
    const [editingQuest, setEditingQuest] = useState<Quest | null>(null);
    const [isEditingModalOpen, setIsEditingModalOpen] = useState(false);

    const handleCreateTask = async (e: React.FormEvent) => {
        e.preventDefault();
        await createTask(taskTitle, taskDesc, Number(taskXp), Number(taskFc), taskAssignee || undefined, Number(taskDuration), taskIsRecurring);
        setIsCreatingTask(false);
        setTaskTitle('');
        setTaskDesc('');
        setTaskDuration(10);
        setTaskIsRecurring(false);
    };

    const handleEditQuest = (quest: Quest) => {
        setEditingQuest(quest);
        setIsEditingModalOpen(true);
    };

    const handleSaveUpdatedTask = async (taskId: string, updates: Partial<Quest>) => {
        await updateTask(taskId, updates);
        setIsEditingModalOpen(false);
        setEditingQuest(null);
    };

    // Filter children for the assignee dropdown
    const childProfiles = leaderboard.filter(p => p.role === 'child');

    // States for Tavern Form
    const [isCreatingReward, setIsCreatingReward] = useState(false);
    const [rewardTitle, setRewardTitle] = useState('');
    const [rewardDesc, setRewardDesc] = useState('');
    const [rewardCost, setRewardCost] = useState(100);
    const [rewardIcon, setRewardIcon] = useState('🎁');

    const handleCreateReward = async (e: React.FormEvent) => {
        e.preventDefault();
        await createTavernItem(rewardTitle, rewardDesc, Number(rewardCost), rewardIcon);
        setIsCreatingReward(false);
        setRewardTitle('');
        setRewardDesc('');
        setRewardIcon('🎁');
    };

    // States for Bonus Form
    const [isGrantingBonus, setIsGrantingBonus] = useState(false);
    const [bonusType, setBonusType] = useState<'xp' | 'fc'>('fc');
    const [bonusAmount, setBonusAmount] = useState(50);
    const [bonusReason, setBonusReason] = useState('');
    const [bonusTarget, setBonusTarget] = useState<string>(''); // For later selection

    const handleGrantBonus = async (e: React.FormEvent) => {
        e.preventDefault();
        // Since we don't have a specific target selected yet in this simple version, 
        // we log it or handle it for the whole family if needed. 
        // For now, let's just show a success visual (mock implementation)
        console.log(`Granted ${bonusAmount} ${bonusType} for ${bonusReason}`);
        alert(`Bônus de ${bonusAmount} ${bonusType.toUpperCase()} concedido com sucesso!`);
        setIsGrantingBonus(false);
        setBonusAmount(50);
        setBonusReason('');
    };

    return (
        <div className="mobile-app-container">
            <header className="flex items-center justify-between neo-box" style={{ padding: 'var(--space-3)', marginBottom: 'var(--space-2)', marginTop: 'var(--space-3)', background: 'var(--color-primary)', marginInline: 'var(--space-2)' }}>
                <div className="flex-col">
                    <h1 style={{ margin: 0, fontSize: 'var(--font-size-xl)', letterSpacing: '-0.5px' }}>Quartel General</h1>
                    <p style={{ margin: 0, fontWeight: 800 }}>Mestre {profile?.nome}</p>
                </div>
                <button onClick={signOut} className="neo-button" style={{ padding: '8px', background: 'var(--color-danger)', color: 'white' }} aria-label="Sair">
                    <LogOut size={20} />
                </button>
            </header>

            <div style={{ padding: '0 var(--space-2)' }}>
                {view === 'overview' && (
                    <div className="neo-box" style={{ padding: 'var(--space-4)', animation: 'slideIn 0.2s ease' }}>
                        <h2>📊 Visão Geral do Clã</h2>
                        <p style={{ opacity: 0.8, fontWeight: 600 }}>O painel de controle do Mestre. (Em breve: Gráficos de XP e aprovações pendentes).</p>
                    </div>
                )}

                {view === 'tasks' && (
                    <div className="flex-col gap-4" style={{ animation: 'slideIn 0.2s ease', paddingBottom: 'var(--space-8)' }}>
                        <div className="neo-box" style={{ padding: 'var(--space-4)' }}>
                            <h2>⚙️ Missões Pendentes ({managedQuests.length})</h2>
                            <p style={{ opacity: 0.8, fontWeight: 600 }}>Acompanhe e valide o trabalho dos heróis.</p>
                            {managedQuests.length === 0 && <p style={{ marginTop: 'var(--space-3)' }}>Nenhuma missão ativa no momento.</p>}
                            <div className="flex-col gap-3" style={{ marginTop: 'var(--space-3)' }}>
                                <QuestList
                                    quests={managedQuests.filter(q => q.status === 'active')}
                                    onCompleteQuest={completeQuest}
                                    onDeleteQuest={deleteTask}
                                    onEditQuest={handleEditQuest}
                                    isParent={true}
                                    profiles={leaderboard}
                                    onStartTimer={startQuestTimer}
                                    onPauseTimer={pauseQuestTimer}
                                    onResetTimer={resetQuestTimer}
                                />
                            </div>
                        </div>

                        {/* Validar Missões Section */}
                        <div className="neo-box" style={{ padding: 'var(--space-4)', borderLeft: '6px solid var(--color-warning)' }}>
                            <h2>🛡️ Validar Missões ({managedQuests.filter(q => q.status === 'pending').length})</h2>
                            <p style={{ opacity: 0.8, fontWeight: 600 }}>Aprove ou recuse os trabalhos concluídos.</p>

                            <div className="flex-col gap-3" style={{ marginTop: 'var(--space-3)' }}>
                                {managedQuests.filter(q => q.status === 'pending').length === 0 ? (
                                    <p style={{ opacity: 0.5 }}>Nenhuma missão aguardando validação.</p>
                                ) : (
                                    managedQuests.filter(q => q.status === 'pending').map(q => (
                                        <div key={q.id} className="neo-box" style={{ padding: 'var(--space-3)', background: 'white' }}>
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <h3 style={{ margin: 0, fontSize: 'var(--font-size-base)' }}>{q.titulo}</h3>
                                                    <div className="flex gap-2" style={{ marginTop: 4 }}>
                                                        <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--color-secondary)' }}>⭐ {q.xp_reward} XP</span>
                                                        <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--color-primary)' }}>🪙 {q.fc_reward} FC</span>
                                                        <span style={{ fontSize: '10px', fontWeight: 800 }}>👤 {leaderboard.find(p => p.id === q.assignee_id)?.nome || 'Todos'}</span>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        className="neo-button"
                                                        onClick={() => rejectQuest(q.id)}
                                                        style={{ background: 'var(--color-danger)', color: 'white', padding: '6px 10px', fontSize: 12 }}
                                                        title="Recusar"
                                                    >
                                                        ❌
                                                    </button>
                                                    <button
                                                        className="neo-button"
                                                        onClick={() => approveQuest(q.id)}
                                                        style={{ background: 'var(--color-success)', color: 'white', padding: '6px 12px', fontSize: 12, fontWeight: 800 }}
                                                    >
                                                        APROVAR
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* CREATE TASK FORM */}
                        <div className="neo-box" style={{ padding: 'var(--space-4)', background: 'var(--color-secondary)' }}>
                            <h2 style={{ marginBottom: 'var(--space-3)' }}>✨ Nova Missão</h2>

                            {!isCreatingTask ? (
                                <button className="neo-button w-full" style={{ padding: 'var(--space-3)', background: 'var(--color-surface)' }} onClick={() => setIsCreatingTask(true)}>
                                    <span style={{ fontSize: 'var(--font-size-xl)' }}>+</span> CRIAR MISSÃO
                                </button>
                            ) : (
                                <form onSubmit={handleCreateTask} className="flex-col gap-3">
                                    <div className="flex-col gap-1">
                                        <label className="neo-label">Título da Tarefa</label>
                                        <input type="text" className="neo-input" placeholder="Ex: Arrumar a Cama" value={taskTitle} onChange={e => setTaskTitle(e.target.value)} required />
                                    </div>
                                    <div className="flex-col gap-1">
                                        <label className="neo-label">Descrição (Opcional)</label>
                                        <textarea className="neo-input" placeholder="Detalhes do que deve ser feito..." value={taskDesc} onChange={e => setTaskDesc(e.target.value)} rows={2} />
                                    </div>
                                    <div className="flex gap-2">
                                        <div className="flex-col gap-1" style={{ flex: 1 }}>
                                            <label className="neo-label">Duração (Min)</label>
                                            <input type="number" className="neo-input" value={taskDuration} onChange={e => setTaskDuration(Number(e.target.value))} min={1} required />
                                        </div>
                                        <div className="flex-col gap-1">
                                            <label className="neo-label">Atribuir a</label>
                                            <select className="neo-input" value={taskAssignee} onChange={e => setTaskAssignee(e.target.value)}>
                                                <option value="">Qualquer Herói</option>
                                                <option value={profile?.id}>A mim mesmo ({profile?.nome})</option>
                                                {childProfiles.map(child => (
                                                    <option key={child.id} value={child.id}>{child.nome}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <div className="flex-col gap-1" style={{ flex: 1 }}>
                                            <label className="neo-label">Recompensa (XP)</label>
                                            <input type="number" className="neo-input" value={taskXp} onChange={e => setTaskXp(Number(e.target.value))} min={10} required />
                                        </div>
                                        <div className="flex-col gap-1" style={{ flex: 1 }}>
                                            <label className="neo-label">Moedas (FC)</label>
                                            <input type="number" className="neo-input" value={taskFc} onChange={e => setTaskFc(Number(e.target.value))} min={0} required />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2" style={{ marginTop: '4px', cursor: 'pointer' }} onClick={() => setTaskIsRecurring(!taskIsRecurring)}>
                                        <div className="neo-box" style={{
                                            width: 20, height: 20,
                                            background: taskIsRecurring ? 'var(--color-primary)' : 'white',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            padding: 0, cursor: 'pointer'
                                        }}>
                                            {taskIsRecurring && <span style={{ color: 'white', fontSize: 14 }}>✓</span>}
                                        </div>
                                        <label className="neo-label" style={{ margin: 0, cursor: 'pointer' }}>Missão Recorrente (Diária)</label>
                                    </div>
                                    <div className="flex gap-2" style={{ marginTop: 'var(--space-2)' }}>
                                        <button type="submit" className="neo-button" style={{ flex: 2, background: 'var(--color-primary)' }}>SALVAR</button>
                                        <button type="button" className="neo-button" style={{ flex: 1, background: 'var(--color-danger)', color: 'white' }} onClick={() => setIsCreatingTask(false)}>X</button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                )}

                {view === 'tavern' && (
                    <div className="flex-col gap-4" style={{ animation: 'slideIn 0.2s ease', paddingBottom: 'var(--space-8)' }}>
                        <div className="neo-box" style={{ padding: 'var(--space-4)', background: 'var(--color-primary)' }}>
                            <h2 style={{ color: 'white' }}>🍻 Gerenciar Taverna</h2>
                            <p style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>Crie recompensas para os heróis comprarem com as moedas que ganharam nas missões.</p>
                        </div>

                        {/* CREATE REWARD FORM */}
                        <div className="neo-box" style={{ padding: 'var(--space-4)', background: 'var(--color-surface)' }}>
                            <h2 style={{ marginBottom: 'var(--space-3)' }}>🎁 Novo Prêmio</h2>

                            {!isCreatingReward ? (
                                <button className="neo-button w-full" style={{ padding: 'var(--space-3)', background: 'var(--color-secondary)' }} onClick={() => setIsCreatingReward(true)}>
                                    <span style={{ fontSize: 'var(--font-size-xl)' }}>+</span> CADASTRAR PRÊMIO
                                </button>
                            ) : (
                                <form onSubmit={handleCreateReward} className="flex-col gap-3">
                                    <div className="flex-col gap-1">
                                        <label className="neo-label">Nome do Prêmio</label>
                                        <input type="text" className="neo-input" placeholder="Ex: 1 hora de Videogame" value={rewardTitle} onChange={e => setRewardTitle(e.target.value)} required />
                                    </div>
                                    <div className="flex-col gap-1">
                                        <label className="neo-label">Descrição (Opcional)</label>
                                        <textarea className="neo-input" placeholder="Detalhes do prêmio..." value={rewardDesc} onChange={e => setRewardDesc(e.target.value)} rows={2} />
                                    </div>
                                    <div className="flex gap-2">
                                        <div className="flex-col gap-1" style={{ flex: 1 }}>
                                            <label className="neo-label">Custo (FC)</label>
                                            <input type="number" className="neo-input" value={rewardCost} onChange={e => setRewardCost(Number(e.target.value))} min={1} required />
                                        </div>
                                        <div className="flex-col gap-1" style={{ width: '80px' }}>
                                            <label className="neo-label">Emoji</label>
                                            <input type="text" className="neo-input" value={rewardIcon} onChange={e => setRewardIcon(e.target.value)} maxLength={2} style={{ textAlign: 'center' }} required />
                                        </div>
                                    </div>
                                    <div className="flex gap-2" style={{ marginTop: 'var(--space-2)' }}>
                                        <button type="submit" className="neo-button" style={{ flex: 2, background: 'var(--color-primary)' }}>SALVAR</button>
                                        <button type="button" className="neo-button" style={{ flex: 1, background: 'var(--color-danger)', color: 'white' }} onClick={() => setIsCreatingReward(false)}>X</button>
                                    </div>
                                </form>
                            )}
                        </div>

                        {/* LIST REWARDS TO MANAGE */}
                        <div className="neo-box" style={{ padding: 'var(--space-4)', background: 'var(--color-surface)' }}>
                            <h2 style={{ marginBottom: 'var(--space-3)' }}>🏺 Itens da Taverna ({rewards.length})</h2>
                            {rewards.length === 0 && <p style={{ opacity: 0.7 }}>Nenhum item cadastrado ainda.</p>}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 'var(--space-3)' }}>
                                {rewards.map(reward => (
                                    <RewardCard
                                        key={reward.id}
                                        reward={reward}
                                        showDelete={true}
                                        onDelete={deleteReward}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* RECENT REDEMPTIONS */}
                        <div className="neo-box" style={{ padding: 'var(--space-4)', background: '#FEF3C7' }}>
                            <h2 style={{ marginBottom: 'var(--space-2)' }}>🛒 Últimos Resgates</h2>
                            <p style={{ fontSize: 'var(--font-size-sm)', opacity: 0.8, marginBottom: 'var(--space-3)' }}>Veja quem resgatou o quê recentemente na taverna.</p>
                            <div className="flex-col gap-2">
                                {redemptions.length === 0 ? (
                                    <p style={{ opacity: 0.5, fontStyle: 'italic' }}>Nenhum resgate registrado.</p>
                                ) : (
                                    redemptions.map(r => (
                                        <div key={r.id} className="flex justify-between items-center" style={{ padding: '8px', borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
                                            <div>
                                                <strong style={{ color: 'var(--color-tertiary)' }}>{r.profiles?.nome}</strong>
                                                <span style={{ margin: '0 8px', opacity: 0.5 }}>comprou</span>
                                                <strong>{r.rewards?.titulo}</strong>
                                            </div>
                                            <span style={{ fontWeight: 800, color: 'var(--color-primary)' }}>-{r.cost_fc} FC</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {view === 'bonus' && (
                    <div className="neo-box" style={{ background: 'var(--color-secondary)', padding: 'var(--space-4)', animation: 'slideIn 0.2s ease' }}>
                        <h2>🎁 Conceder Bônus</h2>
                        <p style={{ fontWeight: 800 }}>Recompense ou deduza Family Coins diretamente, sem precisar de uma missão.</p>
                    </div>
                )}

                {view === 'hero' && profile && (
                    <div style={{ animation: 'slideIn 0.2s ease' }}>
                        <div style={{ marginBottom: 'var(--space-4)' }}>
                            <StatusBar level={profile.nivel} xp={profile.xp} xpMax={profile.nivel * 100 + 500} credits={profile.fc_balance} />
                        </div>

                        <div className="neo-box" style={{ padding: 'var(--space-4)' }}>
                            <h2>Minhas Missões ({myQuests.length})</h2>
                            <p style={{ opacity: 0.8, fontWeight: 600 }}>Cumpra suas próprias metas impostas a você mesmo.</p>
                        </div>

                        <div style={{ marginTop: 'var(--space-4)' }}>
                            <QuestList
                                quests={myQuests}
                                onCompleteQuest={completeQuest}
                                profiles={leaderboard}
                            />
                        </div>

                        <div style={{ marginTop: 'var(--space-4)' }}>
                            <Tavern profileId={profile.id} fcBalance={profile.fc_balance} onPurchase={updateFCBalance} />
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Navigation */}
            <nav className="bottom-nav">
                <button className={`nav-item ${view === 'overview' ? 'active' : ''}`} onClick={() => setView('overview')}>
                    <span style={{ fontSize: '1.5rem', marginBottom: '4px' }}>🏠</span>
                    Visão Geral
                </button>
                <button className={`nav-item ${view === 'tasks' ? 'active' : ''}`} onClick={() => setView('tasks')} style={{ position: 'relative' }}>
                    <span style={{ fontSize: '1.5rem', marginBottom: '4px' }}>📋</span>
                    Missões
                    {managedQuests.filter(q => q.status === 'pending').length > 0 && (
                        <span style={{
                            position: 'absolute', top: 5, right: '20%',
                            background: 'var(--color-danger)', color: 'white',
                            borderRadius: '50%', width: 18, height: 18,
                            fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: '2px solid white', fontWeight: 800
                        }}>
                            {managedQuests.filter(q => q.status === 'pending').length}
                        </span>
                    )}
                </button>
                <button className={`nav-item ${view === 'tavern' ? 'active' : ''}`} onClick={() => setView('tavern')}>
                    <span style={{ fontSize: '1.5rem', marginBottom: '4px' }}>🍺</span>
                    Taverna
                </button>
                <button className={`nav-item ${view === 'hero' ? 'active' : ''}`} onClick={() => setView('hero')} style={{ background: view === 'hero' ? 'var(--color-secondary)' : 'var(--color-bg)', border: 'var(--border-width) solid var(--color-border)' }}>
                    <span style={{ fontSize: '1.5rem', marginBottom: '4px' }}>🎮</span>
                    JOGAR
                </button>
            </nav>
            {/* MISSION EDIT MODAL */}
            <MissionEditModal
                isOpen={isEditingModalOpen}
                onClose={() => setIsEditingModalOpen(false)}
                onSave={handleSaveUpdatedTask}
                quest={editingQuest}
                childProfiles={childProfiles}
                parentProfile={profile}
            />

            <style>{`
                @keyframes slideIn {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                @keyframes pulse {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                    100% { transform: scale(1); }
                }
            `}</style>
        </div>
    );
}
