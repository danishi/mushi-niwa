import type { SpeciesDef } from '../../sim/types';

/**
 * 出典: docs/species-research.md §6
 * 幼虫はケラの卵室でケラの卵を食べて育つ（家庭飼育は非現実的）ため、ゲームでは成虫のみ飼育し、
 * 幼虫期はずかんのコラムで紹介する。
 */
export const miidera: SpeciesDef = {
  id: 'miidera',
  name: 'ミイデラゴミムシ',
  kana: 'みいでらごみむし',
  scientific: 'Pheropsophus occipitalis jessoensis',
  order: 'コウチュウ{目|もく}',
  family: 'ホソクビゴミムシ{科|か}',
  color: '#f4b400',
  season: '{成虫|せいちゅう}は 4〜10がつ。おとなで ふゆを こす',
  farewell: 'mori',
  farewellText: 'しめった くさむらで げんきでね',
  habitat: { substrate: 'moistSoil', decor: ['stone', 'bark'], soilDepth: 0.18 },
  stages: [
    {
      id: 'adult',
      label: 'せいちゅう',
      playMinutes: 40,
      realDuration: 'すうかげつ（おとなで ふゆを こす）',
      model: 'miidera-adult',
      food: 'smallInsect',
      decay: { hunger: 0.04, moisture: 0.05, clean: 0.03, mood: 0.025 },
      tools: ['food', 'mist', 'scoop', 'house'],
      moves: true,
      activity: 'night',
      parts: [
        { id: 'tail', label: 'おしりの さき', text: '「プッ」と おとを たてて、とても あつい（やく 100ど）しるを ふきつけて みを まもるよ。すでで さわらないでね' },
        { id: 'elytra', label: 'はね', text: 'くろに きいろの もよう。めだつ いろは「さわると あぶないよ」の サインと いわれているよ' },
        { id: 'neck', label: 'ほそい くび', text: 'あたまと むねは きいろに くろい もよう。くびが ほそいよ' },
        { id: 'legs', label: 'あし', text: 'ながい あしで よるの じめんを すばやく あるいて えものを さがすよ' },
      ],
    },
  ],
  facts: [
    'べつめい「へっぴりむし」。おしりから「プッ」と あつい しるを ふきだすよ',
    'カマキリに おそわれても、ふきだして かならず おいはらったという けんきゅうが あるよ',
    'ヒキガエルに のみこまれても、おなかの なかで ふきだして はきだしてもらえることが あるよ',
    'よるに うごく むし。ひるは しめった いしの したに かくれているよ',
    'ふしぎ：ようちゅうは ケラの たまごの へやに もぐりこんで そだつよ',
  ],
  caution: '噴射液は皮膚に褐色のしみや刺激を残すことがあります。素手でつかまず、顔を近づけないでください。地域によっては準絶滅危惧（東京都RDB）です。',
  sources: [
    'https://dom.ocm.osaka/database/omnh/1570',
    'https://kotobank.jp/word/%E3%81%BF%E3%81%84%E3%81%A7%E3%82%89%E3%81%94%E3%81%BF%E3%82%80%E3%81%97-3172000',
    'https://pmc.ncbi.nlm.nih.gov/articles/PMC8420871',
    'https://peerj.com/articles/13805',
  ],
};
