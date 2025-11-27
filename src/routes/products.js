// src/routes/products.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Product = require('../models/Product');

// 스폰서 전용: 상품 등록
router.post('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'sponsor') return res.status(403).json({ msg: 'Only sponsor' });
    const { name, price, category, imageUrl } = req.body;
    const p = new Product({ sponsorId: req.user._id, name, price, category, imageUrl });
    await p.save();
    res.json({ msg: 'created', product: p });
  } catch (e) {
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
