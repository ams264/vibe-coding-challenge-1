'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

interface Sample {
  SampleID: number;
  SampleText: string;
  CreatedBy: string;
  CreatedDate: string;
  LastUpdatedBy: string;
  LastUpdatedDate: string;
  Active: number;
}

interface CurrentUser {
  username: string;
  role: string;
}

const COL_COUNT = 7;

export default function SamplePage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [rows, setRows] = useState<Sample[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isAdmin = currentUser?.role === 'admin';

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  async function fetchRows() {
    setLoading(true);
    const res = await fetch('/api/sample');
    if (res.ok) setRows(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => setCurrentUser(data.user));
    fetchRows();
  }, []);

  function startEdit(row: Sample) {
    setEditingId(row.SampleID);
    setEditText(row.SampleText);
    setError('');
  }

  function cancelEdit() {
    setEditingId(null);
    setEditText('');
    setError('');
  }

  async function saveEdit(id: number) {
    const res = await fetch(`/api/sample/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ SampleText: editText, LastUpdatedBy: currentUser?.username ?? 'unknown' }),
    });
    if (!res.ok) { setError('Failed to save.'); return; }
    cancelEdit();
    fetchRows();
  }

  async function softDelete(id: number) {
    if (!confirm('Deactivate this record?')) return;
    const res = await fetch(`/api/sample/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ LastUpdatedBy: currentUser?.username ?? 'unknown' }),
    });
    if (!res.ok) { setError('Failed to deactivate.'); return; }
    fetchRows();
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Sample Records</h1>
          <p className={styles.subtitle}>
            Showing active records only.
            {currentUser && (
              <span className={styles.userBadge}>
                {currentUser.username}
                <span className={isAdmin ? styles.roleAdmin : styles.roleUser}>
                  {currentUser.role}
                </span>
              </span>
            )}
          </p>
        </div>
        <button className={styles.btnSecondary} onClick={handleLogout}>Sign out</button>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {loading ? (
        <p className={styles.muted}>Loading...</p>
      ) : rows.length === 0 ? (
        <p className={styles.muted}>No active records found.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Sample Text</th>
              <th>Created By</th>
              <th>Created Date</th>
              <th>Last Updated By</th>
              <th>Last Updated Date</th>
              {isAdmin && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <>
                <tr key={row.SampleID} className={editingId === row.SampleID ? styles.rowEditing : undefined}>
                  <td>{row.SampleID}</td>
                  <td className={styles.textCell}>{row.SampleText}</td>
                  <td>{row.CreatedBy}</td>
                  <td>{formatDate(row.CreatedDate)}</td>
                  <td>{row.LastUpdatedBy}</td>
                  <td>{formatDate(row.LastUpdatedDate)}</td>
                  {isAdmin && (
                    <td className={styles.actions}>
                      {editingId === row.SampleID ? (
                        <button className={styles.btnSecondary} onClick={cancelEdit}>Cancel</button>
                      ) : (
                        <>
                          <button className={styles.btnPrimary} onClick={() => startEdit(row)}>Edit</button>
                          <button className={styles.btnDanger} onClick={() => softDelete(row.SampleID)}>Deactivate</button>
                        </>
                      )}
                    </td>
                  )}
                </tr>

                {isAdmin && editingId === row.SampleID && (
                  <tr key={`edit-${row.SampleID}`} className={styles.editRow}>
                    <td colSpan={COL_COUNT}>
                      <div className={styles.editPanel}>
                        <label className={styles.editLabel}>Editing Sample Text for ID {row.SampleID}</label>
                        <textarea
                          className={styles.textarea}
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          rows={4}
                          autoFocus
                        />
                        <div className={styles.editActions}>
                          <button className={styles.btnPrimary} onClick={() => saveEdit(row.SampleID)}>Save</button>
                          <button className={styles.btnSecondary} onClick={cancelEdit}>Cancel</button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function formatDate(str: string) {
  if (!str) return '—';
  return new Date(str + 'Z').toLocaleString();
}
