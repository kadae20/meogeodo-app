import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "먹어도될까 — 장볼 때마다 원재료를 다시 읽지 않게";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 72,
          background: "#f8fafc",
          color: "#0f172a",
        }}
      >
        <div style={{ fontSize: 22, color: "#047857", fontWeight: 600 }}>먹어도될까</div>
        <div style={{ marginTop: 18, fontSize: 48, fontWeight: 700, lineHeight: 1.25 }}>
          장볼 때마다
          <br />
          원재료를 다시 읽지 않게
        </div>
      </div>
    ),
    { ...size }
  );
}
