import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getGroupBalances } from "@/lib/algorithms/calculateBalances";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: groupId } = await params;
    const data = await getGroupBalances(groupId);

    if (!data) return NextResponse.json({ error: "Group not found" }, { status: 404 });

    // Ensure the current user is a member
    if (!data.group.members.some((m) => m.userId === user.id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({
      balances: data.balances,
      transactions: data.transactions,
    });
  } catch (error) {
    console.error("Error calculating balances:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
