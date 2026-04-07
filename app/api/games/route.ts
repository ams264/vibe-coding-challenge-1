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

function requireAuth(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  return token ? verifySession(token) : Promise.resolve(null);
}

// GET /api/games — list in-progress games for the current user
export async function GET(req: NextRequest) {
  const session = await requireAuth(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDb();
  const rows = db.prepare(`
    SELECT GameID, MarkedJSON, CreatedDate, Status
    FROM Games
    WHERE UserID = ? AND Status = 'in_progress' AND Active = 1
    ORDER BY UpdatedDate DESC
  `).all(session.userId) as Pick<GameRow, 'GameID' | 'MarkedJSON' | 'CreatedDate' | 'Status'>[];

  const games = rows.map((r) => ({
    GameID: r.GameID,
    MarkedCount: (JSON.parse(r.MarkedJSON) as number[]).length,
    CreatedDate: r.CreatedDate,
    Status: r.Status,
  }));

  return NextResponse.json(games);
}

// POST /api/games — create a new game
export async function POST(req: NextRequest) {
  const session = await requireAuth(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { grid } = await req.json();
  if (!grid) return NextResponse.json({ error: 'grid is required' }, { status: 400 });

  const db = getDb();
  const result = db.prepare(`
    INSERT INTO Games (UserID, GridJSON, MarkedJSON, Status, CreatedDate, UpdatedDate, Active)
    VALUES (?, ?, '[12]', 'in_progress', datetime('now'), datetime('now'), 1)
  `).run(session.userId, JSON.stringify(grid));

  const game = db.prepare('SELECT * FROM Games WHERE GameID = ?')
    .get(result.lastInsertRowid) as GameRow;

  return NextResponse.json(game, { status: 201 });
}
