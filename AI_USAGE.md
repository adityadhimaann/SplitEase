# AI Usage Log

## AI Tools Used
- **Google Antigravity (Agentic AI Assistant)**: Used directly within the IDE as a pair programming collaborator for architecture design, API scaffolding, algorithm implementation, and UI development.

## Key Prompts Used

1. *"I have this assignment to build SplitEase. Please analyze this CSV, identify all the deliberate anomalies, and give me the workflow and architecture."*
   → Generated the initial architecture, identified the flat mate requirements, and produced an implementation plan.

2. *"Build the backend first. Set up Prisma schema for users, groups, expenses, and splits, and make sure we can handle time-scoped memberships."*
   → Scaffolded the database schema with `GroupMember.joinedAt/leftAt` for Sam's requirement.

3. *"Write an algorithm to minimize the total number of transactions to settle debts among a group of people."*
   → Generated the greedy algorithm in `minimizeDebt.ts` that matches the largest debtor to the largest creditor iteratively.

4. *"Create a two-step CSV import pipeline. Endpoint 1 should analyze and return anomalies, Endpoint 2 should commit the clean data and convert USD to INR."*
   → Created the `/analyze` and `/commit` API routes. Later significantly reworked to parse `split_with` and `split_details` columns properly.

5. *"Deploy this to Vercel with Supabase. The login is throwing a 500 error."*
   → Diagnosed that Vercel's IPv6-only network couldn't reach Supabase's direct connection (port 5432), and required the Transaction Pooler URL with `?pgbouncer=true`.

## Concrete Cases Where AI Produced Something Wrong & How I Fixed It

**Case 1: Import commit route silently did equal splits for all split types**
- **What went wrong**: The AI generated a commit route (`/api/groups/[id]/import/commit`) that calculated `amountInINR / activeMembers.length` for *every* row, completely ignoring the `split_type`, `split_with`, and `split_details` CSV columns. This meant that `unequal`, `percentage`, and `share` splits were all stored as equal splits — making the balance calculations wrong for rows like Row 12 (Aisha's birthday cake with unequal amounts) and Row 22 (scooter rentals with share ratios).
- **How I caught it**: During a deep audit, I traced through what happens when the CSV's Row 12 (`split_type=unequal, split_details="Rohan 700; Priya 400; Meera 400"`) hits the commit endpoint. Line 69 just divided by the number of active members, ignoring the explicit amounts entirely.
- **What I changed**: I rewrote the entire commit route to parse `split_details` based on `split_type`:
  - `unequal`: Parses `"Name Amount"` pairs and stores exact amounts.
  - `percentage`: Parses `"Name XX%"` pairs, calculates `amount * percentage / 100`.
  - `share`: Parses `"Name N"` pairs, calculates proportional amounts from total shares.
  - Falls back to equal split only when no valid split details are found.

**Case 2: Import analyzer didn't parse `split_with` or `split_details` at all**
- **What went wrong**: The AI's initial `analyze` endpoint only validated `date`, `amount`, `paid_by`, and `currency`. It never read the `split_with` or `split_details` CSV columns. This meant it couldn't detect critical anomalies like:
  - "Dev's friend Kabir" (a non-member) being listed in `split_with` (Row 23)
  - Percentages summing to 110% instead of 100% (Rows 15 & 32)
  - Meera still being listed in `split_with` after leaving the group (Row 36)
- **How I caught it**: I cross-referenced every anomaly documented in `SCOPE.md` against the actual code. The docs claimed these were detected, but the code had no logic to parse those columns.
- **What I changed**: Added full `split_with` parsing (checks each name against group members, validates membership dates), `split_details` parsing (validates percentage sums, detects `split_type` vs `split_details` conflicts), and within-CSV duplicate detection (the original only checked against the database).

**Case 3: Prisma Client Constructor Error with Turbopack**
- **What went wrong**: The AI generated a standard Prisma client instantiation. However, when running with Next.js 16.2.9's Turbopack bundler, it threw `PrismaClientConstructorValidationError: Using engine type "client" requires either "adapter" or "accelerateUrl"`.
- **How I caught it**: The Next.js development server crashed immediately when hitting `/api/auth/register`.
- **What I changed**: I updated `next.config.ts` to include `serverExternalPackages: ['prisma', '@prisma/client', 'bcryptjs']` and used a `globalThis.prisma` singleton pattern in `src/lib/prisma.ts` to prevent multiple Prisma instances during hot reload.

**Case 4: Dashboard balance calculation used only 5 recent expenses**
- **What went wrong**: The AI generated a dashboard that fetched only the 5 most recent expenses (`take: 5`) and calculated the user's total balance from just those 5 rows. With 34+ expenses in the database, the dashboard showed completely wrong totals (e.g., ₹2,137 owed instead of the real amount).
- **How I caught it**: After importing the full CSV, the dashboard's "Total you owe" and "Total owed to you" cards showed numbers that didn't match the group's actual net balances page.
- **What I changed**: Replaced the inline calculation with a call to the shared `getGroupBalances()` function that processes ALL expenses and settlements, ensuring the dashboard totals always match the group detail page.
