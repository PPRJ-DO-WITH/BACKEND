const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');

const userRoutes = require('./routes/userRoutes');
const todoRoutes = require('./routes/todoRoutes');
const categRoutes = require('./routes/categRoutes');
const chatRoutes = require('./routes/chatRoutes');
const qnaRoutes = require('./routes/qnaRoutes');

/* 미들웨어 설정 */
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }))

/* 라우트 연결 */
app.use('/user', userRoutes);
app.use('/todo', todoRoutes);
app.use('/categ', categRoutes);
app.use('/chat', chatRoutes);
app.use('/qna', qnaRoutes);

module.exports = app;