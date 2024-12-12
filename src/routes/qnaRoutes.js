const express = require('express');
const router = express.Router();

const authenticate = require('../middlewares/authMiddlewares'); // 사용자 인증 미들웨어
const qna = require('../controllers/qnaControllers'); // 컨트롤러 함수

router.get('/', authenticate.verifyToken, qna.getAllQna);  // 모든 문의사항 조회
router.get('/:qnaId', authenticate.verifyToken, qna.getQnaById); // 특정 문의사항 조회
router.post('/create', authenticate.verifyToken, qna.create); // 문의사항 생성
router.put('/:qnaId', authenticate.verifyToken, qna.update); // 문의사항 수정
router.delete('/:qnaId', authenticate.verifyToken, qna.delete); // 문의사항 삭제

module.exports = router;