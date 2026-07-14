require('dotenv').config();
const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const pool = require('./db.js');
const serviceAccount = require('./firebaseServiceAccount.json');

initializeApp({
  credential: cert(serviceAccount)
});

const migrateUsers = async () => {
  try {
    console.log('Fetching users from Postgres...');
    const result = await pool.query('SELECT id, email, password, full_name FROM users');
    const users = result.rows;
    console.log(`Found ${users.length} users. Preparing import...`);

    const userImportRecords = users.map(user => ({
      uid: user.id.toString(), // we can just use the Postgres ID as the UID, or let Firebase generate it. Actually it's better to let Firebase generate it, but we need to map them. Or we can just use Postgres ID! Using string of Postgres ID is great because it links them directly.
      email: user.email,
      passwordHash: Buffer.from(user.password),
      displayName: user.full_name
    }));

    // Import users in batches of 1000 (Firebase limit)
    let successCount = 0;
    let failureCount = 0;

    for (let i = 0; i < userImportRecords.length; i += 1000) {
      const batch = userImportRecords.slice(i, i + 1000);
      const importResult = await getAuth().importUsers(batch, {
        hash: {
          algorithm: 'BCRYPT',
        },
      });
      successCount += importResult.successCount;
      failureCount += importResult.failureCount;

      if (importResult.failureCount > 0) {
        importResult.errors.forEach(err => {
           // if the error is email already exists, we can ignore it
           if (err.error.code !== 'auth/email-already-exists') {
              console.error('Failed to import user:', err.error.toJSON());
           } else {
              // it's fine, the user already exists (e.g. admin)
              successCount++;
              failureCount--;
           }
        });
      }
    }

    console.log(`\nMigration Complete!`);
    console.log(`✅ Successfully imported: ${successCount}`);
    if (failureCount > 0) {
      console.log(`❌ Failed to import: ${failureCount}`);
    }
  } catch (error) {
    console.error('Error during migration:', error);
  } finally {
    pool.end();
  }
};

migrateUsers();
