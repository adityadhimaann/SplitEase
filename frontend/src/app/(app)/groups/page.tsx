import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Users } from "lucide-react";
import Link from "next/link";

export default function GroupsPage() {
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Your Groups</h1>
          <p className="text-slate-500">Manage your shared expenses across different groups</p>
        </div>
        <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700">
          <Plus className="h-4 w-4" />
          Create Group
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          { id: 1, name: "Flatmates", members: 3, balance: "-₹200.00", color: "text-rose-500", desc: "Rent, Groceries, Utilities" },
          { id: 2, name: "Goa Trip", members: 5, balance: "+₹1,450.00", color: "text-emerald-500", desc: "Flights, Hotel, Drinks" },
          { id: 3, name: "Office Lunch", members: 4, balance: "Settled", color: "text-slate-500", desc: "Daily lunch orders" },
        ].map((group) => (
          <Link key={group.id} href={`/groups/${group.id}`}>
            <Card className="hover:border-indigo-200 hover:shadow-md transition-all cursor-pointer h-full flex flex-col">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="h-12 w-12 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                    <Users className="h-6 w-6" />
                  </div>
                  <div className={`text-lg font-bold ${group.color}`}>
                    {group.balance}
                  </div>
                </div>
                <CardTitle className="mt-4">{group.name}</CardTitle>
                <CardDescription>{group.desc}</CardDescription>
              </CardHeader>
              <CardContent className="mt-auto">
                <div className="flex -space-x-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-8 w-8 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-xs font-medium text-slate-600">
                      U{i}
                    </div>
                  ))}
                  {group.members > 3 && (
                    <div className="h-8 w-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-xs font-medium text-slate-500">
                      +{group.members - 3}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
