// src/models/Product.js
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  sponsorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  description: { type: String }, // ✅ [추가됨] 이게 있어야 설명이 저장됩니다!
  category: { type: String },
  imageUrl: { type: String },
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected'], 
    default: 'pending' 
  }
}, { timestamps: true }); // 생성 시간, 수정 시간 자동 기록

module.exports = mongoose.model('Product', productSchema);
