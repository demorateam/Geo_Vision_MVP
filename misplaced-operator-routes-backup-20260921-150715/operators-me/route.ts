import { NextResponse } from "next/server";
import { getOperatorSession } from "@/lib/operator-auth";

export async function GET() {
  const operator = await getOperatorSession();
  return NextResponse.json({ operator });
}
