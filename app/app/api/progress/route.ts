import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { problem_id, ...updates } = body;

  if (!problem_id) {
    return NextResponse.json({ error: "problem_id required" }, { status: 400 });
  }

  const allowed = ["status", "score", "attempts", "time_spent_minutes", "notes", "last_attempted_at"];
  const filtered = Object.fromEntries(
    Object.entries(updates).filter(([k]) => allowed.includes(k))
  );

  const supabase = getClient();
  const { data, error } = await supabase
    .from("progress")
    .upsert({ problem_id, ...filtered }, { onConflict: "problem_id" })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const problem_id = searchParams.get("problem_id");

  if (!problem_id) {
    return NextResponse.json({ error: "problem_id required" }, { status: 400 });
  }

  const supabase = getClient();
  const { data, error } = await supabase
    .from("progress")
    .select("*")
    .eq("problem_id", problem_id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
