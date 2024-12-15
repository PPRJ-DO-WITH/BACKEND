const db = require('../config/db');

module.exports = {
    // 카테고리 목록 확인
    view: async (req, res, next) => {
        const user_id = req.user.id;

        try {
            // 카테고리 목록 조회
            const sqlGetCategories = `
                SELECT categ_id, categ_class, categ_color
                FROM category
                WHERE user_id = ?
            `;
            const [results] = await db.query(sqlGetCategories, [user_id]);

            // 결과 반환
            res.status(200).json({
                message: '카테고리가 성공적으로 조회되었습니다',
                category: results
            });
        } catch (e) {
            next(e);
        }
    },

    // 카테고리 생성
    create: async (req, res, next) => {
        const { categ_class, categ_color } = req.body;
        const user_id = req.user.id;
    
        try {
            // 카테고리 삽입
            const sqlInsertCategory = `
                INSERT INTO category (user_id, categ_class, categ_color)
                VALUES (?, ?, ?)
            `;
            const [results] = await db.query(sqlInsertCategory, [
                user_id,
                categ_class,
                categ_color,
            ]);
    
            res.status(201).json({
                message: '카테고리가 성공적으로 생성되었습니다',
                category: {
                    id: results.insertId,
                },
            });
        } catch (e) {
            next(e);
        }
    },

    // 카테고리 수정
    update: async (req, res, next) => {
        const { categId } = req.params; 
        const { categ_class, categ_color } = req.body; 
        const user_id = req.user.id; 

        try {            
            // 동적으로 업데이트할 필드 생성
            const fieldsToUpdate = [];
            const valuesToUpdate = [];

            if (categ_class) {
                fieldsToUpdate.push('categ_class = ?');
                valuesToUpdate.push(categ_class);
            }

            if (categ_color) {
                fieldsToUpdate.push('categ_color = ?');
                valuesToUpdate.push(categ_color);
            }

            // 사용자 ID와 카테고리 ID를 조건으로 추가
            valuesToUpdate.push(user_id, categId);

            // SQL 업데이트 쿼리
            const updateCategory = `
                UPDATE category
                SET ${fieldsToUpdate.join(', ')}
                WHERE user_id = ? AND categ_id = ?
            `;

            const [results] = await db.query(updateCategory, valuesToUpdate);

            // 결과 확인
            if (results.affectedRows === 0) {
                return res.status(404).json({ message: '카테고리를 찾을 수 없거나 업데이트되지 않았습니다' });
            }

            res.status(200).json({ 
                message: '카테고리가 성공적으로 수정되었습니다',
                category: {
                    id: categId,
                    class: categ_class,
                    color: categ_color,
                }
            });
        } catch (e) {
            next(e); 
        }
    },

    // 카테고리 삭제
    delete: async (req, res, next) => {
        const { categId } = req.params; 
        const user_id = req.user.id; 

        try {
            // 카테고리 삭제 쿼리
            const deleteCategory = `
                DELETE FROM category
                WHERE categ_id = ? AND user_id = ?
            `;

            const [result] = await db.query(deleteCategory, [categId, user_id]);

            // 삭제 확인
            if (result.affectedRows === 0) {
                return res.status(404).json({ message: '카테고리를 찾을 수 없거나 삭제할 권한이 없습니다' });
            }

            res.status(200).json({ message: '카테고리가 성공적으로 삭제되었습니다”' });
        } catch (e) {
            next(e); 
        }
    }

};