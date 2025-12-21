// src/models/Order.jsconst mongoose = require('mongoose');
const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },     // 누가
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true }, // 뭘
  productName: { type: String }, // (나중에 상품 삭제돼도 기록 남게 이름도 저장)
  pricePaid: { type: Number, required: true }, // 얼마에 (할인가)
  orderedAt: { type: Date, default: Date.now } // 언제
});

module.exports = mongoose.model('Order', OrderSchema);