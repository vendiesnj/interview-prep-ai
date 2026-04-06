"use client";

import type { NaceScore } from "./nace";
import { naceScoreLabel } from "./nace";

/**
 * Generates a one-page NACE Career Readiness PDF report and triggers download.
 * Uses jsPDF (client-side only).
 */
export async function downloadNacePdf(opts: {
  scores: NaceScore[];
  studentName?: string;
  institutionName?: string;
  generatedDate?: string;
}) {
  const { jsPDF } = await import("jspdf");

  const {
    scores,
    studentName = "Student",
    institutionName = "Your Institution",
    generatedDate = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
  } = opts;

  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });
  const W = 612; // letter width in pts
  const margin = 48;
  const contentWidth = W - margin * 2;

  // ── Color helpers ──────────────────────────────────────────────────────────
  const colorMap: Record<string, [number, number, number]> = {
    "#10B981": [16, 185, 129],
    "#2563EB": [37, 99, 235],
    "#F59E0B": [245, 158, 11],
    "#EF4444": [239, 68, 68],
    "#6B7280": [107, 114, 128],
  };
  function scoreRGB(score: number | null): [number, number, number] {
    if (score === null) return colorMap["#6B7280"];
    if (score >= 80) return colorMap["#10B981"];
    if (score >= 65) return colorMap["#2563EB"];
    if (score >= 50) return colorMap["#F59E0B"];
    return colorMap["#EF4444"];
  }

  let y = margin;

  // ── Header band ──────────────────────────────────────────────────────────
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, W, 80, "F");

  // Signal logo area (circle + text)
  doc.setFillColor(255, 255, 255);
  doc.circle(margin + 14, 40, 14, "F");
  doc.setTextColor(37, 99, 235);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("S", margin + 10, 44);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Signal", margin + 34, 44);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Career Readiness Platform", margin + 34, 57);

  // NACE badge (right side)
  doc.setFillColor(255, 255, 255, 0.15 as any);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("NACE CAREER READINESS FRAMEWORK", W - margin, 38, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text("naceweb.org/career-readiness/competencies/", W - margin, 50, { align: "right" });

  y = 100;

  // ── Title section ─────────────────────────────────────────────────────────
  doc.setTextColor(20, 20, 20);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("Career Readiness Report", margin, y);
  y += 20;

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text(`Student: ${studentName}`, margin, y);
  doc.text(`Institution: ${institutionName}`, W / 2, y);
  y += 16;
  doc.text(`Generated: ${generatedDate}`, margin, y);
  y += 24;

  // Thin rule
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.5);
  doc.line(margin, y, W - margin, y);
  y += 20;

  // ── Intro text ──────────────────────────────────────────────────────────
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  const intro =
    "This report maps demonstrated competencies to the eight NACE Career Readiness competency areas. " +
    "Scores are derived from practice session performance, aptitude assessment, and career profile data. " +
    "Scores below 50 indicate emerging skill; 50–64 emerging; 65–79 developing; 80+ strong.";
  const introLines = doc.splitTextToSize(intro, contentWidth);
  doc.text(introLines, margin, y);
  y += introLines.length * 12 + 12;

  // ── Competency rows ──────────────────────────────────────────────────────
  const rowHeight = 44;
  const barX = margin + 180;
  const barW = contentWidth - 180 - 60;

  for (const ns of scores) {
    const [r, g, b] = scoreRGB(ns.score);
    const scoreDisplay = ns.score !== null ? ns.score : "-";
    const label = naceScoreLabel(ns.score);
    const pct = ns.score !== null ? ns.score / 100 : 0;

    // Row background (alternating)
    const rowIdx = scores.indexOf(ns);
    if (rowIdx % 2 === 0) {
      doc.setFillColor(248, 249, 251);
      doc.rect(margin - 8, y - 8, contentWidth + 16, rowHeight, "F");
    }

    // Score circle
    doc.setFillColor(r, g, b);
    doc.circle(margin + 16, y + 12, 16, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(ns.score !== null ? 11 : 14);
    doc.setFont("helvetica", "bold");
    const scoreStr = String(scoreDisplay);
    const scoreX = ns.score !== null ? margin + 16 - (scoreStr.length > 2 ? 8 : 5) : margin + 13;
    doc.text(scoreStr, scoreX, y + 16);

    // Competency name
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(ns.label, margin + 38, y + 8);

    // Label (Strong / Developing / etc.)
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(r, g, b);
    doc.text(label, margin + 38, y + 20);

    // Bar track
    doc.setFillColor(230, 232, 236);
    doc.roundedRect(barX, y + 6, barW, 10, 5, 5, "F");

    // Bar fill
    if (pct > 0) {
      doc.setFillColor(r, g, b);
      doc.roundedRect(barX, y + 6, barW * pct, 10, 5, 5, "F");
    }

    // Percentage text (right of bar)
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(ns.score !== null ? `${ns.score}%` : "-", barX + barW + 8, y + 15);

    y += rowHeight;
  }

  y += 16;

  // ── Footer ───────────────────────────────────────────────────────────────
  const footerY = 750;
  doc.setDrawColor(220, 220, 220);
  doc.line(margin, footerY, W - margin, footerY);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(150, 150, 150);
  doc.text(
    "Generated by Signal Career Readiness Platform  |  Competency framework: NACE Career Readiness (naceweb.org)  |  For accreditation and advising use.",
    W / 2,
    footerY + 14,
    { align: "center" }
  );
  doc.text(`Page 1  |  ${generatedDate}`, W / 2, footerY + 26, { align: "center" });

  // ── Save ─────────────────────────────────────────────────────────────────
  const safeName = studentName.replace(/[^a-zA-Z0-9]/g, "_");
  doc.save(`NACE_Career_Readiness_${safeName}.pdf`);
}
