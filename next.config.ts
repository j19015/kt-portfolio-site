import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // 完全な静的サイトとして出力する。
  // 3Dはすべてクライアント側で動き、外部データはビルド時にJSONへ焼くので
  // サーバーランタイムは要らない。Cloudflare Pages に out/ を置くだけで動く
  output: "export",

  // 静的エクスポートでは next/image の最適化サーバーが使えない
  images: { unoptimized: true },

  // 静的ホスティングで /about → /about/index.html を引かせる
  trailingSlash: true,

  // 親ディレクトリにも lockfile があるため、ワークスペース root を明示する
  turbopack: { root: path.resolve(".") },
};

export default nextConfig;
