import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function getBalances() {
  const groupId = '9157a2df-da76-4b16-864d-34351f19acad';
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      members: { include: { user: true } },
    },
  });

  const expenses = await prisma.expense.findMany({
    where: { groupId },
    include: { splits: true },
  });

  console.log(`Found ${expenses.length} expenses`);

  const balancesMap = new Map<string, number>();

  for (const member of group.members) {
    balancesMap.set(member.userId, 0);
  }

  for (const expense of expenses) {
    const currentPayerBalance = balancesMap.get(expense.payerId) || 0;
    balancesMap.set(expense.payerId, currentPayerBalance + expense.amount);
    
    // DEBUG: print after payer addition
    // console.log(`Added ${expense.amount} to payer ${expense.payerId}. New bal: ${balancesMap.get(expense.payerId)}`);

    for (const split of expense.splits) {
      const member = group.members.find((m) => m.userId === split.userId);
      if (member) {
        const isAfterJoined = new Date(expense.date) >= new Date(member.joinedAt);
        const isBeforeLeft = !member.leftAt || new Date(expense.date) <= new Date(member.leftAt);

        if (isAfterJoined && isBeforeLeft) {
          const currentUserBalance = balancesMap.get(split.userId) || 0;
          balancesMap.set(split.userId, currentUserBalance - split.amountOwed);
        }
      }
    }
  }

  for (const [userId, balance] of balancesMap.entries()) {
    console.log(`Final for ${userId}: ${balance}`);
  }
}

getBalances().finally(() => prisma.$disconnect());
