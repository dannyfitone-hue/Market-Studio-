import { createHmac, timingSafeEqual } from "node:crypto";
import { database } from "@/lib/database";
function dueWindow(){const add=(count:number)=>{const d=new Date();let n=0;while(n<count){d.setUTCDate(d.getUTCDate()+1);if(d.getUTCDay()!==0&&d.getUTCDay()!==6)n++;}return d.toISOString().slice(0,10);};return {start:add(3),end:add(4)};}
export async function POST(request:Request) {
  const secret=process.env.STRIPE_WEBHOOK_SECRET;
  if(!secret)return new Response("Webhook is not configured",{status:503});
  const body=await request.text();
  const parts=(request.headers.get("stripe-signature") || "").split(",").map(part=>part.split("=",2));
  const timestamp=parts.find(([key])=>key==="t")?.[1];
  if(!timestamp || !/^\d+$/.test(timestamp) || !Number.isFinite(Number(timestamp)) || Math.abs(Date.now()/1000-Number(timestamp))>300)return new Response("Invalid signature timestamp",{status:400});
  const expected=createHmac("sha256",secret).update(`${timestamp}.${body}`).digest();
  const valid=parts.filter(([key])=>key==="v1").some(([,signature])=>{if(!/^[0-9a-f]{64}$/.test(signature || ""))return false;return timingSafeEqual(expected,Buffer.from(signature,"hex"));});
  if(!valid)return new Response("Invalid signature",{status:400});
  let event:{type?:string;data?:{object?:{payment_status?:string;metadata?:{project_id?:string};client_reference_id?:string;amount_total?:number}}};
  try{event=JSON.parse(body);}catch{return new Response("Invalid event",{status:400});}
  const session=event.data?.object;
  if(["checkout.session.completed","checkout.session.async_payment_succeeded"].includes(event.type || "") && session?.payment_status==="paid") {
    const id=session.metadata?.project_id || session.client_reference_id;
    if(id){const due=dueWindow();const now=new Date().toISOString();await database.prepare("UPDATE projects SET payment_status='paid',status='intake_review',amount_cents=?,due_start=?,due_end=?,client_note=?,stage_updated_at=?,updated_at=? WHERE id=? AND payment_status='pending'").bind(session.amount_total ?? null,due.start,due.end,"Payment confirmed. We are reviewing your brief and assets now.",now,now,id).run();}
  }
  return new Response("ok");
}
