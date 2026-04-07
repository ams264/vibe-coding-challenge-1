import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

interface DepartmentRow {
  DepartmentID: number;
  DepartmentName: string;
  CreatedBy: string;
  CreatedDate: string;
  LastUpdatedBy: string;
  LastUpdatedDate: string;
  Active: number;
}

// GET /api/department — returns all active records
export async function GET() {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM Department WHERE Active = 1 ORDER BY DepartmentID').all() as DepartmentRow[];
  return NextResponse.json(rows);
}

// POST /api/department — create a new record
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { DepartmentName, CreatedBy } = body;

  if (!DepartmentName || !CreatedBy) {
    return NextResponse.json({ error: 'DepartmentName and CreatedBy are required' }, { status: 400 });
  }

  const db = getDb();
  const result = db.prepare(`
    INSERT INTO Department (DepartmentName, CreatedBy, CreatedDate, LastUpdatedBy, LastUpdatedDate, Active)
    VALUES (?, ?, datetime('now'), ?, datetime('now'), 1)
  `).run(DepartmentName, CreatedBy, CreatedBy);

  const created = db.prepare('SELECT * FROM Department WHERE DepartmentID = ?').get(result.lastInsertRowid) as DepartmentRow;
  return NextResponse.json(created, { status: 201 });
}
