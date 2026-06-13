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

    // Helper: normalize a name for matching
    const normalizeName = (name: string) => name.trim().toLowerCase().replace(/\s+/g, ' ');

    // Helper: find member by name (case-insensitive, strips suffixes like "S")
    const findMember = (nameStr: string) => {
      const normalized = normalizeName(nameStr);
      return group.members.find(
        (m) => 
          m.user.email.toLowerCase() === normalized || 
          m.user.name.toLowerCase() === normalized ||
          // Fuzzy: check if name starts with member name (handles "Priya S" -> "Priya")
          normalized.startsWith(m.user.name.toLowerCase())
      );
    };

    // First pass: parse all rows
    const analyzedRows = rows.map((row, index) => {
      const anomalies: { type: "critical" | "warning" | "info", message: string }[] = [];
      const csvDate = row.Date || row.date;
      const csvAmount = row.Amount || row.amount;
      const csvPaidBy = row.PaidBy || row.paid_by;
      const csvCurrency = row.Currency || row.currency;
      const csvDescription = row.Description || row.description;
      const csvSplitType = row.SplitType || row.split_type;
      const csvSplitWith = row.SplitWith || row.split_with || "";
      const csvSplitDetails = row.SplitDetails || row.split_details || "";
      const csvNotes = row.Notes || row.notes || "";

      // --- Date parsing ---
      let date = new Date(csvDate);
      if (csvDate && csvDate.includes("-")) {
        const parts = csvDate.split("-");
        if (parts.length === 3 && parts[2].length === 4) {
          // DD-MM-YYYY format
          date = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        } else if (parts.length === 2) {
          // Handle cases like "Mar-14"
          date = new Date(`${csvDate}-2026`);
          anomalies.push({ type: "warning", message: `Non-standard date format "${csvDate}" — assumed year 2026` });
        }
      }
      if (isNaN(date.getTime())) {
        anomalies.push({ type: "critical", message: `Invalid date: "${csvDate}"` });
      }

      // --- Amount parsing ---
      let amountStr = String(csvAmount || "").replace(/,/g, '');
      const hasDollar = amountStr.includes('$');
      if (hasDollar) amountStr = amountStr.replace('$', '');
      if (String(csvAmount || "").includes(',')) {
        anomalies.push({ type: "info", message: `Comma in amount "${csvAmount}" — auto-sanitized` });
      }
      const amount = parseFloat(amountStr);
      
      const currency = csvCurrency || (hasDollar ? 'USD' : 'INR');

      // --- Floating point precision ---
      if (!isNaN(amount) && amount > 0) {
        const decimalPart = String(amount).split('.')[1];
        if (decimalPart && decimalPart.length > 2) {
          anomalies.push({ type: "info", message: `Amount has unusual precision (${amount}) — will be rounded to 2 decimal places` });
        }
      }

      // --- Amount validation ---
      if (isNaN(amount)) {
        anomalies.push({ type: "critical", message: `Invalid amount: "${csvAmount}"` });
      } else if (amount < 0) {
        anomalies.push({ type: "warning", message: `Negative amount detected (${amount}) — possible refund` });
      } else if (amount === 0) {
        anomalies.push({ type: "warning", message: `Zero amount — will be excluded` });
      } else if (amount > 10000) {
        anomalies.push({ type: "info", message: `Large expense amount (₹${amount})` });
      }

      // --- Payer validation ---
      const paidByStr = String(csvPaidBy || "").trim();
      if (!paidByStr) {
        anomalies.push({ type: "critical", message: `Missing payer — "paid_by" is blank` });
      } else {
        const member = findMember(paidByStr);
        if (!member) {
          anomalies.push({ type: "critical", message: `Payer "${csvPaidBy}" not found in group` });
        } else {
          // Check if name is not an exact match (fuzzy matched)
          if (member.user.name.toLowerCase() !== paidByStr.toLowerCase()) {
            anomalies.push({ type: "info", message: `Payer "${csvPaidBy}" fuzzy-matched to "${member.user.name}"` });
          }
          // Check date vs membership
          if (!isNaN(date.getTime())) {
            if (date < new Date(member.joinedAt)) {
              anomalies.push({ type: "critical", message: `Date ${csvDate} is before payer "${member.user.name}" joined` });
            }
            if (member.leftAt && date > new Date(member.leftAt)) {
              anomalies.push({ type: "critical", message: `Date ${csvDate} is after payer "${member.user.name}" left` });
            }
          }
        }
      }

      // --- Currency validation ---
      if (!csvCurrency || csvCurrency.trim() === "") {
        anomalies.push({ type: "warning", message: `Missing currency — defaulting to INR` });
      } else if (currency.toUpperCase() !== "INR") {
        anomalies.push({ type: "warning", message: `Foreign currency (${currency}) — will be converted to INR at ₹83.45/USD` });
      }

      // --- Settlement detection ---
      const descLower = String(csvDescription || "").toLowerCase();
      if (descLower.includes("paid") && descLower.includes("back") || descLower.includes("settlement")) {
        anomalies.push({ type: "warning", message: `Possible settlement disguised as expense — "${csvDescription}". Use Settle Up tab instead.` });
      }

      // --- Split validation ---
      const splitWithNames = csvSplitWith ? csvSplitWith.split(";").map((s: string) => s.trim()).filter(Boolean) : [];
      
      // Check for non-members in split_with
      for (const name of splitWithNames) {
        const splitMember = findMember(name);
        if (!splitMember) {
          anomalies.push({ type: "critical", message: `Split member "${name}" is not in the group` });
        } else {
          // Check if this member was active on the expense date
          if (!isNaN(date.getTime())) {
            if (splitMember.leftAt && date > new Date(splitMember.leftAt)) {
              anomalies.push({ type: "critical", message: `Split includes "${splitMember.user.name}" who left the group before ${csvDate}` });
            }
            if (date < new Date(splitMember.joinedAt)) {
              anomalies.push({ type: "warning", message: `Split includes "${splitMember.user.name}" who hadn't joined yet on ${csvDate}` });
            }
          }
        }
      }

      // --- Percentage/Share validation from split_details ---
      const splitType = (csvSplitType || "equal").toLowerCase();
      if (csvSplitDetails && csvSplitDetails.trim()) {
        const detailParts = csvSplitDetails.split(";").map((s: string) => s.trim()).filter(Boolean);
        
        if (splitType === "percentage") {
          // Parse percentages and check they sum to 100
          let totalPercentage = 0;
          for (const part of detailParts) {
            const match = part.match(/([\d.]+)\s*%/);
            if (match) {
              totalPercentage += parseFloat(match[1]);
            }
          }
          if (Math.abs(totalPercentage - 100) > 0.01) {
            anomalies.push({ type: "critical", message: `Percentages sum to ${totalPercentage}% (should be 100%)` });
          }
        }

        // Check split_type vs split_details conflict
        if (splitType === "equal" && detailParts.length > 0) {
          // Check if split_details actually contains shares/amounts
          const hasValues = detailParts.some((p: string) => /\d/.test(p));
          if (hasValues) {
            anomalies.push({ type: "warning", message: `split_type is "equal" but split_details contains values — will use equal split` });
          }
        }
      }

      // --- Duplicate detection against existing DB expenses ---
      const isDuplicateInDB = group.expenses.some(
        (e) => 
          e.amount === amount && 
          e.description.toLowerCase() === String(csvDescription || "").toLowerCase() &&
          new Date(e.date).toDateString() === date.toDateString()
      );
      if (isDuplicateInDB) {
        anomalies.push({ type: "warning", message: `Possible duplicate — matches existing expense in database` });
      }

      // --- DD-MM vs MM-DD ambiguity ---
      if (csvDate && csvDate.includes("-")) {
        const parts = csvDate.split("-");
        if (parts.length === 3 && parts[2].length === 4) {
          const day = parseInt(parts[0]);
          const month = parseInt(parts[1]);
          if (day <= 12 && month <= 12 && day !== month) {
            // Both interpretations are valid — flag if notes mention confusion
            const notesLower = csvNotes.toLowerCase();
            if (notesLower.includes("format") || notesLower.includes("april") || notesLower.includes("may")) {
              anomalies.push({ type: "warning", message: `Ambiguous date "${csvDate}" — DD-MM or MM-DD? Interpreting as DD-MM-YYYY` });
            }
          }
        }
      }

      return {
        id: index.toString(),
        date: csvDate,
        description: csvDescription,
        paidBy: csvPaidBy,
        amount: isNaN(amount) ? 0 : Math.round(amount * 100) / 100,
        currency,
        splitType: csvSplitType || "EQUAL",
        splitWith: csvSplitWith,
        splitDetails: csvSplitDetails,
        anomalies,
        status: anomalies.length > 0 ? "flagged" : "clean"
      };
    });

    // --- Second pass: within-CSV duplicate detection ---
    for (let i = 0; i < analyzedRows.length; i++) {
      for (let j = i + 1; j < analyzedRows.length; j++) {
        const a = analyzedRows[i];
        const b = analyzedRows[j];
        
        // Exact duplicate: same date, same amount
        if (a.date === b.date && a.amount === b.amount && a.amount > 0) {
          const descA = (a.description || "").toLowerCase();
          const descB = (b.description || "").toLowerCase();
          
          // Check if descriptions are similar (exact match or one contains the other)
          if (descA === descB || descA.includes(descB) || descB.includes(descA)) {
            const msg = `Possible duplicate of Row ${i + 1} ("${a.description}")`;
            if (!b.anomalies.some(an => an.message.includes("duplicate"))) {
              b.anomalies.push({ type: "warning", message: msg });
              b.status = "flagged";
            }
          }
        }

        // Fuzzy duplicate: same date, similar description, different amounts (Thalassa case)
        if (a.date === b.date && a.amount !== b.amount && a.amount > 0 && b.amount > 0) {
          const descA = (a.description || "").toLowerCase().replace(/[^a-z]/g, '');
          const descB = (b.description || "").toLowerCase().replace(/[^a-z]/g, '');
          
          // Check if core words overlap significantly
          const wordsA = new Set((a.description || "").toLowerCase().split(/\s+/));
          const wordsB = new Set((b.description || "").toLowerCase().split(/\s+/));
          const overlap = [...wordsA].filter((w: string) => wordsB.has(w) && w.length > 2).length;
          
          if (overlap >= 1 && (descA.includes(descB.substring(0, 5)) || descB.includes(descA.substring(0, 5)))) {
            const msg = `Possible duplicate of Row ${i + 1} ("${a.description}") with different amount — verify which is correct`;
            if (!b.anomalies.some(an => an.message.includes("duplicate"))) {
              b.anomalies.push({ type: "warning", message: msg });
              b.status = "flagged";
            }
          }
        }
      }
    }

    return NextResponse.json({ rows: analyzedRows });
  } catch (error) {
    console.error("Analyze error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
