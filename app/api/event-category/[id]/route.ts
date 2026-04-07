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

type RouteContext = { params: Promise<{ id: string }> };

function getRow(id: number): EventCategoryRow | undefined {
  return getDb().prepare('SELECT * FROM EventCategory WHERE EventCategoryID = ?').get(id) as EventCategoryRow | undefined;
}

// GET /api/event-category/[id]
export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const row = getRow(Number(id));
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(row);
}

// PUT /api/event-category/[id]
export async function PUT(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const row = getRow(Number(id));
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();
  const { CategoryName, CategoryDescription, LastUpdatedBy } = body;

  if (!CategoryName || !LastUpdatedBy) {
    return NextResponse.json({ error: 'CategoryName and LastUpdatedBy are required' }, { status: 400 });
  }

  getDb().prepare(`
    UPDATE EventCategory
    SET CategoryName = ?, CategoryDescription = ?, LastUpdatedBy = ?, LastUpdatedDate = datetime('now')
    WHERE EventCategoryID = ?
  `).run(CategoryName, CategoryDescription ?? null, LastUpdatedBy, Number(id));

  return NextResponse.json(getRow(Number(id)));
}

// PATCH /api/event-category/[id] — soft delete (set Active = 0)
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
    UPDATE EventCategory
    SET Active = 0, LastUpdatedBy = ?, LastUpdatedDate = datetime('now')
    WHERE EventCategoryID = ?
  `).run(LastUpdatedBy, Number(id));

  return NextResponse.json(getRow(Number(id)));
}

// DELETE /api/event-category/[id] — hard delete
export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const row = getRow(Number(id));
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  getDb().prepare('DELETE FROM EventCategory WHERE EventCategoryID = ?').run(Number(id));
  return new Response(null, { status: 204 });
}
