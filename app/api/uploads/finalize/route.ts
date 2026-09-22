import { getChatGPTUser, isMarketStudioAdmin } from "../../../chatgpt-auth";
import { database } from "@/lib/database";
import { finishUpload, type UploadIntent } from "@/lib/uploads";
export async function POST(request:Request) {
  const user=await getChatGPTUser();
  if(!user) return Response.json({error:"Sign in required"},{status:401});
  const {id}=await request.json() as {id?:string};
  if(!id) return Response.json({error:"Upload is required"},{status:400});
  const intent=await database.prepare("SELECT * FROM upload_intents WHERE id=?").bind(id).first<UploadIntent>();
  if(!intent || (intent.uploader_id!==user.userId && !isMarketStudioAdmin(user))) return Response.json({error:"Upload not found"},{status:404});
  try {await finishUpload(id);return Response.json({ok:true,id});}
  catch {return Response.json({error:"Your file could not be confirmed. Please retry."},{status:503});}
}
