import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Upload, Users } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
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
            <CardTitle className="text-3xl text-rose-500 font-bold">₹1,200.00</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total owed to you</CardDescription>
            <CardTitle className="text-3xl text-emerald-500 font-bold">₹3,450.00</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Groups</CardDescription>
            <CardTitle className="text-3xl text-slate-900 font-bold">3</CardTitle>
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
            {/* Mock recent activity */}
            {[
              { id: 1, desc: "Dinner at Taj", group: "Goa Trip", amount: "₹4,500.00", date: "Today, 8:30 PM", youPaid: false, color: "text-rose-500", text: "You owe ₹1,500" },
              { id: 2, desc: "Groceries", group: "Flatmates", amount: "₹1,200.00", date: "Yesterday", youPaid: true, color: "text-emerald-500", text: "You lent ₹800" },
              { id: 3, desc: "Electricity Bill", group: "Flatmates", amount: "₹3,000.00", date: "Oct 10", youPaid: false, color: "text-rose-500", text: "You owe ₹1,000" },
            ].map((activity) => (
              <div key={activity.id} className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                    <span className="text-slate-500 font-medium">{activity.desc.charAt(0)}</span>
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{activity.desc}</p>
                    <p className="text-sm text-slate-500">{activity.group} • {activity.date}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">{activity.amount}</p>
                  <p className={`text-sm ${activity.color}`}>{activity.text}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your Groups</CardTitle>
            <CardDescription>Groups you are a part of</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Mock groups */}
            {[
              { id: 1, name: "Flatmates", members: 3, balance: "-₹200.00", color: "text-rose-500" },
              { id: 2, name: "Goa Trip", members: 5, balance: "+₹1,450.00", color: "text-emerald-500" },
              { id: 3, name: "Office Lunch", members: 4, balance: "Settled", color: "text-slate-500" },
            ].map((group) => (
              <div key={group.id} className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <Link href={`/groups/${group.id}`} className="font-medium text-slate-900 hover:underline">
                      {group.name}
                    </Link>
                    <p className="text-sm text-slate-500">{group.members} members</p>
                  </div>
                </div>
                <div className={`font-medium ${group.color}`}>
                  {group.balance}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
