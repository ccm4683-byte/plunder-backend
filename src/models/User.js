const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type:String, required:true, unique:true },
  passwordHash: { type:String, required:true },
  role: { type:String, enum:['fan','sponsor','admin'], required:true },
  favoriteTeam: { type:String } // fan이면 클라이언트/컨트롤러에서 필수검증
}, { timestamps:true });

module.exports = mongoose.model('User', userSchema);
