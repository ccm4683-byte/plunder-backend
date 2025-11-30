//src/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const morgan = require('morgan');   // 🔥 추가

const app = express();

// 🔥 CORS — 개발환경에서는 origin 명시 + credentials 사용
app.use(cors({
  origin: 'http://localhost:5173',  // 프론트 Vite dev 서버 주소
  credentials: true,
}));

// 요청 로그 찍기
app.use(morgan('dev'));   // 🔥 추가

app.use(express.json());
connectDB();

// 라우트
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
app.post('/api/auth/signup', (req, res) => res.status(201).json({ ok: true, from: 'index-test' }));


// 테스트용 루트 엔드포인트
app.get('/', (req, res) => res.send('Plunder backend running'));

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);

// 서버 시작
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
