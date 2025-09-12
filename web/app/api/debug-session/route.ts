import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { getServerSession } from "next-auth"

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  return Response.json(session)
}
