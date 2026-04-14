"use client";

import { useState, useRef } from "react";

type PreviewRow = { name: string; email: string };

type UploadResult = {
  ok: boolean;
  created: number;
  alreadyExists: number;
  errors: string[];
  total: number;
};

function previewCSV(text: string): PreviewRow[] {
  const lines = text.trim().split("\n").filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0]
    .split(",")
    .map((h) => h.trim().toLowerCase().replace(/"/g, ""));
  const nameIdx = headers.findIndex((h) =>
    ["name", "full name", "student name"].includes(h)
  );
  const emailIdx = headers.findIndex((h) =>
    ["email", "email address"].includes(h)
  );
  if (nameIdx === -1 || emailIdx === -1) return [];
  return lines
    .slice(1, 6)
    .map((line) => {
      const cols = line.split(",").map((c) => c.trim().replace(/"/g, ""));
      return { name: cols[nameIdx] ?? "", email: cols[emailIdx] ?? "" };
    })
    .filter((r) => r.name && r.email);
}

function countCSVRows(text: string): number {
  const lines = text.trim().split("\n").filter(Boolean);
  if (lines.length < 2) return 0;
  const headers = lines[0]
    .split(",")
    .map((h) => h.trim().toLowerCase().replace(/"/g, ""));
  const nameIdx = headers.findIndex((h) =>
    ["name", "full name", "student name"].includes(h)
  );
  const emailIdx = headers.findIndex((h) =>
    ["email", "email address"].includes(h)
  );
  if (nameIdx === -1 || emailIdx === -1) return 0;
  return lines
    .slice(1)
    .map((line) => {
      const cols = line.split(",").map((c) => c.trim().replace(/"/g, ""));
      return { name: cols[nameIdx] ?? "", email: cols[emailIdx] ?? "" };
    })
    .filter((r) => r.name && r.email && r.email.includes("@")).length;
}

function downloadTemplate() {
  const csv =
    "name,email\nJane Smith,jane.smith@university.edu\nJohn Doe,john.doe@university.edu";
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "enrollment_template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export function BulkEnrollForm() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [totalRows, setTotalRows] = useState<number>(0);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [password, setPassword] = useState("InterviewPrep2025!");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [result, setResult] = useState<UploadResult | null>(null);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
    setResult(null);
    setNetworkError(null);
    setStatus("idle");
    setCsvError(null);

    if (!selected) {
      setPreview([]);
      setTotalRows(0);
      return;
    }

    if (!selected.name.endsWith(".csv")) {
      setCsvError("Please upload a .csv file.");
      setPreview([]);
      setTotalRows(0);
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const rows = previewCSV(text);
      const count = countCSVRows(text);

      if (count === 0) {
        setCsvError(
          "No valid rows found. Make sure your CSV has 'name' and 'email' columns."
        );
        setPreview([]);
        setTotalRows(0);
      } else {
        setPreview(rows);
        setTotalRows(count);
      }
    };
    reader.readAsText(selected);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || totalRows === 0) return;

    setStatus("uploading");
    setNetworkError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("defaultPassword", password);

      const res = await fetch("/api/admin/enroll-csv", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setNetworkError(data.error ?? `Server error (${res.status})`);
        setStatus("error");
        return;
      }

      setResult(data);
      setStatus("done");
    } catch (err: any) {
      setNetworkError(err?.message ?? "Network error. Please try again.");
      setStatus("error");
    }
  }

  function reset() {
    setFile(null);
    setPreview([]);
    setTotalRows(0);
    setCsvError(null);
    setResult(null);
    setNetworkError(null);
    setStatus("idle");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div
      style={{
        borderRadius: 22,
        border: "1px solid var(--card-border-soft)",
        background:
          "linear-gradient(180deg, var(--card-bg-strong), var(--card-bg))",
        boxShadow: "var(--shadow-card-soft)",
        backdropFilter: "blur(8px)",
        overflow: "hidden",
      }}
    >
      {/* Collapsible header */}
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 20px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 900,
              letterSpacing: 0.7,
              color: "var(--accent)",
              textTransform: "uppercase",
            }}
          >
            Enrollment
          </div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 800,
              color: "var(--text-primary)",
              letterSpacing: -0.2,
            }}
          >
            Enroll Students via CSV
          </div>
        </div>
        <div
          style={{
            fontSize: 18,
            color: "var(--text-muted)",
            lineHeight: 1,
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease",
          }}
        >
          ▾
        </div>
      </button>

      {/* Collapsible body */}
      {isOpen && (
        <div
          style={{
            padding: "0 20px 20px",
            display: "grid",
            gap: 16,
          }}
        >
          {/* Template download */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 13,
                color: "var(--text-muted)",
                lineHeight: 1.5,
              }}
            >
              Upload a CSV with{" "}
              <code
                style={{
                  fontSize: 12,
                  background: "var(--card-border-soft)",
                  padding: "1px 5px",
                  borderRadius: 5,
                  color: "var(--text-primary)",
                }}
              >
                name
              </code>{" "}
              and{" "}
              <code
                style={{
                  fontSize: 12,
                  background: "var(--card-border-soft)",
                  padding: "1px 5px",
                  borderRadius: 5,
                  color: "var(--text-primary)",
                }}
              >
                email
              </code>{" "}
              columns. Maximum 500 students per upload.
            </p>
            <button
              type="button"
              onClick={downloadTemplate}
              style={{
                padding: "8px 14px",
                borderRadius: 999,
                border: "1px solid var(--card-border)",
                background: "var(--card-bg)",
                color: "var(--text-primary)",
                fontSize: 12,
                fontWeight: 800,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              Download Template
            </button>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "grid", gap: 14 }}>
            {/* File input */}
            <div style={{ display: "grid", gap: 6 }}>
              <label
                style={{
                  fontSize: 11,
                  fontWeight: 900,
                  letterSpacing: 0.55,
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                }}
              >
                CSV File
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                disabled={status === "uploading"}
                style={{
                  fontSize: 13,
                  color: "var(--text-primary)",
                  background: "var(--input-bg)",
                  border: "1px solid var(--input-border)",
                  borderRadius: "var(--radius-lg)",
                  padding: "10px 12px",
                  cursor: "pointer",
                  width: "100%",
                  boxSizing: "border-box",
                }}
              />
              {csvError && (
                <p
                  style={{
                    margin: 0,
                    fontSize: 12,
                    color: "var(--danger)",
                    fontWeight: 700,
                  }}
                >
                  {csvError}
                </p>
              )}
            </div>

            {/* CSV preview */}
            {preview.length > 0 && !csvError && (
              <div
                style={{
                  padding: 14,
                  borderRadius: 14,
                  border: "1px solid var(--card-border-soft)",
                  background: "var(--card-bg)",
                  display: "grid",
                  gap: 8,
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 900,
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                    letterSpacing: 0.55,
                  }}
                >
                  Preview - {totalRows} student{totalRows !== 1 ? "s" : ""}{" "}
                  found
                </div>
                <div style={{ display: "grid", gap: 6 }}>
                  {preview.map((row, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        gap: 10,
                        fontSize: 12,
                        color: "var(--text-primary)",
                      }}
                    >
                      <span style={{ fontWeight: 800, minWidth: 140 }}>
                        {row.name}
                      </span>
                      <span style={{ color: "var(--text-muted)" }}>
                        {row.email}
                      </span>
                    </div>
                  ))}
                  {totalRows > 5 && (
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--text-muted)",
                        fontStyle: "italic",
                      }}
                    >
                      ...and {totalRows - 5} more
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Default password */}
            <div style={{ display: "grid", gap: 6 }}>
              <label
                style={{
                  fontSize: 11,
                  fontWeight: 900,
                  letterSpacing: 0.55,
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                }}
              >
                Default Password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={status === "uploading"}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    fontSize: 13,
                    color: "var(--text-primary)",
                    background: "var(--input-bg)",
                    border: "1px solid var(--input-border)",
                    borderRadius: "var(--radius-lg)",
                    padding: "10px 44px 10px 12px",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  style={{
                    position: "absolute",
                    right: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 11,
                    fontWeight: 800,
                    color: "var(--text-muted)",
                    padding: "4px 6px",
                  }}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: 11,
                  color: "var(--text-muted)",
                  lineHeight: 1.4,
                }}
              >
                Students can change their password after logging in.
              </p>
            </div>

            {/* Submit + status */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <button
                type="submit"
                disabled={
                  !file ||
                  totalRows === 0 ||
                  !!csvError ||
                  status === "uploading"
                }
                style={{
                  padding: "11px 22px",
                  borderRadius: 999,
                  border: "none",
                  background:
                    !file || totalRows === 0 || !!csvError || status === "uploading"
                      ? "var(--card-border-soft)"
                      : "var(--accent)",
                  color:
                    !file || totalRows === 0 || !!csvError || status === "uploading"
                      ? "var(--text-muted)"
                      : "#fff",
                  fontSize: 13,
                  fontWeight: 900,
                  cursor:
                    !file || totalRows === 0 || !!csvError || status === "uploading"
                      ? "not-allowed"
                      : "pointer",
                  letterSpacing: 0.1,
                  transition: "background 0.15s",
                }}
              >
                {status === "uploading"
                  ? "Enrolling..."
                  : `Enroll ${totalRows > 0 ? totalRows : ""} Student${
                      totalRows !== 1 ? "s" : ""
                    }`}
              </button>

              {status === "done" && result && (
                <button
                  type="button"
                  onClick={reset}
                  style={{
                    padding: "11px 18px",
                    borderRadius: 999,
                    border: "1px solid var(--card-border)",
                    background: "transparent",
                    color: "var(--text-muted)",
                    fontSize: 12,
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  Upload Another
                </button>
              )}
            </div>

            {/* Upload progress indicator */}
            {status === "uploading" && (
              <div
                style={{
                  padding: "12px 16px",
                  borderRadius: "var(--radius-lg)",
                  border: "1px solid var(--card-border-soft)",
                  background: "var(--card-bg)",
                  fontSize: 13,
                  color: "var(--text-muted)",
                  fontWeight: 700,
                }}
              >
                Uploading and enrolling students, please wait...
              </div>
            )}

            {/* Success result */}
            {status === "done" && result && (
              <div
                style={{
                  padding: "14px 16px",
                  borderRadius: 14,
                  border: "1px solid var(--success)",
                  background: "var(--success-soft, var(--card-bg))",
                  display: "grid",
                  gap: 6,
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 900,
                    color: "var(--success)",
                  }}
                >
                  Enrollment complete
                </div>
                <div style={{ fontSize: 13, color: "var(--text-primary)" }}>
                  {result.created > 0 && (
                    <span>
                      <strong>{result.created}</strong> new student
                      {result.created !== 1 ? "s" : ""} enrolled
                      {result.alreadyExists > 0 || result.errors.length > 0
                        ? ", "
                        : "."}
                    </span>
                  )}
                  {result.alreadyExists > 0 && (
                    <span>
                      <strong>{result.alreadyExists}</strong> already existed
                      {result.errors.length > 0 ? ", " : "."}
                    </span>
                  )}
                  {result.errors.length > 0 && (
                    <span>
                      <strong style={{ color: "var(--danger)" }}>
                        {result.errors.length}
                      </strong>{" "}
                      error{result.errors.length !== 1 ? "s" : ""}.
                    </span>
                  )}
                </div>
                {result.errors.length > 0 && (
                  <div
                    style={{
                      marginTop: 6,
                      display: "grid",
                      gap: 4,
                    }}
                  >
                    {result.errors.map((err, i) => (
                      <div
                        key={i}
                        style={{
                          fontSize: 12,
                          color: "var(--danger)",
                          fontWeight: 600,
                        }}
                      >
                        {err}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Network / server error */}
            {status === "error" && networkError && (
              <div
                style={{
                  padding: "12px 16px",
                  borderRadius: "var(--radius-lg)",
                  border: "1px solid var(--danger)",
                  background: "var(--danger-soft, var(--card-bg))",
                  fontSize: 13,
                  color: "var(--danger)",
                  fontWeight: 700,
                }}
              >
                {networkError}
              </div>
            )}
          </form>
        </div>
      )}
    </div>
  );
}
