var Iconv = require('iconv').Iconv;
let config = {};
let charset;
let encode;

function l2u(content) {
   if (encode && (typeof content === 'string')) {
      return new Iconv(encode, charset).convert(content).toString(encode);
   } else {
      return content;
   }
}

function u2l(content) {
   if (encode && (typeof content === 'string')) {
      return new Iconv(charset, encode).convert(content).toString(encode);
   } else {
      return content;
   }
}

function query(task) {
   if (arguments.length > 1) {
      task = Array.from(arguments);
   }
   let pool = this;
   let STR = 'string';
   return new Promise(r => {
      (async () => {
         let result;
         try {
            let con = await pool.getConnection(async conn => conn);
            try {
               await con.beginTransaction();
               if (typeof task === STR) { task = [task, []]; }
               let ntask = [];
               for (let i = 0; i < task.length; i++) {
                  if (typeof task[i] === STR) {
                     let query = task[i];
                     let value;
                     if (task[i + 1] && (typeof task[i + 1] !== STR)) {
                        value = task[i + 1];
                     } else {
                        value = [];
                     }
                     ntask.push([query, value]);
                  }
               }
               task = ntask;
               for (let i = 0; i < task.length; i++) {
                  let tak = task[i];
                  if (encode) {
                     tak[0] = u2l(tak[0]);
                     tak[1] = tak[1].map(a => u2l(a));
                  }
                  let resq = await con.query(tak[0], tak[1]);
                  if (!result) { result = []; }
                  if (encode) {
                     let keys;
                     for (let j = 0; j < resq[0].length; j++) {
                        let il = resq[0][j];
                        if (!keys) { keys = Object.keys(il); }
                        keys.forEach(key => { il[key] = l2u(il[key]); })
                     }
                  }
                  result[result.length] = resq[0];
               }
               await con.commit();
               if(config.flat && result && result.length === 1) {
                  result = result.flat();
               }
            } catch (err) {
               await con.rollback();
               result = err;
            }
            con.release();
         } catch (err) {
            result = err;
         }
         r(result);
      })();
   });
}
module.exports = function (pool) {
   let promise = pool && pool.constructor.name === 'PromisePool';
   let object = pool && pool.constructor.name === 'Object';
   if (!promise && object && pool.host) {
      config = JSON.parse(JSON.stringify(pool));
      if (pool && pool.encode) {
         charset = pool.charset;
         encode = pool.encode;
         delete pool.encode;
      }
      pool = require('mysql2/promise').createPool(pool);
   }
   return query.bind(pool);
};
