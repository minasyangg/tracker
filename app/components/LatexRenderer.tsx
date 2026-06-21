"use client";

import katex from "katex";
import "katex/dist/katex.min.css";

// Macros matching the Shkolkovo LaTeX preamble
const MACROS: Record<string, string> = {
  "\\q": "\\quad",
  "\\R": "\\mathbb{R}",
  "\\N": "\\mathbb{N}",
  "\\Z": "\\mathbb{Z}",
  "\\C": "\\mathbb{C}",
  "\\Q": "\\mathbb{Q}",
  "\\F": "\\mathbb{F}",
  "\\prl": "\\parallel",
  "\\eps": "\\varepsilon",
  "\\tri": "\\bigtriangleup",
  "\\a": "\\angle",
  "\\dev": "\\vdots",
  "\\geq": "\\geqslant",
  "\\leq": "\\leqslant",
  "\\Rarr": "\\;\\Rightarrow\\;",
  "\\Lrarr": "\\;\\Leftrightarrow\\;",
  "\\ra": "\\;\\longrightarrow\\;",
  "\\Ra": "\\;\\Longrightarrow\\;",
  "\\lra": "\\;\\Longleftrightarrow\\;",
  "\\Lra": "\\;\\Longleftrightarrow\\;",
  "\\Mod": "\\pmod",
};

function renderMath(math: string, display: boolean): string {
  // Replace sqcases (custom env) with cases for KaTeX
  const fixed = math
    .replace(/\\begin\{sqcases\}/g, "\\begin{cases}")
    .replace(/\\end\{sqcases\}/g, "\\end{cases}");
  try {
    return katex.renderToString(fixed, {
      displayMode: display,
      throwOnError: false,
      macros: MACROS,
      trust: true,
    });
  } catch {
    return `<span class="text-red-400 text-xs">${math}</span>`;
  }
}

// ── Tabular → HTML table ──────────────────────────────────────────────────────

function parseTabular(spec: string, body: string): string {
  // Extract column alignments from spec like {|l|c|c|c|}
  const aligns = [...spec.matchAll(/[lcr]/g)].map(m =>
    m[0] === "c" ? "center" : m[0] === "r" ? "right" : "left"
  );

  // Clean body: remove hline/cline/comments, split rows by \\
  const rawRows = body
    .replace(/%[^\n]*/g, "")           // comments
    .replace(/\\cline\{[^}]*\}/g, "")  // \cline
    .split("\\\\");

  const rows: string[][] = [];
  for (const raw of rawRows) {
    const clean = raw.replace(/\\hline/g, "").trim();
    if (!clean) continue;
    rows.push(clean.split("&").map(c => c.trim()));
  }

  if (!rows.length) return "";

  const thead = rows[0];
  const tbody = rows.slice(1);

  const renderCell = (content: string, tag: string, idx: number) => {
    const align = aligns[idx] || "left";
    const html = processInlineMath(content);
    return `<${tag} class="border border-gray-400 px-3 py-1.5 text-${align}">${html}</${tag}>`;
  };

  let table = '<div class="overflow-x-auto my-3 flex justify-center"><table class="border-collapse text-sm">';
  table += `<thead><tr>${thead.map((c, i) => renderCell(c, "th", i)).join("")}</tr></thead>`;
  if (tbody.length) {
    table += `<tbody>${tbody.map(row =>
      `<tr>${row.map((c, i) => renderCell(c, "td", i)).join("")}</tr>`
    ).join("")}</tbody>`;
  }
  table += "</table></div>";
  return table;
}

// ── Inline math $...$ ─────────────────────────────────────────────────────────

function processInlineMath(text: string): string {
  return text.replace(/\$([^$\n]{1,400}?)\$/g, (_, math) =>
    renderMath(math.trim(), false)
  );
}

// ── Main renderer ─────────────────────────────────────────────────────────────

export function latexToHtml(source: string, geoImages?: Record<string, string>): string {
  if (!source) return "";
  let s = source;

  // ── 1. Russian typography ligatures ────────────────────────────────────────
  s = s.replace(/"---/g, "—").replace(/"--/g, "—").replace(/<<|>>/g, m => m === "<<" ? "«" : "»");

  // ── 2. Drawing environments ───────────────────────────────────────────────
  const DRAW_PLACEHOLDER = '<span class="inline-block my-1 px-2 py-0.5 text-xs text-gray-400 border border-dashed border-gray-200 rounded">[рисунок]</span>';

  const imgTag = (fname: string) => {
    const local = geoImages?.[fname.trim()];
    if (local) return `<img src="/shkolkovo_images/${local}" alt="${fname}" class="max-w-full my-3 rounded" style="max-height:320px" />`;
    return DRAW_PLACEHOLDER;
  };

  s = s.replace(/\\begin\{tikzpicture\}[\s\S]*?\\end\{tikzpicture\}/g, DRAW_PLACEHOLDER);
  s = s.replace(/\\begin\{picture\}[\s\S]*?\\end\{picture\}/g, DRAW_PLACEHOLDER);
  s = s.replace(/\\begin\{(?:figure|wrapfigure)\*?(?:\[[^\]]*\])?\}[\s\S]*?\\end\{(?:figure|wrapfigure)\*?\}/g, DRAW_PLACEHOLDER);
  // \pict{opts}{size}{filename} → real image if available
  s = s.replace(/\\pict(?:\[[^\]]*\])?\{[^}]*\}\{[^}]*\}\{([^}]+)\}(?:\{[^}]*\})?/g,
    (_, fname) => imgTag(fname));
  // \includegraphics[opts]{filename} → real image if available
  s = s.replace(/\\includegraphics(?:\[[^\]]*\])?\{([^}]+)\}/g,
    (_, fname) => imgTag(fname));

  // ── 3. Tabular → HTML table ───────────────────────────────────────────────
  s = s.replace(/\\begin\{tabular\}\{([^}]*)\}([\s\S]*?)\\end\{tabular\}/g,
    (_, spec, body) => parseTabular(spec, body)
  );

  // ── 4. Display math environments ─────────────────────────────────────────
  const display = (math: string) =>
    `<div class="my-2 text-center overflow-x-auto">${renderMath(math.trim(), true)}</div>`;

  s = s.replace(/\$\$([\s\S]+?)\$\$/g, (_, m) => display(m));
  s = s.replace(/\\\[([\s\S]+?)\\]/g, (_, m) => display(m));
  s = s.replace(/\\begin\{displaymath\}([\s\S]*?)\\end\{displaymath\}/g, (_, m) => display(m));
  s = s.replace(
    /\\begin\{(equation|align|gather|aligned|gathered|multline)\*?\}([\s\S]*?)\\end\{(?:equation|align|gather|aligned|gathered|multline)\*?\}/g,
    (_, _env, m) => display(m)
  );

  // ── 5. Text environments ──────────────────────────────────────────────────
  s = s.replace(/\\begin\{center\}([\s\S]*?)\\end\{center\}/g,
    (_, body) => `<div class="text-center my-1">${processLatexText(body)}</div>`
  );
  s = s.replace(/\\begin\{enumerate\}([\s\S]*?)\\end\{enumerate\}/g, (_, body) => {
    const items = body.split("\\item").filter(Boolean).map((item: string) =>
      `<li>${processLatexText(item.trim())}</li>`
    );
    return `<ol class="list-decimal ml-6 space-y-1 my-2">${items.join("")}</ol>`;
  });
  s = s.replace(/\\begin\{itemize\}([\s\S]*?)\\end\{itemize\}/g, (_, body) => {
    const items = body.split("\\item").filter(Boolean).map((item: string) =>
      `<li>${processLatexText(item.trim())}</li>`
    );
    return `<ul class="list-disc ml-6 space-y-1 my-2">${items.join("")}</ul>`;
  });

  // ── 6. Text formatting ────────────────────────────────────────────────────
  s = s
    .replace(/\\textbf\{([^}]*)\}/g, "<strong>$1</strong>")
    .replace(/\\textit\{([^}]*)\}/g, "<em>$1</em>")
    .replace(/\\emph\{([^}]*)\}/g, "<em>$1</em>")
    .replace(/\\underline\{([^}]*)\}/g, '<span class="underline">$1</span>')
    .replace(/\\text\{([^}]*)\}/g, "$1");

  // Labx spans (solution labels like "Первое решение.")
  s = s.replace(/\\begin\{(?:labx-\w+|span)[^}]*\}([\s\S]*?)\\end\{[^}]*\}/g, "<strong>$1</strong>");

  // ── 7. Strip remaining LaTeX commands that don't translate ────────────────
  s = s
    .replace(/\\(?:vspace|vs|vsp|minvsp|hspace|vs)\{[^}]*\}/g, " ")
    .replace(/\\(?:noindent|indent|par\b|newline|pagebreak|clearpage|medskip|bigskip|smallskip|quad|qquad)\b/g, " ")
    .replace(/\\(?:begin|end)\{(?:flushleft|flushright)\}/g, "")
    .replace(/\\(?:exam|rem|pr|proof|con|des|fact|firstsol|secondsol)\b/g, "")
    .replace(/\\(?:ans|sol)\b/g, "")
    .replace(/\\(?:Nod|Nok)\b/g, m => m === "\\Nod" ? "НОД" : "НОК")
    .replace(/\\mbg\b/g, ">")
    .replace(/\\mbl\b/g, "<")
    .replace(/\\[{}]/g, "")
    .replace(/[{}]/g, "");

  // ── 8. Inline math ────────────────────────────────────────────────────────
  s = processInlineMath(s);

  // ── 9. Build paragraphs ───────────────────────────────────────────────────
  const paras = s.split(/\n{2,}/).map(p => {
    const clean = p.trim();
    if (!clean) return "";
    if (/^<(div|ol|ul|table)/.test(clean)) return clean;
    return `<p class="leading-relaxed">${clean.replace(/\n/g, " ")}</p>`;
  }).filter(Boolean);

  return paras.join("\n");
}

// Process a sub-block that may have display math and text
function processLatexText(text: string): string {
  let s = text;
  s = s.replace(/\$\$([\s\S]+?)\$\$/g, (_, m) =>
    `<div class="my-1 text-center overflow-x-auto">${renderMath(m.trim(), true)}</div>`
  );
  s = s.replace(/\\\[([\s\S]+?)\\]/g, (_, m) =>
    `<div class="my-1 text-center overflow-x-auto">${renderMath(m.trim(), true)}</div>`
  );
  s = processInlineMath(s);
  return s.trim();
}

interface Props {
  source: string;
  geoImages?: Record<string, string>;
  className?: string;
}

export default function LatexRenderer({ source, geoImages, className = "" }: Props) {
  const html = latexToHtml(source, geoImages);
  return (
    <div
      className={`text-sm text-gray-800 leading-relaxed ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
