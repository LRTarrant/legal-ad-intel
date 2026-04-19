import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    available: !!process.env.ELEVENLABS_API_KEY,
  });
}
