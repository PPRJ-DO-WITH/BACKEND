const db = require('../config/db');
const util = require('../utils/util');
const sanitizeHtml = require('sanitize-html');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

module.exports = {
    /* 로그인 & 로그아웃 */
    login : async (req, res, next) => {
        res.render('login', (err, html) => res.end(html));
    },
    loginProcess : async (req, res, next) => {
        const { user_id, password } = req.body;

        const sanitizedUserId = sanitizeHtml(user_id);
        const sanitizedPassword = sanitizeHtml(password);

        try {
            const [results] = await db.query("SELECT * FROM user WHERE user_id=?", [sanitizedUserId]);

            if (results.length === 0) {
                return res.render('login', { message: '아이디 또는 비밀번호가 잘못되었습니다.' });
            }

            const user = results[0];

            if (user.class !== 'admin') {
                return res.render('login', { message: '관리자만 접근 가능합니다.' });
            }

            const isPasswordValid = await bcrypt.compare(sanitizedPassword, user.password);
            if (!isPasswordValid) {
                return res.render('login', { message: '아이디 또는 비밀번호가 잘못되었습니다.' });
            }

            const token = jwt.sign(
                { id: user.user_id, class: user.class },
                process.env.JWT_SECRET,
                { expiresIn: '1h' }
            );

            res.cookie('token', token, { httpOnly: true, secure: false });
            res.redirect('/admin');
        } catch (e) {
            next(e);
        }
    },
    logout : async (req, res, next) => {
        res.clearCookie('token');
        res.redirect('/admin/login');
    },

    mainView : async (req, res, next) => {
        try {
            util.isAdmin(req, res);
            const [userCounts] = await db.query("SELECT COUNT(user_id) AS count FROM user WHERE class='user'");
            const [qnaCounts] = await db.query("SELECT COUNT(*)-COUNT(qna_comment) AS non_replied FROM qna");
            const context = {
                body : 'mainPage.ejs',
                non_replied : qnaCounts[0].non_replied,
                count : userCounts[0].count,
            };
            res.render('layout', context, (err, html) => res.end(html));
        } catch (e) {
            next(e);
        }
    },

    // /* 회원 관리 */
    userView : async (req, res, next) => {
        try {
            const [results] = await db.query("SELECT * FROM user WHERE class='user'");
            const births = results.map(user => util.birthDate(user.birth));
            const context = {
                body : 'user.ejs',
                users : results,
                births : births,
            };
            res.render('layout', context, (err, html) => res.end(html));
        } catch (e) {
            next(e);
        }
    },
    userUpdate : async (req, res, next) => {
        const { userId } = req.params;

        try {
            const [result] = await db.query('SELECT * FROM user WHERE user_id=?', [userId]);
            if (result.length === 0) {
                return res.status(404).send('회원 정보를 찾을 수 없습니다.');
            }
            const context = {
                body: 'userUpdate.ejs',
                user: result[0],
            }
            res.render('layout', context, (err, html) => res.end(html));
        } catch (e) {
            next(e);
        }
    },
    updateProcess : async (req, res, next) => {
        const { user_id, name, email, birth, class: userClass, title, emoji } = req.body;

        try {
            const [result] = await db.query("UPDATE user SET name=?, email=?, birth=?, class=?, title=?, emoji=? WHERE user_id=?",
                                            [name, email, birth, userClass, title, emoji, user_id]);
            if (result.affectedRows === 0) {
                return res.status(404).send('회원 정보를 수정할 수 없습니다.');
            }
            res.redirect('/admin/user');
        } catch (e) {
            next(e);
        }
    },
    deleteProcess : async (req, res, next) => {
        const { userId } = req.params;

        try {
            const [result] = await db.query('DELETE FROM user WHERE user_id=?', [userId]);
            if (result.affectedRows === 0) {
                return res.status(404).send('회원을 찾을 수 없습니다.');
            }
            res.redirect('/admin/user');
        } catch (e) {
            next(e);
        }
    },

    /* 문의사항 관리 */
    qnaView : async (req, res, next) => {
        try {
            util.isAdmin(req, res);
            const [qnas] = await db.query("SELECT q.*, u.name AS user_name FROM qna q INNER JOIN user u ON (q.user_id = u.user_id) ORDER BY created_at DESC");
            const context = {
                body : 'qna.ejs',
                qnas : qnas,
            };
            res.render('layout', context, (err, html) => res.end(html));
        } catch (e) {
            next(e);
        }
    },
    qnaReply : async (req, res, next) => {
        const { qnaId } = req.params;

        try {
            util.isAdmin(req, res);
            const [qna] = await db.query("SELECT * FROM qna WHERE qna_id=?", [qnaId]);
            const createdAt = util.dateOfEightDigit(qna[0].created_at);
            var repliedAt = '';
            if(qna[0].replied_at) {
                repliedAt = util.dateOfEightDigit(qna[0].replied_at);
            }
            const context = {
                body : 'qnaUpdate.ejs',
                qna : qna,
                createdAt : createdAt,
                repliedAt : repliedAt,
            }
            res.render('layout', context, (err, html) => res.end(html));
        } catch (e) {
            next(e);
        }
    },
    replyProcess : async (req, res, next) => {
        try {
            util.isAdmin(req, res);
            const { qna_id, reply } = req.body;
            const sntzedQnaId = sanitizeHtml(qna_id);
            const sntzedReply = sanitizeHtml(reply);

            db.query("UPDATE qna SET qna_comment=?, replied_at=NOW() WHERE qna_id=?", [sntzedReply, sntzedQnaId]);
            res.redirect('/admin/qna');
        } catch (e) {
            next(e);
        }
    },
}