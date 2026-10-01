import "server-only";
import { admin } from "../server";
import { appOrigin } from "../site/builtin";
export async function deliverNotifications(batch=5){
 if(!process.env.RESEND_API_KEY||!process.env.EMAIL_FROM)return {accepted:0,pending:true};const service=admin();const {data,error}=await service.rpc("claim_notifications",{batch_size:Math.min(batch,10)});if(error)throw error;let accepted=0;
 for(const row of data||[]){
  if(row.last_error==="acknowledgement_unknown"&&Date.now()-Date.parse(row.first_attempt_at)>23*3600000){await service.from("notification_outbox").update({attempts:8,lease_until:null,last_error:"manual_review_required",delivery_status:"unknown"}).eq("id",row.id);continue;}
  try{const response=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,"Content-Type":"application/json","Idempotency-Key":`fourthform-${row.id}`},body:JSON.stringify({from:process.env.EMAIL_FROM,to:[row.recipient],subject:row.subject,text:`${row.message}\n\n${appOrigin()}/projects/${row.project_id}/${row.kind==="form"?"inbox":"overview"}`}),redirect:"error",signal:AbortSignal.timeout(15000)});
   const value=await response.json().catch(()=>({}));if(!response.ok||typeof value.id!=="string")throw new Error(response.status>=500?"acknowledgement_unknown":"provider_rejected");
   const {error:saving}=await service.from("notification_outbox").update({provider_id:value.id,sent_at:new Date().toISOString(),delivery_status:"accepted",lease_until:null,last_error:null}).eq("id",row.id);if(saving)throw new Error("acknowledgement_unknown");accepted++;
  }catch(e){const category=e instanceof Error&&e.message==="provider_rejected"?"provider_rejected":"acknowledgement_unknown";await service.from("notification_outbox").update({lease_until:null,last_error:category,next_attempt:new Date(Date.now()+Math.min(3600000,60000*2**row.attempts)).toISOString()}).eq("id",row.id);console.error(JSON.stringify({event:"notification_retry",category,id:row.id}));}
 }return {accepted,pending:false};
}
