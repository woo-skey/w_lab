// 인증은 전부 서버 Route Handler를 경유한다.
// 비밀번호 해시는 브라우저로 내려오지 않고, bcrypt 비교도 서버에서만 수행된다.
// 세션은 httpOnly 쿠키로 관리되며 localStorage 값은 UI 표시용 힌트일 뿐이다.

export interface AuthResult {
  success: boolean;
  error?: string;
  userId?: string;
  name?: string;
  isAdmin?: boolean;
  isMember?: boolean;
}

async function readError(res: Response, fallback: string): Promise<string> {
  try {
    const body = await res.json();
    return typeof body?.error === "string" ? body.error : fallback;
  } catch {
    return fallback;
  }
}

export async function checkUsernameExists(username: string): Promise<boolean> {
  const res = await fetch("/api/auth/check-username", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username }),
  });
  if (!res.ok) throw new Error(await readError(res, "확인 중 오류가 발생했습니다"));
  const body = await res.json();
  return !!body.exists;
}

export async function signup(
  username: string,
  password: string,
  name: string
): Promise<AuthResult> {
  try {
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, name }),
    });
    if (!res.ok) {
      return { success: false, error: await readError(res, "회원가입에 실패했습니다") };
    }
    const body = await res.json();
    return { success: true, userId: body.userId };
  } catch {
    return { success: false, error: "회원가입에 실패했습니다" };
  }
}

export async function login(username: string, password: string): Promise<AuthResult> {
  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      return { success: false, error: await readError(res, "로그인에 실패했습니다") };
    }
    const body = await res.json();
    return {
      success: true,
      userId: body.userId,
      name: body.name,
      isAdmin: !!body.isAdmin,
      isMember: !!body.isMember,
    };
  } catch {
    return { success: false, error: "로그인에 실패했습니다" };
  }
}

export async function logout(): Promise<void> {
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } catch {
    // 쿠키 삭제 실패는 무시 — 아래에서 localStorage는 어차피 비운다
  }
}
