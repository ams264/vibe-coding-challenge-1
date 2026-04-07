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

type RouteContext = { params: Promise<{ id: string }> };

function getRow(id: number): SampleRow | undefined {
  return getDb().prepare('SELECT * FROM sample WHERE SampleID = ?').get(id) as SampleRow | undefined;
}

// GET /api/sample/[id] — get a single record by ID
export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const row = getRow(Number(id));
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(row);
}

// PUT /api/sample/[id] — update SampleText and/or LastUpdatedBy
export async function PUT(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const row = getRow(Number(id));
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();
  const { SampleText, LastUpdatedBy } = body;

  if (!SampleText || !LastUpdatedBy) {
    return NextResponse.json({ error: 'SampleText and LastUpdatedBy are required' }, { status: 400 });
  }

  const db = getDb();
  db.prepare(`
    UPDATE sample
    SET SampleText = ?, LastUpdatedBy = ?, LastUpdatedDate = datetime('now')
    WHERE SampleID = ?
  `).run(SampleText, LastUpdatedBy, Number(id));

  return NextResponse.json(getRow(Number(id)));
}

// PATCH /api/sample/[id] — soft delete (set Active = 0)
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const row = getRow(Number(id));
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();
  const { LastUpdatedBy } = body;

  if (!LastUpdatedBy) {
    return NextResponse.json({ error: 'LastUpdatedBy is required' }, { status: 400 });
  }

  const db = getDb();
  db.prepare(`
    UPDATE sample
    SET Active = 0, LastUpdatedBy = ?, LastUpdatedDate = datetime('now')
    WHERE SampleID = ?
  `).run(LastUpdatedBy, Number(id));

  return NextResponse.json(getRow(Number(id)));
}

// DELETE /api/sample/[id] — hard delete
export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const row = getRow(Number(id));
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  getDb().prepare('DELETE FROM sample WHERE SampleID = ?').run(Number(id));
  return new Response(null, { status: 204 });
}
