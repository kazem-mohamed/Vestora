"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, Eye, FileQuestion, FileText, Lock, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { dealsApi } from "@/lib/api/deals";
import { storyApi } from "@/lib/api/story";
import { useLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";
import type { DealDocument, DealDocumentRequest } from "@/lib/types/api";

const EASE = [0.22, 1, 0.36, 1] as const;

function sizeLabel(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * The things each side asks for by name, and what came back.
 *
 * Common asks, offered as one tap. Not a closed list — the free-text field is still
 * there — but naming the four documents that get asked for in almost every deal saves
 * both sides from inventing a phrase for them, and makes the two directions legible
 * at a glance: a founder asking for proof of funds is doing diligence, not admin.
 */
const TEMPLATES: Record<"ToFounder" | "ToInvestor", string[]> = {
  ToFounder: ["deal.doc.tpl.capTable", "deal.doc.tpl.financials", "deal.doc.tpl.deck", "deal.doc.tpl.incorporation"],
  ToInvestor: ["deal.doc.tpl.proofOfFunds", "deal.doc.tpl.kyc", "deal.doc.tpl.mandate", "deal.doc.tpl.references"],
};

/**
 * The data room as it behaves inside a relationship.
 *
 * The venture page already publishes what the founder chose to share. What an actual
 * evaluation runs into is the gap — the thing that is not there yet — and neither side
 * had any way to name it. A request is that gap made explicit: one side asks, the other
 * answers by attaching something or by declining with a reason. Never a silent no, and
 * never a request that quietly disappears.
 *
 * It ran one way for a long time, and the asymmetry was never argued for: an investor
 * could ask for a cap table and a founder could not ask who was funding them. The two
 * sides still ANSWER differently, because they hold documents differently — the founder
 * links something from the data room, the investor attaches a file to the request
 * itself, since a venture's data room is readable by every other approved backer and a
 * bank letter is not for them.
 */
export function DealDocuments({
  investmentId,
  documents,
  requests,
  canRequest,
  viewerRole,
}: {
  investmentId: number;
  documents: DealDocument[];
  requests: DealDocumentRequest[];
  /** Either party may ask, once the founder has accepted the request. */
  canRequest: boolean;
  viewerRole: "founder" | "investor" | "admin";
}) {
  const { t, locale } = useLocale();
  const reduce = useReducedMotion() ?? false;
  const qc = useQueryClient();

  const [asking, setAsking] = useState(false);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [resolving, setResolving] = useState<number | null>(null);
  const [pickedDoc, setPickedDoc] = useState<number | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [responseNote, setResponseNote] = useState("");

  // Which way this side's requests point. The founder asks the investor for things,
  // and vice versa — so the templates offered depend on who is looking.
  const asksToward: "ToFounder" | "ToInvestor" =
    viewerRole === "founder" ? "ToInvestor" : "ToFounder";

  const invalidate = () => qc.invalidateQueries({ queryKey: ["deal", investmentId] });

  const request = useMutation({
    mutationFn: () => dealsApi.requestDocument(investmentId, title.trim(), note.trim() || undefined),
    onSuccess: () => {
      toast.success(t("deal.doc.requested"));
      setTitle("");
      setNote("");
      setAsking(false);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resolve = useMutation({
    mutationFn: (input: { id: number; status: "Fulfilled" | "Declined" }) =>
      dealsApi.resolveDocumentRequest(input.id, {
        status: input.status,
        documentId: input.status === "Fulfilled" ? pickedDoc ?? undefined : undefined,
        responseNote: input.status === "Fulfilled" ? responseNote.trim() || undefined : undefined,
        declinedReason: input.status === "Declined" ? declineReason.trim() : undefined,
      }),
    onSuccess: () => {
      toast.success(t("deal.doc.resolved"));
      setResolving(null);
      setPickedDoc(null);
      setDeclineReason("");
      setResponseNote("");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // The investor's answer. Uploaded first, then the request is marked fulfilled —
  // two steps because the file has to exist before the resolution can claim it does.
  const upload = useMutation({
    mutationFn: (input: { id: number; file: File }) =>
      dealsApi.uploadDocumentResponse(input.id, input.file),
    onSuccess: () => {
      toast.success(t("deal.doc.attached"));
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function openResponse(r: DealDocumentRequest) {
    try {
      const url = await dealsApi.documentResponseObjectUrl(r.id);
      const a = document.createElement("a");
      a.href = url;
      a.download = r.responseFileName ?? "document";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const withdraw = useMutation({
    mutationFn: (id: number) => dealsApi.withdrawDocumentRequest(id),
    onSuccess: () => {
      toast.success(t("deal.doc.withdrawn"));
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function download(doc: DealDocument) {
    try {
      await storyApi.downloadDocument(doc.id, doc.fileName);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const openRequests = requests.filter((r) => r.status === "Open");
  const settled = requests.filter((r) => r.status !== "Open");

  const fmt = new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-GB", {
    day: "numeric",
    month: "short",
  });

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <FileText className="size-4 text-primary" strokeWidth={1.8} />
          <h2 className="text-base font-bold" style={{ fontFamily: "var(--font-heading)" }}>
            {t("deal.doc.title")}
          </h2>
        </div>

        {canRequest && !asking && (
          <button
            type="button"
            data-cursor="hover"
            onClick={() => setAsking(true)}
            className={cn(
              "inline-flex min-h-10 items-center gap-2 rounded-full border border-border px-4 text-xs outline-none",
              "transition-colors duration-300 hover:border-primary/50 hover:text-primary",
              "focus-visible:ring-3 focus-visible:ring-ring/25"
            )}
          >
            <Plus className="size-3.5" strokeWidth={2} />
            {t("deal.doc.request")}
          </button>
        )}
      </div>

      {/* ---- Ask for something that isn't here ---- */}
      <AnimatePresence>
        {asking && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="mt-4 rounded-2xl border border-border/70 bg-card/40 p-5">
              {/* The four things asked for in almost every deal, as one tap. The
                  free-text field below is still the real input — these just save
                  both sides from inventing a phrase for the obvious. */}
              <div className="mb-3 flex flex-wrap gap-2">
                {TEMPLATES[asksToward].map((key) => (
                  <button
                    key={key}
                    type="button"
                    data-cursor="hover"
                    onClick={() => setTitle(t(key))}
                    className={cn(
                      "inline-flex min-h-8 items-center rounded-full border px-3 text-[11.5px] transition-colors",
                      title === t(key)
                        ? "border-primary/60 bg-primary/[0.08] text-primary"
                        : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    )}
                  >
                    {t(key)}
                  </button>
                ))}
              </div>

              <input
                value={title}
                onChange={(e) => setTitle(e.target.value.slice(0, 160))}
                placeholder={t("deal.doc.titlePlaceholder")}
                aria-label={t("deal.doc.titlePlaceholder")}
                className="h-11 w-full rounded-xl border border-input bg-background/50 px-4 text-sm outline-none transition-colors focus-visible:border-primary/60 focus-visible:ring-3 focus-visible:ring-ring/25"
              />
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, 600))}
                rows={2}
                placeholder={t("deal.doc.notePlaceholder")}
                aria-label={t("deal.doc.notePlaceholder")}
                className="mt-2.5 w-full resize-none rounded-xl border border-input bg-background/50 px-4 py-3 text-sm outline-none transition-colors focus-visible:border-primary/60 focus-visible:ring-3 focus-visible:ring-ring/25"
              />
              <div className="mt-3 flex items-center gap-3">
                <button
                  type="button"
                  data-cursor="hover"
                  disabled={title.trim().length < 2 || request.isPending}
                  onClick={() => request.mutate()}
                  className="inline-flex min-h-10 items-center rounded-full bg-primary px-5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
                >
                  {request.isPending ? t("deal.q.sending") : t("deal.doc.send")}
                </button>
                <button
                  type="button"
                  data-cursor="hover"
                  onClick={() => setAsking(false)}
                  className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  {t("form.cancel")}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---- Open requests: the live obligations ---- */}
      {openRequests.length > 0 && (
        <div className="mt-5 space-y-3">
          {openRequests.map((r, i) => (
            <motion.div
              key={r.id}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: i * 0.05, ease: EASE }}
              className="rounded-2xl border border-bronze/35 bg-bronze/[0.04] p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <FileQuestion className="size-3.5 shrink-0 text-bronze" strokeWidth={1.9} />
                    <p className="text-sm font-medium text-foreground">{r.title}</p>
                    {/* Which way it points. Without this, a founder's own request and a
                        request made of them look identical in the same list. */}
                    <span className="rounded-full border border-border/70 px-2 py-0.5 text-[10px] text-muted-foreground">
                      {t(r.direction === "ToInvestor" ? "deal.doc.ofInvestor" : "deal.doc.ofFounder")}
                    </span>
                  </div>
                  {r.note && (
                    <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{r.note}</p>
                  )}
                  <p className="mt-1.5 text-[11px] text-muted-foreground/80">
                    {r.requestedByName} · {fmt.format(new Date(r.createdAtUtc))}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {r.canResolve && resolving !== r.id && (
                    <button
                      type="button"
                      data-cursor="hover"
                      onClick={() => {
                        setResolving(r.id);
                        setPickedDoc(null);
                        setDeclineReason("");
                      }}
                      className="inline-flex min-h-9 items-center rounded-full border border-border px-4 text-xs transition-colors hover:border-primary/50 hover:text-primary"
                    >
                      {t("deal.doc.resolve")}
                    </button>
                  )}
                  {r.canWithdraw && (
                    <button
                      type="button"
                      data-cursor="hover"
                      disabled={withdraw.isPending}
                      onClick={() => withdraw.mutate(r.id)}
                      aria-label={t("deal.doc.withdraw")}
                      className="grid size-9 place-items-center rounded-full text-muted-foreground transition-colors hover:text-destructive disabled:opacity-50"
                    >
                      <X className="size-3.5" strokeWidth={2.2} />
                    </button>
                  )}
                </div>
              </div>

              {/* Resolve: attach an existing document, or decline with a reason. */}
              <AnimatePresence>
                {resolving === r.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.35, ease: EASE }}
                    className="overflow-hidden"
                  >
                    <div className="mt-4 border-t border-bronze/25 pt-4">
                      {/* The two sides answer differently because they hold documents
                          differently: a founder links something from the data room, an
                          investor attaches a file that stays inside this conversation. */}
                      {viewerRole === "investor" ? (
                        <>
                          <p className="text-[11px] text-muted-foreground">
                            {t("deal.doc.attachYours")}
                          </p>

                          {r.hasResponseFile ? (
                            <p className="mt-2 inline-flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/[0.06] px-3 py-1.5 text-xs text-primary">
                              <Check className="size-3" strokeWidth={2.6} />
                              {r.responseFileName}
                            </p>
                          ) : (
                            <input
                              type="file"
                              disabled={upload.isPending}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) upload.mutate({ id: r.id, file });
                              }}
                              aria-label={t("deal.doc.attachYours")}
                              className="mt-2 block w-full text-xs text-muted-foreground file:me-3 file:rounded-full file:border file:border-border file:bg-transparent file:px-4 file:py-1.5 file:text-xs file:text-foreground"
                            />
                          )}

                          <textarea
                            value={responseNote}
                            onChange={(e) => setResponseNote(e.target.value.slice(0, 600))}
                            rows={2}
                            placeholder={t("deal.doc.responseNotePlaceholder")}
                            aria-label={t("deal.doc.responseNotePlaceholder")}
                            className="mt-2.5 w-full resize-none rounded-xl border border-input bg-background/50 px-4 py-2.5 text-xs outline-none transition-colors focus-visible:border-primary/60 focus-visible:ring-3 focus-visible:ring-ring/25"
                          />
                        </>
                      ) : (
                        <>
                          <p className="text-[11px] text-muted-foreground">
                            {t("deal.doc.pickDocument")}
                          </p>

                          {documents.length === 0 ? (
                            <p className="mt-2 text-xs italic text-muted-foreground/70">
                              {t("deal.doc.noneToAttach")}
                            </p>
                          ) : (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {documents.map((d) => (
                            <button
                              key={d.id}
                              type="button"
                              data-cursor="hover"
                              aria-pressed={pickedDoc === d.id}
                              onClick={() => setPickedDoc(pickedDoc === d.id ? null : d.id)}
                              className={cn(
                                "inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-xs transition-all duration-300",
                                pickedDoc === d.id
                                  ? "border-primary/60 bg-primary/[0.08] text-primary"
                                  : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                              )}
                            >
                              {pickedDoc === d.id && <Check className="size-3" strokeWidth={2.6} />}
                              {d.title}
                            </button>
                              ))}
                            </div>
                          )}
                        </>
                      )}

                      <input
                        value={declineReason}
                        onChange={(e) => setDeclineReason(e.target.value.slice(0, 500))}
                        placeholder={t("deal.doc.declinePlaceholder")}
                        aria-label={t("deal.doc.declinePlaceholder")}
                        className="mt-3 h-10 w-full rounded-xl border border-input bg-background/50 px-4 text-xs outline-none transition-colors focus-visible:border-primary/60 focus-visible:ring-3 focus-visible:ring-ring/25"
                      />

                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          data-cursor="hover"
                          disabled={
                            resolve.isPending ||
                            (viewerRole === "investor"
                              ? !r.hasResponseFile && responseNote.trim().length < 3
                              : pickedDoc == null)
                          }
                          onClick={() => resolve.mutate({ id: r.id, status: "Fulfilled" })}
                          className="inline-flex min-h-10 items-center gap-2 rounded-full bg-primary px-5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
                        >
                          <Check className="size-3.5" strokeWidth={2.4} />
                          {t("deal.doc.markFulfilled")}
                        </button>
                        <button
                          type="button"
                          data-cursor="hover"
                          disabled={declineReason.trim().length < 3 || resolve.isPending}
                          onClick={() => resolve.mutate({ id: r.id, status: "Declined" })}
                          className="inline-flex min-h-10 items-center rounded-full border border-destructive/40 px-5 text-xs text-destructive transition-colors hover:bg-destructive/[0.06] disabled:opacity-40"
                        >
                          {t("deal.doc.decline")}
                        </button>
                        <button
                          type="button"
                          data-cursor="hover"
                          onClick={() => setResolving(null)}
                          className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                        >
                          {t("form.cancel")}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      )}

      {/* ---- The room itself ---- */}
      <div className="mt-6">
        {documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("deal.doc.empty")}</p>
        ) : (
          <ul className="divide-y divide-border/50">
            {documents.map((d) => (
              <li key={d.id} className="flex items-center gap-3 py-3">
                <FileText className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.8} />
                <button
                  type="button"
                  data-cursor="hover"
                  onClick={() => download(d)}
                  className="min-w-0 flex-1 text-start"
                >
                  <p className="truncate text-sm text-foreground transition-colors hover:text-primary">
                    {d.title}
                  </p>
                  <p className="font-numeric mt-0.5 text-[11px] text-muted-foreground">
                    {sizeLabel(d.sizeBytes)}
                  </p>
                </button>

                {d.visibility === "Backers" && (
                  <span
                    title={t("deal.doc.backersOnly")}
                    className="inline-flex items-center gap-1 rounded-full border border-primary/25 px-2 py-0.5 text-[10px] text-primary/80"
                  >
                    <Lock className="size-2.5" strokeWidth={2.2} />
                    {t("deal.doc.backersOnly")}
                  </span>
                )}

                {/* Whether this investor opened it — shown only to the founder, as a
                    real engagement signal rather than a vanity metric. */}
                {d.openedByInvestor !== null && (
                  <span
                    title={d.openedByInvestor ? t("deal.doc.opened") : t("deal.doc.notOpened")}
                    className={cn(
                      "inline-flex items-center gap-1 text-[10px]",
                      d.openedByInvestor ? "text-primary" : "text-muted-foreground/60"
                    )}
                  >
                    <Eye className="size-3" strokeWidth={1.9} />
                    {d.openedByInvestor ? t("deal.doc.opened") : t("deal.doc.notOpened")}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ---- Settled requests, kept as record ---- */}
      {settled.length > 0 && (
        <details className="mt-5 group/settled">
          <summary
            data-cursor="hover"
            className="cursor-pointer list-none text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            {t("deal.doc.settled").replace("{n}", String(settled.length))}
          </summary>
          <ul className="mt-3 space-y-2">
            {settled.map((r) => (
              <li key={r.id} className="flex flex-wrap items-baseline gap-x-2 text-xs">
                <span
                  className={cn(
                    r.status === "Fulfilled"
                      ? "text-primary"
                      : r.status === "Declined"
                        ? "text-destructive/80"
                        : "text-muted-foreground"
                  )}
                >
                  {t(`deal.doc.status.${r.status}`)}
                </span>
                <span className="text-foreground/80">{r.title}</span>
                {r.declinedReason && (
                  <span className="text-muted-foreground">— {r.declinedReason}</span>
                )}
                {r.fulfilledByDocumentTitle && (
                  <span className="text-muted-foreground">→ {r.fulfilledByDocumentTitle}</span>
                )}
                {r.hasResponseFile && (
                  <button
                    type="button"
                    data-cursor="hover"
                    onClick={() => openResponse(r)}
                    className="link-underline inline-flex items-center gap-1 text-primary"
                  >
                    <FileText className="size-3" strokeWidth={1.9} />
                    {r.responseFileName}
                    {r.responseSizeBytes != null && (
                      <span className="font-numeric text-muted-foreground/70">
                        {sizeLabel(r.responseSizeBytes)}
                      </span>
                    )}
                  </button>
                )}
                {r.responseNote && (
                  <span className="w-full text-muted-foreground/85">{r.responseNote}</span>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}

    </section>
  );
}
