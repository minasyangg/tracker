import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

export const dynamic = "force-dynamic";

// Replace relative LaTeX image URLs in text_html with local /shkolkovo_images/ paths.
// Local files are named {problem_id}_{original_filename}.svg
function fixImageUrls(html: string, problemId: string): string {
  return html.replace(
    /src="\/api\/latex-service\/v1\/GetSession\/\d+\/(index-[a-f0-9]+\.svg)"/g,
    `src="/shkolkovo_images/${problemId}_$1"`
  );
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const topic = searchParams.get("topic") || "";
  const subtopic = searchParams.get("subtopic") || "";
  const q = (searchParams.get("q") || "").toLowerCase();
  const page = parseInt(searchParams.get("page") || "1", 10);
  const perPage = 20;

  const libraryPath = join(process.cwd(), "public", "shkolkovo_library.json");
  const fallbackPath = join(process.cwd(), "..", "data", "shkolkovo_problems.json");

  const filePath = existsSync(libraryPath) ? libraryPath : fallbackPath;

  if (!existsSync(filePath)) {
    return NextResponse.json({ error: "Library not yet scraped", problems: [], total: 0 }, { status: 200 });
  }

  let all: Array<Record<string, unknown>>;
  try {
    all = JSON.parse(readFileSync(filePath, "utf-8"));
  } catch {
    return NextResponse.json({ error: "Failed to parse library", problems: [], total: 0 }, { status: 200 });
  }

  // Filter
  const filtered = all.filter((p) => {
    if (topic && p.topic !== topic) return false;
    if (subtopic && p.subtopic !== subtopic) return false;
    if (q) {
      const text = ((p.text_plain as string) || (p.title as string) || "").toLowerCase();
      if (!text.includes(q)) return false;
    }
    return true;
  });

  const total = filtered.length;

  // Fix image URLs only for the returned page slice
  const problems = filtered.slice((page - 1) * perPage, page * perPage).map((p) => {
    if (!p.text_html) return p;
    return {
      ...p,
      text_html: fixImageUrls(p.text_html as string, String(p.id || "")),
    };
  });

  // Unique topics/subtopics for filters
  const topicMap: Record<string, Set<string>> = {};
  for (const p of all) {
    const t = (p.topic as string) || "Прочее";
    const s = (p.subtopic as string) || "";
    if (!topicMap[t]) topicMap[t] = new Set();
    if (s) topicMap[t].add(s);
  }
  const topics = Object.entries(topicMap)
    .map(([t, subs]) => ({ topic: t, subtopics: [...subs].sort(), count: all.filter(p => p.topic === t).length }))
    .sort((a, b) => b.count - a.count);

  return NextResponse.json({ problems, total, page, perPage, topics });
}
