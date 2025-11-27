//src/routes/auth.js
console.log('auth route file loaded')

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

router.post('/register', async (req,res) => {
  try {
    const { email, password, role, favoriteTeam } = req.body;
    if(role === 'fan' && !favoriteTeam) return res.status(400).json({msg:'fan requires favoriteTeam'});
    const existing = await User.findOne({ email });
    if(existing) return res.status(400).json({msg:'email exists'});
    const hash = await bcrypt.hash(password, 10);
    const user = new User({ email, passwordHash: hash, role, favoriteTeam });
    await user.save();
    res.json({ msg:'registered' });
  } catch(e) { res.status(500).json({msg:'err', error:e.message}); }
});

router.post('/login', async (req,res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if(!user) return res.status(400).json({msg:'no user'});
    const ok = await bcrypt.compare(password, user.passwordHash);
    if(!ok) return res.status(400).json({msg:'wrong password'});
    const token = jwt.sign({ id:user._id, role:user.role }, process.env.JWT_SECRET, { expiresIn:'7d' });
    res.json({ token, role:user.role, favoriteTeam: user.favoriteTeam });
  } catch(e){ res.status(500).json({msg:'err', error:e.message}); }
});


router.get('/ping', (req, res) => res.json({ ok: true, route: '/api/auth/ping' }));

// 보호된 라우트 - 토큰 검사 후 사용자 정보 반환
const authMiddleware = require('../middleware/auth');

router.get('/me', authMiddleware, (req, res) => {
  res.json({ msg: 'protected ok', user: req.user });
});


module.exports = router;


