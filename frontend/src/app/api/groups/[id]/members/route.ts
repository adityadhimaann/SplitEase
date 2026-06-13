import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 });

    const { id: groupId } = await params;

    // Check if user has access to group
    const groupAccess = await prisma.groupMember.findFirst({
      where: { groupId, userId: user.id }
    });

    if (!groupAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Find the user to add
    const targetUser = await prisma.user.findUnique({
      where: { email }
    });

    if (!targetUser) return NextResponse.json({ error: "User with this email not found" }, { status: 404 });

    // Check if already a member
    const existingMember = await prisma.groupMember.findFirst({
      where: { groupId, userId: targetUser.id }
    });

    if (existingMember) {
      if (!existingMember.leftAt) {
        return NextResponse.json({ error: "User is already an active member" }, { status: 400 });
      }
      // Re-activate member
      await prisma.groupMember.update({
        where: { id: existingMember.id },
        data: { leftAt: null, joinedAt: new Date() }
      });
    } else {
      // Add new member
      await prisma.groupMember.create({
        data: {
          groupId,
          userId: targetUser.id
        }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to add member:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
