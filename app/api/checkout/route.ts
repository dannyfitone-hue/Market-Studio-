import { database } from "@/lib/database";
import { NextResponse } from "next/server";
import { getChatGPTUser } from "../../chatgpt-auth";

const priceKeys: Record<string,string> = {
  "social-ad": "STRIPE_PRICE_SOCIAL_AD",
  "product-showcase": "STRIPE_PRICE_PRODUCT_SHOWCASE",
  "3d-reveal": "STRIPE_PRICE_3D_REVEAL",
};

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const { projectId } = await request.json() as { projectId?: string };
  const project = projectId ? await database.prepare("SELECT id,service,payment_status FROM projects WHERE id=? AND user_id=?").bind(projectId,user.userId).first<{id:string;service:string;payment_status:string}>() : null;
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  if (project.payment_status === "paid") return NextResponse.json({ url: "/dashboard?payment=success" });
  const secret = process.env.STRIPE_SECRET_KEY;
  const price = process.env[priceKeys[project.service] || ""];
  if (!secret || !price) return NextResponse.json({ error: "Your order was saved, but secure payment is not active yet. Market Studio must connect its Stripe account and package prices." }, { status: 503 });
  const origin = new URL(request.url).origin;
  const form = new URLSearchParams({
    mode: "payment",
    "line_items[0][price]": price,
    "line_items[0][quantity]": "1",
    success_url: `${origin}/dashboard?payment=success`,
    cancel_url: `${origin}/dashboard?payment=cancelled`,
    customer_email: user.email,
    client_reference_id: project.id,
    "metadata[project_id]": project.id,
  });
  const stripe = await fetch("https://api.stripe.com/v1/checkout/sessions", { method: "POST", headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/x-www-form-urlencoded" }, body: form });
  const result = await stripe.json() as { url?:string; error?:{message?:string} };
  if (!stripe.ok || !result.url) return NextResponse.json({ error: result.error?.message || "Stripe checkout could not be started." }, { status: 502 });
  return NextResponse.json({ url: result.url });
}
