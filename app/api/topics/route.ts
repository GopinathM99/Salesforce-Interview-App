import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: "Missing Supabase environment variables" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Call the list_topics() function to get distinct topics
    const { data, error } = await supabase.rpc("list_topics");

    if (error) {
      console.error("Failed to fetch topics", error);
      return NextResponse.json(
        { error: "Could not fetch topics." },
        { status: 500 }
      );
    }

    return NextResponse.json({ topics: data || [] });
  } catch (error) {
    console.error("Topics fetch error", error);
    const message = error instanceof Error ? error.message : "Unknown error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
