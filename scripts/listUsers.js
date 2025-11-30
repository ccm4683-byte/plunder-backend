// scripts/listUsers.js
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User'); // 경로가 다르면 수정

async function run(){
  await mongoose.connect(process.env.MONGO_URI);
  const users = await User.find().limit(50).lean();
  console.log('total found:', users.length);
  users.forEach(u => console.log({
    id: u._id?.toString(),
    email: u.email,
    password: u.password,       // legacy 필드
    passwordHash: u.passwordHash // 혹시 존재하면 출력
  }));
  await mongoose.disconnect();
}
run().catch(e => { console.error(e); process.exit(1); });
