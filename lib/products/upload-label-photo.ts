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

/** 여러 장을 순차적으로 업로드하고 성공한 URL만 담아 반환한다. */
export async function uploadLabelPhotos(
  supabase: SupabaseClient,
  files: File[]
): Promise<string[]> {
  const urls: string[] = [];
  for (const file of files) {
    const url = await uploadLabelPhoto(supabase, file);
    if (url) urls.push(url);
  }
  return urls;
}

/** label-photos 버켓에서 공개 URL에 해당하는 파일을 삭제한다. 실패해도 조용히 무시한다 (고아 파일 방지용 best-effort). */
export async function deleteLabelPhoto(
  supabase: SupabaseClient,
  publicUrl: string
): Promise<void> {
  try {
    const marker = "/object/public/label-photos/";
    const idx = publicUrl.indexOf(marker);
    if (idx < 0) return;
    const path = decodeURIComponent(publicUrl.slice(idx + marker.length));
    if (!path) return;
    await supabase.storage.from("label-photos").remove([path]);
  } catch (err) {
    console.warn("[deleteLabelPhoto] 삭제 중 오류:", err);
  }
}
