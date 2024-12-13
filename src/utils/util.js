// 관리자 권한 확인 미들웨어
const isAdmin = (req, res) => {
    if (req.user.class !== 'admin') {
        return res.status(403).json({ message: 'Access denied' });
    }
};

const dateOfEightDigit = (date) => {
    var year = String(date.getFullYear());
    var month;
    var day;
    var hour;
    var minute;
    var second;
    if (date.getMonth() < 9)
        month = "0" + String(date.getMonth()+1);
    else
        month = String(date.getMonth()+1);

    if (date.getDate() < 10)
        day = "0" + String(date.getDate());
    else
        day = String(date.getDate());

    hour = String(date.getHours());
    minute = String(date.getMinutes());
    second = String(date.getSeconds());

    return year + "년 " + month + "월 " + day + "일  " + hour + "시 " + minute + "분 " + second + "초";
};

const birthDate = (date) => {
    if(!date) {
        return '';
    }
    const birthday = new Date(date)
    var year = String(birthday.getFullYear());
    var month;
    var day;
    if (birthday.getMonth() < 9)
        month = "0" + String(birthday.getMonth()+1);
    else
        month = String(birthday.getMonth()+1);

    if (birthday.getDate() < 10)
        day = "0" + String(birthday.getDate());
    else
        day = String(birthday.getDate());

    return year + ". " + month + ". " + day + ".";
};

module.exports = { isAdmin, dateOfEightDigit, birthDate };