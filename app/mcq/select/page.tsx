"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/components/AuthProvider";

// Fallback categories if database query fails
const FALLBACK_CATEGORIES = [
  "General",
  "Sales Cloud",
  "Service Cloud",
  "Agentforce",
  "CPQ",
  "Litify"
];

type CategoryProgress = {
  category: string;
  total_count: number;
  attempted_count: number;
};

export default function McqCategorySelectPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [categories, setCategories] = useState<string[]>(FALLBACK_CATEGORIES);
  const [progress, setProgress] = useState<Record<string, CategoryProgress>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load categories
        const { data: catData, error: catError } = await supabase.rpc("list_categories");
        if (catError) {
          console.error("Failed to load categories:", catError);
          setCategories(FALLBACK_CATEGORIES);
        } else {
          const categoryList = (catData as string[]) ?? [];
          setCategories(categoryList.length > 0 ? categoryList : FALLBACK_CATEGORIES);
        }

        // Load progress if user is logged in
        if (user) {
          const { data: progressData, error: progressError } = await supabase.rpc("get_mcq_category_progress");
          if (progressError) {
            console.error("Failed to load progress:", progressError);
          } else {
            const progressMap: Record<string, CategoryProgress> = {};
            (progressData as CategoryProgress[] | null)?.forEach((p) => {
              progressMap[p.category] = p;
            });
            setProgress(progressMap);
          }
        }
      } catch (err) {
        console.error("Error loading data:", err);
        setCategories(FALLBACK_CATEGORIES);
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, [user]);

  const handleCategorySelect = (category: string) => {
    router.push(`/mcq?category=${encodeURIComponent(category)}`);
  };

  return (
    <div className="grid">
      <div className="card">
        <div
          className="row"
          style={{ justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}
        >
          <h2 className="title" style={{ marginBottom: 0 }}>Select Category</h2>
          <div className="row" style={{ gap: 8 }}>
            <Link className="btn" href="/mcq/bookmarks">
              My Bookmarks
            </Link>
            <Link className="btn" href="/">
              Back to Home
            </Link>
          </div>
        </div>
        <p className="muted" style={{ marginBottom: 24 }}>
          Choose a category to start practicing multiple choice questions.
        </p>
        {!user && (
          <p className="muted" style={{ marginBottom: 16, fontSize: "14px" }}>
            Sign in to track your progress across categories.
          </p>
        )}
        {loading ? (
          <p className="muted">Loading categories...</p>
        ) : (
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
            {categories.map((category) => {
              const catProgress = progress[category];
              const total = catProgress?.total_count ?? 0;
              const attempted = catProgress?.attempted_count ?? 0;
              const percentage = total > 0 ? Math.round((attempted / total) * 100) : 0;

              return (
                <button
                  key={category}
                  className="btn primary"
                  onClick={() => handleCategorySelect(category)}
                  style={{
                    padding: "16px",
                    fontSize: "16px",
                    fontWeight: 600,
                    textAlign: "center",
                    minHeight: "100px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    position: "relative",
                    overflow: "hidden"
                  }}
                >
                  <span>{category}</span>
                  {user && total > 0 && (
                    <>
                      <span style={{
                        fontSize: "13px",
                        fontWeight: 400,
                        opacity: 0.9,
                        color: attempted === total ? "#4ade80" : "inherit"
                      }}>
                        {attempted} / {total} completed
                      </span>
                      <div style={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        height: "4px",
                        width: "100%",
                        backgroundColor: "rgba(255, 255, 255, 0.1)"
                      }}>
                        <div style={{
                          height: "100%",
                          width: `${percentage}%`,
                          backgroundColor: attempted === total ? "#4ade80" : "#60a5fa",
                          transition: "width 0.3s ease"
                        }} />
                      </div>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
