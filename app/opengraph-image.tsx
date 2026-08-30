import { ImageResponse } from "next/og";
import { SITE } from "@/lib/site";

// output: export では明示しないとビルドが通らない
export const dynamic = "force-static";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = `${SITE.nameEn} — ${SITE.role}`;

/**
 * SNS共有用のOG画像。ビルド時に一度だけ生成される。
 * 3Dは焼けないので、サイトのモチーフである環を同心円で表現する。
 */
export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#08080c",
          position: "relative",
        }}
      >
        {/* 背景の環 */}
        {[300, 380, 460].map((r, i) => (
          <div
            key={r}
            style={{
              position: "absolute",
              width: r,
              height: r,
              borderRadius: r,
              border: `1px solid rgba(255,157,77,${0.28 - i * 0.08})`,
            }}
          />
        ))}

        <div
          style={{
            fontSize: 26,
            letterSpacing: 14,
            color: "#ff9d4d",
            marginBottom: 30,
            display: "flex",
          }}
        >
          HAMAMATSU, JAPAN
        </div>

        <div
          style={{
            fontSize: 96,
            fontWeight: 600,
            color: "#f2f0ec",
            letterSpacing: -3,
            lineHeight: 1,
            display: "flex",
          }}
        >
          {SITE.nameEn}
        </div>

        <div
          style={{
            marginTop: 34,
            fontSize: 32,
            letterSpacing: 9,
            color: "#ff9d4d",
            textTransform: "uppercase",
            display: "flex",
          }}
        >
          {SITE.role}
        </div>
      </div>
    ),
    size,
  );
}
