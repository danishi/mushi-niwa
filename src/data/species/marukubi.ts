import type { SpeciesDef } from '../../sim/types';

/**
 * 出典: docs/species-research-5.md
 * 幼虫は ハナバチに しがみついて 巣に はこばれ、巣の 中で 育つ（過変態）ため 家庭飼育は できない。
 * ゲームでは 成虫のみ 飼育し、幼虫期は ずかんの 豆知識で 紹介する（ユーザー判断）。
 */
export const marukubi: SpeciesDef = {
  id: 'marukubi',
  name: 'マルクビツチハンミョウ',
  kana: 'まるくびつちはんみょう',
  scientific: 'Meloe corvinus',
  order: 'コウチュウ{目|もく}',
  family: 'ツチハンミョウ{科|か}',
  color: '#3b4a8c',
  season: '{成虫|せいちゅう}は 3〜5がつ（はる）',
  farewell: 'kusamura',
  farewellText: 'はるの のはらで げんきでね',
  habitat: { substrate: 'soil', decor: ['flower', 'stone'], soilDepth: 0.16 },
  dimorphism: 'メスは おなかが とても おおきいよ',
  stages: [
    {
      id: 'adult',
      label: 'せいちゅう',
      playMinutes: 35,
      realDuration: 'はるの あいだ（3〜5がつ）',
      model: 'marukubi-adult',
      food: 'dandelion',
      decay: { hunger: 0.045, moisture: 0.035, clean: 0.03, mood: 0.025 },
      tools: ['food', 'mist', 'scoop', 'house'],
      moves: true,
      activity: 'day',
      parts: [
        { id: 'abdomen', label: 'おおきな おなか', text: 'はねから はみだすほど おおきな おなか。メスは とくに おおきいよ' },
        { id: 'elytra', label: 'みじかい はね', text: 'まえの はねは みじかくて、うしろの はねは ないよ。だから とべないんだ' },
        { id: 'legs', label: 'あしの ふし', text: 'つかまると、ここから きいろい しるを だすよ。ひふに つくと みずぶくれに なるから さわらないでね' },
        { id: 'head', label: 'あたま', text: 'くさの はを かじって たべるよ' },
      ],
    },
  ],
  facts: [
    'うしろの はねが なくて、とべないよ。まえの はねも みじかくて、おおきな おなかが はみだして いるよ',
    'つかまると しんだ ふりを して、あしの ふしから きいろい しるを だすよ。ひふに つくと みずぶくれに なるから、さわらないでね',
    'はるに あらわれて、タンポポなどの くさの はを たべるよ',
    'メスは つちに あなを ほって、1000こ いじょうの たまごを うむよ',
    'ふしぎ：ようちゅうは はなの うえで ハナバチを まって、からだに しがみついて すまで はこんで もらうよ',
    'すの なかで ハナバチの たまごや みつ・かふんを たべながら、なんども すがたを かえて そだつよ',
  ],
  threat: { kind: 'ooze', text: 'しんだ ふりを して、あしから きいろい しるを だしたよ。さわらないでね' },
  caution:
    '脚の関節から出す黄色い液にはカンタリジンが含まれ、皮膚につくと水ぶくれ（炎症）を起こします。素手でさわらず、ふれたら石けんと流水でよく洗い、目や口をさわらないでください。カンタリジンは強い毒で、口に入ると危険です。幼虫はハナバチの巣の中で育つため、家庭で一生を飼うことはできません。',
  sources: [
    'https://kotobank.jp/word/%E3%81%BE%E3%82%8B%E3%81%8F%E3%81%B3%E3%81%A4%E3%81%A1%E3%81%AF%E3%82%93%E3%81%BF%E3%82%88%E3%81%86-3233392',
    'https://kotobank.jp/word/%E3%81%A4%E3%81%A1%E3%81%AF%E3%82%93%E3%81%BF%E3%82%88%E3%81%86-3159506',
    'https://kotobank.jp/word/%E4%B8%89%E7%88%AA%E5%B9%BC%E8%99%AB-1326987',
    'https://kotobank.jp/word/%E3%81%8B%E3%82%93%E3%81%9F%E3%82%8A%E3%81%98%E3%82%93-3231667',
  ],
};
