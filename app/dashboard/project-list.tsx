"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Clock3, Download, LockKeyhole, Video } from "lucide-react";
import { productionStages, stageIndex, statusLabel } from "../../lib/project-workflow";

type Asset = { id: string; kind: string; file_name: string };
type Project = {
  id: string;
  title: string;
  business_name: string;
  service: string;
  status: string;
  payment_status: string;
  amount_cents: number | null;
  client_note: string | null;
  due_start: string | null;
  due_end: string | null;
  created_at: string;
  assets: Asset[];
};

function prettyService(value: string) {
  return value.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function ProjectProgress({ project }: { project: Project }) {
  const current = stageIndex(project.status, project.payment_status);
  return (
    <div className="project-progress" aria-label={`Production status: ${statusLabel(project.status, project.payment_status)}`}>
      {productionStages.map((stage, index) => {
        const state = index < current ? "done" : index === current ? "current" : "next";
        return (
          <div className={`progress-step ${state}`} key={stage.id}>
            <span>{state === "done" ? <Check size={13} /> : index + 1}</span>
            <small>{stage.shortLabel}</small>
          </div>
        );
      })}
    </div>
  );
}

export function ProjectList() {
  const [items, setItems] = useState<Project[] | null>(null);
  const [paying, setPaying] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    fetch("/api/projects")
      .then(async(response) => {const data=await response.json();if(!response.ok)throw new Error(data.error || "Could not load projects.");return data;})
      .then((data) => setItems(data.projects || []))
      .catch((caught) => {setError(caught instanceof Error?caught.message:"Could not load projects.");setItems([]);});
  }, []);

  const counts = useMemo(() => ({
    active: items?.filter((project) => project.payment_status === "paid" && project.status !== "delivered").length || 0,
    review: items?.filter((project) => project.status === "client_review").length || 0,
    delivered: items?.filter((project) => project.status === "delivered").length || 0,
  }), [items]);

  async function pay(projectId: string) {
    setPaying(projectId);
    setError("");
    const response = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId }),
    });
    const result = (await response.json()) as { url?: string; error?: string };
    if (result.url) window.location.assign(result.url);
    else {
      setError(result.error || "Payment could not be started.");
      setPaying("");
    }
  }

  if (items === null) return <div className="empty-state"><p>Loading your projects…</p></div>;
  if(error && items.length===0) return <div className="empty-state"><p className="form-error">{error}</p><button className="simple-button" onClick={()=>window.location.reload()}>Try again</button></div>;
  if (items.length === 0) return (
    <div className="empty-state">
      <div className="empty-icon"><Video size={25} /></div>
      <h3>No projects yet</h3>
      <p>Place your first order, upload your product and brand assets, and track every step here.</p>
      <Link href="/onboarding" className="simple-button primary">Start your first order <ArrowRight size={16} /></Link>
    </div>
  );

  return (
    <div>
      <div className="client-metrics" aria-label="Project summary">
        <div><strong>{counts.active}</strong><span>Active</span></div>
        <div><strong>{counts.review}</strong><span>Ready for review</span></div>
        <div><strong>{counts.delivered}</strong><span>Delivered</span></div>
      </div>
      {error && <p className="form-error">{error}</p>}
      <div className="client-projects">
        {items.map((project) => {
          const drafts = (project.assets || []).filter((asset) => asset.kind === "draft");
          const deliveries = (project.assets || []).filter((asset) => asset.kind === "delivery");
          const paid = project.payment_status === "paid";
          return (
            <article className="client-project-card" key={project.id}>
              <div className="client-project-head">
                <div>
                  <span className={`status-pill ${paid ? "" : "payment"}`}>{statusLabel(project.status, project.payment_status)}</span>
                  <h3>{project.title}</h3>
                  <p>{project.business_name} · {prettyService(project.service)}</p>
                </div>
                <div className="delivery-date">
                  <Clock3 size={17} />
                  <span>Estimated delivery</span>
                  <b>{project.due_start && project.due_end ? `${project.due_start} – ${project.due_end}` : "3–4 business days after payment"}</b>
                </div>
              </div>

              {paid ? <ProjectProgress project={project} /> : (
                <div className="payment-callout">
                  <LockKeyhole size={22} />
                  <div><b>Payment is required to begin</b><span>Your brief and files are saved. Secure checkout reserves your production slot.</span></div>
                  <button disabled={paying === project.id} onClick={() => pay(project.id)}>
                    {paying === project.id ? "Opening checkout…" : "Pay securely"}
                  </button>
                </div>
              )}

              {project.client_note && <div className="project-update"><b>Latest update</b><p>{project.client_note}</p></div>}

              {(drafts.length > 0 || deliveries.length > 0) && (
                <div className="delivery-files">
                  {drafts.map((asset) => <a href={`/api/assets/${asset.id}`} key={asset.id}><Download size={15} /> Review draft: {asset.file_name}</a>)}
                  {deliveries.map((asset) => <a className="final-file" href={`/api/assets/${asset.id}`} key={asset.id}><Download size={15} /> Download final: {asset.file_name}</a>)}
                </div>
              )}
              <div className="project-foot">
                <span>Order placed {new Date(project.created_at).toLocaleDateString()}</span>
                <Link href="/onboarding">Order another video <ArrowRight size={14} /></Link>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
