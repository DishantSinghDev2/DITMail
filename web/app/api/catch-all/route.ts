import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { SessionUser } from "@/types";
import {connectDB} from "@/lib/db";
import CatchAll from "@/models/CatchAll";
import Domain from "@/models/Domain";
import { logAuditEvent } from "@/lib/audit";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as SessionUser | undefined;
    if (!user || !["owner", "admin"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();
    const catchAlls = await CatchAll.find({ org_id: user.org_id })
      .populate("domain_id", "domain")
      .sort({ created_at: -1 });

    return NextResponse.json({ catchAlls });
  } catch (error) {
    console.error("Catch-all fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as SessionUser | undefined;
    if (!user || !["owner", "admin"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { domainId, destination } = await request.json();
    await connectDB();

    const domain = await Domain.findOne({ _id: domainId, org_id: user.org_id, status: "verified" });
    if (!domain) {
      return NextResponse.json({ error: "Domain not found or not verified" }, { status: 404 });
    }

    const existingCatchAll = await CatchAll.findOne({ domain_id: domainId });
    if (existingCatchAll) {
      return NextResponse.json({ error: "Catch-all already exists for this domain" }, { status: 400 });
    }

    const catchAll = new CatchAll({
      domain_id: domainId,
      destination,
      org_id: user.org_id,
    });
    await catchAll.save();

    await logAuditEvent({
      user_id: user.id,
      action: "catch_all_created",
      details: { domain: domain.domain, destination },
      ip: request.headers.get("x-forwarded-for") || "unknown",
    });

    return NextResponse.json({ catchAll });
  } catch (error) {
    console.error("Catch-all creation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}