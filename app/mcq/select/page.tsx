"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

// Fallback categories if database query fails
const FALLBACK_CATEGORIES = [
  "General",
  "Sales Cloud",
  "Service Cloud",
  "Agentforce",
  "CPQ",
  "Litify"
];

export default function McqCategorySelectPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<string[]>(FALLBACK_CATEGORIES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const { data, error } = await supabase.rpc("list_categories");
        if (error) {
          console.error("Failed to load categories:", error);
          // Use fallback categories
          setCategories(FALLBACK_CATEGORIES);
        } else {
          const categoryList = (data as string[]) ?? [];
          // Use database categories if available, otherwise fallback
          setCategories(categoryList.length > 0 ? categoryList : FALLBACK_CATEGORIES);
        }
      } catch (err) {
        console.error("Error loading categories:", err);
        setCategories(FALLBACK_CATEGORIES);
      } finally {
        setLoading(false);
      }
    };

    void loadCategories();
  }, []);

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
          <Link className="btn" href="/">
            Back to Home
          </Link>
        </div>
        <p className="muted" style={{ marginBottom: 24 }}>
          Choose a category to start practicing multiple choice questions.
        </p>
        {loading ? (
          <p className="muted">Loading categories...</p>
        ) : (
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
            {categories.map((category) => (
              <button
                key={category}
                className="btn primary"
                onClick={() => handleCategorySelect(category)}
                style={{
                  padding: "24px 16px",
                  fontSize: "16px",
                  fontWeight: 600,
                  textAlign: "center",
                  minHeight: "80px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                {category}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

