import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

export interface Profile {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  storage_used: number;
  storage_limit: number;
  created_at: string;
  updated_at: string;
}

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (retrying = false) => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        // 401 / JWT not ready — session is still propagating after sign-in.
        // Retry once after a short delay instead of trying to create a profile.
        if (
          (error.code === 'PGRST301' || (error as { status?: number }).status === 401)
          && !retrying
        ) {
          setTimeout(() => fetchProfile(true), 1200);
          return;
        }
        throw error;
      }

      if (data) {
        setProfile(data);
      } else {
        // Profile row doesn't exist — create it (handles trigger failures)
        const { data: created, error: createError } = await supabase
          .from('profiles')
          .insert({
            user_id: user.id,
            email: user.email ?? null,
            full_name: user.user_metadata?.full_name ?? null,
            storage_used: 0,
            storage_limit: 5368709120, // 5 GB default
          })
          .select('*')
          .single();

        if (createError) {
          // If 401 on insert too, auth is still settling — will retry via effect
          if ((createError as { status?: number }).status !== 401) {
            console.error('Error creating profile:', createError);
          }
        } else {
          setProfile(created);
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const formatStorageSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStoragePercentage = (): number => {
    if (!profile) return 0;
    const raw = (profile.storage_used / profile.storage_limit) * 100;
    return Math.round(raw * 10) / 10; // 1 decimal place, e.g. 0.2
  };

  return {
    profile,
    loading,
    refreshProfile: fetchProfile,
    formatStorageSize,
    getStoragePercentage,
  };
}
