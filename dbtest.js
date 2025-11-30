// dbTest.js (새로 만드세요)
const mongoose = require('mongoose');

// 사용자님의 .env 내용을 여기에 직접 넣어서 테스트합니다.
const MONGO_URI = "mongodb+srv://ccm4683_db_user:pdY5ZcK0QJN0WcJN@cluster0.cq14pcn.mongodb.net/plunder?retryWrites=true&w=majority&appName=Cluster0";

async function testConnection() {
  try {
    console.log("⏳ 몽고DB 아틀라스 접속 시도 중...");
    await mongoose.connect(MONGO_URI);
    console.log("✅ 접속 성공!");

    // 1. 임시 데이터 저장해보기
    const TestSchema = new mongoose.Schema({ name: String });
    const TestModel = mongoose.model('TestUser', TestSchema);
    
    console.log("📝 데이터 저장 시도 중...");
    const newUser = new TestModel({ name: "테스트맨" });
    const savedUser = await newUser.save();
    console.log("✅ 저장 완료:", savedUser);

    // 2. 방금 저장한거 찾아보기
    console.log("🔍 데이터 검색 시도 중...");
    const foundUser = await TestModel.findOne({ _id: savedUser._id });
    
    if (foundUser) {
        console.log("🎉 완벽합니다! DB 읽기/쓰기 모두 정상입니다.");
        console.log("찾은 데이터:", foundUser);
    } else {
        console.log("❌ 저장된 줄 알았는데 못 찾았습니다. (매우 이상함)");
    }

  } catch (err) {
    console.error("💥 에러 발생! 원인은 아래와 같습니다:");
    console.error(err);
  } finally {
    await mongoose.connection.close();
  }
}

testConnection();