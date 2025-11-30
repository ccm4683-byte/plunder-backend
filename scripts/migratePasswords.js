// scripts/migratePasswords.js  (주의: 안전을 위해 백업 먼저)
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');

async function run(){
  await mongoose.connect(process.env.MONGO_URI);
  const users = await User.find({ $or: [ { password: { $exists: false } }, { password: null } ] });
  console.log('to migrate count:', users.length);
  for(const u of users){
    if(u.passwordHash){ // passwordHash가 있으면 복사
      u.password = u.passwordHash;
      await u.save();
      console.log('migrated', u.email);
    } else {
      console.log('no hash to migrate for', u.email);
    }
  }
  await mongoose.disconnect();
}
run().catch(e => { console.error(e); process.exit(1); });
