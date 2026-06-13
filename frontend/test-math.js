const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMath() {
  const expenses = await prisma.expense.findMany({
    include: { splits: true, payer: true }
  });

  const validRowsInCSV = [
    { desc: "February rent", amt: 48000 },
    { desc: "Groceries BigBasket", amt: 2340 },
    { desc: "Wifi bill Feb", amt: 1199 },
    { desc: "Electricity Feb", amt: 1200 },
    { desc: "Maid salary Feb", amt: 3000 },
    { desc: "Movie night snacks", amt: 640 },
    { desc: "Cylinder refill", amt: 899.995 },
    { desc: "Aisha birthday cake", amt: 1500 },
    { desc: "Rohan paid Aisha back", amt: 5000 },
    { desc: "Pizza Friday", amt: 1440 },
    { desc: "March rent", amt: 48000 },
    { desc: "Groceries BigBasket", amt: 2810 },
    { desc: "Wifi bill Mar", amt: 1199 },
    { desc: "Goa flights", amt: 32400 },
    { desc: "Scooter rentals", amt: 3600 },
    { desc: "Dinner at Thalassa", amt: 2400 },
    { desc: "Thalassa dinner", amt: 2450 },
    { desc: "Groceries DMart", amt: 2105 },
    { desc: "Electricity Mar", amt: 1450 },
    { desc: "Maid salary Mar", amt: 3000 },
    { desc: "Dinner order Swiggy", amt: 0 },
    { desc: "Weekend brunch", amt: 2200 },
    { desc: "Meera farewell dinner", amt: 4800 },
    { desc: "Deep cleaning service", amt: 2500 },
    { desc: "April rent", amt: 48000 },
    { desc: "Groceries BigBasket", amt: 2640 },
    { desc: "Wifi bill Apr", amt: 1199 },
    { desc: "Electricity Apr", amt: 1380 },
    { desc: "Furniture for common room", amt: 12000 },
    { desc: "Maid salary Apr", amt: 3000 }
  ];

  console.log(`\n=== EXPECTED TOTALS FROM CSV VALID ROWS ===`);
  const expectedTotal = validRowsInCSV.reduce((sum, e) => sum + e.amt, 0);
  console.log(`Expected Rows: 30`);
  console.log(`Expected Total (INR): ₹${expectedTotal.toFixed(2)}`);

  console.log(`\n=== ACTUAL TOTALS IN DATABASE ===`);
  // Filter for only imported ones (they have 'EQUAL' splits)
  console.log(`Total Expenses in DB: ${expenses.length}`);
  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);
  console.log(`Total Amount in DB (INR): ₹${totalAmount.toFixed(2)}`);

  if (Math.abs(expectedTotal - totalAmount) < 0.1) {
    console.log(`\n✅ MATH MATCHES PERFECTLY! The CSV imported exactly the right valid amounts.`);
  } else {
    console.log(`\n❌ MATH MISMATCH! Expected ${expectedTotal} but got ${totalAmount}`);
    console.log("Expenses in DB:");
    expenses.forEach(e => console.log(` - ${e.description} | ${e.amount}`));
  }
}

checkMath().catch(console.error).finally(() => prisma.$disconnect());
