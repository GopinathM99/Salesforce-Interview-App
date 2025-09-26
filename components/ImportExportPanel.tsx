"use client";

import { useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { parseCSV, toCSV } from "@/lib/csv";
import type { Difficulty, RawQuestion } from "@/lib/types";
import { normalizeQuestion } from "@/lib/types";

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
  const providedId = (obj["id"] || "").trim();
  const id = providedId || (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);

  let choices: string[] = [];
  const choicesField = obj["choices"] || obj["choices_pipe"] || obj["options"] || "";
  if (choicesField) {
    const s = choicesField.trim();
    if (s.startsWith("[") && s.endsWith("]")) {
      try {
        const arr = JSON.parse(s);
        if (Array.isArray(arr)) choices = arr.map((v) => String(v).trim()).filter(Boolean);
      } catch {}
    } else {
      choices = s.split("|").map((x) => x.trim()).filter(Boolean);
    }
  }

  const cidxRaw = (obj["correct_choice_index"] || obj["answer_index"] || obj["correct_index"] || "").trim();
  const parsedIdx = Number(cidxRaw);
  const correct_choice_index = Number.isFinite(parsedIdx) ? parsedIdx : null;

  return { id, question_text, topic, answer_text, difficulty, choices, correct_choice_index };
}

type NormalizedRow = ReturnType<typeof normalizeRow>;

type McqUpsertPayload = {
  question_id: string;
  choices: string[];
  correct_choice_index: number;
  explanation: string | null;
  shuffle_options: boolean;
};

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
      .select("*, multiple_choice_questions(*)")
      .order("created_at", { ascending: true })
      .range(0, 9999);
    setExporting(false);
    if (error) {
      alert(`Export failed: ${error.message}`);
      return;
    }
    const rows = ((data as RawQuestion[]) ?? []).map((raw) => {
      const q = normalizeQuestion(raw);
      return {
        id: q.id,
        question_text: q.question_text,
        answer_text: q.answer_text ?? q.mcq?.explanation ?? "",
        topic: q.topic,
        difficulty: q.difficulty,
        choices: q.mcq ? q.mcq.choices.join("|") : "",
        correct_choice_index: q.mcq ? String(q.mcq.correct_choice_index) : "",
        created_at: q.created_at
      };
    });
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
        const questionChunk = chunk.map((row) => ({
          id: row.id,
          question_text: row.question_text,
          answer_text: row.answer_text,
          topic: row.topic,
          difficulty: row.difficulty
        }));

        const { data, error } = await supabase
          .from("questions")
          .upsert(questionChunk, { onConflict: "id" })
          .select("id");
        if (error) throw error;
        inserted += (data ?? []).length;

        const mcqUpserts: McqUpsertPayload[] = chunk
          .map((row) => {
            const isValid =
              row.choices.length >= 2 &&
              row.correct_choice_index != null &&
              row.correct_choice_index >= 0 &&
              row.correct_choice_index < row.choices.length;
            if (!isValid) return null;
            return {
              question_id: row.id,
              choices: row.choices,
              correct_choice_index: row.correct_choice_index,
              explanation: row.answer_text,
              shuffle_options: false
            };
          })
          .filter((payload): payload is McqUpsertPayload => Boolean(payload));

        if (mcqUpserts.length > 0) {
          const { error: mcqError } = await supabase
            .from("multiple_choice_questions")
            .upsert(mcqUpserts, { onConflict: "question_id" });
          if (mcqError) throw mcqError;
        }

        const mcqDeletes = chunk
          .filter((row) => row.choices.length < 2)
          .map((row) => row.id);
        if (mcqDeletes.length > 0) {
          const { error: mcqDeleteError } = await supabase
            .from("multiple_choice_questions")
            .delete()
            .in("question_id", mcqDeletes);
          if (mcqDeleteError) throw mcqDeleteError;
        }
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
