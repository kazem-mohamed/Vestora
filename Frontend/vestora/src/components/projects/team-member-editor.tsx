"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ImagePlus } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PillButton } from "@/components/ui/pill-button";
import { storyApi, teamAvatarUrl } from "@/lib/api/story";
import { useLocale } from "@/lib/i18n/locale";
import type { TeamMember } from "@/lib/types/api";

const inputCls =
  "h-11 w-full rounded-lg border border-input bg-card/60 px-3.5 text-sm outline-none backdrop-blur-sm transition-colors placeholder:text-muted-foreground/70 focus-visible:border-primary/60 focus-visible:ring-3 focus-visible:ring-ring/25";

export function TeamMemberEditor({
  projectId,
  member,
  nextOrder,
  open,
  onOpenChange,
}: {
  projectId: number;
  member?: TeamMember;
  nextOrder: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useLocale();
  const qc = useQueryClient();
  const editing = !!member;
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [bio, setBio] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [email, setEmail] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setName(member?.name ?? "");
      setRole(member?.role ?? "");
      setBio(member?.bio ?? "");
      setLinkedin(member?.linkedinUrl ?? "");
      setEmail(member?.email ?? "");
      setAvatarFile(null);
      setPreview(member?.hasAvatar ? teamAvatarUrl(member.id) : null);
    }
  }, [open, member]);

  function pickFile(f: File | undefined) {
    if (!f || !f.type.startsWith("image/")) return;
    setAvatarFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function submit() {
    if (!name.trim()) {
      toast.error(t("valid.min"));
      return;
    }
    const body = {
      name: name.trim(),
      role: role.trim() || null,
      bio: bio.trim() || null,
      linkedinUrl: linkedin.trim() || null,
      email: email.trim() || null,
      sortOrder: member?.sortOrder ?? nextOrder,
    };
    try {
      setBusy(true);
      let id = member?.id;
      if (editing) {
        await storyApi.editTeamMember(member!.id, body);
      } else {
        const res = await storyApi.addTeamMember(projectId, body);
        id = res.memberId;
      }
      if (avatarFile && id != null) await storyApi.uploadTeamAvatar(id, avatarFile);
      toast.success(editing ? t("team.saved") : t("team.added"));
      qc.invalidateQueries({ queryKey: ["team", projectId] });
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? t("team.form.edit") : t("team.form.new")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              data-cursor="hover"
              onClick={() => fileRef.current?.click()}
              className="group relative size-16 shrink-0 overflow-hidden rounded-full border border-dashed border-input bg-card/60"
              aria-label={t("team.form.avatar")}
            >
              {preview ? (
                <img src={preview} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-muted-foreground">
                  <ImagePlus className="size-5" />
                </span>
              )}
            </button>
            <div className="text-xs text-muted-foreground">{t("team.form.avatar")}</div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                pickFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="tm-name" className="text-sm font-medium">
              {t("team.form.name")}
            </label>
            <input id="tm-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("team.form.namePh")} className={inputCls} />
          </div>
          <div className="space-y-2">
            <label htmlFor="tm-role" className="text-sm font-medium">
              {t("team.form.role")}
            </label>
            <input id="tm-role" value={role} onChange={(e) => setRole(e.target.value)} placeholder={t("team.form.rolePh")} className={inputCls} />
          </div>
          <div className="space-y-2">
            <label htmlFor="tm-bio" className="text-sm font-medium">
              {t("team.form.bio")}
            </label>
            <input id="tm-bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder={t("team.form.bioPh")} className={inputCls} />
          </div>
          <div className="space-y-2">
            <label htmlFor="tm-linkedin" className="text-sm font-medium">
              {t("team.form.linkedin")}
            </label>
            <input id="tm-linkedin" type="url" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="https://linkedin.com/in/…" className={inputCls} />
          </div>
          <div className="space-y-2">
            <label htmlFor="tm-email" className="text-sm font-medium">
              {t("team.form.email")}
            </label>
            <input
              id="tm-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              dir="ltr"
              className={inputCls}
            />
            <p className="text-xs text-muted-foreground">{t("team.form.emailHint")}</p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={busy}
            className="rounded-full border border-border px-5 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-60"
          >
            {t("form.cancel")}
          </button>
          <PillButton onClick={submit} disabled={busy}>
            {busy ? t("team.form.saving") : t("team.form.save")}
          </PillButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
