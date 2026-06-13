# Decision Log

## 1. Database Selection: Supabase PostgreSQL vs SQLite
- **Options Considered**: Prisma + SQLite (local file) vs Prisma + Supabase (PostgreSQL).
- **Decision**: Supabase PostgreSQL.
- **Why**: While SQLite is fast to setup locally, deploying to a platform like Vercel with a local SQLite file causes issues because serverless functions have ephemeral filesystems. Supabase provides a robust, production-ready remote database that seamlessly integrates with Prisma and supports complex relational queries (like our time-scoped membership filters).

## 2. Debt Minimization Algorithm: Greedy Approach vs Graph Max-Flow
- **Options Considered**: A simple Greedy matching algorithm vs a complex Graph Theory approach (like Ford-Fulkerson).
- **Decision**: Greedy Approach.
- **Why**: The greedy algorithm (matching the largest debtor to the largest creditor repeatedly) perfectly satisfies Aisha's requirement to minimize the total number of transactions. It is mathematically sound, highly performant (O(N log N) due to sorting), and significantly easier to implement, read, and maintain than a max-flow graph reduction. 

## 3. Handling CSV Import Anomalies: Reject Whole File vs Interactive Review
- **Options Considered**:
  1. Reject the entire CSV if a single error is found.
  2. Silently skip bad rows and import the good ones.
  3. Interactive Wizard: Parse the file, return a JSON report of anomalies, and let the user decide.
- **Decision**: Interactive Wizard (Option 3).
- **Why**: The provided CSV has 12+ deliberate errors. Rejecting the whole file would be a terrible user experience (Meera's requirement is to make importing *painless*). Silently skipping rows leads to financial inaccuracies. By building a two-step process (`/analyze` then `/commit`), the user gets complete transparency over what is wrong and can selectively exclude bad rows before modifying the database.

## 4. Authentication Strategy: JWT via `httpOnly` Cookies
- **Options Considered**: NextAuth.js vs Custom JWT in Cookies.
- **Decision**: Custom JWT in `httpOnly` Cookies with Next.js Middleware.
- **Why**: For a beginner-friendly assignment, pulling in NextAuth can be overkill and obscure the actual mechanics of authentication. Implementing a custom JWT flow using `jose` and Edge-compatible middleware allows for secure, stateless route protection (`/dashboard`, `/groups`) while demonstrating a clear understanding of security fundamentals (preventing XSS by not storing tokens in `localStorage`).

## 5. Time-Scoped Memberships
- **Options Considered**: 
  1. Creating entirely new group instances every time someone joins/leaves.
  2. Adding `joinedAt` and `leftAt` timestamps to the `GroupMember` join table.
- **Decision**: Timestamps (`joinedAt`, `leftAt`).
- **Why**: Creating new groups breaks the continuity of the UI and fragmentizes the data. By simply checking `if (expense.date >= member.joinedAt && expense.date <= member.leftAt)` during balance calculations, we elegantly solve Sam's requirement (not paying for old expenses) without duplicating data.
