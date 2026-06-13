# CSV Import Report

**File Processed:** `Expenses Export.csv`
**Date Processed:** `13-Jun-2026`
**Status:** ✅ Successfully imported with anomalies mitigated.

## Summary

| Metric | Count |
|:-------|:------|
| Total CSV rows (excluding header) | 43 |
| Successfully committed | 34 |
| Excluded / Dropped | 9 |

## Anomaly Detection Log & Actions Taken

During the analysis phase, the import wizard intercepted the following issues and prompted for action before committing to the database:

1. **Row 5 & 6** — Duplicate entries
   - **Anomaly Detected**: `WARNING: Possible duplicate expense`. "Dinner at Marina Bites" and "dinner - marina bites" occurred on the same date (08-02-2026) with the exact same amount (₹3200).
   - **Action Taken**: The user unchecked Row 6 in the UI preview, excluding it from the final commit.

2. **Row 7** — Comma in amount
   - **Anomaly Detected**: `INFO: Comma in amount "1,200"`. String comma in the amount field.
   - **Action Taken**: Automatically sanitized and parsed as `1200.00` float by the system parser.

3. **Row 9 & 11** — Name variations
   - **Anomaly Detected**: `INFO: Payer "priya" fuzzy-matched to "Priya"` (Row 9) and `INFO: Payer "Priya S" fuzzy-matched to "Priya"` (Row 11). Unrecognized payer name formats.
   - **Action Taken**: Auto-resolved via case-insensitive fuzzy matching. User approved the matches.

4. **Row 10** — Floating point precision
   - **Anomaly Detected**: `INFO: Amount has unusual precision (899.995)`.
   - **Action Taken**: Rounded to ₹900.00 on commit.

5. **Row 12** — Unequal split type
   - **Anomaly Detected**: `split_type=unequal` with explicit amounts in `split_details`: "Rohan 700; Priya 400; Meera 400".
   - **Action Taken**: Parsed as exact amounts and stored as EXACT split type. No anomaly — clean row.

6. **Row 13** — Missing payer
   - **Anomaly Detected**: `CRITICAL: Missing payer — "paid_by" is blank`.
   - **Action Taken**: Blocked from import. Cannot determine who paid for "House cleaning supplies".

7. **Row 14** — Settlement disguised as expense
   - **Anomaly Detected**: `WARNING: Possible settlement disguised as expense — "Rohan paid Aisha back"`.
   - **Action Taken**: Excluded from the expense import. The user logged this ₹5000 payment via the "Settle Up" tab instead.

8. **Row 15 & 32** — Invalid percentage split
   - **Anomaly Detected**: `CRITICAL: Percentages sum to 110% (should be 100%)`. Aisha 30% + Rohan 30% + Priya 30% + Meera 20% = 110%.
   - **Action Taken**: Blocked from import until percentages are corrected to sum to exactly 100%.

9. **Row 20, 21, 23** — Foreign currency
   - **Anomaly Detected**: `WARNING: Foreign currency (USD) — will be converted to INR at ₹83.45/USD`.
   - **Action Taken**: Automatically converted on commit. Row 20: $540 → ₹45,063.00. Row 21: $84 → ₹7,009.80.

10. **Row 22** — Share-based split
    - **Anomaly Detected**: No anomaly — clean row with `split_type=share`.
    - **Action Taken**: Parsed "Aisha 1; Rohan 2; Priya 1; Dev 2" as proportional shares (total 6 shares). Rohan and Dev each pay 2/6 of ₹3600.

11. **Row 23** — Non-member in split
    - **Anomaly Detected**: `CRITICAL: Split member "Dev's friend Kabir" is not in the group`.
    - **Action Taken**: Blocked. The user excluded Kabir and the expense was split equally among the remaining 4 members.

12. **Row 24 & 25** — Fuzzy duplicate with different amounts
    - **Anomaly Detected**: `WARNING: Possible duplicate of Row 24 ("Dinner at Thalassa") with different amount`. Row 24 is ₹2400 (Aisha) and Row 25 is ₹2450 (Rohan) on the same date.
    - **Action Taken**: User reviewed both entries. Row 25's notes say "Aisha also logged this I think hers is wrong." User skipped Row 24 and kept Row 25.

13. **Row 26** — Negative amount
    - **Anomaly Detected**: `WARNING: Negative amount detected (-30) — possible refund`.
    - **Action Taken**: Excluded. Refunds are handled manually to avoid confusing the debt minimization algorithm.

14. **Row 27** — Non-standard date format
    - **Anomaly Detected**: `WARNING: Non-standard date format "Mar-14" — assumed year 2026`.
    - **Action Taken**: Parsed as March 14, 2026. User approved.

15. **Row 28** — Missing currency
    - **Anomaly Detected**: `WARNING: Missing currency — defaulting to INR`.
    - **Action Taken**: Defaulted to INR. User approved.

16. **Row 31** — Zero amount
    - **Anomaly Detected**: `WARNING: Zero amount — will be excluded`.
    - **Action Taken**: Automatically excluded from commit. Notes confirm: "counted twice earlier — fixing later."

17. **Row 34** — Ambiguous date
    - **Anomaly Detected**: `WARNING: Ambiguous date "04-05-2026" — DD-MM or MM-DD?` Notes say "is this April 5 or May 4? format is a mess."
    - **Action Taken**: Interpreted as DD-MM-YYYY (May 4, 2026) consistent with all other dates in the file. User approved.

18. **Row 36** — Inactive member in split
    - **Anomaly Detected**: `CRITICAL: Split includes "Meera" who left the group before 02-04-2026`.
    - **Action Taken**: Blocked. User re-allocated the split equally among the remaining active members (Aisha, Rohan, Priya).

19. **Row 42** — Split type / split details conflict
    - **Anomaly Detected**: `WARNING: split_type is "equal" but split_details contains values — will use equal split`.
    - **Action Taken**: The `split_type` field says "equal" but `split_details` has "Aisha 1; Rohan 1; Priya 1; Sam 1". Since the shares are all identical (1:1:1:1), the result is equivalent to an equal split. Used equal split as declared.

---
*End of Report. Total Rows: 43. Successfully Committed: 34. Excluded/Dropped: 9.*
