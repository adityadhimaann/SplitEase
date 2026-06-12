import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { description, amount, currency, date, groupId, payerId, splits } = await req.json();

    if (!description || !amount || !groupId || !payerId || !splits || splits.length === 0) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify the total splits equal the total amount
    const totalSplits = splits.reduce((acc: number, split: any) => acc + (split.amountOwed || 0), 0);
    // Allow minor floating point discrepancies
    if (Math.abs(totalSplits - amount) > 0.05) {
      return NextResponse.json({ error: `Splits sum (${totalSplits}) does not match total amount (${amount})` }, { status: 400 });
    }

    // Wrap in a transaction to ensure all or nothing
    const expense = await prisma.$transaction(async (tx) => {
      const newExpense = await tx.expense.create({
        data: {
          description,
          amount: parseFloat(amount),
          currency,
          date: new Date(date),
          groupId,
          payerId,
        }
      });

      const splitData = splits.map((split: any) => ({
        expenseId: newExpense.id,
        userId: split.userId,
        amountOwed: parseFloat(split.amountOwed),
        splitType: split.splitType,
        splitValue: split.splitValue ? parseFloat(split.splitValue) : null,
      }));

      await tx.expenseSplit.createMany({
        data: splitData
      });

      return newExpense;
    });

    return NextResponse.json({ success: true, expense });
  } catch (error) {
    console.error("Failed to create expense:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const groupId = searchParams.get('groupId');

  if (!groupId) {
    return NextResponse.json({ error: "groupId is required" }, { status: 400 });
  }

  const expenses = await prisma.expense.findMany({
    where: { groupId },
    include: {
      payer: { select: { id: true, name: true } },
      splits: {
        include: {
          user: { select: { id: true, name: true } }
        }
      }
    },
    orderBy: { date: 'desc' }
  });

  return NextResponse.json({ expenses });
}
