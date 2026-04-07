import { NextRequest, NextResponse } from 'next/server';
import { hashSync } from 'bcryptjs';
import { getDb } from '@/lib/db';
import { signSession, COOKIE_NAME, EXPIRES_IN } from '@/lib/session';

export async function POST(req: NextRequest) {
  const { username, password, departmentId } = await req.json();

  if (!username || !password) {
    return NextResponse.json({ error: 'Username and password are required.' }, { status: 400 });
  }
  if (username.length < 3) {
    return NextResponse.json({ error: 'Username must be at least 3 characters.' }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });
  }

  const db = getDb();

  const existing = db.prepare('SELECT UserID FROM users WHERE Username = ?').get(username);
  if (existing) {
    return NextResponse.json({ error: 'Username is already taken.' }, { status: 409 });
  }

  const hash = hashSync(password, 10);
  const result = db.prepare(`
    INSERT INTO users (Username, PasswordHash, Role, DepartmentID, CreatedDate, Active)
    VALUES (?, ?, 'user', ?, datetime('now'), 1)
  `).run(username, hash, departmentId ?? null);

  const token = await signSession({
    userId: Number(result.lastInsertRowid),
    username,
    role: 'user',
    departmentId: departmentId ?? null,
  });

  const res = NextResponse.json({ ok: true }, { status: 201 });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: EXPIRES_IN,
  });
  return res;
}
