'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Pencil, Check, X } from 'lucide-react';
import { toast } from 'sonner';

export default function EditableName({ initialName }: { initialName: string }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(initialName);
  const [draft, setDraft] = useState(initialName);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!draft.trim() || draft.trim() === name) {
      setEditing(false);
      setDraft(name);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: draft.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update');
      }
      const updated = await res.json();
      setName(updated.name);
      setDraft(updated.name);
      setEditing(false);
      toast.success('Name updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update name');
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <p className="text-white">{name || '—'}</p>
        <button
          onClick={() => setEditing(true)}
          className="flex size-6 items-center justify-center rounded text-slate hover:bg-white/5 hover:text-white"
        >
          <Pencil className="size-3" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') save();
          if (e.key === 'Escape') {
            setEditing(false);
            setDraft(name);
          }
        }}
        className="h-8 w-48"
        maxLength={100}
        autoFocus
        disabled={saving}
      />
      <Button
        size="icon"
        variant="ghost"
        onClick={save}
        disabled={saving}
        className="size-7 text-success hover:text-success"
      >
        <Check className="size-3.5" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        onClick={() => {
          setEditing(false);
          setDraft(name);
        }}
        disabled={saving}
        className="size-7 text-slate hover:text-danger"
      >
        <X className="size-3.5" />
      </Button>
    </div>
  );
}
