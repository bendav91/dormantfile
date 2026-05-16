/** Single source of truth: CT600 filing statuses a user may delete (unfiled / abortable). */
export const REMOVABLE_CT600_STATUSES = new Set<string>(["outstanding", "failed", "rejected"]);
