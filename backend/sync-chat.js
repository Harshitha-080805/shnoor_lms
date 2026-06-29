const pool = require('./db');
const chatEvents = require('./chatEvents');

const syncChat = async () => {
  try {
    console.log('Starting chat group sync...');

    // 1. Sync all approved users to System Announcements
    const approvedUsers = await pool.query('SELECT id FROM users WHERE is_approved = true');
    for (const user of approvedUsers.rows) {
      await chatEvents.addUserToSystemGroup(user.id);
    }
    console.log(`Synced ${approvedUsers.rowCount} users to System Announcements.`);

    // 2. Ensure Super Admins and Org Admins are in all Organization Groups
    const orgConvs = await pool.query("SELECT id, organization_id FROM conversations WHERE type = 'ORGANIZATION'");
    const superAdmins = await pool.query("SELECT id FROM users WHERE role = 'admin'");
    for (const conv of orgConvs.rows) {
      // Add super admins
      for (const admin of superAdmins.rows) {
        await pool.query(`INSERT INTO conversation_members (conversation_id, user_id, role) VALUES ($1, $2, 'ADMIN') ON CONFLICT DO NOTHING`, [conv.id, admin.id]);
      }
      // Add org admins
      if (conv.organization_id) {
        const orgAdmins = await pool.query("SELECT id FROM users WHERE role = 'ORGANIZATION_ADMIN' AND organization_id = $1", [conv.organization_id]);
        for (const orgAdmin of orgAdmins.rows) {
          await pool.query(`INSERT INTO conversation_members (conversation_id, user_id, role) VALUES ($1, $2, 'ADMIN') ON CONFLICT DO NOTHING`, [conv.id, orgAdmin.id]);
        }
      }
    }
    console.log(`Ensured admins in ${orgConvs.rowCount} Organization Groups.`);

    // 3. Ensure Super Admins, Org Admins, and Instructors are in all Course Groups
    const courseConvs = await pool.query("SELECT id, course_id, organization_id FROM conversations WHERE type = 'COURSE'");
    for (const conv of courseConvs.rows) {
      // Add super admins
      for (const admin of superAdmins.rows) {
        await pool.query(`INSERT INTO conversation_members (conversation_id, user_id, role) VALUES ($1, $2, 'ADMIN') ON CONFLICT DO NOTHING`, [conv.id, admin.id]);
      }
      // Add org admins
      if (conv.organization_id) {
        const orgAdmins = await pool.query("SELECT id FROM users WHERE role = 'ORGANIZATION_ADMIN' AND organization_id = $1", [conv.organization_id]);
        for (const orgAdmin of orgAdmins.rows) {
          await pool.query(`INSERT INTO conversation_members (conversation_id, user_id, role) VALUES ($1, $2, 'ADMIN') ON CONFLICT DO NOTHING`, [conv.id, orgAdmin.id]);
        }
      }
      // Add instructor
      const instructorRes = await pool.query('SELECT instructor_id FROM courses WHERE id = $1', [conv.course_id]);
      if (instructorRes.rows.length > 0) {
        await pool.query(`INSERT INTO conversation_members (conversation_id, user_id, role) VALUES ($1, $2, 'INSTRUCTOR') ON CONFLICT DO NOTHING`, [conv.id, instructorRes.rows[0].instructor_id]);
      }
    }
    console.log(`Ensured admins and instructors in ${courseConvs.rowCount} Course Groups.`);

    // 4. Ensure Super Admins and Org Admins are in all Custom Groups created by Learners
    const customConvs = await pool.query(`
      SELECT c.id, c.created_by, u.organization_id, u.role
      FROM conversations c
      JOIN users u ON c.created_by = u.id
      WHERE c.type = 'GROUP' AND u.role = 'LEARNER'
    `);
    for (const conv of customConvs.rows) {
       for (const admin of superAdmins.rows) {
        await pool.query(`INSERT INTO conversation_members (conversation_id, user_id, role) VALUES ($1, $2, 'ADMIN') ON CONFLICT DO NOTHING`, [conv.id, admin.id]);
      }
      if (conv.organization_id) {
        const orgAdmins = await pool.query("SELECT id FROM users WHERE role = 'ORGANIZATION_ADMIN' AND organization_id = $1", [conv.organization_id]);
        for (const orgAdmin of orgAdmins.rows) {
          await pool.query(`INSERT INTO conversation_members (conversation_id, user_id, role) VALUES ($1, $2, 'ADMIN') ON CONFLICT DO NOTHING`, [conv.id, orgAdmin.id]);
        }
      }
    }
    console.log(`Ensured admins in ${customConvs.rowCount} Learner Custom Groups.`);

    // 5. Sync all organization members to their Org Groups
    const orgMembers = await pool.query('SELECT id, organization_id FROM users WHERE is_approved = true AND organization_id IS NOT NULL');
    for (const member of orgMembers.rows) {
      await chatEvents.addUserToOrgGroup(member.id, member.organization_id);
    }
    console.log(`Synced ${orgMembers.rowCount} members to their Organization Groups.`);

    // 6. Sync all enrollments to Course Groups
    const enrollments = await pool.query('SELECT student_id, course_id FROM enrollments');
    for (const enroll of enrollments.rows) {
      await chatEvents.addUserToCourseGroup(enroll.student_id, enroll.course_id);
    }
    console.log(`Synced ${enrollments.rowCount} enrollments to Course Groups.`);

    console.log('Chat group sync complete!');
    process.exit(0);
  } catch (err) {
    console.error('Error during chat sync:', err);
    process.exit(1);
  }
};

syncChat();
