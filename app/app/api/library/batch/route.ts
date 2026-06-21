import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const ids = (searchParams.get("ids") || "").split(",").map((s) => s.trim()).filter(Boolean);

  if (!ids.length) return NextResponse.json({ problems: [] });

  const libraryPath = join(process.cwd(), "public", "shkolkovo_library.json");
  if (!existsSync(libraryPath)) return NextResponse.json({ problems: [] });

  const all: Array<Record<string, unknown>> = JSON.parse(readFileSync(libraryPath, "utf-8"));
  const idSet = new Set(ids);
  const problems = all.filter((p) => idSet.has(String(p.id)));

  return NextResponse.json({ problems });
}
