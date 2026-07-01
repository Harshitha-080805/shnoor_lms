const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const getApprovedCourses = async (req, res) => {
  try {
    const { role, organization_id: organizationId, userId } = req.user;
    
    let query = `
      SELECT 
        c.*,
        json_build_object(
          'id', u.id,
          'full_name', u.full_name,
          'email', u.email
        ) AS instructor,
        (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id) AS enrollments_count,
        COALESCE(
          (SELECT json_agg(json_build_object(
            'id', p.id, 
            'title', p.title,
            'minimum_completion_percentage', cp.minimum_completion_percentage,
            'minimum_quiz_score', cp.minimum_quiz_score,
            'certificate_required', cp.certificate_required
          )) 
           FROM course_prerequisites cp 
           JOIN courses p ON cp.prerequisite_course_id = p.id 
           WHERE cp.course_id = c.id), '[]'::json
        ) AS prerequisites
      FROM courses c
      LEFT JOIN users u ON c.instructor_id = u.id
      WHERE c.is_approved = true AND c.organization_id = $1
    `;

    if (role === 'LEARNER') {
      query += ` 
        AND (
          c.assign_all_in_org = true 
          OR EXISTS (
            SELECT 1 FROM course_groups cg 
            JOIN group_members gm ON cg.group_id = gm.group_id 
            WHERE cg.course_id = c.id AND gm.user_id = $2
          )
        ) 
      `;
    }

    const result = await pool.query(query, [organizationId, userId]);
    console.log('SUCCESS, fetched rows:', result.rows.length);
  } catch (error) {
    console.error('CRASH:', error);
  } finally {
    pool.end();
  }
};

const mockReq = {
  user: {
    role: 'INSTRUCTOR',
    organization_id: 3,
    userId: 18
  }
};
getApprovedCourses(mockReq, {});
