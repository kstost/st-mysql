```js
// Install module by command below
// $ npm install st-mysql
// It would be better not to include your secret information of database in source code due to security issue as commiting to github
const query = require('st-mysql')({ host: 'localhost', user: 'ACCOUNTID', password: 'PASSWORD', database: 'DBNAME' });
const stAsync = require('st-async')
stAsync.set_promise(true);

// Example 1
stAsync(
    a => query('DROP TABLE IF EXISTS kkk'),
    a => query('create table kkk ( kkk text ) default charset=utf8'),
    a => query('insert into kkk (kkk) values (?)', ['안녕하세요']),
    a => query('select * from kkk'),
    stAsync.finally(list => {
        console.log(list.flat()); // All resolved responses of queries until now are in list
    })
)

// Example 2
// It would be rolled back all things if one of queries in query queue didn't work for some error
stAsync(
    a => query(
        'DROP TABLE IF EXISTS kkk',
        'create table kkk ( kkk text ) default charset=utf8',
        'insert into kkk (kkk) values (?)', ['안녕하세요'],
        'select * from kkk'
    ),
    stAsync.finally(list => {
        console.log(list.flat()); // All resolved responses of queries until now are in list
    })
)
```
