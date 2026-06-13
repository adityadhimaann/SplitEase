import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CreateGroupButton } from "@/components/CreateGroupButton";

export default async function GroupsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const groups = await prisma.group.findMany({
    where: { members: { some: { userId: user.id } } },
    include: { members: true },
    orderBy: { createdAt: 'desc' }
  });

  const allExpenses = await prisma.expense.findMany({
    where: { groupId: { in: groups.map(g => g.id) } },
    include: { splits: true },
  });

  // Calculate balance for each group for the current user
  const groupBalances = groups.map(group => {
    let groupBalance = 0;
    const groupExpenses = allExpenses.filter(e => e.groupId === group.id);
    
    groupExpenses.forEach(expense => {
      if (expense.payerId === user.id) {
        // You paid, so you are owed money by others
        expense.splits.forEach(split => {
          if (split.userId !== user.id) {
            groupBalance += split.amountOwed;
          }
        });
      } else {
        // Someone else paid, do you owe them?
        const mySplit = expense.splits.find(s => s.userId === user.id);
        if (mySplit) {
          groupBalance -= mySplit.amountOwed;
        }
      }
    });

    return {
      ...group,
      balance: groupBalance,
      color: groupBalance > 0 ? "text-emerald-500" : groupBalance < 0 ? "text-rose-500" : "text-slate-500",
      formattedBalance: groupBalance > 0 ? `+₹${groupBalance.toFixed(2)}` : groupBalance < 0 ? `-₹${Math.abs(groupBalance).toFixed(2)}` : "Settled",
    };
  });

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Your Groups</h1>
          <p className="text-slate-500">Manage your shared expenses across different groups</p>
        </div>
        <CreateGroupButton />
      </div>

      {groupBalances.length === 0 ? (
        <div className="text-center py-12 text-slate-500 border-2 border-dashed rounded-xl border-slate-200 bg-slate-50">
          <p>You don't have any groups yet.</p>
          <p className="text-sm mt-1">Create one to start splitting expenses!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groupBalances.map((group) => (
            <Link key={group.id} href={`/groups/${group.id}`}>
              <Card className="hover:border-indigo-200 hover:shadow-md transition-all cursor-pointer h-full flex flex-col">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="h-12 w-12 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                      <Users className="h-6 w-6" />
                    </div>
                    <div className={`text-lg font-bold ${group.color}`}>
                      {group.formattedBalance}
                    </div>
                  </div>
                  <CardTitle className="mt-4">{group.name}</CardTitle>
                  <CardDescription>Created on {new Date(group.createdAt).toLocaleDateString()}</CardDescription>
                </CardHeader>
                <CardContent className="mt-auto">
                  <div className="flex -space-x-2">
                    {/* Render member avatars */}
                    {Array.from({ length: Math.min(group.members.length, 3) }).map((_, i) => (
                      <div key={i} className="h-8 w-8 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-xs font-medium text-slate-600 uppercase">
                        U{i+1}
                      </div>
                    ))}
                    {group.members.length > 3 && (
                      <div className="h-8 w-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-xs font-medium text-slate-500">
                        +{group.members.length - 3}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
