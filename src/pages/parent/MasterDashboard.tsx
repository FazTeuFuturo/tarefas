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
                padding: 'var(--space-3) var(--space-2)',
                background: 'var(--color-primary)',
                borderBottom: '3px solid #000',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: 'var(--font-size-xl)' }}>⚔️ Quartel General</h1>
                    <p style={{ margin: 0, fontWeight: 800, fontSize: 'var(--font-size-sm)', opacity: 0.7 }}>
                        Mestre {profile.nome}
                    </p>
                </div>
                <button
                    onClick={clearActiveProfile}
                    className="neo-button"
                    style={{
                        padding: '8px',
                        background: 'var(--color-danger)',
                        color: 'white',
                        width: '40px',
                        height: '40px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                    title="Sair"
                >
                    <span style={{ fontSize: 18, fontWeight: 900 }}>X</span>
                </button>
            </header>

            <div style={{ padding: '0 var(--space-2)', paddingBottom: 90 }}>

                {/* ────── 🏠 INÍCIO ────── */}
                {view === 'home' && (
                    <div className="flex-col gap-3" style={{ paddingTop: 'var(--space-3)', animation: 'slideIn 0.2s ease' }}>

                        {/* Status */}
                        <StatusBar level={profile.nivel} xp={profile.xp} xpMax={profile.nivel * 100 + 500} credits={profile.fc_balance} />

                        {/* Mural de Performance */}
                        <div className="neo-box" style={{ padding: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: 12, background: '#f8fafc' }}>
                            <span style={{ fontSize: 32 }}>📈</span>
                            <div>
                                <p style={{ margin: 0, fontWeight: 800 }}>Mural de Performance</p>
                                <p style={{ margin: 0, fontSize: 13, opacity: 0.6 }}>Em breve: Estatísticas detalhadas do clã.</p>
                            </div>
                        </div>

                        {/* 💎 CONTAINER DE UPGRADE (Fricção Zero) */}
                        {isPrimaryParent && currentPlan === 'free' && (
                            <div className="neo-box overflow-hidden relative" style={{
                                padding: 'var(--space-3)',
                                background: '#fff',
                                color: '#000',
                                borderColor: '#000',
                                borderBottomWidth: '6px'
                            }}>
                                <div className="relative z-10 flex flex-col sm:flex-row items-center gap-4">
                                    <div className="bg-yellow-400 p-2 rounded-xl border-4 border-slate-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                        <span style={{ fontSize: 24 }}>👑</span>
                                    </div>

                                    <div style={{ flex: 1, textAlign: 'left' }}>
                                        <h3 className="text-xl font-black uppercase leading-tight" style={{ marginBottom: 2 }}>
                                            Upgrade Lendário
                                        </h3>
                                        <div className="flex flex-wrap gap-x-4 gap-y-1">
                                            <div className="flex items-center gap-1 font-bold text-xs opacity-70">
                                                <span>✅</span> 3 Heróis + 2 Mestres
                                            </div>
                                            <div className="flex items-center gap-1 font-bold text-xs opacity-70">
                                                <span>✅</span> Missões ilimitadas
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleStripeUpgrade}
                                        disabled={isRedirectingStripe}
                                        className="neo-button whitespace-nowrap"
                                        style={{
                                            background: '#facc15',
                                            color: '#000',
                                            fontSize: '0.9rem',
                                            padding: '10px 20px',
                                            minWidth: '160px'
                                        }}
                                    >
                                        <span className="font-black">
                                            {isRedirectingStripe ? 'CARREGANDO...' : 'LIBERAR POR R$ 9,90'}
                                        </span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ────── 📋 MISSÕES ────── */}
                {view === 'missions' && (
                    <div className="flex-col gap-3" style={{ paddingTop: 'var(--space-3)', animation: 'slideIn 0.2s ease', paddingBottom: 80 }}>
                        <div className="flex items-center justify-between">
                            <h2 style={{ margin: 0 }}>📋 Missões do Clã</h2>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setStatusFilter('active')}
                                    className="neo-button"
                                    style={{
                                        padding: '4px 12px', fontSize: 11,
                                        background: statusFilter === 'active' ? 'var(--color-secondary)' : '#eee'
                                    }}
                                >
                                    ATIVAS
                                </button>
                                <button
                                    onClick={() => setStatusFilter('pending')}
                                    className="neo-button"
                                    style={{
                                        padding: '4px 12px', fontSize: 11,
                                        background: statusFilter === 'pending' ? 'var(--color-danger)' : '#eee',
                                        color: statusFilter === 'pending' ? '#fff' : '#000',
                                        position: 'relative'
                                    }}
                                >
                                    PENDENTES
                                    {pendingCount > 0 && (
                                        <span style={{
                                            position: 'absolute', top: -8, right: -8,
                                            background: '#000', color: '#fff',
                                            borderRadius: '50%', width: 18, height: 18,
                                            fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            border: '2px solid #fff'
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
                                    style={{
                                        flexShrink: 0,
                                        padding: '6px 14px', fontWeight: 800, fontSize: 13,
                                        border: '2px solid #000', borderRadius: 99, cursor: 'pointer',
                                        background: filterMember === m.id ? '#000' : '#fff',
                                        color: filterMember === m.id ? '#fff' : '#000',
                                        transition: 'all 0.1s'
                                    }}
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
                        <h2 style={{ margin: 0 }}>🍺 Gerenciar Taverna</h2>

                        {/* Criar prêmio */}
                        <div className="neo-box" style={{ padding: 'var(--space-3)' }}>
                            {!isCreatingReward ? (
                                <button className="neo-button w-full" style={{ background: 'var(--color-secondary)' }} onClick={() => setIsCreatingReward(true)}>
                                    + NOVO PRÊMIO
                                </button>
                            ) : (
                                <form onSubmit={handleCreateReward} className="flex-col gap-2">
                                    <h3 style={{ margin: '0 0 var(--space-1)' }}>🎁 Novo Prêmio</h3>
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
                                        <button type="submit" className="neo-button" style={{ flex: 2, background: 'var(--color-primary)' }}>SALVAR</button>
                                        <button type="button" className="neo-button" style={{ flex: 1, background: 'var(--color-danger)', color: '#fff' }} onClick={() => setIsCreatingReward(false)}>X</button>
                                    </div>
                                </form>
                            )}
                        </div>

                        {/* Lista de prêmios */}
                        <div className="neo-box" style={{ padding: 'var(--space-3)' }}>
                            <h3 style={{ margin: '0 0 var(--space-2)', fontSize: 'var(--font-size-base)' }}>🏺 Itens ({rewards.length})</h3>
                            {rewards.length === 0
                                ? <p style={{ margin: 0, opacity: 0.5 }}>Nenhum item cadastrado.</p>
                                : (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-2)' }}>
                                        {rewards.map(r => <RewardCard key={r.id} reward={r} showDelete onDelete={deleteReward} />)}
                                    </div>
                                )
                            }
                        </div>

                        {/* ─── Dar Bônus Avulso ─── */}
                        <div className="neo-box" style={{ padding: 'var(--space-3)', background: '#EFF6FF' }}>
                            <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-2)' }}>
                                <h3 style={{ margin: 0, fontSize: 'var(--font-size-base)' }}>💰 Dar Bônus Avulso</h3>
                                <button
                                    className="neo-button"
                                    style={{ fontSize: 12, padding: '4px 12px', background: isBonusOpen ? 'var(--color-danger)' : 'var(--color-primary)', color: isBonusOpen ? '#fff' : '#000' }}
                                    onClick={() => setIsBonusOpen(v => !v)}
                                >{isBonusOpen ? 'Cancelar' : '+ Dar Bônus'}</button>
                            </div>

                            {isBonusOpen ? (
                                <form onSubmit={handleGiveBonus} className="flex-col gap-2">
                                    <div>
                                        <label className="neo-label">Herói</label>
                                        <select
                                            className="neo-input"
                                            value={bonusHeroId}
                                            onChange={e => setBonusHeroId(e.target.value)}
                                            required
                                        >
                                            <option value="">Selecione um herói...</option>
                                            {leaderboard.filter(p => p.role === 'child').map(h => (
                                                <option key={h.id} value={h.id}>{h.nome}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex gap-2">
                                        <div style={{ flex: 1 }}>
                                            <label className="neo-label">🪙 FC a creditar</label>
                                            <input type="number" min={0} max={9999} className="neo-input" value={bonusFC} onChange={e => setBonusFC(Number(e.target.value))} />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <label className="neo-label">⭐ XP a creditar</label>
                                            <input type="number" min={0} max={9999} className="neo-input" value={bonusXP} onChange={e => setBonusXP(Number(e.target.value))} />
                                        </div>
                                    </div>
                                    <button
                                        type="submit"
                                        className="neo-button"
                                        disabled={bonusSending || !bonusHeroId || (bonusFC === 0 && bonusXP === 0)}
                                        style={{ background: 'var(--color-primary)' }}
                                    >
                                        {bonusSending ? 'Enviando...' : '🎉 Confirmar Bônus'}
                                    </button>
                                </form>
                            ) : (
                                <p style={{ margin: 0, opacity: 0.5, fontSize: 13 }}>Credite FC ou XP diretamente para um herói, sem precisar de uma missão.</p>
                            )}
                        </div>

                        {/* Últimos resgates */}
                        {redemptions.length > 0 && (
                            <div className="neo-box" style={{ padding: 'var(--space-3)', background: '#FEF3C7' }}>
                                <h3 style={{ margin: '0 0 var(--space-2)', fontSize: 'var(--font-size-base)' }}>🛒 Últimos Resgates</h3>
                                {redemptions.slice(0, 8).map(r => (
                                    <div key={r.id} className="flex justify-between items-center" style={{ padding: '6px 0', borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
                                        <span style={{ fontSize: 13 }}>
                                            <strong>{r.profiles?.nome}</strong>
                                            <span style={{ opacity: 0.5, margin: '0 6px' }}>→</span>
                                            {r.rewards?.titulo}
                                        </span>
                                        <span style={{ fontWeight: 800, color: 'var(--color-danger)', fontSize: 13 }}>-{r.cost_fc}FC</span>
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
                            <h2 style={{ margin: 0 }}>🏆 Clã</h2>
                            <span style={{ fontWeight: 800, fontSize: 12, opacity: 0.6 }}>{leaderboard.length} Membros</span>
                        </div>

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
                                                {member.id === profile.id && (
                                                    <span style={{
                                                        fontSize: 9,
                                                        fontWeight: 900,
                                                        background: '#000',
                                                        color: '#fff',
                                                        padding: '1px 5px',
                                                        borderRadius: 3,
                                                        letterSpacing: '0.5px'
                                                    }}>VOCÊ</span>
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

                        {/* Heróis — grid de cards */}
                        <div>
                            <h3 style={{ margin: '0 0 var(--space-2)', fontSize: 'var(--font-size-base)' }}>⚔️ Heróis do Clã</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>

                                {/* Cards dos heróis existentes */}
                                {leaderboard.filter(m => m.role === 'child').map(hero => (
                                    <div key={hero.id} className="neo-box" style={{ position: 'relative', padding: 'var(--space-3)', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 8, background: '#fff' }}>
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
                                                Nv {hero.nivel} · <span style={{ fontWeight: 700, color: 'var(--color-tertiary-dark)' }}>💰 {hero.fc_balance} FC</span>
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
                                                border: '3px dashed #bbb',
                                                borderRadius: 12, background: 'transparent',
                                                cursor: 'pointer', padding: 'var(--space-3)',
                                                display: 'flex', flexDirection: 'column',
                                                alignItems: 'center', justifyContent: 'center',
                                                gap: 8, minHeight: 160,
                                                transition: 'border-color 0.15s, background 0.15s',
                                                color: '#888',
                                            }}
                                            onMouseEnter={e => { e.currentTarget.style.borderColor = '#000'; e.currentTarget.style.background = '#f9f9f9'; }}
                                            onMouseLeave={e => { e.currentTarget.style.borderColor = '#bbb'; e.currentTarget.style.background = 'transparent'; }}
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
                            <h3 style={{ margin: '0 0 var(--space-2)', fontSize: 'var(--font-size-base)' }}>🧙‍♂️ Mestres</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                                {/* Perfil do Mestre Atual */}
                                {leaderboard.filter(m => m.role === 'parent').map(master => (
                                    <div key={master.id} className="neo-box" style={{ position: 'relative', padding: 'var(--space-3)', opacity: 0.9, textAlign: 'center', background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
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
                                                border: '3px dashed var(--color-primary)',
                                                borderRadius: 12, background: 'transparent',
                                                cursor: 'pointer', padding: 'var(--space-3)',
                                                display: 'flex', flexDirection: 'column',
                                                alignItems: 'center', justifyContent: 'center',
                                                gap: 6, transition: 'all 0.2s',
                                                minHeight: 120
                                            }}
                                            onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-primary-light)'; e.currentTarget.style.borderColor = '#000'; }}
                                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--color-primary)'; }}
                                        >
                                            <span style={{ fontSize: 24, display: 'block' }}>🤝</span>
                                            <span style={{ fontSize: 13, fontWeight: 800 }}>Adicionar Mestre</span>
                                        </button>
                                    ) : (
                                        <button
                                            onClick={handleStripeUpgrade}
                                            style={{
                                                border: '3px dashed #bbb',
                                                borderRadius: 12, background: '#f5f5f5',
                                                cursor: 'pointer', padding: 'var(--space-3)',
                                                display: 'flex', flexDirection: 'column',
                                                alignItems: 'center', justifyContent: 'center',
                                                gap: 6, minHeight: 120,
                                                color: '#888',
                                                opacity: 0.8
                                            }}
                                        >
                                            <span style={{ fontSize: 20, display: 'block' }}>🚫</span>
                                            <span style={{ fontSize: 11, fontWeight: 800, textAlign: 'center' }}>LIMITE ATINGIDO</span>
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
                    <span style={{ fontSize: '1.4rem', marginBottom: '3px' }}>🏠</span>
                    Início
                </button>
                <button className={`nav-item ${view === 'missions' ? 'active' : ''}`} onClick={() => setView('missions')} style={{ position: 'relative' }}>
                    <span style={{ fontSize: '1.4rem', marginBottom: '3px' }}>📋</span>
                    Missões
                    {pendingCount > 0 && (
                        <span style={{
                            position: 'absolute', top: 6, right: '18%',
                            background: 'var(--color-danger)', color: '#fff',
                            borderRadius: '50%', width: 17, height: 17,
                            fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: '2px solid #fff', fontWeight: 800
                        }}>{pendingCount}</span>
                    )}
                </button>
                <button className={`nav-item ${view === 'tavern' ? 'active' : ''}`} onClick={() => setView('tavern')}>
                    <span style={{ fontSize: '1.4rem', marginBottom: '3px' }}>🍺</span>
                    Taverna
                </button>
                <button className={`nav-item ${view === 'clan' ? 'active' : ''}`} onClick={() => setView('clan')}>
                    <span style={{ fontSize: '1.4rem', marginBottom: '3px' }}>🏆</span>
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
                        background: 'var(--color-primary)',
                        border: '3px solid #000',
                        borderRadius: '50%',
                        boxShadow: '4px 4px 0 #000',
                        fontSize: 26, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 1500,
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
                    // Força o recarregamento temporário para refletir o novo herói na tela
                    // A solução ideal de longo prazo seria exportar `fetchAll` no useAppData e executá-lo aqui.
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

                    <div style={{ padding: 'var(--space-3)', background: '#F8FAFC', borderRadius: 12, border: '2px solid #E2E8F0' }}>
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
                                            style={{ fontSize: 12, padding: '8px 12px', background: '#fff', width: '100%' }}
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

                    <div style={{ padding: 'var(--space-3)', background: 'var(--color-primary-light)', borderRadius: 12, border: '2px solid var(--color-primary)' }}>
                        <h3 style={{ margin: '0 0 var(--space-2)', fontSize: 14, textTransform: 'uppercase', opacity: 0.6 }}>💎 Assinatura</h3>
                        <div className="flex items-center justify-between">
                            <div>
                                <p style={{ margin: 0, fontWeight: 800 }}>{currentPlan === 'premium' ? 'Plano Clã Lendário' : 'Plano Aprendiz (Grátis)'}</p>
                                <p style={{ margin: 0, fontSize: 11, opacity: 0.7 }}>
                                    {currentPlan === 'premium' ? 'Até 3 heróis e 2 mestres' : 'Até 1 herói e 1 mestre'}
                                </p>
                            </div>
                            <span style={{
                                background: currentPlan === 'premium' ? 'var(--color-tertiary)' : '#000',
                                color: currentPlan === 'premium' ? '#000' : '#fff',
                                fontSize: 10, fontWeight: 800, padding: '4px 8px',
                                borderRadius: 6, textTransform: 'uppercase'
                            }}>{currentPlan === 'premium' ? 'DIAMANTE' : 'ATIVO'}</span>
                        </div>
                        {currentPlan !== 'premium' && (
                            <button
                                type="button"
                                className="neo-button w-full"
                                style={{ marginTop: 'var(--space-2)', background: 'var(--color-tertiary)', fontSize: 12, padding: '8px' }}
                                onClick={handleStripeUpgrade}
                                disabled={isRedirectingStripe}
                            >
                                {isRedirectingStripe ? 'CARREGANDO...' : 'Fazer Upgrade — R$ 9,90/mês'}
                            </button>
                        )}
                    </div>

                    <div className="flex gap-2" style={{ marginTop: 'var(--space-1)' }}>
                        <button type="submit" disabled={isSavingMaster || uploadingImage} className="neo-button" style={{ flex: 1, background: 'var(--color-success)', color: 'white' }}>
                            {isSavingMaster ? 'SALVANDO...' : 'SALVAR ALTERAÇÕES'}
                        </button>
                        <button type="button" disabled={isSavingMaster} className="neo-button" style={{ flex: 1, background: '#eee' }} onClick={() => setIsEditMasterOpen(false)}>
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
