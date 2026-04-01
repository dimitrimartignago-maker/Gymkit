"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { updateClientGoals } from "./goals/actions";
import { Target } from "lucide-react";

interface Props {
  clientId: string;
  initialGoals: string;
}

export function GoalsEditor({ clientId, initialGoals }: Props) {
  const [editing, setEditing] = useState(false);
  const [goals, setGoals] = useState(initialGoals);
  const [draft, setDraft] = useState(initialGoals);
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    setLoading(true);
    try {
      const result = await updateClientGoals(clientId, draft);
      if (result.success) {
        setGoals(draft);
        setEditing(false);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 p-4 rounded-[var(--radius-md)] bg-[var(--color-surface)] border border-[var(--color-border)]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-[var(--color-text)]">
          <Target size={15} className="text-[var(--color-accent)]" />
          Obiettivi
        </div>
        {!editing && (
          <button
            onClick={() => { setDraft(goals); setEditing(true); }}
            className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-colors"
          >
            Modifica
          </button>
        )}
      </div>

      {editing ? (
        <div className="flex flex-col gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            placeholder="Es. Perdere peso, aumentare massa, migliorare resistenza..."
            className="w-full rounded-[var(--radius-md)] px-3 py-2 bg-[var(--color-surface-raised)] text-[var(--color-text)] border border-[var(--color-border)] focus:border-[var(--color-accent)] outline-none text-sm placeholder:text-[var(--color-text-secondary)] resize-none transition-colors"
          />
          <div className="flex gap-2 justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditing(false)}
              disabled={loading}
            >
              Annulla
            </Button>
            <Button size="sm" loading={loading} onClick={handleSave}>
              Salva
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-[var(--color-text-secondary)]">
          {goals || <span className="italic">Nessun obiettivo impostato</span>}
        </p>
      )}
    </div>
  );
}
