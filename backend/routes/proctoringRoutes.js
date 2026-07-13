const express = require('express');
const router = express.Router();
const pool = require('../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '..', 'uploads', 'proctoring');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uid = req.user.userId || req.user.id;
        cb(null, Date.now() + '-' + uid + '.webm');
    }
});
const upload = multer({ storage: storage });
// Create a new exam session when student starts exam
router.post('/start-session', async (req, res) => {
    try {
        const { target_type, target_id, target_uuid } = req.body;
        const student_id = req.user.userId || req.user.id;

        const result = await pool.query(
            `INSERT INTO exam_sessions (student_id, target_type, target_id, target_uuid)
             VALUES ($1, $2, $3, $4) RETURNING id`,
            [student_id, target_type, target_id, target_uuid]
        );

        res.json({ session_id: result.rows[0].id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to start session' });
    }
});

// Log a violation
router.post('/violation', async (req, res) => {
    try {
        const { session_id, violation_type, severity, warning_number, image_snapshot } = req.body;
        const student_id = req.user.userId || req.user.id;

        await pool.query(
            `INSERT INTO exam_violations (session_id, student_id, violation_type, severity, warning_number, image_snapshot)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [session_id, student_id, violation_type, severity, warning_number, image_snapshot]
        );

        // Optionally, emit a socket event here to notify instructors/admins in real-time
        // req.app.get('io').emit('new-violation', { session_id, student_id, violation_type });

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to log violation' });
    }
});

// End the exam session
router.post('/end-session', async (req, res) => {
    try {
        const { session_id } = req.body;
        await pool.query(
            `UPDATE exam_sessions SET end_time = CURRENT_TIMESTAMP, status = 'COMPLETED' WHERE id = $1`,
            [session_id]
        );
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to end session' });
    }
});

// Upload session video
router.post('/upload-video', upload.single('video'), async (req, res) => {
    try {
        const { session_id } = req.body;
        if (!req.file) {
            return res.status(400).json({ error: 'No video file provided' });
        }
        
        // Relative path to serve to frontend
        const video_url = `/uploads/proctoring/${req.file.filename}`;
        
        await pool.query(
            `UPDATE exam_sessions SET video_url = $1 WHERE id = $2`,
            [video_url, session_id]
        );
        
        res.json({ success: true, video_url });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to upload video' });
    }
});

// Get violations for a specific target
router.get('/report/:target_type/:target_id', async (req, res) => {
    try {
        const { target_type, target_id } = req.params;
        const { startDate, endDate } = req.query;

        let query = `
            SELECT 
                v.id AS violation_id, v.violation_type, v.severity, v.timestamp, v.image_snapshot,
                s.id AS session_id, s.video_url, s.start_time, s.end_time,
                u.full_name, u.email
            FROM exam_sessions s
            JOIN users u ON s.student_id = u.id
            LEFT JOIN exam_violations v ON v.session_id = s.id
            WHERE s.target_type = $1 AND (s.target_id::text = $2 OR s.target_uuid::text = $2)
        `;
        const params = [target_type, target_id];

        if (startDate) {
            params.push(startDate);
            query += ` AND v.timestamp >= $${params.length}`;
        }
        if (endDate) {
            params.push(endDate);
            query += ` AND v.timestamp <= $${params.length}`;
        }

        query += ` ORDER BY v.timestamp DESC`;

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch report' });
    }
});

// Super Admin Endpoint: Get all violations across the platform
router.get('/report/all', async (req, res) => {
    try {
        const { startDate, endDate, orgId } = req.query;

        let query = `
            SELECT v.*, u.full_name, u.email, u.organization_id, s.target_type, s.target_id
            FROM exam_violations v
            JOIN exam_sessions s ON v.session_id = s.id
            JOIN users u ON s.student_id = u.id
            WHERE 1=1
        `;
        const params = [];

        if (orgId) {
            params.push(orgId);
            query += ` AND u.organization_id = $${params.length}`;
        }
        if (startDate) {
            params.push(startDate);
            query += ` AND v.timestamp >= $${params.length}`;
        }
        if (endDate) {
            params.push(endDate);
            query += ` AND v.timestamp <= $${params.length}`;
        }

        query += ` ORDER BY v.timestamp DESC`;

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch global report' });
    }
});

module.exports = router;
