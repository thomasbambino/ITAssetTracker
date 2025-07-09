const fetch = require('node-fetch');

async function testFrontendExport() {
  try {
    // First, login to get session
    const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'tommy.shorez@satellitephonestore.com',
        password: 'admin123'
      }),
      credentials: 'include'
    });
    
    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }
    
    console.log('Login successful');
    
    // Extract cookies from login response
    const cookies = loginResponse.headers.get('set-cookie');
    console.log('Cookies received:', cookies);
    
    // Now try to export with the session
    const exportResponse = await fetch('http://localhost:5000/api/export/users', {
      method: 'GET',
      headers: {
        'Cookie': cookies
      },
      credentials: 'include'
    });
    
    console.log('Export response status:', exportResponse.status);
    console.log('Export response headers:', exportResponse.headers.get('content-type'));
    
    if (!exportResponse.ok) {
      const errorText = await exportResponse.text();
      console.log('Export error:', errorText);
      return;
    }
    
    const contentType = exportResponse.headers.get('content-type');
    
    if (contentType && contentType.includes('text/csv')) {
      console.log('SUCCESS: Got CSV response');
    } else {
      console.log('FAILED: Got non-CSV response');
      const text = await exportResponse.text();
      console.log('Response preview:', text.substring(0, 200));
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testFrontendExport();
