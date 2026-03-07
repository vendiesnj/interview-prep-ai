"use client";

import React, { useEffect, useMemo, useState } from "react";
import PremiumShell from "@/app/components/PremiumShell";
import PremiumCard from "@/app/components/PremiumCard";
import {
  clearActiveJobProfileId,
  deleteJobProfile,
  getActiveJobProfileId,
  getJobProfiles,
  setActiveJobProfileId,
  upsertJobProfile,
  type JobProfile,
} from "@/app/lib/jobProfiles";

function formatDate(ts?: number) {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleDateString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

export default function JobProfilesPage() {
  const [profiles, setProfiles] = useState<JobProfile[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [roleType, setRoleType] = useState("");
  const [jobDescription, setJobDescription] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);

  function reload() {
    setProfiles(getJobProfiles());
    setActiveId(getActiveJobProfileId());
  }

  useEffect(() => {
    reload();
  }, []);

  const sortedProfiles = useMemo(() => {
    return [...profiles].sort((a, b) => b.updatedAt - a.updatedAt);
  }, [profiles]);

  function resetForm() {
    setEditingId(null);
    setTitle("");
    setCompany("");
    setRoleType("");
    setJobDescription("");
  }

  function handleSave() {
    const trimmedTitle = title.trim();
    const trimmedDesc = jobDescription.trim();

    if (!trimmedTitle || !trimmedDesc) return;

    const saved = upsertJobProfile({
      id: editingId ?? undefined,
      title: trimmedTitle,
      company: company.trim(),
      roleType: roleType.trim(),
      jobDescription: trimmedDesc,
    });

    if (!activeId) {
      setActiveJobProfileId(saved.id);
    }

    resetForm();
    reload();
  }

  function handleEdit(profile: JobProfile) {
    setEditingId(profile.id);
    setTitle(profile.title);
    setCompany(profile.company ?? "");
    setRoleType(profile.roleType ?? "");
    setJobDescription(profile.jobDescription);
  }

  function handleDelete(id: string) {
    deleteJobProfile(id);
    if (editingId === id) {
      resetForm();
    }
    reload();
  }

  function handleSetActive(id: string) {
    setActiveJobProfileId(id);
    reload();
  }

  function handleClearActive() {
    clearActiveJobProfileId();
    reload();
  }

  return (
    <PremiumShell
      title="Job Profiles"
      subtitle="Save target roles once, reuse them in practice, and build role-specific interview analytics over time."
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 420px) minmax(0, 1fr)",
          gap: 18,
          alignItems: "start",
        }}
      >
        <PremiumCard>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 950,
                  color: "var(--text-primary)",
                }}
              >
                {editingId ? "Edit profile" : "Create profile"}
              </div>
              <div
                style={{
                  marginTop: 6,
                  fontSize: 13,
                  lineHeight: 1.6,
                  color: "var(--text-muted)",
                }}
              >
                Add a target role so users can practice in context instead of starting from scratch every time.
              </div>
            </div>

            {editingId ? (
              <button
                type="button"
                onClick={resetForm}
                style={{
                  padding: "10px 12px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--card-border)",
                  background: "var(--card-bg)",
                  color: "var(--text-primary)",
                  fontWeight: 900,
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                Cancel edit
              </button>
            ) : null}
          </div>

          <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
            <div style={{ display: "grid", gap: 6 }}>
              <label
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  color: "var(--text-muted)",
                  letterSpacing: 0.2,
                }}
              >
                Job title
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Supply Chain Analyst"
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--input-border)",
                  background: "var(--input-bg)",
                  color: "var(--text-primary)",
                  outline: "none",
                  fontSize: 14,
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
              }}
            >
              <div style={{ display: "grid", gap: 6 }}>
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    color: "var(--text-muted)",
                    letterSpacing: 0.2,
                  }}
                >
                  Company
                </label>
                <input
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="e.g., Apple"
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--input-border)",
                    background: "var(--input-bg)",
                    color: "var(--text-primary)",
                    outline: "none",
                    fontSize: 14,
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div style={{ display: "grid", gap: 6 }}>
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    color: "var(--text-muted)",
                    letterSpacing: 0.2,
                  }}
                >
                  Role type
                </label>
                <input
                  value={roleType}
                  onChange={(e) => setRoleType(e.target.value)}
                  placeholder="e.g., Operations, PM, Finance"
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--input-border)",
                    background: "var(--input-bg)",
                    color: "var(--text-primary)",
                    outline: "none",
                    fontSize: 14,
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            <div style={{ display: "grid", gap: 6 }}>
              <label
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  color: "var(--text-muted)",
                  letterSpacing: 0.2,
                }}
              >
                Job description
              </label>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the full role description here..."
                rows={12}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: "var(--radius-lg)",
                  border: "1px solid var(--input-border)",
                  background: "var(--input-bg)",
                  color: "var(--text-primary)",
                  outline: "none",
                  fontSize: 14,
                  lineHeight: 1.55,
                  resize: "vertical",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                onClick={handleSave}
                disabled={!title.trim() || !jobDescription.trim()}
                style={{
                  padding: "12px 14px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--accent-strong)",
                  background:
                    !title.trim() || !jobDescription.trim()
                      ? "var(--card-bg)"
                      : "var(--accent-soft)",
                  color:
                    !title.trim() || !jobDescription.trim()
                      ? "var(--text-muted)"
                      : "var(--accent)",
                  fontWeight: 900,
                  cursor:
                    !title.trim() || !jobDescription.trim()
                      ? "not-allowed"
                      : "pointer",
                  fontSize: 13,
                  boxShadow:
                    !title.trim() || !jobDescription.trim()
                      ? "none"
                      : "var(--shadow-card-soft)",
                }}
              >
                {editingId ? "Save changes" : "Create profile"}
              </button>

              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                Required: title + job description
              </div>
            </div>
          </div>
        </PremiumCard>

        <div style={{ display: "grid", gap: 14 }}>
          <PremiumCard>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 950,
                    color: "var(--text-primary)",
                  }}
                >
                  Saved profiles
                </div>
                <div
                  style={{
                    marginTop: 6,
                    fontSize: 13,
                    lineHeight: 1.6,
                    color: "var(--text-muted)",
                  }}
                >
                  These are the roles that will eventually power profile-based practice, filtering, and insights.
                </div>
              </div>

              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                {sortedProfiles.length} total
              </div>
            </div>

            {activeId ? (
              <div
                style={{
                  marginTop: 14,
                  padding: 12,
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--accent-strong)",
                  background: "var(--accent-soft)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 900,
                      letterSpacing: 0.3,
                      color: "var(--accent)",
                    }}
                  >
                    ACTIVE PROFILE
                  </div>
                  <div
                    style={{
                      marginTop: 4,
                      fontSize: 14,
                      color: "var(--text-primary)",
                      fontWeight: 900,
                    }}
                  >
                    {sortedProfiles.find((p) => p.id === activeId)?.title ?? "Selected"}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleClearActive}
                  style={{
                    padding: "10px 12px",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--card-border)",
                    background: "var(--card-bg)",
                    color: "var(--text-primary)",
                    fontWeight: 900,
                    cursor: "pointer",
                    fontSize: 13,
                  }}
                >
                  Clear active
                </button>
              </div>
            ) : null}

            <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
              {sortedProfiles.length === 0 ? (
                <div
                  style={{
                    padding: 14,
                    borderRadius: "var(--radius-lg)",
                    border: "1px solid var(--card-border)",
                    background: "var(--card-bg)",
                    color: "var(--text-muted)",
                    lineHeight: 1.6,
                  }}
                >
                  No job profiles yet. Create your first one on the left, then we’ll wire it into Practice next.
                </div>
              ) : (
                sortedProfiles.map((profile) => {
                  const isActive = profile.id === activeId;

                  return (
                    <div
                      key={profile.id}
                      style={{
                        padding: 14,
                        borderRadius: "var(--radius-lg)",
                        border: isActive
                          ? "1px solid var(--accent-strong)"
                          : "1px solid var(--card-border)",
                        background: isActive ? "var(--accent-soft)" : "var(--card-bg)",
                        boxShadow: isActive ? "var(--shadow-card-soft)" : "none",
                        display: "grid",
                        gap: 10,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          gap: 12,
                          flexWrap: "wrap",
                        }}
                      >
                        <div style={{ minWidth: 0, flex: "1 1 auto" }}>
                          <div
                            style={{
                              display: "flex",
                              gap: 8,
                              alignItems: "center",
                              flexWrap: "wrap",
                            }}
                          >
                            <div
                              style={{
                                fontSize: 16,
                                fontWeight: 950,
                                color: isActive ? "var(--accent)" : "var(--text-primary)",
                              }}
                            >
                              {profile.title}
                            </div>

                            {isActive ? (
                              <span
                                style={{
                                  padding: "3px 8px",
                                  borderRadius: 999,
                                  border: "1px solid var(--accent-strong)",
                                  color: "var(--accent)",
                                  fontSize: 11,
                                  fontWeight: 900,
                                  letterSpacing: 0.3,
                                }}
                              >
                                ACTIVE
                              </span>
                            ) : null}
                          </div>

                          <div
                            style={{
                              marginTop: 6,
                              display: "flex",
                              gap: 8,
                              flexWrap: "wrap",
                              alignItems: "center",
                              color: "var(--text-muted)",
                              fontSize: 12,
                            }}
                          >
                            {profile.company ? (
                              <span
                                style={{
                                  padding: "3px 8px",
                                  borderRadius: 999,
                                  border: "1px solid var(--card-border)",
                                }}
                              >
                                {profile.company}
                              </span>
                            ) : null}

                            {profile.roleType ? (
                              <span
                                style={{
                                  padding: "3px 8px",
                                  borderRadius: 999,
                                  border: "1px solid var(--card-border)",
                                }}
                              >
                                {profile.roleType}
                              </span>
                            ) : null}

                            <span>Updated {formatDate(profile.updatedAt)}</span>
                          </div>
                        </div>

                        <div
                          style={{
                            display: "flex",
                            gap: 8,
                            flexWrap: "wrap",
                            justifyContent: "flex-end",
                          }}
                        >
                          {!isActive ? (
                            <button
                              type="button"
                              onClick={() => handleSetActive(profile.id)}
                              style={{
                                padding: "8px 10px",
                                borderRadius: "var(--radius-md)",
                                border: "1px solid var(--accent-strong)",
                                background: "var(--accent-soft)",
                                color: "var(--accent)",
                                fontWeight: 900,
                                cursor: "pointer",
                                fontSize: 12,
                                whiteSpace: "nowrap",
                              }}
                            >
                              Set active
                            </button>
                          ) : null}

                          <button
                            type="button"
                            onClick={() => handleEdit(profile)}
                            style={{
                              padding: "8px 10px",
                              borderRadius: "var(--radius-md)",
                              border: "1px solid var(--card-border)",
                              background: "var(--card-bg-strong)",
                              color: "var(--text-primary)",
                              fontWeight: 900,
                              cursor: "pointer",
                              fontSize: 12,
                              whiteSpace: "nowrap",
                            }}
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(profile.id)}
                            style={{
                              padding: "8px 10px",
                              borderRadius: "var(--radius-md)",
                              border: "1px solid color-mix(in srgb, var(--danger) 35%, transparent)",
                              background: "var(--danger-soft)",
                              color: "var(--danger)",
                              fontWeight: 900,
                              cursor: "pointer",
                              fontSize: 12,
                              whiteSpace: "nowrap",
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      <div
                        style={{
                          fontSize: 13,
                          lineHeight: 1.6,
                          color: "var(--text-muted)",
                          display: "-webkit-box",
                          WebkitLineClamp: 4,
                          WebkitBoxOrient: "vertical" as const,
                          overflow: "hidden",
                        }}
                      >
                        {profile.jobDescription}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </PremiumCard>
        </div>
      </div>
    </PremiumShell>
  );
}