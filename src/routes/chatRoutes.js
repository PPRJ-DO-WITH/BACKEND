const express = require('express');
const router = express.Router();

const authenticate = require('../middlewares/authMiddlewares'); // 사용자 인증 미들웨어
const chat = require('../controllers/chatControllers'); // 컨트롤러 함수

router.post('/', authenticate.verifyToken, chat.newChat); // 새로운 채팅 시작
router.get('/all', authenticate.verifyToken, chat.getAllChat);  // 지난 채팅 목록 조회
router.get('/:chatId', authenticate.verifyToken, chat.getChatById);  // 채팅 조회
router.put('/:chatId/title', authenticate.verifyToken, chat.updateTitle); // 채팅 제목 변경
router.delete('/:chatId', authenticate.verifyToken, chat.deleteChat); // 채팅 삭제

router.post('/:chatId/message', authenticate.verifyToken, chat.addMessage); // 메시지 추가

router.post('/suggest/:messageId', authenticate.verifyToken, chat.acceptSuggestedTodo); // 추천 일정 체크
router.delete('/suggest/:messageId', authenticate.verifyToken, chat.deleteSuggestedTodo); // 추천 일정 체크 해지


module.exports = router;