"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileText, CheckCircle2, AlertTriangle, XCircle, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

export default function ImportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialGroupId = searchParams?.get("group");
  
  const [step, setStep] = useState(1);
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>(initialGroupId || "");
  const [file, setFile] = useState<File | null>(null);
  
  const [analyzedRows, setAnalyzedRows] = useState<any[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [importStats, setImportStats] = useState({ success: 0, duplicates: 0, converted: 0 });

  useEffect(() => {
    fetch("/api/groups")
      .then(res => res.json())
      .then(data => {
        if (data.groups) setGroups(data.groups);
      });
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleAnalyze = async () => {
    if (!file || !selectedGroupId) return;
    setIsAnalyzing(true);
    
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`/api/groups/${selectedGroupId}/import/analyze`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.rows) {
        setAnalyzedRows(data.rows);
        setStep(2);
      } else {
        alert(data.error || "Failed to analyze");
      }
    } catch (err) {
      alert("Error analyzing file");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRemoveRow = (id: string) => {
    setAnalyzedRows(prev => prev.filter(r => r.id !== id));
  };

  const handleCommit = async () => {
    setIsCommitting(true);
    try {
      // Filter out duplicate errors unless approved? We'll just submit the current state of analyzedRows
      const res = await fetch(`/api/groups/${selectedGroupId}/import/commit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: analyzedRows }),
      });
      const data = await res.json();
      
      if (data.success) {
        setImportStats({
          success: data.count,
          duplicates: analyzedRows.filter(r => r.anomalies.some((a: string) => a.includes("duplicate"))).length,
          converted: analyzedRows.filter(r => r.currency === "USD").length,
        });
        setStep(3);
      } else {
        alert(data.error || "Failed to import");
      }
    } catch (err) {
      alert("Error committing import");
    } finally {
      setIsCommitting(false);
    }
  };

  const flaggedCount = analyzedRows.filter(r => r.status === "flagged").length;

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
            
            <div className="w-full max-w-sm mb-6 text-left">
              <label className="block text-sm font-medium text-slate-700 mb-2">Select Target Group</label>
              <Select value={selectedGroupId} onValueChange={(v) => setSelectedGroupId(v || "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a group..." />
                </SelectTrigger>
                <SelectContent>
                  {groups.map(g => (
                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="h-20 w-20 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 mb-4">
              <Upload className="h-10 w-10" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Upload your CSV here</h3>
            <p className="text-slate-500 max-w-sm">
              Columns required: Date, Description, PaidBy, Amount, Currency, SplitType
            </p>
            
            <div className="pt-6 flex flex-col gap-4 items-center">
              <input type="file" accept=".csv" onChange={handleFileChange} className="block w-full max-w-sm text-sm text-slate-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-indigo-50 file:text-indigo-700
                hover:file:bg-indigo-100" 
              />
              <Button onClick={handleAnalyze} disabled={!file || !selectedGroupId || isAnalyzing} className="bg-indigo-600 hover:bg-indigo-700 mt-4 w-full max-w-xs">
                {isAnalyzing ? "Analyzing..." : "Analyze File"}
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
              <h4 className="font-bold text-amber-800">{flaggedCount} Anomalies Detected</h4>
              <p className="text-sm text-amber-700 mt-1">
                We found some issues in your CSV that require manual review.
              </p>
            </div>
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
                    <TableHead>Row #</TableHead>
                    <TableHead>Anomalies</TableHead>
                    <TableHead>Raw Data Preview</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analyzedRows.map((row, idx) => (
                    <TableRow key={row.id} className={row.status === "flagged" ? "bg-rose-50/30" : ""}>
                      <TableCell className="font-medium text-slate-500">{idx + 1}</TableCell>
                      <TableCell>
                        {row.anomalies.length > 0 ? (
                           <div className="flex flex-col gap-1 text-sm text-rose-600 font-medium">
                            {row.anomalies.map((a: string, i: number) => (
                              <div key={i} className="flex items-center gap-1"><XCircle className="h-3 w-3" /> {a}</div>
                            ))}
                           </div>
                        ) : (
                          <span className="text-emerald-600 text-sm font-medium">Clean</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-slate-500">
                        "{row.description}", "{row.paidBy}", "{row.amount}", "{row.currency}", "{row.date}"
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button size="sm" variant="outline" onClick={() => handleRemoveRow(row.id)} className="text-rose-600 border-rose-200 hover:bg-rose-50">Remove</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <CardFooter className="flex justify-between border-t pt-6">
              <Button variant="ghost" onClick={() => setStep(1)}>Cancel</Button>
              <Button onClick={handleCommit} disabled={isCommitting || analyzedRows.length === 0} className="bg-indigo-600 hover:bg-indigo-700 gap-2">
                {isCommitting ? "Importing..." : "Complete Import"} <ArrowRight className="h-4 w-4" />
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
                <span className="font-bold text-emerald-600">{importStats.success} rows</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Currency Converted</span>
                <span className="font-bold text-indigo-600">{importStats.converted} rows</span>
              </div>
            </div>

            <div className="pt-4 flex gap-4">
              <Link href={`/groups/${selectedGroupId}`}>
                <Button className="bg-indigo-600 hover:bg-indigo-700">
                  Go to Group
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
