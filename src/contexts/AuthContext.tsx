import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

export interface Profile {
    id: string;
    email: string;
    nome: string;
    avatar: string;
    role: 'parent' | 'child';
    xp: number;
    nivel: number;
    fc_balance: number;
    clan_id: string;
    pin_hash?: string;
    invite_token?: string;
    created_by?: string;
    data_nascimento?: string;
    foto_url?: string;
}

interface AuthContextType {
    user: User | null;
    profile: Profile | null;         // quem está autenticado no Supabase (sempre o Mestre ou child com conta)
    activeProfile: Profile | null;   // perfil atual visível no app (pode ser um herói sem conta própria)
    isLoading: boolean;
    isHeroMode: boolean;             // true quando um herói com troca de perfil está ativo
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
    switchToHero: (hero: Profile) => void;   // troca de perfil sem re-auth Supabase (mesmo dispositivo)
    exitHeroMode: () => void;                // volta para o Mestre
    clearActiveProfile: () => void;          // limpa a seleção para voltar à tela de seleção de perfis
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [activeProfile, setActiveProfile] = useState<Profile | null>(null);
    const [isHeroMode, setIsHeroMode] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const loadProfile = async (userId: string): Promise<Profile | null> => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) {
                if (error.code !== 'PGRST116') console.error('Error fetching profile:', error);
                return null;
            }
            return data as Profile;
        } catch (err) {
            console.error('Exception loading profile:', err);
            return null;
        }
    };

    useEffect(() => {
        let mounted = true;

        const initAuth = async () => {
            setIsLoading(true);

            const { data: { session } } = await supabase.auth.getSession();

            if (mounted) {
                if (session?.user) {
                    setUser(session.user);
                    const p = await loadProfile(session.user.id);
                    setProfile(p);

                    const savedActiveProfileId = localStorage.getItem('fq_active_profile_id');
                    if (savedActiveProfileId && savedActiveProfileId !== session.user.id) {
                        const savedProfile = await loadProfile(savedActiveProfileId);
                        if (savedProfile) {
                            setActiveProfile(savedProfile);
                            setIsHeroMode(true);
                        } else {
                            setActiveProfile(p);
                            setIsHeroMode(false);
                        }
                    } else if (savedActiveProfileId === session.user.id) {
                        setActiveProfile(p);
                        setIsHeroMode(false);
                    } else {
                        // Se não tem nada salvo, começa na tela de seleção de perfis (Netflix)
                        setActiveProfile(null);
                        setIsHeroMode(false);
                    }
                } else {
                    setUser(null);
                    setProfile(null);
                    setActiveProfile(null);
                    setIsHeroMode(false);
                }
                setIsLoading(false);
            }

            const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
                if (!mounted) return;
                if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
                    if (session?.user) {
                        setUser(session.user);
                        const p = await loadProfile(session.user.id);
                        setProfile(p);

                        // Respeita o isHeroMode ou a seleção existente, se houver
                        if (!isHeroMode && !localStorage.getItem('fq_active_profile_id')) {
                            setActiveProfile(null);
                        }
                    }
                } else if (event === 'SIGNED_OUT') {
                    setUser(null);
                    setProfile(null);
                    setActiveProfile(null);
                    setIsHeroMode(false);
                    localStorage.removeItem('fq_active_profile_id');
                }
                setIsLoading(false);
            });

            return () => { mounted = false; subscription.unsubscribe(); };
        };

        initAuth();
    }, []);

    const refreshProfile = async () => {
        if (user) {
            const p = await loadProfile(user.id);
            setProfile(p);
            if (!isHeroMode) setActiveProfile(p);
        }
    };

    /** Switch to a hero profile (same-device, no Supabase re-auth) */
    const switchToHero = (hero: Profile) => {
        setActiveProfile(hero);
        setIsHeroMode(true);
        localStorage.setItem('fq_active_profile_id', hero.id);
    };

    /** Return to the master's profile */
    const exitHeroMode = () => {
        setActiveProfile(profile);
        setIsHeroMode(false);
        localStorage.setItem('fq_active_profile_id', profile?.id || '');
    };

    /** Limpa a seleção e volta para a "Tela Netflix" (onde o Mestre e Heróis podem ser escolhidos) */
    const clearActiveProfile = () => {
        setActiveProfile(null);
        setIsHeroMode(false);
        localStorage.removeItem('fq_active_profile_id');
    };

    const signOut = async () => {
        setIsHeroMode(false);
        setActiveProfile(null);
        localStorage.removeItem('fq_active_profile_id');
        await supabase.auth.signOut();
    };

    return (
        <AuthContext.Provider value={{
            user, profile, activeProfile,
            isLoading, isHeroMode,
            signOut, refreshProfile,
            switchToHero, exitHeroMode, clearActiveProfile
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};
