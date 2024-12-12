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

// JWT 토큰 검증 미들웨어 (쿠키 사용)
const verifyTokenCookie = (req, res, next) => {
    const token = req.cookies.token; // 쿠키에서 토큰 추출
    if (!token) {
        return res.status(401).render('login', { message: '로그인이 필요합니다.' }); // 로그인 페이지로 리다이렉트
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // JWT에서 사용자 정보 추출
        next(); // 다음 미들웨어로 전달
    } catch (error) {
        return res.status(403).render('login', { message: '유효하지 않은 토큰입니다. 다시 로그인해주세요.' }); // 로그인 페이지로 리다이렉트
    }
};

module.exports = { verifyToken, verifyTokenCookie };