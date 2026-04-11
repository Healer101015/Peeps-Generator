import React, { useState, useEffect, useCallback } from "react";
import Peep from "react-peeps";
import { useProvider } from "../utils/contextProvider";
import { adjustPeepsViewbox } from "../utils/viewbox";
import LeftMenu from "./leftMenu";
import RightMenu from "./rightMenu";
import { Footer } from "./footer";
import { useAuth } from "../utils/authContext";

const API = 'http://localhost:5000/api';

interface Task {
    id: string;
    text: string;
    completed: boolean;
}

export const PeepsGenerator: React.FC = () => {
    const { state, dispatch } = useProvider();
    const { user, logout, updateAvatarConfig } = useAuth();

    const {
        pickedAccessory, pickedBody, pickedFace, pickedFacialHair, pickedHair,
        strokeColor, scaleVector, isFrameTransparent, backgroundBasicColor, isCharacterCreated,
    } = state;

    // ── Tasks from DB ──────────────────────────────────────────────────────────
    const [tasks, setTasks] = useState<Task[]>([]);
    const [taskText, setTaskText] = useState('');
    const [savingAvatar, setSavingAvatar] = useState(false);
    const [avatarSaved, setAvatarSaved] = useState(false);

    // Load tasks from server on mount / user change
    useEffect(() => {
        if (!user) return;
        fetch(`${API}/tasks/${user.id}`)
            .then(r => r.json())
            .then(data => Array.isArray(data) && setTasks(data))
            .catch(() => {});
    }, [user]);

    // Load saved avatar config into state when user logs in
    useEffect(() => {
        if (!user?.avatarConfig) return;
        const cfg = user.avatarConfig;
        if (cfg.pickedHair)       dispatch({ type: 'SET_HAIR',       payload: cfg.pickedHair });
        if (cfg.pickedBody)       dispatch({ type: 'SET_BODY',       payload: cfg.pickedBody });
        if (cfg.pickedFace)       dispatch({ type: 'SET_FACE',       payload: cfg.pickedFace });
        if (cfg.pickedFacialHair) dispatch({ type: 'SET_FACIAL_HAIR', payload: cfg.pickedFacialHair });
        if (cfg.pickedAccessory)  dispatch({ type: 'SET_ACCESSORY',  payload: cfg.pickedAccessory });
        if (cfg.strokeColor)      dispatch({ type: 'SET_STROKE_COLOR', payload: cfg.strokeColor });
        if (cfg.backgroundBasicColor) dispatch({ type: 'SET_BACKGROUND_BASIC_COLOR', payload: cfg.backgroundBasicColor });
        if (typeof cfg.isFrameTransparent === 'boolean') dispatch({ type: 'SET_FRAME_TYPE', payload: cfg.isFrameTransparent });
    }, [user?.id]);

    const handleFinish = async () => {
        setSavingAvatar(true);
        await updateAvatarConfig({
            pickedHair,
            pickedBody,
            pickedFace,
            pickedFacialHair,
            pickedAccessory,
            strokeColor,
            backgroundBasicColor,
            isFrameTransparent,
        } as any);
        setSavingAvatar(false);
        setAvatarSaved(true);
        setTimeout(() => setAvatarSaved(false), 2000);
        dispatch({ type: 'SET_CHARACTER_CREATED', payload: true });
    };

    const addTask = async () => {
        if (!taskText.trim() || !user) return;
        const res = await fetch(`${API}/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id, text: taskText }),
        });
        if (res.ok) {
            const task = await res.json();
            setTasks(prev => [task, ...prev]);
            setTaskText('');
        }
    };

    const toggleTask = async (id: string) => {
        const res = await fetch(`${API}/tasks/${id}/toggle`, { method: 'PUT' });
        if (res.ok) {
            const updated = await res.json();
            setTasks(prev => prev.map(t => t.id === id ? updated : t));
        }
    };

    const removeTask = async (id: string) => {
        await fetch(`${API}/tasks/${id}`, { method: 'DELETE' });
        setTasks(prev => prev.filter(t => t.id !== id));
    };

    const handleSaveAvatar = async () => {
        setSavingAvatar(true);
        await updateAvatarConfig({
            pickedHair, pickedBody, pickedFace, pickedFacialHair,
            pickedAccessory, strokeColor, backgroundBasicColor, isFrameTransparent,
        } as any);
        setSavingAvatar(false);
        setAvatarSaved(true);
        setTimeout(() => setAvatarSaved(false), 2000);
    };

    return (
        <div className={`main-layout ${isCharacterCreated ? 'tasks-active' : ''}`}>
            <div className='container'>
                {/* Top bar with username + logout */}
                <div style={topBarStyle}>
                    <span style={{ fontFamily: '"Gochi Hand", cursive', fontSize: '1.1rem', color: '#555' }}>
                        Olá, <strong>{user?.username}</strong> 👋
                    </span>
                    <button onClick={logout} style={logoutBtnStyle}>Sair</button>
                </div>

                <div className="header-section">
                    <h1>{isCharacterCreated ? 'Minhas Tarefas' : 'Crie seu Personagem'}</h1>
                </div>

                <div className={`svgWrapper ${isCharacterCreated ? 'mini-avatar' : ''}`}>
                    <Peep
                        style={{
                            width: isCharacterCreated ? 180 : 390,
                            height: isCharacterCreated ? 180 : 390,
                            transition: 'all 0.4s ease-in-out'
                        }}
                        accessory={pickedAccessory}
                        body={pickedBody}
                        face={pickedFace}
                        hair={pickedHair}
                        facialHair={pickedFacialHair}
                        strokeColor={strokeColor}
                        viewBox={adjustPeepsViewbox(pickedBody)}
                        wrapperBackground={isFrameTransparent ? undefined : (backgroundBasicColor as string)}
                    />
                    {!isCharacterCreated && (
                        <button
                            className="confirm-btn"
                            onClick={handleFinish}
                            disabled={savingAvatar}
                            style={{ opacity: savingAvatar ? 0.7 : 1 }}
                        >
                            {savingAvatar ? 'Salvando...' : 'Confirmar Personagem'}
                        </button>
                    )}
                    {avatarSaved && (
                        <div style={savedBadgeStyle}>✅ Avatar salvo!</div>
                    )}
                </div>

                {!isCharacterCreated ? (
                    <>
                        <LeftMenu />
                        <RightMenu />
                    </>
                ) : (
                    <div className="task-container">
                        {/* Save avatar again button */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                            <button onClick={() => dispatch({ type: 'SET_CHARACTER_CREATED', payload: false })} style={editAvatarBtnStyle}>
                                ✏️ Editar avatar
                            </button>
                            <button onClick={handleSaveAvatar} style={saveAvatarBtnStyle} disabled={savingAvatar}>
                                {savingAvatar ? 'Salvando...' : '💾 Salvar avatar'}
                            </button>
                        </div>

                        <div className="task-input-group">
                            <input
                                type="text"
                                value={taskText}
                                onChange={e => setTaskText(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && addTask()}
                                placeholder="O que você precisa fazer?"
                            />
                            <button onClick={addTask} style={addBtnStyle}>Adicionar</button>
                        </div>

                        {tasks.length === 0 && (
                            <p style={{ textAlign: 'center', color: '#aaa', marginTop: 24 }}>
                                Nenhuma tarefa ainda. Adicione uma acima! 🎯
                            </p>
                        )}

                        <div className="task-list">
                            {tasks.map(task => (
                                <div key={task.id} className={`task-item ${task.completed ? 'done' : ''}`}>
                                    <span
                                        onClick={() => toggleTask(task.id)}
                                        style={{ cursor: 'pointer', flex: 1 }}
                                    >
                                        {task.completed ? '✅' : '⬜'} {task.text}
                                    </span>
                                    <button
                                        onClick={() => removeTask(task.id)}
                                        style={removeBtnStyle}
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <Footer />
            </div>
        </div>
    );
};

const topBarStyle: React.CSSProperties = {
    position: 'absolute',
    top: 16,
    right: 24,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    zIndex: 10,
};

const logoutBtnStyle: React.CSSProperties = {
    padding: '6px 16px',
    borderRadius: 20,
    border: '1.5px solid #ddd',
    background: '#fff',
    cursor: 'pointer',
    fontFamily: '"Itim", cursive',
    fontSize: '0.9rem',
    color: '#888',
};

const editAvatarBtnStyle: React.CSSProperties = {
    padding: '6px 14px',
    borderRadius: 20,
    border: '1.5px solid #ddd',
    background: '#fff',
    cursor: 'pointer',
    fontFamily: '"Itim", cursive',
    fontSize: '0.85rem',
    marginRight: 8,
};

const saveAvatarBtnStyle: React.CSSProperties = {
    padding: '6px 14px',
    borderRadius: 20,
    border: 'none',
    background: '#FFD55A',
    cursor: 'pointer',
    fontFamily: '"Itim", cursive',
    fontSize: '0.85rem',
};

const addBtnStyle: React.CSSProperties = {
    padding: '10px 20px',
    borderRadius: 24,
    border: 'none',
    background: '#27ae60',
    color: '#fff',
    cursor: 'pointer',
    fontFamily: '"Itim", cursive',
    fontSize: '1rem',
    fontWeight: 'bold',
};

const removeBtnStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    color: '#e74c3c',
    fontSize: '1.4rem',
    cursor: 'pointer',
    lineHeight: 1,
    padding: '0 4px',
};

const savedBadgeStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: -30,
    left: '50%',
    transform: 'translateX(-50%)',
    background: '#d4edda',
    color: '#155724',
    padding: '4px 14px',
    borderRadius: 12,
    fontSize: '0.85rem',
    whiteSpace: 'nowrap',
};
