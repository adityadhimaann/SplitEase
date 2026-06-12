"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, FileText, CheckCircle2, AlertTriangle, XCircle, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function ImportPage() {
  const [step, setStep] = useState(1);

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Import Expenses</h1>
        <p className="text-slate-500">Upload your CSV file to import expenses in bulk.</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-center mb-8">
        <div className="flex items-center w-full max-w-3xl">
          <div className={`flex flex-col items-center ${step >= 1 ? 'text-indigo-600' : 'text-slate-400'}`}>
            <div className={`h-10 w-10 rounded-full flex items-center justify-center border-2 font-bold mb-2 ${step >= 1 ? 'border-indigo-600 bg-indigo-50' : 'border-slate-300'}`}>1</div>
            <span className="text-sm font-medium">Upload</span>
          </div>
          <div className={`flex-1 h-1 mx-4 rounded ${step >= 2 ? 'bg-indigo-600' : 'bg-slate-200'}`}></div>
          <div className={`flex flex-col items-center ${step >= 2 ? 'text-indigo-600' : 'text-slate-400'}`}>
            <div className={`h-10 w-10 rounded-full flex items-center justify-center border-2 font-bold mb-2 ${step >= 2 ? 'border-indigo-600 bg-indigo-50' : 'border-slate-300'}`}>2</div>
            <span className="text-sm font-medium">Review Anomalies</span>
          </div>
          <div className={`flex-1 h-1 mx-4 rounded ${step >= 3 ? 'bg-indigo-600' : 'bg-slate-200'}`}></div>
          <div className={`flex flex-col items-center ${step >= 3 ? 'text-indigo-600' : 'text-slate-400'}`}>
            <div className={`h-10 w-10 rounded-full flex items-center justify-center border-2 font-bold mb-2 ${step >= 3 ? 'border-indigo-600 bg-indigo-50' : 'border-slate-300'}`}>3</div>
            <span className="text-sm font-medium">Complete</span>
          </div>
        </div>
      </div>

      {/* Step 1: Upload */}
      {step === 1 && (
        <Card className="border-dashed border-2 border-slate-300">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <div className="h-20 w-20 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 mb-4">
              <Upload className="h-10 w-10" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Drag and drop your CSV here</h3>
            <p className="text-slate-500 max-w-sm">
              Files must follow the standard SplitEase format. Maximum file size is 5MB.
            </p>
            <div className="pt-6 flex gap-4">
              <Button variant="outline" className="gap-2">
                <FileText className="h-4 w-4" /> Download Template
              </Button>
              <Button onClick={() => setStep(2)} className="bg-indigo-600 hover:bg-indigo-700">
                Browse Files
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Anomaly Review */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-4">
            <AlertTriangle className="h-6 w-6 text-amber-500 shrink-0" />
            <div>
              <h4 className="font-bold text-amber-800">12 Anomalies Detected</h4>
              <p className="text-sm text-amber-700 mt-1">
                We found some issues in your CSV that require manual review. 
                <strong> 4 are critical</strong> and must be resolved before importing.
              </p>
            </div>
            <Button variant="outline" className="ml-auto bg-white hover:bg-slate-50">
              Approve All Warnings
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Review Queue</CardTitle>
              <CardDescription>Approve or reject flagged rows (Meera&apos;s Requirement)</CardDescription>
            </CardHeader>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Row</TableHead>
                    <TableHead>Problem</TableHead>
                    <TableHead>Raw Data Preview</TableHead>
                    <TableHead>Suggested Fix</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow className="bg-rose-50/50">
                    <TableCell className="font-medium text-slate-500">14</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-rose-600 font-medium">
                        <XCircle className="h-4 w-4" /> Duplicate Entry
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-mono text-slate-500">
                      &quot;Dinner&quot;, &quot;Aisha&quot;, &quot;1200&quot;, &quot;2024-03-10&quot;
                    </TableCell>
                    <TableCell className="text-sm">Identical to Row 8. Skip this row.</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button size="sm" variant="outline" className="text-emerald-600 border-emerald-200 hover:bg-emerald-50">Approve Fix</Button>
                      <Button size="sm" variant="ghost" className="text-rose-600">Keep Both</Button>
                    </TableCell>
                  </TableRow>
                  <TableRow className="bg-amber-50/50">
                    <TableCell className="font-medium text-slate-500">28</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-amber-600 font-medium">
                        <AlertTriangle className="h-4 w-4" /> Negative Amount
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-mono text-slate-500">
                      &quot;Refund&quot;, &quot;Rohan&quot;, &quot;-500&quot;, &quot;2024-03-15&quot;
                    </TableCell>
                    <TableCell className="text-sm">Convert to positive income or skip.</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button size="sm" variant="outline" className="text-emerald-600 border-emerald-200 hover:bg-emerald-50">Skip Row</Button>
                      <Button size="sm" variant="ghost">Edit</Button>
                    </TableCell>
                  </TableRow>
                  <TableRow className="bg-blue-50/50">
                    <TableCell className="font-medium text-slate-500">42</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-blue-600 font-medium">
                        <AlertTriangle className="h-4 w-4" /> Currency Mismatch
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-mono text-slate-500">
                      &quot;Uber&quot;, &quot;Priya&quot;, &quot;15.50&quot;, &quot;USD&quot;
                    </TableCell>
                    <TableCell className="text-sm">Convert $15.50 to ₹1,293.47 using today&apos;s rate.</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button size="sm" variant="outline" className="text-emerald-600 border-emerald-200 hover:bg-emerald-50">Approve Fix</Button>
                    </TableCell>
                  </TableRow>
                  <TableRow className="bg-purple-50/50">
                    <TableCell className="font-medium text-slate-500">55</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-purple-600 font-medium">
                        <AlertTriangle className="h-4 w-4" /> Date Conflict
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-mono text-slate-500">
                      &quot;Drinks&quot;, &quot;Sam&quot;, &quot;800&quot;, &quot;2024-02-14&quot;
                    </TableCell>
                    <TableCell className="text-sm">Sam joined in April. Skip for Sam.</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button size="sm" variant="outline" className="text-emerald-600 border-emerald-200 hover:bg-emerald-50">Approve Fix</Button>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
            <CardFooter className="flex justify-between border-t pt-6">
              <Button variant="ghost" onClick={() => setStep(1)}>Cancel</Button>
              <Button onClick={() => setStep(3)} className="bg-indigo-600 hover:bg-indigo-700 gap-2">
                Complete Import <ArrowRight className="h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* Step 3: Complete */}
      {step === 3 && (
        <Card className="max-w-2xl mx-auto border-emerald-200 bg-emerald-50/30">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center space-y-6">
            <div className="h-20 w-20 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mb-2">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-slate-900">Import Successful</h3>
              <p className="text-slate-500 mt-2">Your CSV has been processed and expenses added.</p>
            </div>
            
            <div className="bg-white border rounded-lg p-6 w-full max-w-sm text-left space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Successfully Imported</span>
                <span className="font-bold text-emerald-600">84 rows</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Duplicates Skipped</span>
                <span className="font-bold text-slate-900">3 rows</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Currency Converted</span>
                <span className="font-bold text-indigo-600">12 rows</span>
              </div>
            </div>

            <div className="pt-4 flex gap-4">
              <Button variant="outline" className="gap-2">
                <FileText className="h-4 w-4" /> Download Report
              </Button>
              <Link href="/dashboard">
                <Button className="bg-indigo-600 hover:bg-indigo-700">
                  Go to Dashboard
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
