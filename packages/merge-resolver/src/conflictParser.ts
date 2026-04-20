export type Chunk =
  | { kind: "common"; text: string }
  | {
      kind: "conflict";
      id: number;
      yours: string;
      base: string | null;
      theirs: string;
      yoursLabel: string;
      theirsLabel: string;
    };

const START = /^<{7} (.*)$/;
const BASE = /^\|{7}.*$/;
const SEP = /^={7}$/;
const END = /^>{7} (.*)$/;

export function parse(content: string): Chunk[] {
  const lines = content.split("\n");
  const chunks: Chunk[] = [];
  let buf: string[] = [];
  let i = 0;
  let id = 0;

  const flush = () => {
    if (buf.length) {
      chunks.push({ kind: "common", text: buf.join("\n") });
      buf = [];
    }
  };

  while (i < lines.length) {
    const startMatch = lines[i].match(START);
    if (!startMatch) {
      buf.push(lines[i]);
      i++;
      continue;
    }
    flush();

    const yoursLabel = startMatch[1];
    const yours: string[] = [];
    const base: string[] = [];
    const theirs: string[] = [];
    let hasBase = false;
    let theirsLabel = "";
    i++;

    while (i < lines.length && !lines[i].match(BASE) && !lines[i].match(SEP)) {
      yours.push(lines[i]);
      i++;
    }
    if (i < lines.length && lines[i].match(BASE)) {
      hasBase = true;
      i++;
      while (i < lines.length && !lines[i].match(SEP)) {
        base.push(lines[i]);
        i++;
      }
    }
    if (i < lines.length && lines[i].match(SEP)) i++;
    while (i < lines.length) {
      const endMatch = lines[i].match(END);
      if (endMatch) {
        theirsLabel = endMatch[1];
        i++;
        break;
      }
      theirs.push(lines[i]);
      i++;
    }

    chunks.push({
      kind: "conflict",
      id: id++,
      yours: yours.join("\n"),
      base: hasBase ? base.join("\n") : null,
      theirs: theirs.join("\n"),
      yoursLabel,
      theirsLabel,
    });
  }

  flush();
  return chunks;
}

export function hasConflicts(content: string): boolean {
  return /^<{7} /m.test(content);
}

export type Resolution =
  | { kind: "yours" }
  | { kind: "theirs" }
  | { kind: "both"; order: "yt" | "ty" }
  | { kind: "base" }
  | { kind: "custom"; text: string };

export function render(chunks: Chunk[], resolutions: Map<number, Resolution>): string {
  return chunks
    .map((c) => {
      if (c.kind === "common") return c.text;
      const r = resolutions.get(c.id);
      if (!r) {
        const baseMid = c.base !== null ? `\n||||||| base\n${c.base}` : "";
        return `<<<<<<< ${c.yoursLabel}\n${c.yours}${baseMid}\n=======\n${c.theirs}\n>>>>>>> ${c.theirsLabel}`;
      }
      switch (r.kind) {
        case "yours": return c.yours;
        case "theirs": return c.theirs;
        case "base": return c.base ?? "";
        case "both": return r.order === "yt" ? `${c.yours}\n${c.theirs}` : `${c.theirs}\n${c.yours}`;
        case "custom": return r.text;
      }
    })
    .join("\n");
}
