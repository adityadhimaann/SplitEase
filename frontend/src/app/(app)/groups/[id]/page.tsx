import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Users, ArrowRightLeft, UserPlus, UserMinus, Receipt } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export default function GroupDetailPage({ params }: { params: { id: string } }) {
  return (
    <div className="space-y-8">
      {/* Group Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl border">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <Users className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Flatmates</h1>
            <p className="text-slate-500">Created 2 months ago • 4 Members</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Link href={`/expenses/new?group=${params.id}`}>
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
                {[
                  { id: 1, desc: "March Rent", amount: "₹45,000.00", date: "Mar 1", paidBy: "Aisha", split: "Equal" },
                  { id: 2, desc: "Groceries", amount: "₹2,300.00", date: "Mar 5", paidBy: "Rohan", split: "Percentage" },
                  { id: 3, desc: "Internet", amount: "₹1,200.00", date: "Mar 10", paidBy: "Priya", split: "Equal" },
                ].map((expense) => (
                  <div key={expense.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition-colors cursor-pointer">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                        <Receipt className="h-5 w-5 text-slate-500" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{expense.desc}</p>
                        <p className="text-sm text-slate-500">Paid by {expense.paidBy} on {expense.date}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{expense.amount}</p>
                      <Badge variant="outline" className="mt-1">{expense.split}</Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Balances Tab */}
          <TabsContent value="balances">
            <Card>
              <CardHeader>
                <CardTitle>Debt Minimization Summary</CardTitle>
                <CardDescription>Optimized minimum transactions needed to settle all debts.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {[
                  { id: 1, from: "Rohan", to: "Aisha", amount: "₹12,400.00" },
                  { id: 2, from: "Priya", to: "Aisha", amount: "₹8,200.00" },
                  { id: 3, from: "Sam", to: "Rohan", amount: "₹1,100.00" },
                ].map((debt) => (
                  <div key={debt.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{debt.from}</span>
                        <ArrowRightLeft className="h-4 w-4 text-slate-400 mx-2" />
                        <span className="font-medium">{debt.to}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-bold text-lg">{debt.amount}</span>
                      <Button variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100">
                        Settle Up
                      </Button>
                    </div>
                  </div>
                ))}
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
                <div className="flex items-center justify-between p-4 border rounded-lg opacity-70">
                  <div>
                    <p className="font-medium text-slate-900">Priya paid Aisha</p>
                    <p className="text-sm text-slate-500">Feb 28 • Bank Transfer</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-emerald-600">₹5,000.00</p>
                  </div>
                </div>
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
                <Button variant="outline" size="sm" className="gap-2">
                  <UserPlus className="h-4 w-4" /> Add Member
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { name: "Aisha", joined: "Jan 1, 2024", active: true },
                  { name: "Rohan", joined: "Jan 1, 2024", active: true },
                  { name: "Priya", joined: "Feb 15, 2024", active: true },
                  { name: "Meera", joined: "Jan 1, 2024", left: "Mar 31, 2024", active: false },
                ].map((member, i) => (
                  <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center font-medium ${member.active ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
                        {member.name.charAt(0)}
                      </div>
                      <div>
                        <p className={`font-medium ${member.active ? 'text-slate-900' : 'text-slate-500 line-through'}`}>{member.name}</p>
                        <p className="text-xs text-slate-500">
                          Joined {member.joined} {member.left && `• Left ${member.left}`}
                        </p>
                      </div>
                    </div>
                    {member.active && (
                      <Button variant="ghost" size="icon" className="text-rose-500 hover:text-rose-700 hover:bg-rose-50">
                        <UserMinus className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
