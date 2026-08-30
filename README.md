# Portfolio

[Full-cycle Engineer](https://me.kt-tech.blog) のポートフォリオサイト。

React Three Fiber の粒子表現をスクロールでくぐり抜ける1枚のランディングページ。
経歴以外のコンテンツ（ブログ記事・GitHubリポジトリ）は**ビルド時に自動取得**するので、
公開後に手で書き足す運用は発生しない。

## 構成

| | |
|---|---|
| フレームワーク | Next.js 15（App Router / `output: "export"` の完全静的） |
| 3D | React Three Fiber + カスタムGLSLシェーダー |
| 演出 | Motion（旧 Framer Motion）/ Lenis（慣性スクロール） |
| スタイル | Tailwind CSS v4 |
| ホスティング | Cloudflare Pages |

3Dは**経歴1件につき粒子の環が1つ**あり、スクロールに合わせてカメラが環をくぐり抜ける。
`data/career.json` の件数が変われば環の数も自動で追従する。

## 開発

```bash
npm install
npm run dev      # http://localhost:3100
npm run build    # out/ に静的サイトを書き出す
npm run feeds    # 外部データだけ取り直す
```

> **注意**: `npm run dev` の実行中に `npm run build` すると、`.next` を作り直す都合で
> devサーバーが落ちる。ビルドする前にdevサーバーを止めること。

## コンテンツの直し方

### 経歴・スキル・自己紹介

`data/career.json` を直接編集する。

- 会社名の `（業務委託）` は自動で `CONTRACT` バッジに変換される（`lib/career.ts` の `parseCompany`）
- 経歴を1件増やすと3Dの環も1つ増える

### 肩書き・キャッチコピー

`lib/site.ts` の `SITE.role` / `SITE.tagline` を直す。ここ1箇所で全画面に反映される。

### Works に出すリポジトリ

`data/works-config.json` の `feature` 配列に**出したいリポジトリ名を並べる**（この順で表示）。
ここに書いていないリポジトリは出ない。学習用リポジトリが並ぶのを防ぐためのホワイトリスト方式。

`overrides` でカードの表示名と説明文を上書きできる。

## 自動更新の仕組み

`npm run build` の前に `scripts/fetch-feeds.mjs` が走り、次の2つを取得して `data/` に保存する。

1. ブログ記事 — `https://kt-tech.blog/feed.xml`（RSS/Atom両対応）
2. GitHubリポジトリ — GitHub REST API

**取得に失敗してもビルドは止まらない。** 前回取得したJSONをそのまま使って続行する
（実際にこのサイトの構築中、ブログのfeedが断続的に500を返していた）。

GitHub Actions が毎日 JST 6:00 に再取得してデプロイし、
差分があれば `data/*.json` をコミットしてフォールバックを新しく保つ。

## デプロイ

`main` への push、または日次のスケジュール実行で Cloudflare Pages へ自動デプロイされる。

必要なシークレット:

| 名前 | 用途 |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Pages への書き込み権限を持つトークン |
| `CLOUDFLARE_ACCOUNT_ID` | CloudflareのアカウントID |

## 設計上の判断メモ

- **フォントを self-host している**。`next/font/google` はビルド時にGoogleへ取りに行くため、
  CI/CDが外部要因で落ちる。`public/fonts/SpaceGrotesk.woff2`（22KB）を同梱している
- **日本語フォントは配信していない**。数MBになるため、OS標準（ヒラギノ / 游ゴシック / Noto）に任せる
- **スクロール量を React の state に載せていない**。毎フレーム再レンダリングすると60fpsを維持できないので、
  `lib/scroll.ts` のミュータブルなオブジェクトを `useFrame` から直接読む
- **端末性能で品質を切り替える**。モバイルやコア数の少ない端末では粒子数を減らし、
  ポストエフェクト（Bloom）を無効化する。`prefers-reduced-motion` も同様に扱う
