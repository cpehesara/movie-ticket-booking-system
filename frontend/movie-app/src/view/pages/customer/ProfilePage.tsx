import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { AppDispatch, RootState } from '../../../viewmodel/store';
import { fetchProfile, updateProfile } from '../../../viewmodel/slices/userSlice';
import { useToast } from '../../components/common/Toast';
import { Header } from '../../components/layout/Header';
import { Footer } from '../../components/layout/Footer';
import { Button } from '../../components/common/Button';
import { Loading } from '../../components/common/Loading';
import { UpdateProfileRequest } from '../../../model/types/user.types';
import { useAuth } from '../../../viewmodel/hooks/useAuth';

type ProfileSection = 'details';

const detailRow = (label: string, value?: string | null) => ({
  label,
  value: value && value.trim().length > 0 ? value : 'Not provided',
});

export const ProfilePage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { profile, loading } = useSelector((s: RootState) => s.user);
  const { bookings } = useSelector((s: RootState) => s.bookings);
  const { showToast } = useToast();
  const { register, handleSubmit, reset } = useForm<UpdateProfileRequest>();

  const [activeSection] = useState<ProfileSection>('details');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    dispatch(fetchProfile());
  }, [dispatch]);

  useEffect(() => {
    if (profile) {
      reset({
        fullName: profile.fullName,
        phone: profile.phone ?? '',
      });
    }
  }, [profile, reset]);

  const memberSince = useMemo(() => {
    if (!profile?.createdAt) return 'Not available';
    return new Date(profile.createdAt).toLocaleDateString([], {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, [profile?.createdAt]);

  const profileDetails = useMemo(() => ([
    detailRow('Full Name', profile?.fullName),
    detailRow('Email Address', profile?.email),
    detailRow('Phone Number', profile?.phone),
    detailRow('Role', profile?.role ? profile.role.charAt(0) + profile.role.slice(1).toLowerCase() : null),
    detailRow('Favorite Cinema', profile?.cinemaName),
    detailRow('Member Since', memberSince),
  ]), [memberSince, profile?.cinemaName, profile?.email, profile?.fullName, profile?.phone, profile?.role]);

  const onSubmit = async (data: UpdateProfileRequest) => {
    const res = await dispatch(updateProfile(data));
    if (updateProfile.fulfilled.match(res)) {
      setIsEditing(false);
      showToast('Profile updated', 'success');
    } else {
      showToast('Update failed', 'error');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const loyaltyLabel = profile?.loyaltyPoints != null
    ? `${profile.loyaltyPoints} loyalty points`
    : 'Standard member';

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#080b10' }}>
      <Header />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6 md:px-6 md:py-8">
        {loading ? (
          <Loading />
        ) : (
          <div className="flex flex-col gap-6">
            <section
              className="rounded-[1.75rem] overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(17,24,39,0.98), rgba(10,14,20,0.96))',
                border: '1px solid #1f2937',
                boxShadow: '0 24px 80px rgba(0,0,0,0.35)',
              }}
            >
              <div
                className="h-24 md:h-28"
                style={{
                  background: 'linear-gradient(90deg, rgba(220,38,38,0.18), rgba(245,158,11,0.08), rgba(17,24,39,0.1))',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                }}
              />

              <div className="px-5 pb-6 md:px-8">
                <div className="flex flex-col gap-5 -mt-10 md:-mt-12 md:flex-row md:items-end md:justify-between">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center">
                    <div
                      className="w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center text-white text-3xl font-black"
                      style={{
                        background: 'linear-gradient(135deg, #dc2626, #7f1d1d)',
                        border: '4px solid #080b10',
                        boxShadow: '0 12px 35px rgba(220,38,38,0.28)',
                      }}
                    >
                      {profile?.fullName?.[0]?.toUpperCase() ?? '?'}
                    </div>

                    <div>
                      <h1 className="text-2xl md:text-3xl font-bold text-white">
                        {profile?.fullName ?? 'Customer Profile'}
                      </h1>
                      <p className="mt-1 text-sm md:text-base" style={{ color: '#9ca3af' }}>
                        {profile?.email ?? 'No email available'}
                      </p>
                      <p className="mt-1 text-sm" style={{ color: '#6b7280' }}>
                        {profile?.phone || 'Phone number not added yet'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 md:min-w-[18rem]">
                    <div
                      className="rounded-2xl px-4 py-3"
                      style={{ backgroundColor: '#111827', border: '1px solid #1f2937' }}
                    >
                      <p className="text-xs uppercase tracking-[0.2em]" style={{ color: '#6b7280' }}>
                        Membership
                      </p>
                      <p className="mt-2 text-sm font-semibold text-white">{loyaltyLabel}</p>
                    </div>
                    <div
                      className="rounded-2xl px-4 py-3"
                      style={{ backgroundColor: '#111827', border: '1px solid #1f2937' }}
                    >
                      <p className="text-xs uppercase tracking-[0.2em]" style={{ color: '#6b7280' }}>
                        Bookings
                      </p>
                      <p className="mt-2 text-sm font-semibold text-white">
                        {bookings.length} active records
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
              <aside
                className="rounded-[1.5rem] p-4 md:p-5"
                style={{ backgroundColor: '#0d1117', border: '1px solid #1f2937' }}
              >
                <div className="flex flex-col gap-3">
                  <button
                    type="button"
                    className="w-full rounded-2xl px-4 py-3 text-left font-semibold transition-all"
                    style={{
                      backgroundColor: activeSection === 'details' ? 'rgba(220,38,38,0.12)' : '#111827',
                      color: activeSection === 'details' ? '#f3f4f6' : '#9ca3af',
                      border: `1px solid ${activeSection === 'details' ? 'rgba(220,38,38,0.28)' : '#1f2937'}`,
                    }}
                  >
                    Personal Details
                  </button>

                  <button
                    type="button"
                    className="w-full rounded-2xl px-4 py-3 text-left font-medium transition-all"
                    style={{
                      backgroundColor: '#111827',
                      color: '#9ca3af',
                      border: '1px solid #1f2937',
                    }}
                    onClick={() => navigate('/bookings')}
                  >
                    My Bookings
                  </button>
                </div>

                <div
                  className="mt-6 rounded-2xl p-4"
                  style={{ backgroundColor: '#111827', border: '1px solid #1f2937' }}
                >
                  <p className="text-xs uppercase tracking-[0.2em]" style={{ color: '#6b7280' }}>
                    Account
                  </p>
                  <p className="mt-2 text-sm leading-6" style={{ color: '#9ca3af' }}>
                    Manage your profile details here and jump to your booking history from the side menu.
                  </p>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="mt-5 w-full rounded-xl px-4 py-2.5 text-sm font-semibold transition-all"
                    style={{
                      backgroundColor: '#190d10',
                      border: '1px solid rgba(220,38,38,0.25)',
                      color: '#f87171',
                    }}
                  >
                    Logout
                  </button>
                </div>
              </aside>

              <section
                className="rounded-[1.5rem] p-5 md:p-6"
                style={{ backgroundColor: '#0d1117', border: '1px solid #1f2937' }}
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em]" style={{ color: '#6b7280' }}>
                      Contact Information
                    </p>
                    <h2 className="mt-2 text-xl font-bold text-white">Customer Dashboard</h2>
                    <p className="mt-1 text-sm" style={{ color: '#9ca3af' }}>
                      Same account details, reorganized into a cleaner dashboard layout.
                    </p>
                  </div>

                  {!isEditing ? (
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="rounded-xl px-4 py-2 text-sm font-semibold transition-all"
                      style={{
                        backgroundColor: '#111827',
                        color: '#f3f4f6',
                        border: '1px solid #1f2937',
                      }}
                    >
                      Edit Details
                    </button>
                  ) : null}
                </div>

                <div className="mt-6">
                  {isEditing ? (
                    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 md:grid-cols-2">
                      <div className="md:col-span-1">
                        <label className="mb-2 block text-xs uppercase tracking-[0.16em]" style={{ color: '#6b7280' }}>
                          Full Name
                        </label>
                        <input
                          {...register('fullName')}
                          className="w-full rounded-xl px-4 py-3 text-sm text-white focus:outline-none"
                          style={{ backgroundColor: '#111827', border: '1px solid #1f2937' }}
                        />
                      </div>

                      <div className="md:col-span-1">
                        <label className="mb-2 block text-xs uppercase tracking-[0.16em]" style={{ color: '#6b7280' }}>
                          Phone
                        </label>
                        <input
                          {...register('phone')}
                          className="w-full rounded-xl px-4 py-3 text-sm text-white focus:outline-none"
                          style={{ backgroundColor: '#111827', border: '1px solid #1f2937' }}
                        />
                      </div>

                      <div className="md:col-span-2 flex flex-col gap-3 pt-2 sm:flex-row">
                        <Button type="submit">Save Changes</Button>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => {
                            reset({
                              fullName: profile?.fullName,
                              phone: profile?.phone ?? '',
                            });
                            setIsEditing(false);
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2">
                      {profileDetails.map((item) => (
                        <div
                          key={item.label}
                          className="rounded-2xl px-4 py-4"
                          style={{ backgroundColor: '#111827', border: '1px solid #1f2937' }}
                        >
                          <p className="text-xs uppercase tracking-[0.16em]" style={{ color: '#6b7280' }}>
                            {item.label}
                          </p>
                          <p className="mt-3 text-sm font-semibold text-white break-words">
                            {item.value}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </section>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};
