"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileText, CheckCircle2, AlertTriangle, XCircle, ArrowRight, Check, AlertCircle, Info } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

type Anomaly = { type: "critical" | "warning" | "info"; message: string };

type AnalyzedRow = {
  id: string;
  date: string;
  description: string;
  paidBy: string;
  amount: number;
  currency: string;
  splitType: string;
  anomalies: Anomaly[];
  status: "flagged" | "clean";
  userAction?: "approved" | "skipped";
};

export default function ImportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialGroupId = searchParams?.get("group");
  
  const [step, setStep] = useState(1);
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>(initialGroupId || "");
  const [file, setFile] = useState<File | null>(null);
  
  const [analyzedRows, setAnalyzedRows] = useState<AnalyzedRow[]>([]);
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

  const handleApprove = (id: string) => {
    setAnalyzedRows(prev => prev.map(r => r.id === id ? { ...r, userAction: "approved" } : r));
  };

  const handleSkip = (id: string) => {
    setAnalyzedRows(prev => prev.map(r => r.id === id ? { ...r, userAction: "skipped" } : r));
  };

  const handleApproveAllWarnings = () => {
    setAnalyzedRows(prev => prev.map(r => {
      if (r.status === "flagged" && r.userAction !== "skipped" && !r.anomalies.some(a => a.type === "critical")) {
        return { ...r, userAction: "approved" };
      }
      return r;
    }));
  };

  const handleCommit = async () => {
    setIsCommitting(true);
    try {
      const rowsToImport = analyzedRows.filter(r => r.status === "clean" || r.userAction === "approved");
      
      const res = await fetch(`/api/groups/${selectedGroupId}/import/commit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: rowsToImport }),
      });
      const data = await res.json();
      
      if (data.success) {
        setImportStats({
          success: data.count,
          duplicates: rowsToImport.filter(r => r.anomalies?.some(a => a.message.includes("duplicate"))).length,
          converted: rowsToImport.filter(r => r.currency === "USD").length,
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

  // Determine if we can proceed
  // All criticals must be skipped. All warnings must be approved or skipped.
  const canProceed = analyzedRows.every(r => {
    if (r.status === "clean") return true;
    if (r.userAction === "skipped") return true;
    const hasCritical = r.anomalies.some(a => a.type === "critical");
    if (hasCritical) return false; // Must be skipped
    if (r.userAction === "approved") return true;
    return false; // Warning not yet approved or skipped
  });

  const flaggedRows = analyzedRows.filter(r => r.status === "flagged");
  const warningsCount = flaggedRows.filter(r => !r.anomalies.some(a => a.type === "critical") && !r.userAction).length;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Import Wizard</h1>
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
            <span className="text-sm font-medium text-center">Report Card</span>
          </div>
          <div className={`flex-1 h-1 mx-4 rounded ${step >= 4 ? 'bg-indigo-600' : 'bg-slate-200'}`}></div>
          <div className={`flex flex-col items-center ${step >= 4 ? 'text-indigo-600' : 'text-slate-400'}`}>
            <div className={`h-10 w-10 rounded-full flex items-center justify-center border-2 font-bold mb-2 ${step >= 4 ? 'border-indigo-600 bg-indigo-50' : 'border-slate-300'}`}>4</div>
            <span className="text-sm font-medium text-center">Summary</span>
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
                  <SelectValue placeholder="Choose a group...">
                    {groups.find(g => g.id === selectedGroupId)?.name || "Choose a group..."}
                  </SelectValue>
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
          <div className="flex justify-between items-center bg-slate-50 border rounded-lg p-4">
            <div className="flex items-center gap-4">
              <AlertTriangle className="h-6 w-6 text-amber-500" />
              <div>
                <h4 className="font-bold text-slate-800">{flaggedRows.length} Anomalies Detected</h4>
                <p className="text-sm text-slate-600 mt-1">Review and resolve issues to proceed.</p>
              </div>
            </div>
            {warningsCount > 0 && (
              <Button onClick={handleApproveAllWarnings} variant="outline" className="border-amber-300 text-amber-700 hover:bg-amber-50">
                Approve all warnings
              </Button>
            )}
          </div>

          <Card>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Row #</TableHead>
                    <TableHead>Anomalies</TableHead>
                    <TableHead>Raw Data Preview</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analyzedRows.filter(r => r.status === "flagged").map((row, idx) => {
                    const hasCritical = row.anomalies.some(a => a.type === "critical");
                    const borderColor = hasCritical ? "border-l-red-500" : row.anomalies.some(a => a.type === "warning") ? "border-l-amber-500" : "border-l-blue-500";
                    const isResolved = row.userAction !== undefined;
                    
                    return (
                      <TableRow key={row.id} className={`${borderColor} border-l-4 ${isResolved ? 'opacity-50 bg-slate-50' : ''}`}>
                        <TableCell className="font-medium text-slate-500">{parseInt(row.id) + 1}</TableCell>
                        <TableCell>
                           <div className="flex flex-col gap-1 text-sm font-medium">
                            {row.anomalies.map((a, i) => (
                              <div key={i} className={`flex items-center gap-1 ${a.type === 'critical' ? 'text-red-600' : a.type === 'warning' ? 'text-amber-600' : 'text-blue-600'}`}>
                                {a.type === 'critical' ? <XCircle className="h-4 w-4" /> : a.type === 'warning' ? <AlertCircle className="h-4 w-4" /> : <Info className="h-4 w-4" />} 
                                {a.message}
                              </div>
                            ))}
                           </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-mono text-xs bg-slate-100 p-2 rounded text-slate-700 whitespace-pre">
                            {row.date}, {row.description}, {row.paidBy}, {row.amount}, {row.currency}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {isResolved ? (
                            <span className="text-sm font-bold text-slate-500 capitalize">{row.userAction}</span>
                          ) : (
                            <div className="flex gap-2 justify-end">
                              <Button size="sm" variant="outline" onClick={() => handleSkip(row.id)} className="text-slate-600 hover:bg-slate-100">
                                Skip
                              </Button>
                              {!hasCritical && (
                                <Button size="sm" onClick={() => handleApprove(row.id)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                                  Approve
                                </Button>
                              )}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <CardFooter className="flex justify-between border-t pt-6 bg-slate-50">
              <Button variant="ghost" onClick={() => setStep(1)}>Cancel</Button>
              <Button onClick={handleCommit} disabled={!canProceed || isCommitting} className="bg-indigo-600 hover:bg-indigo-700 gap-2">
                {isCommitting ? "Importing..." : "Import now"} <ArrowRight className="h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* Step 3: Report Card */}
      {step === 3 && (
        <Card className="max-w-2xl mx-auto border-emerald-200 bg-white shadow-xl">
          <CardHeader className="bg-emerald-600 text-white rounded-t-xl py-8">
            <div className="flex justify-center mb-4">
               <div className="h-20 w-20 bg-white/20 rounded-full flex items-center justify-center">
                 <CheckCircle2 className="h-12 w-12 text-white" />
               </div>
            </div>
            <CardTitle className="text-center text-3xl">Import Report Card</CardTitle>
            <CardDescription className="text-center text-emerald-100 text-lg">Your file has been successfully processed.</CardDescription>
          </CardHeader>
          <CardContent className="py-8 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 border rounded-lg p-4 text-center">
                <p className="text-sm text-slate-500 uppercase tracking-wide">Successfully Imported</p>
                <p className="text-4xl font-bold text-slate-900 mt-2">{importStats.success} rows</p>
              </div>
              <div className="bg-slate-50 border rounded-lg p-4 text-center">
                <p className="text-sm text-slate-500 uppercase tracking-wide">Skipped / Anomalies</p>
                <p className="text-4xl font-bold text-rose-600 mt-2">{analyzedRows.length - importStats.success}</p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-center border-t py-6 bg-slate-50 rounded-b-xl">
            <Link href={`/groups/${selectedGroupId}`}>
              <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700 px-12 text-lg">
                View balances
              </Button>
            </Link>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
