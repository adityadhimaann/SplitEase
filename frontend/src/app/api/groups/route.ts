import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const groups = await prisma.group.findMany({
    where: {
      members: {
        some: {
          userId: user.id
        }
      }
    },
    include: {
      members: {
        include: {
          user: { select: { id: true, name: true } }
        }
      }
    }
  });

  return NextResponse.json({ groups });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name } = await req.json();
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const group = await prisma.group.create({
    data: {
      name,
      members: {
        create: {
          userId: user.id
        }
      }
    }
  });

  return NextResponse.json({ success: true, group });
}
