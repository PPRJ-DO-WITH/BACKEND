const express = require('express');
const router = express.Router();

const authenticate = require('../middlewares/authMiddlewares')
const user = require('../controllers/userControllers');

// 로그인
router.post('/login', user.login);

// 로그아웃 
router.get('/logout', authenticate.verifyToken, user.logout);

// 회원가입
router.post('/register', user.register);

// 사용자 ID 검색
router.post('/search/id', user.searchId);

// 사용자 비밀번호 찾기
router.post('/search/password', user.searchPassword);

// 프로필 수정
router.put('/profile/update', authenticate.verifyToken, user.profileUpdate);

// 회원 탈퇴
router.delete('/profile/delete', authenticate.verifyToken, user.profileDelete);

// 캘린더 제목 수정
router.put('/calendar/title', authenticate.verifyToken, user.calendarTitle);

// 캘린더 이모지 수정
router.put('/calendar/emoji', authenticate.verifyToken, user.calendarEmoji);

module.exports = router;