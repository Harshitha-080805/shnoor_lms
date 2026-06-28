require('dotenv').config();
const pool = require('./db.js');
const jwt = require('jsonwebtoken');

pool.query("SELECT * FROM users WHERE role = 'ORGANIZATION_ADMIN' AND organization_id IS NOT NULL LIMIT 1").then(res => {
  const user = res.rows[0];
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    organization_id: user.organization_id
  };
  const token = jwt.sign(payload, process.env.JWT_SECRET || 'your_secret_key');
  console.log(token);
  process.exit(0);
});
