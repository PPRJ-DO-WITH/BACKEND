require('dotenv').config();  // 환경 변수 로드
const app = require('./app');

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => console.log(`Server is listening on port ${PORT}`));