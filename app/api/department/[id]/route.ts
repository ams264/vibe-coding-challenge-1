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

type RouteContext = { params: Promise<{ id: string }> };

function getRow(id: number): DepartmentRow | undefined {
  return getDb().prepare('SELECT * FROM Department WHERE DepartmentID = ?').get(id) as DepartmentRow | undefined;
}

// GET /api/department/[id]
export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const row = getRow(Number(id));
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(row);
}

// PUT /api/department/[id]
export async function PUT(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const row = getRow(Number(id));
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();
  const { DepartmentName, LastUpdatedBy } = body;

  if (!DepartmentName || !LastUpdatedBy) {
    return NextResponse.json({ error: 'DepartmentName and LastUpdatedBy are required' }, { status: 400 });
  }

  getDb().prepare(`
    UPDATE Department
    SET DepartmentName = ?, LastUpdatedBy = ?, LastUpdatedDate = datetime('now')
    WHERE DepartmentID = ?
  `).run(DepartmentName, LastUpdatedBy, Number(id));

  return NextResponse.json(getRow(Number(id)));
}

// PATCH /api/department/[id] — soft delete (set Active = 0)
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const row = getRow(Number(id));
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();
  const { LastUpdatedBy } = body;

  if (!LastUpdatedBy) {
    return NextResponse.json({ error: 'LastUpdatedBy is required' }, { status: 400 });
  }

  getDb().prepare(`
    UPDATE Department
    SET Active = 0, LastUpdatedBy = ?, LastUpdatedDate = datetime('now')
    WHERE DepartmentID = ?
  `).run(LastUpdatedBy, Number(id));

  return NextResponse.json(getRow(Number(id)));
}

// DELETE /api/department/[id] — hard delete
export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const row = getRow(Number(id));
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  getDb().prepare('DELETE FROM Department WHERE DepartmentID = ?').run(Number(id));
  return new Response(null, { status: 204 });
}
