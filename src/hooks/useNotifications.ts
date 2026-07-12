import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { InCommonNotification } from '../types';

export interface NotificationItem extends InCommonNotification {
  otherUser: { username: string; name: string } | null;
  clippedText: string | null;
  entryId: string | null;
  entryTitle: string | null;
  entryCreator: string | null;
}

interface NotificationsState {
  loading: boolean;
  needsAuth: boolean;
  error: string | null;
  notifications: NotificationItem[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
}

export function useNotifications(): NotificationsState {
  const [loading, setLoading] = useState(true);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);

    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    if (!currentUser) {
      setLoading(false);
      setNeedsAuth(true);
      return;
    }

    const { data: rows, error: fetchError } = await supabase
      .from('in_common_notifications')
      .select('*')
      .eq('recipient_id', currentUser.id)
      .order('created_at', { ascending: false });

    if (fetchError) {
      setLoading(false);
      setError(fetchError.message);
      return;
    }

    const base = (rows ?? []) as InCommonNotification[];

    if (base.length === 0) {
      setLoading(false);
      setNotifications([]);
      return;
    }

    const otherUserIds = Array.from(new Set(base.map((n) => n.other_user_id)));
    const myPassageIds = Array.from(new Set(base.map((n) => n.my_passage_id)));

    const [{ data: profileRows, error: profileError }, { data: passageRows, error: passageError }] =
      await Promise.all([
        supabase.from('public_profiles').select('id, username, name').in('id', otherUserIds),
        supabase.from('passages').select('id, clipped_text, ledger_entry_id').in('id', myPassageIds),
      ]);

    if (profileError || passageError) {
      setLoading(false);
      setError(profileError?.message ?? passageError?.message ?? 'Failed to load notifications.');
      return;
    }

    const profileById = new Map(
      (profileRows ?? []).map((p) => [p.id as string, p as { id: string; username: string; name: string }])
    );
    const passageById = new Map(
      (passageRows ?? []).map((p) => [
        p.id as string,
        p as { id: string; clipped_text: string | null; ledger_entry_id: string },
      ])
    );

    const entryIds = Array.from(
      new Set(Array.from(passageById.values()).map((p) => p.ledger_entry_id))
    );

    const { data: entryRows, error: entryError } = await supabase
      .from('ledger_entries')
      .select('id, title, creator')
      .in('id', entryIds.length > 0 ? entryIds : ['']);

    setLoading(false);

    if (entryError) {
      setError(entryError.message);
      return;
    }

    const entryById = new Map(
      (entryRows ?? []).map((e) => [e.id as string, e as { id: string; title: string; creator: string | null }])
    );

    const enriched: NotificationItem[] = base.map((n) => {
      const myPassage = passageById.get(n.my_passage_id);
      const entry = myPassage ? entryById.get(myPassage.ledger_entry_id) : undefined;
      const otherProfile = profileById.get(n.other_user_id);

      return {
        ...n,
        otherUser: otherProfile ? { username: otherProfile.username, name: otherProfile.name } : null,
        clippedText: myPassage?.clipped_text ?? null,
        entryId: entry?.id ?? null,
        entryTitle: entry?.title ?? null,
        entryCreator: entry?.creator ?? null,
      };
    });

    setNotifications(enriched);
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = useCallback(async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    await supabase.from('in_common_notifications').update({ is_read: true }).eq('id', id);
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return { loading, needsAuth, error, notifications, unreadCount, markAsRead };
}
