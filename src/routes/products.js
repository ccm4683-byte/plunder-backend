// src/routes/products.js
const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const jwt = require('jsonwebtoken');
const upload = require('../middleware/upload');

// ▼▼▼ 파일 업로드 설정 (Multer) ▼▼▼
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
// ▲▲▲ 설정 끝 ▲▲▲


// 1. 전체 상품 조회 (GET /)
router.get('/', async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ msg: '서버 에러' });
  }
});


// ▼▼▼ [중요] 내 상품 조회 (/mine) - 순서 주의: /:id 보다 위에 있어야 함 ▼▼▼
router.get('/mine', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ msg: '토큰 없음' });
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'devsecret');

    // DB에서 sponsorId가 내 ID인 것만 찾기
    const myProducts = await Product.find({ sponsorId: decoded.id }).sort({ createdAt: -1 });
    
    res.json(myProducts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: '내 상품 불러오기 실패' });
  }
});

// 5. 스폰서 상품별 상세 통계 (GET /stats/products)
router.get('/stats/products', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ msg: '권한 없음' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'devsecret');

    // 로그인한 스폰서의 모든 상품 조회
    // (상품 정보 + 판매량 + 수익)
    // 만약 Order(주문) 모델이 따로 있다면 거기서 집계해야 하지만, 
    // 일단 Product에 판매량(soldCount) 필드가 있거나 단순히 상품 목록을 보는 경우를 구현합니다.
    
    const products = await Product.find({ sponsorId: decoded.id })
                                  .select('name price soldCount imageUrl status tags category createdAt');

    // 결과 가공 (필요하다면 총 매출액 계산 등)
    const stats = products.map(p => ({
        id: p._id,
        name: p.name,
        price: p.price,
        soldCount: p.soldCount || 0, // 판매량 (DB에 필드가 없다면 0)
        revenue: (p.price * (p.soldCount || 0)), // 예상 수익
        status: p.status,
        imageUrl: p.imageUrl
    }));

    res.json({
        count: stats.length,
        data: stats
    });

  } catch (err) {
    console.error("통계 조회 실패:", err);
    res.status(500).json({ msg: '통계 불러오기 실패' });
  }
});
// 2. 특정 상품 조회 (GET /:id)
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ msg: '상품이 없습니다' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ msg: '서버 에러' });
  }
});

// 3. 상품 등록 (POST /)
// [수정] upload.single('image') 제거 -> 그냥 JSON 데이터만 받음
router.post('/', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ msg: '권한 없음' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'devsecret');

    // [변수 통일] imageUrl을 body에서 바로 받습니다.
    const { name, description, price,  imageUrl,tags } = req.body;
    
    const newProduct = new Product({
      name: name, 
      price: price,
      description: description,
      
      // 태그 처리: 문자열이면 배열로 변환, 없으면 빈 배열
      tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map(t=>t.trim())) : [],
      
      // [수정] 파일(req.file) 대신 입력받은 URL 문자열 그대로 저장
      imageUrl: imageUrl || '',
      
      sponsorId: decoded.id, 
      status: 'pending'
    });

    await newProduct.save();
    console.log("✅ 상품 등록 성공:", newProduct.name);
    res.status(201).json(newProduct);

  } catch (err) {
    console.error("❌ 상품 등록 실패:", err);
    res.status(500).json({ msg: '등록 실패' });
  }
});


// 4. 상품 수정 (PUT /:id)
// [핵심 변경] upload.single 제거 -> 파일 업로드 안 함, URL 텍스트만 받음
// 4. 상품 수정 (PUT /:id) - [카테고리 삭제, 태그만 사용]
router.put('/:id', async (req, res) => {
  try {
    // 1. 토큰 확인
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ msg: '로그인 필요' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'devsecret');
    
    // 2. 상품 존재 확인
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ msg: '상품 없음' });

    // 3. 본인 상품인지 확인
    if (product.sponsorId.toString() !== decoded.id) {
      return res.status(403).json({ msg: '본인 상품만 수정 가능합니다' });
    }

    // 4. [핵심 수정] req.body에서 category 제거하고 tags만 받음
    // ★ 에러 원인 해결: 여기서 데이터를 못 받으면 프론트 전송 방식 문제임
    const { name, price, description, imageUrl, tags } = req.body;
    
    // 5. 업데이트 (값이 있는 것만 변경)
    if (name) product.name = name;
    if (price) product.price = price;
    if (description) product.description = description;
    if (imageUrl) product.imageUrl = imageUrl; 

    // 태그 수정 로직 (문자열이면 배열로 변환)
    if (tags) {
        product.tags = Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim());
    }

    // 카테고리는 이제 건드리지 않음 (혹은 DB에서 지우고 싶으면 product.category = undefined; 추가)

    await product.save();
    console.log("✅ 상품 수정 완료:", product.name);
    res.json(product);

  } catch (err) {
    console.error("❌ 수정 에러:", err);
    res.status(500).json({ msg: '수정 실패' });
  }
});


// 5. 상품 삭제 (DELETE /:id)
router.delete('/:id', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ msg: '로그인 필요' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'devsecret');

    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ msg: '상품 없음' });

    if (product.sponsorId.toString() !== decoded.id) {
      return res.status(403).json({ msg: '삭제 권한이 없습니다' });
    }

    await Product.findByIdAndDelete(req.params.id);
    res.json({ msg: '삭제 완료' });
  } catch (err) {
    res.status(500).json({ msg: '삭제 실패' });
  }
});

const Order = require('../models/Order'); // 이 줄은 파일 맨 위로 올려도 됩니다.

router.post('/buy', async (req, res) => {
  try {
    // 1. 토큰 확인
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ msg: '로그인 필요' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'devsecret');

    // 2. 요청 데이터 받기
    const { productId, productName, price } = req.body;

    // 3. 주문 기록 생성
    const newOrder = new Order({
      userId: decoded.id,
      productId,
      productName,
      pricePaid: price
    });

    await newOrder.save();
    
    console.log(`💰 주문 발생! 유저(${decoded.id})가 [${productName}]을 ${price}원에 구매함.`);
    res.json({ msg: '구매 성공', order: newOrder });

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: '구매 처리 중 오류 발생' });
  }
});


const User = require('../models/User'); // User 모델 필요

router.get('/stats/analytics', async (req, res) => {
  try {
    // 1. 내 신분 확인
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ msg: '로그인 필요' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'devsecret');

    // 2. 내가 등록한 상품들의 ID 찾기
    const myProducts = await Product.find({ sponsorId: decoded.id });
    const myProductIds = myProducts.map(p => p._id);

    // 3. 내 상품에 대한 주문 내역 다 가져오기
    // (여기서 .populate('userId')를 쓰면 주문한 사람 정보를 바로 붙여 가져옵니다!)
    const orders = await Order.find({ productId: { $in: myProductIds } })
                              .populate('userId'); 

    // 4. 통계 계산 (자바스크립트로 직접 계산 - 이해하기 쉽게)
    let totalRevenue = 0; // 총 매출
    let genderCount = { male: 0, female: 0 };
    let ageGroups = { '10대': 0, '20대': 0, '30대': 0, '40대이상': 0 };

    orders.forEach(order => {
      totalRevenue += order.pricePaid;
      
      const buyer = order.userId; // populate 덕분에 유저 정보가 들어있음
      if (buyer) {
        // 성별 카운트
        if (buyer.gender === 'male') genderCount.male++;
        else if (buyer.gender === 'female') genderCount.female++;

        // 나이대 카운트
        const age = buyer.age;
        if (age < 20) ageGroups['10대']++;
        else if (age < 30) ageGroups['20대']++;
        else if (age < 40) ageGroups['30대']++;
        else ageGroups['40대이상']++;
      }
    });

    // 5. 결과 전송
    res.json({
      totalOrders: orders.length,
      totalRevenue,
      genderStats: genderCount,
      ageStats: ageGroups
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: '통계 분석 실패' });
  }
});

router.get('/reset-db-dangerous', async (req, res) => {
  try {
    // 1. 상품 다 지우기
    await Product.deleteMany({});
    
    // 2. 유저 다 지우기 (스폰서, 팬 전부)
    await User.deleteMany({});

    res.send("<h1>⚠️ 초기화 완료!</h1><p>모든 상품과 유저 데이터가 삭제되었습니다. 다시 가입하세요.</p>");
  } catch (err) {
    res.status(500).send("초기화 실패: " + err.message);
  }
});

module.exports = router;