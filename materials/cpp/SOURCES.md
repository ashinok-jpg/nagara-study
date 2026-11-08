# 出典（C++）

確認日はすべて 2026-11-08。年号・人名は2つ以上の情報源で照合した。機能がどの規格で入ったかは cppreference.com の各規格のページで確認した。食い違いや注意点は「注意」に書いた。

---

## 01-overview.md C++の成り立ちと特徴

### C++の誕生
- Bjarne Stroustrup「Bjarne Stroustrup's FAQ」（1979年開始、1983年に名称C++、命名はRick Mascitti、1985年10月に最初の商用版と初版本） https://www.stroustrup.com/bs_faq.html
- cppreference.com「History of C++」（1979年 C with Classes、1985年 Cfront 1.0 と The C++ Programming Language 初版、1990年 ARM） https://en.cppreference.com/w/cpp/language/history
- cplusplus.com「History of C++」（1979年開始、1983年に改名） https://cplusplus.com/info/history/
- Bjarne Stroustrup「A History of C++: 1979–1991」（HOPL-II 論文。開発の動機） https://www.stroustrup.com/hopl2.pdf
- 注意：一部の二次資料は Cfront の公開を1983年としているが、商用版の公開は Stroustrup 本人の FAQ に従い1985年10月とした。

### 標準規格の流れ
- cppreference.com「History of C++」（C++98＝ISO/IEC 14882:1998、C++03、TR1〔2005年草案、2007年発行〕、C++11以降） https://en.cppreference.com/w/cpp/language/history
- cppreference.com「C++11」（TR1の大部分を取り込んだこと） https://en.cppreference.com/w/cpp/11
- Bjarne Stroustrup「Evolving a language in and for the real world: C++ 1991-2006」（HOPL-III 論文。STLの採用、1994年7月） https://www.stroustrup.com/hopl-almost-final.pdf
- 注意：cppreference の年表は「STL implemented in C++」を1992年としている。本文の1994年は「規格の草案に採用された年」で、別の出来事である。

### 規格を決める仕組みとC++26
- isocpp.org「The Standard」（最新の規格はC++23、正式名 ISO/IEC 14882:2024、技術作業は2023年2月に完了） https://isocpp.org/std/the-standard
- Herb Sutter「C++26 is done! — Trip report: March 2026 ISO C++ standards meeting (London Croydon, UK)」（2026年3月に技術作業完了、DIS投票へ） https://herbsutter.com/2026/03/29/c26-is-done-trip-report-march-2026-iso-c-standards-meeting-london-croydon-uk/
- Mateusz Pusz「The result of the C++26 DIS ballot」（Train IT、2026年10月25日。投票は2026年10月23日に締め切られ不承認、次回会議はブラジル・ブジオスで2026年11月16〜21日） https://train-it.eu/blog/cpp26-contracts-the-ballot-result/
- Andreas Fertig「C++26 DIS failed, how does C++ survive?」（2026年11月。不承認の主な理由はコントラクト、ISOの4つの選択肢） https://andreasfertig.com/blog/2026/11/cpp26-dis-failed-how-does-cpp-survive/
- 注意：各国の投票の内訳は、ISOの方針で公表されていない。報道によって数字が違うため、本文には書かなかった。不承認の理由が「コントラクト」である点は、上の2つの資料で一致している。

### コンパイルの仕組み
- cppreference.com「Phases of translation」 https://en.cppreference.com/w/cpp/language/translation_phases
- cppreference.com「Modules (since C++20)」 https://en.cppreference.com/w/cpp/language/modules
- GCC 公式サイト https://gcc.gnu.org/ ／ Clang 公式サイト https://clang.llvm.org/ ／ Microsoft Learn「C/C++ のコンパイラとビルドツール」 https://learn.microsoft.com/ja-jp/cpp/build/

### C言語との関係
- Dennis M. Ritchie「The Development of the C Language」（Cは1969〜1973年に作られ、1972年が最も重要な時期） https://www.bell-labs.com/usr/dmr/www/chist.html
- Bjarne Stroustrup「Bjarne Stroustrup's FAQ」（C++はCの完全な上位互換ではない） https://www.stroustrup.com/bs_faq.html
- 注意：Cの誕生年は資料により1972年または1973年とされる。本文は「1972年ごろ」とした。

### C++の設計思想
- Bjarne Stroustrup「Foundations of C++」（ゼロオーバーヘッド原則：使わないものにコストを払わない） https://www.stroustrup.com/ETAPS-corrected-draft.pdf
- Bjarne Stroustrup「Bjarne Stroustrup's FAQ」（マルチパラダイム言語） https://www.stroustrup.com/bs_faq.html

### C++が使われる分野
- Epic Games「Programming with C++ in Unreal Engine」 https://dev.epicgames.com/documentation/en-us/unreal-engine/programming-with-cplusplus-in-unreal-engine
- The Chromium Projects「Chromium C++ style guide」 https://chromium.googlesource.com/chromium/src/+/main/styleguide/c++/c++.md
- PyTorch「PyTorch C++ API」 https://pytorch.org/cppdocs/ ／ TensorFlow「Create an op」（中核がC++） https://www.tensorflow.org/guide/create_op
- Bjarne Stroustrup「C++ Applications」 https://www.stroustrup.com/applications.html

---

## 02-basics.md 基本の文法

### プログラムの骨組み
- cppreference.com「Main function」 https://en.cppreference.com/w/cpp/language/main_function
- cppreference.com「std::print (since C++23)」 https://en.cppreference.com/w/cpp/io/print

### 型と変数
- cppreference.com「Fundamental types」（intは少なくとも16ビット、多くのデータモデルで32ビット） https://en.cppreference.com/w/cpp/language/types
- cppreference.com「List-initialization (since C++11)」（縮小変換の禁止） https://en.cppreference.com/w/cpp/language/list_initialization
- cppreference.com「Default-initialization」（初期化しない自動変数の値は不定） https://en.cppreference.com/w/cpp/language/default_initialization

### autoと型推論
- cppreference.com「C++11」（auto と decltype） https://en.cppreference.com/w/cpp/11
- cppreference.com「C++14」（関数の戻り値の型の推論） https://en.cppreference.com/w/cpp/14

### constとconstexpr
- cppreference.com「constexpr specifier (since C++11)」 https://en.cppreference.com/w/cpp/language/constexpr
- cppreference.com「C++20」（consteval） https://en.cppreference.com/w/cpp/20

### 制御構文
- cppreference.com「C++11」（範囲for文、scoped enums＝enum class） https://en.cppreference.com/w/cpp/11
- cppreference.com「C++17」（初期化文付きの if と switch） https://en.cppreference.com/w/cpp/17

### 関数と引数の渡し方／オーバーロード
- cppreference.com「Function declaration」 https://en.cppreference.com/w/cpp/language/function
- cppreference.com「Overload resolution」 https://en.cppreference.com/w/cpp/language/overload_resolution
- cppreference.com「operator overloading」 https://en.cppreference.com/w/cpp/language/operators
- cppreference.com「Scope」 https://en.cppreference.com/w/cpp/language/scope

### 名前空間
- cppreference.com「Namespaces」（C++17の入れ子の名前空間の宣言） https://en.cppreference.com/w/cpp/language/namespace
- isocpp.org「C++ Core Guidelines SF.7: Don't write using namespace at global scope in a header file」 https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#Rs-using-directive

---

## 03-memory.md ポインタとメモリ管理

### メモリの使われ方
- cppreference.com「Storage duration」（自動・静的・動的の記憶域期間） https://en.cppreference.com/w/cpp/language/storage_duration
- Microsoft Learn「/STACK (Stack allocations)」（既定のスタックの大きさは1MB） https://learn.microsoft.com/en-us/cpp/build/reference/stack-stack-allocations

### ポインタ／参照
- cppreference.com「Pointer declaration」 https://en.cppreference.com/w/cpp/language/pointer
- cppreference.com「nullptr (since C++11)」 https://en.cppreference.com/w/cpp/language/nullptr
- cppreference.com「Reference declaration」（参照は初期化が必須、付け替え不可、ダングリング参照） https://en.cppreference.com/w/cpp/language/reference

### newとdelete
- cppreference.com「new expression」「delete expression」 https://en.cppreference.com/w/cpp/language/new
- isocpp.org「C++ Core Guidelines R.11: Avoid calling new and delete explicitly」 https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#Rr-newdelete

### RAII
- cppreference.com「RAII」 https://en.cppreference.com/w/cpp/language/raii
- Bjarne Stroustrup「Bjarne Stroustrup's C++ Style and Technique FAQ」（RAII の考え方） https://www.stroustrup.com/bs_faq2.html

### スマートポインタ
- cppreference.com「C++11」（unique_ptr、TR1由来の shared_ptr） https://en.cppreference.com/w/cpp/11
- cppreference.com「std::make_unique (since C++14)」 https://en.cppreference.com/w/cpp/memory/unique_ptr/make_unique
- cppreference.com「std::weak_ptr」 https://en.cppreference.com/w/cpp/memory/weak_ptr
- cppreference.com「C++17」（auto_ptr の削除） https://en.cppreference.com/w/cpp/17

### ムーブセマンティクス
- cppreference.com「C++11」（右辺値参照、ムーブコンストラクタ） https://en.cppreference.com/w/cpp/11
- cppreference.com「std::move」 https://en.cppreference.com/w/cpp/utility/move

### 未定義動作とメモリ安全性
- cppreference.com「Undefined behavior」 https://en.cppreference.com/w/cpp/language/ub
- Microsoft Security Response Center「A proactive approach to more secure code」（2019年、CVEの約70%がメモリ安全性の問題） https://msrc.microsoft.com/blog/2019/07/a-proactive-approach-to-more-secure-code/
- NSA「Software Memory Safety」（Cybersecurity Information Sheet、2022年11月10日） https://media.defense.gov/2022/Nov/10/2003112742/-1/-1/0/CSI_SOFTWARE_MEMORY_SAFETY.PDF
- Herb Sutter「C++26 is done!」（初期化していないローカル変数の読み取りが未定義動作でなくなる、標準ライブラリの強化） https://herbsutter.com/2026/03/29/c26-is-done-trip-report-march-2026-iso-c-standards-meeting-london-croydon-uk/
- Clang「AddressSanitizer」 https://clang.llvm.org/docs/AddressSanitizer.html

---

## 04-classes-templates.md クラスとオブジェクト指向・テンプレート

### クラスとオブジェクト／カプセル化とアクセス指定
- cppreference.com「Classes」 https://en.cppreference.com/w/cpp/language/classes
- cppreference.com「Access specifiers」（class は既定で private、struct は既定で public） https://en.cppreference.com/w/cpp/language/access

### コンストラクタとデストラクタ
- cppreference.com「Constructors and member initializer lists」 https://en.cppreference.com/w/cpp/language/constructor
- cppreference.com「Destructors」 https://en.cppreference.com/w/cpp/language/destructor
- cppreference.com「explicit specifier」 https://en.cppreference.com/w/cpp/language/explicit

### コピーとムーブの決まりごと
- cppreference.com「The rule of three/five/zero」 https://en.cppreference.com/w/cpp/language/rule_of_three
- cppreference.com「C++11」（defaulted と deleted functions） https://en.cppreference.com/w/cpp/11

### 継承
- cppreference.com「Derived classes」（多重継承、仮想基底クラス） https://en.cppreference.com/w/cpp/language/derived_class
- isocpp.org「C++ Core Guidelines C.120: Use class hierarchies to represent concepts with inherent hierarchical structure」 https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#Rh-domain

### 仮想関数と多態性
- cppreference.com「virtual function specifier」 https://en.cppreference.com/w/cpp/language/virtual
- cppreference.com「C++11」（override と final） https://en.cppreference.com/w/cpp/11
- cppreference.com「Abstract class」 https://en.cppreference.com/w/cpp/language/abstract_class
- 注意：仮想関数表（vtable）は規格の用語ではなく、主なコンパイラの実装方法である。本文は「多くのコンパイラは」とした。

### テンプレート／テンプレートの発展とコンセプト
- cppreference.com「Templates」 https://en.cppreference.com/w/cpp/language/templates
- cppreference.com「C++11」（可変引数テンプレート） https://en.cppreference.com/w/cpp/11
- cppreference.com「C++17」（クラステンプレートの実引数推論） https://en.cppreference.com/w/cpp/17
- cppreference.com「C++20」「Constraints and concepts」 https://en.cppreference.com/w/cpp/language/constraints

---

## 05-stl-modern.md 標準ライブラリとモダンC++

### STLの3本柱
- Bjarne Stroustrup「Evolving a language in and for the real world: C++ 1991-2006」（STLの採用、1994年7月） https://www.stroustrup.com/hopl-almost-final.pdf
- Alexander Stepanov, Meng Lee「The Standard Template Library」（HP Laboratories、1995年） https://www.stepanovpapers.com/STL/DOC.PDF
- 注意：1994年7月の採用は、Stroustrup の論文と STL の歴史を解説した複数の資料で一致している。

### コンテナ／イテレータとアルゴリズム
- cppreference.com「Containers library」 https://en.cppreference.com/w/cpp/container
- cppreference.com「Iterator library」 https://en.cppreference.com/w/cpp/iterator
- cppreference.com「Algorithms library」（C++17の実行ポリシー） https://en.cppreference.com/w/cpp/algorithm
- cppreference.com「C++11」（array、unordered_map） https://en.cppreference.com/w/cpp/11

### ラムダ式
- cppreference.com「Lambda expressions (since C++11)」 https://en.cppreference.com/w/cpp/language/lambda
- cppreference.com「C++14」（汎用ラムダ） https://en.cppreference.com/w/cpp/14

### C++11とC++14
- cppreference.com「C++11」「C++14」 https://en.cppreference.com/w/cpp/11 ／ https://en.cppreference.com/w/cpp/14
- Bjarne Stroustrup「C++11 - the new ISO C++ standard」（C++11は新しい言語のように感じられる） https://www.stroustrup.com/C++11FAQ.html

### C++17とC++20
- cppreference.com「C++17」（optional、variant、string_view、filesystem、構造化束縛、if constexpr） https://en.cppreference.com/w/cpp/17
- cppreference.com「C++20」（コンセプト、レンジ、モジュール、コルーチン、format、span） https://en.cppreference.com/w/cpp/20

### C++23
- cppreference.com「C++23」（expected、print、mdspan、flat_map、import std、明示的なオブジェクト引数） https://en.cppreference.com/w/cpp/23
- isocpp.org「The Standard」（C++23＝ISO/IEC 14882:2024） https://isocpp.org/std/the-standard

### C++26の機能と状況
- Herb Sutter「C++26 is done! — Trip report: March 2026 ISO C++ standards meeting」（リフレクション、コントラクト、std::execution、標準ライブラリの強化） https://herbsutter.com/2026/03/29/c26-is-done-trip-report-march-2026-iso-c-standards-meeting-london-croydon-uk/
- devclass「Contracts are in C++26 despite disquiet over their value」（2026年4月1日） https://www.devclass.com/development/2026/04/01/contracts-are-in-c26-despite-disquiet-over-their-value/5213555
- Mateusz Pusz「The result of the C++26 DIS ballot」（2026年10月の不承認） https://train-it.eu/blog/cpp26-contracts-the-ballot-result/
- Andreas Fertig「C++26 DIS failed, how does C++ survive?」（2026年11月） https://andreasfertig.com/blog/2026/11/cpp26-dis-failed-how-does-cpp-survive/
- 注意：C++26は2026年11月8日時点で正式な規格ではない。2026年11月16〜21日の会議の結果で状況が変わるため、次の更新時に必ず確認し直すこと。「強化モード」は英語の hardening（hardened implementation）に当てた本教材の訳語である。
