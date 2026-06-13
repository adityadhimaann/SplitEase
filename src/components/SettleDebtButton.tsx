"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface SettleDebtButtonProps {
  groupId: string;
  payerId: string;
  payeeId: string;
  amount: number;
}

export function SettleDebtButton({ groupId, payerId, payeeId, amount }: SettleDebtButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSettle = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/groups/${groupId}/settlements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payerId, payeeId, amount }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to settle debt");
        return;
      }

      router.refresh();
    } catch (err) {
      console.error(err);
      alert("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button 
      variant="outline" 
      onClick={handleSettle}
      disabled={loading}
      className="bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100"
    >
      {loading ? "Settling..." : "Mark as Settled"}
    </Button>
  );
}
