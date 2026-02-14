# じろりみ

ポケモンユナイトのソロ大会運営Webアプリケーション。

## 概要

エントリー管理・スイスドロー式チーム分け・試合進行・成績管理を一元的に提供し、年間を通じた継続的な大会開催を支える基盤。

## 大会の種類

- **ボーイズ じろカップ**: 男子ソロ大会
- **ガールズ りみカップ**: 女子ソロ大会
- 同日開催（昼: ボーイズ / 夜: ガールズ）

## 大会構造

```
大会
├── 予選1〜N（回数は大会ごとに設定可能）
└── グランドファイナル（上位20名によるダブルエリミネーション）
```

## ユーザー種別

| 種別 | 権限 |
|------|------|
| 未ログイン | 閲覧のみ |
| 参加者 | エントリー・チェックイン・勝敗入力 |
| 運営者 | 大会作成・管理・試合進行操作 |

## 主要機能

- Discord認証によるログイン
- プロフィール設定（プレイヤー名、X ID、性別、ロール優先順位）
- 予選単位のエントリー・チェックイン
- AIによるロール考慮のスイスドロー式チーム分け
- 試合進行管理（ロビー番号入力、勝敗入力）
- 成績・ランキング表示

## 技術スタック

- **認証**: Supabase Auth（Discord プロバイダー）
- **DB**: Supabase (PostgreSQL)
- **ホスティング**: Vercel
- **フレームワーク**: Next.js (App Router)
- **言語**: TypeScript (Frontend & Backend) / Python (Scripts)

## デプロイ・インフラ

| サービス | プロジェクト名 | URL / ID |
|---------|--------------|----------|
| Vercel | jiro-rimi | https://jiro-rimi.vercel.app |
| Supabase | JiroRimiCup | Reference ID: `nfotkbyzdyaqadnckgge` |
| GitHub | juv-shun/JiroRimi | https://github.com/juv-shun/JiroRimi |

### 環境変数

| 変数名 | 用途 | ローカル設定ファイル |
|--------|------|-------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase URL | `.env.local` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase Publishable Key（旧 ANON_KEY） | `.env.local` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Secret Key（サーバー/スクリプト用） | `.env.local` / `.env.production` |

- 本番の環境変数は Supabase Vercel Integration で自動同期（`NEXT_PUBLIC_SUPABASE_URL` のみ手動追加）
- `.env.local`: ローカル開発用、`.env.production`: 本番スクリプト用

## 利用者規模

同時接続 〜50人程度（小規模）

## ドキュメント

- [要件定義書](../docs/requirements.md) - 機能要件・TBD一覧
- [プロダクトバックログ](../docs/product_backlog.md) - 開発計画・進捗管理
- [データベース設計書](../docs/database_design.md) - テーブル定義・ER図
- [RLS設計書](../docs/rls_design.md) - Row Level Security ポリシー
- [画面設計書](../docs/screen_design.md) - 画面設計
