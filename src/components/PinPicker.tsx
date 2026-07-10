import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { LedgerEntry } from '../types';
import './PinPicker.css';

interface PinPickerProps {
  userId: string;
  pinnedId: string | null;
  onPinnedChanged: (id: string | null) => void;
}

// Small ribbon-bookmark icon that sits next to the "Ledger" section
// label. Tapping it opens a bottom sheet listing every entry so the
// owner can choose (or clear) the single pinned slot — there are no
// per-row pin controls on the cards themselves. Fetches its own
// (title-only) entry list on open, rather than sharing state with
// LedgerList, to keep the two components independent.
export default function PinPicker({ userId, pinnedId, onPinnedChanged }: PinPickerProps) {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<Pick<LedgerEntry, 'id' | 'title'>[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openSheet = async () => {
    setOpen(true);
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from('ledger_entries')
      .select('id, title')
      .eq('user_id', userId)
      .order('consumed_date', { ascending: false });

    setLoading(false);

    if (fetchError) {
      setError(fetchError.message);
      return;
    }

    setEntries(data as Pick<LedgerEntry, 'id' | 'title'>[]);
  };

  const setPin = async (id: string | null) => {
    setSaving(true);
    setError(null);

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ pinned_ledger_entry_id: id })
      .eq('id', userId);

    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    onPinnedChanged(id);
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        className="pin-picker-trigger"
        aria-label={pinnedId ? 'Change pinned entry' : 'Pin an entry'}
        onClick={openSheet}
      >
        <svg width="18" height="18">
          <use href={`/icons.svg#${pinnedId ? 'pin-solid' : 'pin-outline'}`} />
        </svg>
      </button>

      {open && (
        <div className="pin-picker-sheet-backdrop" onClick={() => setOpen(false)}>
          <div className="pin-picker-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="pin-picker-sheet-header">
              <h3>Pin to your Ledger</h3>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close">
                ✕
              </button>
            </div>

            {error && <p className="pin-picker-error">{error}</p>}
            {loading && <p className="pin-picker-error">Loading…</p>}

            <div className="pin-picker-options">
              {entries.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  className="pin-picker-option"
                  disabled={saving}
                  onClick={() => setPin(entry.id)}
                >
                  <span className="pin-picker-option-title">{entry.title}</span>
                  {entry.id === pinnedId && (
                    <svg width="14" height="14">
                      <use href="/icons.svg#pin-solid" />
                    </svg>
                  )}
                </button>
              ))}
            </div>

            {pinnedId && (
              <button
                type="button"
                className="pin-picker-clear"
                disabled={saving}
                onClick={() => setPin(null)}
              >
                Unpin
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
