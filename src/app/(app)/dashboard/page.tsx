import { Button } from "@/components/ui/button";
import { getGroupBalances } from "@/lib/algorithms/calculateBalances";
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

  const recentSettlements = await prisma.settlement.findMany({
    where: { groupId: { in: groups.map(g => g.id) } },
    orderBy: { date: "desc" },
    take: 5,
    include: { group: true, payer: true, payee: true },
  });

  const allActivity = [
    ...recentExpenses.map(e => ({ type: "expense" as const, date: e.date, data: e })),
    ...recentSettlements.map(s => ({ type: "settlement" as const, date: s.date, data: s }))
  ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 5);

  // Calculate totals
  let totalYouOwe = 0;
  let totalOwedToYou = 0;

  const groupBalances = await Promise.all(groups.map(async (group) => {
    const data = await getGroupBalances(group.id);
    const myBalance = data?.balances.find(b => b.userId === user.id)?.balance || 0;
    
    if (myBalance > 0) {
      totalOwedToYou += myBalance;
    } else if (myBalance < 0) {
      totalYouOwe += Math.abs(myBalance);
    }

    return {
      ...group,
      balance: myBalance,
      color: myBalance > 0 ? "text-emerald-500" : myBalance < 0 ? "text-rose-500" : "text-slate-500",
      formattedBalance: myBalance > 0 ? `+₹${myBalance.toFixed(2)}` : myBalance < 0 ? `-₹${Math.abs(myBalance).toFixed(2)}` : "Settled"
    };
  }));

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
            <CardDescription>Your latest activity across all groups</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {allActivity.length === 0 ? (
              <p className="text-slate-500">No recent activity.</p>
            ) : (
              allActivity.map((item) => {
                if (item.type === "expense") {
                  const activity = item.data;
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
                    <div key={`expense-${activity.id}`} className="flex items-center justify-between">
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
                } else {
                  const settlement = item.data;
                  const youPaid = settlement.payerId === user.id;
                  const youReceived = settlement.payeeId === user.id;
                  
                  let text = "";
                  let color = "";
                  
                  if (youPaid) {
                    text = `You paid ${settlement.payee.name}`;
                    color = "text-emerald-500";
                  } else if (youReceived) {
                    text = `${settlement.payer.name} paid you`;
                    color = "text-emerald-500";
                  } else {
                    text = `${settlement.payer.name} paid ${settlement.payee.name}`;
                    color = "text-slate-500";
                  }

                  return (
                    <div key={`settlement-${settlement.id}`} className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
                          <span className="text-emerald-600 font-medium">₹</span>
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">Payment</p>
                          <p className="text-sm text-slate-500">{settlement.group.name} • {new Date(settlement.date).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">₹{settlement.amount.toFixed(2)}</p>
                        <p className={`text-sm ${color}`}>{text}</p>
                      </div>
                    </div>
                  );
                }
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
