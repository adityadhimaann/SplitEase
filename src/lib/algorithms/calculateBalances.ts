import { prisma } from "@/lib/prisma";
import { minimizeDebt, UserBalance, Transaction } from "./minimizeDebt";

export async function getGroupBalances(groupId: string) {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true } } } },
    },
  });

  if (!group) return null;

  const expenses = await prisma.expense.findMany({
    where: { groupId },
    include: { splits: true },
  });

  const settlements = await prisma.settlement.findMany({
    where: { groupId },
  });

  const balancesMap = new Map<string, number>();

  for (const member of group.members) {
    balancesMap.set(member.userId, 0);
  }

  for (const expense of expenses) {
    const currentPayerBalance = balancesMap.get(expense.payerId) || 0;
    balancesMap.set(expense.payerId, currentPayerBalance + expense.amount);

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

  for (const settlement of settlements) {
    const payerBal = balancesMap.get(settlement.payerId) || 0;
    balancesMap.set(settlement.payerId, payerBal + settlement.amount);

    const payeeBal = balancesMap.get(settlement.payeeId) || 0;
    balancesMap.set(settlement.payeeId, payeeBal - settlement.amount);
  }

  const userBalances: UserBalance[] = [];
  for (const [userId, balance] of balancesMap.entries()) {
    userBalances.push({ userId, balance: Math.round(balance * 100) / 100 });
  }

  const optimalTransactions = minimizeDebt(userBalances.map(b => ({ ...b })));

  const enrichedTransactions = optimalTransactions.map(t => ({
    ...t,
    payer: group.members.find(m => m.userId === t.payerId)?.user,
    payee: group.members.find(m => m.userId === t.payeeId)?.user,
  }));

  const enrichedBalances = userBalances.map(b => ({
    ...b,
    user: group.members.find(m => m.userId === b.userId)?.user,
  }));

  return { balances: enrichedBalances, transactions: enrichedTransactions, group, expenses, settlements };
}
