import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getChatGPTUser, isMarketStudioAdmin } from "../../chatgpt-auth";
import { database } from "@/lib/database";
import { finishUpload, MAX_UPLOAD_BYTES, type UploadIntent } from "@/lib/uploads";
export async function POST(request:Request) {
  try {
    const body=await request.json() as HandleUploadBody;
    const result=await handleUpload({body,request,
      onBeforeGenerateToken:async(pathname,clientPayload)=>{
        const user=await getChatGPTUser();
        if(!user) throw new Error("Sign in required");
        const data=JSON.parse(clientPayload || "{}") as {projectId?:string;id?:string;kind?:string;fileName?:string;size?:number};
        if(!data.projectId || !data.id || !/^[0-9a-f-]{36}$/.test(data.id) || !data.fileName || data.fileName.length>255 || !Number.isSafeInteger(data.size) || data.size!<1 || data.size!>MAX_UPLOAD_BYTES) throw new Error("Choose a file up to 1 GB");
        const project=await database.prepare("SELECT id,user_id FROM projects WHERE id=?").bind(data.projectId).first<{id:string;user_id:string}>();
        const admin=isMarketStudioAdmin(user);
        if(!project || (project.user_id!==user.userId && !admin)) throw new Error("Project not found");
        const kind=admin && ["draft","delivery"].includes(data.kind || "")?data.kind!:"client_upload";
        const expected=`projects/${project.id}/${data.id}-${data.fileName.replace(/[^a-zA-Z0-9._-]/g,"_")}`;
        if(pathname!==expected) throw new Error("Invalid upload path");
        await database.prepare("INSERT INTO upload_intents (id,project_id,user_id,uploader_id,kind,file_key,file_name) VALUES (?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING").bind(data.id,project.id,project.user_id,user.userId,kind,pathname,data.fileName).run();
        const intent=await database.prepare("SELECT * FROM upload_intents WHERE id=?").bind(data.id).first<UploadIntent>();
        if(!intent || intent.uploader_id!==user.userId || intent.file_key!==pathname || intent.kind!==kind) throw new Error("Invalid upload request");
        return {maximumSizeInBytes:MAX_UPLOAD_BYTES,validUntil:Date.now()+60*60*1000,addRandomSuffix:false,allowOverwrite:false,tokenPayload:JSON.stringify({id:data.id})};
      },
      onUploadCompleted:async({tokenPayload})=>{const {id}=JSON.parse(tokenPayload || "{}");if(typeof id!=="string")throw new Error("Invalid upload");await finishUpload(id);},
    });
    return Response.json(result);
  } catch(error) {return Response.json({error:error instanceof Error?error.message:"Upload failed"},{status:400});}
}
