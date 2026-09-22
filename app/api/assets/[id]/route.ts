import { get } from "@vercel/blob";
import { database } from "@/lib/database";
import { getChatGPTUser, isMarketStudioAdmin } from "../../../chatgpt-auth";
export async function GET(_request:Request,context:{params:Promise<{id:string}>}) {
  const user=await getChatGPTUser();
  if(!user) return new Response("Sign in required",{status:401});
  const {id}=await context.params;
  const asset=await database.prepare("SELECT assets.*,projects.user_id AS project_user_id FROM assets JOIN projects ON projects.id=assets.project_id WHERE assets.id=?").bind(id).first<{file_key:string;file_name:string;content_type:string|null;project_user_id:string}>();
  if(!asset) return new Response("File not found",{status:404});
  if(asset.project_user_id!==user.userId && !isMarketStudioAdmin(user)) return new Response("Not authorized",{status:403});
  const blob=await get(asset.file_key,{access:"private"});
  if(!blob || blob.statusCode!==200) return new Response("File not found",{status:404});
  const name=asset.file_name.replace(/[^a-zA-Z0-9._ -]/g,"_");
  return new Response(blob.stream,{headers:{"Content-Type":asset.content_type || "application/octet-stream","Content-Disposition":`attachment; filename="${name}"; filename*=UTF-8''${encodeURIComponent(asset.file_name)}`,"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});
}
