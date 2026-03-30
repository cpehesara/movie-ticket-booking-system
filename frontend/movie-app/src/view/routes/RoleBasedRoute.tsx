import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../viewmodel/hooks/useAuth';
import { UserRole } from '../../model/types/auth.types';

interface Props {
  children: React.ReactNode;
  allowedRoles: UserRole[];
}

export const RoleBasedRoute: React.FC<Props> = ({ children, allowedRoles }) => {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!user || !allowedRoles.includes(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
};