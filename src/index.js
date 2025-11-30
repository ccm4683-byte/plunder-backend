//src/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const morgan = require('morgan');

const app = express();

// CORS 설정
app.use(cors({
  origin: 'http://localhost:5173',
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

// ❌ [삭제됨] 범인 코드: app.post('/api/auth/signup' ... ) 삭제함!

// 기본 테스트 경로
app.get('/', (req, res) => res.send('Plunder backend running'));

// ✅ 진짜 라우터 연결 (이제 요청이 여기로 잘 들어갑니다)
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);

// 서버 시작
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server listening on ${PORT}`));