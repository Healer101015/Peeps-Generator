import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface AuthUser {
    id: string;
    name: string;
    email: string;
    avatarConfig: Record<string, unknown>;
}

interface AuthContextProps {
    user: AuthUser | null;
    token: string | null;
    login: (email: string, password: string) => Promise<void>;
    register: (name: string, email: string, password: string) => Promise<void>;
    logout: () => void;
    saveAvatar: (avatarConfig: Record<string, unknown>) => Promise<void>;
    loading: boolean;
}

const AuthContext = createContext<AuthContextProps>({} as AuthContextProps);

const API = 'https://peeps-generator.onrender.com/api';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const storedToken = localStorage.getItem('peeps_token');
        const storedUser = localStorage.getItem('peeps_user');
        if (storedToken && storedUser) {
            setToken(storedToken);
            setUser(JSON.parse(storedUser));
        }
        setLoading(false);
    }, []);

    const persist = (token: string, user: AuthUser) => {
        localStorage.setItem('peeps_token', token);
        localStorage.setItem('peeps_user', JSON.stringify(user));
        setToken(token);
        setUser(user);
    };

    const login = async (email: string, password: string) => {
        const res = await fetch(`${API}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao fazer login');
        persist(data.token, data.user);
    };

    const register = async (name: string, email: string, password: string) => {
        const res = await fetch(`${API}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao criar conta');
        persist(data.token, data.user);
    };

    const saveAvatar = async (avatarConfig: Record<string, unknown>) => {
        if (!token) return;
        const res = await fetch(`${API}/auth/avatar`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ avatarConfig }),
        });
        if (res.ok) {
            const updated = { ...user!, avatarConfig };
            localStorage.setItem('peeps_user', JSON.stringify(updated));
            setUser(updated);
        }
    };

    const logout = () => {
        localStorage.removeItem('peeps_token');
        localStorage.removeItem('peeps_user');
        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, token, login, register, logout, saveAvatar, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);