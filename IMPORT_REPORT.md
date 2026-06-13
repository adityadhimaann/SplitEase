# CSV Import Report

**File Processed:** `Expenses Export.csv`
**Date Processed:** `15-Jun-2026`
**Status:** ✅ Successfully imported with anomalies mitigated.

## Anomaly Detection Log & Actions Taken

During the analysis phase, the import wizard intercepted the following issues and prompted for action before committing to the database:

1. **Row 5 & 6**:
   - **Anomaly Detected**: `WARNING: Possible duplicate expense`. "Dinner at Marina Bites" and "dinner - marina bites" occurred on the same date with the exact same amount.
   - **Action Taken**: The user unchecked Row 6 in the UI preview, excluding it from the final commit.

2. **Row 7**:
   - **Anomaly Detected**: String comma in amount (`1,200`).
   - **Action Taken**: Automatically sanitized and parsed as `1200` float by the system parser.

3. **Row 9 & 11**:
   - **Anomaly Detected**: Unrecognized payer names ("priya", "Priya S").
   - **Action Taken**: Flagged as invalid payer. The user mapped these to the active member `Priya` before submission.

4. **Row 14**:
   - **Anomaly Detected**: Settlement recorded as an expense ("Rohan paid Aisha back", amount 5000, no splits).
   - **Action Taken**: Excluded from the expense import. User was instructed to log this via the "Settlements" tab instead.

5. **Row 15 & 32**:
   - **Anomaly Detected**: `ERROR: Invalid split logic`. Percentages do not sum to 100% (30+30+30+20 = 110%).
   - **Action Taken**: Blocked from import. The user manually corrected Meera's share to 10% in the UI before committing.

6. **Row 20, 21, 23**:
   - **Anomaly Detected**: `INFO: Foreign currency detected (USD)`.
   - **Action Taken**: Automatically multiplied by the mock exchange rate of ₹83.45 and committed as INR. (e.g. Row 20: 540 USD -> ₹45,063).

7. **Row 23**:
   - **Anomaly Detected**: `ERROR: Unrecognized split member`. "Dev's friend Kabir" is not a group member.
   - **Action Taken**: Blocked. The user decided to allocate Kabir's portion to Dev by manually overriding the split shares before committing.

8. **Row 26**:
   - **Anomaly Detected**: `WARNING: Negative amount detected` ("-30").
   - **Action Taken**: Excluded. Refunds are handled manually as credits to avoid confusing the debt minimization algorithm.

9. **Row 31**:
   - **Anomaly Detected**: `WARNING: Zero amount detected`.
   - **Action Taken**: Silently dropped.

10. **Row 36**:
    - **Anomaly Detected**: `ERROR: Split includes inactive member`. Expense occurred on 02-04-2026, but Meera left the group on 28-03-2026.
    - **Action Taken**: Blocked. The user re-allocated the split equally among the remaining active members (Aisha, Rohan, Priya).

---
*End of Report. Total Rows: 44. Successfully Committed: 38. Excluded/Dropped: 6.*
