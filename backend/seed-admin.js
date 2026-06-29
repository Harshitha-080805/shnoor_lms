require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const seedAdmin = async () => {
  try {
    console.log("Checking if 'admin' role exists in enum...");
    try {
      await pool.query("ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'admin'");
    } catch (e) {
      console.log("Notice with enum:", e.message);
    }

    const email = 'admin@example.com';
    const password = '12345678';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    console.log("Inserting Super Admin user...");
    await pool.query(
      `INSERT INTO users (email, password, full_name, role, is_approved) 
       VALUES ($1, $2, $3, $4, $5) 
       ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password`,
      [email, hashedPassword, 'Super Admin', 'admin', true]
    );
    console.log("✅ Super Admin 'admin@example.com' with password '12345678' seeded successfully!");

    // Also add to System Announcements
    try {
      const chatEvents = require('./chatEvents');
      const adminRes = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
      if (adminRes.rows.length > 0) {
        await chatEvents.addUserToSystemGroup(adminRes.rows[0].id);
        console.log("✅ Super Admin added to System Announcements group");
      }
    } catch (e) {
      console.log("Notice: Could not add to System Announcements:", e.message);
    }
  } catch (err) {
    console.error("❌ Error seeding admin:", err);
  } finally {
    pool.end();
  }
};

seedAdmin();
