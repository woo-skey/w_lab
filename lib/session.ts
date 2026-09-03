import crypto from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";

// 서버 전용 세션 토큰. 브라우저에는 httpOnly 쿠키로만 전달되며 JS에서 읽을 수 없다.
// 페이로드에는 uid/exp만 담는다 — is_admin 같은 권한은 매 요청마다 DB에서 새로 읽어야
// 권한 회수가 즉시 반영되고, 토큰 스냅샷을 신뢰하는 실수를 원천 차단할 수 있다.
export const SESSION_COOKIE = "wlab_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30일

interface SessionPayload {
  uid: string;
  exp: number;
}

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET 환경변수가 없거나 32자 미만입니다");
  }
  return secret;
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

export function createSessionToken(userId: string): string {
  const payload: SessionPayload = {
    uid: userId,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

export function verifySessionToken(token: string | undefined | null): string | null {
  if (!token) return null;

  const dot = token.indexOf(".");
  if (dot <= 0) return null;

  const encoded = token.slice(0, dot);
  const signature = token.slice(dot + 1);

  let expected: string;
  try {
    expected = sign(encoded);
  } catch {
    return null; // SESSION_SECRET 미설정 — 인증 실패로 처리
  }

  const given = Buffer.from(signature);
  const want = Buffer.from(expected);
  if (given.length !== want.length || !crypto.timingSafeEqual(given, want)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString()) as SessionPayload;
    if (!payload.uid || typeof payload.exp !== "number") return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload.uid;
  } catch {
    return null;
  }
}

export function getSessionUserId(req: NextRequest): string | null {
  return verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
}

export function setSessionCookie(res: NextResponse, userId: string): void {
  res.cookies.set(SESSION_COOKIE, createSessionToken(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export function clearSessionCookie(res: NextResponse): void {
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}
