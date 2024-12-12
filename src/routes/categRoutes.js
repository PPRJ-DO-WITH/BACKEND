const express = require('express');
const router = express.Router();

const authenticate = require('../middlewares/authMiddlewares')
const categ = require('../controllers/categControllers');


// 카테고리 목록 확인
router.get('/', authenticate.verifyToken, categ.view);

// 카테고리 생성
router.post('/', authenticate.verifyToken, categ.create);

// 카테고리 수정
router.put('/:categId', authenticate.verifyToken, categ.update);

// 카테고리 삭제
router.delete('/:categId', authenticate.verifyToken, categ.delete);

module.exports = router;