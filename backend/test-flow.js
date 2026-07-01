const axios = require('axios');
const crypto = require('crypto');

async function run() {
  const emailPrefix = crypto.randomBytes(4).toString('hex');
  const orgAdminEmail = `orgadmin_${emailPrefix}@test.com`;
  const instructorEmail = `instructor_${emailPrefix}@test.com`;
  const orgCode = `ORG_${emailPrefix}`;

  try {
    // 1. Register Org Admin
    const regAdmin = await axios.post('http://localhost:5000/api/accounts/register', {
      email: orgAdminEmail,
      full_name: 'Test Org Admin',
      password: 'password',
      confirm_password: 'password',
      role: 'organization_admin',
      organization_type: 'institute',
      organization_name: 'Test Org',
      organization_code: orgCode
    });
    console.log('Org Admin registered');

    // 2. Login Org Admin
    const loginAdmin = await axios.post('http://localhost:5000/api/accounts/login', {
      email: orgAdminEmail,
      password: 'password'
    });
    const adminToken = loginAdmin.data.token;
    
    // Wait for Admin to be auto-approved or mock it.
    // Wait, in this LMS, users might need approval!
    // But let's assume they are auto-approved, or we can approve them in DB directly.
  } catch(e) {
    console.error(e.response ? e.response.data : e.message);
  }
}
run();
