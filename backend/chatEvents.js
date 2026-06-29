const db = require('./db');

// Ensure an organization conversation exists, then add the user to it
async function addUserToOrgGroup(userId, orgId) {
  if (!orgId) return;
  try {
    // Check if organization conversation exists
    let convCheck = await db.query(
      `SELECT id FROM conversations WHERE type = 'ORGANIZATION' AND organization_id = $1`,
      [orgId]
    );

    let conversationId;
    if (convCheck.rows.length === 0) {
      // Get org name
      const orgRes = await db.query('SELECT name FROM organizations WHERE id = $1', [orgId]);
      if (orgRes.rows.length === 0) return;

      const orgName = orgRes.rows[0].name;

      // Create conversation
      const insertConv = await db.query(
        `INSERT INTO conversations (type, name, organization_id) VALUES ('ORGANIZATION', $1, $2) RETURNING id`,
        [orgName, orgId]
      );
      conversationId = insertConv.rows[0].id;

      // Automatically add all Super Admins
      const superAdmins = await db.query("SELECT id FROM users WHERE role = 'ADMIN'");
      for (const admin of superAdmins.rows) {
        await db.query(
          `INSERT INTO conversation_members (conversation_id, user_id, role) VALUES ($1, $2, 'ADMIN') ON CONFLICT DO NOTHING`,
          [conversationId, admin.id]
        );
      }

      // Automatically add Org Admins for this organization
      if (orgId) {
        const orgAdmins = await db.query("SELECT id FROM users WHERE role = 'ORGANIZATION_ADMIN' AND organization_id = $1", [orgId]);
        for (const admin of orgAdmins.rows) {
          await db.query(
            `INSERT INTO conversation_members (conversation_id, user_id, role) VALUES ($1, $2, 'ADMIN') ON CONFLICT DO NOTHING`,
            [conversationId, admin.id]
          );
        }
      }
    } else {
      conversationId = convCheck.rows[0].id;
    }

    // Add user as member
    const insertRes = await db.query(
      `INSERT INTO conversation_members (conversation_id, user_id, role) VALUES ($1, $2, 'MEMBER') ON CONFLICT DO NOTHING RETURNING conversation_id`,
      [conversationId, userId]
    );

    if (insertRes.rowCount > 0) {
      const userRes = await db.query('SELECT full_name, email FROM users WHERE id = $1', [userId]);
      if (userRes.rows.length > 0) {
        const userName = userRes.rows[0].full_name || userRes.rows[0].email;
        await db.query(
          `INSERT INTO messages (conversation_id, sender_id, message, message_type) VALUES ($1, $2, $3, 'SYSTEM')`,
          [conversationId, userId, `${userName} added to this group`]
        );
      }
    }
  } catch (err) {
    console.error('Error in addUserToOrgGroup:', err);
  }
}

// Ensure a course conversation exists, then add the user to it
async function addUserToCourseGroup(userId, courseId) {
  if (!courseId) return;
  try {
    // Check if course conversation exists
    let convCheck = await db.query(
      `SELECT id FROM conversations WHERE type = 'COURSE' AND course_id = $1`,
      [courseId]
    );

    let conversationId;
    if (convCheck.rows.length === 0) {
      // Get course name
      const courseRes = await db.query(`
        SELECT c.title, c.organization_id as course_org_id, u.organization_id as instructor_org_id 
        FROM courses c 
        LEFT JOIN users u ON c.instructor_id = u.id 
        WHERE c.id = $1
      `, [courseId]);
      if (courseRes.rows.length === 0) return;

      const courseName = courseRes.rows[0].title;
      const orgId = courseRes.rows[0].course_org_id || courseRes.rows[0].instructor_org_id;

      // Create conversation
      const insertConv = await db.query(
        `INSERT INTO conversations (type, name, course_id, organization_id) VALUES ('COURSE', $1, $2, $3) RETURNING id`,
        [courseName, courseId, orgId]
      );
      conversationId = insertConv.rows[0].id;

      // Add the instructor to the group as well
      const instructorRes = await db.query('SELECT instructor_id FROM courses WHERE id = $1', [courseId]);
      if (instructorRes.rows.length > 0) {
        const instructorId = instructorRes.rows[0].instructor_id;
        await db.query(
          `INSERT INTO conversation_members (conversation_id, user_id, role) VALUES ($1, $2, 'INSTRUCTOR') ON CONFLICT DO NOTHING`,
          [conversationId, instructorId]
        );
      }

      // Automatically add all Super Admins
      const superAdmins = await db.query("SELECT id FROM users WHERE role = 'ADMIN'");
      for (const admin of superAdmins.rows) {
        await db.query(
          `INSERT INTO conversation_members (conversation_id, user_id, role) VALUES ($1, $2, 'ADMIN') ON CONFLICT DO NOTHING`,
          [conversationId, admin.id]
        );
      }

      // Automatically add Org Admins for this organization
      if (orgId) {
        const orgAdmins = await db.query("SELECT id FROM users WHERE role = 'ORGANIZATION_ADMIN' AND organization_id = $1", [orgId]);
        for (const admin of orgAdmins.rows) {
          await db.query(
            `INSERT INTO conversation_members (conversation_id, user_id, role) VALUES ($1, $2, 'ADMIN') ON CONFLICT DO NOTHING`,
            [conversationId, admin.id]
          );
        }
      }
    } else {
      conversationId = convCheck.rows[0].id;
    }

    // Add user as member
    const insertRes = await db.query(
      `INSERT INTO conversation_members (conversation_id, user_id, role) VALUES ($1, $2, 'MEMBER') ON CONFLICT DO NOTHING RETURNING conversation_id`,
      [conversationId, userId]
    );

    if (insertRes.rowCount > 0) {
      const userRes = await db.query('SELECT full_name, email FROM users WHERE id = $1', [userId]);
      if (userRes.rows.length > 0) {
        const userName = userRes.rows[0].full_name || userRes.rows[0].email;
        await db.query(
          `INSERT INTO messages (conversation_id, sender_id, message, message_type) VALUES ($1, $2, $3, 'SYSTEM')`,
          [conversationId, userId, `${userName} added to this group`]
        );
      }
    }
  } catch (err) {
    console.error('Error in addUserToCourseGroup:', err);
  }
}

// Ensure System Announcements conversation exists, then add the user to it
async function addUserToSystemGroup(userId) {
  try {
    let annCheck = await db.query(`SELECT id FROM conversations WHERE type = 'ANNOUNCEMENT'`);
    let conversationId;
    
    if (annCheck.rows.length === 0) {
      const insertAnn = await db.query(`INSERT INTO conversations (type, name) VALUES ('ANNOUNCEMENT', 'System Announcements') RETURNING id`);
      conversationId = insertAnn.rows[0].id;
    } else {
      conversationId = annCheck.rows[0].id;
    }

    let memCheck = await db.query(`SELECT 1 FROM conversation_members WHERE conversation_id = $1 AND user_id = $2`, [conversationId, userId]);
    if (memCheck.rows.length === 0) {
      // Determine user role for chat (default to MEMBER, unless ADMIN)
      const uRes = await db.query('SELECT role, full_name, email FROM users WHERE id = $1', [userId]);
      if (uRes.rows.length > 0) {
        const uInfo = uRes.rows[0];
        const chatRole = (uInfo.role && uInfo.role.toUpperCase() === 'ADMIN') ? 'ADMIN' : 'MEMBER';
        
        await db.query(`INSERT INTO conversation_members (conversation_id, user_id, role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`, [conversationId, userId, chatRole]);
        
        const userName = uInfo.full_name || uInfo.email;
        await db.query(
          `INSERT INTO messages (conversation_id, sender_id, message, message_type) VALUES ($1, $2, $3, 'SYSTEM')`,
          [conversationId, userId, `${userName} added to this group`]
        );
      }
    }
  } catch (err) {
    console.error('Error in addUserToSystemGroup:', err);
  }
}
  

module.exports = {
  addUserToOrgGroup,
  addUserToCourseGroup,
  addUserToSystemGroup
};
