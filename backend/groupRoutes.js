const express = require('express');
const db = require('./db');

const router = express.Router();

// GET /api/groups - Get groups for the organization
router.get('/', async (req, res) => {
  try {
    const { role, organization_id: organizationId, userId } = req.user;
    let groups = [];
    
    if (role === 'ORGANIZATION_ADMIN') {
      const result = await db.query(
        'SELECT * FROM groups WHERE organization_id = $1 ORDER BY created_at DESC',
        [organizationId]
      );
      groups = result.rows;
    } else if (role === 'INSTRUCTOR') {
      const result = await db.query(`
        SELECT g.* 
        FROM groups g
        JOIN group_members gm ON g.id = gm.group_id
        WHERE g.organization_id = $1 AND gm.user_id = $2
        ORDER BY g.name ASC
      `, [organizationId, userId]);
      groups = result.rows;
    } else {
        // Learner - Maybe they need to see their groups? Not strictly needed for this feature.
        const result = await db.query(`
            SELECT g.* 
            FROM groups g
            JOIN group_members gm ON g.id = gm.group_id
            WHERE g.organization_id = $1 AND gm.user_id = $2
        `, [organizationId, userId]);
        groups = result.rows;
    }

    res.json(groups);
  } catch (error) {
    console.error('Error fetching groups:', error);
    res.status(500).json({ error: 'Server error fetching groups' });
  }
});

// POST /api/groups - Create a group (Org Admin Only)
router.post('/', async (req, res) => {
  try {
    const { role, organization_id: organizationId } = req.user;
    if (role !== 'ORGANIZATION_ADMIN') {
      return res.status(403).json({ error: 'Only Organization Admins can create groups.' });
    }

    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Group name is required' });

    const result = await db.query(
      'INSERT INTO groups (organization_id, name, description) VALUES ($1, $2, $3) RETURNING *',
      [organizationId, name, description]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({ error: 'Server error creating group' });
  }
});

// PUT /api/groups/:id - Update group (Org Admin Only)
router.put('/:id', async (req, res) => {
  try {
    const { role, organization_id: organizationId } = req.user;
    if (role !== 'ORGANIZATION_ADMIN') {
      return res.status(403).json({ error: 'Only Organization Admins can update groups.' });
    }

    const { name, description } = req.body;
    const { id } = req.params;

    const result = await db.query(
      'UPDATE groups SET name = $1, description = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 AND organization_id = $4 RETURNING *',
      [name, description, id, organizationId]
    );
    
    if (result.rows.length === 0) return res.status(404).json({ error: 'Group not found' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating group:', error);
    res.status(500).json({ error: 'Server error updating group' });
  }
});

// DELETE /api/groups/:id - Delete a group (Org Admin Only)
router.delete('/:id', async (req, res) => {
    try {
        const { role, organization_id: organizationId } = req.user;
        if (role !== 'ORGANIZATION_ADMIN') {
            return res.status(403).json({ error: 'Only Organization Admins can delete groups.' });
        }
        const { id } = req.params;
        const result = await db.query('DELETE FROM groups WHERE id = $1 AND organization_id = $2 RETURNING *', [id, organizationId]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Group not found' });
        res.json({ message: 'Group deleted successfully' });
    } catch (error) {
        console.error('Error deleting group:', error);
        res.status(500).json({ error: 'Server error deleting group' });
    }
});

// GET /api/groups/:id/members - Get all members of a group
router.get('/:id/members', async (req, res) => {
  try {
    const { id } = req.params;
    const { organization_id: organizationId } = req.user;
    
    // Check if group belongs to org
    const groupCheck = await db.query('SELECT * FROM groups WHERE id = $1 AND organization_id = $2', [id, organizationId]);
    if (groupCheck.rows.length === 0) return res.status(404).json({ error: 'Group not found' });

    const result = await db.query(`
      SELECT u.id, u.full_name, u.email, u.role
      FROM users u
      JOIN group_members gm ON u.id = gm.user_id
      WHERE gm.group_id = $1
      ORDER BY u.role, u.full_name ASC
    `, [id]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching group members:', error);
    res.status(500).json({ error: 'Server error fetching group members' });
  }
});

// PUT /api/groups/:id/members - Update all members of a group
router.put('/:id/members', async (req, res) => {
  try {
    const { role, organization_id: organizationId } = req.user;
    if (role !== 'ORGANIZATION_ADMIN') {
      return res.status(403).json({ error: 'Only Organization Admins can manage group members.' });
    }

    const { id } = req.params;
    const { userIds } = req.body; // Array of user IDs

    if (!Array.isArray(userIds)) return res.status(400).json({ error: 'userIds must be an array' });

    const groupCheck = await db.query('SELECT * FROM groups WHERE id = $1 AND organization_id = $2', [id, organizationId]);
    if (groupCheck.rows.length === 0) return res.status(404).json({ error: 'Group not found' });

    const client = await db.query('BEGIN');
    try {
        await db.query('DELETE FROM group_members WHERE group_id = $1', [id]);
        
        for (const userId of userIds) {
            await db.query('INSERT INTO group_members (group_id, user_id) VALUES ($1, $2)', [id, userId]);
        }
        await db.query('COMMIT');
        res.json({ message: 'Group members updated successfully' });
    } catch(e) {
        await db.query('ROLLBACK');
        throw e;
    }
  } catch (error) {
    console.error('Error updating group members:', error);
    res.status(500).json({ error: 'Server error updating group members' });
  }
});

module.exports = router;
