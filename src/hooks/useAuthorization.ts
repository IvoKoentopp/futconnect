import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useCallback } from 'react';

interface UseAuthorizationReturn {
  isClubAdmin: (clubId: string) => Promise<boolean>;
  isAuthenticated: boolean;
  canEdit: boolean;
}

export const useAuthorization = (): UseAuthorizationReturn => {
  const { user } = useAuth();
  const [canEdit, setCanEdit] = useState(false);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (user?.activeClub?.id) {
        const { data } = await supabase
          .from('club_admins')
          .select('*')
          .eq('club_id', user.activeClub.id)
          .eq('email', user.email)
          .maybeSingle();

        setCanEdit(!!data);
      } else {
        setCanEdit(false);
      }
    };

    checkAdminStatus();
  }, [user]);

  const isClubAdmin = useCallback(async (clubId: string): Promise<boolean> => {
    if (!user?.email) return false;

    try {
      const { data } = await supabase
        .from('club_admins')
        .select('*')
        .eq('club_id', clubId)
        .eq('email', user.email)
        .maybeSingle();

      return !!data;
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  }, [user?.email]);

  const isAuthenticated = !!user;

  return {
    isClubAdmin,
    isAuthenticated,
    canEdit
  };
};
