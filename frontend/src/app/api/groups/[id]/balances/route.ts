import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const groupId = params.id;

  try {
    // 1. Fetch all expenses for the group with their splits
    const expenses = await prisma.expense.findMany({
      where: { groupId },
      include: { splits: true, payer: { select: { id: true, name: true } } },
    });

    // 2. Fetch all members of the group
    const groupMembers = await prisma.groupMember.findMany({
      where: { groupId },
      include: { user: { select: { id: true, name: true } } },
    });

    // Balances tracking
    // For each user, we track their net balance. 
    // Positive means they are owed money (they paid more than their share).
    // Negative means they owe money (they paid less than their share).
    const balances: Record<string, { id: string, name: string, balance: number, details: any[] }> = {};

    groupMembers.forEach((member) => {
      balances[member.userId] = { id: member.userId, name: member.user.name, balance: 0, details: [] };
    });

    // 3. Process expenses
    expenses.forEach((expense) => {
      // The payer gets credited the total amount
      if (balances[expense.payerId]) {
        balances[expense.payerId].balance += expense.amount;
      }

      // Everyone who owes money gets debited
      expense.splits.forEach((split) => {
        if (balances[split.userId]) {
          balances[split.userId].balance -= split.amountOwed;
          
          // Store details for Rohan's requirement: "No magic numbers"
          if (split.amountOwed > 0) {
             balances[split.userId].details.push({
               expenseId: expense.id,
               description: expense.description,
               owedAmount: split.amountOwed,
               totalAmount: expense.amount,
               payerName: expense.payer?.name,
               date: expense.date
             });
          }
        }
      });
    });

    // 4. Calculate settlement plan (Who owes whom)
    // Greedy algorithm: match biggest debtors with biggest creditors
    const debtors = Object.values(balances).filter(b => b.balance < -0.01).sort((a, b) => a.balance - b.balance);
    const creditors = Object.values(balances).filter(b => b.balance > 0.01).sort((a, b) => b.balance - a.balance);

    const settlements = [];
    let i = 0; // debtors index
    let j = 0; // creditors index

    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i];
      const creditor = creditors[j];

      const amountToSettle = Math.min(Math.abs(debtor.balance), creditor.balance);

      settlements.push({
        from: debtor.name,
        fromId: debtor.id,
        to: creditor.name,
        toId: creditor.id,
        amount: parseFloat(amountToSettle.toFixed(2))
      });

      debtor.balance += amountToSettle;
      creditor.balance -= amountToSettle;

      if (Math.abs(debtor.balance) < 0.01) i++;
      if (creditor.balance < 0.01) j++;
    }

    return NextResponse.json({ 
      success: true, 
      balances: Object.values(balances).map(b => ({ ...b, balance: parseFloat(b.balance.toFixed(2)) })),
      settlements 
    });
  } catch (error) {
    console.error("Error calculating balances:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
