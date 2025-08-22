import { type NextRequest, NextResponse } from "next/server"
import {connectDB} from "@/lib/db"
import Organization from "@/models/Organization"
import User from "@/models/User"
import Domain from "@/models/Domain"
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import "@/models/Plan" // Ensure Plan model is imported to avoid issues
import { SessionUser } from "@/types"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as SessionUser | undefined;

    // Use the standard, secure way to get the session.
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB()

    const org = await Organization.findById(user.org_id).populate("plan_id")
    const userCount = await User.countDocuments({ org_id: user.org_id })
    const domainCount = await Domain.countDocuments({ org_id: user.org_id })

    return NextResponse.json({
      organization: {
        ...org.toObject(),
        stats: {
          users: userCount,
          domains: domainCount,
        },
      },
    })
  } catch (error) {
    console.error("Organization fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as SessionUser | undefined;

    if (!user || user.role !== "owner") {
      return NextResponse.json({ error: "Only owners can update organization" }, { status: 403 })
    }

    const updates = await request.json()
    await connectDB()

    const org = await Organization.findByIdAndUpdate(user.org_id, updates, { new: true }).populate("plan_id")

    return NextResponse.json({ organization: org })
  } catch (error) {
    console.error("Organization update error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// export async function POST(request: NextRequest) {
//   try {
//     const user = await getAuthUser(request)
//     if (!user || user.role !== "owner") {
//       return NextResponse.json({ error: "Only owners can create organizations" }, { status: 403 })
//     }

//     const data = await request.json()
//     const { name, description, industry, size, country } = data

//     if (!name || !industry || !size || !country) {
//       return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
//     }

//     await connectDB()

//     const newOrganization = new Organization({
//       name,
//       description,
//       industry,
//       size,
//       country,
//       owner_id: user._id,
//     })

//     await newOrganization.save()

//     return NextResponse.json({ organization: newOrganization }, { status: 201 })
//   } catch (error) {
//     console.error("Organization creation error:", error)
//     return NextResponse.json({ error: "Internal server error" }, { status: 500 })
//   }
// }