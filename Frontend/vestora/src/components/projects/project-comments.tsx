"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CornerDownRight, Trash2 } from "lucide-react";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { toast } from "sonner";
import { projectsApi } from "@/lib/api/projects";
import { useAuthStore } from "@/lib/auth/store";
import { useLocale } from "@/lib/i18n/locale";
import type { Comment } from "@/lib/types/api";

function useInvalidateProject(projectId: number) {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["project", projectId] });
}

function CommentForm({
  placeholder,
  submitLabel,
  onSubmit,
  pending,
  onCancel,
  autoFocus,
}: {
  placeholder: string;
  submitLabel: string;
  onSubmit: (content: string) => void;
  pending: boolean;
  onCancel?: () => void;
  autoFocus?: boolean;
}) {
  const { t } = useLocale();
  const [content, setContent] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setContent("");
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder}
        rows={3}
        autoFocus={autoFocus}
        className="w-full resize-none rounded-xl border border-input bg-card/60 px-4 py-3 text-sm outline-none backdrop-blur-sm transition-colors placeholder:text-muted-foreground/70 focus-visible:border-primary/60 focus-visible:ring-3 focus-visible:ring-ring/25"
      />
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending || !content.trim()}
          data-cursor="hover"
          className="gold-cta rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:pointer-events-none disabled:opacity-50"
        >
          {pending ? t("proj.detail.comment.posting") : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            data-cursor="hover"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {t("proj.detail.cancel")}
          </button>
        )}
      </div>
    </form>
  );
}

function CommentItem({ comment, projectId }: { comment: Comment; projectId: number }) {
  const { t, locale } = useLocale();
  const user = useAuthStore((s) => s.user);
  const invalidate = useInvalidateProject(projectId);
  const [replying, setReplying] = useState(false);

  const dateFmt = new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en", {
    dateStyle: "medium",
  });

  const replyMutation = useMutation({
    mutationFn: (content: string) => projectsApi.addReply(comment.id, content),
    onSuccess: () => {
      setReplying(false);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteComment = useMutation({
    mutationFn: () => projectsApi.deleteComment(comment.id),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteReply = useMutation({
    mutationFn: (replyId: number) => projectsApi.deleteReply(replyId),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <article className="py-6">
      <header className="flex items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <Link
            href={`/u/${comment.userId}`}
            data-cursor="hover"
            className="text-sm font-semibold transition-colors hover:text-primary"
          >
            {comment.userName}
          </Link>
          <time className="font-numeric text-xs text-muted-foreground">
            {dateFmt.format(new Date(comment.createdDate))}
          </time>
        </div>
        {/* Asks first. A single click on this icon used to delete the comment
            outright, with no undo anywhere in the product. */}
        {user?.id === comment.userId && (
          <ConfirmAction
            label={t("proj.detail.delete")}
            pending={deleteComment.isPending}
            onConfirm={() => deleteComment.mutate()}
          >
            <Trash2 className="size-3.5" />
          </ConfirmAction>
        )}
      </header>

      <p className="mt-2 text-[15px] leading-relaxed text-foreground/90">
        {comment.content}
      </p>

      {user && (
        <button
          type="button"
          onClick={() => setReplying((r) => !r)}
          data-cursor="hover"
          className="mt-3 inline-flex items-center gap-1.5 text-xs text-primary transition-opacity hover:opacity-80"
        >
          <CornerDownRight className={`size-3.5 ${locale === "ar" ? "-scale-x-100" : ""}`} />
          {t("proj.detail.reply")}
        </button>
      )}

      {/* Replies — indented behind a gold hairline. */}
      {(comment.replies.length > 0 || replying) && (
        <div className="mt-4 space-y-4 border-s border-primary/25 ps-5 ms-1.5">
          {comment.replies.map((reply) => (
            <div key={reply.id}>
              <header className="flex items-baseline justify-between gap-3">
                <div className="flex items-baseline gap-3">
                  <Link
                    href={`/u/${reply.userId}`}
                    data-cursor="hover"
                    className="text-sm font-semibold transition-colors hover:text-primary"
                  >
                    {reply.userName}
                  </Link>
                  <time className="font-numeric text-xs text-muted-foreground">
                    {dateFmt.format(new Date(reply.createdDate))}
                  </time>
                </div>
                {user?.id === reply.userId && (
                  <ConfirmAction
                    label={t("proj.detail.delete")}
                    pending={deleteReply.isPending && deleteReply.variables === reply.id}
                    onConfirm={() => deleteReply.mutate(reply.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </ConfirmAction>
                )}
              </header>
              <p className="mt-1.5 text-sm leading-relaxed text-foreground/90">
                {reply.content}
              </p>
            </div>
          ))}

          {replying && (
            <CommentForm
              placeholder={t("proj.detail.reply.placeholder")}
              submitLabel={t("proj.detail.reply")}
              onSubmit={(content) => replyMutation.mutate(content)}
              pending={replyMutation.isPending}
              onCancel={() => setReplying(false)}
              autoFocus
            />
          )}
        </div>
      )}
    </article>
  );
}

/** Editorial discussion thread — flat comments split by gold hairlines. */
export function ProjectComments({
  projectId,
  comments,
}: {
  projectId: number;
  comments: Comment[];
}) {
  const { t, locale } = useLocale();
  const user = useAuthStore((s) => s.user);
  const invalidate = useInvalidateProject(projectId);

  const addMutation = useMutation({
    mutationFn: (content: string) => projectsApi.addComment(projectId, content),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <section>
      <div className="flex items-baseline gap-4">
        <h2 className={`text-xs text-primary ${locale === "ar" ? "" : "uppercase tracking-[0.35em]"}`}>
          {t("proj.detail.discussion")}
        </h2>
        <span className="font-numeric text-xs text-muted-foreground">{comments.length}</span>
      </div>

      <div className="mt-6">
        {user ? (
          <CommentForm
            placeholder={t("proj.detail.comment.placeholder")}
            submitLabel={t("proj.detail.comment.submit")}
            onSubmit={(content) => addMutation.mutate(content)}
            pending={addMutation.isPending}
          />
        ) : (
          <Link
            href="/login"
            data-cursor="hover"
            className="inline-block rounded-xl border border-border bg-card/60 px-5 py-3.5 text-sm text-muted-foreground backdrop-blur-sm transition-colors hover:border-primary/40 hover:text-foreground"
          >
            {t("proj.detail.comment.login")}
          </Link>
        )}
      </div>

      <div className="mt-4 divide-y divide-border">
        {comments.length === 0 ? (
          <p className="py-8 text-sm text-muted-foreground">
            {t("proj.detail.comments.empty")}
          </p>
        ) : (
          comments.map((c) => <CommentItem key={c.id} comment={c} projectId={projectId} />)
        )}
      </div>
    </section>
  );
}
