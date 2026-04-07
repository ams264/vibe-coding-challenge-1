'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

// ── Types ────────────────────────────────────────────────────────────────────

interface User { username: string; role: string; }

interface Category {
  EventCategoryID: number;
  CategoryName: string;
  CategoryDescription: string | null;
  Active: number;
}

interface Department {
  DepartmentID: number;
  DepartmentName: string;
  Active: number;
}

interface Event {
  EventID: number;
  EventName: string;
  EventDescription: string | null;
  EventCategoryID: number | null;
  DepartmentID: number | null;
  Active: number;
}

type Tab = 'events' | 'categories' | 'departments';

// ── Component ────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser]             = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [tab, setTab]               = useState<Tab>('events');

  const [categories, setCategories] = useState<Category[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [events, setEvents]         = useState<Event[]>([]);

  const [notice, setNotice]         = useState('');
  const [error, setError]           = useState('');

  // ── Auth check ──────────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then(({ user }: { user: User | null }) => {
        if (!user) { router.replace('/login?from=/admin'); return; }
        if (user.role !== 'admin') { setUser(user); setAuthLoading(false); return; }
        setUser(user);
        setAuthLoading(false);
      });
  }, [router]);

  // ── Data fetchers ────────────────────────────────────────────────────────
  const loadCategories  = useCallback(() =>
    fetch('/api/event-category').then((r) => r.json()).then(setCategories), []);
  const loadDepartments = useCallback(() =>
    fetch('/api/department').then((r) => r.json()).then(setDepartments), []);
  const loadEvents      = useCallback(() =>
    fetch('/api/events').then((r) => r.json()).then(setEvents), []);

  useEffect(() => {
    if (!authLoading && user?.role === 'admin') {
      loadCategories();
      loadDepartments();
      loadEvents();
    }
  }, [authLoading, user, loadCategories, loadDepartments, loadEvents]);

  // ── Helpers ──────────────────────────────────────────────────────────────
  function flash(msg: string, isError = false) {
    if (isError) { setError(msg); setNotice(''); }
    else          { setNotice(msg); setError(''); }
    setTimeout(() => { setNotice(''); setError(''); }, 3500);
  }

  async function softDelete(endpoint: string, id: number) {
    const res = await fetch(`${endpoint}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ LastUpdatedBy: user!.username }),
    });
    return res.ok;
  }

  // ── Loading / auth guard ─────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.centred}>
          <div className={styles.spinner} />
        </div>
      </div>
    );
  }

  if (user?.role !== 'admin') {
    return (
      <div className={styles.page}>
        <div className={styles.centred}>
          <h1 className={styles.unauthorisedTitle}>Access Denied</h1>
          <p className={styles.unauthorisedSub}>This page is for admins only.</p>
          <button className={styles.btnSecondary} onClick={() => router.push('/bingo')}>
            ← Back to Bingo
          </button>
        </div>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className={styles.page}>
      <div className={styles.container}>

        {/* Header */}
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Admin Panel</h1>
            <p className={styles.subtitle}>
              Signed in as <strong>{user.username}</strong>
              <span className={styles.adminBadge}>admin</span>
            </p>
          </div>
        </div>

        {/* Notices */}
        {notice && <div className={styles.notice}>{notice}</div>}
        {error  && <div className={styles.errorBar}>{error}</div>}

        {/* Tabs */}
        <div className={styles.tabs}>
          {(['events', 'categories', 'departments'] as Tab[]).map((t) => (
            <button
              key={t}
              className={[styles.tab, tab === t ? styles.tabActive : ''].join(' ')}
              onClick={() => setTab(t)}
            >
              {t === 'events' ? '📅 Events' : t === 'categories' ? '🏷️ Categories' : '🏢 Departments'}
              <span className={styles.tabCount}>
                {t === 'events' ? events.length : t === 'categories' ? categories.length : departments.length}
              </span>
            </button>
          ))}
        </div>

        {/* Tab panels */}
        {tab === 'events' && (
          <EventsPanel
            events={events}
            categories={categories}
            departments={departments}
            username={user.username}
            onFlash={flash}
            onReload={loadEvents}
            onSoftDelete={(id) => softDelete('/api/events', id).then((ok) => {
              if (ok) { flash('Event deactivated.'); loadEvents(); }
              else flash('Failed to deactivate.', true);
            })}
          />
        )}
        {tab === 'categories' && (
          <CategoriesPanel
            categories={categories}
            username={user.username}
            onFlash={flash}
            onReload={loadCategories}
            onSoftDelete={(id) => softDelete('/api/event-category', id).then((ok) => {
              if (ok) { flash('Category deactivated.'); loadCategories(); }
              else flash('Failed to deactivate.', true);
            })}
          />
        )}
        {tab === 'departments' && (
          <DepartmentsPanel
            departments={departments}
            username={user.username}
            onFlash={flash}
            onReload={loadDepartments}
            onSoftDelete={(id) => softDelete('/api/department', id).then((ok) => {
              if (ok) { flash('Department deactivated.'); loadDepartments(); }
              else flash('Failed to deactivate.', true);
            })}
          />
        )}

      </div>
    </div>
  );
}

// ── Events panel ─────────────────────────────────────────────────────────────

function EventsPanel({
  events, categories, departments, username, onFlash, onReload, onSoftDelete,
}: {
  events: Event[];
  categories: Category[];
  departments: Department[];
  username: string;
  onFlash: (msg: string, err?: boolean) => void;
  onReload: () => void;
  onSoftDelete: (id: number) => void;
}) {
  const [name, setName]     = useState('');
  const [desc, setDesc]     = useState('');
  const [catId, setCatId]   = useState('');
  const [deptId, setDeptId] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        EventName: name.trim(),
        EventDescription: desc.trim() || null,
        EventCategoryID: catId ? Number(catId) : null,
        DepartmentID: deptId ? Number(deptId) : null,
        CreatedBy: username,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setName(''); setDesc(''); setCatId(''); setDeptId('');
      onFlash('Event added!');
      onReload();
    } else {
      onFlash('Failed to add event.', true);
    }
  }

  const catMap  = Object.fromEntries(categories.map((c) => [c.EventCategoryID, c.CategoryName]));
  const deptMap = Object.fromEntries(departments.map((d) => [d.DepartmentID, d.DepartmentName]));

  return (
    <div className={styles.panel}>
      <form className={styles.form} onSubmit={submit}>
        <h2 className={styles.formTitle}>Add Event</h2>
        <div className={styles.formGrid}>
          <div className={styles.field}>
            <label className={styles.label}>Event Name *</label>
            <input className={styles.input} value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. CIO says 'Security'" />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Description</label>
            <input className={styles.input} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Optional longer description" />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Category</label>
            <select className={styles.select} value={catId} onChange={(e) => setCatId(e.target.value)}>
              <option value="">— None —</option>
              {categories.map((c) => (
                <option key={c.EventCategoryID} value={c.EventCategoryID}>{c.CategoryName}</option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Department</label>
            <select className={styles.select} value={deptId} onChange={(e) => setDeptId(e.target.value)}>
              <option value="">— None —</option>
              {departments.map((d) => (
                <option key={d.DepartmentID} value={d.DepartmentID}>{d.DepartmentName}</option>
              ))}
            </select>
          </div>
        </div>
        <button className={styles.btnPrimary} type="submit" disabled={saving}>
          {saving ? 'Adding…' : '+ Add Event'}
        </button>
      </form>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>ID</th><th>Name</th><th>Description</th><th>Category</th><th>Department</th><th></th>
          </tr>
        </thead>
        <tbody>
          {events.map((ev) => (
            <tr key={ev.EventID}>
              <td className={styles.idCell}>{ev.EventID}</td>
              <td>{ev.EventName}</td>
              <td className={styles.descCell}>{ev.EventDescription ?? <span className={styles.muted}>—</span>}</td>
              <td>{catMap[ev.EventCategoryID!] ?? <span className={styles.muted}>—</span>}</td>
              <td>{deptMap[ev.DepartmentID!] ?? <span className={styles.muted}>—</span>}</td>
              <td>
                <button className={styles.btnDeactivate} onClick={() => onSoftDelete(ev.EventID)}>
                  Deactivate
                </button>
              </td>
            </tr>
          ))}
          {events.length === 0 && (
            <tr><td colSpan={6} className={styles.emptyRow}>No active events.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ── Categories panel ──────────────────────────────────────────────────────────

function CategoriesPanel({
  categories, username, onFlash, onReload, onSoftDelete,
}: {
  categories: Category[];
  username: string;
  onFlash: (msg: string, err?: boolean) => void;
  onReload: () => void;
  onSoftDelete: (id: number) => void;
}) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    const res = await fetch('/api/event-category', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ CategoryName: name.trim(), CategoryDescription: desc.trim() || null, CreatedBy: username }),
    });
    setSaving(false);
    if (res.ok) { setName(''); setDesc(''); onFlash('Category added!'); onReload(); }
    else onFlash('Failed to add category.', true);
  }

  return (
    <div className={styles.panel}>
      <form className={styles.form} onSubmit={submit}>
        <h2 className={styles.formTitle}>Add Category</h2>
        <div className={styles.formGrid}>
          <div className={styles.field}>
            <label className={styles.label}>Category Name *</label>
            <input className={styles.input} value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Mishap" />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Description</label>
            <input className={styles.input} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Optional description" />
          </div>
        </div>
        <button className={styles.btnPrimary} type="submit" disabled={saving}>
          {saving ? 'Adding…' : '+ Add Category'}
        </button>
      </form>

      <table className={styles.table}>
        <thead>
          <tr><th>ID</th><th>Name</th><th>Description</th><th></th></tr>
        </thead>
        <tbody>
          {categories.map((c) => (
            <tr key={c.EventCategoryID}>
              <td className={styles.idCell}>{c.EventCategoryID}</td>
              <td>{c.CategoryName}</td>
              <td className={styles.descCell}>{c.CategoryDescription ?? <span className={styles.muted}>—</span>}</td>
              <td>
                <button className={styles.btnDeactivate} onClick={() => onSoftDelete(c.EventCategoryID)}>
                  Deactivate
                </button>
              </td>
            </tr>
          ))}
          {categories.length === 0 && (
            <tr><td colSpan={4} className={styles.emptyRow}>No active categories.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ── Departments panel ─────────────────────────────────────────────────────────

function DepartmentsPanel({
  departments, username, onFlash, onReload, onSoftDelete,
}: {
  departments: Department[];
  username: string;
  onFlash: (msg: string, err?: boolean) => void;
  onReload: () => void;
  onSoftDelete: (id: number) => void;
}) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    const res = await fetch('/api/department', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ DepartmentName: name.trim(), CreatedBy: username }),
    });
    setSaving(false);
    if (res.ok) { setName(''); onFlash('Department added!'); onReload(); }
    else onFlash('Failed to add department.', true);
  }

  return (
    <div className={styles.panel}>
      <form className={styles.form} onSubmit={submit}>
        <h2 className={styles.formTitle}>Add Department</h2>
        <div className={styles.formGrid}>
          <div className={styles.field}>
            <label className={styles.label}>Department Name *</label>
            <input className={styles.input} value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Finance" />
          </div>
        </div>
        <button className={styles.btnPrimary} type="submit" disabled={saving}>
          {saving ? 'Adding…' : '+ Add Department'}
        </button>
      </form>

      <table className={styles.table}>
        <thead>
          <tr><th>ID</th><th>Name</th><th></th></tr>
        </thead>
        <tbody>
          {departments.map((d) => (
            <tr key={d.DepartmentID}>
              <td className={styles.idCell}>{d.DepartmentID}</td>
              <td>{d.DepartmentName}</td>
              <td>
                <button className={styles.btnDeactivate} onClick={() => onSoftDelete(d.DepartmentID)}>
                  Deactivate
                </button>
              </td>
            </tr>
          ))}
          {departments.length === 0 && (
            <tr><td colSpan={3} className={styles.emptyRow}>No active departments.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
