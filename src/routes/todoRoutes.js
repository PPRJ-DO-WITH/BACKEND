const express = require('express');
const router = express.Router();

const authenticate = require('../middlewares/authMiddlewares')
const todo = require('../controllers/todoControllers');

// todo 생성
router.post('/', authenticate.verifyToken, todo.create);

// todo 수정
router.put('/:todoId', authenticate.verifyToken, todo.update);

// todo 삭제
router.delete('/:todoId', authenticate.verifyToken, todo.delete);

// 월별 todo 조회
router.get('/:year/:month', authenticate.verifyToken, todo.viewByMonth);

// 주별 todo 조회
router.get('/:date', authenticate.verifyToken, todo.viewByWeek);


module.exports = router;