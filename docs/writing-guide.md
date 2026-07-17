# Writing guide — 読み物レイヤーの執筆原則

各回の「読み物」(生成されキャッシュされる学習テキスト)が従う原則。対象読者は日本の中高生。
エンターテインメントと教育効果の両立が目的であり、ふざけることが目的ではない。

## 依拠する研究・フレームワーク

1. **5E 授業モデル**(BSCS, 1987)— Engage → Explore → Explain → Elaborate → Evaluate。
   読み物の構成はこの順序に従う: つかみ(Engage)→ 身近な例で試す(Explore)→
   概念の説明(Explain)→ テーゼで深める(Elaborate)→ まとめと問い(Evaluate)。
   30年以上の実証研究で概念理解・学習態度への正の効果が報告されている。
   - https://www.hmhco.com/blog/5e-instructional-model
   - https://link.springer.com/article/10.1186/s40594-022-00337-z
2. **ARCS 動機づけモデル**(Keller)— Attention(意外性で注意を引く)、
   Relevance(読者の生活・関心に接続する)、Confidence(小さなステップで登れる構成)、
   Satisfaction(読み終えたときの達成感)。
   - https://learning-theories.com/kellers-arcs-model-of-motivational-design.html
   - https://link.springer.com/article/10.1007/s44217-025-00674-5
3. **Mayer のパーソナライゼーション原理** — 形式張った文体より会話調(「あなた」への
   呼びかけ)のほうが学習転移が有意に高い(11/11 の実験で優位、効果量中央値 d = 1.11)。
   - https://pressbooks.pub/elearning2020/chapter/the-personalization-principle/
   - https://www.cambridge.org/core/books/abs/multimedia-learning/personalization-voice-and-image-principles/97F9B31362E6491806A4718FECCADE3D
4. **Concreteness fading(具体から抽象へ)** — 具体例で掴ませてから抽象概念へ段階的に
   移行する。各ステップは「身近な具体例 → 哲学の概念」の順で書く。

## ハウススタイル

- **文体**: です・ます調。読者に「あなた」と呼びかける。問いかけを多用する。軽薄にはしない。
- **理解のステップ**: 1回 = 3〜6ステップ。易→難。1ステップ = 1つの発見。
  各ステップに中高生に身近な具体例(部活・友人関係・SNS・受験・アルバイト・
  有名な漫画/アニメ/スポーツ選手など)を必ず1つ添える。
- **例えの規律**: 作品名・人名・状況への言及はよいが、セリフや文章の引用はしない
  (著作権と正典制約の両方の理由)。例えは説明の踏み台であり、主役にしない。
- **正典制約**: 哲学者の主張は curriculum.json の正典テーゼの範囲で語り、必ず [ID] を添える。
  正典にない引用・逸話を創作しない。
- **用語**: 哲学用語は初出で日常語に言い換え、仏語を併記する(例: 問題化 problématisation)。
- **まとめ**: 3行で要点を返し、「これであなたは◯◯できる」と達成を言語化する(ARCS-S)。
