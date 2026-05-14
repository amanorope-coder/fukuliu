# SETUP.md — FUKULIU プロジェクト完全ガイド

> **対象**: このリポジトリで作業するすべての人・AIエージェント  
> リポジトリ: https://github.com/amanorope-coder/fukuliu  
> デプロイ先: GitHub Pages（`main` ブランチ直接公開）  
> サイトURL: https://amanorope-coder.github.io/fukuliu  
> *最終更新: 2026-05-14*

---

## 1. プロジェクト概要

**FUKULIU（伏流）** は関西発のアートプラットフォームサイト。  
ラジオ・記事・動画・対談を横断し、関西の美術シーンを発信する静的Webメディア。

- **運営者**: 天野紘寿（ヒロ）`amanorope@gmail.com`
- **技術スタック**: HTML / CSS / Vanilla JS のみ（ビルドツール・フレームワーク一切なし）
- **ホスティング**: GitHub Pages（`main` ブランチを直接デプロイ）

---

## 2. ディレクトリ構成

```
platform_web/
├── index.html               # トップページ（全セクションを含む単一ページ）
├── style.css                # 全ページ共通スタイル
├── dialogue-ichinen.html    # 連載「一年対談」専用ページ
├── dialogue-ichinen.json    # Discordからエクスポートした対談データ（JSON）
├── dokuryo.html             # 特集ページ「読了、その時。」
├── favicon.ico / favicon-32x32.png / apple-touch-icon.png
├── fukuryu-logo.png         # 伏流ロゴ（透過PNG・黒線画）
├── 伏流.png                  # ロゴ原画（白文字・グラデ背景）
├── logo.svg / logo-mark.svg # SVGロゴ
├── shuffle-text.js          # テキストシャッフルアニメーション
├── [その他画像]              # ラジオカバー画像等
├── articles/
│   ├── manifest.json        # 動的記事の一覧（エディタが自動管理）
│   └── YYYYMMDD-xxxxx.html  # 個別記事ページ（エディタで生成）
├── tools/
│   ├── submit.html          # 記事投稿・修正エディタ（GitHubトークン必要）
│   └── article-maker.html   # スタンドアロン記事生成ツール（トークン不要）
└── AGENTS.md / SETUP.md     # プロジェクトドキュメント
```

---

## 3. デザイントークン（CSS変数）

```css
/* カラーパレット */
--bg:        #fcfcfc;   /* ページ背景 */
--bg-dark:   #0e0e10;   /* ダークセクション背景（ラジオ等） */
--bg-soft:   #f3f3f4;   /* カード・サブ背景 */
--fg:        #111114;   /* 本文テキスト */
--fg-mute:   #5f6168;   /* サブテキスト */
--line:      #e3e3e6;   /* ボーダー */
--line-dark: #2a2a2e;   /* ダーク用ボーダー */
--accent:    #235BC8;   /* メインアクセント（ブルー） */
--accent2:   #F15A22;   /* サブアクセント（オレンジ） */

/* タイポグラフィ */
--serif: "Noto Serif JP", "Hiragino Mincho ProN", serif;
--sans:  "Inter", "Noto Sans JP", "Helvetica Neue", sans-serif;
--t:     cubic-bezier(.2,.7,.2,1);  /* トランジション */

/* レイアウト */
--max:   1240px;   /* コンテンツ最大幅 */
--pad-x: 6vw;      /* 左右パディング（モバイルは5vw） */
```

### カテゴリ色

| キー       | ラベル   | 色                     |
|------------|----------|------------------------|
| `essay`    | エッセイ | `#235BC8`（ブルー）    |
| `critique` | 批評     | `#7b3fbf`（パープル）  |
| `blog`     | ブログ   | `#1a9e5c`（グリーン）  |
| `art`      | 美術     | `#F15A22`（オレンジ）  |
| `dialogue` | 対談     | `#1a1a1a`（ダーク）    |

---

## 4. コーディングルール

- **ビルドツールなし**。`npm`・`webpack`・フレームワーク不使用。HTML + CSS + Vanilla JS のみ。
- **外部ライブラリなし**（Google Fonts・Spotify embed・shuffle-text.js は除く）。
- クラス名は BEM に近い命名（`block__element--modifier`）だが厳密ではない。
- アニメーションは CSS transitions のみ（`--t` 変数を使う）。
- `articles/` 内のHTMLは `../style.css` と `../fukuryu-logo.png` を参照する相対パス。
- `tools/` 内のHTMLは自己完結（外部CSSなし、スタイルはインライン）。
- コンテンツデータ（記事・ラジオ）は `index.html` 末尾の `<script>` 内の **JS配列** で管理。
- **テンプレートリテラル内に `</script>` を書く場合は必ず `<\/script>` とエスケープすること**（これを怠るとHTML全体のJSが壊れる）。

---

## 5. コンテンツ管理

### 5-1. ラジオエピソードを追加する

`index.html` 末尾 `<script>` 内の `radioEpisodes` 配列の**先頭**に追加する。

```js
const radioEpisodes = [
    {
        id: 'https://open.spotify.com/episode/XXXXX',  // SpotifyエピソードURL
        ep: 'EP.06',
        date: '2026.05.XX',
        title: 'エピソードタイトル',
        guest: 'ゲスト名（所属）',
        excerpt: '概要文',
        cover: '画像ファイル名.jpg'   // platform_web/ 直下に置く
    },
    // ... 既存エピソード
];
```

表示ルール: 最新エピソードのみ大きく表示、残りは ▽ ボタンで展開（2カラムグリッド）。

---

### 5-2. 記事を追加する（エディタ経由・推奨）

1. `tools/submit.html` をブラウザで開く（または GitHub Pages 上で開く）
2. GitHubトークン（`repo` スコープ付き Personal Access Token）を投稿キー欄に入力・保存
3. フォームに入力 → **公開する** ボタンを押す
4. 自動で以下が実行される：
   - `articles/YYYYMMDD-xxxxx.html` を生成してGitHubにコミット
   - `articles/manifest.json` を更新

> トークンはブラウザのlocalStorageに保存される（セッションをまたいで維持）。

---

### 5-3. 記事を追加する（手動）

1. `tools/article-maker.html` をブラウザで開く（トークン不要・完全スタンドアロン）
2. フォームに入力 → **HTMLをダウンロード**
3. ダウンロードされたHTMLを `articles/` フォルダに移動
4. `articles/manifest.json` の先頭に以下を追加:

```json
{
  "cat": "essay",
  "date": "2026.XX.XX",
  "title": "タイトル",
  "excerpt": "概要文",
  "author": "著者名",
  "url": "articles/YYYYMMDD-xxxxx.html",
  "_body": "本文（Markdown）",
  "_subtitle": "サブタイトル"
}
```

5. `git add . && git commit -m "記事追加" && git push`

---

### 5-4. 一年対談ログを更新する

```bash
# 1. Discordからエクスポート
~/Downloads/dce/DiscordChatExporter.Cli export \
  -t "BOT_TOKEN" -c "1497262854909333635" -f Json \
  -o ~/Desktop/dialogue.json

# 2. ファイルを上書き
chmod 644 ~/Desktop/platform_web/dialogue-ichinen.json
cp ~/Desktop/dialogue.json ~/Desktop/platform_web/dialogue-ichinen.json

# 3. index.html の updatedAt を更新日に変更（後述）

# 4. コミット・プッシュ
cd ~/Desktop/platform_web
git add dialogue-ichinen.json index.html
git commit -m "対談ログ更新 YYYY.MM.DD"
git push
```

**更新バッジの仕組み（自動）**:  
`index.html` の `articles` 配列内にある `updatedAt` の日付が `manifest.json` の最新記事日付より**新しい場合のみ**、自動で「更新」バッジが表示され TOP STORY に浮上する。古い記事が投稿されるとバッジは自動消滅する。

```js
// index.html の articles 配列（一年対談エントリ）
{
    cat: 'dialogue',
    date: '2026.04.25 —',
    updatedAt: '2026.05.11',  // ← 更新のたびにここを今日の日付に書き換える
    title: '一年対談 — マツモリ × タシロ',
    ...
}
```

> ⚠️ `updated: true/false` のような手動フラグは廃止済み。`updatedAt` だけを管理すればよい。

---

## 6. 機能一覧

### いいね・コメント

- **実装**: 各記事ページ（`articles/*.html`）にlocalStorageベースで実装
- **データ**: ブラウザのみに保存（サーバー不要・ユーザー間共有なし）
- **キー**: `fk_likes_[ファイル名]`, `fk_liked_[ファイル名]`, `fk_comments_[ファイル名]`
- エディタ（`tools/submit.html`）で生成される記事HTMLにも自動で含まれる

### Google Analytics

- **ID**: `G-4FLG1F6QJ6`
- **設置済みページ**: 全HTMLページ（index.html・各記事・dialogue-ichinen.html・dokuryo.html・submit.html）
- **注意**: HTMLテンプレートリテラル内にGAコードを書く場合は `<\/script>` とエスケープすること

### 一年対談ページ（dialogue-ichinen.html）

- `dialogue-ichinen.json` を `fetch()` で読み込んでレンダリング
- 話者マッピング:
  ```js
  const SPEAKER_MAP = {
      'heyryom':                    { display: 'マツモリ', key: 'matsumori', initial: 'M' },
      'tashiroamazingdaimaou_57235': { display: 'タシロ',   key: 'tashiro',   initial: 'T' },
      'amano0157_97377':             { display: 'アマノ',   key: 'other',     initial: 'A' },
  };
  ```
- ⚠️ `file://` で直接開くと `fetch()` が失敗する。GitHub Pages か Live Server で確認。

---

## 7. 外部サービス

| サービス | 用途 | 情報 |
|----------|------|------|
| Spotify | ラジオ埋め込み | 番組URL: `https://open.spotify.com/show/6TLeThJuz0o47VzxMjzZap` |
| Discord | 一年対談ログ元 | サーバーID: `1470674464189448194` / チャンネルID: `1497262854909333635` |
| DiscordChatExporter | Discord JSON出力ツール | インストール先: `~/Downloads/dce/` |
| GitHub Pages | ホスティング | リポジトリ: `amanorope-coder/fukuliu` |
| Google Analytics | アクセス解析 | ID: `G-4FLG1F6QJ6` |

> **セキュリティ**: Discord Bot トークン・GitHubトークンはリポジトリに含めないこと。

---

## 8. ブランチ運用・デプロイ

- `main` ブランチ直接運用。GitHub Pages は `main` から自動デプロイ（反映まで1〜2分）。
- コミットメッセージは日本語でよい。
- 記事追加: `git add . && git commit -m "記事追加: タイトル" && git push`
- バグ修正: `git add . && git commit -m "fix: 内容" && git push`

---

## 9. 未解決の課題・今後の実装予定

| 優先度 | 項目 |
|--------|------|
| 高 | バックナンバーのフィルタ機能（現状は見た目のみ） |
| 中 | いいね・コメントのサーバー共有化（Supabase等、規模が大きくなったら） |
| 中 | モバイル対応の強化（対談ページ吹き出しレイアウト） |
| 低 | OGP / SNS シェア用メタタグの整備 |
| 低 | 記事メーカーのスラッグベースファイル名 |
| 低 | `Load more`（バックナンバー）の実実装 |
