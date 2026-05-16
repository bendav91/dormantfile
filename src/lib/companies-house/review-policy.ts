/**
 * Policy for Companies House error 8023 "EF documents not found".
 *
 * 8023 (raised by GetSubmissionStatus) is overwhelmingly a poll-too-soon
 * timing lag — the submission was received but CH hasn't produced the result
 * documents yet — and typically clears within an hour or two. It must NOT be
 * treated as a rejection of the accounts.
 *
 * However, a persistent 8023 can also indicate a genuinely lost or mismatched
 * submission (CH's own guidance is to contact them if it does not resolve in a
 * couple of hours). So we keep polling silently within a grace window, and
 * only once it has persisted beyond the window do we flag the filing for human
 * review instead of retrying indefinitely and never telling the user.
 */
export const CH_DOCS_NOT_FOUND_GRACE_MS = 48 * 60 * 60 * 1000;

/**
 * Whether an 8023 "documents not found" has persisted long enough that the
 * filing should be flagged for review rather than silently retried.
 *
 * @param submittedAt when the filing was submitted to CH (null ⇒ unknown age,
 *   so we cannot judge it stale — keep polling rather than false-flag).
 * @param now current time in epoch ms.
 * @param graceMs how long to tolerate a "documents not found" before flagging.
 */
export function shouldFlagDocumentsNotFound(
  submittedAt: Date | null,
  now: number,
  graceMs: number = CH_DOCS_NOT_FOUND_GRACE_MS,
): boolean {
  if (submittedAt == null) return false;
  return now - submittedAt.getTime() >= graceMs;
}
