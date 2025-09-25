"use client";

import { useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { parseCSV, toCSV } from "@/lib/csv";
import type { Difficulty, Question } from "@/lib/types";

type ImportReport = {
  total: number;
  inserted: number;
  errors: string[];
};

const DIFFS: Difficulty[] = ["easy", "medium", "hard"];

function normalizeRow(obj: Record<string, string>) {
  const question_text = (obj["question_text"] || obj["question"] || "").trim();
  const topic = (obj["topic"] || "").trim();
  const answer_text = (obj["answer_text"] || obj["answer"] || "").trim() || null;
  const difficultyRaw = (obj["difficulty"] || "").toLowerCase().trim();
  const difficulty: Difficulty = (DIFFS.includes(difficultyRaw as Difficulty) ? difficultyRaw : "medium") as Difficulty;
  const id = (obj["id"] || "").trim() || undefined;

  let choices: string[] | null = null;
  const choicesField = obj["choices"] || obj["choices_pipe"] || obj["options"] || "";
  if (choicesField) {
    const s = choicesField.trim();
    if (s.startsWith("[") && s.endsWith("]")) {
      try {
        const arr = JSON.parse(s);
        if (Array.isArray(arr)) choices = arr.map((v) => String(v));
      } catch {}
    } else {
      choices = s.split("|").map((x) => x.trim()).filter(Boolean);
    }
  }

  const cidxRaw = (obj["correct_choice_index"] || obj["answer_index"] || obj["correct_index"] || "").trim();
  const correct_choice_index = cidxRaw === "" ? null : Number.isFinite(Number(cidxRaw)) ? Number(cidxRaw) : null;

  return { id, question_text, topic, answer_text, difficulty, choices, correct_choice_index };
}

type NormalizedRow = ReturnType<typeof normalizeRow>;

export default function ImportExportPanel() {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [importSample, setImportSample] = useState<NormalizedRow[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const exportCSV = async () => {
    setExporting(true);
    // fetch up to 10k rows
    const { data, error } = await supabase
      .from("questions")
      .select("*")
      .order("created_at", { ascending: true })
      .range(0, 9999);
    setExporting(false);
    if (error) {
      alert(`Export failed: ${error.message}`);
      return;
    }
    const rows = (data as Question[]).map((q) => ({
      id: q.id,
      question_text: q.question_text,
      answer_text: q.answer_text ?? "",
      topic: q.topic,
      difficulty: q.difficulty,
      choices: Array.isArray(q.choices) ? q.choices.join("|") : "",
      correct_choice_index: q.correct_choice_index ?? "",
      created_at: q.created_at
    }));
    const headers = [
      "id",
      "question_text",
      "answer_text",
      "topic",
      "difficulty",
      "choices",
      "correct_choice_index",
      "created_at"
    ];
    const csv = toCSV(headers, rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "questions_export.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const readFile = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const fr = new FileReader();
      fr.onerror = () => reject(fr.error);
      fr.onload = () => resolve(String(fr.result || ""));
      fr.readAsText(file);
    });

  const importCSV = async (file: File) => {
    setImporting(true);
    setReport(null);
    try {
      const text = await readFile(file);
      const rows = parseCSV(text);
      if (rows.length === 0) throw new Error("CSV is empty");
      const headers = rows[0].map((h) => h.trim());
      const recs = rows.slice(1).filter((r) => r.some((v) => v.trim() !== ""));
      const objects = recs.map((r) => {
        const obj: Record<string, string> = {};
        headers.forEach((h, i) => {
          obj[h] = (r[i] ?? "").trim();
        });
        return obj;
      });
      const payloads = objects.map(normalizeRow).filter((p) => p.question_text && p.topic);
      setImportSample(payloads.slice(0, 3));
      let inserted = 0;
      const chunkSize = 300;
      for (let i = 0; i < payloads.length; i += chunkSize) {
        const chunk = payloads.slice(i, i + chunkSize);
        const { data, error } = await supabase
          .from("questions")
          .upsert(chunk, { onConflict: "id" })
          .select("id");
        if (error) throw error;
        inserted += (data ?? []).length;
      }
      setReport({ total: payloads.length, inserted, errors: [] });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      setReport({ total: 0, inserted: 0, errors: [message] });
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const samplePreview = useMemo(() => {
    if (!importSample.length) return null;
    const p = importSample[0];
    const preview = p.question_text.substring(0, 60);
    const suffix = p.question_text.length > 60 ? "..." : "";
    return `${p.topic} | ${p.difficulty} | ${preview}${suffix}`;
  }, [importSample]);

  return (
    <div className="card">
      <h3 className="title">CSV Import/Export</h3>
      <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
        <button className="btn" onClick={exportCSV} disabled={exporting}>{exporting ? "Exporting…" : "Export CSV"}</button>
        <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={(e) => e.target.files && e.target.files[0] && void importCSV(e.target.files[0])} />
        {importing && <span className="muted">Importing…</span>}
      </div>
      <p className="muted" style={{ marginTop: 8 }}>
        CSV columns: id (optional), question_text, answer_text, topic, difficulty [easy|medium|hard], choices (e.g. A|B|C or JSON array), correct_choice_index.
      </p>
      {report && (
        <div style={{ marginTop: 8 }}>
          <strong>Import result</strong>
          <p className="muted">Total parsed: {report.total} • Upserted: {report.inserted}</p>
          {report.errors.length > 0 && (
            <ul className="clean">
              {report.errors.map((e, i) => (
                <li key={i} className="incorrect">{e}</li>
              ))}
            </ul>
          )}
          {importSample.length > 0 && <p className="muted">Preview: {samplePreview}</p>}
        </div>
      )}
    </div>
  );
}
