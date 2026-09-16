import { readFile } from "fs/promises";
import path from "path";
import { notFound } from "next/navigation";
import { marked } from "marked";
import { LEGAL_DOCS, LEGAL_VERSIONS, type LegalDoc } from "@/lib/legal";

/**
 * Public legal documents, rendered from docs/legal/*.md so the text a trainer
 * accepts is the text in the repository — one source, versioned with the code.
 *
 * dangerouslySetInnerHTML is acceptable here only because the markdown is
 * repository content, never user input. Don't reuse this for anything a user
 * can write.
 */
export default async function LegalDocPage({ params }: { params: Promise<{ doc: string }> }) {
  const { doc } = await params;
  // hasOwn, not `in`: `"constructor" in LEGAL_DOCS` is true.
  if (!Object.hasOwn(LEGAL_DOCS, doc)) notFound();
  const key = doc as LegalDoc;
  const { file } = LEGAL_DOCS[key];

  const markdown = await readFile(path.join(process.cwd(), "docs", "legal", file), "utf8");
  const html = await marked.parse(markdown);

  return (
    <div className="max-w-3xl mx-auto">
      <p className="text-xs text-steel mb-3">Version {LEGAL_VERSIONS[key]}</p>
      <article className="legal card" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
