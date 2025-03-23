
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();
  
  // Make sure we're not blocking public routes like game-confirmation
  if (location.pathname === '/game-confirmation' || location.pathname === '/confirmation-success') {
    return <>{children}</>;
  }
  
  if (isLoading) {
    // You could add a loading spinner here
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-futconnect-200 border-t-futconnect-600"></div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    // Determine which login page to redirect to based on the URL path
    const loginPath = location.pathname.includes('member') || 
                     location.pathname.includes('club') ? 
                     '/club-login' : '/login';
    
    // Redirect to the appropriate login page, but save the current location they were trying to access
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }
  
  // For member portal, check if the user is neither a member nor accessing club routes
  if (location.pathname === '/member-portal' && !user?.isMember) {
    return <Navigate to="/club-login" state={{ from: location }} replace />;
  }
  
  // No longer restricting members from accessing club routes
  // Members can now access all club-related routes
  
  return <>{children}</>;
};

export default ProtectedRoute;
