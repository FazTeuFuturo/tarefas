import React from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import MasterDashboard from './pages/parent/MasterDashboard';
import HeroDashboard from './pages/hero/HeroDashboard';

function AppRouter() {
    const { user, profile, isLoading } = useAuth();
    const [authView, setAuthView] = React.useState<'login' | 'register'>('login');

    if (isLoading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--color-background)' }}>
                <div style={{ textAlign: 'center' }}>
                    <div className="neo-spinner" style={{ width: 40, height: 40, margin: '0 auto 16px' }} />
                    <p style={{ fontWeight: 800 }}>Carregando aventura...</p>
                </div>
            </div>
        );
    }

    if (!user || !profile) {
        if (authView === 'register') {
            return <Register onRegisterSuccess={() => { }} onNavigateLogin={() => setAuthView('login')} />;
        }
        return <Login onLoginSuccess={() => { }} onNavigateRegister={() => setAuthView('register')} />;
    }

    // Loaded and Authenticated
    if (profile.role === 'parent') {
        return <MasterDashboard />;
    }

    return <HeroDashboard />;
}

export default function App() {
    return (
        <AuthProvider>
            <AppRouter />
        </AuthProvider>
    );
}
