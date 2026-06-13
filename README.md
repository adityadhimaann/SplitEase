# SplitEase

SplitEase is a modern shared expense tracking application built for flat mates to manage group expenses, settle debts, and import messy spreadsheets. This project was developed as part of the Spreetail Software Developer Assignment.

## Live App

**Deployed URL:** [https://split-ease-sand.vercel.app](https://split-ease-sand.vercel.app)

**Test Credentials:**
| Name  | Email            | Password     |
|-------|------------------|-------------|
| Aisha | aisha@test.com   | password123 |
| Rohan | rohan@test.com   | password123 |
| Sam   | sam@test.com     | password123 |
| Priya | priya@test.com   | password123 |

## Features

- **Authentication System**: Secure JWT-based auth with `httpOnly` cookies and Next.js middleware. Tokens are never exposed to client-side JavaScript.
- **Group Management**: Create groups, add/remove members, and track time-scoped memberships (`joinedAt`/`leftAt`) so users aren't liable for expenses outside their active periods.
- **Expense Tracking**: Add expenses with split methods: Equal, Exact (unequal), Percentage, and Shares.
- **Debt Minimization Algorithm**: Calculates the optimal minimum number of transactions to settle all debts within a group using a greedy algorithm that matches the largest debtor to the largest creditor.
- **Robust CSV Import Pipeline**: A multi-step import wizard that:
  - Detects 12+ anomaly types: duplicates (within CSV and against DB), negative amounts, zero amounts, missing payers, missing currencies, non-member splits, percentage math errors, settlement-as-expense, date format issues, time-scoped membership conflicts, split_type/split_details conflicts, and fuzzy duplicates.
  - Auto-converts USD to INR at ₹83.45/USD at import time.
  - Lets the user approve, skip, or auto-resolve each anomaly before committing.
- **Settlement Recording**: Record payments between group members via the "Settle Up" tab with automatic balance recalculation.

## Tech Stack

- **Framework**: Next.js 16.2.9 (App Router + Turbopack)
- **Language**: TypeScript
- **Database**: PostgreSQL (Supabase) via Prisma ORM
- **Styling**: Tailwind CSS 4 + shadcn/ui components
- **Deployment**: Vercel
- **Auth**: Custom JWT with `httpOnly` cookies + Edge middleware

## Setup Instructions

1. **Clone the repository:**
   ```bash
   git clone https://github.com/adityadhimaann/SplitEase.git
   cd SplitEase
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the project root:
   ```env
   DATABASE_URL="postgresql://user:password@host:port/dbname"
   JWT_SECRET="your-super-secret-jwt-key"
   ```

4. **Initialize Database:**
   Push the Prisma schema to your database:
   ```bash
   npx prisma db push
   ```

5. **Run the Development Server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) with your browser.

## Project Structure

```
SplitEase/
├── prisma/schema.prisma          # Database schema
├── src/
│   ├── app/
│   │   ├── api/                  # API routes (auth, expenses, groups, import)
│   │   ├── (app)/                # Protected pages (dashboard, groups, import, expenses)
│   │   ├── login/                # Login page
│   │   └── register/             # Registration page
│   ├── components/               # Reusable UI components
│   └── lib/
│       ├── algorithms/           # Debt minimization + balance calculation
│       ├── auth.ts               # JWT auth helpers
│       └── prisma.ts             # Prisma singleton
├── SCOPE.md                      # Anomaly log + database schema
├── DECISIONS.md                  # Decision log
├── AI_USAGE.md                   # AI usage transparency
└── IMPORT_REPORT.md              # Import report
```

## AI Tools Used

- **Google Antigravity (Agentic Coding Assistant)** was used as a pair programming collaborator for architecture design, API scaffolding, algorithm implementation, and UI development.

See [AI_USAGE.md](AI_USAGE.md) for detailed prompts, usage patterns, and three concrete cases where the AI produced incorrect output.
