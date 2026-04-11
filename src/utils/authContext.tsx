import React, { createContext, useContext, useState, useCallback } from 'react';

export interface AvatarConfig {
    pickedHair: string;
    pickedBody: string;
    pickedFace: string;
    pickedFacialHair: string;
    pickedAccessory: string;
    strokeColor: string | object;
    backgroundBasicColor: string | object;
    isFrameTransparent: boolean;
}

export interface AuthUser {
    id: string;
    username: string;
    avatarConfig: AvatarConfig;
}

interface AuthContextProps {
    user: AuthUser | null;
    login: (username: string, password: string) => Promise<void>;
    register: (username: string, password: string) => Promise<void>;
    logout: () => void;
    updateAvatarConfig: (config: AvatarConfig) => Promise<void>;
    error: string | null;
}

const AuthContext = createContext<AuthContextProps>({
    user: null,
    login: async () => {},
    register: async () => {},
    logout: () => {},
    updateAvatarConfig: async () => {},
    error: null,
});

const API = 'http://localhost:5000/api';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<AuthUser | null>(() => {
        try {
            const saved = localStorage.getItem('doodle_user');
            return saved ? JSON.parse(saved) : null;
        } catch { return null; }
    });
    const [error, setError] = useState<string | null>(null);

    const login = useCallback(async (username: string, password: string) => {
        setError(null);
        const res = await fetch(`${API}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao fazer login');
        setUser(data);
        localStorage.setItem('doodle_user', JSON.stringify(data));
    }, []);

    const register = useCallback(async (username: string, password: string) => {
        setError(null);
        const res = await fetch(`${API}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao registrar');
        setUser(data);
        localStorage.setItem('doodle_user', JSON.stringify(data));
    }, []);

    const logout = useCallback(() => {
        setUser(null);
        localStorage.removeItem('doodle_user');
    }, []);

    const updateAvatarConfig = useCallback(async (config: AvatarConfig) => {
        if (!user) return;
        const res = await fetch(`${API}/users/${user.id}/avatar`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config),
        });
        if (res.ok) {
            const updated = { ...user, avatarConfig: config };
            setUser(updated);
            localStorage.setItem('doodle_user', JSON.stringify(updated));
        }
    }, [user]);

    return (
        <AuthContext.Provider value={{ user, login, register, logout, updateAvatarConfig, error }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
