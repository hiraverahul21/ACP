const axios = require('axios');

async function testAuth() {
  try {
    console.log('Testing authentication and branch access...');
    
    // First, let's try to login
    const loginResponse = await axios.post('http://localhost:8765/api/auth/login', {
      email: 'test-admin-001@example.com',
      password: 'password123'
    });
    
    console.log('Login successful:', loginResponse.data.success);
    
    // Extract the token from cookies or response
    const cookies = loginResponse.headers['set-cookie'];
    let jwtCookie = '';
    if (cookies) {
      const jwtCookieHeader = cookies.find(cookie => cookie.startsWith('jwt='));
      if (jwtCookieHeader) {
        jwtCookie = jwtCookieHeader.split(';')[0];
      }
    }
    
    console.log('JWT Cookie:', jwtCookie ? 'Found' : 'Not found');
    
    // Now try to access branches with the cookie
    const branchResponse = await axios.get('http://localhost:8765/api/branches/my-company', {
      headers: {
        'Cookie': jwtCookie
      }
    });
    
    console.log('Branch access successful:', branchResponse.data.success);
    console.log('Number of branches:', branchResponse.data.data?.length || 0);
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    if (error.response?.status === 403) {
      console.log('\n403 Error Details:');
      console.log('Status:', error.response.status);
      console.log('Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testAuth();