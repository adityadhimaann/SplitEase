# AI Usage Log

## AI Tools Used
- **Google Antigravity (Agentic AI Assistant)**: Used directly within the IDE as a pair programmer to build out the architecture, APIs, and complex logic algorithms.

## Key Prompts Used
1. *"I have this assignment to build SplitEase. Please analyze this CSV, identify all the deliberate anomalies, and give me the workflow and architecture."* -> Generated the initial architecture and planning mode artifacts.
2. *"Build the backend first. Set up Prisma schema for users, groups, expenses, and splits, and make sure we can handle time-scoped memberships."* -> Scaffolding the database.
3. *"Write an algorithm to minimize the total number of transactions to settle debts among a group of people."* -> Generated the greedy algorithm in `minimizeDebt.ts`.
4. *"Create a two-step CSV import pipeline. Endpoint 1 should analyze and return anomalies, Endpoint 2 should commit the clean data and convert USD to INR."* -> Created the robust import flow.

## Concrete Cases where AI Produced Something Wrong & How I Fixed It

**Case 1: Prisma Client Constructor Error in Turbopack**
- **What went wrong**: The AI generated a standard Next.js API route that instantiated Prisma. However, when running the app with Next.js 16.2.9 (Turbopack), it threw a `PrismaClientConstructorValidationError: Using engine type "client" requires either "adapter" or "accelerateUrl"`.
- **How I caught it**: The Next.js development server crashed immediately when hitting `/api/auth/register`.
- **What I changed**: I recognized this as a known Turbopack issue with Prisma. I instructed the AI to update `next.config.ts` to include `serverExternalPackages: ['prisma', '@prisma/client', 'bcrypt']` and to use a `globalThis.prisma` singleton pattern in `src/lib/prisma.ts`.

**Case 2: TypeScript Syntax Error in Debt Minimization Logic**
- **What went wrong**: While extracting the debt calculation logic into a reusable helper function, the AI generated invalid TypeScript object syntax: `userBalances.push({ userId, Math.round(balance * 100) / 100 });`.
- **How I caught it**: The IDE immediately flagged a syntax error because the property key `balance:` was missing.
- **What I changed**: I had the AI run a multi-line replacement to correct the syntax to `{ userId, balance: Math.round(balance * 100) / 100 }`.

**Case 3: Unescaped Single Quotes in Next.js React Hydration**
- **What went wrong**: In the UI markup for error states and dashboard empty states, the AI generated unescaped single quotes (e.g., `<p>You don't have any groups</p>`). Next.js strict mode flags this as a React parsing error.
- **How I caught it**: The browser console threw React hydration errors and ESLint warnings for unescaped entities.
- **What I changed**: I manually went through the JSX and updated the unescaped quotes to `&apos;` or wrapped the strings in curly braces `{"don't"}`.
