// src/models/Team.js
const mongoose = require('mongoose');

const TeamSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }, // 팀 이름 (예: T1)
  winStreak: { type: Number, default: 0 } // 연승 횟수 (0 ~ 6)
});

module.exports = mongoose.model('Team', TeamSchema);