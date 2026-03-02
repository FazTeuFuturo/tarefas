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
}

interface AuthContextType {
    user: User | null;
    profile: Profile | null;
    isLoading: boolean;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const loadProfile = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    console.warn('Profile not found yet (PGRST116). Might be registering...');
                } else {
                    console.error('Error fetching profile:', error);
                }
                setProfile(null);
            } else if (data) {
                setProfile(data as Profile);
            }
        } catch (err) {
            console.error('Exception loading profile:', err);
        }
    };

    useEffect(() => {
        let mounted = true;

        // Supabase initialization and listener
        const initAuth = async () => {
            setIsLoading(true);

            // 1. Initial Session Check (Fast path)
            const { data: { session } } = await supabase.auth.getSession();

            if (mounted) {
                if (session?.user) {
                    setUser(session.user);
                    await loadProfile(session.user.id);
                } else {
                    setUser(null);
                    setProfile(null);
                }
                setIsLoading(false);
            }

            // 2. Realtime Auth State Listener (Robust path)
            const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
                if (!mounted) return;

                console.log(`Auth Event: ${event}`);
                if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
                    if (session?.user) {
                        setUser(session.user);
                        await loadProfile(session.user.id);
                    }
                } else if (event === 'SIGNED_OUT') {
                    setUser(null);
                    setProfile(null);
                }
                setIsLoading(false);
            });

            return () => {
                mounted = false;
                subscription.unsubscribe();
            };
        };

        initAuth();
    }, []);

    const refreshProfile = async () => {
        if (user) await loadProfile(user.id);
    };

    const signOut = async () => {
        await supabase.auth.signOut();
    };

    return (
        <AuthContext.Provider value={{ user, profile, isLoading, signOut, refreshProfile }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
