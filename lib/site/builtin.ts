import "server-only";
import { ownedProject, admin } from "../server";
import type { SiteAdapter, SiteContent, PublishedVersion, SiteManifest } from "./service";
export function appOrigin() { const url=new URL(process.env.APP_URL || "http://localhost:4173"); if(process.env.APP_ENV!=="development"&&url.protocol!=="https:")throw new Error("Website address is not configured."); return url.origin; }
export async function siteUrl(projectId:string) {
 const {data,error}=await admin().from("site_domains").select("hostname").eq("project_id",projectId).eq("status","connected").maybeSingle();if(error)throw error;
 return data?`https://${data.hostname}`:`${appOrigin()}/sites/${projectId}`;
}
export class BuiltinSiteAdapter implements SiteAdapter {
 async document(projectId:string) { const {client}=await ownedProject(projectId);const {data,error}=await client.from("site_documents").select("*").eq("project_id",projectId).single();if(error||!data)throw new Error("Your website has not been set up yet. Fourthform will connect it during the build."); return data; }
 async manifest(projectId:string):Promise<SiteManifest>{const d=await this.document(projectId);return {...d.manifest,revision:String(d.revision)};}
 async current(projectId:string):Promise<SiteContent>{return (await this.document(projectId)).content;}
 async convert(v:{id:string;project_id:string;content:SiteContent;created_at:string;revision:number}):Promise<PublishedVersion>{return {id:v.id,projectId:v.project_id,content:v.content,deployedAt:v.created_at,url:await siteUrl(v.project_id),adapterReceipt:`database:${v.id}:${v.revision}`};}
 async history(projectId:string){const {client}=await ownedProject(projectId);const {data,error}=await client.from("site_versions").select("*").eq("project_id",projectId).order("created_at",{ascending:false}).limit(100);if(error)throw error;return Promise.all((data||[]).map(v=>this.convert(v)));}
 async command(input:{projectId:string;content?:SiteContent;expectedRevision:string;idempotencyKey:string;versionId?:string},action:"save"|"publish"|"rollback") {
  if(!/^\d+$/.test(input.expectedRevision)||!Number.isSafeInteger(Number(input.expectedRevision)))throw new Error("Invalid website revision.");const {client}=await ownedProject(input.projectId);const {data,error}=await client.rpc("site_command",{pid:input.projectId,action,payload:input.versionId?{versionId:input.versionId}:{content:input.content},expected:Number(input.expectedRevision),command_key:input.idempotencyKey});if(error)throw new Error(error.message);return data;
 }
 async publish(input:{projectId:string;content:SiteContent;expectedRevision:string;idempotencyKey:string}){return this.convert((await this.command(input,"publish")).version);}
}
