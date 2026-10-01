import { z } from "zod";
import type { SiteManifest, SiteContent } from "./service";
const id = z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}$/).refine(v => !["constructor", "prototype", "__proto__"].includes(v));
export const contentSchema = z.object({ fields: z.record(id, z.string().max(10000)), seo: z.record(id, z.object({ title: z.string().trim().min(1).max(160), description: z.string().max(500), noindex: z.boolean() }).strict()) }).strict();
export const manifestSchema = z.object({
 siteId: z.string().min(1).max(100), revision: z.string().min(1).max(100),
 theme: z.object({ layout: z.enum(["editorial", "immersive", "product", "expressive"]), background: z.string().regex(/^#[0-9a-f]{6}$/i), ink: z.string().regex(/^#[0-9a-f]{6}$/i), accent: z.string().regex(/^#[0-9a-f]{6}$/i), name: z.string().trim().min(1).max(160) }).strict().optional(),
 pages: z.array(z.object({ id, path: z.string().regex(/^\/(?:[a-z0-9-]+\/?)*$/).max(200), title: z.string().trim().min(1).max(160), fields: z.array(z.object({ id, kind: z.enum(["text", "image", "link"]), label: z.string().min(1).max(160), maxLength: z.number().int().positive().max(10000).optional(), role: z.enum(["heading", "body", "action-label", "action-link", "image", "image-alt"]).optional() }).strict()).min(1).max(200) }).strict()).min(1).max(100),
}).strict().superRefine((m, ctx) => {
 const pages=m.pages.map(p=>p.id), paths=m.pages.map(p=>p.path), fields=m.pages.flatMap(p=>p.fields.map(f=>f.id));
 if(new Set(pages).size!==pages.length||new Set(paths).size!==paths.length||new Set(fields).size!==fields.length||!paths.includes("/"))ctx.addIssue({code:"custom",message:"Pages, paths and fields must be unique, with one home page."});
 for(const p of m.pages)for(const f of p.fields)if((f.role==="image"&&f.kind!=="image")||(f.role==="action-link"&&f.kind!=="link"))ctx.addIssue({code:"custom",message:"Field type does not match its role."});
});
export function defaultSite(project: {id:string;name:string;brief:Record<string,unknown>}): {manifest: SiteManifest;content: SiteContent} {
 return {manifest:{siteId:project.id,revision:"1",theme:{layout:"editorial",name:project.name,background:"#f3f1e9",ink:"#191a18",accent:"#d8ddc8"},pages:[{id:"home",path:"/",title:"Home",fields:[
  {id:"heading",kind:"text",role:"heading",label:"Main heading",maxLength:160},
  {id:"description",kind:"text",role:"body",label:"Introduction",maxLength:3000},
  {id:"hero-image",kind:"image",role:"image",label:"Main image"},
  {id:"hero-alt",kind:"text",role:"image-alt",label:"Image description",maxLength:300},
  {id:"action-label",kind:"text",role:"action-label",label:"Action label",maxLength:80},
  {id:"action-link",kind:"link",role:"action-link",label:"Action destination",maxLength:2000}
 ]}]},content:{fields:{heading:project.name,description:String(project.brief.description||""),"hero-image":"","hero-alt":"","action-label":"Get in touch","action-link":"#contact"},seo:{home:{title:project.name,description:String(project.brief.description||"").slice(0,500),noindex:false}}}};
}
export function fieldValue(manifest: SiteManifest,content:SiteContent,pageId:string,role:string) {
 const f=manifest.pages.find(p=>p.id===pageId)?.fields.find(f=>f.role===role);return f?content.fields[f.id]||"":"";
}
