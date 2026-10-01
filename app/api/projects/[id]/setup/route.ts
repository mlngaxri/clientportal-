import { checkOrigin,ownedProject,failure } from "../../../../../lib/server";
import { manifestSchema,contentSchema } from "../../../../../lib/site/schema";
import { validateContent } from "../../../../../lib/site/service";
import { appOrigin } from "../../../../../lib/site/builtin";
export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
 try {checkOrigin(req);const {id}=await params;const {client,user}=await ownedProject(id);if(user.app_metadata?.role!=="operator")throw new Error("Only Fourthform can define a website.");const body=await req.json();const manifest=manifestSchema.parse(body.manifest),content=contentSchema.parse(body.content);const issues=validateContent(manifest,content);if(issues.length)throw new Error(issues.join("\n"));const {error}=await client.rpc("register_site",{pid:id,definition:manifest,value:content});if(error)throw new Error(error.message);return Response.json({previewUrl:`${appOrigin()}/review/${id}`});}catch(e){return failure(e);}
}
