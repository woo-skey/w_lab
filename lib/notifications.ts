import { supabase } from "./supabase";

export async function createNotification(
  userId: string,
  type: string,
  message: string
) {
  if (!userId) return;
  await supabase.from("notifications").insert([{ user_id: userId, type, message }]);
}

export async function notifyAllUsers(type: string, message: string) {
  const { data: users } = await supabase.from("users").select("id");
  if (!users || users.length === 0) return;
  await supabase.from("notifications").insert(
    users.map((u) => ({ user_id: u.id, type, message }))
  );
}
