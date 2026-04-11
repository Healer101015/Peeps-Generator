require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());

// ── Mongoose connection ──────────────────────────────────────────────────────
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('MongoDB Conectado'))
    .catch(err => console.error('Erro no MongoDB:', err));

// ── Schemas ──────────────────────────────────────────────────────────────────
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    avatarConfig: {
        pickedHair:       { type: String, default: 'HatHip' },
        pickedBody:       { type: String, default: 'PointingUp' },
        pickedFace:       { type: String, default: 'Smile' },
        pickedFacialHair: { type: String, default: 'None' },
        pickedAccessory:  { type: String, default: 'None' },
        strokeColor:      { type: mongoose.Schema.Types.Mixed, default: '#000000' },
        backgroundBasicColor: { type: mongoose.Schema.Types.Mixed, default: '#FFD55A' },
        isFrameTransparent: { type: Boolean, default: false },
    },
    createdAt: { type: Date, default: Date.now }
});

const taskSchema = new mongoose.Schema({
    userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text:      { type: String, required: true },
    completed: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Task = mongoose.model('Task', taskSchema);

// ── Helpers ──────────────────────────────────────────────────────────────────
const hashPassword = (pw) =>
    crypto.createHash('sha256').update(pw).digest('hex');

// ── Auth routes ───────────────────────────────────────────────────────────────
// Register
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password)
            return res.status(400).json({ error: 'Usuário e senha obrigatórios' });

        const exists = await User.findOne({ username });
        if (exists)
            return res.status(409).json({ error: 'Usuário já existe' });

        const user = new User({ username, passwordHash: hashPassword(password) });
        await user.save();
        res.status(201).json({ id: user._id, username: user.username, avatarConfig: user.avatarConfig });
    } catch (e) {
        res.status(500).json({ error: 'Erro ao registrar' });
    }
});

// Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username, passwordHash: hashPassword(password) });
        if (!user)
            return res.status(401).json({ error: 'Credenciais inválidas' });

        res.json({ id: user._id, username: user.username, avatarConfig: user.avatarConfig });
    } catch (e) {
        res.status(500).json({ error: 'Erro ao fazer login' });
    }
});

// ── Avatar route ──────────────────────────────────────────────────────────────
app.put('/api/users/:id/avatar', async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { avatarConfig: req.body },
            { new: true }
        );
        if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
        res.json(user.avatarConfig);
    } catch (e) {
        res.status(500).json({ error: 'Erro ao salvar avatar' });
    }
});

// ── Task routes ───────────────────────────────────────────────────────────────
app.get('/api/tasks/:userId', async (req, res) => {
    try {
        const tasks = await Task.find({ userId: req.params.userId }).sort({ createdAt: -1 });
        // Return in the format the frontend expects
        res.json(tasks.map(t => ({ id: t._id.toString(), text: t.text, completed: t.completed })));
    } catch (e) {
        res.status(500).json({ error: 'Erro ao buscar tarefas' });
    }
});

app.post('/api/tasks', async (req, res) => {
    try {
        const { userId, text } = req.body;
        const task = new Task({ userId, text });
        await task.save();
        res.status(201).json({ id: task._id.toString(), text: task.text, completed: task.completed });
    } catch (e) {
        res.status(500).json({ error: 'Erro ao criar tarefa' });
    }
});

app.put('/api/tasks/:id/toggle', async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ error: 'Tarefa não encontrada' });
        task.completed = !task.completed;
        await task.save();
        res.json({ id: task._id.toString(), text: task.text, completed: task.completed });
    } catch (e) {
        res.status(500).json({ error: 'Erro ao atualizar tarefa' });
    }
});

app.delete('/api/tasks/:id', async (req, res) => {
    try {
        await Task.findByIdAndDelete(req.params.id);
        res.json({ message: 'Tarefa deletada' });
    } catch (e) {
        res.status(500).json({ error: 'Erro ao deletar tarefa' });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
