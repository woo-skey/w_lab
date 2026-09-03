import { NextResponse, type NextRequest } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { jsonError, requireUser, isResponse } from "@/lib/serverAuth";

// 확장자는 파일명이 아니라 MIME 타입에서 결정한다.
// 파일명 기반(`file.name.split(".").pop()`)은 확장자가 없는 파일에서 파일명 전체가 확장자가 되는 버그가 있었다.
const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};
const ALL_EXTS = ["jpg", "png", "webp", "gif"];
const MAX_BYTES = 2 * 1024 * 1024; // 2MB

export async function POST(req: NextRequest) {
  const session = requireUser(req);
  if (isResponse(session)) return session;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return jsonError("잘못된 요청입니다", 400);
  }

  const file = form.get("file");
  if (!(file instanceof File)) return jsonError("파일이 없습니다", 400);

  const ext = EXT_BY_MIME[file.type];
  if (!ext) return jsonError("JPG, PNG, WEBP, GIF 이미지만 업로드할 수 있습니다", 400);
  if (file.size === 0) return jsonError("빈 파일은 업로드할 수 없습니다", 400);
  if (file.size > MAX_BYTES) return jsonError("이미지 크기는 2MB 이하여야 합니다", 400);

  try {
    const admin = getAdminClient();
    // 경로는 세션의 userId로만 만든다 — 클라이언트가 보낸 값으로 남의 아바타를 덮어쓸 수 없다.
    const path = `${session.userId}/avatar.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await admin.storage
      .from("avatars")
      .upload(path, buffer, { upsert: true, contentType: file.type });
    if (uploadError) throw uploadError;

    // 확장자가 바뀐 경우 남는 이전 파일 정리
    const stale = ALL_EXTS.filter((e) => e !== ext).map((e) => `${session.userId}/avatar.${e}`);
    await admin.storage.from("avatars").remove(stale);

    const { data } = admin.storage.from("avatars").getPublicUrl(path);
    const avatarUrl = `${data.publicUrl}?t=${Date.now()}`;

    const { error: updateError } = await admin
      .from("users")
      .update({ avatar_url: avatarUrl })
      .eq("id", session.userId);
    if (updateError) throw updateError;

    return NextResponse.json({ avatarUrl });
  } catch (err) {
    console.error("avatar upload failed", err);
    return jsonError("업로드에 실패했습니다", 500);
  }
}
