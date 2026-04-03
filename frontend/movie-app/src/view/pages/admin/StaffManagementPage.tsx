import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../../viewmodel/store';
import { fetchAllStaff } from '../../../viewmodel/slices/adminSlice';
import { adminApi } from '../../../model/api/adminApi';
import { UserResponse } from '../../../model/types/user.types';
import { useToast } from '../../components/common/Toast';
import { Header, Sidebar } from '../../components/layout';
import { Button } from '../../components/common/Button';
import { Loading } from '../../components/common/Loading';

export const StaffManagementPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { staff, loading } = useSelector((s: RootState) => s.admin);
  const { showToast } = useToast();

  useEffect(() => { dispatch(fetchAllStaff()); }, [dispatch]);

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
          <h1 className="text-2xl font-bold text-white mb-6">Staff Management</h1>
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
                    <tr key={s.id} className="border-b border-gray-800/50">
                      <td className="px-4 py-3 text-white">{s.fullName}</td>
                      <td className="px-4 py-3 text-gray-400">{s.email}</td>
                      <td className="px-4 py-3 text-gray-400">{s.role}</td>
                      <td className="px-4 py-3 text-gray-400">{s.cinemaName ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          s.isActive ? 'bg-green-950 text-green-400' : 'bg-gray-800 text-gray-500'
                        }`}>{s.isActive ? 'Active' : 'Inactive'}</span>
                      </td>
                      <td className="px-4 py-3">
                        {s.isActive && (
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
    </div>
  );
};
