import { NextResponse, type NextRequest } from "next/server";

// Auth is localStorage-based (supabase-js), so cookies carry no session.
// Route protection is handled client-side in each page component.
export async function proxy(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
