import type { MetadataRoute } from "next";
import { INDEXABLE } from "@/lib/site";

// output: export では明示しないとビルドが通らない
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  // 公開前はすべてのクローラを拒否する。INDEXABLE を true にすれば開く
  if (!INDEXABLE) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return { rules: { userAgent: "*", allow: "/" } };
}
