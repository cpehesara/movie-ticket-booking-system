import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { AppDispatch, RootState } from '../../../viewmodel/store';
import { fetchMovies } from '../../../viewmodel/slices/movieSlice';
import { adminApi } from '../../../model/api/adminApi';
import { showtimeApi } from '../../../model/api/showtimeApi';
import { MovieResponse } from '../../../model/types/movie.types';
import { ShowtimeResponse } from '../../../model/types/showtime.types';
import { useToast } from '../../components/common/Toast';
import { Header } from '../../components/layout/Header';
import { Sidebar } from '../../components/layout/Sidebar';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { useForm } from 'react-hook-form';

interface ShowtimeForm {
  movieId: number; screenId: number;
  startTime: string; endTime: string; basePrice: number;
}

export const ShowtimeManagementPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { movies } = useSelector((s: RootState) => s.movies);
  const { showToast } = useToast();
  const [showtimes, setShowtimes] = useState<ShowtimeResponse[]>([]);
  const [open, setOpen] = useState(false);
  const { register, handleSubmit, reset, watch } = useForm<ShowtimeForm>();
  const selectedMovieId = watch('movieId');

  useEffect(() => { dispatch(fetchMovies(undefined)); }, [dispatch]);

  useEffect(() => {
    if (!selectedMovieId) return;
    showtimeApi.getByMovie(Number(selectedMovieId)).then(setShowtimes).catch(() => {});
  }, [selectedMovieId]);

  const onSubmit = async (data: ShowtimeForm) => {
    try {
      await adminApi.createShowtime(data as any);
      showToast('Showtime created', 'success');
      setOpen(false);
      showtimeApi.getByMovie(Number(data.movieId)).then(setShowtimes);
    } catch { showToast('Failed to create showtime', 'error'); }
  };

  const handleCancel = async (id: number) => {
    if (!window.confirm('Cancel this showtime?')) return;
    try {
      await adminApi.cancelShowtime(id);
      showToast('Showtime cancelled', 'success');
      setShowtimes(prev => prev.filter((s: ShowtimeResponse) => s.id !== id));
    } catch { showToast('Failed', 'error'); }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-white">Showtimes</h1>
            <Button onClick={() => { reset(); setOpen(true); }}>+ Add Showtime</Button>
          </div>

          <div className="mb-4">
            <select
              onChange={e => {
                const id = Number(e.target.value);
                if (id) showtimeApi.getByMovie(id).then(setShowtimes).catch(() => {});
                else setShowtimes([]);
              }}
              className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm">
              <option value="">Select a movie to view showtimes</option>
              {movies.map((m: MovieResponse) => <option key={m.id} value={m.id}>{m.title}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-3">
            {showtimes.map((s: ShowtimeResponse) => (
              <div key={s.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4
                flex items-center justify-between">
                <div>
                  <p className="text-white font-semibold">{s.movieTitle}</p>
                  <p className="text-gray-500 text-sm">
                    {s.screenName} · {new Date(s.startTime).toLocaleString()}
                  </p>
                  <p className="text-gray-500 text-sm">
                    LKR {s.basePrice} · {s.availableSeats}/{s.totalSeats} seats
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    s.status === 'CANCELLED' ? 'bg-red-950 text-red-400' : 'bg-green-950 text-green-400'
                  }`}>{s.status}</span>
                  {s.status !== 'CANCELLED' && (
                    <Button size="sm" variant="danger" onClick={() => handleCancel(s.id)}>Cancel</Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="New Showtime">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Movie</label>
            <select {...register('movieId', { required: true })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm">
              {movies.map((m: MovieResponse) => <option key={m.id} value={m.id}>{m.title}</option>)}
            </select>
          </div>
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Screen ID</label>
            <input {...register('screenId', { required: true })} type="number"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm" />
          </div>
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Start Time</label>
            <input {...register('startTime', { required: true })} type="datetime-local"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm" />
          </div>
          <div>
            <label className="text-gray-400 text-xs mb-1 block">End Time</label>
            <input {...register('endTime', { required: true })} type="datetime-local"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm" />
          </div>
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Base Price (LKR)</label>
            <input {...register('basePrice', { required: true })} type="number"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm" />
          </div>
          <Button type="submit" fullWidth>Create Showtime</Button>
        </form>
      </Modal>
    </div>
  );
};