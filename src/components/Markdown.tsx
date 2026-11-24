// Tiny Markdown renderer for PROJECT_NOTE.md (headings, paragraphs, lists,
// fenced code, bold, inline code, links). Renders React nodes — no innerHTML.
import type { ReactNode } from "react";

function inline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    const key = `${keyBase}-${i++}`;
    if (tok.startsWith("**")) out.push(<strong key={key}>{tok.slice(2, -2)}</strong>);
    else if (tok.startsWith("*")) out.push(<em key={key}>{tok.slice(1, -1)}</em>);
    else if (tok.startsWith("`")) out.push(<code key={key} className="rounded-[6px] bg-alu px-1 py-0.5 font-mono text-[0.85em]">{tok.slice(1, -1)}</code>);
    else {
      const lm = tok.match(/^\[([^\]]+)\]\(([^)]+)\)$/)!;
      const safe = /^(https?:|#|\/)/.test(lm[2]) ? lm[2] : "#";
      out.push(
        <a key={key} href={safe} target={safe.startsWith("http") ? "_blank" : undefined} rel="noreferrer noopener" className="underline decoration-amber decoration-2 underline-offset-4">
          {lm[1]}
        </a>,
      );
    }
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ source }: { source: string }) {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  let k = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    if (line.startsWith("```")) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) code.push(lines[i++]);
      i++;
      blocks.push(
        <pre key={k++} className="overflow-x-auto rounded-[8px] bg-alu p-3 font-mono text-[13px] leading-relaxed">
          <code>{code.join("\n")}</code>
        </pre>,
      );
      continue;
    }
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      const cls = level === 1 ? "text-[30px] font-medium tracking-tight" : level === 2 ? "mt-4 text-[22px] font-semibold tracking-tight" : "mt-2 text-[17px] font-semibold";
      const content = inline(h[2], `h${k}`);
      blocks.push(level === 1 ? <h2 key={k++} className={cls}>{content}</h2> : level === 2 ? <h3 key={k++} className={cls}>{content}</h3> : <h4 key={k++} className={cls}>{content}</h4>);
      i++;
      continue;
    }
    if (/^\s*([-*]|\d+\.)\s+/.test(line)) {
      const ordered = /^\s*\d+\./.test(line);
      const items: string[] = [];
      while (i < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[i])) {
        let item = lines[i].replace(/^\s*([-*]|\d+\.)\s+/, "");
        i++;
        while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !/^\s*([-*]|\d+\.)\s+/.test(lines[i])) item += " " + lines[i++].trim();
        items.push(item);
      }
      const Tag = ordered ? "ol" : "ul";
      blocks.push(
        <Tag key={k++} className={`${ordered ? "list-decimal" : "list-disc"} flex flex-col gap-1 pl-5`}>
          {items.map((it, j) => (
            <li key={j}>{inline(it, `l${k}-${j}`)}</li>
          ))}
        </Tag>,
      );
      continue;
    }
    if (line.startsWith(">")) {
      const quote: string[] = [];
      while (i < lines.length && lines[i].startsWith(">")) quote.push(lines[i++].replace(/^>\s?/, ""));
      blocks.push(
        <blockquote key={k++} className="rounded-[8px] border-l-4 border-go bg-panel px-3 py-2">
          {inline(quote.join(" "), `q${k}`)}
        </blockquote>,
      );
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,4}\s|```|>|\s*([-*]|\d+\.)\s+)/.test(lines[i])) para.push(lines[i++].trim());
    blocks.push(<p key={k++}>{inline(para.join(" "), `p${k}`)}</p>);
  }
  return <div className="flex flex-col gap-3 text-[15.5px] leading-relaxed">{blocks}</div>;
}
