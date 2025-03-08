const db = require('../config/db');
const sanitizeHtml = require('sanitize-html');
const jwt = require('jsonwebtoken');

// suggested_todo에 관련된 컬럼은 적지 않았음

module.exports = {
    // todo 생성
    create: async (req, res, next) => {
        const { categ_id, date_from, date_to, todo_title, memo } = req.body;
        const user_id = req.user.id;

        const sanitizedTitle = sanitizeHtml(todo_title);
        const sanitizedMemo = sanitizeHtml(memo);

        try {
            const sql = `
                INSERT INTO todo (user_id, categ_id, date_from, date_to, todo_title, memo)
                VALUES (?, ?, ?, ?, ?, ?)
            `;
            await db.query(sql, [
                user_id,
                categ_id,
                date_from,
                date_to,
                sanitizedTitle,
                sanitizedMemo,
            ]);

            // 성공 응답
            res.status(201).json({
                message: 'todo가 성공적으로 생성되었습니다',
                user: user_id,
                todo: {
                    title: todo_title,
                    category: categ_id,
                    from: date_from,
                    to: date_to,
                }
            });

        } catch (e) {
            next(e); 
        }
    },

    // todo 수정
    update: async (req, res, next) => {
        const { todoId } = req.params;
        const { suggested_id, categ_id, date_from, date_to, todo_title, memo, is_finished } = req.body;
        const user_id = req.user.id;

        const sanitizedTitle = sanitizeHtml(todo_title);
        const sanitizedMemo = sanitizeHtml(memo);

        try {
            const sql = `
                UPDATE todo 
                SET 
                    suggested_id = ?,
                    categ_id = ?, 
                    date_from = ?, 
                    date_to = ?, 
                    todo_title = ?, 
                    memo = ?, 
                    is_finished = ?
                WHERE 
                    user_id = ? AND todo_id = ? 
            `;

            const [result] = await db.query(sql, [
                suggested_id,
                categ_id,
                date_from,
                date_to,
                sanitizedTitle,
                sanitizedMemo,
                is_finished || false,
                user_id,
                todoId
            ]);

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    error: '해당 날짜와 사용자에 대한 todo를 찾을 수 없습니다',
                });
            }

            res.status(200).json({
                message: 'todo가 성공적으로 수정되었습니다',
                user: user_id,
                todo: {
                    id: todoId,
                    title: todo_title,
                    category: categ_id,
                    from: date_from,
                    to: date_to,
                }
            });
        } catch (e) {
            next(e);
        }
    },

    // todo 삭제
    delete: async (req, res, next) => {
        const { todoId } = req.params;
        const user_id = req.user.id; 

        try {
            const sql = `
                DELETE FROM todo 
                WHERE todo_id = ? AND user_id = ?
            `;
            const [result] = await db.query(sql, [todoId, user_id]);

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    error: 'todo를 찾을 수 없거나 삭제할 권한이 없습니다',
                });
            }

            res.status(200).json({
                message: 'todo가 성공적으로 삭제되었습니다',
            });
        } catch (e) {
            next(e);
        }
    },

    // 월별 todo 조회
    viewByMonth: async (req, res, next) => {
        const { year, month } = req.params;
        const user_id = req.user.id;
    
        // 날짜를 YYYY-MM-DD 형식으로 변환하는 함수
        const formatDate = (date) => {
            const d = new Date(date);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };
    
        // 특정 날짜 범위 내의 모든 날짜 배열 생성
        const getDatesInRange = (startDate, endDate) => {
            const dates = [];
            let currentDate = new Date(startDate);
            const lastDate = new Date(endDate);
    
            while (currentDate <= lastDate) {
                dates.push(formatDate(currentDate));
                currentDate.setDate(currentDate.getDate() + 1); // 다음 날로 이동
            }
            return dates;
        };
    
        try {
            const sql = `
                SELECT 
                    date_from,
                    date_to,
                    todo_title,
                    categ_id
                FROM todo
                WHERE 
                    user_id = ?
                    AND (
                        (YEAR(date_from) = ? AND MONTH(date_from) = ?) OR
                        (YEAR(date_to) = ? AND MONTH(date_to) = ?) OR
                        (YEAR(date_from) <= ? AND YEAR(date_to) >= ? AND MONTH(date_from) <= ? AND MONTH(date_to) >= ?)
                    )
            `;
    
            const [results] = await db.query(sql, [
                user_id, year, month,
                year, month,
                year, year, month, month,
            ]);
    
            // 결과를 날짜별로 그룹화
            const groupedResults = results.reduce((acc, item) => {
                const startDate = new Date(item.date_from);
                const endDate = new Date(item.date_to);
    
                // 일정의 날짜 범위 가져오기
                const dateRange = getDatesInRange(startDate, endDate);
    
                // 날짜별로 일정 추가
                dateRange.forEach((date) => {
                    if (!acc[date]) {
                        acc[date] = [];
                    }
                    acc[date].push({
                        title: item.todo_title,
                        categ_id: item.categ_id,
                        date_from: item.date_from,
                        date_to: item.date_to,
                    });
                });
    
                return acc;
            }, {});
    
            res.status(200).json({
                todo: groupedResults,
            });
        } catch (e) {
            next(e);
        }
    },

    // 주별 todo 조회
    viewByWeek: async (req, res, next) => {
        const { date } = req.params;
        const user_id = req.user.id;
    
        try {
            const sql = `
                SELECT 
                    categ_id, 
                    date_from, 
                    date_to, 
                    todo_title,
                    memo,
                    is_finished
                FROM todo 
                WHERE 
                    user_id = ? 
                    AND (
                        DATE(date_from) <= DATE(?) 
                        AND DATE(date_to) >= DATE(?)
                    )
            `;
    
            const [results] = await db.query(sql, [user_id, date, date]);
    
            // 날짜 형식 변환
            results.forEach(result => {
                result.date_from = result.date_from.toISOString().replace('T', ' ').substring(0, 19);
                result.date_to = result.date_to.toISOString().replace('T', ' ').substring(0, 19);
            });
    
            res.status(200).json({
                todo: results,
            });
        } catch (e) {
            next(e);
        }
    },
};