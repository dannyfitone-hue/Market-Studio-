import { database } from "@/lib/database";
import { NextResponse } from "next/server";
import { getChatGPTUser, isMarketStudioAdmin } from "../../chatgpt-auth";
import { productionStages } from "../../../lib/project-workflow";

function businessDueWindow() {
  const add = (count: number) => {
    const date = new Date();
    let added = 0;
    while (added < count) {
      date.setUTCDate(date.getUTCDate() + 1);
      if (date.getUTCDay() !== 0 && date.getUTCDay() !== 6) added += 1;
    }
    return date.toISOString().slice(0, 10);
  };
  return { start: add(3), end: add(4) };
}

export async function GET(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  try {
    const all = new URL(request.url).searchParams.get("scope") === "all";
    if (all && !isMarketStudioAdmin(user)) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    const result = all
      ? await database.prepare("SELECT projects.*, profiles.email AS client_email, profiles.name AS client_name, CASE WHEN projects.due_end BETWEEN CURRENT_DATE::text AND (CURRENT_DATE + 7)::text THEN 1 ELSE 0 END AS due_this_week FROM projects LEFT JOIN profiles ON profiles.user_id=projects.user_id ORDER BY projects.created_at DESC LIMIT 100").all()
      : await database.prepare("SELECT * FROM projects WHERE user_id = ? ORDER BY created_at DESC LIMIT 50").bind(user.userId).all();
    const assets = all
      ? await database.prepare("SELECT id,project_id,kind,file_name,content_type,size,created_at FROM assets ORDER BY created_at DESC").all()
      : await database.prepare("SELECT id,project_id,kind,file_name,content_type,size,created_at FROM assets WHERE user_id=? ORDER BY created_at DESC").bind(user.userId).all();
    const projects = result.results.map((project) => {
      const visible={...project};
      if(!all) delete visible.internal_note;
      return {...visible,assets:assets.results.filter(asset=>asset.project_id===project.id)};
    });
    return NextResponse.json({ projects });
  } catch {
    return NextResponse.json({error:"Projects could not be loaded. Please try again."},{status:503});
  }
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const body = (await request.json()) as Record<string, unknown>;
  const business = String(body.business || "").trim();
  const product = String(body.product || "").trim();
  const service = String(body.service || "").trim();
  const goal = String(body.goal || "").trim();
  const targetAudience = String(body.targetAudience || "").trim();
  if (!business || !product || !["social-ad","product-showcase","3d-reveal"].includes(service) || !goal || !targetAudience) {
    return NextResponse.json({ error: "Business, product, campaign goal, audience, and video type are required." }, { status: 400 });
  }
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  try {
    await database.batch([
      database.prepare("INSERT INTO profiles (user_id,email,name,business_name,role,brand_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET email=excluded.email,name=excluded.name,business_name=excluded.business_name,updated_at=excluded.updated_at").bind(user.userId,user.email,user.fullName,business,"client","{}",now,now),
      database.prepare("INSERT INTO projects (id,user_id,business_name,title,service,status,payment_status,brief_json,due_start,due_end,client_note,internal_note,stage_updated_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(id,user.userId,business,product,service,"awaiting_payment","pending",JSON.stringify(body),null,null,"Your order is saved. Complete payment to reserve production.",null,now,now,now),
    ]);
    return NextResponse.json({ id, status: "awaiting_payment", paymentStatus: "pending" });
  } catch {
    return NextResponse.json({ error: "We could not save this project. Please try again." }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  if (!isMarketStudioAdmin(user)) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  const body = (await request.json()) as { id?: string; status?: string; paymentStatus?: string; clientNote?: string; internalNote?: string };
  const statuses = ["awaiting_payment", ...productionStages.map((stage) => stage.id)];
  const payments = ["pending", "paid", "refunded"];
  if (!body.id || !body.status || !statuses.includes(body.status)) return NextResponse.json({ error: "A valid project status is required" }, { status: 400 });
  if (body.paymentStatus && !payments.includes(body.paymentStatus)) return NextResponse.json({ error: "Invalid payment status" }, { status: 400 });
  const existing = await database.prepare("SELECT status,payment_status,due_start,due_end,client_note,internal_note,stage_updated_at FROM projects WHERE id=?").bind(body.id).first<{status:string;payment_status:string;due_start:string|null;due_end:string|null;client_note:string|null;internal_note:string|null;stage_updated_at:string|null}>();
  if (!existing) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  const paymentStatus = body.paymentStatus || existing.payment_status;
  let status = body.status;
  let dueStart = existing.due_start;
  let dueEnd = existing.due_end;
  if (paymentStatus === "paid" && status === "awaiting_payment") status = "intake_review";
  if (paymentStatus === "paid" && (!dueStart || !dueEnd)) {
    const due = businessDueWindow();
    dueStart = due.start;
    dueEnd = due.end;
  }
  const now = new Date().toISOString();
  await database.prepare("UPDATE projects SET status=?,payment_status=?,due_start=?,due_end=?,client_note=?,internal_note=?,stage_updated_at=?,updated_at=? WHERE id=?").bind(
    status,paymentStatus,dueStart,dueEnd,
    body.clientNote !== undefined ? body.clientNote.trim() || null : existing.client_note,
    body.internalNote !== undefined ? body.internalNote.trim() || null : existing.internal_note,
    status !== existing.status ? now : existing.stage_updated_at || now,
    now,body.id,
  ).run();
  return NextResponse.json({ ok: true, status, paymentStatus, dueStart, dueEnd });
}
