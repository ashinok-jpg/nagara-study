# ながら勉強

家事やテレアポをしながら勉強するためのWebアプリ。
教材を取り込むと短いカードに区切り、数分おきに1枚出して、読んだらすぐテストする。

- 仕様：[docs/SPEC.md](docs/SPEC.md)（区切りルール・問題作成ルール・セッション・画面）
- 教材の作り方：[docs/RESEARCH_RULES.md](docs/RESEARCH_RULES.md)
- 同梱の教材：`materials/<テーマ>/*.md`（世界史・半導体・C++・サイバーセキュリティ）

## 手元で動かす（WSL の Ubuntu ターミナル）

```bash
cd ~/nagara-study
export PATH=$HOME/.local/node/bin:$PATH
npm install      # 初回だけ
npm run dev      # http://localhost:5173 で開く
npm test         # テスト（教材の品質チェックを含む）
npm run build    # dist/ に公開用ファイルを作る
```

## GitHub Pages で公開する（最初の1回だけ）

1. GitHub で新しいリポジトリ `nagara-study` を作る（README などは追加しない）。
   - 無料プランで GitHub Pages を使うには **Public**（公開）にする必要がある。教材もコードも誰でも見られる状態になる点に注意。
2. WSL から push できるようにする。Windows に入っている Git の認証（Git Credential Manager）を使う：

   ```bash
   git config --global credential.helper "/mnt/c/Program\ Files/Git/mingw64/bin/git-credential-manager.exe"
   ```

3. リポジトリをつないで push する（`<ユーザー名>` は自分の GitHub ユーザー名）：

   ```bash
   cd ~/nagara-study
   git branch -M main
   git remote add origin https://github.com/<ユーザー名>/nagara-study.git
   git push -u origin main
   ```

4. GitHub のリポジトリ画面で **Settings → Pages → Build and deployment → Source** を **GitHub Actions** にする。
5. **Actions** タブで「Deploy to GitHub Pages」が緑になったら、`https://<ユーザー名>.github.io/nagara-study/` で開ける。

以後は `git push` するたびに、テスト → ビルド → 公開が自動で行われる。テスト（教材の品質チェックを含む）が落ちたら公開されない。

## スマホで使う

- 公開URLをスマホのブラウザで開き、「ホーム画面に追加」するとアプリのように使える（オフラインでも動く）。
- 教材を増やす：`materials/<テーマ>/` に md を追加して push する（アプリの「教材ライブラリ」に並ぶ）。または、アプリの「取り込み」画面でファイルを選ぶ／貼り付ける（その端末だけに保存される）。

## 通知について（Webアプリの制約）

- アプリを開いている間は、カウントダウンが0になると音と振動で次のカードを出す。
- 別のタブやアプリに切り替えているときは、ブラウザの通知で知らせる（設定画面で通知を許可したとき。PC と Android の Chrome）。
- **iPhone や画面ロック中は、Webアプリから時間指定の通知を出せない**。ながら勉強中は画面をつけたまま（設定の「画面を消さない」）で使う。
