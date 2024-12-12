const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
const cookieParser = require('cookie-parser');

/* 관리자 view 설정 */
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

const userRoutes = require('./routes/userRoutes');
const todoRoutes = require('./routes/todoRoutes');
const categRoutes = require('./routes/categRoutes');
const chatRoutes = require('./routes/chatRoutes');
const qnaRoutes = require('./routes/qnaRoutes');
const adminRoutes = require('./routes/adminRoutes');

/* 미들웨어 설정 */
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));
app.use(cookieParser());

/* 라우트 연결 */
app.use('/user', userRoutes);
app.use('/todo', todoRoutes);
app.use('/categ', categRoutes);
app.use('/chat', chatRoutes);
app.use('/qna', qnaRoutes);
app.use('/admin', adminRoutes);

module.exports = app;