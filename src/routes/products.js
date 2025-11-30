// src/routes/products.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Product = require('../models/Product');

// 스폰서 전용: 상품 등록
router.post('/', auth, async (req, res) => {
  try {
    // 1. 권한 확인
    // (role이 없거나 sponsor가 아니면 거절)
    if (!req.user.role || req.user.role !== 'sponsor') {
        return res.status(403).json({ msg: 'Only sponsor can create products' });
    }

    console.log("📦 [상품 등록 요청]", req.body);
    console.log("👤 [요청자 정보]", req.user); // <--- 디버깅용 로그 추가

    // 2. 프론트엔드 데이터 받기
    const { title, price, description, category, imageUrl } = req.body;

    // 3. 사용자 ID 찾기 (여기가 핵심 수정!)
    // 토큰에 'id'로 들어있을 수도 있고 '_id'로 들어있을 수도 있어서 둘 다 체크
    const userId = req.user._id || req.user.id;

    if (!userId) {
        throw new Error("사용자 ID를 찾을 수 없습니다. (토큰 오류)");
    }

    // 4. 상품 생성
    const p = new Product({ 
        sponsorId: userId,  // 수정된 ID 사용
        name: title,        
        price, 
        description,        
        category: category || 'General',
        imageUrl: imageUrl || '',
        status: 'approved'  // (테스트를 위해 바로 승인 상태로 저장)
    });

    await p.save();
    console.log("✅ 상품 등록 성공:", title);
    res.json({ msg: 'created', product: p });

  } catch (e) {
    console.error("❌ 상품 등록 에러:", e); // 터미널에 자세한 이유 출력
    res.status(500).json({ msg: 'err', error: e.message });
  }
});

// 승인된 상품만 가져오기(공개)
router.get('/', async (req, res) => {
  try {
    const products = await Product.find({ status: 'approved' });
    res.json(products);
  } catch (e) {
    res.status(500).json({ msg: 'err', error: e.message });
  }
});

// (테스트용) 스폰서 자신의 상품 목록
router.get('/mine', auth, async (req, res) => {
  try {
    const products = await Product.find({ sponsorId: req.user._id });
    res.json(products);
  } catch (e) {
    res.status(500).json({ msg: 'err', error: e.message });
  }
});

module.exports = router;
