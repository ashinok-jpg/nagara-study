# 出典（サイバーセキュリティ）

確認日はすべて 2026-11-08。数字・日付は2つ以上の情報源で照合した。食い違いや注意点は「注意」に書いた。

---

## 01-fundamentals.md 情報セキュリティの基本の考え方

### 情報セキュリティとは何か／機密性・完全性・可用性／3要素に加わる4つの性質
- 総務省「国民のためのサイバーセキュリティサイト」 https://www.soumu.go.jp/main_sosiki/cybersecurity/kokumin/
- IPA「情報セキュリティマネジメント試験」（出題範囲・シラバス） https://www.ipa.go.jp/shiken/kubun/sg.html
- 日本産業標準調査会（JISC）JIS Q 27000（ISO/IEC 27000 の対応規格。用語の定義） https://www.jisc.go.jp/
- 注意：7要素（真正性・責任追跡性・否認防止・信頼性を加えたもの）は、JIS Q 27000 の定義と情報処理技術者試験の解説で一致。

### 脅威・脆弱性・リスク／リスクアセスメント／リスク対応の4つの方法
- IPA「中小企業の情報セキュリティ対策ガイドライン」 https://www.ipa.go.jp/security/guide/sme/about.html
- IPA「情報セキュリティマネジメント試験」（上記）
- 注意：リスク保有は「リスク受容」、リスク移転は「リスク共有」とも呼ばれる（試験の解説で併記）。

### 人的・技術的・物理的対策
- 総務省「国民のためのサイバーセキュリティサイト」（上記）
- IPA「中小企業の情報セキュリティ対策ガイドライン」（上記）

### まず守りたい基本の習慣
- IPA「SECURITY ACTION とは？」（一つ星は「情報セキュリティ6か条」） https://www.ipa.go.jp/security/security-action/sa/
- i Magazine「IPAが中小企業の情報セキュリティ対策ガイドラインを改訂し、第4.0版を公開」（バックアップを追加し6か条へ） https://www.imagazine.co.jp/ipa-report-on-20260327/
- 使えるねっと「情報セキュリティ6か条とは？」（6か条の項目） https://www.tsukaeru.net/blog/ipa-information-security6-rules/
- 注意：第4.0版の公開日は資料により2026年3月27日／29日の表記がある。本文は「2026年3月」とした。6か条の並び順は解説記事によって異なるため、本文では番号を付けて断定していない。

---

## 02-attacks.md 攻撃の手口と対策

### マルウェア
- 総務省「マルウェア（ウイルス等）とは？」（国民のためのサイバーセキュリティサイト） https://www.soumu.go.jp/main_sosiki/cybersecurity/kokumin/
- IPA「情報セキュリティマネジメント試験」（上記）

### ランサムウェア
- 警察庁「令和７年におけるサイバー空間をめぐる脅威の情勢等について」（ノーウェアランサムの用語） https://www.npa.go.jp/publications/statistics/cybersecurity/data/R7/R07_cyber_jousei.pdf
- 警察庁「ランサムウェア被害拡大中」（サイバー警察局便り Vol.16） https://www.npa.go.jp/bureau/cyber/pdf/R8_Vol.16cpal.pdf
- 警視庁「ランサムウェアの脅威と対策」 https://www.keishicho.metro.tokyo.lg.jp/kurashi/cyber/notes/ransomware_threat.html

### フィッシング
- 総務省「フィッシング詐欺とは？」（国民のためのサイバーセキュリティサイト、上記）
- 金融庁「フィッシング耐性のある多要素認証等に係る官民一体・業界横断的な広報について」（パスキー） https://www.fsa.go.jp/news/r7/sonota/20260416-2/20260416-2.html

### 標的型攻撃とビジネスメール詐欺
- IPA「情報セキュリティ10大脅威 2026」（標的型攻撃・ビジネスメール詐欺） https://www.ipa.go.jp/security/10threats/10threats2026.html
- IPA「情報セキュリティマネジメント試験」（上記）

### ソーシャルエンジニアリング／DoS攻撃とDDoS攻撃
- 総務省「国民のためのサイバーセキュリティサイト」（上記）
- IPA「情報セキュリティ10大脅威 2026」（DDoS攻撃：分散型サービス妨害攻撃、上記）

### ウェブアプリケーションへの攻撃
- IPA「安全なウェブサイトの作り方 1.1 SQLインジェクション」（プレースホルダ） https://www.ipa.go.jp/security/vuln/websecurity/sql.html
- IPA「安全なウェブサイトの作り方」（XSSとエスケープ処理） https://www.ipa.go.jp/security/vuln/websecurity/about.html

### パスワードへの攻撃
- 総務省「安全なパスワードの設定・管理」（国民のためのサイバーセキュリティサイト、上記）
- IPA「情報セキュリティマネジメント試験」（上記）

---

## 03-defense-tech.md 守る技術

### 暗号の基本／共通鍵暗号方式／公開鍵暗号方式
- 総務省「国民のためのサイバーセキュリティサイト」（暗号化・用語集、上記）
- NIST「FIPS 197 Advanced Encryption Standard (AES)」（2001年11月制定） https://csrc.nist.gov/pubs/fips/197/final
- IPA「情報セキュリティマネジメント試験」（上記）
- 注意：n人の共通鍵の数 n(n-1)/2 は、10人で45個（計算で確認）。

### ハッシュ関数
- NIST「FIPS 180-4 Secure Hash Standard」（SHA-256） https://csrc.nist.gov/pubs/fips/180-4/upd1/final
- IPA「安全なウェブサイトの作り方」（パスワードの保存、上記）

### 電子署名と電子証明書
- 総務省「電子署名及び認証業務に関する法律」解説（国民のためのサイバーセキュリティサイト、上記）
- 地方公共団体情報システム機構（J-LIS）「公的個人認証サービス」（マイナンバーカードの電子証明書） https://www.jpki.go.jp/

### 認証と多要素認証
- 総務省「安全なパスワードの設定・管理」（上記）
- 金融庁「フィッシング耐性のある多要素認証等に係る官民一体・業界横断的な広報について」（上記）

### ファイアウォール・IDS・IPS・WAF／ゼロトラストとバックアップ
- IPA「情報セキュリティマネジメント試験」（上記）
- IPA「中小企業の情報セキュリティ対策ガイドライン」（バックアップ、上記）
- 注意：3-2-1ルールは各種公的資料・ベンダー資料で同じ内容（3つのコピー・2種類の媒体・1つは別の場所）。

---

## 04-organization-law.md 組織の対策と法律

### ISMS
- 情報マネジメントシステム認定センター（ISMS-AC）「ISMS適合性評価制度」 https://isms.jp/
- IPA「情報セキュリティマネジメント試験」（上記）

### セキュリティポリシー／内部不正と委託先の管理
- IPA「中小企業の情報セキュリティ対策ガイドライン」（上記）
- IPA「組織における内部不正防止ガイドライン」 https://www.ipa.go.jp/security/guide/insider.html
- IPA「情報セキュリティ10大脅威 2026」（内部不正は2016年から11年連続） https://www.ipa.go.jp/security/10threats/10threats2026.html

### CSIRT／インシデント対応の流れ
- JPCERT/CC 公式サイト（組織概要・インシデント対応） https://www.jpcert.or.jp/
- 日本シーサート協議会 https://www.nca.gr.jp/
- Web担当者Forum 用語集「JPCERT/CC」（中立のCSIRT・調整役） https://webtan.impress.co.jp/g/jpcert_cc

### 個人情報保護法
- 個人情報保護委員会「漏えい等報告・本人への通知の義務化について」（速報3〜5日、確報30日／60日、1,000人超） https://www.ppc.go.jp/news/kaiseihou_feature/roueitouhoukoku_gimuka/
- 個人情報保護委員会「漏えい等の対応とお役立ち資料」 https://www.ppc.go.jp/personalinfo/legal/leakAction/
- のぞみ総合法律事務所「2026年（令和8年）改正個人情報保護法の概要」（2026年7月10日成立、7月17日公布、令和8年法律第56号、課徴金、16歳未満、特定生体個人情報） https://www.nozomisogo.gr.jp/newsletter/13872
- 照合：時事ドットコム「悪質業者に『課徴金』 個人情報保護法改正案、衆院通過」（2026年5月26日） https://www.jiji.com/jc/article?k=2026052600074&g=pol
- 照合：法改正ナビ「個人情報保護法改正はいつから？」 https://houkaisei.jp/laws/kojin-joho-minaoshi-2026/
- 注意：施行日は原則「公布から2年以内で政令で定める日」。本文では具体的な日付を書いていない。

### 不正アクセス禁止法
- 総務省「不正アクセス禁止法」解説（国民のためのサイバーセキュリティサイト） https://www.soumu.go.jp/main_sosiki/cybersecurity/kokumin/basic/legal/09/
- e-Gov 法令検索「不正アクセス行為の禁止等に関する法律」 https://laws.e-gov.go.jp/law/411AC0000000128
- 注意：総務省の解説は「3年以下の懲役」と旧表記。2025年6月1日の改正刑法の施行で懲役は拘禁刑に一本化されたため、本文は「拘禁刑」とした。

### サイバーセキュリティ基本法
- e-Gov 法令検索「サイバーセキュリティ基本法」 https://laws.e-gov.go.jp/
- 国家サイバー統括室「サイバーセキュリティ戦略」（2025年12月23日閣議決定） https://www.cyber.go.jp/pdf/policy/kihon-s/cs_strategy2025_abstract.pdf
- 日本経済新聞「『国家サイバー統括室』が発足」（2025年7月1日、NISCを改組） https://www.nikkei.com/article/DGXZQOUA26BBQ0W5A620C2000000/
- 照合：INTERNET Watch「『国家サイバー統括室』（NCO）発足」 https://internet.watch.impress.co.jp/docs/news/2027348.html

---

## 05-trends.md 最新動向（2026年時点）

### 情報セキュリティ10大脅威 2026 組織編／個人編
- IPA「情報セキュリティ10大脅威 2026」（2026年1月29日公開。組織編の順位、個人編は五十音順、初選出・連続回数） https://www.ipa.go.jp/security/10threats/10threats2026.html
- @IT「AIリスクが初登場で3位、IPAが『情報セキュリティ10大脅威 2026』発表」（約250人の選考会） https://atmarkit.itmedia.co.jp/ait/articles/2603/03/news057.html
- 照合：JAPANSecuritySummit Update「IPA発表『情報セキュリティ10大脅威 2026』」 https://japansecuritysummit.org/2026/01/13600/
- 注意：個人編は順位なし。インターネットバンキングの不正利用は「4年ぶり8回目」（IPA公式表）。

### ランサムウェア被害の状況
- 警察庁「令和７年におけるサイバー空間をめぐる脅威の情勢等について」（2025年：226件） https://www.npa.go.jp/publications/statistics/cybersecurity/data/R7/R07_cyber_jousei.pdf
- 警察庁「令和８年上半期におけるサイバー空間をめぐる脅威の情勢等について」（2026年上半期：123件） https://www.npa.go.jp/publications/statistics/cybersecurity/data/R8kami/R08_kami_cyber_jousei.pdf
- 照合：ScanNetSecurity「都内ランサムウェア被害 2025年 過去最多 68件 ～ 警察庁」（全国226件、2022年230件に次ぐ） https://scan.netsecurity.ne.jp/article/2026/04/09/55013.html
- 照合：サイバーセキュリティナビ「ランサムウェア被害123件で過去最多、約6割は中小企業。侵入口の約5割はVPN機器」（中小企業79件、製造業37件、VPN機器18件／有効回答36件） https://blog.cbsec.jp/entry/2026/09/28/083024
- 照合：SQAT「2026年上半期のサイバー脅威情勢」（前年同期116件） https://www.sqat.jp/information/47738/
- 照合：@IT「ランサムウェア被害は過去最多 警察庁が明かした2026年上半期の異変」 https://atmarkit.itmedia.co.jp/ait/spv/2609/17/news010.html

### サプライチェーン攻撃
- IPA「情報セキュリティ10大脅威 2026」（2位、8年連続8回目、上記）
- IPA「中小企業の情報セキュリティ対策ガイドライン」（委託先管理、上記）

### 2025年の主な事件
- アサヒグループホールディングス：宣伝会議 AdverTimes「アサヒ、サイバー攻撃の調査結果を公表 個人情報、約191万件超流出の恐れ」（2025年11月27日） https://www.advertimes.com/20251127/article525539/
- 照合：ScanNetSecurity「191.4万件の個人情報が漏えいした可能性 ～ アサヒグループホールディングスへのランサムウェア攻撃」 https://scan.netsecurity.ne.jp/article/2025/12/05/54174.html
- アスクル：Impress Watch「アスクル、ランサムウェアの情報流出は約74万件『攻撃者とは接触せず』」（2025年12月） https://www.watch.impress.co.jp/docs/news/2070955.html
- 照合：ITmedia NEWS「アスクル、個人情報74万件漏えい」 https://www.itmedia.co.jp/news/article/2512/12/1251212106/
- 証券口座の乗っ取り：日本証券業協会「インターネット取引における不正アクセス等防止に向けたガイドライン」（2025年10月15日） https://www.jsda.or.jp/about/hatten/inv_alerts/alearts04/files/20251015_internetgl.pdf
- 照合：トレンドマイクロ「証券口座の乗っ取りと多要素認証」 https://www.trendmicro.com/ja_jp/research/25/f/mfa-securities-hacks.html
- 注意：アサヒの約191万件は「漏えいまたはその可能性」の件数。アスクルの約74万件は流出確認分（事業者向け約59万件・個人向け約13万件など）。被害額は確認できる公的な数字がないため書いていない。

### AIの悪用とAIをめぐるリスク
- IPA「情報セキュリティ10大脅威 2026」（AIの利用をめぐるサイバーリスク、初選出3位、上記）
- トレンドマイクロ「IPA『情報セキュリティ10大脅威 2026』：AIのサイバーリスクを3つに分けて理解する」 https://www.trendmicro.com/ja_jp/jp-security/26/c/expertview-20260317-01.html
- 照合：ScanNetSecurity「AI 利用めぐるサイバーリスク初選出」 https://scan.netsecurity.ne.jp/article/2026/02/19/54657.html
- 注意：「3つの方向」は解説記事による整理。IPA自身はAIへの理解不足による情報漏えいや権利侵害、AIの悪用などを例に挙げている。

### 能動的サイバー防御
- 衆議院「重要電子計算機に対する不正な行為による被害の防止に関する法律」 https://www.shugiin.go.jp/internet/itdb_housei.nsf/html/housei/21720250523042.htm
- INTERNET Watch「本日から関連法施行、『能動的サイバー防御』で何が変わる？」（2025年5月16日成立、23日公布、2026年10月1日施行） https://internet.watch.impress.co.jp/docs/readitnow/2144633.html
- 照合：ANGLE Intelligence Studio「能動的サイバー防御とは」（2026年10月1日施行、官民連携の届出・報告、通信情報の利用は後の段階） https://ais.angleinc.jp/risk-management/active-cyber-defense-law/
- 照合：トレンドマイクロ「『能動的サイバー防御』で組織は何に備えるべきか～2026年10月1日施行」 https://www.trendmicro.com/ja_jp/jp-security/26/h/securitytrend-20260814-01.html
- 注意：Westlaw Japan の解説は「2026年4月から順次施行」と表記しており、他の資料と一致しない（10月1日を本体の施行日とする資料が多数）。通信情報の利用開始は「2027年秋以降」とする解説があるが、一次資料で確認できなかったため本文では時期を書いていない。

### 2026年時点で私たちにできること
- IPA「情報セキュリティ10大脅威 2026 組織編」解説資料（「当たり前を確実に、基本の徹底と継続的な見直しで被害の最小化を」） https://www.ipa.go.jp/security/10threats/omgdg50000008fi8-att/presen_2026_soshiki_16_9.pdf
- 金融庁「フィッシング耐性のある多要素認証等に係る官民一体・業界横断的な広報について」（上記）
- 金融庁「主要行等向けの総合的な監督指針」改正案（新旧対照表、フィッシング耐性のある多要素認証） https://www.fsa.go.jp/news/r7/sonota/20251208/01-2r.pdf
