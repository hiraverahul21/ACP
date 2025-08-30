const jwt = require('jsonwebtoken');

// Create a token for superadmin
const token = jwt.sign(
  {
    id: 'staff-superadmin',
    email: 'superadmin@pestcontrolpro.com',
    role: 'SUPERADMIN'
  },
  'your-super-secret-jwt-key-change-this-in-production',
  {
    expiresIn: '1h',
    issuer: 'pest-control-management',
    audience: 'pest-control-users'
  }
);

// Test password change for staff-admin-1
async function testPasswordChange() {
  try {
    console.log('Testing password change for staff-admin-1...');
    
    const response = await fetch('http://localhost:8765/api/staff/admin/change-password', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        staff_id: 'staff-admin-1',
        new_password: 'NewPassword123!'
      })
    });
    
    const result = await response.json();
    console.log('Response status:', response.status);
    console.log('Response body:', result);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testPasswordChange();