import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
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

    // Helper: normalize and find member
    const findMember = (nameStr: string) => {
      const normalized = nameStr.trim().toLowerCase();
      return group.members.find(
        (m) =>
          m.user.email.toLowerCase() === normalized ||
          m.user.name.toLowerCase() === normalized ||
          normalized.startsWith(m.user.name.toLowerCase())
      );
    };

    // Insert everything in a transaction
    const results = await prisma.$transaction(async (tx) => {
      const createPromises = rows.map(async (row: any) => {
        // Find payer
        const paidByStr = String(row.paidBy || "").trim();
        const payerMember = findMember(paidByStr);

        if (!payerMember) {
          console.log(`Skipping row: Payer "${row.paidBy}" not found`);
          return null;
        }

        let amountInINR = row.amount;
        if (row.currency && row.currency.toUpperCase() === "USD") {
          amountInINR = amountInINR * MOCK_USD_TO_INR_RATE;
        }
        amountInINR = Math.round(amountInINR * 100) / 100;

        // Skip zero or negative amounts
        if (amountInINR <= 0) {
          console.log(`Skipping row: Invalid amount ${amountInINR}`);
          return null;
        }

        let date = new Date(row.date);
        if (isNaN(date.getTime())) {
          // try DD-MM-YYYY
          const parts = String(row.date).split("-");
          if (parts.length === 3) {
            date = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
          } else if (parts.length === 2) {
            date = new Date(`${row.date}-2026`);
          }
        }

        if (isNaN(date.getTime())) {
          console.log(`Skipping row: Invalid date ${row.date}`);
          return null;
        }

        // Parse split_with to determine who is involved
        const splitWithStr = row.splitWith || "";
        const splitWithNames = splitWithStr ? splitWithStr.split(";").map((s: string) => s.trim()).filter(Boolean) : [];
        
        // Resolve split members
        let splitMembers: typeof group.members = [];
        if (splitWithNames.length > 0) {
          for (const name of splitWithNames) {
            const member = findMember(name);
            if (member) {
              // Check if member was active on this date
              const joined = new Date(member.joinedAt);
              const left = member.leftAt ? new Date(member.leftAt) : null;
              if (date >= joined && (!left || date <= left)) {
                splitMembers.push(member);
              }
            }
          }
        }

        // Fallback: if no valid split members found, use all active members for that date
        if (splitMembers.length === 0) {
          splitMembers = group.members.filter(m => {
            const joined = new Date(m.joinedAt);
            const left = m.leftAt ? new Date(m.leftAt) : null;
            return date >= joined && (!left || date <= left);
          });
        }

        if (splitMembers.length === 0) {
          console.log(`Skipping row: No active members for date ${date}`);
          return null;
        }

        // Determine split type and calculate individual amounts
        const splitType = (row.splitType || "equal").toLowerCase();
        const splitDetailsStr = row.splitDetails || "";
        let splits: { userId: string; amountOwed: number; splitType: string }[] = [];

        if (splitType === "unequal" && splitDetailsStr) {
          // Parse "Rohan 700; Priya 400; Meera 400"
          const detailParts = splitDetailsStr.split(";").map((s: string) => s.trim()).filter(Boolean);
          for (const part of detailParts) {
            const match = part.match(/^(.+?)\s+([\d.]+)$/);
            if (match) {
              const name = match[1].trim();
              const exactAmount = parseFloat(match[2]);
              const member = findMember(name);
              if (member && !isNaN(exactAmount)) {
                splits.push({
                  userId: member.userId,
                  amountOwed: row.currency?.toUpperCase() === "USD" ? Math.round(exactAmount * MOCK_USD_TO_INR_RATE * 100) / 100 : exactAmount,
                  splitType: "EXACT",
                });
              }
            }
          }
        } else if (splitType === "percentage" && splitDetailsStr) {
          // Parse "Aisha 30%; Rohan 30%; Priya 30%; Meera 20%"
          const detailParts = splitDetailsStr.split(";").map((s: string) => s.trim()).filter(Boolean);
          for (const part of detailParts) {
            const match = part.match(/^(.+?)\s+([\d.]+)\s*%$/);
            if (match) {
              const name = match[1].trim();
              const percentage = parseFloat(match[2]);
              const member = findMember(name);
              if (member && !isNaN(percentage)) {
                splits.push({
                  userId: member.userId,
                  amountOwed: Math.round((amountInINR * percentage / 100) * 100) / 100,
                  splitType: "PERCENTAGE",
                });
              }
            }
          }
        } else if (splitType === "share" && splitDetailsStr) {
          // Parse "Aisha 1; Rohan 2; Priya 1; Dev 2"
          const detailParts = splitDetailsStr.split(";").map((s: string) => s.trim()).filter(Boolean);
          let totalShares = 0;
          const shareMap: { userId: string; shares: number }[] = [];
          
          for (const part of detailParts) {
            const match = part.match(/^(.+?)\s+([\d.]+)$/);
            if (match) {
              const name = match[1].trim();
              const shares = parseFloat(match[2]);
              const member = findMember(name);
              if (member && !isNaN(shares)) {
                shareMap.push({ userId: member.userId, shares });
                totalShares += shares;
              }
            }
          }

          if (totalShares > 0) {
            for (const entry of shareMap) {
              splits.push({
                userId: entry.userId,
                amountOwed: Math.round((amountInINR * entry.shares / totalShares) * 100) / 100,
                splitType: "SHARES",
              });
            }
          }
        }

        // Fallback to equal split if no specific splits were parsed
        if (splits.length === 0) {
          const splitAmount = Math.round((amountInINR / splitMembers.length) * 100) / 100;
          splits = splitMembers.map(m => ({
            userId: m.userId,
            amountOwed: splitAmount,
            splitType: "EQUAL",
          }));
        }

        return tx.expense.create({
          data: {
            description: row.description || "Imported Expense",
            amount: amountInINR,
            currency: "INR", // Internally we store as INR after conversion
            date: date,
            payerId: payerMember.userId,
            groupId: groupId,
            splits: {
              create: splits,
            }
          }
        });
      });

      const resultsArray = await Promise.all(createPromises);
      return resultsArray.filter(e => e !== null);
    }, {
      timeout: 60000,
    });

    return NextResponse.json({ success: true, count: results.length });
  } catch (error: any) {
    console.error("Commit error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
