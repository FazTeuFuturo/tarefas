import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useAppData } from '../../hooks/useAppData';
import { QuestList } from '../../components/QuestList';
import { RewardCard } from '../../components/RewardCard';
import { MissionEditModal } from '../../components/MissionEditModal';
import { MissionCreateModal } from '../../components/MissionCreateModal';
import { HeroCreateModal } from '../../components/HeroCreateModal';
import { MasterCreateModal } from '../../components/MasterCreateModal';
import { PinEntry } from '../../components/PinEntry';
import { StatusBar } from '../../components/StatusBar';
import { Quest } from '../../components/QuestCard';
import { Profile } from '../../contexts/AuthContext';
import { Modal } from '../../components/Modal';
import { uploadAvatar } from '../../lib/storageUtils';
import { ImageCropperModal } from '../../components/ImageCropperModal';
import { DeleteConfirmationModal } from '../../components/DeleteConfirmationModal';
import { AudioMixer } from '../../components/common/AudioMixer';

type MasterView = 'home' | 'missions' | 'tavern' | 'clan';

interface MasterDashboardProps {
    onSwitchToHero?: (hero: Profile) => void;
}

export default function MasterDashboard({ onSwitchToHero }: MasterDashboardProps) {
    const { activeProfile: profile, clearActiveProfile } = useAuth();
    const {
        managedQuests, myQuests, rewards, redemptions, leaderboard,
        completeQuest, createTask, deleteTask, updateTask,
        approveQuest, rejectQuest, createTavernItem, deleteReward,
        startQuestTimer, pauseQuestTimer, resetQuestTimer, updateProfile, deleteProfile, giveBonus
    } = useAppData();

    const [view, setView] = useState<MasterView>('home');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingQuest, setEditingQuest] = useState<Quest | null>(null);
    const [isEditingModalOpen, setIsEditingModalOpen] = useState(false);
    const [filterMember, setFilterMember] = useState<string>('all');
    const [isHeroCreateOpen, setIsHeroCreateOpen] = useState(false);
    const [isMasterCreateOpen, setIsMasterCreateOpen] = useState(false);
    const [pendingSwitch, setPendingSwitch] = useState<any | null>(null);
    const [heroToDelete, setHeroToDelete] = useState<any | null>(null);
    const [statusFilter, setStatusFilter] = useState<'active' | 'pending'>('active');

    // Identifica se o Mestre atual é o dono do Clã (Primary Parent)
    const isPrimaryParent = profile?.role === 'parent' && (!profile?.created_by || profile?.id === profile?.clan_id);

    // Lógica de Planos e Limites (MVP)
    const currentPlan = (profile as any)?.plan || 'free'; // 'free' ou 'premium'
    const limits = {
        free: { heroes: 1, masters: 1, normalQuests: 2, recurringQuests: 1 },
        premium: { heroes: 3, masters: 2, normalQuests: 100, recurringQuests: 100 }
    }[currentPlan as 'free' | 'premium'] || { heroes: 1, masters: 1, normalQuests: 2, recurringQuests: 1 };

    const numHeroes = leaderboard.filter(m => m.role === 'child').length;
    const numMasters = leaderboard.filter(m => m.role === 'parent').length;

    // Contagem de Missões para Limites (inclui Ativas, Completas e Pendentes - TUDO que não foi aprovado ainda)
    const activeQuestsList = managedQuests.filter(q => q.status !== 'approved');
    const normalCount = activeQuestsList.filter(q => !q.is_recurring).length;
    const recurringCount = activeQuestsList.filter(q => q.is_recurring).length;

    const canAddHero = numHeroes < limits.heroes;
    const canAddMaster = numMasters < limits.masters;
    const canAddNormalQuest = normalCount < limits.normalQuests;
    const canAddRecurringQuest = recurringCount < limits.recurringQuests;

    const [isEditMasterOpen, setIsEditMasterOpen] = useState(false);
    const [editMasterName, setEditMasterName] = useState('');
    const [editMasterBirthDate, setEditMasterBirthDate] = useState('');
    const [editMasterPhoto, setEditMasterPhoto] = useState('');
    const [isSavingMaster, setIsSavingMaster] = useState(false);
    const [isRedirectingStripe, setIsRedirectingStripe] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [isCropperOpen, setIsCropperOpen] = useState(false);
    const [tempImage, setTempImage] = useState<string | null>(null);

    // Tavern form
    const [isCreatingReward, setIsCreatingReward] = useState(false);
    const [rewardTitle, setRewardTitle] = useState('');
    const [rewardDesc, setRewardDesc] = useState('');
    const [rewardCost, setRewardCost] = useState(100);
    const [rewardIcon, setRewardIcon] = useState('🎁');

    // Bonus
    const [isBonusOpen, setIsBonusOpen] = useState(false);
    const [bonusHeroId, setBonusHeroId] = useState('');
    const [bonusFC, setBonusFC] = useState(50);
    const [bonusXP, setBonusXP] = useState(0);
    const [bonusSending, setBonusSending] = useState(false);

    const handleStripeUpgrade = async () => {
        setIsRedirectingStripe(true);
        try {
            const { data, error } = await supabase.functions.invoke('create-stripe-checkout');
            if (error) throw error;
            if (data?.url) {
                window.location.href = data.url;
            } else {
                throw new Error('URL de checkout não recebida');
            }
        } catch (err: any) {
            console.error('Erro ao iniciar checkout:', err);
            alert('Não foi possível iniciar o checkout. Verifique sua conexão ou tente novamente mais tarde.');
        } finally {
            setIsRedirectingStripe(false);
        }
    };

    const handleGiveBonus = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!bonusHeroId) return;
        setBonusSending(true);
        const ok = await giveBonus(bonusHeroId, bonusFC, bonusXP);
        setBonusSending(false);
        if (ok) {
            setIsBonusOpen(false);
            setBonusFC(50); setBonusXP(0); setBonusHeroId('');
        }
    };

    const handleCreateReward = async (e: React.FormEvent) => {
        e.preventDefault();
        await createTavernItem(rewardTitle, rewardDesc, Number(rewardCost), rewardIcon);
        setIsCreatingReward(false);
        setRewardTitle(''); setRewardDesc(''); setRewardIcon('🎁');
    };

    const pendingQuests = managedQuests.filter(q => q.status === 'pending');
    const pendingCount = pendingQuests.length;

    // All relevant quests (managed + own), filtered by selected member and status
    const allRelevantQuests = [...managedQuests, ...myQuests.filter(q => !managedQuests.find(mq => mq.id === q.id))]
        .filter(q => q.status === statusFilter);
    const filteredQuests = filterMember === 'all'
        ? allRelevantQuests
        : filterMember === 'unassigned'
            ? allRelevantQuests.filter(q => !q.assignee_id)
            : allRelevantQuests.filter(q => q.assignee_id === filterMember);

    if (!profile) return null;

    return (
        <div className="mobile-app-container">
            {/* HEADER */}
            <header style={{
                position: 'sticky',
                top: 0,
                zIndex: 50,
                padding: 'var(--space-3) var(--space-2)',
                background: 'linear-gradient(135deg, var(--night-200), var(--night-100))',
                borderBottom: 'var(--border-width) solid var(--color-border-gold)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: 'var(--font-size-xl)', fontFamily: 'var(--font-family-heading)', color: 'var(--color-primary-light)', textShadow: '0 0 12px rgba(245,166,35,0.5)' }}>🧙‍♂️ Quartel General</h1>
                    <p style={{ margin: 0, fontWeight: 'var(--font-weight-bold)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                        Mestre {profile.nome}
                    </p>
                </div>
                <div className="flex gap-2 items-center">
                    <AudioMixer />
                    <button
                        onClick={clearActiveProfile}
                        className="neo-button neo-button--danger"
                        style={{ padding: '8px', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        title="Sair"
                    >
                        <span style={{ fontSize: 18, fontWeight: 'var(--font-weight-black)' }}>✕</span>
                    </button>
                </div>
            </header>

            <div style={{ padding: '0 var(--space-2)', paddingBottom: 90 }}>

                {/* ────── 🏠 INÍCIO ────── */}
                {view === 'home' && (
                    <div className="flex-col gap-3" style={{ paddingTop: 'var(--space-3)', animation: 'slideIn 0.2s ease' }}>

                        {/* Status */}
                        <StatusBar level={profile.nivel} xp={profile.xp} xpMax={profile.nivel * 100 + 500} credits={profile.fc_balance} />

                        {/* Mural de Performance */}
                        <div className="neo-box" style={{ padding: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: 12 }}>
                            <span style={{ fontSize: 32 }}>📈</span>
                            <div>
                                <p style={{ margin: 0, fontWeight: 'var(--font-weight-bold)', fontFamily: 'var(--font-family-heading)', fontSize: 'var(--font-size-sm)' }}>Mural de Performance</p>
                                <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>Em breve: Estatísticas detalhadas do clã.</p>
                            </div>
                        </div>

                        {/* 💎 BANNER DE UPGRADE */}
                        {isPrimaryParent && currentPlan === 'free' && (
                            <div className="neo-box" style={{
                                padding: 'var(--space-3)',
                                background: 'linear-gradient(135deg, var(--purple-700), var(--purple-900))',
                                border: 'var(--border-width-thick) solid var(--color-tertiary-light)',
                                boxShadow: 'var(--neo-shadow), var(--glow-purple)',
                                marginBottom: 'var(--space-2)'
                            }}>
                                <h3 style={{ margin: '0 0 var(--space-2)', fontSize: 'var(--font-size-xs)', textTransform: 'uppercase', color: 'var(--purple-300)', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span>💎</span> ASSINATURA PREMIUM
                                </h3>
                                <div className="flex items-center justify-between mb-3">
                                    <div style={{ flex: 1 }}>
                                        <p style={{ margin: '0 0 4px', fontWeight: 'var(--font-weight-bold)', fontSize: 'var(--font-size-base)', fontFamily: 'var(--font-family-heading)', color: 'var(--color-primary-light)' }}>Plano Clã Lendário</p>
                                        <div className="flex flex-col gap-1">
                                            <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', fontWeight: 'var(--font-weight-semibold)' }}>✅ 3 Heróis + 2 Mestres</p>
                                            <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', fontWeight: 'var(--font-weight-semibold)' }}>✅ Missões simples e recorrentes infinitas</p>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <p style={{ margin: 0, fontWeight: 'var(--font-weight-black)', fontSize: 'var(--font-size-lg)', color: 'var(--color-primary-light)' }}>R$ 9,90</p>
                                        <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Por Mês</p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleStripeUpgrade}
                                    disabled={isRedirectingStripe}
                                    className="neo-button w-full"
                                >
                                    {isRedirectingStripe ? 'CARREGANDO...' : 'ASSINAR AGORA (MENSAL) ➜'}
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* ────── 📋 MISSÕES ────── */}
                {view === 'missions' && (
                    <div className="flex-col gap-3" style={{ paddingTop: 'var(--space-3)', animation: 'slideIn 0.2s ease', paddingBottom: 80 }}>
                        <div className="flex items-center justify-between">
                            <h2 style={{ margin: 0, fontFamily: 'var(--font-family-heading)', color: 'var(--color-primary-light)', fontSize: 'var(--font-size-lg)' }}>📜 Missões do Clã</h2>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setStatusFilter('active')}
                                    className={`filter-chip${statusFilter === 'active' ? ' active' : ''}`}
                                    style={{ padding: '4px 12px' }}
                                >
                                    ATIVAS
                                </button>
                                <button
                                    onClick={() => setStatusFilter('pending')}
                                    className={`filter-chip${statusFilter === 'pending' ? ' active' : ''}`}
                                    style={{ padding: '4px 12px', position: 'relative', ...(statusFilter === 'pending' ? { background: 'var(--color-danger)', borderColor: 'var(--crimson-700)' } : {}) }}
                                >
                                    PENDENTES
                                    {pendingCount > 0 && (
                                        <span style={{
                                            position: 'absolute', top: -8, right: -8,
                                            background: 'var(--color-danger)', color: '#fff',
                                            borderRadius: '50%', width: 18, height: 18,
                                            fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            border: 'var(--border-width) solid var(--color-border)', fontWeight: 'var(--font-weight-bold)'
                                        }}>{pendingCount}</span>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Filtro por membro */}
                        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                            {[{ id: 'all', nome: 'Todos' }, ...leaderboard].map(m => (
                                <button
                                    key={m.id}
                                    onClick={() => setFilterMember(m.id)}
                                    className={`filter-chip${filterMember === m.id ? ' active' : ''}`}
                                    style={{ flexShrink: 0 }}
                                >
                                    {m.nome === 'Todo o Clã' ? 'Todos' : m.nome}
                                </button>
                            ))}
                        </div>

                        {filteredQuests.length === 0 ? (
                            <div className="neo-box" style={{ padding: 'var(--space-4)', textAlign: 'center', opacity: 0.5 }}>
                                <span style={{ fontSize: 36, display: 'block', marginBottom: 8 }}>
                                    {statusFilter === 'active' ? '😴' : '✅'}
                                </span>
                                <p style={{ margin: 0, fontWeight: 800 }}>
                                    {statusFilter === 'active' ? 'Nenhuma missão ativa.' : 'Nenhuma missão pendente.'}
                                </p>
                            </div>
                        ) : (
                            <QuestList
                                quests={filteredQuests}
                                onCompleteQuest={completeQuest}
                                onDeleteQuest={deleteTask}
                                onEditQuest={(q) => { setEditingQuest(q); setIsEditingModalOpen(true); }}
                                isParent={true}
                                profiles={leaderboard}
                                onStartTimer={startQuestTimer}
                                onPauseTimer={pauseQuestTimer}
                                onResetTimer={resetQuestTimer}
                                onApproveQuest={approveQuest}
                                onRejectQuest={rejectQuest}
                            />
                        )}
                    </div>
                )}

                {/* ────── 🍺 TAVERNA ────── */}
                {view === 'tavern' && (
                    <div className="flex-col gap-3" style={{ paddingTop: 'var(--space-3)', animation: 'slideIn 0.2s ease' }}>

                        {/* Header */}
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 style={{ margin: 0, fontFamily: 'var(--font-family-heading)', color: 'var(--color-primary-light)', textShadow: '0 0 10px rgba(245,166,35,0.4)' }}>🍺 Taverna</h2>
                                <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', fontWeight: 'var(--font-weight-semibold)' }}>
                                    {rewards.length} prêmio{rewards.length !== 1 ? 's' : ''} · {redemptions.length} resgate{redemptions.length !== 1 ? 's' : ''}
                                </p>
                            </div>
                            {!isCreatingReward && (
                                <button className="neo-button" style={{ fontSize: 'var(--font-size-sm)', padding: '8px 14px' }} onClick={() => setIsCreatingReward(true)}>
                                    ＋ Novo Prêmio
                                </button>
                            )}
                        </div>

                        {/* Formulário de criação */}
                        {isCreatingReward && (
                            <div className="neo-box" style={{ padding: 'var(--space-3)', borderColor: 'var(--color-border-gold)', boxShadow: 'var(--neo-shadow), var(--glow-gold)' }}>
                                <h3 style={{ margin: '0 0 var(--space-2)', fontFamily: 'var(--font-family-heading)', color: 'var(--color-primary-light)', fontSize: 'var(--font-size-base)' }}>🎁 Novo Prêmio</h3>
                                <form onSubmit={handleCreateReward} className="flex-col gap-2">
                                    <input type="text" className="neo-input" placeholder="Nome do prêmio" value={rewardTitle} onChange={e => setRewardTitle(e.target.value)} required />
                                    <textarea className="neo-input" rows={2} placeholder="Descrição (opcional)..." value={rewardDesc} onChange={e => setRewardDesc(e.target.value)} />
                                    <div className="flex gap-2">
                                        <div style={{ flex: 1 }}>
                                            <label className="neo-label">Custo (FC)</label>
                                            <input type="number" className="neo-input" min={1} value={rewardCost} onChange={e => setRewardCost(Number(e.target.value))} required />
                                        </div>
                                        <div style={{ width: 70 }}>
                                            <label className="neo-label">Emoji</label>
                                            <input type="text" className="neo-input" style={{ textAlign: 'center' }} placeholder="🎁" value={rewardIcon} onChange={e => setRewardIcon(e.target.value)} maxLength={2} />
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button type="submit" className="neo-button" style={{ flex: 2 }}>✦ SALVAR PRÊMIO</button>
                                        <button type="button" className="neo-button neo-button--ghost" style={{ flex: 1 }} onClick={() => setIsCreatingReward(false)}>Cancelar</button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {/* Grid de prêmios */}
                        {rewards.length === 0 ? (
                            <div className="neo-box" style={{ padding: 'var(--space-6)', textAlign: 'center' }}>
                                <span style={{ fontSize: 40, display: 'block', marginBottom: 'var(--space-2)' }}>🏺</span>
                                <p style={{ margin: 0, color: 'var(--color-text-muted)', fontWeight: 'var(--font-weight-semibold)' }}>Nenhum prêmio cadastrado ainda.</p>
                                <p style={{ margin: '4px 0 0', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>Clique em "＋ Novo Prêmio" para começar.</p>
                            </div>
                        ) : (
                            <div>
                                <p style={{ margin: '0 0 var(--space-2)', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    🏺 {rewards.length} Prêmio{rewards.length !== 1 ? 's' : ''} disponíveis
                                </p>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-3)', paddingTop: 14 }}>
                                    {rewards.map(r => <RewardCard key={r.id} reward={r} showDelete onDelete={deleteReward} />)}
                                </div>
                            </div>
                        )}

                        {/* Dar Bônus Avulso */}
                        <div className="neo-box" style={{ padding: 'var(--space-3)', background: 'var(--color-surface-alt)' }}>
                            <div className="flex items-center justify-between" style={{ marginBottom: isBonusOpen ? 'var(--space-2)' : 0 }}>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: 'var(--font-size-base)', fontFamily: 'var(--font-family-heading)', color: 'var(--color-primary-light)' }}>💰 Dar Bônus</h3>
                                    {!isBonusOpen && <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>Credite FC ou XP diretamente a um herói</p>}
                                </div>
                                <button
                                    className={`neo-button${isBonusOpen ? ' neo-button--ghost' : ''}`}
                                    style={{ fontSize: 12, padding: '6px 12px' }}
                                    onClick={() => setIsBonusOpen(v => !v)}
                                >{isBonusOpen ? '✕ Cancelar' : '＋ Dar Bônus'}</button>
                            </div>

                            {isBonusOpen && (
                                <form onSubmit={handleGiveBonus} className="flex-col gap-2">
                                    <div>
                                        <label className="neo-label">Herói</label>
                                        <select className="neo-input" value={bonusHeroId} onChange={e => setBonusHeroId(e.target.value)} required>
                                            <option value="">Selecione um herói...</option>
                                            {leaderboard.filter(p => p.role === 'child').map(h => (
                                                <option key={h.id} value={h.id}>{h.nome}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex gap-2">
                                        <div style={{ flex: 1 }}>
                                            <label className="neo-label">🪙 FC</label>
                                            <input type="number" min={0} max={9999} className="neo-input" value={bonusFC} onChange={e => setBonusFC(Number(e.target.value))} />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <label className="neo-label">⭐ XP</label>
                                            <input type="number" min={0} max={9999} className="neo-input" value={bonusXP} onChange={e => setBonusXP(Number(e.target.value))} />
                                        </div>
                                    </div>
                                    <button
                                        type="submit"
                                        className="neo-button"
                                        disabled={bonusSending || !bonusHeroId || (bonusFC === 0 && bonusXP === 0)}
                                    >
                                        {bonusSending ? '⏳ Enviando...' : '🎉 Confirmar Bônus'}
                                    </button>
                                </form>
                            )}
                        </div>

                        {/* Últimos resgates */}
                        {redemptions.length > 0 && (
                            <div className="neo-box" style={{ padding: 'var(--space-3)', borderColor: 'var(--color-border-gold)' }}>
                                <h3 style={{ margin: '0 0 var(--space-2)', fontSize: 'var(--font-size-base)', fontFamily: 'var(--font-family-heading)', color: 'var(--color-primary-light)' }}>🛒 Últimos Resgates</h3>
                                {redemptions.slice(0, 8).map(r => (
                                    <div key={r.id} className="flex justify-between items-center" style={{ padding: '8px 0', borderBottom: '1px solid var(--color-border-subtle)' }}>
                                        <div className="flex items-center gap-2">
                                            <span style={{ fontSize: 18 }}>{r.rewards?.icon_type ?? '🎁'}</span>
                                            <div>
                                                <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', fontWeight: 800 }}>{r.rewards?.titulo}</p>
                                                <p style={{ margin: 0, fontSize: 10, color: 'var(--color-text-muted)' }}>{r.profiles?.nome}</p>
                                            </div>
                                        </div>
                                        <span style={{ fontWeight: 800, color: 'var(--color-primary-light)', fontSize: 'var(--font-size-xs)', background: 'var(--color-overlay-gold)', padding: '2px 8px', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--color-border-gold)' }}>-{r.cost_fc} FC</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ────── 🏆 CLÃ ────── */}
                {view === 'clan' && (
                    <div className="flex-col gap-3" style={{ paddingTop: 'var(--space-3)', animation: 'slideIn 0.2s ease' }}>
                        <div className="flex items-center justify-between">
                            <h2 style={{ margin: 0, fontFamily: 'var(--font-family-heading)', color: 'var(--color-primary-light)' }}>🏆 Clã</h2>
                            <span style={{ fontWeight: 800, fontSize: 12, opacity: 0.6 }}>{leaderboard.length} Membros</span>
                        </div>

                        {/* Ranking da Família */}
                        <div className="neo-box" style={{ padding: 'var(--space-3)', background: 'linear-gradient(135deg, var(--color-surface), var(--color-surface-alt))', borderColor: 'var(--color-border-gold)' }}>
                            <h3 style={{ margin: '0 0 var(--space-2)', fontSize: 'var(--font-size-base)', display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-family-heading)', color: 'var(--color-primary-light)' }}>
                                🎖️ Ranking da Família
                            </h3>
                            <div className="flex-col gap-2">
                                {leaderboard.map((member, idx) => (
                                    <div key={member.id} className="neo-box flex items-center gap-3"
                                        style={{ padding: 'var(--space-2)', background: 'var(--color-surface)' }}>
                                        <span style={{ fontWeight: 'var(--font-weight-bold)', fontSize: idx === 0 ? 26 : 20, width: 34, textAlign: 'center', flexShrink: 0 }}>
                                            {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                                        </span>
                                        <img
                                            src={/^https?:\/\//.test(member.avatar || '') ? member.avatar : `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.nome}`}
                                            style={{ width: 38, height: 38, borderRadius: '50%', border: 'var(--border-width-thick) solid var(--color-border)', flexShrink: 0, objectFit: 'cover' }}
                                            alt={member.nome}
                                            onError={(e) => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.nome}`; }}
                                        />
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div className="flex items-center gap-2">
                                                <strong style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text)' }}>{member.nome}</strong>
                                                {member.id === profile.id && (
                                                    <span style={{
                                                        fontSize: 9,
                                                        fontWeight: 'var(--font-weight-black)',
                                                        background: 'var(--color-primary)',
                                                        color: 'var(--night-300)',
                                                        padding: '1px 5px',
                                                        borderRadius: 'var(--border-radius-sm)',
                                                        letterSpacing: '0.5px'
                                                    }}>VOCÊ</span>
                                                )}
                                            </div>
                                            <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                                                <span className="level-badge" style={{ fontSize: 9, padding: '1px 6px' }}>Nv {member.nivel}</span>
                                                <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-tertiary-light)' }}>⭐ {member.xp} XP</span>
                                                <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-primary-light)' }}>🪙 {member.fc_balance} FC</span>
                                            </div>
                                            <div className="xp-bar-track" style={{ marginTop: 4, height: 5, borderRadius: 'var(--border-radius-sm)' }}>
                                                <div className="xp-bar-fill" style={{ width: `${Math.min(100, (member.xp / (member.nivel * 100 + 500)) * 100)}%` }} />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Heróis — grid de cards */}
                        <div>
                            <h3 style={{ margin: '0 0 var(--space-2)', fontSize: 'var(--font-size-base)', fontFamily: 'var(--font-family-heading)', color: 'var(--color-primary-light)' }}>⚔️ Heróis do Clã</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>

                                {/* Cards dos heróis existentes */}
                                {leaderboard.filter(m => m.role === 'child').map(hero => (
                                    <div key={hero.id} className="neo-box" style={{ position: 'relative', padding: 'var(--space-3)', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 8, background: 'var(--color-surface)' }}>
                                        {/* Botão Remover Herói */}
                                        {isPrimaryParent && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setHeroToDelete(hero);
                                                }}
                                                className="neo-button"
                                                style={{
                                                    position: 'absolute',
                                                    top: -12,
                                                    right: -12,
                                                    width: '32px',
                                                    height: '32px',
                                                    borderRadius: '50%',
                                                    background: 'var(--color-danger)',
                                                    color: 'white',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '14px',
                                                    zIndex: 10,
                                                    padding: 0,
                                                    cursor: 'pointer'
                                                }}
                                                title="Remover Herói"
                                            >
                                                ✕
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
                                                Nv {hero.nivel} · <span style={{ fontWeight: 700, color: 'var(--color-primary-light)' }}>🪙 {hero.fc_balance} FC</span>
                                            </span>
                                        </div>
                                    </div>
                                ))}

                                {/* Card de adicionar novo herói ou CTA de Upgrade */}
                                {isPrimaryParent && (
                                    canAddHero ? (
                                        <button
                                            onClick={() => setIsHeroCreateOpen(true)}
                                            style={{
                                                border: '3px dashed var(--color-border)',
                                                borderRadius: 12, background: 'transparent',
                                                cursor: 'pointer', padding: 'var(--space-3)',
                                                display: 'flex', flexDirection: 'column',
                                                alignItems: 'center', justifyContent: 'center',
                                                gap: 8, minHeight: 160,
                                                transition: 'border-color 0.15s, background 0.15s',
                                                color: 'var(--color-text-muted)',
                                            }}
                                            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.background = 'var(--color-surface)'; }}
                                            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.background = 'transparent'; }}
                                        >
                                            <span style={{ fontSize: 32, display: 'block' }}>＋</span>
                                            <span style={{ fontSize: 13, fontWeight: 800 }}>Novo Herói</span>
                                        </button>
                                    ) : (
                                        <button
                                            onClick={handleStripeUpgrade}
                                            style={{
                                                border: '3px dashed var(--color-danger)',
                                                borderRadius: 12, background: 'rgba(239, 68, 68, 0.05)',
                                                cursor: 'pointer', padding: 'var(--space-3)',
                                                display: 'flex', flexDirection: 'column',
                                                alignItems: 'center', justifyContent: 'center',
                                                gap: 8, minHeight: 160,
                                                color: 'var(--color-danger)',
                                            }}
                                        >
                                            <span style={{ fontSize: 24, display: 'block' }}>💎</span>
                                            <span style={{ fontSize: 11, fontWeight: 800, textAlign: 'center' }}>LIMITE ATINGIDO<br /><span style={{ fontSize: 10, opacity: 0.7 }}>Clique p/ Upgrade</span></span>
                                        </button>
                                    )
                                )}
                            </div>
                        </div>

                        {/* Seção de Mestres / Co-parentalidade */}
                        <div style={{ marginTop: 'var(--space-2)' }}>
                            <h3 style={{ margin: '0 0 var(--space-2)', fontSize: 'var(--font-size-base)', fontFamily: 'var(--font-family-heading)', color: 'var(--color-text-muted)' }}>🧙‍♂️ Mestres</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                                {/* Perfil do Mestre Atual */}
                                {leaderboard.filter(m => m.role === 'parent').map(master => (
                                    <div key={master.id} className="neo-box" style={{ position: 'relative', padding: 'var(--space-3)', opacity: 0.9, textAlign: 'center', background: 'var(--color-surface)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                        {master.id !== profile.id && isPrimaryParent && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setHeroToDelete(master); // Usamos o mesmo state de exclusão
                                                }}
                                                className="neo-button"
                                                style={{
                                                    position: 'absolute', top: -12, right: -12, width: '32px', height: '32px',
                                                    borderRadius: '50%', background: 'var(--color-danger)', color: 'white',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: '14px', zIndex: 10, padding: 0, cursor: 'pointer'
                                                }}
                                                title="Remover Mestre"
                                            >✕</button>
                                        )}
                                        {master.id === profile.id && (
                                            <button
                                                onClick={() => {
                                                    setEditMasterName(master.nome);
                                                    setEditMasterBirthDate(master.data_nascimento || '');
                                                    setEditMasterPhoto(master.foto_url || master.avatar || '');
                                                    setIsEditMasterOpen(true);
                                                }}
                                                style={{
                                                    position: 'absolute', top: 5, right: 5,
                                                    background: 'none', border: 'none', cursor: 'pointer',
                                                    fontSize: 16, padding: 4, opacity: 0.6
                                                }}
                                            >
                                                ✏️
                                            </button>
                                        )}
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

                                {/* Botão de Adicionar Mestre ou CTA de Upgrade */}
                                {isPrimaryParent && (
                                    canAddMaster ? (
                                        <button
                                            onClick={() => setIsMasterCreateOpen(true)}
                                            style={{
                                                border: '3px dashed var(--color-border)',
                                                borderRadius: 12, background: 'transparent',
                                                cursor: 'pointer', padding: 'var(--space-3)',
                                                display: 'flex', flexDirection: 'column',
                                                alignItems: 'center', justifyContent: 'center',
                                                gap: 8, transition: 'border-color 0.15s, background 0.15s',
                                                minHeight: 120,
                                                color: 'var(--color-text-muted)',
                                            }}
                                            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.background = 'var(--color-surface)'; }}
                                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--color-border)'; }}
                                        >
                                            <span style={{ fontSize: 24, display: 'block' }}>🤝</span>
                                            <span style={{ fontSize: 13, fontWeight: 800 }}>Adicionar Mestre</span>
                                        </button>
                                    ) : (
                                        <button
                                            onClick={handleStripeUpgrade}
                                            style={{
                                                border: '3px dashed var(--color-danger)',
                                                borderRadius: 12, background: 'rgba(239, 68, 68, 0.05)',
                                                cursor: 'pointer', padding: 'var(--space-3)',
                                                display: 'flex', flexDirection: 'column',
                                                alignItems: 'center', justifyContent: 'center',
                                                gap: 8, minHeight: 120,
                                                color: 'var(--color-danger)',
                                            }}
                                        >
                                            <span style={{ fontSize: 24, display: 'block' }}>💎</span>
                                            <span style={{ fontSize: 11, fontWeight: 800, textAlign: 'center' }}>LIMITE ATINGIDO<br /><span style={{ fontSize: 10, opacity: 0.7 }}>Clique p/ Upgrade</span></span>
                                        </button>
                                    )
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ────── BOTTOM NAV ────── */}
            <nav className="bottom-nav">
                <button className={`nav-item ${view === 'home' ? 'active' : ''}`} onClick={() => setView('home')}>
                    <span className="nav-icon">🏠</span>
                    Início
                </button>
                <button className={`nav-item ${view === 'missions' ? 'active' : ''}`} onClick={() => setView('missions')} style={{ position: 'relative' }}>
                    <span className="nav-icon">📜</span>
                    Missões
                    {pendingCount > 0 && (
                        <span style={{
                            position: 'absolute', top: 6, right: '18%',
                            background: 'var(--color-danger)', color: '#fff',
                            borderRadius: '50%', width: 17, height: 17,
                            fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: 'var(--border-width) solid var(--color-border)', fontWeight: 'var(--font-weight-bold)'
                        }}>{pendingCount}</span>
                    )}
                </button>
                <button className={`nav-item ${view === 'tavern' ? 'active' : ''}`} onClick={() => setView('tavern')}>
                    <span className="nav-icon">🏰</span>
                    Taverna
                </button>
                <button className={`nav-item ${view === 'clan' ? 'active' : ''}`} onClick={() => setView('clan')}>
                    <span className="nav-icon">🛡️</span>
                    Clã
                </button>
            </nav>

            {/* FAB — Nova Missão */}
            {view === 'missions' && (
                <button
                    onClick={() => {
                        if (canAddNormalQuest || canAddRecurringQuest) {
                            setIsCreateModalOpen(true);
                        } else {
                            handleStripeUpgrade();
                        }
                    }}
                    style={{
                        position: 'fixed',
                        bottom: 86,
                        right: 'max(16px, calc(50vw - 224px))',
                        width: 54, height: 54,
                        background: 'linear-gradient(180deg, var(--gold-300), var(--gold-500))',
                        border: 'var(--border-width) solid var(--color-border)',
                        borderRadius: '50%',
                        boxShadow: 'var(--neo-shadow), var(--glow-gold)',
                        fontSize: 26, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 1500,
                        color: 'var(--night-300)',
                    }}
                    title="Nova Missão"
                >＋</button>
            )}

            {/* Modals */}
            <MissionCreateModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSave={createTask}
                allProfiles={leaderboard}
                parentProfile={profile}
                canAddNormal={canAddNormalQuest}
                canAddRecurring={canAddRecurringQuest}
            />
            <MissionEditModal
                isOpen={isEditingModalOpen}
                onClose={() => { setIsEditingModalOpen(false); setEditingQuest(null); }}
                onSave={async (id, updates) => { await updateTask(id, updates); setIsEditingModalOpen(false); setEditingQuest(null); }}
                quest={editingQuest}
                allProfiles={leaderboard}
                parentProfile={profile}
            />
            <HeroCreateModal
                isOpen={isHeroCreateOpen}
                onClose={() => setIsHeroCreateOpen(false)}
                parentProfileId={profile.id}
                clanId={profile.clan_id}
                onCreated={() => {
                    setIsHeroCreateOpen(false);
                    window.location.reload();
                }}
            />
            <MasterCreateModal
                isOpen={isMasterCreateOpen}
                onClose={() => setIsMasterCreateOpen(false)}
                parentProfileId={profile.id}
                clanId={profile.clan_id}
                onCreated={() => {
                    setIsMasterCreateOpen(false);
                    window.location.reload();
                }}
            />

            {/* PIN entry for same-device hero switch */}
            {pendingSwitch && (
                <PinEntry
                    hero={pendingSwitch}
                    onCancel={() => setPendingSwitch(null)}
                    onSuccess={() => onSwitchToHero?.(pendingSwitch)}
                />
            )}

            {/* Modal Editar Perfil do Mestre e Assinatura */}
            <Modal
                isOpen={isEditMasterOpen}
                onClose={() => setIsEditMasterOpen(false)}
                title="⚙️ Configurações"
            >
                <form onSubmit={async (e) => {
                    e.preventDefault();
                    setIsSavingMaster(true);
                    await updateProfile(profile.id, {
                        nome: editMasterName,
                        data_nascimento: editMasterBirthDate || null,
                        avatar: editMasterPhoto || undefined,
                        foto_url: editMasterPhoto || undefined
                    });
                    setIsSavingMaster(false);
                    setIsEditMasterOpen(false);
                }} className="flex-col gap-3">

                    <div style={{ padding: 'var(--space-3)', background: 'var(--color-surface)', borderRadius: 12, border: 'var(--border-width) solid var(--color-border)' }}>
                        <h3 style={{ margin: '0 0 var(--space-2)', fontSize: 14, textTransform: 'uppercase', opacity: 0.6 }}>👤 Perfil</h3>
                        <div className="flex-col gap-3">
                            <div className="flex-col gap-1">
                                <label className="neo-label">Nome de Mestre</label>
                                <input
                                    type="text" className="neo-input"
                                    value={editMasterName} onChange={e => setEditMasterName(e.target.value)}
                                    required placeholder="Seu nome"
                                />
                            </div>

                            <div className="flex-col gap-1">
                                <label className="neo-label">Foto de Perfil</label>
                                <div className="flex items-center gap-3">
                                    <img
                                        src={/^https?:\/\//.test(editMasterPhoto) ? editMasterPhoto : `https://api.dicebear.com/7.x/avataaars/svg?seed=${editMasterName}`}
                                        style={{ width: 60, height: 60, borderRadius: '50%', border: '3px solid #000', objectFit: 'cover' }}
                                        alt="Preview"
                                        onError={(e) => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${editMasterName}`; }}
                                    />
                                    <div style={{ flex: 1 }}>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            id="master-photo-upload"
                                            style={{ display: 'none' }}
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    const reader = new FileReader();
                                                    reader.onload = () => {
                                                        setTempImage(reader.result as string);
                                                        setIsCropperOpen(true);
                                                    };
                                                    reader.readAsDataURL(file);
                                                }
                                            }}
                                        />
                                        <label
                                            htmlFor="master-photo-upload"
                                            className="neo-button"
                                            style={{ fontSize: 12, padding: '8px 12px', background: 'var(--color-surface-alt)', width: '100%' }}
                                        >
                                            {uploadingImage ? '⬆️ Enviando...' : '📷 Alterar Foto'}
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-col gap-1">
                                <label className="neo-label">Data de Nascimento</label>
                                <input
                                    type="date" className="neo-input"
                                    value={editMasterBirthDate} onChange={e => setEditMasterBirthDate(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <div style={{
                        padding: 'var(--space-3)',
                        background: 'linear-gradient(135deg, var(--purple-700), var(--purple-900))',
                        borderRadius: 12,
                        border: 'var(--border-width) solid var(--color-tertiary-light)',
                        boxShadow: 'var(--glow-purple)'
                    }}>
                        <h3 style={{ margin: '0 0 var(--space-2)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--purple-300)', fontWeight: 800 }}>💎 Assinatura</h3>
                        <div className="flex items-center justify-between">
                            <div>
                                <p style={{ margin: 0, fontWeight: 800, color: 'var(--color-primary-light)', fontFamily: 'var(--font-family-heading)' }}>{currentPlan === 'premium' ? 'Plano Clã Lendário' : 'Plano Aprendiz (Grátis)'}</p>
                                <p style={{ margin: 0, fontSize: 11, color: 'var(--color-text-muted)' }}>
                                    {currentPlan === 'premium' ? 'Até 3 heróis e 2 mestres' : 'Até 1 herói e 1 mestre'}
                                </p>
                            </div>
                            <span style={{
                                background: currentPlan === 'premium' ? 'var(--color-primary)' : 'var(--color-surface)',
                                color: currentPlan === 'premium' ? 'var(--night-300)' : 'var(--color-text-muted)',
                                fontSize: 10, fontWeight: 800, padding: '4px 8px',
                                borderRadius: 6, textTransform: 'uppercase',
                                border: 'var(--border-width) solid var(--color-border)'
                            }}>{currentPlan === 'premium' ? 'DIAMANTE' : 'ATIVO'}</span>
                        </div>
                        {currentPlan !== 'premium' && (
                            <button
                                type="button"
                                className="neo-button w-full"
                                style={{ marginTop: 'var(--space-2)', fontSize: 12, padding: '10px', fontWeight: 900 }}
                                onClick={handleStripeUpgrade}
                                disabled={isRedirectingStripe}
                            >
                                {isRedirectingStripe ? 'CARREGANDO...' : 'ASSINAR AGORA — R$ 9,90/MÊS ➜'}
                            </button>
                        )}
                    </div>

                    <div className="flex gap-2" style={{ marginTop: 'var(--space-1)' }}>
                        <button type="submit" disabled={isSavingMaster || uploadingImage} className="neo-button" style={{ flex: 1 }}>
                            {isSavingMaster ? 'SALVANDO...' : '✦ SALVAR ALTERAÇÕES'}
                        </button>
                        <button type="button" disabled={isSavingMaster} className="neo-button neo-button--ghost" style={{ flex: 1 }} onClick={() => setIsEditMasterOpen(false)}>
                            CANCELAR
                        </button>
                    </div>
                </form>
            </Modal>

            <ImageCropperModal
                isOpen={isCropperOpen}
                image={tempImage}
                onClose={() => setIsCropperOpen(false)}
                onCropComplete={async (croppedBlob) => {
                    setIsCropperOpen(false);
                    setUploadingImage(true);
                    const url = await uploadAvatar(croppedBlob, profile.id);
                    if (url) setEditMasterPhoto(url);
                    setUploadingImage(false);
                }}
            />

            <DeleteConfirmationModal
                isOpen={!!heroToDelete}
                onClose={() => setHeroToDelete(null)}
                onConfirm={() => {
                    if (heroToDelete) {
                        deleteProfile(heroToDelete.id);
                        setHeroToDelete(null);
                    }
                }}
                title="Expulsar Membro"
                message={`Você tem certeza que deseja remover ${heroToDelete?.nome} do clã? Esta ação não pode ser desfeita.`}
            />

            <style>{`
                @keyframes slideIn {
                    from { transform: translateY(14px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `}</style>
        </div>
    );
}
