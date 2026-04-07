import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifySession, COOKIE_NAME } from '@/lib/session';

interface EventRow {
  EventID: number;
  EventName: string;
  EventDescription: string | null;
  EventCategoryID: number | null;
  DepartmentID: number | null;
}

// GET /api/events/random?count=24
// If the caller has a session with a departmentId, only events from that
// department (or events with no department) are returned.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const count = Math.min(Number(searchParams.get('count') ?? 24), 100);

  // Read department from session cookie (if any)
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;
  const departmentId = session?.departmentId ?? null;

  const db = getDb();

  const rows = departmentId
    ? db.prepare(`
        SELECT * FROM Events
        WHERE Active = 1
          AND (DepartmentID = ? OR DepartmentID IS NULL)
        ORDER BY RANDOM()
        LIMIT ?
      `).all(departmentId, count) as EventRow[]
    : db.prepare(`
        SELECT * FROM Events
        WHERE Active = 1
        ORDER BY RANDOM()
        LIMIT ?
      `).all(count) as EventRow[];

  return NextResponse.json(rows);
}
