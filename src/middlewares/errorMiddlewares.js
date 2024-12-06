// 에러 처리 미들웨어
const errorHandler = (err, req, res, next) => {
    console.error(err.stack); // 에러 로그 출력

    const statusCode = err.status || 500; // 기본 상태 코드는 500
    res.status(statusCode).json({
        message: err.message || 'Internal Server Error',
        stack: process.env.NODE_ENV === 'production' ? null : err.stack, // 개발 환경에서만 스택 표시
    });
};

// 404 에러 처리
const notFoundHandler = (req, res, next) => {
    res.status(404).json({ message: 'Not Found' });
};

module.exports = { errorHandler, notFoundHandler };