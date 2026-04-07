import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

interface EventRow {
  EventID: number;
  EventName: string;
  EventDescription: string | null;
  EventCategoryID: number | null;
  DepartmentID: number | null;
}

// GET /api/events/random?count=24
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const count = Math.min(Number(searchParams.get('count') ?? 24), 100);

  const db = getDb();
  const rows = db
    .prepare('SELECT * FROM Events WHERE Active = 1 ORDER BY RANDOM() LIMIT ?')
    .all(count) as EventRow[];

  return NextResponse.json(rows);
}
