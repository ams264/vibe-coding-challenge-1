import { NextRequest, NextResponse } from 'next/server';
import { compareSync } from 'bcryptjs';
import { getDb } from '@/lib/db';
import { signSession, COOKIE_NAME, EXPIRES_IN } from '@/lib/session';

interface UserRow {
  UserID: number;
  Username: string;
  PasswordHash: string;
  Role: string;
  Active: number;
}

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();

  if (!username || !password) {
    return NextResponse.json({ error: 'Username and password are required.' }, { status: 400 });
  }

  const db = getDb();
  const user = db
    .prepare('SELECT * FROM users WHERE Username = ? AND Active = 1')
    .get(username) as UserRow | undefined;

  if (!user || !compareSync(password, user.PasswordHash)) {
    return NextResponse.json({ error: 'Invalid username or password.' }, { status: 401 });
  }

  const token = await signSession({ userId: user.UserID, username: user.Username, role: user.Role });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: EXPIRES_IN,
  });
  return res;
}
