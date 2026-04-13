require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'peeps_secret_change_in_production';

// ── Conexão MongoDB ──────────────────────────────────────
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('MongoDB Conectado'))
    .catch(err => console.error('Erro no MongoDB:', err));

// ── Schemas ──────────────────────────────────────────────
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    avatarConfig: { type: Object, default: {} },
    createdAt: { type: Date, default: Date.now },
});

const taskSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    completed: { type: Boolean, default: false },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    dueDate: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now },

    // === NEW FEATURES ===

    // Tags/labels
    tags: [{ type: String }],

    // Subtasks
    subtasks: [{
        id: String,
        title: String,
        completed: { type: Boolean, default: false },
    }],

    // Notes
    notes: { type: String, default: '' },

    // Pinned
    pinned: { type: Boolean, default: false },

    // Archived
    archived: { type: Boolean, default: false },

    // Estimated time (in minutes)
    estimatedMinutes: { type: Number, default: null },

    // Actual time logged (in minutes)
    loggedMinutes: { type: Number, default: 0 },

    // === RECURRING TASKS ===
    isRecurring: { type: Boolean, default: false },
    recurrence: {
        type: {
            frequency: { type: String, enum: ['daily', 'weekly', 'monthly', 'custom'], default: 'daily' },
            // Days of week for weekly (0=Sun, 1=Mon, ..., 6=Sat)
            daysOfWeek: [{ type: Number }],
            // Time of day HH:mm
            timeOfDay: { type: String, default: null },
            // End date for recurrence
            endDate: { type: Date, default: null },
            // How many times completed
            completionCount: { type: Number, default: 0 },
            // Last completed date
            lastCompletedAt: { type: Date, default: null },
            // Next occurrence
            nextOccurrence: { type: Date, default: null },
        },
        default: null,
    },

    // Parent task (for recurring instances)
    parentTaskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', default: null },
});

const User = mongoose.model('User', userSchema);
const Task = mongoose.model('Task', taskSchema);

// ── Middleware de autenticação ───────────────────────────
const auth = (req, res, next) => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token não fornecido' });
    }
    try {
        const token = header.split(' ')[1];
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch {
        res.status(401).json({ error: 'Token inválido ou expirado' });
    }
};

// Helper: calculate next occurrence for recurring tasks
function calculateNextOccurrence(recurrence, fromDate = new Date()) {
    if (!recurrence) return null;
    const { frequency, daysOfWeek, timeOfDay } = recurrence;

    let next = new Date(fromDate);

    if (frequency === 'daily') {
        next.setDate(next.getDate() + 1);
    } else if (frequency === 'weekly' && daysOfWeek && daysOfWeek.length > 0) {
        // Find next day of week
        let found = false;
        for (let i = 1; i <= 7; i++) {
            const candidate = new Date(fromDate);
            candidate.setDate(candidate.getDate() + i);
            if (daysOfWeek.includes(candidate.getDay())) {
                next = candidate;
                found = true;
                break;
            }
        }
        if (!found) next.setDate(next.getDate() + 7);
    } else if (frequency === 'monthly') {
        next.setMonth(next.getMonth() + 1);
    } else {
        next.setDate(next.getDate() + 1);
    }

    // Set time of day if specified
    if (timeOfDay) {
        const [hours, minutes] = timeOfDay.split(':').map(Number);
        next.setHours(hours, minutes, 0, 0);
    } else {
        next.setHours(23, 59, 0, 0);
    }

    return next;
}

// ── ROTAS DE AUTENTICAÇÃO ────────────────────────────────

app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password)
            return res.status(400).json({ error: 'Preencha todos os campos' });
        if (password.length < 6)
            return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres' });
        const exists = await User.findOne({ email });
        if (exists)
            return res.status(400).json({ error: 'Este e-mail já está cadastrado' });
        const hashed = await bcrypt.hash(password, 10);
        const user = await User.create({ name, email, password: hashed });
        const token = jwt.sign({ id: user._id, name: user.name, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
        res.status(201).json({
            token,
            user: { id: user._id, name: user.name, email: user.email, avatarConfig: user.avatarConfig },
        });
    } catch {
        res.status(500).json({ error: 'Erro ao criar conta' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password)
            return res.status(400).json({ error: 'Preencha e-mail e senha' });
        const user = await User.findOne({ email });
        if (!user)
            return res.status(401).json({ error: 'E-mail ou senha incorretos' });
        const match = await bcrypt.compare(password, user.password);
        if (!match)
            return res.status(401).json({ error: 'E-mail ou senha incorretos' });
        const token = jwt.sign({ id: user._id, name: user.name, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
        res.json({
            token,
            user: { id: user._id, name: user.name, email: user.email, avatarConfig: user.avatarConfig },
        });
    } catch {
        res.status(500).json({ error: 'Erro ao fazer login' });
    }
});

app.put('/api/auth/avatar', auth, async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.user.id,
            { avatarConfig: req.body.avatarConfig },
            { new: true }
        );
        res.json({ avatarConfig: user.avatarConfig });
    } catch {
        res.status(500).json({ error: 'Erro ao salvar avatar' });
    }
});

app.get('/api/auth/me', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.json(user);
    } catch {
        res.status(500).json({ error: 'Erro ao buscar usuário' });
    }
});

// ── ROTAS DE TAREFAS ─────────────────────────────────────

// Get all tasks (excluding archived by default)
app.get('/api/tasks', auth, async (req, res) => {
    try {
        const { archived, tag, pinned } = req.query;
        const query = { userId: req.user.id };

        if (archived === 'true') {
            query.archived = true;
        } else {
            query.archived = { $ne: true };
        }

        if (tag) query.tags = tag;
        if (pinned === 'true') query.pinned = true;

        const tasks = await Task.find(query).sort({ pinned: -1, createdAt: -1 });
        res.json(tasks);
    } catch {
        res.status(500).json({ error: 'Erro ao buscar tarefas' });
    }
});

// Create task (with recurring support)
app.post('/api/tasks', auth, async (req, res) => {
    try {
        const { title, description, priority, dueDate, tags, subtasks, notes, estimatedMinutes, isRecurring, recurrence, pinned } = req.body;

        const taskData = {
            userId: req.user.id,
            title,
            description,
            priority,
            dueDate,
            tags: tags || [],
            subtasks: subtasks || [],
            notes: notes || '',
            estimatedMinutes: estimatedMinutes || null,
            isRecurring: isRecurring || false,
            pinned: pinned || false,
        };

        if (isRecurring && recurrence) {
            taskData.recurrence = {
                ...recurrence,
                completionCount: 0,
                lastCompletedAt: null,
                nextOccurrence: calculateNextOccurrence(recurrence, dueDate ? new Date(dueDate) : new Date()),
            };
        }

        const task = await Task.create(taskData);
        res.status(201).json(task);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao criar tarefa' });
    }
});

// Update task
app.put('/api/tasks/:id', auth, async (req, res) => {
    try {
        const task = await Task.findOneAndUpdate(
            { _id: req.params.id, userId: req.user.id },
            req.body,
            { new: true }
        );
        if (!task) return res.status(404).json({ error: 'Tarefa não encontrada' });
        res.json(task);
    } catch {
        res.status(500).json({ error: 'Erro ao atualizar tarefa' });
    }
});

// Toggle complete (handles recurring reset)
app.patch('/api/tasks/:id/toggle', auth, async (req, res) => {
    try {
        const task = await Task.findOne({ _id: req.params.id, userId: req.user.id });
        if (!task) return res.status(404).json({ error: 'Tarefa não encontrada' });

        task.completed = !task.completed;

        // For recurring tasks, update recurrence info when completing
        if (task.completed && task.isRecurring && task.recurrence) {
            task.recurrence.completionCount = (task.recurrence.completionCount || 0) + 1;
            task.recurrence.lastCompletedAt = new Date();
            task.recurrence.nextOccurrence = calculateNextOccurrence(task.recurrence);
        }

        await task.save();
        res.json(task);
    } catch {
        res.status(500).json({ error: 'Erro ao atualizar tarefa' });
    }
});

// Delete task
app.delete('/api/tasks/:id', auth, async (req, res) => {
    try {
        const task = await Task.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
        if (!task) return res.status(404).json({ error: 'Tarefa não encontrada' });
        res.json({ message: 'Tarefa deletada' });
    } catch {
        res.status(500).json({ error: 'Erro ao deletar tarefa' });
    }
});

// ── FEATURE 1: Pin/Unpin task ──────────────────────────
app.patch('/api/tasks/:id/pin', auth, async (req, res) => {
    try {
        const task = await Task.findOne({ _id: req.params.id, userId: req.user.id });
        if (!task) return res.status(404).json({ error: 'Tarefa não encontrada' });
        task.pinned = !task.pinned;
        await task.save();
        res.json(task);
    } catch {
        res.status(500).json({ error: 'Erro ao fixar tarefa' });
    }
});

// ── FEATURE 2: Archive/Unarchive task ─────────────────
app.patch('/api/tasks/:id/archive', auth, async (req, res) => {
    try {
        const task = await Task.findOne({ _id: req.params.id, userId: req.user.id });
        if (!task) return res.status(404).json({ error: 'Tarefa não encontrada' });
        task.archived = !task.archived;
        await task.save();
        res.json(task);
    } catch {
        res.status(500).json({ error: 'Erro ao arquivar tarefa' });
    }
});

// ── FEATURE 3: Toggle subtask ─────────────────────────
app.patch('/api/tasks/:id/subtask/:subtaskId', auth, async (req, res) => {
    try {
        const task = await Task.findOne({ _id: req.params.id, userId: req.user.id });
        if (!task) return res.status(404).json({ error: 'Tarefa não encontrada' });
        const subtask = task.subtasks.find(s => s.id === req.params.subtaskId);
        if (!subtask) return res.status(404).json({ error: 'Subtarefa não encontrada' });
        subtask.completed = !subtask.completed;
        await task.save();
        res.json(task);
    } catch {
        res.status(500).json({ error: 'Erro ao atualizar subtarefa' });
    }
});

// ── FEATURE 4: Log time on task ───────────────────────
app.patch('/api/tasks/:id/log-time', auth, async (req, res) => {
    try {
        const { minutes } = req.body;
        const task = await Task.findOne({ _id: req.params.id, userId: req.user.id });
        if (!task) return res.status(404).json({ error: 'Tarefa não encontrada' });
        task.loggedMinutes = (task.loggedMinutes || 0) + (minutes || 0);
        await task.save();
        res.json(task);
    } catch {
        res.status(500).json({ error: 'Erro ao registrar tempo' });
    }
});

// ── FEATURE 5: Get task statistics ────────────────────
app.get('/api/tasks/stats', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const allTasks = await Task.find({ userId, archived: { $ne: true } });

        const total = allTasks.length;
        const completed = allTasks.filter(t => t.completed).length;
        const overdue = allTasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && !t.completed).length;
        const recurring = allTasks.filter(t => t.isRecurring).length;
        const pinned = allTasks.filter(t => t.pinned).length;
        const totalLoggedMinutes = allTasks.reduce((acc, t) => acc + (t.loggedMinutes || 0), 0);

        const byPriority = {
            low: allTasks.filter(t => t.priority === 'low').length,
            medium: allTasks.filter(t => t.priority === 'medium').length,
            high: allTasks.filter(t => t.priority === 'high').length,
        };

        // Tags usage
        const tagCount = {};
        allTasks.forEach(t => {
            (t.tags || []).forEach(tag => {
                tagCount[tag] = (tagCount[tag] || 0) + 1;
            });
        });

        res.json({
            total,
            completed,
            pending: total - completed,
            overdue,
            recurring,
            pinned,
            completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
            totalLoggedMinutes,
            byPriority,
            topTags: Object.entries(tagCount)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([tag, count]) => ({ tag, count })),
        });
    } catch {
        res.status(500).json({ error: 'Erro ao buscar estatísticas' });
    }
});


const corsOptions = {
    origin: ['https://seu-frontend.vercel.app', 'https://seu-frontend.onrender.com'], // Coloque aqui a URL do seu site
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    optionsSuccessStatus: 204
};

app.use(cors(corsOptions));


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));

app.get('/', (_req, res) => {
    res.send('API online no Render 🚀');
});