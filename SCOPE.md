# Scope & Anomaly Log

## Database Schema Overview

We use Prisma with PostgreSQL (Supabase) to model the data.

- **User**: Represents a registered user.
- **Group**: Represents a shared expense group.
- **GroupMember**: A many-to-many relationship linking Users to Groups. Importantly, it includes `joinedAt` and `leftAt` timestamps to support time-scoped memberships (Sam's Requirement).
- **Expense**: Represents a single bill (e.g. Dinner). Contains total amount, currency, and date.
- **ExpenseSplit**: Breaks down an `Expense` into exact amounts owed by each user.
- **Settlement**: Tracks direct payments made between users to clear debt.

## CSV Anomaly Log

During the development of the CSV Import feature, the following data problems were identified in the `Expenses Export.csv` file, along with how the system handles them:

| Row / Issue | Description | Handling Strategy |
| :--- | :--- | :--- |
| **Duplicates (Row 5 & 6)** | "Dinner at Marina Bites" vs "dinner - marina bites" | The `analyze` endpoint detects exact amount and date matches within the same group. It flags it as a `WARNING: Possible duplicate expense`. The user can uncheck the row in the UI to skip importing it. |
| **Formatting Issues (Row 7)** | Amount contains a comma ("1,200") | The parser strips commas from amounts before parsing as floats. |
| **Name Variations (Row 9 & 11)** | "priya" (lowercase) and "Priya S" | Handled through a fuzzy matching or manual mapping step in the UI. For the assignment, unrecognized names throw an error requiring manual intervention. |
| **Currency Conversion (Row 20, 21, 23)** | Currency is USD | The backend identifies USD, logs it in the UI preview, and automatically converts it to INR using a mock exchange rate (₹83.45) upon commit (Priya's Requirement). |
| **Non-Members (Row 23)** | "Dev's friend Kabir" is not a group member | The import validation flags that a requested split user does not exist in the active group members, blocking the row until resolved. |
| **Negative Amounts / Refunds (Row 26)** | "-30" amount | The parser flags `< 0` amounts as an anomaly. Refunds are generally treated differently than expenses; the user must manually confirm if they want it applied as a reverse expense. |
| **Date Formats (Row 27)** | "Mar-14" instead of DD-MM-YYYY | Standard Javascript `Date` parsing attempts to resolve it. If it results in an Invalid Date, it's flagged as an anomaly. |
| **Missing Currency (Row 28)** | Currency field is blank | Defaults to INR and flags a warning. |
| **Zero Amounts (Row 31)** | Amount is 0 | Flagged and automatically omitted from the final commit to avoid polluting the DB. |
| **Math Errors (Row 15 & 32)** | Percentages sum to 110% | The backend validates that `percentage` splits sum to exactly 100%. If not, it returns an error `ERROR: Invalid split logic`, requiring manual correction. |
| **Time-scoped anomalies (Row 36)** | Split with Meera, but she left the group earlier | The logic explicitly checks if `expense.date` is within `[member.joinedAt, member.leftAt]`. If the expense occurs after Meera left, it flags `ERROR: Split includes inactive member`. |
| **Data type mismatches (Row 42)** | `split_type` is equal, but `split_details` has shares | The backend prioritizes explicit `split_details` over the `split_type` tag if they conflict, but flags it as a warning for the user. |
| **Settlements disguised as expenses (Row 14)** | "Rohan paid Aisha back" | Flagged by the user as a warning since the split logic expects multiple people, not a direct 1-1 payment with no splits. User can exclude this and enter it manually via a Settlement UI. |

This robust validation pipeline ensures that bad data never reaches the database without explicit user consent and correction.
