import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../../viewmodel/store';
import { fetchAllStaff, fetchAllCinemas } from '../../../viewmodel/slices/adminSlice';
import { adminApi } from '../../../model/api/adminApi';
import { UserResponse } from '../../../model/types/user.types';
import { useToast } from '../../components/common/Toast';
import { Header } from '../../components/layout/Header';
import { Sidebar } from '../../components/layout/Sidebar';
import { Button } from '../../components/common/Button';
import { Loading } from '../../components/common/Loading';
import { Modal } from '../../components/common/Modal';

export const StaffManagementPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { staff, loading, cinemas } = useSelector((s: RootState) => s.admin);
  const { showToast } = useToast();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    fullName: '', email: '', password: '', phone: '', role: 'MANAGER', cinemaId: ''
  });

  useEffect(() => { 
    dispatch(fetchAllStaff()); 
    dispatch(fetchAllCinemas());
  }, [dispatch]);

  const handleCreate = async () => {
    if (!form.fullName || !form.email || !form.password || !form.cinemaId) {
      showToast('Please fill all required fields', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const payload: any = { fullName: form.fullName, email: form.email, password: form.password };
      if (form.phone) payload.phone = form.phone;

      await adminApi.registerStaff(
        payload,
        form.role,
        Number(form.cinemaId)
      );
      showToast('Staff created successfully', 'success');
      setIsAddModalOpen(false);
      setForm({ fullName: '', email: '', password: '', phone: '', role: 'MANAGER', cinemaId: '' });
      dispatch(fetchAllStaff());
    } catch (error: any) {
      if (error.response?.data?.errors) {
        const errorMessages = Object.values(error.response.data.errors).join(', ');
        showToast(errorMessages, 'error');
      } else {
        showToast(error.response?.data?.message || 'Failed to create staff', 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleRoleChange = async (userId: number, newRole: string) => {
    try {
      await adminApi.updateStaffRole(userId, newRole);
      showToast('Role updated successfully', 'success');
      dispatch(fetchAllStaff());
    } catch {
      showToast('Failed to update role', 'error');
    }
  };

  const handleDeactivate = async (id: number) => {
    if (!window.confirm('Deactivate this staff member?')) return;
    try {
      await adminApi.deactivateStaff(id);
      showToast('Staff deactivated', 'success');
      dispatch(fetchAllStaff());
    } catch { showToast('Failed', 'error'); }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-white">Staff Management</h1>
            <Button onClick={() => setIsAddModalOpen(true)}>+ Add Staff</Button>
          </div>
          {loading ? <Loading /> : (
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    {['Name', 'Email', 'Role', 'Cinema', 'Status', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-gray-500 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {staff.map((s: UserResponse) => (
                    <tr key={s.id} className="border-b border-gray-800/50 hover:bg-gray-800/20 transition-colors">
                      <td className="px-4 py-3 text-white">{s.fullName}</td>
                      <td className="px-4 py-3 text-gray-400">{s.email}</td>
                      <td className="px-4 py-3 text-gray-400">
                        {s.isActive && s.role !== 'ADMIN' ? (
                          <select
                            value={s.role}
                            onChange={(e) => handleRoleChange(s.id, e.target.value)}
                            className="bg-gray-800 border border-gray-700 text-gray-200 text-xs rounded px-2 py-1 outline-none appearance-none cursor-pointer"
                          >
                            <option value="MANAGER">MANAGER</option>
                            <option value="OPERATOR">OPERATOR</option>
                          </select>
                        ) : (
                          <span className="text-gray-400 font-medium">{s.role}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-400">{s.cinemaName ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          s.isActive ? 'bg-green-950 text-green-400' : 'bg-gray-800 text-gray-500'
                        }`}>{s.isActive ? 'Active' : 'Inactive'}</span>
                      </td>
                      <td className="px-4 py-3 flex gap-2">
                        {s.isActive && s.role !== 'ADMIN' && (
                          <Button size="sm" variant="danger" onClick={() => handleDeactivate(s.id)}>
                            Deactivate
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>

      <Modal open={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Create New Staff">
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1 leading-none uppercase tracking-wider">Full Name</label>
            <input
              type="text"
              value={form.fullName}
              onChange={e => setForm({ ...form, fullName: e.target.value })}
              className="w-full bg-gray-900 border border-gray-800 text-gray-200 px-4 py-2 rounded-xl text-sm focus:outline-none focus:border-red-500 transition-colors"
              placeholder="e.g. John Doe"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1 leading-none uppercase tracking-wider">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              className="w-full bg-gray-900 border border-gray-800 text-gray-200 px-4 py-2 rounded-xl text-sm focus:outline-none focus:border-red-500 transition-colors"
              placeholder="e.g. john@cineplex.com"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1 leading-none uppercase tracking-wider">Password</label>
            <input
              type="password"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              className="w-full bg-gray-900 border border-gray-800 text-gray-200 px-4 py-2 rounded-xl text-sm focus:outline-none focus:border-red-500 transition-colors"
              placeholder="Must be secure"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1 leading-none uppercase tracking-wider">Role</label>
              <select
                value={form.role}
                onChange={e => setForm({ ...form, role: e.target.value })}
                className="w-full bg-gray-900 border border-gray-800 text-gray-200 px-3 py-2 rounded-xl text-sm focus:outline-none focus:border-red-500 transition-colors appearance-none"
              >
                <option value="MANAGER">Manager</option>
                <option value="OPERATOR">Operator</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1 leading-none uppercase tracking-wider">Assign Cinema</label>
              <select
                value={form.cinemaId}
                onChange={e => setForm({ ...form, cinemaId: e.target.value })}
                className="w-full bg-gray-900 border border-gray-800 text-gray-200 px-3 py-2 rounded-xl text-sm focus:outline-none focus:border-red-500 transition-colors appearance-none"
              >
                <option value="">-- Select Cinema --</option>
                {cinemas?.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="flex gap-3 justify-end mt-4 pt-4 border-t border-gray-800">
            <Button variant="secondary" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Staff'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};