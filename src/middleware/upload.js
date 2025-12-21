//src/middleware/upload.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// uploads 폴더가 없으면 자동으로 생성하는 안전장치
try {
  fs.readdirSync('uploads');
} catch (error) {
  console.error('uploads 폴더가 없어 생성합니다.');
  fs.mkdirSync('uploads');
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // 루트 경로의 uploads 폴더에 저장
  },
  filename: (req, file, cb) => {
    // 파일명 중복 방지를 위해 "현재시간 + 확장자"로 저장
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + ext);
  }
});

const upload = multer({ storage: storage });

module.exports = upload;