/*// src/routes/auth.js
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


*/
// src/routes/auth.js
console.log('✅ Auth Route file loaded');

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// === [비상용] DB 유저 확인 API ===
// 브라우저에서 http://localhost:4000/api/auth/check-users 로 접속해보세요.
router.get('/check-users', async (req, res) => {
  try {
    const users = await User.find({});
    res.json({ count: users.length, users: users });
  } catch (e) {
    res.json({ error: e.message });
  }
});

// === 1. 회원가입 (Register) ===
router.post('/signup', async (req, res) => {
  try {
    console.log("📝 [회원가입 요청]", req.body);

    // 공백 제거(trim)를 적용하여 데이터 받기
    let { email, password, favoriteTeam, team, role } = req.body;
    if (!favoriteTeam && team) {
        favoriteTeam = team;
    }
    email = email ? email.trim() : ''; 

    // 유효성 검사
    if (!email || !password) {
      console.log("❌ 실패: 이메일/비번 누락");
      return res.status(400).json({ msg: 'Email and password required' });
    }

    // 팬인데 응원팀이 없는 경우
    role = role || 'fan'; // 기본값 설정
    if (role === 'fan' && !favoriteTeam) {
      console.log("❌ 실패: 팬은 응원팀 필수");
      return res.status(400).json({ msg: 'Fan requires favoriteTeam' });
    }

    // 중복 검사
    const existing = await User.findOne({ email });
    if (existing) {
      console.log("❌ 실패: 이미 존재하는 이메일 ->", email);
      return res.status(400).json({ msg: 'Email already exists' });
    }

    // 저장
    const hash = await bcrypt.hash(password, 10);
    const user = new User({
      email,
      passwordHash: hash,
      password: hash, // 호환성 유지
      role,
      favoriteTeam
    });

    await user.save();
    console.log("✅ [DB 저장 성공] 유저:", user);
    res.status(201).json({ msg: 'Registered successfully' });

  } catch (e) {
    console.error('❌ Register Error:', e);
    res.status(500).json({ msg: 'Server Error', error: e.message });
  }
});

// === 2. 로그인 (Login) ===
router.post('/login', async (req, res) => {
  try {
    console.log("🔑 [로그인 요청]", req.body);

    let { email, password } = req.body;
    email = email ? email.trim() : ''; // 공백 제거

    if (!email || !password) {
      return res.status(400).json({ msg: 'Email and password required' });
    }

    // 유저 찾기
    const user = await User.findOne({ email });
    if (!user) {
      console.log(`❌ 실패: DB에서 '${email}'을 찾을 수 없음`);
      return res.status(400).json({ msg: 'User not found' });
    }

    // 비밀번호 확인
    const storedHash = user.passwordHash || user.password;
    const isMatch = await bcrypt.compare(password, storedHash);
    
    if (!isMatch) {
      console.log("❌ 실패: 비밀번호 불일치");
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    // 토큰 발급
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || 'devsecret',
      { expiresIn: '7d' }
    );

    console.log("✅ 로그인 성공:", email);
    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        favoriteTeam: user.favoriteTeam
      }
    });

  } catch (e) {
    console.error('❌ Login Error:', e);
    res.status(500).json({ msg: 'Server Error', error: e.message });
  }
});

module.exports = router;