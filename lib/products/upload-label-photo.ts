// 라벨 사진을 Supabase Storage(label-photos 버킷)에 올리고 공개 URL을 반환한다.
// 버킷이 아직 없거나(005 마이그레이션 미적용) 업로드가 실패해도 조용히 null을 반환해
// 기존 OCR 플로우가 깨지지 않도록 한다 (best-effort, non-blocking).
import type { SupabaseClient } from "@supabase/supabase-js";

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export async function uploadLabelPhoto(
  supabase: SupabaseClient,
  file: File
): Promise<string | null> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return null;

    const ext = EXT_BY_TYPE[file.type] ?? "jpg";
    const path = `${userId}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}.${ext}`;

    const { error } = await supabase.storage
      .from("label-photos")
      .upload(path, file, { contentType: file.type || "image/jpeg", upsert: false });

    if (error) {
      console.warn("[uploadLabelPhoto] 업로드를 건너뜁니다:", error.message);
      return null;
    }

    const { data } = supabase.storage.from("label-photos").getPublicUrl(path);
    return data?.publicUrl ?? null;
  } catch (err) {
    console.warn("[uploadLabelPhoto] 업로드 중 오류:", err);
    return null;
  }
}
