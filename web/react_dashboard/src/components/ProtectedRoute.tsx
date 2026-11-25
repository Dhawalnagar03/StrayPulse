import { type FC, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';

interface Props {
  children: ReactNode;
  allowedRoles?: string[];
}

const normalizeAccessRole = (role?: string | null) => {
  if (!role) return 'citizen';
  if (['individual', 'rescuer', 'volunteer', 'feeder'].includes(role)) return 'citizen';
  return role;
};

const ProtectedRoute: FC<Props> = ({ children, allowedRoles }) => {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (allowedRoles && user && !allowedRoles.includes(normalizeAccessRole(user.role))) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
};

export default ProtectedRoute;
