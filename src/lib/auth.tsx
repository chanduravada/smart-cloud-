import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  sendOtp: (email: string) => Promise<{ error: Error | null }>;
  verifyOtp: (email: string, code: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Call our custom otp-service Edge Function
async function callOtpService(body: Record<string, string>) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

  const resp = await fetch(`${supabaseUrl}/functions/v1/otp-service`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': anonKey,
    },
    body: JSON.stringify(body),
  });

  const json = await resp.json();
  if (!resp.ok) throw new Error(json.error || `OTP service error (${resp.status})`);
  return json;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { full_name: fullName },
      },
    });
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  // Send 4-digit OTP via our custom Edge Function (AWS SES)
  const sendOtp = async (email: string) => {
    try {
      await callOtpService({ action: 'send', email });
      return { error: null };
    } catch (err) {
      console.error('[sendOtp]', err);
      return { error: err as Error };
    }
  };

  // Verify 4-digit OTP against our DB table
  const verifyOtp = async (email: string, code: string) => {
    try {
      const result = await callOtpService({ action: 'verify', email, code });
      if (!result.valid) throw new Error(result.error || 'Invalid OTP');
      return { error: null };
    } catch (err) {
      console.error('[verifyOtp]', err);
      return { error: err as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut, sendOtp, verifyOtp }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
