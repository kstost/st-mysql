```js
// Install module by command below
// $ npm install st-mysql
// It would be better not to include your secret information of database in source code due to security issue as commiting to github
//
const query = require('st-mysql')({ host: 'localhost', user: 'ACCOUNTID', password: 'PASSWORD', database: 'DBNAME', charset: 'utf-8', flat: true, encode: false });
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

// Example 3
(async () => {
   let result = [
      await query.show_tables(),
      await query.show_variables(),
      await query.show_processlist(),
      await query.show_status(),
      await query('drop table x_test_table'),
      await query('create table x_test_table (cnt int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY, name varchar(255))'),
      await query.desc('x_test_table'),
      await query.insert('x_test_table', { name: '❤️' + Math.random() }),
      await query.insert('x_test_table', [{ name: Math.random() }, { name: Math.random() }]),
      await query.delete('x_test_table', 'where name like ?', ['%❤️%']),
      await query.insert('x_test_table', { name: '❤️' + Math.random() }),
      await query.select(null, 'x_test_table'),
      await query.select(null, 'x_test_table', 'where name like ?', ['%❤️%']),
      await query.count('x_test_table'),
      await query.count('x_test_table', 'where text like ?', ['%❤️%']),
   ];
   res.send(result);
})();
```
