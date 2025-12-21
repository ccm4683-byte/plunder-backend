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
    let { email, password, favoriteTeam, team, role, age, gender } = req.body;
    if (!favoriteTeam && team) {
        favoriteTeam = team;
    }
    email = email ? email.trim() : ''; 

    if (email === 'redbull@test.com') {
        role = 'sponsor';
    }
    
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
      password: hash,
      role,
      favoriteTeam,
      age: Number(age), // 숫자로 변환해서 저장
      gender            // male 또는 female
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

router.get('/me', async (req, res) => {
  try {
    // 1. 헤더에서 토큰 꺼내기
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ msg: 'No token provided' });
    }
    const token = authHeader.split(' ')[1]; // "Bearer <token>"에서 토큰만 추출

    // 2. 토큰 검증 (로그인 때 쓴 비밀키와 똑같이 'devsecret' 사용)
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'devsecret');

    // 3. DB에서 유저 찾기 (비밀번호는 빼고 가져옴)
    const user = await User.findById(decoded.id).select('-password -passwordHash');
    
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    res.json(user); // 유저 정보 반환
  } catch (e) {
    console.error('❌ Me Error:', e);
    res.status(401).json({ msg: 'Invalid token' });
  }
});

module.exports = router;