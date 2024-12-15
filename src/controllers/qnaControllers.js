const db = require('../config/db');
const sanitizeHtml = require('sanitize-html');

module.exports = {
    getAllQna : async (req, res, next) => {
        const user_id = req.user.id;

        try {
            const [qnas] = await db.query('SELECT * FROM QnA WHERE user_id=?', [user_id]);
            res.status(200).json({
                QnA: qnas,
            });
        } catch (e) {
            next(e);
        }
    },
    getQnaById : async (req, res, next) => {
        const user_id = req.user.id;
        const { qnaId } = req.params;

        try {
            const [qna] = await db.query('SELECT * FROM QnA WHERE qna_id=? AND user_id=?', [qnaId, user_id]);
            if(qna.length === 0) {
                return res.status(404).json({ message: '해당 Q&A가 존재하지 않습니다.' });
            }
            res.status(200).json({
                QnA: qna,
            });
        } catch (e) {
            next(e);
        }
    },
    create : async (req, res, next) => {
        const user_id = req.user.id;
        const { title, content } = req.body;

        try {
            if (!title || !content) {
                return res.status(404).json({ message: "제목 또는 문의 내용이 입력되지 않았습니다." });
            }

            const sntzedTitle = sanitizeHtml(title);
            const sntzedContent = sanitizeHtml(content);

            const [qnas] = await db.query('INSERT INTO QnA (user_id, qna_title, qna_content, created_at) VALUES (?, ?, ?, NOW())', [user_id, sntzedTitle, sntzedContent]);
            res.status(200).json({ 
                message: "성공적으로 작성되었습니다.",
                QnA: {
                    title: title,
                    content: content,
                }
            });
        } catch (e) {
            next(e);
        }
    },
    update : async (req, res, next) => {
        const { qnaId } = req.params;
        const { title, content } = req.body;

        try {
            if (!title || !content) {
                return res.status(404).json({ message: "제목 또는 문의 내용이 입력되지 않았습니다." });
            }

            const sntzedTitle = sanitizeHtml(title);
            const sntzedContent = sanitizeHtml(content);

            const [qna] = await db.query('UPDATE QnA SET qna_title=?, qna_content=? WHERE qna_id=?', [sntzedTitle, sntzedContent, qnaId]);
            if(qna.length === 0) {
                return res.status(404).json({ message: '해당 Q&A가 존재하지 않습니다.' });
            }
            res.status(200).json({ 
                message: "성공적으로 수정되었습니다.", 
                QnA: {
                    title: title,
                    content: content,
                }
            });
        } catch (e) {
            next(e);
        }
    },
    delete : async (req, res, next) => {
        const { qnaId } = req.params;

        try {
            const [result] = await db.query('DELETE FROM QnA WHERE qna_id=?', [qnaId]);
            if(result.length === 0) {
                return res.status(404).json({ message: '해당 Q&A가 존재하지 않습니다.' });
            }
            res.status(200).json({ message: "성공적으로 삭제되었습니다." });
        } catch (e) {
            next(e);
        }
    },
};