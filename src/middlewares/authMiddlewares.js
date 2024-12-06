const jwt = require('jsonwebtoken');

// JWT 토큰 검증 미들웨어
const verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // 토큰에서 사용자 정보 추출
        next(); // 다음 미들웨어로 전달
    } catch (error) {
        return res.status(403).json({ message: 'Forbidden' });
    }
};

// 관리자 권한 확인 미들웨어
const isAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied' });
    }
    next();
};

module.exports = { verifyToken, isAdmin };