"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { CodingQuestion } from "@/lib/types";
import ReactMarkdown from "react-markdown";

export default function CodingPage() {
  const [codingQuestions, setCodingQuestions] = useState<CodingQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showSolution, setShowSolution] = useState(false);

  useEffect(() => {
    const fetchCodingQuestions = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const { data, error } = await supabase
          .from("coding_questions")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Supabase error:", error);
          if (error.message.includes("relation") && error.message.includes("does not exist")) {
            throw new Error("Coding questions table not found. Please run the database schema in Supabase SQL editor.");
          }
          throw error;
        }

        setCodingQuestions(data || []);
      } catch (err) {
        console.error("Error fetching coding questions:", err);
        setError(err instanceof Error ? err.message : "Failed to load coding questions");
      } finally {
        setLoading(false);
      }
    };

    fetchCodingQuestions();
  }, []);

  const handleNextQuestion = () => {
    if (currentQuestionIndex < codingQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setShowSolution(false);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      setShowSolution(false);
    }
  };

  const handleRandomQuestion = () => {
    const randomIndex = Math.floor(Math.random() * codingQuestions.length);
    setCurrentQuestionIndex(randomIndex);
    setShowSolution(false);
  };

  if (loading) {
    return (
      <div className="grid">
        <div className="card" style={{ gridColumn: "1 / -1" }}>
          <h2 className="title">Coding Questions</h2>
          <p>Loading coding questions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid">
        <div className="card" style={{ gridColumn: "1 / -1" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 className="title">Coding Questions</h2>
            <Link className="btn" href="/">
              Back to Home
            </Link>
          </div>
          <p className="muted">Unable to load coding questions: {error}</p>
        </div>
      </div>
    );
  }

  if (codingQuestions.length === 0) {
    return (
      <div className="grid">
        <div className="card" style={{ gridColumn: "1 / -1" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 className="title">Coding Questions</h2>
            <Link className="btn" href="/">
              Back to Home
            </Link>
          </div>
          <p>No coding questions available yet. Check back soon!</p>
        </div>
      </div>
    );
  }

  if (codingQuestions.length > 0) {
    const currentQuestion = codingQuestions[currentQuestionIndex];
    
    return (
      <div className="grid">
        <div className="card" style={{ gridColumn: "1 / -1" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 className="title">{currentQuestion.title}</h2>
            <Link className="btn" href="/">
              Back to Home
            </Link>
          </div>
          
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            <span
              style={{
                padding: "4px 8px",
                borderRadius: 12,
                fontSize: 12,
                fontWeight: 500,
                backgroundColor: 
                  currentQuestion.difficulty === "easy" ? "#dcfce7" :
                  currentQuestion.difficulty === "medium" ? "#fef3c7" : "#fee2e2",
                color: 
                  currentQuestion.difficulty === "easy" ? "#166534" :
                  currentQuestion.difficulty === "medium" ? "#92400e" : "#991b1b"
              }}
            >
              {currentQuestion.difficulty}
            </span>
            {currentQuestion.tags.map((tag) => (
              <span
                key={tag}
                style={{
                  padding: "4px 8px",
                  borderRadius: 4,
                  fontSize: 12,
                  backgroundColor: "#f3f4f6",
                  color: "#374151"
                }}
              >
                {tag}
              </span>
            ))}
          </div>

          <div style={{ marginBottom: 24 }}>
            <h3>Description</h3>
            <p>{currentQuestion.description}</p>
          </div>

          <div style={{ marginBottom: 24 }}>
            <h3>Problem Statement</h3>
            <div style={{ 
              backgroundColor: "#f8fafc", 
              color: "#1e293b",
              padding: 16, 
              borderRadius: 8, 
              border: "1px solid #e2e8f0",
              whiteSpace: "pre-wrap",
              fontFamily: "monospace",
              fontSize: 14
            }}>
              {currentQuestion.problem_statement?.replace(/\\n/g, '\n')}
            </div>
          </div>


          <div style={{ marginBottom: 16 }}>
            <button 
              className="btn primary" 
              onClick={() => setShowSolution(!showSolution)}
              style={{ marginRight: 12 }}
            >
              {showSolution ? "Hide Solution" : "Show Solution"}
            </button>
          </div>

          {showSolution && (
            <div style={{ marginBottom: 24 }}>
              <h3>Solution</h3>
              <div style={{ 
                backgroundColor: "#1e293b", 
                color: "#f1f5f9",
                padding: 16, 
                borderRadius: 8, 
                border: "1px solid #334155",
                fontFamily: "monospace",
                fontSize: 14,
                overflow: "auto",
                whiteSpace: "pre-wrap"
              }}>
                {currentQuestion.solution_code?.replace(/\\n/g, '\n')}
              </div>
              
              {currentQuestion.explanation && (
                <div style={{ marginTop: 16 }}>
                  <h4>Explanation</h4>
                  <div style={{ 
                    lineHeight: 1.6,
                    fontSize: 15
                  }}>
                    <ReactMarkdown>{currentQuestion.explanation?.replace(/\\n/g, '\n')}</ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          )}

          <div style={{ display: "flex", gap: 12, marginTop: 24, justifyContent: "center" }}>
            <button 
              className="btn" 
              onClick={handlePreviousQuestion}
              disabled={currentQuestionIndex === 0}
            >
              Previous
            </button>
            <button 
              className="btn" 
              onClick={handleRandomQuestion}
            >
              Random
            </button>
            <button 
              className="btn" 
              onClick={handleNextQuestion}
              disabled={currentQuestionIndex === codingQuestions.length - 1}
            >
              Next
            </button>
          </div>
          
          <p style={{ textAlign: "center", marginTop: 12, fontSize: 14, color: "#6b7280" }}>
            Question {currentQuestionIndex + 1} of {codingQuestions.length}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid">
      <div className="card" style={{ gridColumn: "1 / -1" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 className="title">Coding Questions</h2>
          <Link className="btn" href="/">
            Back to Home
          </Link>
        </div>
        <p>No coding questions available yet. Check back soon!</p>
      </div>
    </div>
  );
}
