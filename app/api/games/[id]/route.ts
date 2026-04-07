import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifySession, COOKIE_NAME } from '@/lib/session';

interface GameRow {
  GameID: number;
  UserID: number;
  GridJSON: string;
  MarkedJSON: string;
  Status: string;
  CreatedDate: string;
  UpdatedDate: string;
  Active: number;
}

type RouteContext = { params: Promise<{ id: string }> };

async function requireOwner(req: NextRequest, gameId: number): Promise<GameRow | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const session = await verifySession(token);
  if (!session) return null;

  const db = getDb();
  const game = db.prepare('SELECT * FROM Games WHERE GameID = ? AND UserID = ? AND Active = 1')
    .get(gameId, session.userId) as GameRow | undefined;

  return game ?? null;
}

// GET /api/games/[id] — full game data (grid + marks)
export async function GET(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const game = await requireOwner(req, Number(id));
  if (!game) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(game);
}

// PUT /api/games/[id] — update marks and/or status
export async function PUT(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const game = await requireOwner(req, Number(id));
  if (!game) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();
  const db = getDb();

  if (body.marked !== undefined) {
    db.prepare(`
      UPDATE Games SET MarkedJSON = ?, UpdatedDate = datetime('now') WHERE GameID = ?
    `).run(JSON.stringify(body.marked), Number(id));
  }

  if (body.status !== undefined) {
    db.prepare(`
      UPDATE Games SET Status = ?, UpdatedDate = datetime('now') WHERE GameID = ?
    `).run(body.status, Number(id));
  }

  return NextResponse.json(
    db.prepare('SELECT * FROM Games WHERE GameID = ?').get(Number(id)) as GameRow
  );
}

// DELETE /api/games/[id] — soft delete
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const game = await requireOwner(req, Number(id));
  if (!game) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  getDb().prepare('UPDATE Games SET Active = 0, UpdatedDate = datetime(\'now\') WHERE GameID = ?')
    .run(Number(id));

  return new Response(null, { status: 204 });
}
