# SplitEase

SplitEase is a modern expense sharing application that helps you and your friends easily track and settle shared expenses. This project was developed as part of the Spreetail Software Developer Assignment.

## Features

- **Authentication System**: Secure JWT-based auth with `httpOnly` cookies and Next.js middleware.
- **Group Management**: Create groups, add/remove members, and track time-scoped memberships so users aren't liable for expenses outside their active periods.
- **Expense Tracking**: Add expenses with various split methods (Equal, Exact, Percentage, Shares).
- **Debt Minimization Algorithm**: Calculates the optimal minimum number of transactions to settle all debts within a group using a greedy algorithm.
- **Robust CSV Import Pipeline**: Upload expense sheets in CSV format. The pipeline handles:
  - Anomaly detection (duplicates, negative amounts, missing currencies, date conflicts, etc.)
  - Auto-conversion of foreign currencies (USD to INR) at import time.
  - Interactive wizard to review anomalies before committing to the database.

## Setup Instructions

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd SplitEase/frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the `frontend` directory:
   ```env
   DATABASE_URL="postgres://YOUR_SUPABASE_URL"
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
   Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## AI Tools Used
- Google Antigravity (Agentic Coding Assistant) was heavily utilized for boilerplate generation, logic scaffolding (such as the debt minimization algorithm), and UI implementation.

See [AI_USAGE.md](AI_USAGE.md) for more details.
