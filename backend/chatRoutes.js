const express = require('express');
const db = require('./db');

module.exports = (upload) => {
  const router = express.Router();

  // Get all conversations for a user
  router.get('/', async (req, res) => {
    try {
      const userId = req.user.userId;
      
      // ONE-TIME OR ON-DEMAND CHECK FOR SYSTEM ANNOUNCEMENTS GROUP
      let annCheck = await db.query(`SELECT id FROM conversations WHERE type = 'ANNOUNCEMENT'`);
      let annConvId;
      if (annCheck.rows.length === 0) {
        const insertAnn = await db.query(`INSERT INTO conversations (type, name) VALUES ('ANNOUNCEMENT', 'System Announcements') RETURNING id`);
        annConvId = insertAnn.rows[0].id;
      } else {
        annConvId = annCheck.rows[0].id;
      }
      
      let memCheck = await db.query(`SELECT 1 FROM conversation_members WHERE conversation_id = $1 AND user_id = $2`, [annConvId, userId]);
      if (memCheck.rows.length === 0) {
        const r = (req.user.role && req.user.role.toUpperCase() === 'ADMIN') ? 'ADMIN' : 'MEMBER';
        await db.query(`INSERT INTO conversation_members (conversation_id, user_id, role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`, [annConvId, userId, r]);
        
        const uRes = await db.query('SELECT full_name, email FROM users WHERE id = $1', [userId]);
        const userName = uRes.rows[0].full_name || uRes.rows[0].email;
        await db.query(
          `INSERT INTO messages (conversation_id, sender_id, message, message_type) VALUES ($1, $2, $3, 'SYSTEM')`,
          [annConvId, userId, `${userName} added to this group`]
        );
      }
      
      const result = await db.query(`
        SELECT c.*, cm.role, cm.joined_at, cm.is_archived, cm.is_locked,
          (SELECT created_at FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_at,
          (SELECT COUNT(*) FROM messages m 
           WHERE m.conversation_id = c.id 
             AND m.sender_id != $1 
             AND m.is_read = false
             AND (cm.history_cleared_at IS NULL OR m.created_at > cm.history_cleared_at)
             AND m.id NOT IN (SELECT message_id FROM message_deletions WHERE user_id = $1)
          ) as unread_count
        FROM conversations c
        JOIN conversation_members cm ON c.id = cm.conversation_id
        WHERE cm.user_id = $1
        ORDER BY last_message_at DESC NULLS LAST, c.created_at DESC
      `, [userId]);
      
      const convs = result.rows;
      // Populate name for DIRECT chats
      for (let conv of convs) {
        if (conv.type === 'DIRECT') {
          const other = await db.query(`
            SELECT u.full_name, u.email, u.role 
            FROM conversation_members cm
            JOIN users u ON cm.user_id = u.id
            WHERE cm.conversation_id = $1 AND cm.user_id != $2
          `, [conv.id, userId]);
          if (other.rows.length > 0) {
            conv.name = other.rows[0].full_name || other.rows[0].email;
            conv.other_role = other.rows[0].role;
          } else {
            conv.name = "Unknown User";
          }
        }
      }
      res.json(convs);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch conversations' });
    }
  });

  // Create or get a direct chat with another user
  router.post('/direct', async (req, res) => {
    try {
      const { targetUserId, email } = req.body;
      const userId = req.user.userId;

      let targetId = targetUserId;
      if (email) {
        const userCheck = await db.query('SELECT id FROM users WHERE email = $1', [email.trim()]);
        if (userCheck.rows.length === 0) {
          return res.status(404).json({ error: 'User not found with this email' });
        }
        targetId = userCheck.rows[0].id;
      }

      if (!targetId) {
        return res.status(400).json({ error: 'Target user ID or email is required' });
      }

      if (userId === targetId) {
        return res.status(400).json({ error: 'Cannot chat with yourself' });
      }

      // Check if direct chat already exists
      const existCheck = await db.query(`
        SELECT c.id 
        FROM conversations c
        JOIN conversation_members cm1 ON c.id = cm1.conversation_id
        JOIN conversation_members cm2 ON c.id = cm2.conversation_id
        WHERE c.type = 'DIRECT' 
          AND cm1.user_id = $1 
          AND cm2.user_id = $2
      `, [userId, targetId]);

      if (existCheck.rows.length > 0) {
        return res.json({ conversationId: existCheck.rows[0].id });
      }

      // Create new direct conversation
      const insertConv = await db.query(
        `INSERT INTO conversations (type) VALUES ('DIRECT') RETURNING id`
      );
      const conversationId = insertConv.rows[0].id;

      // Add both users
      await db.query(
        `INSERT INTO conversation_members (conversation_id, user_id, role) VALUES 
        ($1, $2, 'MEMBER'),
        ($1, $3, 'MEMBER')`,
        [conversationId, userId, targetId]
      );

      res.status(201).json({ conversationId });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to create direct chat' });
    }
  });

  // Get unread message count across all conversations
  router.get('/unread', async (req, res) => {
    try {
      const userId = req.user.userId;
      const result = await db.query(`
        SELECT COUNT(*) as unread_count
        FROM messages m
        JOIN conversation_members cm ON m.conversation_id = cm.conversation_id
        WHERE cm.user_id = $1 
          AND m.sender_id != $1 
          AND m.is_read = false
          AND (cm.history_cleared_at IS NULL OR m.created_at > cm.history_cleared_at)
          AND m.id NOT IN (SELECT message_id FROM message_deletions WHERE user_id = $1)
      `, [userId]);
      res.json({ unreadCount: parseInt(result.rows[0].unread_count, 10) });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch unread count' });
    }
  });

  // Leave a group
  router.delete('/:id/leave', async (req, res) => {
    try {
      const conversationId = req.params.id;
      const userId = req.user.userId;
      
      const conv = await db.query('SELECT type FROM conversations WHERE id = $1', [conversationId]);
      if (conv.rows.length === 0) return res.status(404).json({ error: 'Conversation not found' });
      
      // Allow leaving any group-like conversation except DIRECT and ANNOUNCEMENT
      if (conv.rows[0].type === 'DIRECT') {
        return res.status(400).json({ error: 'Cannot leave a direct chat' });
      }
      if (conv.rows[0].type === 'ANNOUNCEMENT') {
        return res.status(400).json({ error: 'Cannot leave System Announcements' });
      }

      await db.query('DELETE FROM conversation_members WHERE conversation_id = $1 AND user_id = $2', [conversationId, userId]);

      const userRes = await db.query('SELECT full_name, email FROM users WHERE id = $1', [userId]);
      const userName = userRes.rows[0].full_name || userRes.rows[0].email;
      
      await db.query(
        `INSERT INTO messages (conversation_id, sender_id, message, message_type) VALUES ($1, $2, $3, 'SYSTEM')`,
        [conversationId, userId, `${userName} left the group`]
      );

      res.json({ success: true, message: 'Left group successfully' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to leave group' });
    }
  });



  // Add members to an existing group
  router.post('/:id/members', async (req, res) => {
    try {
      const conversationId = req.params.id;
      const userId = req.user.userId;
      const { memberIds, emails } = req.body;

      // Check if user is a member
      const memberCheck = await db.query('SELECT role FROM conversation_members WHERE conversation_id = $1 AND user_id = $2', [conversationId, userId]);
      if (memberCheck.rows.length === 0) return res.status(403).json({ error: 'Access denied' });

      const conv = await db.query('SELECT type FROM conversations WHERE id = $1', [conversationId]);
      if (conv.rows.length === 0 || conv.rows[0].type !== 'GROUP') {
        return res.status(400).json({ error: 'Can only add members to custom groups' });
      }

      let ids = memberIds || [];
      if (emails && Array.isArray(emails)) {
        const emailList = emails.map(e => e.trim()).filter(e => e);
        if (emailList.length > 0) {
          const usersCheck = await db.query('SELECT id FROM users WHERE email = ANY($1)', [emailList]);
          ids = [...ids, ...usersCheck.rows.map(r => r.id)];
        }
      }

      if (ids.length === 0) return res.status(400).json({ error: 'No valid users to add' });

      // Add unique members
      const uniqueIds = [...new Set(ids)];
      const values = [];
      const queryParams = [conversationId];
      let paramCount = 2;

      for (const id of uniqueIds) {
        values.push(`($1, $${paramCount}, 'MEMBER')`);
        queryParams.push(id);
        paramCount++;
      }

      await db.query(
        `INSERT INTO conversation_members (conversation_id, user_id, role) VALUES ${values.join(', ')} ON CONFLICT DO NOTHING`,
        queryParams
      );

      const usersRes = await db.query('SELECT full_name, email FROM users WHERE id = ANY($1)', [uniqueIds]);
      const addedNames = usersRes.rows.map(r => r.full_name || r.email).join(', ');
      
      const adderRes = await db.query('SELECT full_name, email FROM users WHERE id = $1', [userId]);
      const adderName = adderRes.rows[0].full_name || adderRes.rows[0].email;

      if (addedNames) {
        await db.query(
          `INSERT INTO messages (conversation_id, sender_id, message, message_type) VALUES ($1, $2, $3, 'SYSTEM')`,
          [conversationId, userId, `${adderName} added ${addedNames}`]
        );
      }

      res.json({ success: true, message: 'Members added successfully' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to add members' });
    }
  });

  // Create a custom group chat
  router.post('/group', async (req, res) => {
    try {
      const { name, memberIds, emails } = req.body;
      const userId = req.user.userId;

      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Group name is required' });
      }

      let ids = memberIds || [];
      if (emails && Array.isArray(emails)) {
        const emailList = emails.map(e => e.trim()).filter(e => e);
        if (emailList.length > 0) {
          const usersCheck = await db.query('SELECT id FROM users WHERE email = ANY($1)', [emailList]);
          if (usersCheck.rows.length === 0) {
             return res.status(404).json({ error: 'No users found with the provided emails' });
          }
          ids = [...ids, ...usersCheck.rows.map(r => r.id)];
        }
      }

      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'At least one valid user must be invited' });
      }

      // Create new group conversation
      const insertConv = await db.query(
        `INSERT INTO conversations (type, name, created_by) VALUES ('GROUP', $1, $2) RETURNING id`,
        [name.trim(), userId]
      );
      const conversationId = insertConv.rows[0].id;

      // Make sure the creator is included in the members list
      const uniqueMembers = new Set([userId, ...ids]);
      
      // Auto-add super admin and organization admin if learner created the group
      if (req.user.role && req.user.role.toUpperCase() === 'LEARNER') {
        const orgId = req.user.organization_id;
        // Add super admins
        const superAdmins = await db.query("SELECT id FROM users WHERE role = 'admin'");
        for (const admin of superAdmins.rows) uniqueMembers.add(admin.id);
        
        // Fetch organization admins if orgId is available
        if (orgId) {
          const orgAdmins = await db.query("SELECT id FROM users WHERE UPPER(role) = 'ORGANIZATION_ADMIN' AND organization_id = $1", [orgId]);
          orgAdmins.rows.forEach(r => uniqueMembers.add(r.id));
        }
      }
      
      // Build bulk insert query
      const values = [];
      const queryParams = [];
      let paramCount = 1;

      for (const id of uniqueMembers) {
        values.push(`($1, $${paramCount + 1}, $${paramCount + 2})`);
        queryParams.push(id);
        queryParams.push(id === userId ? 'ADMIN' : 'MEMBER'); // Creator gets ADMIN role
        paramCount += 2;
      }

      if (values.length > 0) {
        await db.query(
          `INSERT INTO conversation_members (conversation_id, user_id, role) VALUES ${values.join(', ')}`,
          [conversationId, ...queryParams]
        );
        
        // Add SYSTEM messages for everyone else who was added
        const membersArr = Array.from(uniqueMembers);
        const addedUsersRes = await db.query(
          `SELECT id, full_name, email FROM users WHERE id = ANY($1::int[])`,
          [membersArr]
        );
        
        const msgValues = [];
        const msgParams = [conversationId, userId]; 
        let msgParamCount = 2;
        
        for (const u of addedUsersRes.rows) {
          if (u.id !== userId) {
            const userName = u.full_name || u.email;
            msgValues.push(`($1, $2, $${msgParamCount + 1}, 'SYSTEM')`);
            msgParams.push(`${userName} added to this group`);
            msgParamCount++;
          }
        }
        
        if (msgValues.length > 0) {
          await db.query(
            `INSERT INTO messages (conversation_id, sender_id, message, message_type) VALUES ${msgValues.join(', ')}`,
            msgParams
          );
        }
      }

      res.status(201).json({ conversationId, message: 'Group created successfully' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to create group chat' });
    }
  });

  // Search available users to chat with
  router.get('/search-users', async (req, res) => {
    try {
      const userId = req.user.userId;
      const role = req.user.role;
      const orgId = req.user.organization_id;
      const q = (req.query.q || '').toLowerCase();

      let queryStr = `
        SELECT id, email, full_name, role 
        FROM users 
        WHERE id != $1 AND is_approved = true
      `;
      let params = [userId];

      // If not ADMIN, filter by organization_id
      if (role !== 'ADMIN') {
        if (!orgId) {
          return res.json([]); // independent learner can't search org users
        }
        queryStr += ` AND organization_id = $2`;
        params.push(orgId);
      }

      if (q) {
        queryStr += ` AND (LOWER(full_name) LIKE $${params.length + 1} OR LOWER(email) LIKE $${params.length + 1})`;
        params.push(`%${q}%`);
      }

      queryStr += ` ORDER BY full_name ASC LIMIT 50`;

      const result = await db.query(queryStr, params);
      res.json(result.rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to search users' });
    }
  });

  // Get members of a specific conversation
  router.get('/:id/members', async (req, res) => {
    try {
      const conversationId = req.params.id;
      const userId = req.user.userId;

      // Check membership first
      const memberCheck = await db.query(
        'SELECT * FROM conversation_members WHERE conversation_id = $1 AND user_id = $2',
        [conversationId, userId]
      );

      if (memberCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const members = await db.query(`
        SELECT u.id, u.full_name, u.email, u.role as system_role, cm.role as chat_role, cm.joined_at
        FROM conversation_members cm
        JOIN users u ON cm.user_id = u.id
        WHERE cm.conversation_id = $1
        ORDER BY 
          CASE u.role::VARCHAR
            WHEN 'admin' THEN 1
            WHEN 'ADMIN' THEN 1 
            WHEN 'ORGANIZATION_ADMIN' THEN 2 
            WHEN 'INSTRUCTOR' THEN 3 
            ELSE 4 
          END ASC, 
          cm.joined_at ASC
      `, [conversationId]);

      res.json(members.rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch conversation members' });
    }
  });

  // Get messages for a specific conversation
  router.get('/:id/messages', async (req, res) => {
    try {
      const conversationId = req.params.id;
      const userId = req.user.userId;

      // Check membership
      const memberCheck = await db.query(
        'SELECT * FROM conversation_members WHERE conversation_id = $1 AND user_id = $2',
        [conversationId, userId]
      );

      if (memberCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const historyClearedAt = memberCheck.rows[0].history_cleared_at;

      let queryStr = `
        SELECT m.*, u.full_name as sender_name, ma.file_url, ma.file_name, ma.file_type
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        LEFT JOIN message_attachments ma ON m.id = ma.message_id
        WHERE m.conversation_id = $1
          AND m.id NOT IN (SELECT message_id FROM message_deletions WHERE user_id = $2)
      `;
      let params = [conversationId, userId];

      if (historyClearedAt) {
        queryStr += ` AND m.created_at > $3`;
        params.push(historyClearedAt);
      }
      queryStr += ` ORDER BY m.created_at ASC`;

      const messages = await db.query(queryStr, params);

      // Update is_read
      await db.query(`
        UPDATE messages SET is_read = true 
        WHERE conversation_id = $1 AND sender_id != $2 AND is_read = false
      `, [conversationId, userId]);

      res.json(messages.rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch messages' });
    }
  });

  // Upload attachment
  router.post('/:id/attachments', upload.single('attachment'), async (req, res) => {
    try {
      const conversationId = req.params.id;
      const userId = req.user.userId;

      // Check membership
      const memberCheck = await db.query(
        'SELECT * FROM conversation_members WHERE conversation_id = $1 AND user_id = $2',
        [conversationId, userId]
      );

      if (memberCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Access denied' });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const fileUrl = req.file.path;
      const fileType = req.file.mimetype;
      const fileName = req.file.originalname;

      res.json({ fileUrl, fileType, fileName });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to upload attachment' });
    }
  });

  
  
  router.put('/messages/:id', async (req, res) => {
    try {
      const { text } = req.body;
      const result = await db.query(
        'UPDATE messages SET message = $1, is_edited = true WHERE id = $2 AND sender_id = $3 RETURNING *',
        [text, req.params.id, req.user.userId]
      );
      if (result.rows.length === 0) return res.status(403).json({ error: 'Cannot edit this message' });
      res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: 'Failed to edit' }); }
  });

  router.post('/messages/:id/react', async (req, res) => {
    try {
      const { emoji } = req.body;
      const msg = await db.query('SELECT reactions FROM messages WHERE id = $1', [req.params.id]);
      if (msg.rows.length === 0) return res.status(404).json({ error: 'Not found' });
      let reactions = msg.rows[0].reactions || {};
      
      // Toggle logic
      if (emoji && reactions[req.user.userId] !== emoji) {
        reactions[req.user.userId] = emoji;
      } else {
        delete reactions[req.user.userId];
      }
      
      const result = await db.query(
        'UPDATE messages SET reactions = $1 WHERE id = $2 RETURNING *',
        [reactions, req.params.id]
      );
      res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: 'Failed to react' }); }
  });

  router.delete('/messages/:id/everyone', async (req, res) => {
    try {
      const result = await db.query(
        'UPDATE messages SET is_deleted_for_everyone = true WHERE id = $1 AND sender_id = $2 RETURNING *',
        [req.params.id, req.user.userId]
      );
      if (result.rows.length === 0) return res.status(403).json({ error: 'Cannot delete this message' });
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Failed' }); }
  });

  router.delete('/messages/:id/me', async (req, res) => {
    try {
      await db.query(
        'INSERT INTO message_deletions (message_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [req.params.id, req.user.userId]
      );
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Failed' }); }
  });

  router.put('/:id/archive', async (req, res) => {
    try {
      await db.query('UPDATE conversation_members SET is_archived = NOT is_archived WHERE conversation_id = $1 AND user_id = $2', [req.params.id, req.user.userId]);
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Failed' }); }
  });

  router.put('/:id/lock', async (req, res) => {
    try {
      await db.query('UPDATE conversation_members SET is_locked = NOT is_locked WHERE conversation_id = $1 AND user_id = $2', [req.params.id, req.user.userId]);
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Failed' }); }
  });

  router.post('/:id/clear', async (req, res) => {
    try {
      await db.query('UPDATE conversation_members SET history_cleared_at = CURRENT_TIMESTAMP WHERE conversation_id = $1 AND user_id = $2', [req.params.id, req.user.userId]);
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Failed' }); }
  });

  router.get('/:id/search', async (req, res) => {
    try {
      const { q } = req.query;
      const conversationId = req.params.id;
      const userId = req.user.userId;
      
      const memberCheck = await db.query(
        'SELECT history_cleared_at FROM conversation_members WHERE conversation_id = $1 AND user_id = $2',
        [conversationId, userId]
      );
      if (memberCheck.rows.length === 0) return res.status(403).json({ error: 'Access denied' });
      
      const historyClearedAt = memberCheck.rows[0].history_cleared_at;

      let queryStr = `
        SELECT m.*, u.full_name as sender_name, ma.file_url, ma.file_name, ma.file_type
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        LEFT JOIN message_attachments ma ON m.id = ma.message_id
        WHERE m.conversation_id = $1
          AND m.id NOT IN (SELECT message_id FROM message_deletions WHERE user_id = $2)
          AND (m.message ILIKE $3 OR ma.file_name ILIKE $3)
      `;
      let params = [conversationId, userId, `%${q}%`];

      if (historyClearedAt) {
        queryStr += ` AND m.created_at > $4`;
        params.push(historyClearedAt);
      }
      queryStr += ` ORDER BY m.created_at ASC`;

      const messages = await db.query(queryStr, params);
      res.json(messages.rows);
    } catch (err) { 
      console.error('SEARCH ERROR:', err);
      res.status(500).json({ error: 'Failed' }); 
    }
  });

  router.get('/:id/export', async (req, res) => {
    try {
       // Future logic to fetch all messages and format as CSV
       res.json({ success: true, message: "Export endpoint ready" });
    } catch (err) { res.status(500).json({ error: 'Failed' }); }
  });

  router.post('/pin', async (req, res) => {
    try {
      await db.query('UPDATE users SET chat_pin = $1 WHERE id = $2', [req.body.pin, req.user.userId]);
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Failed' }); }
  });

  router.post('/verify-pin', async (req, res) => {
    try {
      const user = await db.query('SELECT chat_pin FROM users WHERE id = $1', [req.user.userId]);
      if (user.rows[0].chat_pin === req.body.pin) res.json({ success: true });
      else res.status(401).json({ error: 'Invalid PIN' });
    } catch (err) { res.status(500).json({ error: 'Failed' }); }
  });

  

  return router;
};
