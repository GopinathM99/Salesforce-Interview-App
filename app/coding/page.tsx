"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { CodingQuestion } from "@/lib/types";
import ReactMarkdown from "react-markdown";
import {
  CodeBlock,
  CodeBlockHeader,
  CodeBlockBody,
  CodeBlockItem,
  CodeBlockContent,
  CodeBlockCopyButton,
  CodeBlockSelect,
  CodeBlockSelectTrigger,
  CodeBlockSelectValue,
  CodeBlockSelectContent,
  CodeBlockSelectItem,
} from "@/components/kibo-ui/code-block";
import type { BundledLanguage } from "shiki";

const getLanguageFromExtension = (extension: string): BundledLanguage => {
  const languageMap: Record<string, BundledLanguage> = {
    'html': 'html',
    'js': 'javascript',
    'jsx': 'javascript',
    'cls': 'java', // Apex classes use Java syntax highlighting
    'apex': 'java',
    'trigger': 'java', // Triggers use Java syntax highlighting
    'batch': 'java', // Batch classes use Java syntax highlighting
    'xml': 'xml',
    'cmp': 'xml', // Lightning components are XML-based
    'css': 'css',
    'json': 'json',
    'ts': 'typescript',
    'tsx': 'typescript',
  };
  
  return languageMap[extension.toLowerCase()] || 'text';
};

const parseSolutionFiles = (solutionCode: string) => {
  if (!solutionCode) return [];
  
  // Pattern to match file names in various formats:
  // - With separators: -- lookup.html -- or === lookup.html ===
  // - Pure filename: lookup.html
  // - With comment: // lookup.html or /* lookup.html */
  // - Trigger declarations: trigger OpportunityContactRoleTrigger on Opportunity (after update)
  // - Batch classes: public class UpdateAccountRatingBatch implements Database.Batchable<sObject>
  const filePattern = /^[\s]*[=\-]{2,}[\s]*([A-Za-z][\w\/\.-]*\.(html|js|cls|apex|xml|cmp|css|json|ts))[\s]*[=\-]{2,}[\s]*$|^[\s]*([A-Za-z][\w\/\.-]*\.(html|js|cls|apex|xml|cmp|css|json|ts))[\s]*$|^[\s]*trigger\s+([A-Za-z]\w+)\s+on\s+|^[\s]*(?:public\s+)?class\s+([A-Za-z]\w+Batch)[\s]+(?:(?:implements|extends)\s+)?/im;
  const lines = solutionCode.split('\n');
  const files: Array<{ language: BundledLanguage; filename: string; code: string }> = [];
  let currentFile: { language: BundledLanguage; filename: string; code: string } | null = null;
  
  for (const line of lines) {
    const trimmed = line.trim();
    const match = trimmed.match(filePattern);
    
    if (match) {
      // Save previous file if exists
      if (currentFile) {
        files.push(currentFile);
      }
      // Start new file
      let fileName: string;
      let extension: string;
      let includeLineInCode: boolean;
      
      if (match[6]) {
        // Batch class declaration: match[6] is the batch class name
        fileName = match[6];
        extension = 'batch';
        includeLineInCode = true; // Include the declaration line
      } else if (match[5]) {
        // Trigger declaration: match[5] is the trigger name
        fileName = match[5];
        extension = 'trigger';
        includeLineInCode = true; // Include the declaration line
      } else {
        // Regular file: match[1] is for format with separators, match[3] is for standalone filename
        fileName = match[1] || match[3];
        extension = fileName.split('.').pop() || '';
        includeLineInCode = false; // Don't include separator lines
      }
      
      const language = getLanguageFromExtension(extension);
      currentFile = { language, filename: fileName, code: includeLineInCode ? line : '' };
    } else if (currentFile) {
      // Add line to current file
      currentFile.code += (currentFile.code ? '\n' : '') + line;
    }
  }
  
  // Add last file
  if (currentFile) {
    files.push(currentFile);
  }
  
  // If no files found, treat entire solution as one block
  if (files.length === 0) {
    return [{ language: 'text' as BundledLanguage, filename: 'solution', code: solutionCode }];
  }
  
  return files;
};


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
            <Link className="btn back-btn" href="/">
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
            <Link className="btn back-btn" href="/">
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
            <Link className="btn back-btn" href="/">
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
              {(() => {
                const solutionText = currentQuestion.solution_code?.replace(/\\n/g, '\n') || '';
                const files = parseSolutionFiles(solutionText);
                
                // Transform files to the format expected by Kibo UI
                const codeBlockData = files.map((file) => ({
                  language: file.language as string,
                  filename: file.filename,
                  code: file.code,
                }));
                
                // Create a lookup map for language types
                const languageMap = new Map(files.map(f => [f.filename, f.language]));
                
                // Use filename as the value for the CodeBlock component
                const defaultValue = files[0]?.filename || 'solution';
                
                if (files.length === 1 && files[0].filename === 'solution') {
                  // Single solution without file names
                  return (
                    <CodeBlock defaultValue={defaultValue} data={codeBlockData}>
                      <CodeBlockBody>
                        {(item) => (
                          <CodeBlockItem key={item.filename} value={item.filename}>
                            <CodeBlockContent language={languageMap.get(item.filename)}>
                              {item.code}
                            </CodeBlockContent>
                          </CodeBlockItem>
                        )}
                      </CodeBlockBody>
                    </CodeBlock>
                  );
                }
                
                // Multiple files with file selector
                return (
                  <CodeBlock defaultValue={defaultValue} data={codeBlockData}>
                    <CodeBlockHeader>
                      <CodeBlockSelect>
                        <CodeBlockSelectTrigger>
                          <CodeBlockSelectValue />
                        </CodeBlockSelectTrigger>
                        <CodeBlockSelectContent>
                          {(item) => (
                            <CodeBlockSelectItem key={item.filename} value={item.filename}>
                              {item.filename}
                            </CodeBlockSelectItem>
                          )}
                        </CodeBlockSelectContent>
                      </CodeBlockSelect>
                      <CodeBlockCopyButton />
                    </CodeBlockHeader>
                    <CodeBlockBody>
                      {(item) => (
                        <CodeBlockItem key={item.filename} value={item.filename}>
                          <CodeBlockContent language={languageMap.get(item.filename)}>
                            {item.code}
                          </CodeBlockContent>
                        </CodeBlockItem>
                      )}
                    </CodeBlockBody>
                  </CodeBlock>
                );
              })()}
              
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
