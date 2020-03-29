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
                  let resq = await con.query(tak[0], tak[1]);
                  if (!result) { result = []; }
                  result[result.length] = resq[0];
               }
               await con.commit();
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
      pool = require('mysql2/promise').createPool(pool);
   }
   return query.bind(pool);
};
