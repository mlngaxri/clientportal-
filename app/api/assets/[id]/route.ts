import { userDb, admin, failure } from "../../../../lib/server";
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { client } = await userDb();
    const { id } = await params;
    const { data: asset, error } = await client
      .from("assets")
      .select("*")
      .eq("id", id)
      .single();
    if (error || !asset) throw new Error("Asset not found");
    const inline = /^(image\/(png|jpeg|webp|gif)|audio\/|video\/)/.test(
      asset.mime,
    );
    const { data, error: signing } = await admin()
      .storage.from("project-assets")
      .createSignedUrl(asset.storage_key, 60, {
        download: inline ? false : asset.name,
      });
    if (signing || !data) throw new Error("File unavailable");
    return new Response(null, {
      status: 307,
      headers: {
        Location: data.signedUrl,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    return failure(e);
  }
}
