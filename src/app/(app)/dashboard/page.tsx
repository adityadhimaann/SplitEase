import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Upload, Users } from "lucide-react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const groups = await prisma.group.findMany({
    where: { members: { some: { userId: user.id } } },
    include: { members: true },
  });

  const recentExpenses = await prisma.expense.findMany({
    where: { groupId: { in: groups.map(g => g.id) } },
    orderBy: { date: "desc" },
    take: 5,
    include: { group: true, splits: true, payer: true },
  });

  // Calculate totals
  let totalYouOwe = 0;
  let totalOwedToYou = 0;

  const groupBalances = groups.map(group => {
    let groupBalance = 0;
    const groupExpenses = recentExpenses.filter(e => e.groupId === group.id);
    
    groupExpenses.forEach(expense => {
      if (expense.payerId === user.id) {
        // You paid, so you are owed money by others
        expense.splits.forEach(split => {
          if (split.userId !== user.id) {
            totalOwedToYou += split.amountOwed;
            groupBalance += split.amountOwed;
          }
        });
      } else {
        // Someone else paid, do you owe them?
        const mySplit = expense.splits.find(s => s.userId === user.id);
        if (mySplit) {
          totalYouOwe += mySplit.amountOwed;
          groupBalance -= mySplit.amountOwed;
        }
      }
    });

    return {
      ...group,
      balance: groupBalance,
      color: groupBalance > 0 ? "text-emerald-500" : groupBalance < 0 ? "text-rose-500" : "text-slate-500",
      formattedBalance: groupBalance > 0 ? `+₹${groupBalance.toFixed(2)}` : groupBalance < 0 ? `-₹${Math.abs(groupBalance).toFixed(2)}` : "Settled"
    };
  });

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <div className="flex gap-3">
          <Link href="/import">
            <Button variant="outline" className="gap-2">
              <Upload className="h-4 w-4" />
              Import CSV
            </Button>
          </Link>
          <Link href="/groups">
            <Button variant="outline" className="gap-2">
              <Users className="h-4 w-4" />
              New Group
            </Button>
          </Link>
          <Link href="/expenses/new">
            <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700">
              <Plus className="h-4 w-4" />
              Add Expense
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total you owe</CardDescription>
            <CardTitle className="text-3xl text-rose-500 font-bold">₹{totalYouOwe.toFixed(2)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total owed to you</CardDescription>
            <CardTitle className="text-3xl text-emerald-500 font-bold">₹{totalOwedToYou.toFixed(2)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Groups</CardDescription>
            <CardTitle className="text-3xl text-slate-900 font-bold">{groups.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your latest expenses across all groups</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {recentExpenses.length === 0 ? (
              <p className="text-slate-500">No recent activity.</p>
            ) : (
              recentExpenses.map((activity) => {
                const youPaid = activity.payerId === user.id;
                const mySplit = activity.splits.find(s => s.userId === user.id);
                let text = "";
                let color = "";
                
                if (youPaid) {
                  text = `You lent ₹${(activity.amount - (mySplit?.amountOwed || 0)).toFixed(2)}`;
                  color = "text-emerald-500";
                } else if (mySplit) {
                  text = `You owe ₹${mySplit.amountOwed.toFixed(2)}`;
                  color = "text-rose-500";
                } else {
                  text = "Not involved";
                  color = "text-slate-500";
                }

                return (
                  <div key={activity.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                        <span className="text-slate-500 font-medium">{activity.description.charAt(0)}</span>
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{activity.description}</p>
                        <p className="text-sm text-slate-500">{activity.group.name} • {new Date(activity.date).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">₹{activity.amount.toFixed(2)}</p>
                      <p className={`text-sm ${color}`}>{text}</p>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your Groups</CardTitle>
            <CardDescription>Groups you are a part of</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {groupBalances.length === 0 ? (
              <p className="text-slate-500">You are not in any groups yet.</p>
            ) : (
              groupBalances.map((group) => (
                <div key={group.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600">
                      <Users className="h-5 w-5" />
                    </div>
                    <div>
                      <Link href={`/groups/${group.id}`} className="font-medium text-slate-900 hover:underline">
                        {group.name}
                      </Link>
                      <p className="text-sm text-slate-500">{group.members.length} members</p>
                    </div>
                  </div>
                  <div className={`font-medium ${group.color}`}>
                    {group.formattedBalance}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
