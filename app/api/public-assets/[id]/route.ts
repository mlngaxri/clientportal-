import { admin } from "../../../../lib/server";
import { evaluateStates,type ScheduledState } from "../../../../lib/states";
export async function GET(req:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params,projectId=new URL(req.url).searchParams.get("project");if(!/^[0-9a-f-]{36}$/i.test(id)||!projectId||!/^[0-9a-f-]{36}$/i.test(projectId))return new Response(null,{status:404});
 try{const service=admin();const {data:p}=await service.from("projects").select("phase,pro").eq("id",projectId).maybeSingle();const {data:d}=await service.from("site_documents").select("published_id").eq("project_id",projectId).maybeSingle();if(p?.phase!=="LIVE"||!d)return new Response(null,{status:404});const {data:v}=await service.from("site_versions").select("manifest,content").eq("id",d.published_id).eq("project_id",projectId).maybeSingle();if(!v)return new Response(null,{status:404});let fields=v.content.fields;
 if(p.pro){const {data:b}=await service.from("boards").select("data").eq("project_id",projectId).eq("kind","states").maybeSingle();fields=evaluateStates((b?.data?.states||[]) as ScheduledState[],new Date(),fields).content;}
 const permitted=v.manifest.pages.flatMap((p:{fields:{id:string;kind:string}[]})=>p.fields).some((f:{kind:string;id:string})=>f.kind==="image"&&fields[f.id]===id);if(!permitted)return new Response(null,{status:404});
 const {data:asset}=await service.from("assets").select("storage_key,mime").eq("id",id).eq("project_id",projectId).maybeSingle();if(!asset||!/^image\/(png|jpeg|webp|gif)$/.test(asset.mime))return new Response(null,{status:404});const {data,error}=await service.storage.from("project-assets").download(asset.storage_key);if(error||!data)return new Response(null,{status:503});return new Response(data,{headers:{"Content-Type":asset.mime,"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
 }catch{return new Response(null,{status:503});}
}
