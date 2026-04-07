import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

interface EventRow {
  EventID: number;
  EventName: string;
  EventDescription: string | null;
  EventCategoryID: number | null;
  DepartmentID: number | null;
  CreatedBy: string;
  CreatedDate: string;
  LastUpdatedBy: string;
  LastUpdatedDate: string;
  Active: number;
}

// GET /api/events — returns all active records
export async function GET() {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM Events WHERE Active = 1 ORDER BY EventID').all() as EventRow[];
  return NextResponse.json(rows);
}

// POST /api/events — create a new record
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { EventName, EventDescription, EventCategoryID, DepartmentID, CreatedBy } = body;

  if (!EventName || !CreatedBy) {
    return NextResponse.json({ error: 'EventName and CreatedBy are required' }, { status: 400 });
  }

  const db = getDb();
  const result = db.prepare(`
    INSERT INTO Events (EventName, EventDescription, EventCategoryID, DepartmentID, CreatedBy, CreatedDate, LastUpdatedBy, LastUpdatedDate, Active)
    VALUES (?, ?, ?, ?, ?, datetime('now'), ?, datetime('now'), 1)
  `).run(EventName, EventDescription ?? null, EventCategoryID ?? null, DepartmentID ?? null, CreatedBy, CreatedBy);

  const created = db.prepare('SELECT * FROM Events WHERE EventID = ?').get(result.lastInsertRowid) as EventRow;
  return NextResponse.json(created, { status: 201 });
}
