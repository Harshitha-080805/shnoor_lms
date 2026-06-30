const express = require('express');
const pool = require('./db');
const axios = require('axios');

const createTransporter = () => {
  return {
    sendMail: async (mailOptions) => {
      const apiKey = process.env.BREVO_API_KEY || process.env.EMAIL_PASS;
      
      const fromStr = mailOptions.from || process.env.EMAIL_FROM || 'noreply@shnoorlms.com';
      let senderName = 'Shnoor LMS';
      let senderEmail = fromStr;
      if (fromStr.includes('<') && fromStr.includes('>')) {
        const parts = fromStr.split('<');
        senderName = parts[0].replace(/"/g, '').trim() || 'Shnoor LMS';
        senderEmail = parts[1].replace('>', '').trim();
      }
      const sender = { name: senderName, email: senderEmail };

      const data = {
        sender,
        to: [{ email: mailOptions.to }],
        subject: mailOptions.subject,
      };
      if (mailOptions.html) data.htmlContent = mailOptions.html;
      if (mailOptions.text) data.textContent = mailOptions.text;

      try {
        await axios.post('https://api.brevo.com/v3/smtp/email', data, {
          headers: {
            'api-key': apiKey,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });
      } catch (error) {
        console.error("Brevo API error:", error.response?.data || error.message);
        throw error;
      }
    }
  };
};

// POST /api/contact — public, no auth required
const submitQuery = async (req, res) => {
  const { name, email, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'All fields are required.' });
  }
  try {
    const result = await pool.query(
      'INSERT INTO contact_queries (name, email, message) VALUES ($1, $2, $3) RETURNING id',
      [name, email, message]
    );
    res.status(201).json({ success: true, queryId: result.rows[0].id });
  } catch (error) {
    console.error('Contact POST error:', error);
    res.status(500).json({ error: 'Failed to submit query.' });
  }
};

// GET /api/contact — ADMIN only
const getAllQueries = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM contact_queries ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Contact GET error:', error);
    res.status(500).json({ error: 'Failed to fetch contact queries.' });
  }
};

// POST /api/contact/:id/reply — ADMIN only
const sendReply = async (req, res) => {
  const { id } = req.params;
  const { replyMessage } = req.body;
  if (!replyMessage || !replyMessage.trim()) {
    return res.status(400).json({ error: 'Reply message cannot be empty.' });
  }
  try {
    const queryResult = await pool.query(
      'SELECT * FROM contact_queries WHERE id = $1',
      [id]
    );
    if (queryResult.rows.length === 0) {
      return res.status(404).json({ error: 'Query not found.' });
    }
    const contactQuery = queryResult.rows[0];

    const transporter = createTransporter();
    
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"SHNOOR LMS" <noreply@shnoorlms.com>',
      to: contactQuery.email,
      subject: 'Re: Your Query at SHNOOR LMS',
      text: `Hi ${contactQuery.name},\n\nThank you for reaching out.\n\n${replyMessage}\n\nBest regards,\nThe SHNOOR Team`,
      html: `
        <div style="font-family:'Inter','Helvetica Neue',Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);">
          <div style="background:#1e3a8a;padding:32px 24px;text-align:center;">
            <h1 style="color:#fff;margin:0;font-size:28px;font-weight:800;">SHNOOR LMS</h1>
            <p style="color:#93c5fd;margin:8px 0 0;font-size:14px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Support Reply</p>
          </div>
          <div style="padding:40px 32px;background:#fff;">
            <p style="color:#475569;font-size:16px;line-height:1.6;margin:0 0 8px;">Hi <strong>${contactQuery.name}</strong>,</p>
            <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 24px;">Thank you for reaching out. Here is our reply to your query:</p>
            <div style="background:#f1f5f9;border-left:4px solid #2563eb;border-radius:4px;padding:16px 20px;margin:0 0 24px;">
              <p style="color:#1e293b;font-size:15px;line-height:1.7;margin:0;">${replyMessage.replace(/\n/g, '<br/>')}</p>
            </div>
            <p style="color:#64748b;font-size:13px;">Your original message: <em>"${contactQuery.message}"</em></p>
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0;"/>
            <p style="color:#94a3b8;font-size:12px;margin:0;">If you have more questions, feel free to contact us again through our website.</p>
          </div>
          <div style="background:#f1f5f9;padding:20px;text-align:center;">
            <p style="color:#94a3b8;font-size:12px;margin:0;">&copy; ${new Date().getFullYear()} Shnoor International LLC. All rights reserved.</p>
          </div>
        </div>
      `,
    });

    await pool.query(
      "UPDATE contact_queries SET status = 'REPLIED', reply_message = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
      [replyMessage, id]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Contact reply error:', error);
    res.status(500).json({ error: 'Failed to send reply.' });
  }
};

// Export factory that accepts authMiddleware (matches existing pattern in codebase)
module.exports = (authMiddleware) => {
  const router = express.Router();
  router.post('/', submitQuery);                               // public
  router.get('/', authMiddleware(['admin']), getAllQueries);    // admin only
  router.post('/:id/reply', authMiddleware(['admin']), sendReply); // admin only
  return router;
};
