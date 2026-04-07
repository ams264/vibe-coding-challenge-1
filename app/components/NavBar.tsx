'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './NavBar.module.css';

interface User { username: string; role: string; }

const NAV_LINKS = [
  { href: '/bingo',  label: '🎱 Bingo' },
  { href: '/sample', label: '📋 Sample' },
  { href: '/admin',  label: '⚙️ Admin', adminOnly: true },
];

export default function NavBar() {
  const pathname = usePathname();
  const router   = useRouter();
  const [user, setUser]         = useState<User | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.ok ? r.json() : { user: null })
      .then(({ user }: { user: User | null }) => setUser(user));
  }, [pathname]); // re-check on every navigation

  // Hide on auth pages
  if (pathname === '/login' || pathname === '/signup') return null;

  async function handleSignOut() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  const visibleLinks = NAV_LINKS.filter((l) => !l.adminOnly || user?.role === 'admin');

  return (
    <nav className={styles.nav}>
      <div className={styles.inner}>
        {/* Links */}
        <ul className={[styles.links, menuOpen ? styles.open : ''].join(' ')}>
          {visibleLinks.map(({ href, label }) => (
            <li key={href}>
              <Link
                href={href}
                className={[styles.link, pathname.startsWith(href) ? styles.active : ''].join(' ')}
                onClick={() => setMenuOpen(false)}
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Right side */}
        <div className={styles.right}>
          {user && (
            <>
              <span className={styles.userChip}>
                {user.username}
                {user.role === 'admin' && <span className={styles.adminDot} />}
              </span>
              <button className={styles.signOut} onClick={handleSignOut}>
                Sign out
              </button>
            </>
          )}
          {!user && (
            <>
              <Link href="/login"  className={styles.signIn}>Sign in</Link>
              <Link href="/signup" className={styles.signUp}>Sign up</Link>
            </>
          )}

          {/* Hamburger (mobile) */}
          <button
            className={styles.burger}
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            <span /><span /><span />
          </button>
        </div>
      </div>
    </nav>
  );
}
