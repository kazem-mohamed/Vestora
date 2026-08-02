"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PillButton } from "@/components/ui/pill-button";
import { TeamMemberEditor } from "@/components/projects/team-member-editor";
import { storyApi, teamAvatarUrl } from "@/lib/api/story";
import { useLocale } from "@/lib/i18n/locale";
import type { TeamMember } from "@/lib/types/api";

const EASE = [0.22, 1, 0.36, 1] as const;

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

export function TeamSection({ projectId, isOwner }: { projectId: number; isOwner: boolean }) {
  const { t, locale } = useLocale();
  const rtl = locale === "ar";
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["team", projectId],
    queryFn: () => storyApi.team(projectId),
  });

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<TeamMember | undefined>();
  const [toDelete, setToDelete] = useState<TeamMember | null>(null);

  const del = useMutation({
    mutationFn: (id: number) => storyApi.deleteTeamMember(id),
    onSuccess: () => {
      toast.success(t("team.deleted"));
      setToDelete(null);
      qc.invalidateQueries({ queryKey: ["team", projectId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const team = data ?? [];
  if (!isLoading && team.length === 0 && !isOwner) return null;

  function openNew() {
    setEditing(undefined);
    setEditorOpen(true);
  }

  return (
    <section>
      <div className="flex items-center justify-between gap-4">
        <h2 className={`text-xs text-primary ${rtl ? "" : "uppercase tracking-[0.35em]"}`}>
          {t("team.section")}
        </h2>
        {isOwner && (
          <PillButton onClick={openNew} size="sm">
            <Plus className="size-4" />
            {t("team.add")}
          </PillButton>
        )}
      </div>

      {isLoading ? (
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-secondary" />
          ))}
        </div>
      ) : team.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border bg-card/40 px-6 py-14 text-center">
          <p className="text-lg font-medium">{t("team.empty.owner")}</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">{t("team.empty.ownerBody")}</p>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {team.map((m, i) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.55, delay: (i % 6) * 0.06, ease: EASE }}
              className="group flex items-start gap-4 rounded-2xl border border-border bg-card/50 p-5 transition-colors duration-300 hover:border-primary/30"
            >
              <span className="relative size-14 shrink-0 overflow-hidden rounded-full bg-secondary ring-1 ring-border">
                {m.hasAvatar ? (
                  <img src={teamAvatarUrl(m.id)} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span
                    className="flex h-full w-full items-center justify-center text-sm font-bold text-primary/80"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    {initials(m.name)}
                  </span>
                )}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-bold" style={{ fontFamily: "var(--font-heading)" }}>
                      {m.name}
                    </p>
                    {m.role && <p className="text-xs text-primary">{m.role}</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {m.linkedinUrl && (
                      <a
                        href={m.linkedinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        data-cursor="hover"
                        aria-label="LinkedIn"
                        className="flex size-7 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                      >
                        <ExternalLink className="size-3.5" />
                      </a>
                    )}
                    {isOwner && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setEditing(m);
                            setEditorOpen(true);
                          }}
                          data-cursor="hover"
                          aria-label={t("team.form.edit")}
                          className="flex size-7 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                        >
                          <Pencil className="size-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setToDelete(m)}
                          data-cursor="hover"
                          aria-label={t("team.delete.ok")}
                          className="flex size-7 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-destructive/50 hover:text-destructive"
                        >
                          <Trash2 className="size-3" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                {m.bio && <p className="mt-2 text-sm leading-snug text-muted-foreground">{m.bio}</p>}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {isOwner && (
        <TeamMemberEditor
          projectId={projectId}
          member={editing}
          nextOrder={team.length}
          open={editorOpen}
          onOpenChange={setEditorOpen}
        />
      )}

      <Dialog open={!!toDelete} onOpenChange={(o) => !del.isPending && !o && setToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("team.delete.title")}</DialogTitle>
            <DialogDescription>{toDelete?.name}</DialogDescription>
          </DialogHeader>
          <div className="mt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setToDelete(null)}
              className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {t("form.cancel")}
            </button>
            <button
              type="button"
              disabled={del.isPending}
              onClick={() => toDelete && del.mutate(toDelete.id)}
              className="rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {t("team.delete.ok")}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
