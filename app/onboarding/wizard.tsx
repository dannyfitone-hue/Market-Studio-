"use client";

import { uploadProjectFile } from "../../lib/upload-client";
import { useEffect, useMemo, useState } from "react";
import { Box, Check, Film, Layers3, ShieldCheck, Upload } from "lucide-react";

const types = [
  { id: "social-ad", name: "Social Video Ad", icon: Film, desc: "A focused paid or organic social ad built around one campaign goal." },
  { id: "product-showcase", name: "Product Showcase", icon: Box, desc: "A cinematic studio-style video that reveals features and details." },
  { id: "3d-reveal", name: "3D Product Reveal", icon: Layers3, desc: "Premium opening, exploded-view, internal-detail, or transformation animation." },
];

const emptyForm = {
  business: "", product: "", website: "", targetAudience: "", goal: "", offer: "", cta: "",
  platform: "Instagram / Meta", format: "9:16 Vertical", deadline: "", keyFeatures: "",
  mustShow: "", brandStyle: "", voiceover: "No preference", references: "", notes: "",
};

export function OrderWizard({ email }: { email: string }) {
  const [step, setStep] = useState(1);
  const [type, setType] = useState("social-ad");
  const [files, setFiles] = useState<File[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<Set<File>>(new Set());
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyForm);
  const chosen = useMemo(() => types.find((item) => item.id === type)!, [type]);

  useEffect(() => {
    const context = (document as Document & { modelContext?: { registerTool: (tool: unknown, options?: { signal?: AbortSignal }) => void | Promise<void> } }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    void Promise.resolve(context.registerTool({
      name: "start_market_studio_order",
      title: "Start Market Studio order",
      description: "Configure a new Market Studio video order and open the project brief step.",
      inputSchema: { type: "object", properties: { service: { type: "string", enum: ["social-ad", "product-showcase", "3d-reveal"] }, business: { type: "string" }, product: { type: "string" } }, required: ["service", "business", "product"], additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input: unknown) {
        const value = input as { service: string; business: string; product: string };
        if (!types.some((item) => item.id === value.service) || !value.business.trim() || !value.product.trim()) throw new Error("Valid service, business, and product are required");
        setType(value.service);
        setForm((current) => ({ ...current, business: value.business, product: value.product }));
        setStep(2);
        return { service: value.service, business: value.business, product: value.product, step: 2 };
      },
    }, { signal: lifecycle.signal })).catch(() => {});
    return () => lifecycle.abort();
  }, []);

  function update(name: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function next() {
    setError("");
    if (step === 2 && (!form.business.trim() || !form.product.trim() || !form.targetAudience.trim() || !form.goal.trim())) {
      setError("Please complete the business, product, target audience, and campaign goal.");
      return;
    }
    setStep((current) => Math.min(5, current + 1));
  }

  async function submit() {
    setBusy(true);
    setError("");
    try {
      let savedId=projectId;
      if(!savedId) {
      const response = await fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, service: type }) });
      const project = await response.json() as { id?: string; error?: string };
      if (!response.ok || !project.id) throw new Error(project.error || "Unable to create project");
      savedId=project.id;
      setProjectId(savedId);
      }
      for (const file of files) {
        if(uploadedFiles.has(file)) continue;
        await uploadProjectFile(savedId,file);
        setUploadedFiles(current=>new Set([...current,file]));
      }
      const checkoutResponse = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId: savedId }) });
      const checkout = await checkoutResponse.json() as { url?: string; error?: string };
      if (!checkoutResponse.ok || !checkout.url) {
        setSent(true);
        throw new Error(checkout.error || "Unable to start secure payment");
      }
      window.location.assign(checkout.url);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  if (sent) return (
    <section className="panel order-form success-panel">
      <div className="success-check"><Check size={30} /></div>
      <h2>Your order and files are saved.</h2>
      <p>Your project is in your dashboard. Payment must be completed before the 3–4 business-day production window begins.</p>
      {error && <p className="form-error">{error}</p>}
      <a href="/dashboard" className="simple-button primary">View my dashboard</a>
    </section>
  );

  const titles = ["Choose your video", "Business and campaign", "Creative direction", "Upload your assets", "Review and secure payment"];
  return (
    <section className="panel order-form">
      <div className="order-promise"><ShieldCheck size={18} /><span><b>Simple ordering.</b> Secure files, secure Stripe checkout, and a clear 3–4 business-day production window.</span></div>
      <div className="stepper">{[1, 2, 3, 4, 5].map((number) => <span className={number <= step ? "on" : ""} key={number} />)}</div>
      <div className="wizard-head"><span>STEP {step} OF 5</span><h2>{titles[step - 1]}</h2></div>

      {step === 1 && <div className="option-grid">{types.map((item) => <button type="button" className={`option ${type === item.id ? "selected" : ""}`} onClick={() => setType(item.id)} key={item.id}><item.icon size={24} /><b>{item.name}</b><small>{item.desc}</small></button>)}</div>}

      {step === 2 && <div className="form-grid">
        <div className="field"><label>Business name *</label><input value={form.business} onChange={(event) => update("business", event.target.value)} autoComplete="organization" /></div>
        <div className="field"><label>Product or service *</label><input value={form.product} onChange={(event) => update("product", event.target.value)} /></div>
        <div className="field full"><label>Website or product link</label><input type="url" value={form.website} onChange={(event) => update("website", event.target.value)} placeholder="https://" /></div>
        <div className="field full"><label>Who should this ad reach? *</label><textarea value={form.targetAudience} onChange={(event) => update("targetAudience", event.target.value)} placeholder="Describe the ideal customer, location, age range, interests, or buying situation." /></div>
        <div className="field full"><label>What should this video accomplish? *</label><textarea value={form.goal} onChange={(event) => update("goal", event.target.value)} placeholder="For example: introduce the product, generate online orders, book appointments, or launch a promotion." /></div>
        <div className="field"><label>Offer or promotion</label><input value={form.offer} onChange={(event) => update("offer", event.target.value)} /></div>
        <div className="field"><label>Call to action</label><input value={form.cta} onChange={(event) => update("cta", event.target.value)} placeholder="Shop now, book today…" /></div>
        <div className="field"><label>Primary platform</label><select value={form.platform} onChange={(event) => update("platform", event.target.value)}><option>Instagram / Meta</option><option>TikTok</option><option>YouTube</option><option>Website</option><option>Multiple platforms</option></select></div>
        <div className="field"><label>Requested launch date</label><input type="date" value={form.deadline} onChange={(event) => update("deadline", event.target.value)} /></div>
      </div>}

      {step === 3 && <div className="form-grid">
        <div className="field full"><label>Most important features or benefits</label><textarea value={form.keyFeatures} onChange={(event) => update("keyFeatures", event.target.value)} placeholder="List the details customers must understand or see closely." /></div>
        <div className="field full"><label>Required shots, details, text, or disclaimers</label><textarea value={form.mustShow} onChange={(event) => update("mustShow", event.target.value)} placeholder="Packaging, inside details, colors, ingredients, legal text, pricing, or anything that cannot be missed." /></div>
        <div className="field"><label>Brand look and mood</label><input value={form.brandStyle} onChange={(event) => update("brandStyle", event.target.value)} placeholder="Luxury, energetic, minimal, bold…" /></div>
        <div className="field"><label>Voiceover preference</label><select value={form.voiceover} onChange={(event) => update("voiceover", event.target.value)}><option>No preference</option><option>Voiceover requested</option><option>Music and text only</option><option>No audio</option></select></div>
        <div className="field"><label>Primary format</label><select value={form.format} onChange={(event) => update("format", event.target.value)}><option>9:16 Vertical</option><option>4:5 Portrait</option><option>1:1 Square</option><option>16:9 Landscape</option><option>Multiple formats</option></select></div>
        <div className="field"><label>Reference ad link</label><input type="url" value={form.references} onChange={(event) => update("references", event.target.value)} placeholder="https://" /></div>
        <div className="field full"><label>Anything else we should know?</label><textarea value={form.notes} onChange={(event) => update("notes", event.target.value)} placeholder="Creative ideas, product movement, colors, music, competitors, or anything to avoid." /></div>
      </div>}

      {step === 4 && <div>
        <label className="dropzone"><Upload size={28} /><b>Upload product and brand assets</b><span>Product photos from every angle, inside/detail photos, video clips, logo files, packaging, manuals, CAD/3D files, and reference ads.</span><input type="file" multiple accept="image/*,video/*,.pdf,.zip,.ai,.psd,.obj,.fbx,.glb,.gltf" onChange={(event) => setFiles(Array.from(event.target.files || []))} /></label>
        <p className="upload-guidance"><b>Best results:</b> include clear front, back, side, close-up, and inside/detail photos whenever they exist.</p>
        {files.length > 0 && <div className="file-list">{files.map((file) => <span key={`${file.name}-${file.size}`}>{file.name}<small>{Math.ceil(file.size / 1024)} KB</small></span>)}</div>}
      </div>}

      {step === 5 && <div className="review-box">
        <div><span>VIDEO TYPE</span><b>{chosen.name}</b></div>
        <div><span>BUSINESS</span><b>{form.business}</b></div>
        <div><span>PRODUCT / SERVICE</span><b>{form.product}</b></div>
        <div><span>AUDIENCE</span><b>{form.targetAudience}</b></div>
        <div><span>FORMAT</span><b>{form.format}</b></div>
        <div><span>ASSETS</span><b>{files.length} selected</b></div>
        <div className="payment-note"><b>Secure Stripe payment</b><p>Your final package price is shown before payment. Production begins only after Stripe confirms payment and your required assets are complete.</p></div>
        <div className="turnaround-note"><b>3–4 business days</b><p>Track strategy, production, Sales Genius review, client review, and final delivery from your dashboard.</p></div>
      </div>}

      {error && <p className="form-error">{error}</p>}
      <div className="form-actions">
        <button type="button" className="simple-button" disabled={step === 1 || busy} onClick={() => setStep((current) => Math.max(1, current - 1))}>Back</button>
        {step < 5 ? <button type="button" className="simple-button primary" onClick={next}>Continue</button> : <button type="button" className="simple-button primary" disabled={busy} onClick={submit}>{busy ? "Saving order…" : "Continue to secure payment"}</button>}
      </div>
      <p className="form-email">Order confirmations and updates will be connected to {email}.</p>
    </section>
  );
}
