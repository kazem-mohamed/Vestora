"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { Guilloche } from "@/components/auth/guilloche";
import { SettingsTabs } from "@/components/settings/settings-tabs";
import { PillButton } from "@/components/ui/pill-button";
import { authApi } from "@/lib/api/auth";
import { usersApi, avatarUrl, coverUrl } from "@/lib/api/users";
import { useAuthStore } from "@/lib/auth/store";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";

export default function EditProfilePage() {
  const { t, locale } = useLocale();
  const rtl = locale === "ar";
  const user = useAuthStore((s) => s.user);
  const isInvestor = user?.userType === "Investor";
  const router = useRouter();
  const qc = useQueryClient();

  const meQ = useQuery({ queryKey: ["me"], queryFn: () => authApi.me(), enabled: !!user });

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [website, setWebsite] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [twitter, setTwitter] = useState("");
  const [interests, setInterests] = useState("");
  const [thesis, setThesis] = useState("");
  const [ticketMin, setTicketMin] = useState("");
  const [ticketMax, setTicketMax] = useState("");
  const [avatar, setAvatar] = useState<File | null>(null);
  const [cover, setCover] = useState<File | null>(null);

  useEffect(() => {
    const m = meQ.data;
    if (!m) return;
    setName(m.userName ?? "");
    setBio(m.briefBio ?? "");
    setPhone(m.phone ?? "");
    setBirthDate(m.birthDate ? m.birthDate.slice(0, 10) : "");
    setWebsite(m.websiteUrl ?? "");
    setLinkedin(m.linkedinUrl ?? "");
    setTwitter(m.twitterUrl ?? "");
    setInterests(m.preferredIndustries ?? "");
    setThesis(m.investmentThesis ?? "");
    setTicketMin(m.ticketMin != null ? String(m.ticketMin) : "");
    setTicketMax(m.ticketMax != null ? String(m.ticketMax) : "");
  }, [meQ.data]);

  const avatarPreview = useMemo(() => (avatar ? URL.createObjectURL(avatar) : null), [avatar]);
  const coverPreview = useMemo(() => (cover ? URL.createObjectURL(cover) : null), [cover]);
  useEffect(
    () => () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    },
    [avatarPreview]
  );
  useEffect(
    () => () => {
      if (coverPreview) URL.revokeObjectURL(coverPreview);
    },
    [coverPreview]
  );

  const save = useMutation({
    mutationFn: () =>
      usersApi.updateMe({
        userName: name.trim(),
        briefBio: bio,
        phone,
        birthDate: birthDate || undefined,
        websiteUrl: website.trim(),
        linkedinUrl: linkedin.trim(),
        twitterUrl: twitter.trim(),
        preferredIndustries: isInvestor ? interests.trim() : undefined,
        investmentThesis: isInvestor ? thesis.trim() : undefined,
        ticketMin: isInvestor ? (ticketMin === "" ? null : Number(ticketMin)) : undefined,
        ticketMax: isInvestor ? (ticketMax === "" ? null : Number(ticketMax)) : undefined,
        avatar,
        cover,
      }),
    onSuccess: () => {
      toast.success(t("pset.saved"));
      if (user) qc.invalidateQueries({ queryKey: ["profile", user.id] });
      qc.invalidateQueries({ queryKey: ["me"] });
      if (user) router.push(`/u/${user.id}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!user) return null;

  const coverSrc = coverPreview ?? (meQ.data?.hasCover ? coverUrl(user.id) : null);
  const avatarSrc = avatarPreview ?? (meQ.data?.hasAvatar ? avatarUrl(user.id) : null);

  const inputCls =
    "w-full rounded-xl border border-input bg-card/60 px-4 py-3 text-sm outline-none backdrop-blur-sm transition-colors placeholder:text-muted-foreground/70 focus-visible:border-primary/60 focus-visible:ring-3 focus-visible:ring-ring/25";

  return (
    <div className="mx-auto max-w-3xl px-6 py-14 sm:py-20">
      <p className={`text-xs text-primary ${rtl ? "" : "uppercase tracking-[0.3em]"}`}>
        {t("pset.eyebrow")}
      </p>
      <h1
        className={`mt-3 text-4xl font-bold sm:text-5xl ${rtl ? "leading-[1.3]" : "leading-[1.05]"}`}
        style={{ fontFamily: "var(--font-heading)" }}
      >
        {t("pset.title")}
      </h1>
      <p className="mt-3 max-w-md text-sm text-muted-foreground">{t("pset.subtitle")}</p>

      <div className="mt-8 max-w-md">
        <SettingsTabs />
      </div>

      {meQ.isError && (
        <div className="mt-6 flex items-center justify-between gap-4 rounded-xl border border-destructive/30 bg-destructive/[0.06] px-4 py-3 text-sm text-destructive">
          <span>{t("state.error.body")}</span>
          <button
            type="button"
            data-cursor="hover"
            onClick={() => meQ.refetch()}
            className="link-underline shrink-0 font-medium"
          >
            {t("state.error.retry")}
          </button>
        </div>
      )}

      <div className="mt-10 overflow-hidden rounded-2xl border border-border bg-card/40">
        {/* Cover editor */}
        <div className="relative h-48 w-full overflow-hidden bg-secondary sm:h-56">
          {coverSrc ? (
            <img src={coverSrc} alt="" className="h-full w-full object-cover" />
          ) : (
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                backgroundImage:
                  "radial-gradient(120% 120% at 12% 0%, color-mix(in oklab, var(--primary) 22%, #141210), #141210 70%)",
              }}
            >
              <Guilloche className="absolute -end-24 -top-24 h-[420px] w-[420px] text-primary/[0.10]" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          <label className="absolute end-4 top-4 inline-flex cursor-pointer items-center gap-2 rounded-full bg-black/45 px-4 py-2 text-xs font-medium text-white backdrop-blur-sm transition-colors hover:bg-black/60">
            <ImagePlus className="size-4" />
            {t("pset.cover")}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => setCover(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>

        {/* Avatar editor — overlaps the cover */}
        <div className="px-6 sm:px-8">
          <div className="-mt-12 flex items-end gap-4">
            <label className="group relative grid size-24 cursor-pointer place-items-center overflow-hidden rounded-full bg-secondary ring-4 ring-card">
              {avatarSrc ? (
                <img src={avatarSrc} alt="" className="h-full w-full object-cover" />
              ) : (
                <span
                  className="text-2xl text-primary"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  {name.trim().charAt(0).toUpperCase() || "?"}
                </span>
              )}
              <span className="absolute inset-0 grid place-items-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                <Camera className="size-5 text-white" />
              </span>
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => setAvatar(e.target.files?.[0] ?? null)}
              />
            </label>
            <p className="pb-2 text-xs text-muted-foreground">{t("pset.avatar")}</p>
          </div>

          {/* Fields */}
          <div className="mt-8 space-y-5 pb-8">
            <div>
              <label className="mb-1.5 block text-xs text-muted-foreground">{t("pset.name")}</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-muted-foreground">{t("pset.bio")}</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                maxLength={250}
                placeholder={t("pset.bio.ph")}
                className={`${inputCls} resize-none`}
              />
              <p className="mt-1 text-end font-numeric text-[11px] text-muted-foreground">
                {bio.length}/250
              </p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs text-muted-foreground">
                  {t("pset.phone")}
                </label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={inputCls}
                  dir="ltr"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs text-muted-foreground">
                  {t("pset.birthDate")}
                </label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className={inputCls}
                  dir="ltr"
                />
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-xs text-muted-foreground">
                  {t("pset.website")}
                </label>
                <input
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://"
                  className={inputCls}
                  dir="ltr"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs text-muted-foreground">
                  {t("pset.linkedin")}
                </label>
                <input
                  value={linkedin}
                  onChange={(e) => setLinkedin(e.target.value)}
                  placeholder="https://linkedin.com/in/…"
                  className={inputCls}
                  dir="ltr"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs text-muted-foreground">
                  {t("pset.twitter")}
                </label>
                <input
                  value={twitter}
                  onChange={(e) => setTwitter(e.target.value)}
                  placeholder="https://x.com/…"
                  className={inputCls}
                  dir="ltr"
                />
              </div>
            </div>

            {isInvestor && (
              <>
                <div>
                  <label className="mb-1.5 block text-xs text-muted-foreground">
                    {t("pset.interests")}
                  </label>
                  <input
                    value={interests}
                    onChange={(e) => setInterests(e.target.value)}
                    placeholder={t("pset.interests.ph")}
                    maxLength={500}
                    className={inputCls}
                  />
                </div>

                {/* What a founder weighs when deciding whether to take the
                    conversation — until now they saw a name and an email. */}
                <div>
                  <label className="mb-1.5 block text-xs text-muted-foreground">
                    {t("pset.thesis")}
                  </label>
                  <textarea
                    value={thesis}
                    onChange={(e) => setThesis(e.target.value)}
                    placeholder={t("pset.thesis.ph")}
                    maxLength={500}
                    rows={3}
                    className={cn(inputCls, "resize-y")}
                  />
                  <p className="mt-1.5 text-[11px] text-muted-foreground/70">
                    {t("pset.thesis.hint")}
                  </p>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs text-muted-foreground">
                    {t("pset.ticket")}
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min={0}
                      inputMode="numeric"
                      value={ticketMin}
                      onChange={(e) => setTicketMin(e.target.value)}
                      placeholder={t("pset.ticket.min")}
                      className={cn(inputCls, "font-numeric")}
                    />
                    <span aria-hidden className="shrink-0 text-sm text-muted-foreground">
                      —
                    </span>
                    <input
                      type="number"
                      min={0}
                      inputMode="numeric"
                      value={ticketMax}
                      onChange={(e) => setTicketMax(e.target.value)}
                      placeholder={t("pset.ticket.max")}
                      className={cn(inputCls, "font-numeric")}
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] text-muted-foreground/70">
                    {t("pset.ticket.hint")}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 flex items-center gap-4">
        <PillButton
          onClick={() => save.mutate()}
          disabled={save.isPending}
          showArrow={false}
        >
          {save.isPending ? t("pset.saving") : t("pset.save")}
        </PillButton>
        <button
          type="button"
          data-cursor="hover"
          onClick={() => router.push(`/u/${user.id}`)}
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          {t("pset.viewProfile")}
        </button>
      </div>
    </div>
  );
}
