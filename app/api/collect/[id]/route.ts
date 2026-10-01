import { z } from "zod";
import { admin,failure } from "../../../../lib/server";
import { publicSiteOrigin } from "../../../../lib/site/origin";
import { analyticsIdentity,deviceKind,trafficSource,ignoreTraffic } from "../../../../lib/services/analytics";
import { requestSubject } from "../../../../lib/security/limits";
import { rateLimit } from "../../../../lib/security/abuse";
const input=z.object({id:z.uuid(),pageId:z.string().max(100),kind:z.enum(["pageview","cta"]),referrer:z.string().max(253).default("")}).strict();
export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
 try {if(ignoreTraffic(req.headers))return new Response(null,{status:204});const id=z.uuid().parse((await params).id);await publicSiteOrigin(req,id);await rateLimit("collect",`${id}:${requestSubject(req)}`,120);const body=input.parse(await req.json());const service=admin();
 const {data:project}=await service.from("projects").select("phase").eq("id",id).maybeSingle();const {data:doc}=await service.from("site_documents").select("published_id").eq("project_id",id).maybeSingle();const {data:v}=doc?await service.from("site_versions").select("manifest").eq("id",doc.published_id).eq("project_id",id).maybeSingle():{data:null};
 if(project?.phase!=="LIVE"||!v?.manifest?.pages?.some((p:{id:string})=>p.id===body.pageId))return new Response(null,{status:404});
 const ua=req.headers.get("user-agent")||"";const visitor=analyticsIdentity(requestSubject(req),ua,id,process.env.ANALYTICS_SIGNING_SECRET||process.env.SUPABASE_SERVICE_ROLE_KEY!);const country=process.env.VERCEL==="1"?req.headers.get("x-vercel-ip-country"):null;
 const {error}=await service.from("analytics_events").upsert({id:body.id,project_id:id,page_id:body.pageId,kind:body.kind,visitor,source:trafficSource(body.referrer,new URL(req.url).hostname),device:deviceKind(ua),country:country&&/^[A-Z]{2}$/.test(country)?country:null},{onConflict:"id",ignoreDuplicates:true});if(error)throw error;return new Response(null,{status:204});
 }catch(e){return failure(e);}
}
