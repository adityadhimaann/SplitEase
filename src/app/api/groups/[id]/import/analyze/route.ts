import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
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
      const anomalies: { type: "critical" | "warning" | "info", message: string }[] = [];
      const csvDate = row.Date || row.date;
      const csvAmount = row.Amount || row.amount;
      const csvPaidBy = row.PaidBy || row.paid_by;
      const csvCurrency = row.Currency || row.currency;
      const csvDescription = row.Description || row.description;
      const csvSplitType = row.SplitType || row.split_type;

      let date = new Date(csvDate);
      if (csvDate && csvDate.includes("-")) {
        const parts = csvDate.split("-");
        if (parts.length === 3 && parts[2].length === 4) {
          date = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        } else if (parts.length === 2) {
          // Handle cases like Mar-14 (assuming current year or explicit format)
          date = new Date(`${csvDate}-2026`);
        }
      }
      let amountStr = String(csvAmount || "").replace(/,/g, '');
      const hasDollar = amountStr.includes('$');
      if (hasDollar) amountStr = amountStr.replace('$', '');
      const amount = parseFloat(amountStr);
      
      const currency = csvCurrency || (hasDollar ? 'USD' : 'INR');
      const paidByStr = String(csvPaidBy || "").trim().toLowerCase();
      
      // Find member
      const member = group.members.find(
        (m) => m.user.email.toLowerCase() === paidByStr || m.user.name.toLowerCase() === paidByStr
      );

      if (!member) {
        anomalies.push({ type: "critical", message: `Member "${csvPaidBy}" not found in group` });
      } else {
        // Check date conflict (Meera's Req)
        if (date < new Date(member.joinedAt)) anomalies.push({ type: "critical", message: `Date ${csvDate} is before member joined` });
        if (member.leftAt && date > new Date(member.leftAt)) anomalies.push({ type: "critical", message: `Date ${csvDate} is after member left` });
      }

      // Check amount
      if (isNaN(amount)) {
        anomalies.push({ type: "warning", message: `Invalid amount: ${csvAmount}` });
      } else if (amount < 0) {
        anomalies.push({ type: "warning", message: `Negative amount detected` });
      } else if (amount > 10000) {
        anomalies.push({ type: "info", message: `Unusually large expense amount` });
      }

      // Check currency (Priya's Req)
      if (currency.toUpperCase() !== "INR") {
        anomalies.push({ type: "warning", message: `Foreign currency (${currency}) requires conversion` });
      }

      // Check duplicates (Meera's Req)
      const isDuplicate = group.expenses.some(
        (e) => 
          e.amount === amount && 
          e.description.toLowerCase() === String(csvDescription || "").toLowerCase() &&
          new Date(e.date).toDateString() === date.toDateString()
      );

      if (isDuplicate) {
        anomalies.push({ type: "warning", message: `Possible duplicate expense` });
      }

      return {
        id: index.toString(),
        date: csvDate,
        description: csvDescription,
        paidBy: csvPaidBy,
        amount: amount || 0,
        currency,
        splitType: csvSplitType || "EQUAL",
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
