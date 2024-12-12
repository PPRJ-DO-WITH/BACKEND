const db = require('../config/db');
const OpenAI = require("openai");
const axios = require('axios');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

const getChatHistory = async (chatId) => {
    const [messages] = await db.query('SELECT * FROM message WHERE chat_id=? ORDER BY message_date ASC', [chatId]);
    return messages.map(msg => ({
        role: msg.sender === 'chatbot' ? 'assistant' : 'user',
        content: msg.content,
    }));
};

// GPT-4o mini API 호출 함수
const getGPTResponse = async (chatId, message) => {
    try {
        const chatHistory = await getChatHistory(chatId);
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();

        const prompt = `너는 친절한 일정 관리 챗봇이야. \
                        어조는 친절하고 친근하게 해주고, 항상 존댓말을 사용해야 하며, 사용자에게 질문을 하면 안 돼. \
                        사용자가 작성한 일정을 토대로 네가 생각하기에 효율적인 일정을 사용자에게 짜주면 돼. \
                        '휴식', '자유' 시간 또는 '아침', '점심', '저녁' 일정은 사용자가 언급하지 않았다면, 네가 일정 짤 때는 고려를 하되 \
                        사용자에게 일정으로 출력하지 마. 즉, 점심시간이나 자유시간 같은 내용을 일정 목록에 포함시키지 않아야 해. \
                        네가 생각하기에 이동하는 시간이 소요된다고 판단하면 일정을 짤 때 고려해줘. \
                        예상 소요 시간은 네가 판단해서 사용자에게 추천해줘. \
                        일정 제안을 마친 후에는, 시간대 변경이 필요하거나 추가해야 할 일이 있으면 얘기해달라고 친절하게 말해. \
                        오늘은 ${now.toLocaleDateString('ko-KR')}야. 현재 시간은 ${currentHour}시 ${currentMinute}분이야. \
                        현재 시간 이후의 일정만 추천해줘. 만약 현재 시간 이후에 할 수 있는 시간이 없다면 오늘 일정은 생략하고 내일부터 추천해줘. \
                        사용자가 특정한 '날짜'(예: 내일, 모레, {M}월 {D}일)에 대한 언급이 없다면, 기본적으로 오늘 안에 해야 할 일정들이야. \
                        사용자가 특정한 '날짜'(예: 내일, 모레, {M}월 {D}일)에 대한 언급이 있다면, 그 날짜를 출력에 포함시켜줘. \
                        사용자가 특정한 '날짜'(예: 오늘, 내일)에 대해 며칠이냐고 물어보면 대답해줘. \
                        '날짜'의 포맷은 M월 D일이야. \
                        '시작시간'과 '종료시간'의 포맷은 00:00이야. \
                        일정을 출력할 땐 \n {날짜} 제안 일정: \n- {시작시간}~{종료시간} 일정 항목 \n 으로 말해줘. \ 
                        마크다운 문자(예: '**', '##')는 사용하지 마. \
                        너에게 허용된 토큰은 500이라서 500 토큰을 넘어가지 않도록 조절해서 답해줘. \
                        사용자가 '고마워' 와 같이 너에게 고마움을 표시하면 친절하게 답해줘.
        `;
        const response = await axios.post(
            process.env.OPENAI_API_URL,
            {
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: prompt },
                    ...chatHistory,
                    { role: "user", content: message },
                ],
                max_tokens: 500,
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                    'Content-Type': 'application/json',
                },
            },
        );
        return response.data.choices[0].message.content;
    } catch (e) {
        console.error("GPT API 호출 중 오류 발생: ", e);
        throw new Error("GPT 응답 생성 실패");
    }
};

const parseTodoData = async (messageId) => {
    try {
        const [message] = await db.query('SELECT content FROM message WHERE message_id=?', [messageId]);
        const selectContent = message[0].content;
        const lines = selectContent.split('\n');

        // 날짜 추출 (YYYY년 MM월 DD일 형식)
        const dateRegex = /(\d{4}년\s)?(\d{1,2}월 \d{1,2}일)/g;
        // 시간 추출 (HH:MM~HH:MM 형식)
        const timeRangeRegex = /(\d{2}:\d{2})~(\d{2}:\d{2}) (.+)/g;

        const currentYear = new Date().getFullYear();
        let currentDate = null;
        const today = new Date();

        await Promise.all(lines.map(async (line) => {
            if (dateRegex.test(line)) {
                currentDate = line.match(dateRegex)[0];
                var year = currentYear;
                var month, day;
                if (!currentDate.includes('년')) {
                    [month, day] = currentDate.split('월').map(d => d.trim().replace('일', ''));
                    const isThisYear = new Date(`${year}-${month}-${day}`);
                    if(isThisYear < today) {
                        year += 1; // 과거 날짜일 경우 내년으로 설정
                    }
                } else {
                    [year, currentDate] = currentDate.split('년');
                    [month, day] = currentDate.split('월').map(d => d.trim().replace('일', ''));
                }
                currentDate = new Date(`${year}-${month}-${day}`);
            } else if (timeRangeRegex.test(line)) {
                const match = line.match(timeRangeRegex);
                const matchString = match[0];
                const [timeFrom, rest] = matchString.split('~');
                const [timeTo, ...content] = rest.split(' '); // 종료 시간과 내용으로 분리
                const title = content.join(' ').trim();

                if (currentDate) {
                    const suggestedDateFrom = new Date(currentDate);
                    const suggestedDateTo = new Date(currentDate);

                    const [fromHour, fromMin] = timeFrom.split(':').map(Number);
                    const [toHour, toMin] = timeTo.split(':').map(Number);

                    suggestedDateFrom.setHours(fromHour, fromMin, 0, 0);
                    suggestedDateTo.setHours(toHour, toMin, 0, 0);

                    const kstDateFrom = new Date(suggestedDateFrom.getTime() + 9 * 60 * 60 * 1000);
                    const kstDateTo = new Date(suggestedDateTo.getTime() + 9 * 60 * 60 * 1000);
                    await db.query('INSERT INTO suggested_todo (message_id, suggested_date_from, suggested_date_to, suggested_title) VALUES (?, ?, ?, ?)', [messageId, kstDateFrom, kstDateTo, title]);
                }
            }
        }));
    } catch (e) {
        console.error("일정 삽입 중 오류 발생: ", e);
        throw new Error("파싱 실패");
    }
}

// 메시지 분석 함수
const isKeyword = (message) => {
    const keywords = ['일정', '스케줄', '추가', '짜줘', '조회', '삭제', '수정', '변경', '바꿔', '오전', '오후', '시', '언제', '순서', '정해', '오늘', '내일', '요일',
        '안녕', '고마워', '추천'];
    return keywords.some((keyword) => message.includes(keyword));
};

module.exports = { getGPTResponse, parseTodoData, isKeyword };