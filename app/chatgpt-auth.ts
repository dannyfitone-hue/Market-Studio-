import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { cache } from "react";
import { database } from "../lib/database";
export type ChatGPTUser = { userId:string; displayName:string; email:string; fullName:string|null };
// Preserve existing callers while replacing trusted Sites headers with Clerk sessions.
export const getChatGPTUser=cache(async ():Promise<ChatGPTUser|null>=>{
  const account=await currentUser();
  if(!account) return null;
  const address=account.emailAddresses.find(e=>e.id===account.primaryEmailAddressId && e.verification?.status==="verified");
  if(!address) return null;
  const email=address.emailAddress.toLowerCase();
  const fullName=account.fullName || account.firstName || null;
  let profile=await database.prepare("SELECT user_id FROM profiles WHERE clerk_user_id=?").bind(account.id).first<{user_id:string}>();
  if(!profile) {
    // Only a verified owner of the original email may claim a migrated profile.
    profile=await database.prepare("UPDATE profiles SET clerk_user_id=? WHERE lower(email)=? AND clerk_user_id IS NULL RETURNING user_id").bind(account.id,email).first<{user_id:string}>();
  }
  if(!profile) {
    const now=new Date().toISOString();
    profile=await database.prepare("INSERT INTO profiles (user_id,clerk_user_id,email,name,role,brand_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(clerk_user_id) DO UPDATE SET email=excluded.email,name=excluded.name,updated_at=excluded.updated_at RETURNING user_id").bind(account.id,account.id,email,fullName,"client","{}",now,now).first<{user_id:string}>();
  }
  if(!profile) throw new Error("Unable to load your account");
  return {userId:profile.user_id,email,fullName,displayName:fullName || email};
});
export async function requireChatGPTUser(returnTo:string) {
  const user=await getChatGPTUser();
  if(user) return user;
  redirect(chatGPTSignInPath(returnTo));
}
export function isMarketStudioAdmin(user:ChatGPTUser) {
  return (process.env.MARKET_STUDIO_ADMIN_EMAILS || "danny.fitone@gmail.com").split(",").map(e=>e.trim().toLowerCase()).includes(user.email.toLowerCase());
}
export async function requireMarketStudioAdmin(returnTo="/admin") {
  const user=await requireChatGPTUser(returnTo);
  if(!isMarketStudioAdmin(user)) redirect("/dashboard");
  return user;
}
export function safeReturnPath(value:string) {
  try {
    const url=new URL(value,"https://app.local");
    if(!value.startsWith("/") || value.startsWith("//") || url.origin!=="https://app.local" || /^\/(sign-in|sign-up|sign-out)/.test(url.pathname)) return "/dashboard";
    return url.pathname+url.search;
  } catch { return "/dashboard"; }
}
export function chatGPTSignInPath(returnTo:string) { return `/sign-in?return_to=${encodeURIComponent(safeReturnPath(returnTo))}`; }
