import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import Papa from "papaparse";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: groupId } = await params;
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: { include: { user: true } },
        expenses: true,
      },
    });

    if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });

    const text = await file.text();
    const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
    const rows = parsed.data as any[];

    const analyzedRows = rows.map((row, index) => {
      const anomalies: string[] = [];
      const date = new Date(row.Date);
      let amountStr = String(row.Amount || "").replace(/,/g, '');
      const hasDollar = amountStr.includes('$');
      if (hasDollar) amountStr = amountStr.replace('$', '');
      const amount = parseFloat(amountStr);
      
      const currency = row.Currency || (hasDollar ? 'USD' : 'INR');
      const paidByStr = String(row.PaidBy || "").trim().toLowerCase();
      
      // Find member
      const member = group.members.find(
        (m) => m.user.email.toLowerCase() === paidByStr || m.user.name.toLowerCase() === paidByStr
      );

      if (!member) {
        anomalies.push(`Member "${row.PaidBy}" not found in group`);
      } else {
        // Check date conflict (Meera's Req)
        if (date < new Date(member.joinedAt)) anomalies.push(`Date ${row.Date} is before member joined`);
        if (member.leftAt && date > new Date(member.leftAt)) anomalies.push(`Date ${row.Date} is after member left`);
      }

      // Check amount
      if (isNaN(amount)) {
        anomalies.push(`Invalid amount: ${row.Amount}`);
      } else if (amount < 0) {
        anomalies.push(`Negative amount detected`);
      }

      // Check currency (Priya's Req)
      if (currency.toUpperCase() !== "INR") {
        anomalies.push(`Foreign currency (${currency}) requires conversion`);
      }

      // Check duplicates (Meera's Req)
      const isDuplicate = group.expenses.some(
        (e) => 
          e.amount === amount && 
          e.description.toLowerCase() === String(row.Description || "").toLowerCase() &&
          new Date(e.date).toDateString() === date.toDateString()
      );

      if (isDuplicate) {
        anomalies.push(`Possible duplicate expense`);
      }

      return {
        id: index.toString(),
        date: row.Date,
        description: row.Description,
        paidBy: row.PaidBy,
        amount: amount || 0,
        currency,
        splitType: row.SplitType || "EQUAL",
        anomalies,
        status: anomalies.length > 0 ? "flagged" : "clean"
      };
    });

    return NextResponse.json({ rows: analyzedRows });
  } catch (error) {
    console.error("Analyze error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
