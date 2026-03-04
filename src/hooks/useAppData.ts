import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Quest } from '../components/QuestCard';
import { useAuth } from '../contexts/AuthContext';

export interface LeaderboardEntry {
    id: string;
    nome: string;
    nivel: number;
    xp: number;
    fc_balance: number;
    avatar?: string;
    foto_url?: string;
    data_nascimento?: string;
    role?: string;
    invite_token?: string;
}

export interface Reward {
    id: string;
    titulo: string;
    descricao: string;
    cost_fc: number;
    icon_type: string;
}

export interface Redemption {
    id: string;
    profile_id: string;
    reward_id: string;
    status: 'unused' | 'used';
    cost_fc: number;
    created_at: string;
    profiles?: { nome: string };
    rewards?: { titulo: string; icon_type?: string; descricao?: string };
}

export function useAppData() {
    const { profile, refreshProfile } = useAuth();
    const [myQuests, setMyQuests] = useState<Quest[]>([]);
    const [managedQuests, setManagedQuests] = useState<Quest[]>([]);
    const [rewards, setRewards] = useState<Reward[]>([]);
    const [redemptions, setRedemptions] = useState<Redemption[]>([]);
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchAll = useCallback(async () => {
        if (!profile) return;
        setLoading(true);
        try {
            // Fetch all quests (active and pending) belonging to the clan
            const questQuery = supabase.from('tasks').select('*')
                .eq('clan_id', profile.clan_id)
                .in('status', ['active', 'pending'])
                .order('created_at', { ascending: false });

            const redemptionsQuery = profile.role === 'parent' || (profile.role as any) === 'mestre'
                ? supabase.from('redemptions').select('*, profiles(nome), rewards(*)').eq('clan_id', profile.clan_id).order('created_at', { ascending: false }).limit(50)
                : supabase.from('redemptions').select('*, profiles(nome), rewards(*)').eq('profile_id', profile.id).eq('clan_id', profile.clan_id).order('created_at', { ascending: false }).limit(50);

            const [questsRes, leaderRes, rewardsRes, redemptionsRes] = await Promise.all([
                questQuery,
                supabase.from('profiles').select('id, nome, nivel, xp, fc_balance, avatar, foto_url, data_nascimento, role, invite_token')
                    .eq('clan_id', profile.clan_id)
                    .order('xp', { ascending: false }).limit(20),
                supabase.from('rewards').select('*').eq('clan_id', profile.clan_id).order('cost_fc', { ascending: true }),
                redemptionsQuery
            ]);

            if (questsRes.data) {
                const allQuests = questsRes.data as Quest[];
                setManagedQuests(allQuests);
                setMyQuests(allQuests.filter(q => q.assignee_id === null || q.assignee_id === profile.id));
            }
            if (leaderRes.data) setLeaderboard(leaderRes.data as LeaderboardEntry[]);
            if (rewardsRes.data) setRewards(rewardsRes.data as Reward[]);
            if (redemptionsRes.data) setRedemptions(redemptionsRes.data as any[]);
        } catch (err) {
            console.error('useAppData fetchAll error:', err);
        } finally {
            setLoading(false);
        }
    }, [profile]);

    useEffect(() => {
        if (profile) {
            fetchAll();
        } else {
            setLoading(false);
        }
    }, [profile, fetchAll]);

    const completeQuest = useCallback(async (questId: string) => {
        // Optimistic update
        setMyQuests(prev => prev.filter(q => q.id !== questId));
        setManagedQuests(prev => prev.map(q => q.id === questId ? { ...q, status: 'pending' as const } : q));

        // Update database to PENDING
        await supabase.from('tasks').update({ status: 'pending' }).eq('id', questId);

        await fetchAll();
    }, [fetchAll]);

    const approveQuest = useCallback(async (questId: string) => {
        const quest = managedQuests.find(q => q.id === questId);
        if (!quest || !quest.assignee_id) return;

        try {
            // Get current profile of the assignee
            const { data: profileToUpdate } = await supabase
                .from('profiles')
                .select('xp, fc_balance, nivel')
                .eq('id', quest.assignee_id)
                .single();

            if (!profileToUpdate) return;

            const newXP = profileToUpdate.xp + quest.xp_reward;
            const newFC = profileToUpdate.fc_balance + quest.fc_reward;
            const levelUpXP = profileToUpdate.nivel * 100 + 500;
            const newNivel = newXP >= levelUpXP ? profileToUpdate.nivel + 1 : profileToUpdate.nivel;
            const finalXP = newXP >= levelUpXP ? newXP - levelUpXP : newXP;

            // Update database: Mark as completed and grant rewards
            // If recurring, set status back to 'active'
            const nextStatus = quest.is_recurring ? 'active' : 'completed';

            await Promise.all([
                supabase.from('tasks').update({ status: nextStatus }).eq('id', questId),
                supabase.from('profiles').update({ xp: finalXP, nivel: newNivel, fc_balance: newFC }).eq('id', quest.assignee_id),
            ]);

            await fetchAll();
            await refreshProfile();
        } catch (err) {
            console.error('approveQuest error:', err);
        }
    }, [managedQuests, fetchAll, refreshProfile]);

    const rejectQuest = useCallback(async (questId: string) => {
        try {
            await supabase.from('tasks').update({ status: 'active' }).eq('id', questId);
            await fetchAll();
        } catch (err) {
            console.error('rejectQuest error:', err);
        }
    }, [fetchAll]);

    const updateFCBalance = useCallback(async () => {
        if (!profile) return;
        await refreshProfile();
    }, [profile, refreshProfile]);

    const createTask = useCallback(async (title: string, description: string, xpReward: number, fcReward: number, assigneeId?: string, duracaoMinutos?: number, isRecurring: boolean = false) => {
        if (!profile || profile.role !== 'parent') return;
        setLoading(true);
        try {
            const newTask = {
                titulo: title,
                descricao: description,
                xp_reward: xpReward,
                fc_reward: fcReward,
                status: 'active',
                created_by: profile.id,
                clan_id: profile.clan_id,
                assignee_id: assigneeId || null,
                duracao_minutos: duracaoMinutos || 10,
                is_recurring: isRecurring
            };
            await supabase.from('tasks').insert([newTask]);
            await fetchAll();
        } catch (err: any) {
            console.error('Error creating task:', err);
        } finally {
            setLoading(false);
        }
    }, [profile, fetchAll]);

    const deleteTask = useCallback(async (taskId: string) => {
        if (!profile || profile.role !== 'parent') return;
        try {
            const { error } = await supabase.from('tasks').delete().eq('id', taskId);
            if (error) throw error;
            await fetchAll();
        } catch (err: any) {
            console.error('deleteTask error:', err.message);
            alert('Erro ao excluir missão: ' + err.message);
        }
    }, [profile, fetchAll]);

    const updateTask = useCallback(async (taskId: string, updates: Partial<Quest>) => {
        if (!profile || profile.role !== 'parent') return;
        try {
            const { error } = await supabase.from('tasks').update(updates).eq('id', taskId);
            if (error) throw error;
            await fetchAll();
        } catch (err: any) {
            console.error('updateTask error:', err.message);
            alert('Erro ao atualizar missão: ' + err.message);
        }
    }, [profile, fetchAll]);

    const createTavernItem = useCallback(async (title: string, description: string, costFc: number, icon: string) => {
        if (!profile || profile.role !== 'parent') return;
        setLoading(true);
        try {
            const newReward = {
                titulo: title,
                descricao: description,
                cost_fc: costFc,
                icon_type: icon,
                clan_id: profile.clan_id
            };
            await supabase.from('rewards').insert([newReward]);
            await fetchAll();
        } catch (err: any) {
            console.error('Error creating reward:', err);
        } finally {
            setLoading(false);
        }
    }, [profile, fetchAll]);

    const deleteReward = useCallback(async (rewardId: string) => {
        if (!profile) {
            console.error('deleteReward: No profile found');
            return;
        }

        // Permite exclusão se for parent ou mestre
        const isAuthorized = profile.role === 'parent' || (profile.role as any) === 'mestre';

        if (!isAuthorized) {
            console.warn('deleteReward: Permission denied for role:', profile.role);
            return;
        }
        try {
            const { error } = await supabase.from('rewards').delete().eq('id', rewardId);
            if (error) {
                console.error('deleteReward: Supabase error:', error.message);
                alert('Erro ao excluir: ' + error.message);
            } else {
                await fetchAll();
            }
        } catch (err: any) {
            console.error('deleteReward: JS Exception:', err.message);
        }
    }, [profile, fetchAll]);

    const buyReward = useCallback(async (reward: Reward) => {
        if (!profile || profile.fc_balance < reward.cost_fc) return false;

        try {
            const newBalance = profile.fc_balance - reward.cost_fc;

            // 1. Gravar Redenção (Log)
            // 2. Atualizar perfil
            const { error: redemptionError } = await supabase.from('redemptions').insert([{
                profile_id: profile.id,
                reward_id: reward.id,
                cost_fc: reward.cost_fc,
                clan_id: profile.clan_id
            }]);

            if (redemptionError) {
                // Se a tabela redemptions não existir, ainda assim subtraímos os pontos 
                // mas avisamos no console. Isso evita travar o jogo se o usuário não rodou o SQL ainda.
                console.warn("Tabela 'redemptions' não encontrada. Rodar SQL de migração.");
            }

            const { error: profileError } = await supabase
                .from('profiles')
                .update({ fc_balance: newBalance })
                .eq('id', profile.id);

            if (profileError) throw profileError;

            await refreshProfile();
            await fetchAll();
            return true;
        } catch (err) {
            console.error('Error buying reward:', err);
            return false;
        }
    }, [profile, refreshProfile, fetchAll]);

    const useReward = useCallback(async (redemptionId: string) => {
        if (!profile) return;
        try {
            const { error } = await supabase
                .from('redemptions')
                .update({ status: 'used' })
                .eq('id', redemptionId);

            if (error) throw error;
            await fetchAll();
        } catch (err) {
            console.error('Error using reward:', err);
        }
    }, [profile, fetchAll]);

    const startQuestTimer = useCallback(async (questId: string, remainingSeconds: number) => {
        try {
            await supabase.from('tasks').update({
                timer_status: 'running',
                timer_remaining_seconds: remainingSeconds,
                timer_updated_at: new Date().toISOString()
            }).eq('id', questId);
            await fetchAll();
        } catch (err) {
            console.error('Error starting timer:', err);
        }
    }, [fetchAll]);

    const pauseQuestTimer = useCallback(async (questId: string, remainingSeconds: number) => {
        try {
            await supabase.from('tasks').update({
                timer_status: 'paused',
                timer_remaining_seconds: remainingSeconds,
                timer_updated_at: new Date().toISOString()
            }).eq('id', questId);
            await fetchAll();
        } catch (err) {
            console.error('Error pausing timer:', err);
        }
    }, [fetchAll]);

    const resetQuestTimer = useCallback(async (questId: string, initialSeconds: number) => {
        try {
            await supabase.from('tasks').update({
                timer_status: 'idle',
                timer_remaining_seconds: initialSeconds,
                timer_updated_at: null
            }).eq('id', questId);
            await fetchAll();
        } catch (err) {
            console.error('Error resetting timer:', err);
        }
    }, [fetchAll]);

    const updateProfile = useCallback(async (profileId: string, updates: { nome?: string; avatar?: string; data_nascimento?: string | null; foto_url?: string | null }) => {
        try {
            const { error } = await supabase.from('profiles').update(updates).eq('id', profileId);
            if (error) throw error;
            await refreshProfile();
            await fetchAll();
            return true;
        } catch (err: any) {
            console.error('updateProfile error:', err.message);
            alert('Erro ao atualizar perfil: ' + err.message);
            return false;
        }
    }, [refreshProfile, fetchAll]);

    const deleteProfile = useCallback(async (profileId: string) => {
        if (!profile || profile.role !== 'parent') return;
        try {
            const { error } = await supabase.from('profiles').delete().eq('id', profileId);
            if (error) throw error;
            await fetchAll();
        } catch (err: any) {
            console.error('deleteProfile error:', err.message);
            alert('Erro ao excluir herói: ' + err.message);
        }
    }, [profile, fetchAll]);

    return { myQuests, managedQuests, rewards, redemptions, leaderboard, loading, completeQuest, approveQuest, rejectQuest, updateFCBalance, createTask, deleteTask, updateTask, createTavernItem, deleteReward, buyReward, useReward, startQuestTimer, pauseQuestTimer, resetQuestTimer, updateProfile, deleteProfile, refetch: fetchAll };
}
