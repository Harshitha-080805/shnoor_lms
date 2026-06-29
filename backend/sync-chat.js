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

    // 2. Sync all organization members to their Org Groups
    const orgMembers = await pool.query('SELECT id, organization_id FROM users WHERE is_approved = true AND organization_id IS NOT NULL');
    for (const member of orgMembers.rows) {
      await chatEvents.addUserToOrgGroup(member.id, member.organization_id);
    }
    console.log(`Synced ${orgMembers.rowCount} members to their Organization Groups.`);

    // 3. Sync all enrollments to Course Groups
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
