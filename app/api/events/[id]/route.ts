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

type RouteContext = { params: Promise<{ id: string }> };

function getRow(id: number): EventRow | undefined {
  return getDb().prepare('SELECT * FROM Events WHERE EventID = ?').get(id) as EventRow | undefined;
}

// GET /api/events/[id]
export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const row = getRow(Number(id));
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(row);
}

// PUT /api/events/[id]
export async function PUT(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const row = getRow(Number(id));
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();
  const { EventName, EventDescription, EventCategoryID, DepartmentID, LastUpdatedBy } = body;

  if (!EventName || !LastUpdatedBy) {
    return NextResponse.json({ error: 'EventName and LastUpdatedBy are required' }, { status: 400 });
  }

  getDb().prepare(`
    UPDATE Events
    SET EventName = ?, EventDescription = ?, EventCategoryID = ?, DepartmentID = ?,
        LastUpdatedBy = ?, LastUpdatedDate = datetime('now')
    WHERE EventID = ?
  `).run(EventName, EventDescription ?? null, EventCategoryID ?? null, DepartmentID ?? null, LastUpdatedBy, Number(id));

  return NextResponse.json(getRow(Number(id)));
}

// PATCH /api/events/[id] — soft delete (set Active = 0)
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
    UPDATE Events
    SET Active = 0, LastUpdatedBy = ?, LastUpdatedDate = datetime('now')
    WHERE EventID = ?
  `).run(LastUpdatedBy, Number(id));

  return NextResponse.json(getRow(Number(id)));
}

// DELETE /api/events/[id] — hard delete
export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const row = getRow(Number(id));
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  getDb().prepare('DELETE FROM Events WHERE EventID = ?').run(Number(id));
  return new Response(null, { status: 204 });
}
