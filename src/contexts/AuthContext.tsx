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
                    setActiveProfile(p);
                } else {
                    setUser(null);
                    setProfile(null);
                    setActiveProfile(null);
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
                        // Only overwrite activeProfile if not in hero mode
                        setActiveProfile(prev => (isHeroMode ? prev : p));
                    }
                } else if (event === 'SIGNED_OUT') {
                    setUser(null);
                    setProfile(null);
                    setActiveProfile(null);
                    setIsHeroMode(false);
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
    };

    /** Return to the master's profile */
    const exitHeroMode = () => {
        setActiveProfile(profile);
        setIsHeroMode(false);
    };

    const signOut = async () => {
        setIsHeroMode(false);
        setActiveProfile(null);
        await supabase.auth.signOut();
    };

    return (
        <AuthContext.Provider value={{
            user, profile, activeProfile,
            isLoading, isHeroMode,
            signOut, refreshProfile,
            switchToHero, exitHeroMode
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
