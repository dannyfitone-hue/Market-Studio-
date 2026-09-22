"use client";

import { uploadProjectFile } from "../../lib/upload-client";
import { useEffect, useMemo, useState } from "react";
import { CircleDollarSign, Clock3, FileCheck2, FolderOpen, Save, Search, Upload, Users } from "lucide-react";
import { productionStages, statusLabel } from "../../lib/project-workflow";

type Asset = { id: string; kind: string; file_name: string };
type Project = {
  id: string; business_name: string; title: string; service: string; status: string; payment_status: string;
  due_end: string | null; due_this_week?: number; created_at: string; client_email?: string; client_name?: string;
  brief_json: string; client_note: string | null; internal_note: string | null; assets: Asset[];
};
type EditState = { status: string; paymentStatus: string; clientNote: string; internalNote: string };

const statusOptions = [
  { id: "awaiting_payment", label: "Payment required" },
  ...productionStages.map((stage) => ({ id: stage.id, label: stage.label })),
];

function parseBrief(value: string) {
  try { return JSON.parse(value || "{}") as Record<string, string>; } catch { return {}; }
}

export function CRMList({ stripeReady }: { stripeReady: boolean }) {
  const [items, setItems] = useState<Project[] | null>(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [edits, setEdits] = useState<Record<string, EditState>>({});

  const load = async () => {
    const response = await fetch("/api/projects?scope=all");
    const data = await response.json();
    if(!response.ok)throw new Error(data.error || "Could not load projects.");
    const projects = (data.projects || []) as Project[];
    setItems(projects);
    setEdits(Object.fromEntries(projects.map((project) => [project.id, {
      status: project.status === "queued" ? "intake_review" : project.status === "review" ? "client_review" : project.status,
      paymentStatus: project.payment_status,
      clientNote: project.client_note || "",
      internalNote: project.internal_note || "",
    }])));
  };
  useEffect(() => {
    fetch("/api/projects?scope=all")
      .then(async(response) => {const data=await response.json();if(!response.ok)throw new Error(data.error || "Could not load projects.");return data;})
      .then((data) => {
        const projects = (data.projects || []) as Project[];
        setItems(projects);
        setEdits(Object.fromEntries(projects.map((project) => [project.id, {
          status: project.status === "queued" ? "intake_review" : project.status === "review" ? "client_review" : project.status,
          paymentStatus: project.payment_status,
          clientNote: project.client_note || "",
          internalNote: project.internal_note || "",
        }])));
      })
      .catch((caught) => {setError(caught instanceof Error?caught.message:"Could not load projects.");setItems([]);});
  }, []);

  const shown = useMemo(() => items?.filter((project) => {
    const matchesFilter = filter === "all" || project.status === filter || project.payment_status === filter ||
      (filter === "active" && project.payment_status === "paid" && project.status !== "delivered");
    return matchesFilter && `${project.business_name} ${project.title} ${project.client_email || ""}`.toLowerCase().includes(search.toLowerCase());
  }) || [], [items, filter, search]);

  const metrics = useMemo(() => ({
    leads: items?.filter((project) => project.payment_status !== "paid").length || 0,
    active: items?.filter((project) => project.payment_status === "paid" && project.status !== "delivered").length || 0,
    due: items?.filter((project) => project.due_this_week === 1 && project.status !== "delivered").length || 0,
    review: items?.filter((project) => ["sales_genius_review", "client_review"].includes(project.status)).length || 0,
  }), [items]);

  function edit(projectId: string, values: Partial<EditState>) {
    setEdits((current) => ({ ...current, [projectId]: { ...current[projectId], ...values } }));
  }

  async function save(project: Project) {
    const values = edits[project.id];
    if (!values) return;
    setBusy(project.id);
    setError("");
    setSaved("");
    const response = await fetch("/api/projects", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: project.id, ...values }),
    });
    if (!response.ok) setError("Could not save the project update.");
    else {
      setSaved(project.id);
      await load();
    }
    setBusy("");
  }

  async function upload(project: Project, file: File, kind: string) {
    setBusy(project.id);
    setError("");
    try {
      await uploadProjectFile(project.id,file,kind);
      await load();
    } catch(caught) {setError(caught instanceof Error?caught.message:"Could not upload the file.");}
    setBusy("");
  }

  return (
    <>
      {!stripeReady && <div className="system-warning"><CircleDollarSign size={20}/><div><b>Stripe setup is still required</b><span>Orders and uploads are saved, but live checkout needs the Stripe secret, webhook secret, and three package price IDs in the site settings.</span></div></div>}
      <div className="metric-grid">
        <div className="metric"><Users /><span>AWAITING PAYMENT</span><strong>{metrics.leads}</strong></div>
        <div className="metric"><FolderOpen /><span>ACTIVE PROJECTS</span><strong>{metrics.active}</strong></div>
        <div className="metric"><Clock3 /><span>DUE THIS WEEK</span><strong>{metrics.due}</strong></div>
        <div className="metric"><FileCheck2 /><span>IN REVIEW</span><strong>{metrics.review}</strong></div>
      </div>
      <section className="panel crm-panel">
        <div className="crm-toolbar">
          <div>
            <h2>Client and production pipeline</h2>
            <div className="crm-filters">{[["all", "All"], ["awaiting_payment", "New leads"], ["paid", "Paid"], ["active", "Active"], ["sales_genius_review", "Sales Genius"], ["client_review", "Client review"], ["delivered", "Delivered"]].map(([key, label]) => <button type="button" className={filter === key ? "active" : ""} onClick={() => setFilter(key)} key={key}>{label}</button>)}</div>
          </div>
          <label className="search-box"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search client, business, or project" /></label>
        </div>
        {error && <p className="form-error">{error}</p>}
        {items === null ? <div className="crm-empty"><p>Loading pipeline…</p></div> : shown.length === 0 ? (
          <div className="crm-empty"><FolderOpen size={28} /><h3>No matching projects</h3><p>New client orders automatically appear here with their brief, uploads, payment, and production status.</p></div>
        ) : <div className="crm-cards">{shown.map((project) => {
          const brief = parseBrief(project.brief_json);
          const values = edits[project.id] || { status: project.status, paymentStatus: project.payment_status, clientNote: "", internalNote: "" };
          return (
            <article className="crm-card" key={project.id}>
              <div className="crm-card-top">
                <div>
                  <span className="status-pill">{statusLabel(project.status, project.payment_status)}</span>
                  <h3>{project.business_name}</h3>
                  <p>{project.title} · {project.service.replaceAll("-", " ")}</p>
                  <small>{project.client_name || "Client"} · {project.client_email || "No email"}</small>
                </div>
                <div className="crm-summary">
                  <span><CircleDollarSign size={16} /> {project.payment_status}</span>
                  <span><Clock3 size={16} /> {project.due_end || "Due after payment"}</span>
                  <span>{(project.assets || []).length} files</span>
                </div>
              </div>

              <div className="crm-workflow">
                <label>Production stage<select disabled={busy === project.id} value={values.status} onChange={(event) => edit(project.id, { status: event.target.value })}>{statusOptions.map((status) => <option key={status.id} value={status.id}>{status.label}</option>)}</select></label>
                <label>Payment<select disabled={busy === project.id} value={values.paymentStatus} onChange={(event) => edit(project.id, { paymentStatus: event.target.value })}><option value="pending">Pending</option><option value="paid">Paid</option><option value="refunded">Refunded</option></select></label>
                <label className="full">Client-visible update<textarea value={values.clientNote} onChange={(event) => edit(project.id, { clientNote: event.target.value })} placeholder="Tell the client what is happening and what comes next." /></label>
                <label className="full">Private admin note<textarea value={values.internalNote} onChange={(event) => edit(project.id, { internalNote: event.target.value })} placeholder="Internal production notes, assigned editor, missing assets, or follow-up." /></label>
                <button type="button" className="save-project" disabled={busy === project.id} onClick={() => save(project)}><Save size={16} /> {busy === project.id ? "Saving…" : saved === project.id ? "Saved" : "Save update"}</button>
              </div>

              <details>
                <summary>View complete client brief</summary>
                <div className="brief-grid">
                  <p><b>Campaign goal</b>{brief.goal || "—"}</p>
                  <p><b>Target audience</b>{brief.targetAudience || "—"}</p>
                  <p><b>Offer</b>{brief.offer || "—"}</p>
                  <p><b>Call to action</b>{brief.cta || "—"}</p>
                  <p><b>Platform / format</b>{[brief.platform, brief.format].filter(Boolean).join(" · ") || "—"}</p>
                  <p><b>Launch date</b>{brief.deadline || "—"}</p>
                  <p className="full"><b>Features and benefits</b>{brief.keyFeatures || "—"}</p>
                  <p className="full"><b>Required details</b>{brief.mustShow || "—"}</p>
                  <p><b>Brand look</b>{brief.brandStyle || "—"}</p>
                  <p><b>Voiceover</b>{brief.voiceover || "—"}</p>
                  <p className="full"><b>Creative notes</b>{brief.notes || "—"}</p>
                </div>
              </details>

              <div className="admin-files">
                <div>{(project.assets || []).map((asset) => <a href={`/api/assets/${asset.id}`} key={asset.id}>{asset.kind.replaceAll("_", " ")}: {asset.file_name}</a>)}</div>
                <label className="upload-action"><Upload size={15} /> Upload review draft<input type="file" accept="video/*" onChange={(event) => event.target.files?.[0] && upload(project, event.target.files[0], "draft")} /></label>
                <label className="upload-action primary"><Upload size={15} /> Upload final video<input type="file" accept="video/*" onChange={(event) => event.target.files?.[0] && upload(project, event.target.files[0], "delivery")} /></label>
              </div>
            </article>
          );
        })}</div>}
      </section>
    </>
  );
}
