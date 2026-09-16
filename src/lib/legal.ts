/**
 * Current versions of the documents a trainer must accept.
 *
 * Bumping a version forces every trainer back through /accept-terms on their
 * next page load — that is how a material change gets re-accepted rather
 * than silently applied. The "-draft" suffix is honest: these are unreviewed
 * drafts, and signups stay closed until reviewed versions replace them.
 */
export const LEGAL_VERSIONS = {
  terms: "2026-09-16-draft",
  privacy: "2026-09-16-draft",
  dpa: "2026-09-16-draft",
} as const;

export const LEGAL_DOCS = {
  terms: { file: "TERMS_OF_SERVICE.md", title: "Terms of Service" },
  privacy: { file: "PRIVACY_POLICY.md", title: "Privacy Policy" },
  dpa: { file: "DPA.md", title: "Data Processing Addendum" },
} as const;

export type LegalDoc = keyof typeof LEGAL_DOCS;
