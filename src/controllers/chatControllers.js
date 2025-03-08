const db = require('../config/db');
const openai = require('../utils/openai');
const sanitizeHtml = require('sanitize-html');

module.exports = {
    getAllChat : async (req, res, next) => {
        try {
            const [chats] = await db.query('SELECT * FROM chat');
            res.status(200).json({ chat: chats });
        } catch (e) {
            next(e);
        }
    },
    getChatById : async (req, res, next) => {
        const { chatId } = req.params;

        try {
            const [chat] = await db.query('SELECT * FROM chat WHERE chat_id=?', [chatId]);
            if(chat.length === 0) {
                return res.status(404).json({ message: '해당 채팅이 존재하지 않습니다.' });
            }
            res.status(200).json({ chat: chat });
        } catch (e) { 
            next(e);
        }
    },
    newChat : async (req, res, next) => {
        const user_id = req.user.id;
        
        try {
            const [chat] = await db.query('INSERT INTO chat (user_id) VALUES (?)', [user_id]);
            res.status(200).json({ 
                message: "새로운 채팅을 시작합니다.",
                chat: chat,
            });
        } catch (e) {
            next(e);
        }
    },
    updateTitle : async (req, res, next) => {
        const { chatId } = req.params;
        const { title } = req.body;

        try {
            if(!title) {
                return res.status(404).json({ message: "제목이 작성되지 않았습니다." });
            }

            const sntzedTitle = sanitizeHtml(title);

            const [chat] = await db.query('UPDATE chat SET chat_title=? WHERE chat_id=?', [sntzedTitle, chatId]);
            if(chat.length === 0) {
                return res.status(404).json({ message: '해당 채팅이 존재하지 않습니다.'});
            }
            res.status(200).json({ 
                message: "성공적으로 수정되었습니다.",
                chat: {
                    id: chatId,
                    title: title,
                }
            });
        } catch (e) {
            next(e);
        }
    },
    deleteChat : async (req, res, next) => {
        const { chatId } = req.params;

        try {
            const [result] = await db.query('DELETE FROM chat WHERE chat_id=?', [chatId]);
            if(result.length === 0) {
                return res.status(404).json({ message: '해당 채팅이 존재하지 않습니다.' });
            }
            res.status(200).json({ message: "성공적으로 삭제되었습니다." });
        } catch (e) {
            next(e);
        }
    },

    addMessage : async (req, res, next) => {
        const user_id = req.user.id;
        const { chatId } = req.params;
        const { content } = req.body;

        try {
            if(!content) {
                return res.status(400).json({ message: "메시지가 작성되지 않았습니다." });
            }

            const sntzedContent = sanitizeHtml(content);

            /* 일정 관리와 관련 없는 내용 요청 시 */
            if(!openai.isKeyword(sntzedContent)) {
                console.log("일정 관련X: ", sntzedContent);
                return res.status(200).json({ message: "저는 일정 관리를 담당하는 챗봇입니다. 일정에 대해 말씀해주시면 효율적으로 관리해드릴게요!" });
            }

            /* 해당 채팅 아이디 존재 여부 */
            const [chat] = await db.query('SELECT * FROM chat WHERE chat_id=?', [chatId]); 
            if(chat.length === 0) {
                return res.status(404).json({ message: '해당 채팅이 존재하지 않습니다.' });
            }

            /* 사용자 입력 메시지 DB에 INSERT */
            var chatMessage = sntzedContent;
            const [userContent] = await db.query('INSERT INTO message (chat_id, content, sender) VALUES (?, ?, ?)', [chatId, chatMessage, user_id]);

            /* GPT API 응답 받아온 후 DB에 INSERT */
            const gptResponse = await openai.getGPTResponse(chatId, sntzedContent);
            if(!gptResponse) {
                return res.status(500).json({ message: "죄송합니다. 현재 응답을 처리할 수 없습니다." });
            }
            chatMessage = gptResponse;
            console.log("\nGPT: ", chatMessage);

            const [gptContent] = await db.query('INSERT INTO message (chat_id, content, sender) VALUES (?, ?, ?)', [chatId, chatMessage, 'chatbot']);

            if(!gptContent) {
                return res.status(500).json({ message: "일정 삽입이 불가합니다." });
            }

            const msgId = gptContent.insertId;
            await openai.parseTodoData(msgId);
            res.status(200).json({
                message: "해당 요청에 대해 답변 드렸습니다.",
                chat_message: {
                  user_message: userContent,
                  gpt_message: {
                    id: gptContent.insertId,
                    text: chatMessage, // GPT 응답 텍스트를 반환
                  },
                },
              });
        } catch (e) {
            next(e);
        }
    },
    acceptSuggestedTodo : async (req, res, next) => {
        const user_id = req.user.id;
        const { messageId } = req.params;
        const connection = await db.getConnection();

        try {
            // 데이터 무결성을 보장하기 위해 트랜잭션 시작
            await connection.beginTransaction();

            // 1. suggested_todo 테이블에서 데이터 가져오기
            const [suggestedTodo] = await db.query('SELECT * FROM suggested_todo WHERE message_id=?', [messageId]);
            if(suggestedTodo.length === 0) {
                return res.status(404).json({ message: '해당 추천 일정이 존재하지 않습니다.' });
            } else {
                for(const isAcceptedCheck of suggestedTodo) {
                    if(isAcceptedCheck.is_accepted === 1) {
                        return res.status(404).json({ message: '이미 일정을 추가하셨습니다.' });
                    }
                }
            }

            // 2. todo 테이블에 데이터 삽입
            for(const list of suggestedTodo) {
                await connection.query("INSERT INTO todo (suggested_id, user_id, date_from, date_to, todo_title) VALUES (?, ?, ?, ?, ?)",
                                        [list.suggested_id, user_id, list.suggested_date_from, list.suggested_date_to, list.suggested_title]);
            }

            // 3. suggested_todo 테이블 - is_accepted 값 업데이트
            const [results] = await connection.query("UPDATE suggested_todo SET is_accepted=1 WHERE message_id=?", [messageId]);

            // 트랜잭션 커밋
            await connection.commit();
            res.status(200).json({ 
                message: "성공적으로 수행되었습니다.",
                accepted_todo: results,
            });
        } catch (e) {
            await connection.rollback(); // 에러 발생 시 트랜잭션 롤백
            next(e);
        } finally {
            connection.release(); // 연결 해제
        }
    },
    deleteSuggestedTodo : async (req, res, next) => {
        const { messageId } = req.params;
        const connection = await db.getConnection();

        try {
            // 데이터 무결성을 보장하기 위해 트랜잭션 시작
            await connection.beginTransaction();

            // 1. suggested_todo, todo 테이블 join
            const [todoLists] = await db.query('SELECT t.suggested_id FROM suggested_todo s INNER JOIN todo t ON (s.suggested_id = t.suggested_id);', [messageId]);
            if(todoLists === 0) {
                return res.status(404).json({ message: '해당 일정이 존재하지 않습니다.' });
            }

            // 2. todo에서 데이터 삭제
            for(const list of todoLists) {
                await connection.query("DELETE FROM todo WHERE suggested_id=?", [list.suggested_id]);
            }

            // 3. suggested_todo 테이블 - is_accepted 값 업데이트
            await connection.query("UPDATE suggested_todo SET is_accepted=0 WHERE message_id=?", [messageId]);

            // 트랜잭션 커밋
            await connection.commit();
            res.status(200).json({ message: "성공적으로 수행되었습니다." });
        } catch (e) {
            await connection.rollback(); // 에러 발생 시 트랜잭션 롤백
            next(e);
        } finally {
            connection.release(); // 연결 해제
        }
    },
};