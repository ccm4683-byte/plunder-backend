// src/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const morgan = require('morgan');

// ▼▼▼ [모델들은 맨 위에서 불러와야 합니다] ▼▼▼
const User = require('./models/User');
const Product = require('./models/Product');
const Order = require('./models/Order');

const app = express();

// CORS 설정
app.use(cors({
  origin: ['http://localhost:5173',
  'http://localhost:4000', // 로컬 테스트용
  'https://plunder-frontend-vj9v-56kgfpcq8-ccm4683s-projects.vercel.app'
  ],
  credentials: true,
}));

// 로그 설정
app.use(morgan('dev'));
app.use(express.json());

// DB 연결
connectDB();

// 라우트 파일 불러오기
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const teamRoutes = require('./routes/teams');

// 기본 테스트 경로
app.get('/', (req, res) => res.send('Plunder backend running'));

// ▼▼▼ [초기화 API] app.listen 보다 위에 있어야 합니다! ▼▼▼
app.get('/api/reset', async (req, res) => {
  try {
    await User.deleteMany({});
    await Product.deleteMany({});
    await Order.deleteMany({});
    res.send('💥 DB가 깔끔하게 초기화되었습니다! (새로고침해서 회원가입부터 다시 하세요)');
  } catch (err) {
    res.status(500).send('초기화 실패: ' + err.message);
  }
});

app.use(express.urlencoded({ extended: true }));
// 라우터 연결
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/teams', teamRoutes);

// 서버 시작 (이게 항상 파일의 맨 끝이어야 합니다)
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server listening on ${PORT}`));