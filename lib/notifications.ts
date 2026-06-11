import { supabase } from "./supabase";

export async function createNotification(
  userId: string,
  type: string,
  message: string,
  link?: string
) {
  if (!userId) return;
  await supabase.from("notifications").insert([{ user_id: userId, type, message, link: link || null }]);
}

export async function notifyAllUsers(type: string, message: string, link?: string, excludeUserId?: string) {
  const { data: users } = await supabase.from("users").select("id");
  if (!users || users.length === 0) return;
  const targets = excludeUserId ? users.filter((u) => u.id !== excludeUserId) : users;
  if (targets.length === 0) return;
  await supabase.from("notifications").insert(
    targets.map((u) => ({ user_id: u.id, type, message, link: link || null }))
  );
}
