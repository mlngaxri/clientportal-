import "server-only";
import { admin, ownedProject } from "../server";
import { evaluateStates, type ScheduledState } from "../states";
import { siteUrl } from "./builtin";
import type { SiteManifest, SiteContent } from "./service";
export async function loadSite(id:string,review=false) {
 if(!/^[0-9a-f-]{36}$/i.test(id))return null;
 if(review)await ownedProject(id);
 const client=admin();
 const [{data:project},{data:doc}]=await Promise.all([client.from("projects").select("id,name,phase,pro").eq("id",id).maybeSingle(),client.from("site_documents").select("*").eq("project_id",id).maybeSingle()]);
 if(!project||!doc||(!review&&project.phase!=="LIVE"))return null;
 const {data:version}=review?{data:null}:await client.from("site_versions").select("manifest,content,revision").eq("id",doc.published_id).eq("project_id",id).maybeSingle();
 if(!review&&!version)return null;
 const manifest=(version?.manifest||doc.manifest) as SiteManifest;
 let content=(version?.content||doc.content) as SiteContent;
 if(project.pro){const {data:board}=await client.from("boards").select("data").eq("project_id",id).eq("kind","states").maybeSingle();const states=(board?.data?.states||[]) as ScheduledState[];content={...content,fields:evaluateStates(states,new Date(),content.fields).content};}
 const {data:settings}=await client.from("project_settings").select("connections").eq("project_id",id).maybeSingle();
 return {project,manifest,content,revision:version?.revision||doc.revision,base:review?`/review/${id}`:await siteUrl(id),connections:settings?.connections||{}};
}
