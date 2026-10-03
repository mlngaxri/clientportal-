import "server-only";
import { cache } from "react";
import { admin, ownedProject } from "../server";
import { evaluateStates, type ScheduledState } from "../states";
import { siteUrl } from "./builtin";
import type { SiteManifest, SiteContent } from "./service";
export const loadSite = cache(async function loadSite(
  id: string,
  review = false,
) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  if (review) await ownedProject(id);
  const client = admin();
  const [{ data: project }, { data: doc }] = await Promise.all([
    client
      .from("projects")
      .select("id,name,phase,pro")
      .eq("id", id)
      .maybeSingle(),
    client
      .from("site_documents")
      .select("*")
      .eq("project_id", id)
      .maybeSingle(),
  ]);
  if (!project || !doc || (!review && project.phase !== "LIVE")) return null;
  const { data: version } = review
    ? { data: null }
    : await client
        .from("site_versions")
        .select("manifest,content,revision")
        .eq("id", doc.published_id)
        .eq("project_id", id)
        .maybeSingle();
  if (!review && !version) return null;
  const manifest = (version?.manifest || doc.manifest) as SiteManifest;
  let content = (version?.content || doc.content) as SiteContent;
  if (project.pro && !review) {
    const { data: release, error: releaseError } = await client.from("state_releases").select("states").eq("project_id", id).maybeSingle();
    if (releaseError) throw releaseError;
    const states = (release?.states || []) as ScheduledState[];
    content = {
      ...content,
      fields: evaluateStates(states, new Date(), content.fields).content,
    };
  }
  const { data: settings } = await client
    .from("project_settings")
    .select("connections")
    .eq("project_id", id)
    .maybeSingle();
  return {
    project,
    manifest,
    content,
    revision: version?.revision || doc.revision,
    base: review ? `/review/${id}` : await siteUrl(id),
    connections: settings?.connections || {},
  };
});
