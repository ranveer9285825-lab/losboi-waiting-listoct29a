import { supabase } from "../../../lib/supabase";
import type { ReportCategoryId } from "./reportConfig";

type Result = { ok: true } | { ok: false; error: string };

export async function submitReport(input: {
  postId: string;
  userId: string;
  category: ReportCategoryId;
  description: string;
}): Promise<Result> {
  const description = input.description.trim();

  // Priority and status are set by a database trigger, so they cannot be tampered with from the browser.
  const { error } = await supabase.from("story_reports").insert({
    post_id: input.postId,
    reported_by: input.userId,
    category: input.category,
    description: description || null,
  });

  if (!error) return { ok: true };
  if (error.code === "23505") return { ok: false, error: "You have already reported this story." };
  return { ok: false, error: error.message };
}
