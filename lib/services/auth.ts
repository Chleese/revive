import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import { createClient } from "@/app/lib/supabase/client";

type AuthStateChangeHandler = (
  event: AuthChangeEvent,
  session: Session | null
) => void;

async function waitForSession() {
  const client = createClient();

  for (let i = 0; i < 10; i += 1) {
    const { data } = await client.auth.getSession();
    if (data.session) {
      return true;
    }

    await new Promise((resolve) => setTimeout(resolve, 120));
  }

  return false;
}

export const authService = {
  async getCurrentUser(): Promise<User | null> {
    const { data: { session } } = await createClient().auth.getSession();
    return session?.user ?? null;
  },

  onAuthStateChange(handler: AuthStateChangeHandler) {
    const { data: { subscription } } = createClient().auth.onAuthStateChange(handler);

    return () => {
      subscription.unsubscribe();
    };
  },

  async signInWithPassword(email: string, password: string) {
    const { error } = await createClient().auth.signInWithPassword({ email, password });
    if (error) throw error;

    await waitForSession();
  },

  async signUp(email: string, password: string) {
    const { error } = await createClient().auth.signUp({ email, password });
    if (error) throw error;
  },

  async resetPasswordForEmail(email: string, redirectTo: string) {
    const { error } = await createClient().auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    if (error) throw error;
  },

  async updatePassword(password: string) {
    const { error } = await createClient().auth.updateUser({ password });
    if (error) throw error;
  },

  async signOut() {
    const { error } = await createClient().auth.signOut();
    if (error) throw error;
  },
};
