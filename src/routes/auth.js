// src/routes/auth.js
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

    if(!password) return res.status(400).json({ msg: 'password required' });

    const hash = await bcrypt.hash(password, 10);
    // 저장 시 passwordHash 필드는 모델의 필수 필드이므로 반드시 채워주고
    // 호환성을 위해 password 필드도 같이 채워둔다 (나중에 모델 정리 시 제거 가능)
    const user = new User({ email, passwordHash: hash, password: hash, role, favoriteTeam });
    await user.save();
    res.json({ msg:'registered' });
  } catch(e) { 
    console.error('register error', e);
    res.status(500).json({msg:'err', error:e.message});
  }
});

router.post('/login', async (req,res) => {
  try {
    const { email, password } = req.body;
    if(!email || !password) return res.status(400).json({ msg: 'email and password required' });

    const user = await User.findOne({ email });
    if(!user) return res.status(400).json({msg:'no user'});

    // 우선순위: passwordHash 필드가 있으면 그걸로 비교, 없으면 legacy password 필드로 비교
    const storedHash = user.passwordHash || user.password;
    if(!storedHash) {
      console.log('login: no stored hash for user', user.email);
      return res.status(400).json({ msg: 'no password stored for user' });
    }

    const ok = await bcrypt.compare(password, storedHash);
    if(!ok) return res.status(400).json({msg:'wrong password'});

    const token = jwt.sign(
      { id:user._id, role:user.role },
      process.env.JWT_SECRET || 'devsecret',
      { expiresIn:'7d' }
    );
    res.json({ token, role:user.role, favoriteTeam: user.favoriteTeam });
  } catch(e){ 
    console.error('login error', e);
    res.status(500).json({msg:'err', error:e.message});
  }
});

router.get('/ping', (req, res) => res.json({ ok: true, route: '/api/auth/ping' }));

// 보호된 라우트 - 토큰 검사 후 사용자 정보 반환
const authMiddleware = require('../middleware/auth');

router.get('/me', authMiddleware, (req, res) => {
  res.json({ msg: 'protected ok', user: req.user });
});

module.exports = router;


