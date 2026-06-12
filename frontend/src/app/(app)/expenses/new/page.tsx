"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { Calculator } from "lucide-react";
import Link from "next/link";

export default function AddExpensePage() {
  const [currency, setCurrency] = useState("INR");
  const [splitType, setSplitType] = useState("equal");
  
  // Mock members for the UI
  const members = ["Aisha", "Rohan", "Priya", "Sam"];

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
              <Input id="description" placeholder="Dinner, Uber, Rent..." />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <div className="flex">
                <Select value={currency} onValueChange={(v) => setCurrency(v as string)}>
                  <SelectTrigger className="w-[100px] rounded-r-none border-r-0 focus:ring-0">
                    <SelectValue placeholder="Currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INR">₹ INR</SelectItem>
                    <SelectItem value="USD">$ USD</SelectItem>
                  </SelectContent>
                </Select>
                <Input id="amount" type="number" placeholder="0.00" className="rounded-l-none" />
              </div>
              {currency === "USD" && (
                <p className="text-xs text-amber-600 mt-1">
                  Will be converted at approx. 1 USD = ₹83.45
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="group">Group</Label>
              <Select defaultValue="1">
                <SelectTrigger>
                  <SelectValue placeholder="Select group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Flatmates</SelectItem>
                  <SelectItem value="2">Goa Trip</SelectItem>
                  <SelectItem value="3">Office Lunch</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="paidBy">Paid By</Label>
              <Select defaultValue="Aisha">
                <SelectTrigger>
                  <SelectValue placeholder="Select payer" />
                </SelectTrigger>
                <SelectContent>
                  {members.map(m => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
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

            <div className="mt-6 space-y-4">
              {members.map((member) => (
                <div key={member} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-sm font-medium">
                      {member.charAt(0)}
                    </div>
                    <span className="font-medium text-slate-700">{member}</span>
                  </div>
                  <div className="w-1/3">
                    {splitType === "equal" && (
                      <div className="text-right text-slate-500 py-2">Auto-calculated</div>
                    )}
                    {splitType === "exact" && (
                      <div className="flex items-center">
                        <span className="text-slate-400 mr-2">₹</span>
                        <Input type="number" placeholder="0.00" className="h-9" />
                      </div>
                    )}
                    {splitType === "percentage" && (
                      <div className="flex items-center">
                        <Input type="number" placeholder="0" className="h-9" />
                        <span className="text-slate-400 ml-2">%</span>
                      </div>
                    )}
                    {splitType === "shares" && (
                      <Input type="number" placeholder="1" className="h-9 text-right" />
                    )}
                  </div>
                </div>
              ))}
            </div>

            {splitType !== "equal" && (
              <div className="mt-6 p-4 bg-indigo-50 rounded-lg flex items-center justify-between border border-indigo-100">
                <div className="flex items-center gap-2 text-indigo-700">
                  <Calculator className="h-5 w-5" />
                  <span className="font-medium">Total so far</span>
                </div>
                <span className="font-bold text-indigo-700">0.00 / 0.00</span>
              </div>
            )}
          </Tabs>
        </CardContent>
        <CardFooter className="flex justify-end gap-3 pt-6 border-t mt-6">
          <Link href="/dashboard">
            <Button variant="outline">Cancel</Button>
          </Link>
          <Button className="bg-indigo-600 hover:bg-indigo-700">Save Expense</Button>
        </CardFooter>
      </Card>
    </div>
  );
}
