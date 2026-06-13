import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Users, ArrowRightLeft, UserPlus, UserMinus, Receipt } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { getGroupBalances } from "@/lib/algorithms/calculateBalances";
import { redirect } from "next/navigation";
import { AddMemberButton } from "@/components/AddMemberButton";
import { SettleDebtButton } from "@/components/SettleDebtButton";

export default async function GroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getGroupBalances(id);

  if (!data) {
    redirect("/dashboard");
  }

  const { group, expenses, settlements, transactions, balances } = data;

  return (
    <div className="space-y-8">
      {/* Group Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl border">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <Users className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{group.name}</h1>
            <p className="text-slate-500">Created {new Date(group.createdAt).toLocaleDateString()} • {group.members.length} Members</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Link href={`/expenses/new?group=${group.id}`}>
            <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700">
              <Plus className="h-4 w-4" /> Add Expense
            </Button>
          </Link>
        </div>
      </div>

      {/* Tabs Layout */}
      <Tabs defaultValue="expenses" className="w-full">
        <TabsList className="grid w-full grid-cols-4 max-w-2xl bg-white border h-12">
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="balances">Balances</TabsTrigger>
          <TabsTrigger value="settlements">Settlements</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
        </TabsList>

        <div className="mt-6">
          {/* Expenses Tab */}
          <TabsContent value="expenses" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Expenses</CardTitle>
                <CardDescription>All shared expenses in this group</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {expenses.length === 0 ? (
                  <p className="text-slate-500">No expenses yet.</p>
                ) : expenses.map((expense) => {
                  const payerName = group.members.find(m => m.userId === expense.payerId)?.user.name;
                  return (
                    <div key={expense.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition-colors cursor-pointer">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                          <Receipt className="h-5 w-5 text-slate-500" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{expense.description}</p>
                          <p className="text-sm text-slate-500">Paid by {payerName} on {new Date(expense.date).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">₹{expense.amount.toFixed(2)}</p>
                        <Badge variant="outline" className="mt-1">{expense.splits[0]?.splitType || "EQUAL"}</Badge>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Balances Tab */}
          <TabsContent value="balances">
            <Card>
              <CardHeader>
                <CardTitle>Debt Minimization Summary</CardTitle>
                <CardDescription>Optimized minimum transactions needed to settle all debts (Aisha's Requirement).</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {transactions.length === 0 ? (
                  <p className="text-slate-500">All debts are settled!</p>
                ) : transactions.map((debt, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-rose-600">{debt.payer?.name}</span>
                        <ArrowRightLeft className="h-4 w-4 text-slate-400 mx-2" />
                        <span className="font-medium text-emerald-600">{debt.payee?.name}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-bold text-lg">₹{debt.amount.toFixed(2)}</span>
                      <SettleDebtButton 
                        groupId={group.id}
                        payerId={debt.payerId}
                        payeeId={debt.payeeId}
                        amount={debt.amount}
                      />
                    </div>
                  </div>
                ))}

                {balances.length > 0 && (
                  <div className="mt-8 pt-8 border-t">
                    <h3 className="font-semibold mb-4 text-slate-900">Individual Net Balances (Time-Scoped)</h3>
                    <div className="space-y-2">
                      {balances.map((b, idx) => (
                        <div key={idx} className="flex justify-between items-center text-sm">
                          <span>{b.user?.name}</span>
                          <span className={`font-medium ${b.balance > 0 ? 'text-emerald-600' : b.balance < 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                            {b.balance > 0 ? '+' : ''}₹{b.balance.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settlements Tab */}
          <TabsContent value="settlements">
            <Card>
              <CardHeader>
                <CardTitle>Settlement History</CardTitle>
                <CardDescription>Record of all payments made between members.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {settlements.length === 0 ? (
                  <p className="text-slate-500">No settlements yet.</p>
                ) : settlements.map((s) => {
                  const payer = group.members.find(m => m.userId === s.payerId)?.user.name;
                  const payee = group.members.find(m => m.userId === s.payeeId)?.user.name;
                  return (
                    <div key={s.id} className="flex items-center justify-between p-4 border rounded-lg opacity-70">
                      <div>
                        <p className="font-medium text-slate-900">{payer} paid {payee}</p>
                        <p className="text-sm text-slate-500">{new Date(s.date).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-emerald-600">₹{s.amount.toFixed(2)}</p>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Members Tab */}
          <TabsContent value="members">
            <Card>
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle>Group Members</CardTitle>
                  <CardDescription>Manage who is in this group.</CardDescription>
                </div>
                <AddMemberButton groupId={group.id} />
              </CardHeader>
              <CardContent className="space-y-4">
                {group.members.map((member, i) => {
                  const active = !member.leftAt;
                  return (
                    <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center font-medium ${active ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
                          {member.user.name.charAt(0)}
                        </div>
                        <div>
                          <p className={`font-medium ${active ? 'text-slate-900' : 'text-slate-500 line-through'}`}>{member.user.name}</p>
                          <p className="text-xs text-slate-500">
                            Joined {new Date(member.joinedAt).toLocaleDateString()} {member.leftAt && `• Left ${new Date(member.leftAt).toLocaleDateString()}`}
                          </p>
                        </div>
                      </div>
                      {active && (
                        <Button variant="ghost" size="icon" className="text-rose-500 hover:text-rose-700 hover:bg-rose-50">
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
