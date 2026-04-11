import React, { useState } from 'react';
import { useAuth } from '../utils/authContext';
import readingSide from '../assets/reading-side.svg';
import laying from '../assets/laying.svg';

export const LoginPage: React.FC = () => {
    const { login, register } = useAuth();
    const [mode, setMode] = useState<'login' | 'register'>('login');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (mode === 'login') {
            if (!email || !password) {
                setError('Preencha todos os campos');
                return;
            }
        } else {
            if (!name || !email || !password) {
                setError('Preencha todos os campos');
                return;
            }
        }

        setLoading(true);
        setError('');

        try {
            if (mode === 'login') {
                await login(email, password);
            } else {
                await register(name, email, password);
            }
        } catch (e: any) {
            setError(e.message || 'Erro desconhecido');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.root}>
            <div style={styles.leftPanel}>
                <h1 style={styles.title}>Doodle Tasks</h1>
                <img src={readingSide} alt="reading" style={styles.readingFigure} />
                <img src={laying} alt="laying" style={styles.layingFigure} />
            </div>

            <div style={styles.rightPanel}>
                <div style={styles.card}>
                    <h2 style={styles.cardTitle}>
                        {mode === 'login' ? 'Entre' : 'Cadastre-se'}
                    </h2>

                    {error && <div style={styles.errorBanner}>{error}</div>}

                    {mode === 'register' && (
                        <>
                            <label style={styles.label}>Nome</label>
                            <input
                                style={styles.input}
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                                autoComplete="name"
                            />
                        </>
                    )}

                    <label style={styles.label}>Email</label>
                    <input
                        style={styles.input}
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                        autoComplete="email"
                    />

                    <label style={styles.label}>Senha</label>
                    <input
                        style={styles.input}
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                        autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    />

                    <span
                        style={styles.forgotLink}
                        onClick={() => {
                            setMode(mode === 'login' ? 'register' : 'login');
                            setError('');
                        }}
                    >
                        {mode === 'login'
                            ? 'Não tem conta? Cadastre-se'
                            : 'Já tem conta? Entre'}
                    </span>

                    <button
                        style={{ ...styles.btn, opacity: loading ? 0.7 : 1 }}
                        onClick={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? 'Aguarde...' : mode === 'login' ? 'Acessar' : 'Criar conta'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    root: {
        display: 'flex',
        width: '100vw',
        height: '100vh',
        fontFamily: '"Itim", cursive',
        overflow: 'hidden',
        background: '#fff',
    },
    leftPanel: {
        flex: '0 0 55%',
        background: '#FFE234',
        position: 'relative',
        overflow: 'hidden',
    },
    title: {
        position: 'absolute',
        top: 28,
        left: '50%',
        transform: 'translateX(-50%)',
        fontFamily: '"Gochi Hand", cursive',
        fontSize: '2.6rem',
        color: '#4a4a00',
        whiteSpace: 'nowrap',
        margin: 0,
        letterSpacing: 1,
        zIndex: 2,
    },
    readingFigure: {
        position: 'absolute',
        top: '-30px',
        left: '-60px',
        width: '520px',
        height: 'auto',
        zIndex: 1,
    },
    layingFigure: {
        position: 'absolute',
        bottom: '-20px',
        left: '30px',
        width: '580px',
        height: 'auto',
        zIndex: 1,
    },
    rightPanel: {
        flex: '0 0 45%',
        background: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
    },
    card: {
        background: 'rgba(255,246,200,0.55)',
        borderRadius: 28,
        padding: '2.5rem 2.8rem',
        width: '100%',
        maxWidth: 360,
        boxShadow: '0 8px 40px rgba(0,0,0,0.08)',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
    },
    cardTitle: {
        fontFamily: '"Gochi Hand", cursive',
        fontSize: '2.2rem',
        textAlign: 'center',
        color: '#222',
        margin: '0 0 16px 0',
        letterSpacing: 1,
    },
    label: {
        fontSize: '0.88rem',
        color: '#555',
        marginBottom: 2,
        marginTop: 8,
    },
    input: {
        width: '100%',
        padding: '10px 14px',
        borderRadius: 24,
        border: '1.5px solid #e0d9a0',
        background: '#fff',
        fontSize: '1rem',
        fontFamily: '"Itim", cursive',
        outline: 'none',
        boxSizing: 'border-box',
        marginBottom: 4,
    },
    forgotLink: {
        fontSize: '0.8rem',
        color: '#888',
        cursor: 'pointer',
        textDecoration: 'underline',
        marginTop: 4,
        marginBottom: 12,
        display: 'block',
        textAlign: 'center',
    },
    btn: {
        marginTop: 12,
        padding: '12px 0',
        borderRadius: 24,
        border: 'none',
        background: 'rgba(255,246,200,0.9)',
        fontFamily: '"Gochi Hand", cursive',
        fontSize: '1.3rem',
        color: '#222',
        cursor: 'pointer',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        letterSpacing: 1,
    },
    errorBanner: {
        background: '#ffe0e0',
        border: '1px solid #ffaaaa',
        borderRadius: 12,
        padding: '8px 14px',
        color: '#c0392b',
        fontSize: '0.9rem',
        textAlign: 'center',
        marginBottom: 8,
    },
};