```js
// npm install mysql2 st-mysql 해서 필요한 모듈 사전에 설치하자
// 계정정보는 소스코드에 넣는것을 피하는게 좋다. 소스코드에 써놓고 github 같은곳에 공개로 올려버리면 안되니까
const dbinf = { host: 'localhost', user: '사용자아이디', password: '패스워드', database: '디비이름' };
const poool = require('mysql2/promise').createPool(dbinf);
const query = require('st-mysql')(poool);

(async () => {
	let result = [
		await query('select * from sessions where expires > 3'),
		await query('select * from sessions where expires > ?', [3]),
		await query('select * from sessions where expires > ?', [3], 'show processlist'),
		await query('select * from sessions where expires > ?', [3], 'select * from sessions where expires > ?', [3000]),
		await query(['select * from sessions where expires > ?', [3], 'select * from sessions where expires > ?', [3000]])
	];
	console.log(JSON.stringify(result, undefined, 2));
	process.exit();
})();
```
