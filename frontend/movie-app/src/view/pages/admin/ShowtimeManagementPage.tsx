// FILE PATH: src/view/pages/admin/ShowtimeManagementPage.tsx
//
// Key behaviours added:
//   1. Screen dropdown  — fetches all screens via GET /api/admin/screens on mount.
//      Each option shows "Screen Name · Cinema Name · N seats".
//   2. Auto end-time    — when the admin picks a movie AND sets a start time,
//      end time is computed as: start + movie.durationMins, then ceiling to
//      the nearest 30-minute boundary.  The field remains editable for overrides.
//   3. Duration preview — shows "Xh Ym + buffer = end time" below the end-time
//      field so the admin can verify what was calculated.

import React, { useEffect, useState, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { AppDispatch, RootState } from '../../../viewmodel/store';
import { fetchMovies } from '../../../viewmodel/slices/movieSlice';
import { adminApi, ScreenSummary } from '../../../model/api/adminApi';
import { showtimeApi } from '../../../model/api/showtimeApi';
import { MovieResponse } from '../../../model/types/movie.types';
import { ShowtimeResponse } from '../../../model/types/showtime.types';
import { useToast } from '../../components/common/Toast';
import { Header } from '../../components/layout/Header';
import { Sidebar } from '../../components/layout/Sidebar';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';

// ─── End-time calculation logic ───────────────────────────────────────────────

/**
 * Computes the automatic end time for a showtime.
 *
 * Formula:
 *   rawEnd  = startTime + durationMins
 *   endTime = ceil(rawEnd, 30 minutes)
 *
 * Example: movie 142 min, start 14:00
 *   rawEnd  = 14:00 + 142 min = 16:22
 *   ceiling = 16:30  (next 30-min boundary above 16:22)
 *
 * The 30-minute ceiling gives a realistic scheduling buffer for
 * cleaning/prep between sessions, matching how real cinemas operate.
 *
 * @param startIso  datetime-local string "YYYY-MM-DDTHH:mm"
 * @param durationMins  integer minutes from MovieResponse.durationMins
 * @returns datetime-local string for the end-time input, or '' on invalid input
 */
function calcEndTime(startIso: string, durationMins: number): string {
  if (!startIso || !durationMins || durationMins <= 0) return '';

  const start   = new Date(startIso);
  if (isNaN(start.getTime())) return '';

  // Add movie duration
  const rawEnd  = new Date(start.getTime() + durationMins * 60 * 1000);

  // Ceil to nearest 30-minute slot
  const SLOT_MS = 30 * 60 * 1000;
  const ceilMs  = Math.ceil(rawEnd.getTime() / SLOT_MS) * SLOT_MS;
  const endDate = new Date(ceilMs);

  // Format back to "YYYY-MM-DDTHH:mm" (datetime-local value format)
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${endDate.getFullYear()}-${pad(endDate.getMonth() + 1)}-${pad(endDate.getDate())}` +
    `T${pad(endDate.getHours())}:${pad(endDate.getMinutes())}`
  );
}

/** Returns "Xh Ym" label for the duration preview. */
function fmtDuration(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m > 0 ? `${m}m` : ''}`.trim() : `${m}m`;
}

/** Returns "HH:mm" from a datetime-local string. */
function fmtHHmm(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ─── Style helpers ────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%',
  backgroundColor: '#111827',
  border: '1px solid #1f2937',
  borderRadius: '0.5rem',
  padding: '0.625rem 0.875rem',
  color: '#d1d5db',
  fontSize: '0.85rem',
  outline: 'none',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  color: '#4b5563',
  fontSize: '0.72rem',
  fontWeight: 500,
  marginBottom: '0.375rem',
  letterSpacing: '0.03em',
  textTransform: 'uppercase',
};

const statusBadge = (status: string) => {
  const map: Record<string, { bg: string; text: string }> = {
    SCHEDULED:   { bg: 'rgba(59,130,246,0.12)',  text: '#60a5fa' },
    OPEN:        { bg: 'rgba(34,197,94,0.12)',   text: '#4ade80' },
    IN_PROGRESS: { bg: 'rgba(168,85,247,0.12)',  text: '#c084fc' },
    COMPLETED:   { bg: 'rgba(75,85,99,0.15)',    text: '#6b7280' },
    CANCELLED:   { bg: 'rgba(239,68,68,0.12)',   text: '#f87171' },
  };
  return map[status] ?? { bg: 'rgba(75,85,99,0.15)', text: '#6b7280' };
};

// ─── Form state ───────────────────────────────────────────────────────────────

interface FormState {
  movieId: string;
  screenId: string;
  startTime: string;
  endTime: string;
  basePrice: string;
}

const EMPTY_FORM: FormState = {
  movieId: '', screenId: '', startTime: '', endTime: '', basePrice: '',
};

// ─── Main component ───────────────────────────────────────────────────────────

export const ShowtimeManagementPage: React.FC = () => {
  const dispatch           = useDispatch<AppDispatch>();
  const { movies, loading: moviesLoading } = useSelector((s: RootState) => s.movies);
  const { showToast }      = useToast();

  // ── Local state ────────────────────────────────────────────────────────────
  const [screens, setScreens]         = useState<ScreenSummary[]>([]);
  const [screensLoading, setScreensLoading] = useState(true);
  const [showtimes, setShowtimes]     = useState<ShowtimeResponse[]>([]);
  const [filterMovie, setFilterMovie] = useState<string>('');
  const [open, setOpen]               = useState(false);
  const [submitting, setSubmitting]   = useState(false);
  const [form, setForm]               = useState<FormState>(EMPTY_FORM);
  const [endTouched, setEndTouched]   = useState(false); // true when admin manually edited end time

  // ── Fetch screens on mount ─────────────────────────────────────────────────
  useEffect(() => {
    setScreensLoading(true);
    adminApi.getScreens()
      .then(data => setScreens(data))
      .catch(() => showToast('Could not load screens from server', 'error'))
      .finally(() => setScreensLoading(false));
  }, []); // eslint-disable-line

  useEffect(() => { dispatch(fetchMovies(undefined)); }, [dispatch]);

  // ── Fetch showtimes when filter movie changes ──────────────────────────────
  useEffect(() => {
    if (!filterMovie) { setShowtimes([]); return; }
    showtimeApi.getByMovie(Number(filterMovie)).then(setShowtimes).catch(() => {});
  }, [filterMovie]);

  // ── Auto-compute end time ──────────────────────────────────────────────────
  // Recalculate whenever movieId or startTime changes, but NOT if the admin
  // has manually edited the end-time field (endTouched guard).
  const autoComputeEnd = useCallback(() => {
    if (endTouched) return;                            // admin has overridden — respect it
    const movie = movies.find(m => String(m.id) === form.movieId);
    if (!movie || !form.startTime) return;
    const computed = calcEndTime(form.startTime, movie.durationMins);
    if (computed) setForm(prev => ({ ...prev, endTime: computed }));
  }, [form.movieId, form.startTime, endTouched, movies]);

  useEffect(() => { autoComputeEnd(); }, [autoComputeEnd]);

  // ── Derived: selected movie for the preview label ──────────────────────────
  const selectedMovie = movies.find(m => String(m.id) === form.movieId);

  // Duration breakdown for the preview pill
  const durationPreview = (() => {
    if (!selectedMovie || !form.startTime || !form.endTime) return null;
    const movie = selectedMovie;
    const rawEnd = calcEndTime(form.startTime, movie.durationMins);
    const buffer = (() => {
      if (!rawEnd || !form.endTime) return 0;
      const raw = new Date(rawEnd).getTime();
      const ceil = new Date(form.endTime).getTime();
      return Math.round((ceil - raw) / 60000);
    })();
    return {
      duration: fmtDuration(movie.durationMins),
      buffer,
      endLabel: fmtHHmm(form.endTime),
    };
  })();

  // ── Form field handlers ────────────────────────────────────────────────────
  const setField = (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value = e.target.value;
      setForm(prev => ({ ...prev, [key]: value }));
      // When movie or start time changes, reset the "touched" flag so the
      // auto-calculation kicks in again
      if (key === 'movieId' || key === 'startTime') setEndTouched(false);
      if (key === 'endTime') setEndTouched(true);
    };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.movieId || !form.screenId || !form.startTime || !form.endTime || !form.basePrice) {
      showToast('All fields are required', 'error');
      return;
    }
    if (new Date(form.endTime) <= new Date(form.startTime)) {
      showToast('End time must be after start time', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await adminApi.createShowtime({
        movieId:   Number(form.movieId),
        screenId:  Number(form.screenId),
        startTime: form.startTime,
        endTime:   form.endTime,
        basePrice: Number(form.basePrice),
      } as any);
      showToast('Showtime created successfully', 'success');
      setOpen(false);
      setForm(EMPTY_FORM);
      setEndTouched(false);
      if (filterMovie === form.movieId) {
        showtimeApi.getByMovie(Number(form.movieId)).then(setShowtimes).catch(() => {});
      }
    } catch {
      showToast('Failed to create showtime', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Cancel a showtime ──────────────────────────────────────────────────────
  const handleCancel = async (id: number) => {
    if (!window.confirm('Cancel this showtime? This cannot be undone.')) return;
    try {
      await adminApi.cancelShowtime(id);
      showToast('Showtime cancelled', 'success');
      setShowtimes(prev => prev.filter(s => s.id !== id));
    } catch {
      showToast('Failed to cancel showtime', 'error');
    }
  };

  // ── Open modal ─────────────────────────────────────────────────────────────
  const openModal = () => {
    setForm(EMPTY_FORM);
    setEndTouched(false);
    setOpen(true);
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#080b10' }}>
      <Header />
      <div className="flex flex-1">
        <Sidebar />

        <main className="flex-1 p-8" style={{ minWidth: 0 }}>

          {/* Page header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Showtimes</h1>
              <p style={{ color: '#4b5563', fontSize: '0.75rem', marginTop: '2px' }}>
                {screens.length > 0
                  ? `${screens.length} screen${screens.length !== 1 ? 's' : ''} available`
                  : screensLoading ? 'Loading screens…' : 'No screens found'}
              </p>
            </div>
            <Button onClick={openModal}>+ Add Showtime</Button>
          </div>

          {/* Filter by movie */}
          <div className="mb-5">
            <select
              value={filterMovie}
              onChange={e => setFilterMovie(e.target.value)}
              style={{
                ...inputStyle,
                width: 'auto',
                minWidth: '260px',
                cursor: 'pointer',
              }}
            >
              <option value="">Select a movie to view showtimes</option>
              {movies.map((m: MovieResponse) => (
                <option key={m.id} value={m.id}>
                  {m.title} ({fmtDuration(m.durationMins)})
                </option>
              ))}
            </select>
          </div>

          {/* Showtimes list */}
          {showtimes.length === 0 && filterMovie ? (
            <div
              className="rounded-xl p-10 text-center"
              style={{ backgroundColor: '#0d1117', border: '1px solid #1f2937' }}
            >
              <p style={{ color: '#374151', fontSize: '0.85rem' }}>
                No showtimes found for this movie.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {showtimes.map((s: ShowtimeResponse) => {
                const badge = statusBadge(s.status);
                return (
                  <div
                    key={s.id}
                    className="rounded-xl p-5 flex items-center justify-between gap-4"
                    style={{ backgroundColor: '#0d1117', border: '1px solid #1f2937' }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold text-sm">{s.movieTitle}</p>
                      <p style={{ color: '#6b7280', fontSize: '0.75rem', marginTop: '2px' }}>
                        {s.screenName}
                        <span style={{ margin: '0 0.4rem', color: '#1f2937' }}>·</span>
                        {s.cinemaName}
                      </p>
                      <p style={{ color: '#4b5563', fontSize: '0.72rem', marginTop: '2px' }}>
                        {new Date(s.startTime).toLocaleString([], {
                          dateStyle: 'medium', timeStyle: 'short',
                        })}
                        {' — '}
                        {new Date(s.endTime).toLocaleTimeString([], {
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    </div>

                    <div style={{ color: '#4b5563', fontSize: '0.75rem', textAlign: 'right' }}>
                      <p className="font-semibold" style={{ color: '#d1d5db' }}>
                        LKR {s.basePrice}
                      </p>
                      <p style={{ marginTop: '2px' }}>
                        {s.availableSeats} / {s.totalSeats} seats
                      </p>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span
                        className="text-xs px-2.5 py-1 rounded-full font-semibold"
                        style={{ backgroundColor: badge.bg, color: badge.text }}
                      >
                        {s.status}
                      </span>
                      {s.status !== 'CANCELLED' && (
                        <Button size="sm" variant="danger" onClick={() => handleCancel(s.id)}>
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* ── Add Showtime Modal ── */}
      <Modal open={open} onClose={() => setOpen(false)} title="New Showtime" maxWidth="md">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          {/* ── Movie ── */}
          <div>
            <label style={labelStyle}>Movie</label>
            {moviesLoading ? (
              <p style={{ color: '#4b5563', fontSize: '0.8rem' }}>Loading movies…</p>
            ) : (
              <select
                value={form.movieId}
                onChange={setField('movieId')}
                required
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                <option value="">Select a movie</option>
                {movies.map((m: MovieResponse) => (
                  <option key={m.id} value={m.id}>
                    {m.title} — {fmtDuration(m.durationMins)}
                  </option>
                ))}
              </select>
            )}
            {selectedMovie && (
              <p style={{ color: '#374151', fontSize: '0.68rem', marginTop: '4px' }}>
                Runtime: <span style={{ color: '#6b7280' }}>{fmtDuration(selectedMovie.durationMins)}</span>
                {' · '}Genre: <span style={{ color: '#6b7280' }}>{selectedMovie.genre}</span>
              </p>
            )}
          </div>

          {/* ── Screen ── */}
          <div>
            <label style={labelStyle}>Screen</label>
            {screensLoading ? (
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full animate-spin"
                  style={{ border: '2px solid #1f2937', borderTopColor: '#dc2626' }}
                />
                <span style={{ color: '#4b5563', fontSize: '0.8rem' }}>
                  Fetching screens from database…
                </span>
              </div>
            ) : screens.length === 0 ? (
              <p style={{ color: '#f87171', fontSize: '0.8rem' }}>
                No screens found. Add a screen to the database first.
              </p>
            ) : (
              <select
                value={form.screenId}
                onChange={setField('screenId')}
                required
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                <option value="">Select a screen</option>
                {screens.map(sc => (
                  <option key={sc.id} value={sc.id}>
                    {sc.name} · {sc.cinemaName} · {sc.totalSeats} seats
                  </option>
                ))}
              </select>
            )}
            {form.screenId && screens.length > 0 && (() => {
              const sc = screens.find(s => String(s.id) === form.screenId);
              if (!sc) return null;
              return (
                <p style={{ color: '#374151', fontSize: '0.68rem', marginTop: '4px' }}>
                  Screen ID: <span className="font-mono" style={{ color: '#6b7280' }}>#{sc.id}</span>
                  {' · '}{sc.totalSeats} seats
                </p>
              );
            })()}
          </div>

          {/* ── Start Time ── */}
          <div>
            <label style={labelStyle}>Start Time</label>
            <input
              type="datetime-local"
              value={form.startTime}
              onChange={setField('startTime')}
              required
              style={inputStyle}
              onFocus={e => (e.currentTarget.style.borderColor = '#dc2626')}
              onBlur={e  => (e.currentTarget.style.borderColor = '#1f2937')}
            />
          </div>

          {/* ── End Time (auto-filled + editable) ── */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label style={{ ...labelStyle, marginBottom: 0 }}>End Time</label>
              {/* Auto / Manual badge */}
              <span
                className="text-xs px-2 py-0.5 rounded font-medium"
                style={{
                  backgroundColor: endTouched
                    ? 'rgba(168,85,247,0.12)' : 'rgba(34,197,94,0.1)',
                  color: endTouched ? '#c084fc' : '#4ade80',
                  fontSize: '0.6rem',
                }}
              >
                {endTouched ? 'Manual override' : '⚡ Auto-calculated'}
              </span>
            </div>

            <input
              type="datetime-local"
              value={form.endTime}
              onChange={setField('endTime')}
              required
              style={inputStyle}
              onFocus={e => (e.currentTarget.style.borderColor = '#dc2626')}
              onBlur={e  => (e.currentTarget.style.borderColor = '#1f2937')}
            />

            {/* Calculation preview */}
            {durationPreview && (
              <div
                className="flex items-center gap-2 mt-2 px-3 py-2 rounded-lg"
                style={{ backgroundColor: '#0d1117', border: '1px solid #1f2937' }}
              >
                <span style={{ color: '#374151', fontSize: '0.65rem' }}>▶</span>
                <p style={{ color: '#4b5563', fontSize: '0.68rem' }}>
                  Film: <span style={{ color: '#9ca3af' }}>{durationPreview.duration}</span>
                  {durationPreview.buffer > 0 && (
                    <>
                      {' '}+ buffer:{' '}
                      <span style={{ color: '#9ca3af' }}>{durationPreview.buffer}m</span>
                      {' '}(ceiling to next 30 min)
                    </>
                  )}
                  {' '}→ ends at{' '}
                  <span className="font-semibold" style={{ color: '#d1d5db' }}>
                    {durationPreview.endLabel}
                  </span>
                  {endTouched && (
                    <>
                      {' '}
                      <button
                        type="button"
                        onClick={() => { setEndTouched(false); autoComputeEnd(); }}
                        style={{ color: '#4ade80', fontSize: '0.65rem', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}
                      >
                        Reset to auto
                      </button>
                    </>
                  )}
                </p>
              </div>
            )}
          </div>

          {/* ── Base Price ── */}
          <div>
            <label style={labelStyle}>Base Price (LKR)</label>
            <input
              type="number"
              min="0"
              step="50"
              value={form.basePrice}
              onChange={setField('basePrice')}
              placeholder="e.g. 1500"
              required
              style={inputStyle}
              onFocus={e => (e.currentTarget.style.borderColor = '#dc2626')}
              onBlur={e  => (e.currentTarget.style.borderColor = '#1f2937')}
            />
          </div>

          {/* ── Actions ── */}
          <div className="flex gap-3 pt-1">
            <Button
              type="button"
              variant="ghost"
              fullWidth
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              fullWidth
              loading={submitting}
              disabled={screensLoading || screens.length === 0}
            >
              Create Showtime
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};