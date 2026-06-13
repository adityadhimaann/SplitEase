import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const MOCK_USD_TO_INR_RATE = 83.45;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: groupId } = await params;
    const { rows } = await req.json();

    if (!rows || !Array.isArray(rows)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: { include: { user: true } },
      },
    });

    if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });

    // Insert everything in a transaction
    const results = await prisma.$transaction(async (tx) => {
      const createdExpenses = [];

      for (const row of rows) {
        // Find payer
        const paidByStr = String(row.paidBy).trim().toLowerCase();
        const payerMember = group.members.find(
          (m) => m.user.email.toLowerCase() === paidByStr || m.user.name.toLowerCase() === paidByStr
        );

        if (!payerMember) {
          console.log(`Skipping row: Payer ${row.paidBy} not found`);
          continue;
        }

        let amountInINR = row.amount;
        if (row.currency.toUpperCase() === "USD") {
          amountInINR = amountInINR * MOCK_USD_TO_INR_RATE;
        }

        const date = new Date(row.date);

        // Find active members for this date
        const activeMembers = group.members.filter(m => {
          const joined = new Date(m.joinedAt);
          const left = m.leftAt ? new Date(m.leftAt) : null;
          return date >= joined && (!left || date <= left);
        });

        if (activeMembers.length === 0) {
          console.log(`Skipping row: No active members for date ${date}`);
          continue;
        }

        const splitAmount = amountInINR / activeMembers.length;

        const expense = await tx.expense.create({
          data: {
            description: row.description || "Imported Expense",
            amount: amountInINR,
            currency: "INR", // Internally we store as INR after conversion
            date: date,
            payerId: payerMember.userId,
            groupId: groupId,
            splits: {
              create: activeMembers.map(m => ({
                userId: m.userId,
                amountOwed: splitAmount,
                splitType: "EQUAL",
              }))
            }
          }
        });

        createdExpenses.push(expense);
      }

      return createdExpenses;
    }, {
      timeout: 30000,
    });

    return NextResponse.json({ success: true, count: results.length });
  } catch (error: any) {
    console.error("Commit error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
