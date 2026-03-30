import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { AppDispatch, RootState } from '../../../viewmodel/store';
import { fetchProfile, updateProfile } from '../../../viewmodel/slices/userSlice';
import { useToast } from '../../components/common/Toast';
import { Header } from '../../components/layout/Header';
import { Footer } from '../../components/layout/Footer';
import { Button } from '../../components/common/Button';
import { Loading } from '../../components/common/Loading';
import { UpdateProfileRequest } from '../../../model/types/user.types';

export const ProfilePage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { profile, loading } = useSelector((s: RootState) => s.user);
  const { showToast } = useToast();
  const { register, handleSubmit, reset } = useForm<UpdateProfileRequest>();

  useEffect(() => { dispatch(fetchProfile()); }, [dispatch]);
  useEffect(() => {
    if (profile) reset({ fullName: profile.fullName, phone: profile.phone ?? '' });
  }, [profile, reset]);

  const onSubmit = async (data: UpdateProfileRequest) => {
    const res = await dispatch(updateProfile(data));
    if (updateProfile.fulfilled.match(res)) showToast('Profile updated', 'success');
    else showToast('Update failed', 'error');
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <Header />
      <main className="flex-1 max-w-md mx-auto w-full px-4 py-8">
        <h1 className="text-2xl font-bold text-white mb-6">My Profile</h1>
        {loading ? <Loading /> : (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-800">
              <div className="w-14 h-14 rounded-full bg-red-600 flex items-center justify-center
                text-white text-xl font-bold">
                {profile?.fullName?.[0]?.toUpperCase()}
              </div>
              <div>
                <p className="text-white font-semibold">{profile?.email}</p>
                <p className="text-gray-500 text-sm capitalize">{profile?.role?.toLowerCase()}</p>
                {profile?.loyaltyPoints !== null && (
                  <p className="text-yellow-400 text-xs mt-1">⭐ {profile?.loyaltyPoints} loyalty points</p>
                )}
              </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Full Name</label>
                <input {...register('fullName')}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5
                    text-white text-sm focus:outline-none focus:border-red-500" />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Phone</label>
                <input {...register('phone')}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5
                    text-white text-sm focus:outline-none focus:border-red-500" />
              </div>
              <Button type="submit" fullWidth>Save Changes</Button>
            </form>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};