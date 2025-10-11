import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type ExecuteSqlRequest = {
  statements?: string[];
};

type SqlStatus = {
  success: boolean;
  executed: number;
};

const normalizeStatement = (input: string): string => input.replace(/;\s*$/, "").trim();

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      const missing = [
        !supabaseUrl ? "NEXT_PUBLIC_SUPABASE_URL" : null,
        !supabaseAnonKey ? "NEXT_PUBLIC_SUPABASE_ANON_KEY" : null,
        !supabaseServiceKey ? "SUPABASE_SERVICE_ROLE_KEY" : null
      ].filter(Boolean) as string[];

      console.error("Missing Supabase env vars", missing);

      return NextResponse.json(
        {
          error: missing.length
            ? `Supabase environment variables are missing: ${missing.join(", ")}.`
            : "Supabase environment variables are not configured."
        },
        { status: 500 }
      );
    }

    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const accessToken = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabaseUserClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    });

    const {
      data: { user },
      error: userError
    } = await supabaseUserClient.auth.getUser(accessToken);

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: isAdmin, error: adminError } = await supabaseUserClient.rpc("is_admin");
    if (adminError) {
      console.error("Failed to verify admin access", adminError);
      return NextResponse.json({ error: "Failed to verify admin access." }, { status: 500 });
    }

    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let payload: ExecuteSqlRequest;
    try {
      payload = (await request.json()) as ExecuteSqlRequest;
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
    }

    if (!Array.isArray(payload.statements) || payload.statements.length === 0) {
      return NextResponse.json({ error: "Provide at least one INSERT statement." }, { status: 400 });
    }

    const sanitizedStatements = payload.statements
      .map((statement) => (typeof statement === "string" ? normalizeStatement(statement) : ""))
      .map((statement) => statement.replace(/^;+/, ""))
      .map((statement) => statement.replace(/;+$/g, ""))
      .map((statement) => statement.trim())
      .filter((statement) => statement.length > 0);

    if (sanitizedStatements.length === 0) {
      return NextResponse.json({ error: "No valid INSERT statements were provided." }, { status: 400 });
    }

    if (sanitizedStatements.length > 20) {
      return NextResponse.json({ error: "Too many statements provided." }, { status: 400 });
    }

    for (const statement of sanitizedStatements) {
      if (!/insert\s+into/i.test(statement)) {
        return NextResponse.json(
          { error: "Only INSERT statements are supported." },
          { status: 400 }
        );
      }
    }

    const supabaseAdminClient = createClient(supabaseUrl, supabaseServiceKey);

    let executed = 0;
    for (const statement of sanitizedStatements) {
      const { error } = await supabaseAdminClient.rpc("execute_insert_sql", { sql: statement });
      if (error) {
        console.error("Failed to execute INSERT statement", { statement, error });
        if (
          error.message?.includes("Only INSERT statements are allowed") &&
          /^with\s+/i.test(statement)
        ) {
          return NextResponse.json(
            {
              error:
                "Supabase function execute_insert_sql currently rejects WITH queries. Reapply the updated function from supabase/schema.sql so CTE-based inserts are permitted."
            },
            { status: 400 }
          );
        }
        return NextResponse.json(
          { error: error.message || "Failed to execute INSERT statement." },
          { status: 400 }
        );
      }
      executed += 1;
    }

    const result: SqlStatus = { success: true, executed };
    return NextResponse.json(result);
  } catch (error) {
    console.error("Unexpected error executing SQL", error);
    const message = error instanceof Error ? error.message : "Unexpected error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
