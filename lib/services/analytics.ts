import { createHmac } from "node:crypto";
export function analyticsIdentity(subject:string,ua:string,projectId:string,secret:string,at=new Date()) {
 if(!secret)throw new Error("Analytics is not configured.");
 return createHmac("sha256",secret).update(`${projectId}:${at.toISOString().slice(0,10)}:${subject}:${ua}`).digest("hex");
}
export function trafficSource(host:string,ownHost:string) {try{const parsed=new URL(`https://${host}`);return parsed.hostname===ownHost||!host?"Direct":parsed.hostname.slice(0,253);}catch{return "Direct";}}
export function deviceKind(ua:string){return /ipad|tablet/i.test(ua)?"Tablet":/mobile|iphone|android/i.test(ua)?"Mobile":"Desktop";}
export function ignoreTraffic(headers:Headers){return headers.get("dnt")==="1"||headers.get("sec-gpc")==="1"||/bot|crawler|spider|headless/i.test(headers.get("user-agent")||"");}
