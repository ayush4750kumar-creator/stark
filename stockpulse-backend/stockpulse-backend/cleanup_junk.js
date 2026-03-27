const { getDB } = require('./config/database');
const db = getDB();
const r = db.prepare(`
  DELETE FROM articles WHERE
    headline LIKE '%Follow us on%' OR
    headline LIKE '%newsletter%' OR
    headline LIKE '%Entering text into%' OR
    headline LIKE '%search result below%' OR
    headline LIKE '%Seeking Alpha on Google%' OR
    headline LIKE '%packed with expert%' OR
    headline LIKE '%Follow Seeking Alpha%' OR
    headline LIKE '%latest stock news%' OR
    length(headline) < 15
`).run();
console.log('Deleted junk articles:', r.changes);