import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

interface SampleRow {
  SampleID: number;
  SampleText: string;
  CreatedBy: string;
  CreatedDate: string;
  LastUpdatedBy: string;
  LastUpdatedDate: string;
  Active: number;
}

// GET /api/sample — returns all active records
export async function GET() {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM sample WHERE Active = 1 ORDER BY SampleID').all() as SampleRow[];
  return NextResponse.json(rows);
}

// POST /api/sample — create a new record
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { SampleText, CreatedBy } = body;

  if (!SampleText || !CreatedBy) {
    return NextResponse.json({ error: 'SampleText and CreatedBy are required' }, { status: 400 });
  }

  const db = getDb();
  const result = db.prepare(`
    INSERT INTO sample (SampleText, CreatedBy, CreatedDate, LastUpdatedBy, LastUpdatedDate, Active)
    VALUES (?, ?, datetime('now'), ?, datetime('now'), 1)
  `).run(SampleText, CreatedBy, CreatedBy);

  const created = db.prepare('SELECT * FROM sample WHERE SampleID = ?').get(result.lastInsertRowid) as SampleRow;
  return NextResponse.json(created, { status: 201 });
}
