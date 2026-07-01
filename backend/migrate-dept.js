const db = require('./db');

async function run() {
  try {
    await db.query('ALTER TABLE users ADD COLUMN department VARCHAR(255);');
    console.log('Successfully added department column to users table.');
  } catch (err) {
    if (err.code === '42701') {
      console.log('Column department already exists.');
    } else {
      console.error('Error adding column:', err);
    }
  } finally {
    process.exit(0);
  }
}

run();
