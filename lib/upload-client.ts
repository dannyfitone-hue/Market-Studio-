"use client";
import { upload } from "@vercel/blob/client";
export async function uploadProjectFile(projectId:string,file:File,kind="client_upload") {
  if(file.size<1 || file.size>1024*1024*1024) throw new Error("Choose a file between 1 byte and 1 GB.");
  const id=crypto.randomUUID();
  const path=`projects/${projectId}/${id}-${file.name.replace(/[^a-zA-Z0-9._-]/g,"_")}`;
  await upload(path,file,{access:"private",handleUploadUrl:"/api/uploads",multipart:file.size>5*1024*1024,clientPayload:JSON.stringify({projectId,id,kind,fileName:file.name,size:file.size})});
  const response=await fetch("/api/uploads/finalize",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id})});
  if(!response.ok) throw new Error("The file uploaded but could not be attached to the project. Please try again.");
  return id;
}
