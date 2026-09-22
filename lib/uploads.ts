import { head } from "@vercel/blob";
import { database } from "./database";
export const MAX_UPLOAD_BYTES=1024*1024*1024;
export type UploadIntent={id:string;project_id:string;user_id:string;uploader_id:string;kind:string;file_key:string;file_name:string};
export async function finishUpload(id:string) {
  const existing=await database.prepare("SELECT id FROM assets WHERE id=?").bind(id).first();
  if(existing) return;
  const intent=await database.prepare("SELECT * FROM upload_intents WHERE id=?").bind(id).first<UploadIntent>();
  if(!intent) throw new Error("Upload not found");
  // Resolve only the server-recorded key in our private store.
  const blob=await head(intent.file_key);
  if(blob.pathname!==intent.file_key || blob.size>MAX_UPLOAD_BYTES) throw new Error("Invalid uploaded file");
  const now=new Date().toISOString();
  const insert="INSERT INTO assets (id,project_id,user_id,kind,file_key,file_name,content_type,size,created_at) VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING";
  const values=[id,intent.project_id,intent.user_id,intent.kind,intent.file_key,intent.file_name,blob.contentType,blob.size,now];
  if(intent.kind==="draft" || intent.kind==="delivery") {
    // Callback and browser confirmation can race. Only the winning insert may
    // advance production, so a delayed duplicate cannot regress a later stage.
    await database.prepare(`WITH inserted AS (${insert} RETURNING id) UPDATE projects SET status=?,client_note=?,stage_updated_at=?,updated_at=? WHERE id=? AND EXISTS(SELECT 1 FROM inserted)`).bind(...values,intent.kind==="draft"?"client_review":"delivered",intent.kind==="draft"?"Your review draft is ready. Download it below and send us your feedback.":"Your final video is ready to download.",now,now,intent.project_id).run();
  } else await database.prepare(insert).bind(...values).run();
}
