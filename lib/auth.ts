import { supabase } from "./supabase";
import bcrypt from "bcryptjs";

export async function checkUsernameExists(username: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("users")
    .select("id")
    .eq("username", username)
    .single();

  if (error && error.code !== "PGRST116") {
    throw error;
  }

  return !!data;
}

export async function signup(
  username: string,
  password: string,
  name: string
): Promise<{ success: boolean; error?: string; userId?: string }> {
  try {
    // Check if username exists
    const exists = await checkUsernameExists(username);
    if (exists) {
      return { success: false, error: "이미 사용 중인 아이디입니다" };
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const { data, error } = await supabase
      .from("users")
      .insert([
        {
          username,
          password_hash: passwordHash,
          name,
        },
      ])
      .select("id")
      .single();

    if (error) {
      throw error;
    }

    return { success: true, userId: data.id };
  } catch (error) {
    return { success: false, error: "회원가입에 실패했습니다" };
  }
}

export async function login(
  username: string,
  password: string
): Promise<{ success: boolean; error?: string; userId?: string; name?: string; isAdmin?: boolean }> {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("id, password_hash, name, is_admin")
      .eq("username", username)
      .single();

    if (error || !data) {
      return { success: false, error: "아이디 또는 비밀번호가 잘못되었습니다" };
    }

    const passwordMatch = await bcrypt.compare(password, data.password_hash);
    if (!passwordMatch) {
      return { success: false, error: "아이디 또는 비밀번호가 잘못되었습니다" };
    }

    return { success: true, userId: data.id, name: data.name, isAdmin: data.is_admin || false };
  } catch (error) {
    return { success: false, error: "로그인에 실패했습니다" };
  }
}
