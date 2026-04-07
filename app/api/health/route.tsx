import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  const db = getDb();
  const result = db.prepare("SELECT sqlite_version() as version").get() as { version: string };
  return NextResponse.json({ status: "ok", sqlite_version: result.version });
}
