"use client";

import dynamic from "next/dynamic";

// WebGLはSSRできないのでクライアント限定で読み込む。
// Server Component から直接 ssr:false は指定できないため、この薄いラッパを噛ませる
const Scene = dynamic(() => import("./Scene"), { ssr: false });

export default function SceneMount() {
  return <Scene />;
}
