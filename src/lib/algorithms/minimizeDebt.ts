export interface UserBalance {
  userId: string;
  balance: number; // positive = gets money (creditor), negative = owes money (debtor)
}

export interface Transaction {
  payerId: string;
  payeeId: string;
  amount: number;
}

export function minimizeDebt(balances: UserBalance[]): Transaction[] {
  // Separate into creditors and debtors, filtering out 0 balances
  // We use Math.round(balance * 100) / 100 to avoid floating point precision issues
  const debtors = balances
    .filter((b) => b.balance <= -0.01)
    .sort((a, b) => a.balance - b.balance); // Most negative first

  const creditors = balances
    .filter((b) => b.balance >= 0.01)
    .sort((a, b) => b.balance - a.balance); // Most positive first

  const transactions: Transaction[] = [];

  let i = 0; // index for debtors
  let j = 0; // index for creditors

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];

    const amountToSettle = Math.min(Math.abs(debtor.balance), creditor.balance);
    const amount = Math.round(amountToSettle * 100) / 100;

    if (amount > 0) {
      transactions.push({
        payerId: debtor.userId,
        payeeId: creditor.userId,
        amount,
      });
    }

    debtor.balance += amount;
    creditor.balance -= amount;

    // Due to float precision, we check against a small epsilon
    if (Math.abs(debtor.balance) < 0.01) {
      i++;
    }
    if (Math.abs(creditor.balance) < 0.01) {
      j++;
    }
  }

  return transactions;
}
