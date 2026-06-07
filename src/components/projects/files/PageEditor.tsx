"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { inputClasses, labelClasses, textareaClasses } from "@/lib/formStyles";
import { updatePage } from "@/lib/projectFiles";
import type { ProjectFileItem } from "@/types";

interface PageEditorProps {
  projectId: string;
  item: ProjectFileItem;
  readOnly: boolean;
  onSaved: (updates: Pick<ProjectFileItem, "name" | "content">) => void;
}

export function PageEditor({
  projectId,
  item,
  readOnly,
  onSaved,
}: PageEditorProps) {
  const [name, setName] = useState(item.name);
  const [content, setContent] = useState(item.content ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  useEffect(() => {
    setName(item.name);
    setContent(item.content ?? "");
  }, [item]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSavedMessage(null);

    try {
      await updatePage(projectId, item.id, { name, content });
      onSaved({ name: name.trim(), content });
      setSavedMessage("Page saved.");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to save page.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="page-title" className={labelClasses}>
          Title
        </label>
        <input
          id="page-title"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          readOnly={readOnly}
          className={inputClasses}
        />
      </div>

      <div>
        <label htmlFor="page-content" className={labelClasses}>
          Content (Markdown)
        </label>
        <textarea
          id="page-content"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          readOnly={readOnly}
          rows={16}
          placeholder="Write documentation in Markdown..."
          className={`${textareaClasses} min-h-[320px] resize-y font-mono`}
        />
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      {savedMessage && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
          {savedMessage}
        </div>
      )}

      {!readOnly && (
        <div className="flex justify-end">
          <Button
            type="button"
            size="sm"
            onClick={() => void handleSave()}
            disabled={saving || !name.trim()}
          >
            {saving ? "Saving..." : "Save Page"}
          </Button>
        </div>
      )}
    </div>
  );
}
