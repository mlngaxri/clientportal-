import { userDb, checkOrigin, failure } from "../../../lib/server";
export async function GET() {
  try {
    const { client } = await userDb();
    const { data, error } = await client
      .from("projects")
      .select("*")
      .order("created_at");
    if (error) throw error;
    return Response.json(data);
  } catch (e) {
    return failure(e);
  }
}
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    const { client } = await userDb();
    const { data, error } = await client.rpc("ensure_onboarding_project");
    if (error) throw error;
    return Response.json(data);
  } catch (e) {
    return failure(e);
  }
}
