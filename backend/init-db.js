require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Connect to the DB using the DATABASE_URL from .env
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Required for cloud databases like Render
});

const initDB = async () => {
  try {
    const schemaPath = path.join(__dirname, 'database', 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    console.log("Connecting to database and running schema.sql...");
    await pool.query(schemaSql);
    console.log("✅ Database initialized successfully with all tables!");
    
  } catch (err) {
    console.error("❌ Error initializing database:", err);
  } finally {
    pool.end();
  }
};

initDB();
