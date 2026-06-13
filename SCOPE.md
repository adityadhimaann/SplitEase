# Scope & Anomaly Log

## Database Schema

We use Prisma with PostgreSQL (Supabase). Below is the complete schema:

```prisma
model User {
  id            String         @id @default(uuid())
  name          String
  email         String         @unique
  passwordHash  String
  createdAt     DateTime       @default(now())
  
  memberships   GroupMember[]
  paidExpenses  Expense[]      @relation("PaidExpenses")
  expenseSplits ExpenseSplit[]
  sentPayments  Settlement[]   @relation("SentPayments")
  recvPayments  Settlement[]   @relation("ReceivedPayments")
}

model Group {
  id          String         @id @default(uuid())
  name        String
  createdAt   DateTime       @default(now())
  
  members     GroupMember[]
  expenses    Expense[]
  settlements Settlement[]
}

model GroupMember {
  id        String    @id @default(uuid())
  userId    String
  groupId   String
  joinedAt  DateTime  @default(now())
  leftAt    DateTime?    // null = still active
  
  user      User      @relation(fields: [userId], references: [id])
  group     Group     @relation(fields: [groupId], references: [id])

  @@unique([userId, groupId])
}

model Expense {
  id          String         @id @default(uuid())
  description String
  amount      Float
  currency    String         @default("INR")
  date        DateTime
  payerId     String
  groupId     String
  createdAt   DateTime       @default(now())
  
  payer       User           @relation("PaidExpenses", fields: [payerId], references: [id])
  group       Group          @relation(fields: [groupId], references: [id])
  splits      ExpenseSplit[]
}

model ExpenseSplit {
  id          String   @id @default(uuid())
  expenseId   String
  userId      String
  amountOwed  Float
  splitType   String   // "EQUAL", "EXACT", "PERCENTAGE", "SHARES"
  splitValue  Float?
  
  expense     Expense  @relation(fields: [expenseId], references: [id])
  user        User     @relation(fields: [userId], references: [id])
}

model Settlement {
  id        String   @id @default(uuid())
  payerId   String
  payeeId   String
  groupId   String
  amount    Float
  currency  String   @default("INR")
  date      DateTime @default(now())
  
  payer     User     @relation("SentPayments", fields: [payerId], references: [id])
  payee     User     @relation("ReceivedPayments", fields: [payeeId], references: [id])
  group     Group    @relation(fields: [groupId], references: [id])
}
```

### Key Design Decisions in the Schema

- **`GroupMember.joinedAt` / `leftAt`**: This is how we solve Sam's requirement. Sam joined mid-April, so `calculateBalances.ts` checks `if (expense.date >= member.joinedAt && expense.date <= member.leftAt)` for every split. March electricity never touches Sam.
- **`ExpenseSplit.splitType`**: Stores the method used (EQUAL, EXACT, PERCENTAGE, SHARES) so Rohan can trace exactly how his ₹2,300 was calculated.
- **`Settlement`**: A separate model from `Expense` to prevent settlements from polluting the expense math.

---

## CSV Anomaly Log

During the development of the CSV Import feature, the following data problems were identified in the `Expenses Export.csv` file. The file contains **43 data rows** (excluding the header).

| # | Row(s) | Anomaly | Detection Method | Handling Strategy |
|:--|:-------|:--------|:----------------|:-----------------|
| 1 | **5 & 6** | **Duplicate entries** — "Dinner at Marina Bites" vs "dinner - marina bites" (same date, same amount, different casing) | Within-CSV duplicate detection: compares every row pair for matching date+amount and similar descriptions | Flagged as `WARNING: Possible duplicate`. User unchecks Row 6 to exclude it. |
| 2 | **7** | **Comma in amount** — `"1,200"` | Parser strips commas before `parseFloat()` | Auto-sanitized to `1200`. Flagged as `INFO`. |
| 3 | **9** | **Lowercase payer** — `priya` instead of `Priya` | Case-insensitive member lookup | Auto-matched. Flagged as `INFO: fuzzy-matched`. |
| 4 | **10** | **Floating point precision** — `899.995` (3 decimal places) | Detects >2 decimal digits in amount | Flagged as `INFO`. Rounded to `900.00` on commit. |
| 5 | **11** | **Name variant** — `Priya S` instead of `Priya` | Fuzzy matching: checks if input starts with a known member's name | Flagged as `INFO: fuzzy-matched to Priya`. |
| 6 | **12** | **Unequal split** — `split_type=unequal` with explicit amounts in `split_details` | Commit route parses `split_details` for exact amounts | Parsed as `Rohan 700; Priya 400; Meera 400` and stored as EXACT splits. |
| 7 | **13** | **Missing payer** — `paid_by` field is blank | Checks for empty string in `paid_by` | Flagged as `CRITICAL: Missing payer`. Blocked from import. |
| 8 | **14** | **Settlement disguised as expense** — "Rohan paid Aisha back" | Keyword detection: description contains "paid" + "back" | Flagged as `WARNING: Possible settlement`. User excludes and logs via Settle Up tab. |
| 9 | **15 & 32** | **Percentages sum to 110%** — `30+30+30+20 = 110` | Parses `split_details` percentages and validates sum equals 100% | Flagged as `CRITICAL: Percentages sum to 110%`. Blocked until corrected. |
| 10 | **20, 21, 23** | **Foreign currency (USD)** | Currency field check against "INR" | Flagged as `WARNING: Foreign currency`. Auto-converted at ₹83.45/USD on commit. |
| 11 | **22** | **Share-based split** — `split_type=share` with `Aisha 1; Rohan 2; Priya 1; Dev 2` | Commit route parses share values and calculates proportional amounts | Parsed correctly: Rohan and Dev pay 2/6, Aisha and Priya pay 1/6 each. |
| 12 | **23** | **Non-member in split** — "Dev's friend Kabir" in `split_with` | Analyze route parses `split_with` and checks each name against group members | Flagged as `CRITICAL: Split member "Dev's friend Kabir" is not in the group`. |
| 13 | **24 & 25** | **Fuzzy duplicate** — "Dinner at Thalassa" (₹2400, Aisha) vs "Thalassa dinner" (₹2450, Rohan), same date, different amounts | Fuzzy duplicate detection: same-date rows with overlapping description words | Flagged as `WARNING: Possible duplicate with different amount`. User decides which is correct. |
| 14 | **26** | **Negative amount** — `-30` (parasailing refund) | Amount < 0 check | Flagged as `WARNING: Negative amount — possible refund`. Excluded. |
| 15 | **27** | **Non-standard date** — `Mar-14` instead of DD-MM-YYYY | Date parsing fallback: detects 2-part hyphenated dates | Parsed as `March 14, 2026`. Flagged as `WARNING: Non-standard date format`. |
| 16 | **28** | **Missing currency** — currency field is blank | Empty currency check | Flagged as `WARNING: Missing currency — defaulting to INR`. |
| 17 | **31** | **Zero amount** | Amount === 0 check | Flagged as `WARNING: Zero amount`. Excluded from commit. |
| 18 | **34** | **Ambiguous date** — `04-05-2026` with notes saying "is this April 5 or May 4?" | Cross-references notes for date confusion keywords | Flagged as `WARNING: Ambiguous date`. Interpreted as DD-MM-YYYY (April 5). |
| 19 | **36** | **Inactive member in split** — Meera in `split_with` but she left the group on 28-03-2026, expense is 02-04-2026 | Parses `split_with`, checks each member's `leftAt` against expense date | Flagged as `CRITICAL: Split includes "Meera" who left the group before 02-04-2026`. |
| 20 | **42** | **Split type conflicts split details** — `split_type=equal` but `split_details` has shares | Detects presence of numeric values in `split_details` when `split_type=equal` | Flagged as `WARNING: split_type is "equal" but split_details contains values`. Uses equal split. |

This robust validation pipeline ensures that bad data never reaches the database without explicit user consent and correction.
