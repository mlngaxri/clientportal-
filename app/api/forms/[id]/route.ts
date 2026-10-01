import { after } from "next/server";
import { deliverNotifications } from "../../../../lib/services/notifications";
import { z } from "zod";
import { admin,failure } from "../../../../lib/server";
import { publicSiteOrigin } from "../../../../lib/site/origin";
import { requestSubject } from "../../../../lib/security/limits";
import { rateLimit } from "../../../../lib/security/abuse";
const input=z.object({id:z.uuid(),pageId:z.string().max(100),name:z.string().trim().min(1).max(160),email:z.email().max(254),message:z.string().trim().min(10).max(5000),website:z.string().max(500).default("")}).strict();
export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
 try {const id=z.uuid().parse((await params).id);await publicSiteOrigin(req,id);await rateLimit("form-minute",`${id}:${requestSubject(req)}`,5);await rateLimit("form-day",`${id}:${requestSubject(req)}`,30,86400);const body=input.parse(await req.json());if(body.website)return Response.json({received:true});const {error}=await admin().rpc("receive_site_form",{pid:id,submission:body.id,page:body.pageId,sender_name:body.name,sender_email:body.email,message_text:body.message});if(error)throw new Error("Your message could not be received. Try again.");after(()=>deliverNotifications());return Response.json({received:true});}catch(e){return failure(e);}
}
