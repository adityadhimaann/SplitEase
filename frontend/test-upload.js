const fs = require('fs');

async function testAnalyze() {
  const fileContent = fs.readFileSync('Expenses Export.csv');
  const blob = new Blob([fileContent], { type: 'text/csv' });
  const formData = new FormData();
  formData.append('file', blob, 'Expenses Export.csv');

  try {
    // We need a valid group ID.
    // Let's first register, create group, then analyze
    const baseUrl = 'http://localhost:3000/api';
    const email = `test_${Date.now()}@test.com`;
    let res = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test User', email, password: 'password123' })
    });
    const cookieHeader = res.headers.get('set-cookie').split(';')[0];
    
    res = await fetch(`${baseUrl}/groups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': cookieHeader },
      body: JSON.stringify({ name: 'Test Group' })
    });
    const groupData = await res.json();
    const groupId = groupData.group.id;

    res = await fetch(`${baseUrl}/groups/${groupId}/import/analyze`, {
      method: 'POST',
      headers: { 'Cookie': cookieHeader },
      body: formData
    });
    const result = await res.json();
    console.log("Analyze result rows count:", result.rows?.length);
    if (result.rows?.length > 0) {
       console.log("First row from API:", result.rows[0]);
    } else {
       console.log("Error from API:", result);
    }
  } catch(e) {
    console.error(e);
  }
}
testAnalyze();
