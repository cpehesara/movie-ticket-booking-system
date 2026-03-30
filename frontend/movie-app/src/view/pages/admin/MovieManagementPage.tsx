import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../../viewmodel/store';
import { fetchMovies } from '../../../viewmodel/slices/movieSlice';
import { adminApi } from '../../../model/api/adminApi';
import { MovieResponse } from '../../../model/types/movie.types';
import { useToast } from '../../components/common/Toast';
import { Header } from '../../components/layout/Header';
import { Sidebar } from '../../components/layout/Sidebar';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { Loading } from '../../components/common/Loading';
import { useForm } from 'react-hook-form';

interface MovieForm {
  title: string; description: string; durationMins: number;
  genre: string; language: string; rating: string; posterUrl: string;
}

export const MovieManagementPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { movies, loading } = useSelector((s: RootState) => s.movies);
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const { register, handleSubmit, reset } = useForm<MovieForm>();

  useEffect(() => { dispatch(fetchMovies(undefined)); }, [dispatch]);

  const openCreate = () => { reset({} as MovieForm); setEditId(null); setOpen(true); };
  const openEdit = (m: MovieResponse) => { reset(m as any); setEditId(m.id); setOpen(true); };

  const onSubmit = async (data: MovieForm) => {
    try {
      if (editId) await adminApi.updateMovie(editId, data);
      else await adminApi.createMovie(data);
      showToast(editId ? 'Movie updated' : 'Movie created', 'success');
      setOpen(false);
      dispatch(fetchMovies(undefined));
    } catch { showToast('Operation failed', 'error'); }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this movie?')) return;
    try {
      await adminApi.deleteMovie(id);
      showToast('Movie deleted', 'success');
      dispatch(fetchMovies(undefined));
    } catch { showToast('Delete failed', 'error'); }
  };

  const fields: { name: keyof MovieForm; label: string; type?: string }[] = [
    { name: 'title', label: 'Title' },
    { name: 'description', label: 'Description', type: 'textarea' },
    { name: 'durationMins', label: 'Duration (mins)', type: 'number' },
    { name: 'genre', label: 'Genre' },
    { name: 'language', label: 'Language' },
    { name: 'rating', label: 'Rating (PG, R...)' },
    { name: 'posterUrl', label: 'Poster URL' },
  ];

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-white">Movies</h1>
            <Button onClick={openCreate}>+ Add Movie</Button>
          </div>
          {loading ? <Loading /> : (
            <div className="grid grid-cols-1 gap-3">
              {movies.map((m: MovieResponse) => (
                <div key={m.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4
                  flex items-center justify-between">
                  <div>
                    <p className="text-white font-semibold">{m.title}</p>
                    <p className="text-gray-500 text-sm">{m.genre} · {m.language} · {m.durationMins} min</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => openEdit(m)}>Edit</Button>
                    <Button size="sm" variant="danger" onClick={() => handleDelete(m.id)}>Delete</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editId ? 'Edit Movie' : 'Add Movie'} maxWidth="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
          {fields.map(f => (
            <div key={f.name}>
              <label className="text-gray-400 text-xs mb-1 block">{f.label}</label>
              {f.type === 'textarea'
                ? <textarea {...register(f.name)} rows={3}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2
                      text-white text-sm focus:outline-none focus:border-red-500 resize-none" />
                : <input {...register(f.name)} type={f.type || 'text'}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2
                      text-white text-sm focus:outline-none focus:border-red-500" />
              }
            </div>
          ))}
          <Button type="submit" fullWidth className="mt-2">{editId ? 'Update' : 'Create'}</Button>
        </form>
      </Modal>
    </div>
  );
};