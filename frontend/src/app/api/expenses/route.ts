import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { description, amount, currency, date, groupId, payerId, splits } = body;

    if (!description || !amount || !groupId || !payerId || !splits) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Optionally handle currency conversion if USD
    let finalAmount = amount;
    if (currency === "USD") {
      finalAmount = amount * 83.45; // Mock rate
    }

    const expense = await prisma.expense.create({
      data: {
        description,
        amount: finalAmount,
        currency: "INR", // Internal currency
        date: new Date(date),
        payerId,
        groupId,
        splits: {
          create: splits.map((s: any) => ({
            userId: s.userId,
            amountOwed: currency === "USD" ? s.amountOwed * 83.45 : s.amountOwed,
            splitType: s.splitType || "EQUAL",
          }))
        }
      }
    });

    return NextResponse.json({ success: true, expense });
  } catch (error: any) {
    console.error("Error creating expense:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
