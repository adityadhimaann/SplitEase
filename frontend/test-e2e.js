const fs = require('fs');
const path = require('path');

async function runTest() {
  const baseUrl = 'http://localhost:3000/api';
  let cookieHeader = '';

  console.log("--- Starting E2E Functionality Test ---");

  try {
    // 1. Register User A
    console.log("1. Registering User A...");
    const emailA = `usera_${Date.now()}@test.com`;
    let res = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'User A', email: emailA, password: 'password123' })
    });
    let data = await res.json();
    if (!data.success) throw new Error("Failed to register User A: " + JSON.stringify(data));
    
    // Save the cookie to simulate login
    const cookies = res.headers.get('set-cookie');
    if (cookies) {
      cookieHeader = cookies.split(';')[0];
    } else {
      throw new Error("No cookie received on register.");
    }
    console.log("✅ User A registered and logged in.");

    // 2. Create Group
    console.log("2. Creating Group...");
    res = await fetch(`${baseUrl}/groups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': cookieHeader },
      body: JSON.stringify({ name: 'E2E Test Group' })
    });
    data = await res.json();
    if (!data.success) throw new Error("Failed to create group: " + JSON.stringify(data));
    const groupId = data.group.id;
    console.log(`✅ Group created (ID: ${groupId}).`);

    // 3. Register User B & C directly via Prisma just to have them in DB quickly,
    // or register them via API and login again. Let's just use API and clear cookies, but we need User A's cookie to add them.
    console.log("3. Creating User B & C...");
    const emailB = `userb_${Date.now()}@test.com`;
    const emailC = `userc_${Date.now()}@test.com`;
    
    await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'User B', email: emailB, password: 'password123' })
    });
    await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'User C', email: emailC, password: 'password123' })
    });
    console.log("✅ User B & C registered.");

    // 4. Add User B & C to group
    console.log("4. Adding User B & C to Group...");
    res = await fetch(`${baseUrl}/groups/${groupId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': cookieHeader },
      body: JSON.stringify({ email: emailB })
    });
    if (!res.ok) throw new Error("Failed to add User B.");
    res = await fetch(`${baseUrl}/groups/${groupId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': cookieHeader },
      body: JSON.stringify({ email: emailC })
    });
    if (!res.ok) throw new Error("Failed to add User C.");
    console.log("✅ Members added.");

    // 5. Get Group Members to get their IDs
    console.log("5. Fetching groups to get member IDs...");
    res = await fetch(`${baseUrl}/groups`, {
      headers: { 'Cookie': cookieHeader }
    });
    data = await res.json();
    const group = data.groups.find(g => g.id === groupId);
    const memberA = group.members.find(m => m.user.name === 'User A').userId;
    const memberB = group.members.find(m => m.user.name === 'User B').userId;
    const memberC = group.members.find(m => m.user.name === 'User C').userId;
    console.log(`✅ IDs retrieved. A: ${memberA}, B: ${memberB}, C: ${memberC}`);

    // 6. Create Expense (A paid 300, split equal)
    console.log("6. Creating an expense...");
    res = await fetch(`${baseUrl}/expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': cookieHeader },
      body: JSON.stringify({
        description: 'E2E Dinner',
        amount: 300,
        currency: 'INR',
        date: new Date().toISOString(),
        groupId: groupId,
        payerId: memberA,
        splits: [
          { userId: memberA, amountOwed: 100, splitType: 'EQUAL' },
          { userId: memberB, amountOwed: 100, splitType: 'EQUAL' },
          { userId: memberC, amountOwed: 100, splitType: 'EQUAL' },
        ]
      })
    });
    data = await res.json();
    if (!data.success) throw new Error("Failed to create expense: " + JSON.stringify(data));
    console.log("✅ Expense created successfully.");

    // 7. Calculate Balances
    console.log("7. Calculating balances & optimal transactions...");
    res = await fetch(`${baseUrl}/groups/${groupId}/balances`, {
      headers: { 'Cookie': cookieHeader }
    });
    data = await res.json();
    
    console.log("   -> Balances returned:", JSON.stringify(data.balances, null, 2));
    console.log("   -> Transactions returned:", JSON.stringify(data.transactions, null, 2));

    const transAtoB = data.transactions.some(t => (t.payerId === memberB && t.payeeId === memberA && t.amount === 100));
    const transAtoC = data.transactions.some(t => (t.payerId === memberC && t.payeeId === memberA && t.amount === 100));

    if (transAtoB && transAtoC) {
      console.log("✅ Debt minimization works perfectly! B & C correctly owe A ₹100 each.");
    } else {
      console.error("❌ Unexpected debt optimization output.");
    }

    console.log("--- E2E Test Completed Successfully ---");

  } catch (e) {
    console.error("❌ Test Failed:", e.message);
  }
}

runTest();
