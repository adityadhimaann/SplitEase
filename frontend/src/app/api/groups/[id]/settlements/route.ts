import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: groupId } = await params;
    const { payerId, payeeId, amount } = await req.json();

    if (!payerId || !payeeId || amount <= 0) {
      return NextResponse.json({ error: "Invalid settlement parameters" }, { status: 400 });
    }

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: { members: true },
    });

    if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });

    // Verify both users are in group
    const payerInGroup = group.members.some(m => m.userId === payerId);
    const payeeInGroup = group.members.some(m => m.userId === payeeId);

    if (!payerInGroup || !payeeInGroup) {
      return NextResponse.json({ error: "Both users must be in the group" }, { status: 400 });
    }

    // Verify current user is in the group (any member can record a settlement)
    const currentUserInGroup = group.members.some(m => m.userId === user.id);
    if (!currentUserInGroup) {
      return NextResponse.json({ error: "You must be a member of the group to record a settlement" }, { status: 403 });
    }

    const settlement = await prisma.settlement.create({
      data: {
        groupId,
        payerId,
        payeeId,
        amount,
        date: new Date(),
      }
    });

    return NextResponse.json({ success: true, settlement });
  } catch (error) {
    console.error("Settlement error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
