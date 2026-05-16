-- One-off: CT600 is now fully manual. Remove system-generated, unconfirmed
-- CT600 rows. Submitted/accepted/rejected/failed/filed_elsewhere (real filing
-- history) and ctapUserEdited=true (user edits) are intentionally preserved.
DELETE FROM "Filing"
WHERE "filingType" = 'ct600'
  AND "status" = 'outstanding'
  AND "ctapUserEdited" = false;
