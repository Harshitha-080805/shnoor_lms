const pool = require('./db');
pool.query("ALTER TYPE conversation_type ADD VALUE IF NOT EXISTS 'ANNOUNCEMENT'")
  .then(() => { console.log('Enum updated'); process.exit(0); })
  .catch((e) => { console.error(e); process.exit(1); });
