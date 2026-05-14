# AGENTS.md — FUKULIU プロジェクト引き継ぎドキュメント

> このファイルはAIエージェント（OpenAI Codex等）への作業引き継ぎを目的としています。
> リポジトリ: https://github.com/amanorope-coder/fukuliu
> デプロイ先: GitHub Pages（`main` ブランチ直接公開）

---

## 1. プロジェクト概要

**FUKULIU（伏流）** は関西発のアートプラットフォームサイト。  
ラジオ・動画・記事・対談を横断し、関西の美術シーンを発信する静的Webメディア。

- **運営者**: 天野紘寿（ヒロ / `amanorope@gmail.com`）
- **技術スタック**: 純粋な HTML / CSS / Vanilla JS のみ（ビルドツールなし）
- **ホスティング**: GitHub Pages（`main` ブランチを直接デプロイ）
- **ドメイン**: GitHub Pages デフォルトURL

---

## 2. ディレクトリ構成

```
platform_web/
├── index.html               # トップページ（全セクションを含む単一ページ）
├── style.css                # 全ページ共通スタイル
├── dialogue-ichinen.html    # 連載「一年対談」専用ページ
├── dialogue-ichinen.json    # Discord からエクスポートした対談データ（DiscordChatExporter JSON形式）
├── favicon.ico              # ファビコン（伏流.png から生成）
├── favicon-32x32.png        # ファビコン 32px
├── apple-touch-icon.png     # iOS ホーム画面アイコン 180px
├── fukuryu-logo.png         # 伏流ロゴ（透過PNG・黒線画）
├── 伏流.png                  # ロゴ原画（白文字・グラデ背景）
├── [その他画像]              # 記事・ラジオカバー画像
├── articles/                # 記事個別ページ置き場（生成されたHTMLを配置）
│   └── （未コミット）
└── tools/
    └── article-maker.html   # 記事生成ツール（ブラウザで動作、サーバー不要）
```

---

## 3. 完了済みの実装

### 3-1. トップページ（index.html）
- ヘッダー（ON AIRステータスバー、グローバルナビ、ハンバーガーメニュー）
- ヒーローセクション
- ラジオセクション（Spotify埋め込み、エピソードはJS配列で管理）
- 記事セクション（JS配列で管理、カテゴリ色分け）
- 動画セクション
- 連載番組グリッド（#02「一年対談」は `dialogue-ichinen.html` にリンク済み）
- Works / Shop / バックナンバー / About / フッター

### 3-2. 一年対談ページ（dialogue-ichinen.html）
- Discord チャンネル「松森×田代-一年対談」のログを表示
- データは `dialogue-ichinen.json` を `fetch()` で読み込んで描画
- 話者マッピング（Discord username → 表示名）は `SPEAKER_MAP` で管理
  ```js
  const SPEAKER_MAP = {
      'heyryom':                    { display: 'マツモリ', key: 'matsumori', initial: 'M' },
      'tashiroamazingdaimaou_57235': { display: 'タシロ',   key: 'tashiro',   initial: 'T' },
      'amano0157_97377':             { display: 'アマノ',   key: 'other',     initial: 'A' },
  };
  ```
- 吹き出しデザイン: マツモリ（左・青）、タシロ（右・オレンジ）、その他（左・グレー）

### 3-3. 記事メーカーツール（tools/article-maker.html）
- ブラウザ上で動作するスタンドアロンツール（サーバー不要）
- タイトル・サブタイトル・著者・日付・カテゴリ・本文を入力
- シンプルなMarkdownパーサー内蔵（`# h2`, `## h3`, `**bold**`, `*italic*`, `> quote`, `---`）
- 「HTMLをダウンロード」でサイトデザイン適用済みの記事HTMLを生成
- 生成された HTMLは `articles/` フォルダに置いてpushするだけで公開できる

### 3-4. ファビコン
- `伏流.png`（原画）から Python/Pillow で生成
- `favicon.ico`（16/32/48px）、`favicon-32x32.png`、`apple-touch-icon.png`（180px）
- 全HTMLページの `<head>` に `<link rel="icon">` タグ設置済み

---

## 4. コンテンツ管理の方法

### ラジオエピソードを追加する
`index.html` 末尾の `<script>` 内の `radioEpisodes` 配列の先頭に追加。  
`id` フィールドには Spotify エピソードURLをそのまま入れてよい。

### 記事を追加する
1. `tools/article-maker.html` をブラウザで開く
2. フォームに入力 → 「HTMLをダウンロード」
3. ダウンロードされた HTML を `articles/` フォルダに移動
4. `index.html` の `articles` 配列の先頭に以下を追加:
   ```js
   { cat: 'essay', date: '2026.XX.XX', title: 'タイトル', excerpt: '概要', author: '著者', url: 'articles/YYYYMMDD-article.html' }
   ```
5. `git add . && git commit -m "記事追加" && git push`

### 対談ログを更新する
1. DiscordChatExporter CLI でJSONをエクスポート:
   ```bash
   ~/Downloads/dce/DiscordChatExporter.Cli export \
     -t "BOT_TOKEN" -c "1497262854909333635" -f Json \
     -o ~/Desktop/dialogue.json
   ```
   チャンネルID: `1497262854909333635`（松森×田代-一年対談）
2. `dialogue.json` を `platform_web/dialogue-ichinen.json` に上書き
3. `git add . && git commit -m "対談ログ更新" && git push`

> **注意**: BotトークンはGitにコミットしないこと。エクスポート用に一時的に使うだけでよい。使用後はDiscord Developer Portalでトークンをリセットしてよい。

---

## 5. 未解決の課題・今後の実装予定

| 優先度 | 項目 | 詳細 |
|--------|------|------|
| 高 | **いいねボタンの共有化（Supabase）** | 現状はlocalStorage。Supabaseで全ユーザー共通のカウントに変更する（下記セクション参照） |
| 中 | 対談ページのローカルプレビュー問題 | `file://` で直接開くと `fetch()` が失敗する。VS Code Live Server か GitHub Pages でのみ確認可能 |
| 中 | モバイル対応の強化 | 基本的なレスポンシブは実装済みだが、対談ページのメッセージ吹き出しレイアウトにスマホでの崩れが出る可能性あり |
| 低 | `Load more` ボタンの実装 | バックナンバーセクションの「Load more」は現状ダミー |

### 解決済み（2026-05-14）
- ✅ `articles/` の記事を全て実パスで公開
- ✅ バックナンバーのフィルタ機能（実データ連動済み）
- ✅ ナビゲーションに「Dialogue」リンク追加
- ✅ 記事メーカーのスラッグ対応（タイトルベース自動生成・手動上書き可）
- ✅ OGP タグ（index.html に追加、全記事に `og:url` 追加）
- ✅ シェアバー（URLコピー・Instagram・X）を全記事 + article-maker テンプレートに追加

---

## 6. デザイントークン / コーディング規約

### カラーパレット（CSS変数）
```css
--bg:        #fcfcfc;   /* ページ背景 */
--bg-dark:   #0e0e10;   /* ダークセクション背景 */
--bg-soft:   #f3f3f4;   /* カード・サブ背景 */
--fg:        #111114;   /* 本文テキスト */
--fg-mute:   #5f6168;   /* サブテキスト */
--line:      #e3e3e6;   /* ボーダー */
--line-dark: #2a2a2e;   /* ダーク用ボーダー */
--accent:    #235BC8;   /* メインアクセント（ブルー） */
--accent2:   #F15A22;   /* サブアクセント（オレンジ） */
```

### タイポグラフィ
```css
--serif: "Noto Serif JP", "Hiragino Mincho ProN", serif;   /* 見出し・本文 */
--sans:  "Inter", "Noto Sans JP", "Helvetica Neue", sans-serif;  /* UI・ラベル */
```

### レイアウト
```css
--max:   1240px;  /* コンテンツ最大幅 */
--pad-x: 6vw;     /* 左右パディング（モバイルは5vw） */
```

### カテゴリ色
```css
--cat-review:   #F15A22;  /* 展示レビュー */
--cat-essay:    #235BC8;  /* エッセイ */
--cat-dialogue: #1a1a1a;  /* 対談 */
```

### コーディングルール
- **ビルドツールなし**。`npm`・`webpack`・フレームワーク不使用。HTML + CSS + Vanilla JS のみ。
- **外部ライブラリなし**（Google Fonts と Spotify embed は除く）。
- コンテンツデータ（記事・エピソード）は `index.html` 末尾の `<script>` 内の **JS配列** で管理。
- クラス名は BEM に近い命名（`block__element--modifier`）だが厳密ではない。
- アニメーションは CSS transitions のみ（`--t: cubic-bezier(.2,.7,.2,1)`）。
- `articles/` 内のHTMLは `../style.css` と `../fukuryu-logo.png` を参照する相対パス。
- `tools/` 内のHTMLは自己完結（外部CSSなし、スタイルはインライン）。

### ブランチ運用
- `main` ブランチ直接運用。GitHub Pages は `main` から自動デプロイ。
- コミットメッセージは日本語でよい。

---

## 7. 外部サービス・認証情報

| サービス | 用途 | メモ |
|----------|------|------|
| Spotify | ラジオエピソード埋め込み | 番組URL: `https://open.spotify.com/show/6TLeThJuz0o47VzxMjzZap` |
| Discord | 一年対談ログのエクスポート元 | サーバーID: `1470674464189448194` / チャンネルID: `1497262854909333635` |
| DiscordChatExporter | Discord JSONエクスポートツール | インストール先: `~/Downloads/dce/` |
| GitHub Pages | ホスティング | リポジトリ: `amanorope-coder/fukuliu` |

> **セキュリティ**: Discord Bot トークンはリポジトリに含まれていない。必要時のみDeveloper Portalで発行・使用後リセット。

---

---

## 8. 次の実装：いいねボタンの共有化（Supabase）

### 概要
現状のいいねボタンは `localStorage` 保存のため、ブラウザをまたいで共有されない。
Supabase（無料tier）を使って全ユーザーが同じカウントを見られるようにする。
コメント欄は引き続き localStorage のまま（スパム・モデレーション問題のため）。

### 事前作業（人手が必要）
1. [supabase.com](https://supabase.com) でアカウント作成・新規プロジェクト作成
2. SQL エディタで以下を実行してテーブルを作成:
   ```sql
   create table likes (
     article_id text primary key,
     count      integer not null default 0
   );
   -- 誰でも読める・更新できる（ログイン不要）
   alter table likes enable row level security;
   create policy "public read"   on likes for select using (true);
   create policy "public update" on likes for update using (true);
   create policy "public insert" on likes for insert with check (true);
   ```
3. Project Settings → API から以下を控える:
   - `Project URL`（例: `https://xxxx.supabase.co`）
   - `anon public key`（公開鍵、コミットしてOK）

### 実装内容（AIへの指示）
上記の URL と anon key が手元にある状態でセッションを開始し、以下を依頼する:

> 「Supabase のいいね実装をしてください。  
> Project URL: `https://xxxx.supabase.co`  
> anon key: `eyJ...`」

**変更対象ファイル（計8本）:**
- `articles/20260425-kyoto-april-exhibitions.html`
- `articles/20260508-kl8jo.html`
- `articles/20260509-02txu.html`
- `articles/20260510-10ehz.html`
- `articles/20260511-9d556.html`
- `articles/20260512-y4606.html`
- `articles/20260513-u1f96.html`
- `tools/article-maker.html`（テンプレートに反映）

**各ファイルの変更内容:**
1. `<head>` に Supabase CDN を追加:
   ```html
   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
   ```
2. `<script>` 内の Like/Comment ブロックを以下のロジックに置き換える:
   ```js
   // いいね（Supabase共有 + localStorage で1ブラウザ1票）
   const SUPABASE_URL = 'https://xxxx.supabase.co';
   const SUPABASE_KEY = 'eyJ...';
   const _sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
   const ARTICLE_ID = location.pathname.replace(/.*\//, '').replace('.html', '');
   const LIKED_KEY  = 'fk_liked_' + ARTICLE_ID;

   async function loadLikes() {
     const { data } = await _sb.from('likes').select('count').eq('article_id', ARTICLE_ID).single();
     const count = data?.count ?? 0;
     document.getElementById('like-count').textContent = count;
     const liked = localStorage.getItem(LIKED_KEY) === '1';
     document.getElementById('like-btn').classList.toggle('is-liked', liked);
   }

   window.toggleLike = async function() {
     const liked = localStorage.getItem(LIKED_KEY) === '1';
     if (liked) return; // 既にいいね済み → 何もしない
     // upsert でカウント+1
     await _sb.rpc('increment_likes', { p_article_id: ARTICLE_ID });
     localStorage.setItem(LIKED_KEY, '1');
     loadLikes();
   };

   loadLikes();
   ```
3. Supabase に RPC 関数を追加（SQL エディタで実行）:
   ```sql
   create or replace function increment_likes(p_article_id text)
   returns void language plpgsql as $$
   begin
     insert into likes (article_id, count) values (p_article_id, 1)
     on conflict (article_id) do update set count = likes.count + 1;
   end;
   $$;
   ```

### 注意
- anon key はフロントエンドに公開するが問題ない（読み取り・カウント更新のみ許可）
- 1ブラウザ1票は localStorage で管理（取り消し不可）
- カウントのリセット・手動修正は Supabase ダッシュボードの Table Editor から直接編集する

---

*最終更新: 2026-05-14*
