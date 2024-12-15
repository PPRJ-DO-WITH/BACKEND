const db = require('../config/db');
const sanitizeHtml = require('sanitize-html');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

module.exports = {
    // 로그인 처리
    login: async (req, res, next) => {
        const { user_id, password } = req.body;

        const sntzedUserId = sanitizeHtml(user_id);
        const sntzedPassword = sanitizeHtml(password);

        try {
            const [results] = await db.query('SELECT * FROM user WHERE user_id = ?', [sntzedUserId]);

            // 사용자 존재 여부 확인
            if (results.length === 0) {
                return res.status(404).json({ message: '사용자를 찾을 수 없습니다' });
            }

            const user = results[0];

            // 비밀번호 검증
            const isPasswordValid = await bcrypt.compare(sntzedPassword, user.password);
            if (!isPasswordValid) {
                return res.status(401).json({ message: '올바르지 않은 인증 정보입니다' });
            }

            // JWT 생성
            const token = jwt.sign(
                { id: user.user_id, class: user.class },
                process.env.JWT_SECRET,
                { expiresIn: '1h' }
            );

            return res.status(200).json({ 
                message: '로그인에 성공했습니다', 
                token,
                user: { 
                    id: user.user_id, 
                }
            });

        } catch (e) {
            next(e);
        }
    },

    // 로그아웃 처리
    logout: (req, res) => {
        // 클라이언트가 Authorization 헤더에서 JWT를 제공했는지 확인
        const token = req.headers.authorization?.split(' ')[1];
    
        if (!token) {
            return res.status(400).json({ message: '토큰이 제공되지 않았습니다' });
        }
    
        try {
            // 토큰 검증
            const data = jwt.verify(token, process.env.JWT_SECRET);
    
            // 로그아웃 처리: 이 경우 클라이언트에서 토큰을 삭제하도록 요청
            return res.status(200).json({
                message: '로그아웃에 성공했습니다',
                user: data, // 선택: 로그아웃된 사용자 정보 반환
            });
        } catch (error) {
            // 토큰이 유효하지 않거나 만료된 경우
            return res.status(403).json({ message: '유효하지 않거나 만료된 토큰입니다' });
        }
    },

    // 회원가입 처리
    register: async (req, res, next) => {
        const { user_id, password, name, email, birth } = req.body;
        // const emoji = '\u{1F60A}';  // 기본 emoji
        const emoji = '😊';  // 기본 emoji

        try {
            const sanitizedUserId = sanitizeHtml(user_id);
            const sanitizedPassword = sanitizeHtml(password);
            const sanitizedName = sanitizeHtml(name);
            const title = `${sanitizedName}의 캘린더`;  // 기본 title
            const sanitizedEmail = sanitizeHtml(email);
            const sanitizedBirth = sanitizeHtml(birth);

            // 비밀번호 암호화
            const hashedPassword = await bcrypt.hash(sanitizedPassword, 10);

            await db.query("INSERT INTO user (user_id, password, name, email, birth, class, title, emoji) VALUES (?, ?, ?, ?, ?, 'user', ?, ?)", 
                            [sanitizedUserId, hashedPassword, sanitizedName, sanitizedEmail, sanitizedBirth, title, emoji]);
            res.status(201).json({ 
                message: '회원가입에 성공했습니다',
                user: { 
                    id: user_id, 
                    name: name,
                    email: email,
                    birth: birth
                }
            });
        } catch (e) {
            next(e);
        }
    },

    // 사용자 ID 찾기
    searchId: async (req, res, next) => {
        const { name, email } = req.body;

        const sanitizedName = sanitizeHtml(name);
        const sanitizedEmail = sanitizeHtml(email);

        try {
            const [results] = await db.query(
                'SELECT user_id FROM user WHERE name = ? AND email = ?',
                [sanitizedName, sanitizedEmail]
            );

            if (results.length === 0) {
                return res.status(404).json({ message: '사용자를 찾을 수 없습니다' });
            }

            res.status(200).json({ user_id: results[0].user_id });
        } catch (e) {
            next(e);
        }
    },

    // 사용자 비밀번호 찾기
    searchPassword: async (req, res, next) => {
        // 랜덤 비밀번호 생성 함수
    
        const { user_id, email } = req.body; // 사용자는 이메일과 아이디만 입력
        const sanitizedUserId = sanitizeHtml(user_id);
        const sanitizedEmail = sanitizeHtml(email);
        
        const generateRandomPassword = () => {
            // 랜덤 비밀번호 생성 (8자리)
            return Math.random().toString(36).slice(-8);
        };

        try {
            // 사용자가 존재하는지 확인
            const [results] = await db.query(
                'SELECT * FROM user WHERE user_id = ? AND email = ?',
                [sanitizedUserId, sanitizedEmail]
            );
    
            if (results.length === 0) {
                return res.status(404).json({ message: '사용자를 찾을 수 없습니다' });
            }
    
            // 새로운 랜덤 비밀번호 생성
            const newPassword = generateRandomPassword();
    
            // 새 비밀번호 암호화
            const hashedPassword = await bcrypt.hash(newPassword, 10);
    
            // 데이터베이스에 새 비밀번호 업데이트
            await db.query(
                'UPDATE user SET password = ? WHERE user_id = ? AND email = ?',
                [hashedPassword, sanitizedUserId, sanitizedEmail]
            );
    
            // 사용자에게 새 비밀번호 제공
            res.status(200).json({
                message: '비밀번호가 성공적으로 재설정되었습니다',
                newPassword: newPassword, // 사용자에게 새 비밀번호를 제공
            });
        } catch (e) {
            next(e);
        }
    },

    // 프로필 수정
    profileUpdate: async (req, res, next) => {
        const { name, password, email } = req.body; // 클라이언트로부터 받은 수정 요청 데이터
        const user_id = req.user.id; // JWT에서 추출한 사용자 ID

        // 입력 값 정리 및 검증
        const sanitizedName = sanitizeHtml(name);
        const sanitizedPassword = sanitizeHtml(password);
        const sanitizedEmail = sanitizeHtml(email);

        try {
            // 비밀번호 암호화
            let hashedPassword = null;
            if (sanitizedPassword) {
                hashedPassword = await bcrypt.hash(sanitizedPassword, 10);
            }

            // 동적으로 업데이트 쿼리 생성
            const fieldsToUpdate = [];
            const valuesToUpdate = [];

            if (sanitizedName) {
                fieldsToUpdate.push('name = ?');
                valuesToUpdate.push(sanitizedName);
            }

            if (hashedPassword) {
                fieldsToUpdate.push('password = ?');
                valuesToUpdate.push(hashedPassword);
            }

            if (sanitizedEmail) {
                fieldsToUpdate.push('email = ?');
                valuesToUpdate.push(sanitizedEmail);
            }

            // 업데이트할 필드가 없다면 에러 반환
            if (fieldsToUpdate.length === 0) {
                return res.status(400).json({ message: '업데이트할 유효한 필드가 없습니다' });
            }

            // SQL 쿼리에 사용자 ID 추가
            const sql = `UPDATE user SET ${fieldsToUpdate.join(', ')} WHERE user_id = ?`;
            valuesToUpdate.push(user_id);

            // 데이터베이스 업데이트 실행
            await db.query(sql, valuesToUpdate);

            res.status(200).json({ 
                message: '프로필이 성공적으로 수정되었습니다',
                user: {
                    name: name,
                    email: email,
                }
            });
        } catch (e) {
            next(e);
        }
    },

    // 회원 탈퇴
    profileDelete: async (req, res, next) => {
        const userId = req.user.id;
    
        try {
            // 사용자 삭제
            const [result] = await db.query('DELETE FROM user WHERE user_id = ?', [userId]);
    
            // 삭제된 행 수 확인
            if (result.affectedRows === 0) {
                return res.status(404).json({ message: '사용자를 찾을 수 없습니다' });
            }
    
            return res.status(200).json({ message: '회원 탈퇴에 성공했습니다' });
        } catch (e) {
            next(e);
        }
    },

    // 캘린더 제목 수정
    calendarTitle: async (req, res, next) => {
        const { title } = req.body; 
        const userId = req.user.id;

        try {
            // title 업데이트 쿼리
            const sql = `
                UPDATE user
                SET title = ?
                WHERE user_id = ?
            `;

            // 데이터베이스 업데이트
            const [result] = await db.query(sql, [title, userId]);

            // 변경된 행이 없을 경우 에러 반환
            if (result.affectedRows === 0) {
                return res.status(404).json({ message: '사용자를 찾을 수 없거나 캘린더 제목이 수정되지 않았습니다' });
            }

            res.status(200).json({ 
                message: '캘린더 제목이 성공적으로 수정되었습니다',
                user: {
                    title: title,
                }
            });

        } catch (e) {
            next(e); 
        }
    },

    // 캘린더 이모지 수정
    calendarEmoji: async (req, res, next) => {
        const { emoji } = req.body; 
        const userId = req.user.id;

        try {
            // emoji 업데이트 쿼리
            const sql = `
                UPDATE user
                SET emoji = ?
                WHERE user_id = ?
            `;

            // 데이터베이스 업데이트
            const [result] = await db.query(sql, [emoji, userId]);

            // 변경된 행이 없을 경우 에러 반환
            if (result.affectedRows === 0) {
                return res.status(404).json({ message: '사용자를 찾을 수 없거나 캘린더 이모지가 수정되지 않았습니다' });
            }

            res.status(200).json({ 
                message: '이모지가 성공적으로 수정되었습니다',
                user: {
                    emoji: emoji,
                }
            });

        } catch (e) {
            next(e); 
        }
    },

    getProfile : async (req, res, next) => {
        const user_id = req.user.id; // JWT에서 추출한 사용자 ID

        try {
            const [result] = await db.query("SELECT * FROM user WHERE user_id=?", user_id);

            res.status(200).json({ 
                message: '프로필을 성공적으로 불러왔습니다',
                user: {
                    name: result[0].name,
                    email: result[0].email,
                    title: result[0].title,
                    // birth: result[0].birth,
                    emoji: result[0].emoji,
                }
            });
        } catch (e) {
            next(e);
        }
    },
};