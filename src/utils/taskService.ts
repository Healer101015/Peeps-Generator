const API_BASE = 'https://peeps-generator.onrender.com';

export interface Subtask {
    id: string;
    title: string;
    completed: boolean;
}

export interface RecurrenceConfig {
    frequency: 'daily' | 'weekly' | 'monthly' | 'custom';
    daysOfWeek?: number[]; // 0=Sun, 1=Mon...6=Sat
    timeOfDay?: string | null; // "HH:mm"
    endDate?: string | null;
    completionCount?: number;
    lastCompletedAt?: string | null;
    nextOccurrence?: string | null;
}

export interface TaskAPI {
    _id: string;
    title: string;
    description: string;
    completed: boolean;
    priority: 'low' | 'medium' | 'high';
    dueDate: string | null;
    createdAt: string;
    tags: string[];
    subtasks: Subtask[];
    notes: string;
    pinned: boolean;
    archived: boolean;
    estimatedMinutes: number | null;
    loggedMinutes: number;
    isRecurring: boolean;
    recurrence: RecurrenceConfig | null;
}

export interface TaskStats {
    total: number;
    completed: number;
    pending: number;
    overdue: number;
    recurring: number;
    pinned: number;
    completionRate: number;
    totalLoggedMinutes: number;
    byPriority: { low: number; medium: number; high: number };
    topTags: { tag: string; count: number }[];
}

export interface CreateTaskInput {
    title: string;
    description?: string;
    priority?: 'low' | 'medium' | 'high';
    dueDate?: string | null;
    tags?: string[];
    subtasks?: Omit<Subtask, 'completed'>[];
    notes?: string;
    estimatedMinutes?: number | null;
    pinned?: boolean;
    isRecurring?: boolean;
    recurrence?: Omit<RecurrenceConfig, 'completionCount' | 'lastCompletedAt' | 'nextOccurrence'> | null;
}

const getToken = () => localStorage.getItem('peeps_token') || '';

const headers = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getToken()}`,
});

export const taskService = {
    async getAll(options?: { archived?: boolean; tag?: string; pinned?: boolean }): Promise<TaskAPI[]> {
        const params = new URLSearchParams();
        if (options?.archived) params.set('archived', 'true');
        if (options?.tag) params.set('tag', options.tag);
        if (options?.pinned) params.set('pinned', 'true');
        const res = await fetch(`${API_BASE}/tasks?${params}`, { headers: headers() });
        if (!res.ok) throw new Error('Erro ao buscar tarefas');
        return res.json();
    },

    async create(data: CreateTaskInput): Promise<TaskAPI> {
        const res = await fetch(`${API_BASE}/tasks`, {
            method: 'POST',
            headers: headers(),
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Erro ao criar tarefa');
        return res.json();
    },

    async toggle(id: string): Promise<TaskAPI> {
        const res = await fetch(`${API_BASE}/tasks/${id}/toggle`, {
            method: 'PATCH',
            headers: headers(),
        });
        if (!res.ok) throw new Error('Erro ao atualizar tarefa');
        return res.json();
    },

    async update(id: string, data: Partial<TaskAPI>): Promise<TaskAPI> {
        const res = await fetch(`${API_BASE}/tasks/${id}`, {
            method: 'PUT',
            headers: headers(),
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Erro ao atualizar tarefa');
        return res.json();
    },

    async remove(id: string): Promise<void> {
        const res = await fetch(`${API_BASE}/tasks/${id}`, {
            method: 'DELETE',
            headers: headers(),
        });
        if (!res.ok) throw new Error('Erro ao deletar tarefa');
    },

    // Feature 1: Pin/Unpin
    async pin(id: string): Promise<TaskAPI> {
        const res = await fetch(`${API_BASE}/tasks/${id}/pin`, {
            method: 'PATCH',
            headers: headers(),
        });
        if (!res.ok) throw new Error('Erro ao fixar tarefa');
        return res.json();
    },

    // Feature 2: Archive/Unarchive
    async archive(id: string): Promise<TaskAPI> {
        const res = await fetch(`${API_BASE}/tasks/${id}/archive`, {
            method: 'PATCH',
            headers: headers(),
        });
        if (!res.ok) throw new Error('Erro ao arquivar tarefa');
        return res.json();
    },

    // Feature 3: Toggle subtask
    async toggleSubtask(taskId: string, subtaskId: string): Promise<TaskAPI> {
        const res = await fetch(`${API_BASE}/tasks/${taskId}/subtask/${subtaskId}`, {
            method: 'PATCH',
            headers: headers(),
        });
        if (!res.ok) throw new Error('Erro ao atualizar subtarefa');
        return res.json();
    },

    // Feature 4: Log time
    async logTime(id: string, minutes: number): Promise<TaskAPI> {
        const res = await fetch(`${API_BASE}/tasks/${id}/log-time`, {
            method: 'PATCH',
            headers: headers(),
            body: JSON.stringify({ minutes }),
        });
        if (!res.ok) throw new Error('Erro ao registrar tempo');
        return res.json();
    },

    // Feature 5: Get statistics
    async getStats(): Promise<TaskStats> {
        const res = await fetch(`${API_BASE}/tasks/stats`, { headers: headers() });
        if (!res.ok) throw new Error('Erro ao buscar estatísticas');
        return res.json();
    },
};