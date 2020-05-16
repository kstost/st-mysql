let Iconv;
let config = {};

function l2u(content) {
   if (config.encode && (typeof content === 'string')) {
      return new Iconv(config.encode, config.charset).convert(content).toString(config.encode);
   } else {
      return content;
   }
}

function u2l(content) {
   if (config.encode && (typeof content === 'string')) {
      return new Iconv(config.charset, config.encode).convert(content).toString(config.encode);
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
                  if (config.encode) {
                     tak[0] = u2l(tak[0]);
                     tak[1] = tak[1].map(a => u2l(a));
                  }
                  let resq = await con.query(tak[0], tak[1]);
                  if (!result) { result = []; }
                  if (config.encode) {
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
               if (config.flat && result && result.length === 1) {
                  result = result[0];
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
function set_inline(list) {
   return list.map(a => a[Object.keys(a)[0]]);
};
function inline_results(nquery, query, imode) {
   return new Promise((resolve, reject) => {
      (async () => {
         try {
            let result;
            if (typeof query === 'string') {
               result = await nquery(query);
            } else {
               result = await nquery(query[0], query[1]);
            }
            if (result) {
               try {
                  result = result.filter(val => val);
               } catch{ }
            }
            if (!imode) {
               result = set_inline(result);
            } else {
               let nl = {};
               let fc;
               if (result && result.forEach) {
                  result.forEach(row => {
                     let row_ = row;
                     let pk = row_[imode];
                     delete row_[imode];
                     if (!fc) {
                        let dv = Object.keys(row_);
                        if (dv.length === 1) {
                           row_ = row_[dv[0]];
                        }
                     }
                     nl[pk] = row_;
                  });
               }
               result = nl;
            }
            Object.keys(result).forEach(key => {
               let nm = Number(result[key]);
               if (!isNaN(nm)) {
                  result[key] = nm;
               }
            })
            resolve(result);
         } catch (e) {
            reject(e);
         }
      })();
   });
}
function ask_inline(query, fieldk, field, nquery) {
   if (query === 'desc') {
      // query += ' ' + field;
      query = 'show full columns from ' + field;
      field = '';
   } else {
      if (field) { query += ' like ?'; field = '%' + field + '%'; }
   }
   return inline_results(nquery, [query, [field]], fieldk);
}

module.exports = function (pool) {
   let promise = pool && pool.constructor.name === 'PromisePool';
   let object = pool && pool.constructor.name === 'Object';
   if (!promise && object && pool.host) {
      config = JSON.parse(JSON.stringify(pool));
      Iconv = pool.Iconv;
      delete pool.encode;
      delete pool.flat;
      delete pool.Iconv;
      pool = require('mysql2/promise').createPool(pool);
   }
   let nquery = query.bind(pool);
   nquery.show_tables = () => {
      try {
         return inline_results(nquery, 'show tables')
      } catch (e) {
         return new Promise(r => { r(e) });
      }
   };
   nquery.table_schema = tablename => {
      return (async () => {
         try {
            if (!tablename) {
               throw 'table name should be given';
            }
            let ad = await nquery('show create table ' + tablename);
            if (ad.length === 1) {
               ad = ad[0]['Create Table'];
               ad = ad.split('\n').join('');
            }
            return ad;
         } catch (e) {
            return e;
         }
      })();
   }
   nquery.show_variables = field => {
      try {
         return ask_inline('show variables', 'Variable_name', field, nquery)
      } catch (e) {
         return new Promise(r => { r(e) });
      }
   };
   nquery.show_processlist = field => {
      try {
         return ask_inline('show processlist', 'Id', field, nquery)
      } catch (e) {
         return new Promise(r => { r(e) });
      }
   };
   nquery.show_status = field => {
      try {
         return ask_inline('show status', 'Variable_name', field, nquery)
      } catch (e) {
         return new Promise(r => { r(e) });
      }
   };
   nquery.desc = field => {
      try {
         return ask_inline('desc', 'Field', field, nquery)
      } catch (e) {
         return new Promise(r => { r(e) });
      }
   };
   nquery.truncate = tablename => {
      try {
         if (!tablename) { throw 'tablename should be given'; }
         return nquery('truncate table ' + tablename)
      } catch (e) {
         return new Promise(r => { r(e) });
      }
   };
   nquery.optimize = tablename => {
      try {
         if (!tablename) { throw 'tablename should be given'; }
         return nquery('optimize table ' + tablename)
      } catch (e) {
         return new Promise(r => { r(e) });
      }
   };
   nquery.drop = tablename => {
      try {
         if (!tablename) { throw 'tablename should be given'; }
         return nquery('drop table ' + tablename)
      } catch (e) {
         return new Promise(r => { r(e) });
      }
   };
   nquery.delete = (tablename, where, wvalues) => {
      try {
         if (where && where.indexOf('?') > -1 && !wvalues) { throw 'wvalues is needed'; }
         if (!where && wvalues) { throw 'where is needed'; }
         if (!tablename) { throw 'table name is needed'; }
         if (!where) { where = ''; }
         let query_template = ['delete', 'from', tablename, where].join(' ');
         let llm = wvalues ? wvalues : [];
         return new Promise(r => {
            (async () => { let rr = (await nquery(query_template, llm)); r(rr.length === 1 ? rr[0] : rr) })();
         });
      } catch (e) {
         return new Promise(r => { r(e) });
      }
   }
   nquery.select = (select_list, tablename, where, wvalues) => {
      try {
         if (where && where.indexOf('?') > -1 && !wvalues) { throw 'wvalues is needed'; }
         if (!where && wvalues) { throw 'where is needed'; }
         if (!tablename) { throw 'table name is needed'; }
         if (!select_list || select_list.length === 0) { select_list = ['*']; }
         if (!where) { where = ''; }
         let query_template = ['select', (select_list.join(',')), 'from', tablename, where].join(' ');
         return nquery(query_template, wvalues ? wvalues : []);
      } catch (e) {
         return new Promise(r => { r(e) });
      }
   }
   nquery.count = (tablename, where, wvalues) => {
      let cnt;
      return (async () => {
         try {
            if (!tablename) { throw 'table name is needed'; }
            if (where && where.indexOf('?') > -1 && !wvalues) { throw 'wvalues is needed'; }
            if (!where && wvalues) { throw 'where is needed'; }
            let rt;
            if (!where) { where = ''; }
            let query_template = 'select count(*) as counter from ' + tablename + ' ' + where;
            rt = await nquery(query_template, wvalues ? wvalues : []);
            if (rt.length === 1) { cnt = rt[0].counter; } else { cnt = rt; }
            return cnt;
         } catch (e) {
            return e;
         }
      })();
   }
   nquery.update = (tablename, values, where, wvalues) => {
      try {
         if (!values) { throw 'values are not given'; }
         if (values.constructor.name !== 'Object') { throw 'values must be an object'; }
         if (where && where.indexOf('?') > -1 && !wvalues) { throw 'wvalues is needed'; }
         if (!where && wvalues) { throw 'where is needed'; }
         if (!tablename) { throw 'table name is needed'; }
         if (!wvalues) { wvalues = []; }
         if (!where) { where = ''; }
         let query = 'update ' + tablename;
         let keys = Object.keys(values);
         if (keys.length === 0) { throw 'values are empty'; }
         let pm = [];
         keys.forEach(key => { pm.push(values[key]); });
         let query_template = [
            query,
            'set',
            (keys.join('=?,') + '=?'),
            where].join(' ');
         return new Promise(r => {
            (async () => { let rr = (await nquery(query_template, pm.concat(wvalues))); r(rr.length === 1 ? rr[0] : rr) })();
         });
      } catch (e) {
         return new Promise(r => { r(e) });
      }
   };
   nquery.insert = (tablename, values) => {
      try {
         if (!tablename) { throw 'table name is needed'; }
         if (!values) { throw undefined; }
         if (values.constructor.name === 'Object') { values = [values]; }
         let fields;
         let llm = [];
         let llq = [];
         if (values.length > 0) {
            fields = Object.keys(values[0]);
            values.forEach(set => {
               fields.forEach(key => {
                  llm.push(set[key]);
               });
               llq.push('(' + (new Array(fields.length).fill('?').join(',')) + ')');
            });
         }
         let query_template = 'insert into ' + tablename + ' (' + (fields.join(',')) + ') values ' + (llq.join(','));
         return new Promise(r => {
            (async () => { let rr = (await nquery(query_template, llm)); r(rr.length === 1 ? rr[0] : rr) })();
         });
      } catch (e) {
         return new Promise(r => { r(e) });
      }
   }
   return nquery;
};
