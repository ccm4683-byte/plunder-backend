// src/routes/teams.js
const express = require('express');
const router = express.Router();
const Team = require('../models/Team');

router.get('/', async (req, res) => {
  try {
    const teams = await Team.find({});
    res.json(teams);
  } catch (err) {
    res.status(500).json({ msg: '팀 목록 불러오기 실패' });
  }
});

// 1. 팀 상태 가져오기 (특정 팀이 몇 연승 중인지 확인)
router.get('/:name', async (req, res) => {
  try {
    // 없으면 새로 만듦 (편의상)
    let team = await Team.findOne({ name: req.params.name });
    if (!team) {
      team = new Team({ name: req.params.name, winStreak: 0 });
      await team.save();
    }
    res.json(team);
  } catch (err) {
    res.status(500).json({ msg: '서버 에러' });
  }
});

// 2. 경기 결과 적용 (핵심 로직)
router.post('/match', async (req, res) => {
  const { name, result } = req.body; // result는 'win' 또는 'lose'

  try {
    let team = await Team.findOne({ name });
    if (!team) {
      team = new Team({ name, winStreak: 0 });
    }

    if (result === 'win') {
      // 1승 추가 (최대 6연승 = 30%까지만)
      if (team.winStreak < 6) {
        team.winStreak += 1;
      }
    } else if (result === 'lose') {
      // 패배 시 즉시 0으로 초기화
      team.winStreak = 0;
    }

    await team.save();
    res.json({ msg: '경기 결과 적용 완료', team });
  } catch (err) {
    res.status(500).json({ msg: '업데이트 실패' });
  }
});

module.exports = router;