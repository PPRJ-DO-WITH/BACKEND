const express = require('express');
const router = express.Router();

const authenticate = require('../middlewares/authMiddlewares'); // 사용자 인증 미들웨어
const admin = require('../controllers/adminControllers'); // 컨트롤러 함수

/* 로그인 & 로그아웃 */
router.get('/login', admin.login); 
router.get('/logout', authenticate.verifyTokenCookie, admin.logout); 
router.post('/login', admin.loginProcess); 

/* 메인 페이지 */
router.get('/', authenticate.verifyTokenCookie, admin.mainView);

/* 회원 관리 */
router.get('/user', authenticate.verifyTokenCookie, admin.userView);
router.get('/user/create', authenticate.verifyTokenCookie, admin.userCreate);
router.post('/user/create', authenticate.verifyTokenCookie, admin.userCreateProcess);
router.get('/user/:userId', authenticate.verifyTokenCookie, admin.userUpdate);
router.post('/user/update', authenticate.verifyTokenCookie, admin.userUpdateProcess); 
router.get('/user/delete/:userId', authenticate.verifyTokenCookie, admin.userDeleteProcess); 

/* 문의사항 관리 */
router.get('/qna', authenticate.verifyTokenCookie, admin.qnaView);
router.get('/qna/:qnaId', authenticate.verifyTokenCookie, admin.qnaReply);
router.post('/qna/reply', authenticate.verifyTokenCookie, admin.replyProcess); 

module.exports = router;