import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

interface EventCategoryRow {
  EventCategoryID: number;
  CategoryName: string;
  CategoryDescription: string | null;
  CreatedBy: string;
  CreatedDate: string;
  LastUpdatedBy: string;
  LastUpdatedDate: string;
  Active: number;
}

// GET /api/event-category — returns all active records
export async function GET() {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM EventCategory WHERE Active = 1 ORDER BY EventCategoryID').all() as EventCategoryRow[];
  return NextResponse.json(rows);
}

// POST /api/event-category — create a new record
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { CategoryName, CategoryDescription, CreatedBy } = body;

  if (!CategoryName || !CreatedBy) {
    return NextResponse.json({ error: 'CategoryName and CreatedBy are required' }, { status: 400 });
  }

  const db = getDb();
  const result = db.prepare(`
    INSERT INTO EventCategory (CategoryName, CategoryDescription, CreatedBy, CreatedDate, LastUpdatedBy, LastUpdatedDate, Active)
    VALUES (?, ?, ?, datetime('now'), ?, datetime('now'), 1)
  `).run(CategoryName, CategoryDescription ?? null, CreatedBy, CreatedBy);

  const created = db.prepare('SELECT * FROM EventCategory WHERE EventCategoryID = ?').get(result.lastInsertRowid) as EventCategoryRow;
  return NextResponse.json(created, { status: 201 });
}
