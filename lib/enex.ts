// Evernote .enex parser — runs entirely in the browser (DOMParser).
// An .enex file is XML: <en-export><note>…</note>…</en-export>
// Each note: <title>, <content> (ENML in CDATA), <created>, <tag>*,
// and <note-attributes><source-url>.

export interface ParsedNote {
  title: string;
  body: string; // markdown
  sourceUrl: string | null;
  tags: string[];
  createdAt: string; // ISO
}

// Evernote timestamps look like "20240115T093000Z".
function parseEvernoteDate(s: string | null): string {
  if (!s) return new Date().toISOString();
  const m = s.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
  if (!m) return new Date().toISOString();
  return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z`;
}

// ─── ENML → markdown ─────────────────────────────────────────────────────────

function childrenToMd(node: Node): string {
  let out = "";
  node.childNodes.forEach((child) => { out += nodeToMd(child); });
  return out;
}

function nodeToMd(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return (node.textContent ?? "").replace(/\s+/g, " ");
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return "";

  const el = node as Element;
  const tag = el.tagName.toLowerCase();
  const inner = () => childrenToMd(el).trim();

  switch (tag) {
    case "en-note":
      return childrenToMd(el);
    case "div":
    case "p":
      return childrenToMd(el).trim() + "\n";
    case "br":
      return "\n";
    case "h1": return `\n# ${inner()}\n`;
    case "h2": return `\n## ${inner()}\n`;
    case "h3": return `\n### ${inner()}\n`;
    case "h4": case "h5": case "h6": return `\n#### ${inner()}\n`;
    case "b": case "strong": {
      const t = inner();
      return t ? `**${t}**` : "";
    }
    case "i": case "em": {
      const t = inner();
      return t ? `*${t}*` : "";
    }
    case "code": return `\`${inner()}\``;
    case "pre": return `\n\`\`\`\n${el.textContent ?? ""}\n\`\`\`\n`;
    case "blockquote": return `\n> ${inner()}\n`;
    case "hr": return "\n---\n";
    case "a": {
      const href = el.getAttribute("href");
      const text = inner() || href || "";
      return href ? `[${text}](${href})` : text;
    }
    case "ul":
    case "ol": {
      let out = "\n";
      let i = 1;
      el.childNodes.forEach((li) => {
        if (li.nodeType === Node.ELEMENT_NODE && (li as Element).tagName.toLowerCase() === "li") {
          const bullet = tag === "ol" ? `${i++}.` : "-";
          out += `${bullet} ${childrenToMd(li).trim()}\n`;
        }
      });
      return out;
    }
    case "en-todo": {
      const checked = el.getAttribute("checked") === "true";
      return checked ? "[x] " : "[ ] ";
    }
    case "en-media":
      return "[attachment]";
    case "table": {
      let out = "\n";
      el.querySelectorAll("tr").forEach((tr) => {
        const cells: string[] = [];
        tr.querySelectorAll("td, th").forEach((td) => cells.push(childrenToMd(td).trim()));
        out += "| " + cells.join(" | ") + " |\n";
      });
      return out;
    }
    default:
      return childrenToMd(el);
  }
}

function enmlToMarkdown(enml: string): string {
  const doc = new DOMParser().parseFromString(enml, "text/html");
  const root = doc.querySelector("en-note") ?? doc.body;
  return nodeToMd(root)
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ─── main entry ──────────────────────────────────────────────────────────────

export function parseEnex(xml: string): ParsedNote[] {
  const doc = new DOMParser().parseFromString(xml, "text/xml");
  if (doc.querySelector("parsererror")) {
    throw new Error("Could not parse file — is it a valid .enex export?");
  }

  const notes: ParsedNote[] = [];
  doc.querySelectorAll("note").forEach((note) => {
    const title = note.querySelector("title")?.textContent?.trim() || "Untitled";
    const content = note.querySelector("content")?.textContent ?? "";
    const created = parseEvernoteDate(note.querySelector("created")?.textContent ?? null);
    const sourceUrl = note.querySelector("note-attributes > source-url")?.textContent?.trim() || null;
    const tags: string[] = [];
    note.querySelectorAll(":scope > tag").forEach((t) => {
      const v = t.textContent?.trim();
      if (v) tags.push(v);
    });

    notes.push({
      title,
      body: content ? enmlToMarkdown(content) : "",
      sourceUrl,
      tags,
      createdAt: created,
    });
  });

  return notes;
}
