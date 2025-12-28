import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing required Supabase environment variables");
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function POST(request: NextRequest) {
  try {
    const { identifier } = await request.json();

    if (!identifier || typeof identifier !== "string") {
      return NextResponse.json({ error: "Email or username is required" }, { status: 400 });
    }

    const trimmed = identifier.trim();
    if (!trimmed) {
      return NextResponse.json({ error: "Email or username is required" }, { status: 400 });
    }

    if (trimmed.includes("@")) {
      return NextResponse.json({ email: trimmed.toLowerCase() });
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("user_profiles")
      .select("email")
      .ilike("username", trimmed)
      .maybeSingle();

    if (error) {
      console.error("Failed to resolve username", error);
      return NextResponse.json({ error: "Failed to resolve username" }, { status: 500 });
    }

    if (!data?.email) {
      return NextResponse.json({ error: "Username not found" }, { status: 404 });
    }

    return NextResponse.json({ email: data.email });
  } catch (error) {
    console.error("Unexpected resolve identifier error", error);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
