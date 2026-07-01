const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const id = "6";
    const assign_groups = '[1]'; // Simulate JSON.stringify(assignGroups)
    const assign_all_in_org = "false";
    
    // Simulate what PUT /api/courses/:id does for assign_groups
    if (assign_groups !== undefined) {
      await client.query('DELETE FROM course_groups WHERE course_id = $1', [id]);
      const isAssignAll = (assign_all_in_org === 'true' || assign_all_in_org === true);
      
      if (!isAssignAll) {
        let groups = [];
        try { groups = typeof assign_groups === 'string' ? JSON.parse(assign_groups) : assign_groups; } catch(e){}
        if (Array.isArray(groups)) {
          for (const groupId of groups) {
            await client.query('INSERT INTO course_groups (course_id, group_id) VALUES ($1, $2)', [id, groupId]);
          }
        }
      }
    }
    
    await client.query('ROLLBACK');
    console.log('SUCCESS');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('CRASH:', error);
  } finally {
    client.release();
    pool.end();
  }
}
run();
