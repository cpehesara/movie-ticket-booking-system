import React, { useState } from 'react';
import { adminApi } from '../../../model/api/adminApi';
import { useToast } from '../../components/common/Toast';
import { Header } from '../../components/layout/Header';
import { Sidebar } from '../../components/layout/Sidebar';
import { Button } from '../../components/common/Button';

export const KioskManagementPage: React.FC = () => {
  const { showToast } = useToast();
  const [screenId, setScreenId] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<{ apiKey: string; kioskId: number; name: string } | null>(null);

  const handleCreate = async () => {
    if (!screenId) return;
    setLoading(true);
    try {
      const res = await adminApi.registerKiosk(Number(screenId), name || undefined);
      setCreated(res);
      showToast('Kiosk registered', 'success');
      setScreenId(''); setName('');
    } catch { showToast('Failed to register kiosk', 'error'); }
    finally { setLoading(false); }
  };

  const handleResync = async () => {
    const sid = prompt('Screen ID?');
    const tid = prompt('Showtime ID?');
    if (!sid || !tid) return;
    try {
      await adminApi.resyncLeds(Number(sid), Number(tid));
      showToast('LED resync triggered', 'success');
    } catch { showToast('Resync failed', 'error'); }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-8">
          <h1 className="text-2xl font-bold text-white mb-6">Kiosk Management</h1>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Register New Kiosk</h2>
              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Screen ID</label>
                  <input value={screenId} onChange={e => setScreenId(e.target.value)}
                    type="number" placeholder="e.g. 1"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5
                      text-white text-sm focus:outline-none focus:border-red-500" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Name (optional)</label>
                  <input value={name} onChange={e => setName(e.target.value)}
                    placeholder="Hall A Entrance Kiosk"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5
                      text-white text-sm focus:outline-none focus:border-red-500" />
                </div>
                <Button onClick={handleCreate} loading={loading} fullWidth>Register Kiosk</Button>
              </div>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">IoT Controls</h2>
              <p className="text-gray-500 text-sm mb-4">
                Re-sync LED states after an ESP32 reconnects.
              </p>
              <Button onClick={handleResync} variant="secondary" fullWidth>
                🔄 Resync LED Strip
              </Button>
            </div>
          </div>

          {created && (
            <div className="mt-6 bg-green-950 border border-green-700 rounded-xl p-6">
              <h3 className="text-green-400 font-semibold mb-3">Kiosk Registered ✅</h3>
              <p className="text-gray-400 text-sm mb-1">Kiosk ID: <span className="text-white">{created.kioskId}</span></p>
              <p className="text-gray-400 text-sm mb-1">Name: <span className="text-white">{created.name}</span></p>
              <p className="text-gray-400 text-sm">API Key:</p>
              <code className="block bg-gray-900 rounded-lg p-3 text-green-400 text-xs break-all mt-1">
                {created.apiKey}
              </code>
              <p className="text-yellow-500 text-xs mt-2">⚠ Copy this key now — it will not be shown again.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};