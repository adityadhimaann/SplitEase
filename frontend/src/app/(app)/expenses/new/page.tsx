"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect } from "react";
import { Calculator } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

export default function AddExpensePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialGroupId = searchParams?.get("group");

  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>(initialGroupId || "");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState<string>("");
  const [currency, setCurrency] = useState("INR");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paidById, setPaidById] = useState<string>("");
  
  const [splitType, setSplitType] = useState("equal");
  // Store custom split values as { userId: value }
  const [customSplits, setCustomSplits] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/groups")
      .then(res => res.json())
      .then(data => {
        if (data.groups) {
          setGroups(data.groups);
          if (!selectedGroupId && data.groups.length > 0) {
            setSelectedGroupId(data.groups[0].id);
          }
        }
      });
  }, []);

  const selectedGroup = groups.find(g => g.id === selectedGroupId);
  const activeMembers = selectedGroup?.members.filter((m: any) => !m.leftAt) || [];

  // Default payer if not set
  useEffect(() => {
    if (activeMembers.length > 0 && !paidById) {
      setPaidById(activeMembers[0].userId);
    }
  }, [activeMembers, paidById]);

  // Derived splits for display/submission
  const totalAmount = parseFloat(amount) || 0;
  
  const getCalculatedSplits = () => {
    if (!activeMembers.length) return [];

    if (splitType === "equal") {
      const splitAmount = totalAmount / activeMembers.length;
      return activeMembers.map((m: any) => ({
        userId: m.userId,
        amountOwed: splitAmount,
        splitType: "EQUAL"
      }));
    } else if (splitType === "exact") {
      return activeMembers.map((m: any) => ({
        userId: m.userId,
        amountOwed: customSplits[m.userId] || 0,
        splitType: "EXACT"
      }));
    } else if (splitType === "percentage") {
      return activeMembers.map((m: any) => ({
        userId: m.userId,
        amountOwed: (totalAmount * (customSplits[m.userId] || 0)) / 100,
        splitType: "PERCENTAGE"
      }));
    } else if (splitType === "shares") {
      const totalShares = activeMembers.reduce((sum: number, m: any) => sum + (customSplits[m.userId] || 0), 0);
      return activeMembers.map((m: any) => ({
        userId: m.userId,
        amountOwed: totalShares > 0 ? (totalAmount * (customSplits[m.userId] || 0)) / totalShares : 0,
        splitType: "SHARES"
      }));
    }
    return [];
  };

  const calculatedSplits = getCalculatedSplits();
  const currentSplitTotal = calculatedSplits.reduce((sum: number, s: any) => sum + s.amountOwed, 0);

  const handleCustomSplitChange = (userId: string, val: string) => {
    setCustomSplits(prev => ({
      ...prev,
      [userId]: parseFloat(val) || 0
    }));
  };

  const handleSubmit = async () => {
    if (!description || !amount || !selectedGroupId || !paidById) {
      alert("Please fill in all required fields.");
      return;
    }

    if (splitType === "exact" && Math.abs(currentSplitTotal - totalAmount) > 0.01) {
      alert("Split amounts must equal the total amount.");
      return;
    }

    if (splitType === "percentage" && Math.abs(activeMembers.reduce((sum: number, m: any) => sum + (customSplits[m.userId] || 0), 0) - 100) > 0.01) {
      alert("Percentages must add up to 100%.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
          amount: totalAmount,
          currency,
          date,
          groupId: selectedGroupId,
          payerId: paidById,
          splits: calculatedSplits
        })
      });

      const data = await res.json();
      if (data.success) {
        router.push(`/groups/${selectedGroupId}`);
        router.refresh();
      } else {
        alert(data.error || "Failed to add expense");
      }
    } catch (err) {
      alert("An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Add an Expense</h1>
        <p className="text-slate-500">Record a new shared expense.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Expense Details</CardTitle>
          <CardDescription>What did you pay for?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Dinner, Uber, Rent..." />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <div className="flex">
                <Select value={currency} onValueChange={(v) => setCurrency(v)}>
                  <SelectTrigger className="w-[100px] rounded-r-none border-r-0 focus:ring-0">
                    <SelectValue placeholder="Currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INR">₹ INR</SelectItem>
                    <SelectItem value="USD">$ USD</SelectItem>
                  </SelectContent>
                </Select>
                <Input id="amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="rounded-l-none" />
              </div>
              {currency === "USD" && (
                <p className="text-xs text-amber-600 mt-1">
                  Will be converted at approx. 1 USD = ₹83.45
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="group">Group</Label>
              <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select group" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map(g => (
                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="paidBy">Paid By</Label>
              <Select value={paidById} onValueChange={setPaidById} disabled={!selectedGroupId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select payer" />
                </SelectTrigger>
                <SelectContent>
                  {activeMembers.map((m: any) => (
                    <SelectItem key={m.userId} value={m.userId}>{m.user.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Split Details</CardTitle>
          <CardDescription>How should this cost be shared?</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={splitType} onValueChange={setSplitType} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="equal">=</TabsTrigger>
              <TabsTrigger value="exact">1.23</TabsTrigger>
              <TabsTrigger value="percentage">%</TabsTrigger>
              <TabsTrigger value="shares">Shares</TabsTrigger>
            </TabsList>

            {activeMembers.length === 0 ? (
              <p className="mt-6 text-sm text-slate-500">Select a group with active members to see split details.</p>
            ) : (
              <div className="mt-6 space-y-4">
                {activeMembers.map((member: any) => {
                  const calculatedAmount = calculatedSplits.find((s: any) => s.userId === member.userId)?.amountOwed || 0;
                  return (
                    <div key={member.userId} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-sm font-medium">
                          {member.user.name.charAt(0)}
                        </div>
                        <span className="font-medium text-slate-700">{member.user.name}</span>
                      </div>
                      <div className="w-1/3 text-right flex items-center justify-end gap-2">
                        {splitType === "equal" && (
                          <div className="text-slate-500 py-2">
                            ₹{calculatedAmount.toFixed(2)}
                          </div>
                        )}
                        {splitType === "exact" && (
                          <div className="flex items-center">
                            <span className="text-slate-400 mr-2">₹</span>
                            <Input type="number" placeholder="0.00" className="h-9" value={customSplits[member.userId] || ""} onChange={(e) => handleCustomSplitChange(member.userId, e.target.value)} />
                          </div>
                        )}
                        {splitType === "percentage" && (
                          <div className="flex items-center">
                            <Input type="number" placeholder="0" className="h-9" value={customSplits[member.userId] || ""} onChange={(e) => handleCustomSplitChange(member.userId, e.target.value)} />
                            <span className="text-slate-400 ml-2">%</span>
                          </div>
                        )}
                        {splitType === "shares" && (
                          <Input type="number" placeholder="1" className="h-9 text-right" value={customSplits[member.userId] || ""} onChange={(e) => handleCustomSplitChange(member.userId, e.target.value)} />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {splitType !== "equal" && activeMembers.length > 0 && (
              <div className="mt-6 p-4 bg-indigo-50 rounded-lg flex items-center justify-between border border-indigo-100">
                <div className="flex items-center gap-2 text-indigo-700">
                  <Calculator className="h-5 w-5" />
                  <span className="font-medium">Calculated Split Total</span>
                </div>
                <span className={`font-bold ${Math.abs(currentSplitTotal - totalAmount) > 0.01 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  ₹{currentSplitTotal.toFixed(2)} / ₹{totalAmount.toFixed(2)}
                </span>
              </div>
            )}
          </Tabs>
        </CardContent>
        <CardFooter className="flex justify-end gap-3 pt-6 border-t mt-6">
          <Link href={selectedGroupId ? `/groups/${selectedGroupId}` : "/dashboard"}>
            <Button variant="outline">Cancel</Button>
          </Link>
          <Button onClick={handleSubmit} disabled={isSubmitting || activeMembers.length === 0} className="bg-indigo-600 hover:bg-indigo-700">
            {isSubmitting ? "Saving..." : "Save Expense"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
