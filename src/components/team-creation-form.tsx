"use client";

import * as React from "react";

interface TeamCreationFormProps {
  onCreated: (team: { id: string; slug: string; workosOrgId: string }) => void;
  onCancel: () => void;
}

const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function TeamCreationForm({ onCreated, onCancel }: TeamCreationFormProps) {
  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  function handleNameChange(value: string) {
    setName(value);
    if (!slugManuallyEdited) {
      setSlug(toSlug(value));
    }
    setError(null);
  }

  function handleSlugChange(value: string) {
    setSlugManuallyEdited(true);
    setSlug(value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
    setError(null);
  }

  function validate(): string | null {
    if (name.length < 1 || name.length > 100) {
      return "Team name is required (max 100 characters)";
    }
    if (slug.length < 3 || slug.length > 50) {
      return "URL slug must be 3-50 characters";
    }
    if (!SLUG_PATTERN.test(slug)) {
      return "URL slug must start and end with a letter or number";
    }
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/teams/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), slug }),
      });

      if (res.status === 409) {
        setError("This URL is already taken");
        setLoading(false);
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Something went wrong");
        setLoading(false);
        return;
      }

      const team = await res.json();
      onCreated({
        id: team.id,
        slug: team.slug,
        workosOrgId: team.workosOrgId,
      });
    } catch {
      setError("Something went wrong");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="text-[13px] font-medium text-[#1A1A1A] mb-2">
        Create a Team
      </div>

      <div>
        <input
          type="text"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="Team name"
          maxLength={100}
          autoFocus
          className="w-full px-2.5 py-1.5 text-[13px] rounded-md border bg-white text-[#1A1A1A] placeholder-[#aaa] focus:outline-none focus:ring-1 focus:ring-[#1A1A1A]/20"
          style={{ borderColor: "rgba(0,0,0,0.12)" }}
        />
      </div>

      <div>
        <div className="flex items-center gap-1 text-[11px] text-[#999] mb-0.5">
          <span>standup.site/</span>
        </div>
        <input
          type="text"
          value={slug}
          onChange={(e) => handleSlugChange(e.target.value)}
          placeholder="team-url"
          maxLength={50}
          className="w-full px-2.5 py-1.5 text-[13px] rounded-md border bg-white text-[#1A1A1A] placeholder-[#aaa] focus:outline-none focus:ring-1 focus:ring-[#1A1A1A]/20"
          style={{ borderColor: "rgba(0,0,0,0.12)" }}
        />
      </div>

      {error && (
        <div className="text-[12px] text-red-500 px-0.5">{error}</div>
      )}

      <div className="flex items-center gap-2 pt-1">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-3 py-1.5 text-[13px] font-medium text-white bg-[#1A1A1A] rounded-md hover:bg-[#333] transition-colors disabled:opacity-50 cursor-pointer"
        >
          {loading ? "Creating..." : "Create Team"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="px-3 py-1.5 text-[13px] text-[#555] hover:bg-[#f5f5f4] rounded-md transition-colors cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
