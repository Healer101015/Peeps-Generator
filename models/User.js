// models/User.js
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    username: { type: String, required: true },
    // Armazena a configuração exata do avatar vinda do frontend
    avatarConfig: {
        head: String,
        face: String,
        facialHair: String,
        accessories: String,
        backgroundColor: String,
        // ... outros atributos do Peeps
    },
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('User', userSchema);