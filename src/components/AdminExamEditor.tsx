"use client";

import { useCallback, useEffect, useState } from "react";
import { parseCsvRows } from "@/lib/csv-parse";
import { dateTimeLocalToISO, toDateTimeLocalValue } from "@/lib/datetime-local";
import { IconActionButton, IconActionGroup } from "@/components/IconActionButton";

type FormQuestion = {
  questionId?: string;
  testQuestionId?: string;
  questionText: string;
  questionType: string;
  options: { text: string; isCorrect: boolean }[];
  correctIntegerAnswer?: number | null;
  explanation: string;
  marks: number;
  negativeMarks: number;
  timeLimitSeconds: number;
};

type AdminExamEditorProps = {
  testId: string;
  onClose: () => void;
  onSaved: () => void;
};

export function AdminExamEditor({ testId, onClose, onSaved }: AdminExamEditorProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSubmissions, setHasSubmissions] = useState(false);
  const [teacherName, setTeacherName] = useState("");
  const [formQuestions, setFormQuestions] = useState<FormQuestion[]>([]);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null);
  const [testForm, setTestForm] = useState({
    testName: "",
    subject: "",
    subpart: "",
    durationMinutes: 60,
    startDateTime: "",
    endDateTime: "",
    instructions: "",
    isNegativeMarking: false,
    randomizeQuestions: true,
    status: "Draft" as "Draft" | "Published",
    totalMarks: 0,
  });
  const [currentQForm, setCurrentQForm] = useState({
    questionText: "",
    questionType: "Single Correct" as "Single Correct" | "Multiple Correct" | "Integer Type",
    options: [
      { text: "", isCorrect: false },
      { text: "", isCorrect: false },
      { text: "", isCorrect: false },
      { text: "", isCorrect: false },
    ],
    correctIntegerAnswer: "",
    explanation: "",
    marks: 2,
    negativeMarks: 0,
    timeLimitSeconds: 0,
  });

  const loadTest = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/exams?id=${encodeURIComponent(testId)}`, {
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load examination.");

      const t = data.test;
      setHasSubmissions(Boolean(data.hasSubmissions));
      setTeacherName(data.teacherName || "—");
      setTestForm({
        testName: t.testName,
        subject: t.subject,
        subpart: t.subpart,
        durationMinutes: t.durationMinutes,
        startDateTime: toDateTimeLocalValue(t.startDateTime),
        endDateTime: toDateTimeLocalValue(t.endDateTime),
        instructions: t.instructions || "",
        isNegativeMarking: t.isNegativeMarking,
        randomizeQuestions: t.randomizeQuestions !== false,
        status: t.status,
        totalMarks: t.totalMarks,
      });
      setFormQuestions(data.questions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load examination.");
    } finally {
      setLoading(false);
    }
  }, [testId]);

  useEffect(() => {
    void loadTest();
  }, [loadTest]);

  function openQuestionModal(index?: number) {
    if (index !== undefined) {
      const q = formQuestions[index];
      setCurrentQForm({
        questionText: q.questionText,
        questionType: q.questionType as "Single Correct" | "Multiple Correct" | "Integer Type",
        options: q.options?.length
          ? q.options.map((o) => ({ ...o }))
          : [
              { text: "", isCorrect: false },
              { text: "", isCorrect: false },
              { text: "", isCorrect: false },
              { text: "", isCorrect: false },
            ],
        correctIntegerAnswer:
          q.correctIntegerAnswer !== undefined && q.correctIntegerAnswer !== null
            ? String(q.correctIntegerAnswer)
            : "",
        explanation: q.explanation || "",
        marks: q.marks,
        negativeMarks: q.negativeMarks,
        timeLimitSeconds: q.timeLimitSeconds || 0,
      });
      setEditingQuestionIndex(index);
    } else {
      setEditingQuestionIndex(null);
    }
    setShowQuestionModal(true);
  }

  function closeQuestionModal() {
    setShowQuestionModal(false);
    setEditingQuestionIndex(null);
  }

  function saveManualQuestion() {
    if (!currentQForm.questionText.trim()) {
      alert("Question text is required.");
      return;
    }
    if (currentQForm.questionType === "Integer Type") {
      if (currentQForm.correctIntegerAnswer === "") {
        alert("Correct integer answer is required.");
        return;
      }
    } else if (currentQForm.options.filter((o) => o.isCorrect).length === 0) {
      alert("Select at least one correct option.");
      return;
    }

    const questionObj: FormQuestion = {
      ...(editingQuestionIndex !== null && formQuestions[editingQuestionIndex]?.testQuestionId
        ? {
            testQuestionId: formQuestions[editingQuestionIndex].testQuestionId,
            questionId: formQuestions[editingQuestionIndex].questionId,
          }
        : {}),
      questionText: currentQForm.questionText,
      questionType: currentQForm.questionType,
      options: currentQForm.questionType === "Integer Type" ? [] : currentQForm.options,
      correctIntegerAnswer:
        currentQForm.questionType === "Integer Type" ? Number(currentQForm.correctIntegerAnswer) : null,
      explanation: currentQForm.explanation,
      marks: currentQForm.marks,
      negativeMarks: currentQForm.negativeMarks,
      timeLimitSeconds: currentQForm.timeLimitSeconds,
    };

    if (editingQuestionIndex !== null) {
      setFormQuestions((prev) => prev.map((q, i) => (i === editingQuestionIndex ? { ...q, ...questionObj } : q)));
    } else {
      setFormQuestions((prev) => [...prev, questionObj]);
    }
    closeQuestionModal();
  }

  function handleCSVUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;
      try {
        const rows = parseCsvRows(text);
        const parsed: FormQuestion[] = [];
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i].map((cell) => cell.trim());
          if (row.length < 2 || row.every((cell) => !cell)) continue;
          const [
            qText,
            qType,
            opt1,
            opt2,
            opt3,
            opt4,
            correctAns,
            explanation,
            qMarks,
            qNegMarks,
            qTimeLimit,
          ] = row;
          const typeStr = (qType || "Single Correct").replace(/^"|"$/g, "");
          const marksVal = Number(qMarks) || 2;
          const negVal = Number(qNegMarks) || 0;
          const timeLimitVal = Number(qTimeLimit) || 0;
          if (typeStr === "Integer Type") {
            parsed.push({
              questionText: qText.replace(/^"|"$/g, ""),
              questionType: typeStr,
              options: [],
              correctIntegerAnswer: Number(correctAns) || 0,
              explanation: (explanation || "").replace(/^"|"$/g, ""),
              marks: marksVal,
              negativeMarks: negVal,
              timeLimitSeconds: timeLimitVal,
            });
          } else {
            const rawOpts = [opt1, opt2, opt3, opt4].filter((o) => o !== undefined && o !== "").map((o) => o.replace(/^"|"$/g, ""));
            const correctIndices = (correctAns || "")
              .replace(/^"|"$/g, "")
              .split(",")
              .map((s) => parseInt(s.trim(), 10) - 1);
            parsed.push({
              questionText: qText.replace(/^"|"$/g, ""),
              questionType: typeStr,
              options: rawOpts.map((txt, idx) => ({
                text: txt,
                isCorrect: correctIndices.includes(idx),
              })),
              correctIntegerAnswer: null,
              explanation: (explanation || "").replace(/^"|"$/g, ""),
              marks: marksVal,
              negativeMarks: negVal,
              timeLimitSeconds: timeLimitVal,
            });
          }
        }
        if (parsed.length > 0) {
          setFormQuestions((prev) => [...prev, ...parsed]);
          alert(`Added ${parsed.length} questions from CSV.`);
        }
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : "CSV parse error.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  async function handleSave() {
    if (hasSubmissions) {
      alert("Cannot edit — students have already attempted this test.");
      return;
    }
    if (formQuestions.length === 0) {
      alert("Add at least one question.");
      return;
    }
    setSaving(true);
    try {
      const totalMarks = formQuestions.reduce((sum, q) => sum + (Number(q.marks) || 0), 0);
      const res = await fetch("/api/admin/exams", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testId,
          testName: testForm.testName.trim(),
          subject: testForm.subject,
          subpart: testForm.subpart,
          startDateTime: dateTimeLocalToISO(testForm.startDateTime),
          endDateTime: dateTimeLocalToISO(testForm.endDateTime),
          durationMinutes: testForm.durationMinutes,
          instructions: testForm.instructions,
          totalMarks,
          isNegativeMarking: testForm.isNegativeMarking,
          randomizeQuestions: testForm.randomizeQuestions,
          status: testForm.status,
          questions: formQuestions,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update examination.");
      onSaved();
      onClose();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="admin-modal-backdrop">
        <div className="admin-modal admin-modal-lg">
          <p className="admin-loading">Loading examination…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-modal-backdrop" onClick={onClose}>
      <div className="admin-modal admin-modal-lg admin-exam-editor" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal-header">
          <div>
            <h2 className="admin-subhead">Edit examination</h2>
            <p className="admin-muted">Created by {teacherName} · Admin can view and update only (no new exams)</p>
          </div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
            Close
          </button>
        </div>

        {error ? <p className="admin-error">{error}</p> : null}
        {hasSubmissions ? (
          <p className="admin-cbt-fullscreen-error" role="alert">
            This test has student attempts or submissions — editing is locked. You can still track live attempts and results.
          </p>
        ) : null}

        <div className="admin-form-grid-two">
          <div className="form-field">
            <label>Test name</label>
            <input
              type="text"
              value={testForm.testName}
              disabled={hasSubmissions}
              onChange={(e) => setTestForm({ ...testForm, testName: e.target.value })}
            />
          </div>
          <div className="form-field">
            <label>Module</label>
            <input type="text" value={`${testForm.subject} — ${testForm.subpart}`} readOnly disabled />
          </div>
          <div className="form-field">
            <label>Start</label>
            <input
              type="datetime-local"
              value={testForm.startDateTime}
              disabled={hasSubmissions}
              onChange={(e) => setTestForm({ ...testForm, startDateTime: e.target.value })}
            />
          </div>
          <div className="form-field">
            <label>End</label>
            <input
              type="datetime-local"
              value={testForm.endDateTime}
              disabled={hasSubmissions}
              onChange={(e) => setTestForm({ ...testForm, endDateTime: e.target.value })}
            />
          </div>
          <div className="form-field">
            <label>Duration (minutes)</label>
            <input
              type="number"
              min={5}
              value={testForm.durationMinutes}
              disabled={hasSubmissions}
              onChange={(e) => setTestForm({ ...testForm, durationMinutes: Number(e.target.value) })}
            />
          </div>
          <div className="form-field">
            <label>Status</label>
            <select
              value={testForm.status}
              disabled={hasSubmissions}
              onChange={(e) => setTestForm({ ...testForm, status: e.target.value as "Draft" | "Published" })}
            >
              <option value="Draft">Draft</option>
              <option value="Published">Published</option>
            </select>
          </div>
          <div className="form-field admin-field-full">
            <label>Instructions</label>
            <textarea
              rows={4}
              value={testForm.instructions}
              disabled={hasSubmissions}
              onChange={(e) => setTestForm({ ...testForm, instructions: e.target.value })}
            />
          </div>
        </div>

        <div className="admin-notice-checks">
          <label>
            <input
              type="checkbox"
              checked={testForm.isNegativeMarking}
              disabled={hasSubmissions}
              onChange={(e) => setTestForm({ ...testForm, isNegativeMarking: e.target.checked })}
            />
            Negative marking
          </label>
          <label>
            <input
              type="checkbox"
              checked={testForm.randomizeQuestions}
              disabled={hasSubmissions}
              onChange={(e) => setTestForm({ ...testForm, randomizeQuestions: e.target.checked })}
            />
            Randomize questions
          </label>
        </div>

        <div className="admin-application-toolbar">
          <h3 className="admin-subhead">Questions ({formQuestions.length})</h3>
          {!hasSubmissions ? (
            <>
              <label className="btn btn-secondary btn-sm teacher-file-btn">
                Upload CSV
                <input type="file" accept=".csv" onChange={handleCSVUpload} hidden />
              </label>
              <button type="button" className="btn btn-green btn-sm" onClick={() => openQuestionModal()}>
                + Add question
              </button>
            </>
          ) : null}
        </div>

        {formQuestions.length === 0 ? (
          <p className="admin-empty">No questions.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Question</th>
                  <th>Type</th>
                  <th>Marks</th>
                  {!hasSubmissions ? <th></th> : null}
                </tr>
              </thead>
              <tbody>
                {formQuestions.map((q, idx) => (
                  <tr key={idx}>
                    <td>{idx + 1}</td>
                    <td className="teacher-q-preview">{q.questionText}</td>
                    <td>{q.questionType}</td>
                    <td>{q.negativeMarks > 0 ? `+${q.marks} / −${q.negativeMarks}` : `+${q.marks}`}</td>
                    {!hasSubmissions ? (
                      <td>
                        <IconActionGroup>
                          <IconActionButton
                            icon="edit"
                            label="Edit question"
                            variant="neutral"
                            size="sm"
                            onClick={() => openQuestionModal(idx)}
                          />
                          <IconActionButton
                            icon="delete"
                            label="Remove question"
                            variant="danger"
                            size="sm"
                            onClick={() => setFormQuestions(formQuestions.filter((_, i) => i !== idx))}
                          />
                        </IconActionGroup>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="admin-filters-actions">
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
            Cancel
          </button>
          {!hasSubmissions ? (
            <button type="button" className="btn btn-green btn-sm" onClick={() => void handleSave()} disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </button>
          ) : null}
        </div>

        {showQuestionModal ? (
          <div className="admin-modal-backdrop admin-modal-backdrop--nested" onClick={closeQuestionModal}>
            <div className="admin-modal admin-modal-sm" onClick={(e) => e.stopPropagation()}>
              <div className="admin-modal-header">
                <h2 className="admin-subhead">{editingQuestionIndex !== null ? "Edit question" : "Add question"}</h2>
                <button type="button" className="btn btn-secondary btn-sm" onClick={closeQuestionModal}>
                  Close
                </button>
              </div>
              <div className="form-field">
                <label>Question text</label>
                <textarea
                  rows={3}
                  value={currentQForm.questionText}
                  onChange={(e) => setCurrentQForm({ ...currentQForm, questionText: e.target.value })}
                />
              </div>
              <div className="form-field">
                <label>Type</label>
                <select
                  value={currentQForm.questionType}
                  onChange={(e) =>
                    setCurrentQForm({
                      ...currentQForm,
                      questionType: e.target.value as "Single Correct" | "Multiple Correct" | "Integer Type",
                    })
                  }
                >
                  <option value="Single Correct">Single Correct</option>
                  <option value="Multiple Correct">Multiple Correct</option>
                  <option value="Integer Type">Integer Type</option>
                </select>
              </div>
              {currentQForm.questionType === "Integer Type" ? (
                <div className="form-field">
                  <label>Correct integer answer</label>
                  <input
                    type="number"
                    value={currentQForm.correctIntegerAnswer}
                    onChange={(e) => setCurrentQForm({ ...currentQForm, correctIntegerAnswer: e.target.value })}
                  />
                </div>
              ) : (
                currentQForm.options.map((opt, idx) => (
                  <div key={idx} className="form-field admin-option-row">
                    <label>
                      <input
                        type="checkbox"
                        checked={opt.isCorrect}
                        onChange={(e) => {
                          const newOpts = [...currentQForm.options];
                          if (currentQForm.questionType === "Single Correct") {
                            newOpts.forEach((o, i) => {
                              o.isCorrect = i === idx;
                            });
                          } else {
                            newOpts[idx] = { ...newOpts[idx], isCorrect: e.target.checked };
                          }
                          setCurrentQForm({ ...currentQForm, options: newOpts });
                        }}
                      />
                      Option {idx + 1}
                    </label>
                    <input
                      type="text"
                      value={opt.text}
                      onChange={(e) => {
                        const newOpts = [...currentQForm.options];
                        newOpts[idx] = { ...newOpts[idx], text: e.target.value };
                        setCurrentQForm({ ...currentQForm, options: newOpts });
                      }}
                    />
                  </div>
                ))
              )}
              <div className="admin-form-grid-two">
                <div className="form-field">
                  <label>Marks</label>
                  <input
                    type="number"
                    min={1}
                    value={currentQForm.marks}
                    onChange={(e) => setCurrentQForm({ ...currentQForm, marks: Number(e.target.value) })}
                  />
                </div>
                <div className="form-field">
                  <label>Negative marks</label>
                  <input
                    type="number"
                    min={0}
                    value={currentQForm.negativeMarks}
                    onChange={(e) => setCurrentQForm({ ...currentQForm, negativeMarks: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="admin-filters-actions">
                <button type="button" className="btn btn-green btn-sm" onClick={saveManualQuestion}>
                  Save question
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
