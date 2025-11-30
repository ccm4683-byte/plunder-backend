// src/models/User.js
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    trim: true,      // [필수] 앞뒤 공백 자동 제거
    lowercase: true  // [필수] 대문자를 소문자로 자동 변환 (asd vs ASD 문제 해결)
  },
  password: { type: String },      // 호환성용
  passwordHash: { type: String },  // 실제 비밀번호
  role: { 
    type: String, 
    enum: ['fan', 'sponsor', 'admin'], 
    default: 'fan' 
  },
  favoriteTeam: { type: String, default: null },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);