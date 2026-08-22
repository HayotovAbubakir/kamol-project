export type WinnerRank = 1 | 2 | 3;

export interface CongratsCombo {
  a: number;
  b: number;
  c: number;
}

export interface CongratsVars {
  ism: string;
  ball: number;
  oy: string;
  orin: 1 | 2 | 3;
}

const OPENING: Record<WinnerRank, string[]> = {
  1: [
    '🏆 Ajoyib natija!',
    '🥇 Shohsupa sizniki!',
    '⭐ Haqiqiy professional!',
    '🔥 Bu oy sizniki bo\'ldi!',
    '💪 Mislsiz mehnat!',
    '🏆 Oltin o\'rin — haqli g\'alaba!',
    '👑 Jamoa cho\'qqisidasiz!',
    '🥇 Eng yaxshi natija!',
    '🌟 Yulduzdek porladingiz!',
    '🏆 Tabriklaymiz, chempion!',
    '⚡ Bu oy raqobatni yopdingiz!',
    '🥇 Oltin medal munosib!',
    '💎 Sifat va sur\'at birga!',
    '🏆 Eng yuqori pog\'ona sizniki!',
    '🔥 Ajoyib sprint!',
    '🥇 Birinchi o\'rin — faxr!',
    '⭐ Mehnat o\'z samarasini berdi!',
    '🏆 Haqiqiy yetakchi!',
  ],
  2: [
    '🥈 Zo\'r ish qildingiz!',
    '🥈 Kumush o\'rin — kuchli natija!',
    '💪 Barqaror va ishonchli!',
    '⭐ TOP-2 — katta yutuq!',
    '🔥 Yaxshi sur\'at!',
    '🥈 Ikkinchi pog\'ona ham faxr!',
    '👏 Jiddiy raqobatda mustahkamsiz!',
    '🥈 Kumush medal munosib!',
    '🌟 Endi oltin yaqin!',
    '💪 Zo\'r o\'tish!',
    '🥈 Ikkinchi o\'rin tabriklaymiz!',
    '⭐ Sifatli ish e\'tirof etildi!',
    '🔥 Kuchli ikkinchi!',
    '🥈 Bu oy yuqoridasiz!',
    '👏 Ajoyib temp!',
    '🥈 Kumush nishon sizniki!',
    '💪 Bir qadam — va cho\'qqi ham yaqin!',
    '⭐ Ishonchli natija!',
  ],
  3: [
    '🥉 Yaxshi natija!',
    '🥉 TOP-3 ga kirdingiz!',
    '👏 Iliq tabrik!',
    '⭐ Bronza ham g\'alaba!',
    '💪 Yaxshi o\'tish!',
    '🥉 Uchlikdasiz — faxr!',
    '🌟 Mehnatingiz ko\'rindi!',
    '🥉 Bronza pog\'ona sizniki!',
    '👏 Rag\'batlantiramiz!',
    '⭐ Barqaror ish!',
    '🥉 Uchinchi o\'rin tabriklaymiz!',
    '💪 Shu ruhni saqlang!',
    '🥉 TOP-3 — mustahkam o\'rin!',
    '👏 Yaxshi yakun!',
    '⭐ Har bir ball o\'z o\'rnini topdi!',
    '🥉 Bronza nishon munosib!',
    '💪 Keyingi oy uchun kuchli start!',
    '🌟 Jamoada ko\'rindingiz!',
  ],
};

const ACHIEVEMENT = [
  'Bu {oy}da {ball} ball bilan {o\'rin}-o\'rinni qo\'lga kiritdingiz.',
  '{ism}, siz {oy} oyida jamoadagi eng faol ishchilardan biri bo\'ldingiz.',
  '{ball} ball — bu {oy} uchun ajoyib ko\'rsatkich!',
  '{ism}, {oy} yakunida siz {o\'rin}-o\'rindasiz: jami {ball} ball.',
  '{oy} oyi {ism} uchun muvaffaqiyatli o\'tdi — {o\'rin}-o\'rin, {ball} ball.',
  'Jadvalda {o\'rin}-pog\'ona: {ism}, {oy}da {ball} ball yig\'dingiz.',
  '{ism}, {oy} davomida to\'plagan {ball} ballingiz {o\'rin}-o\'rinni ta\'minladi.',
  'Bu {oy} hisoboti: {ism} — {o\'rin}-o\'rin ({ball} ball).',
  '{oy}da siz {ball} ball bilan TOP-3 ichidasiz, {ism}.',
  '{ism}, {o\'rin}-o\'rinni {ball} ball evaziga oldingiz — {oy} yaxshi yakunlandi.',
  'Natija aniq: {oy}, {ball} ball, {o\'rin}-o\'rin. Tabriklaymiz, {ism}!',
  '{ism} ning {oy}dagi yig\'indisi {ball} ball — bu {o\'rin}-o\'rin demak.',
  '{oy} oyi bo\'yicha {ism} {o\'rin}-o\'rinni band qildi ({ball} ball).',
  'Sizning {oy}dagi mehnatingiz {ball} ball va {o\'rin}-o\'rin bilan baholandi.',
  '{ism}, {oy}da {ball} ball — {o\'rin}-o\'rin uchun munosib natija.',
  '{o\'rin}-o\'rin {ism}ga tegishli: {oy}da {ball} ball to\'pladingiz.',
  '{oy} yakuni: {ism} {ball} ball bilan {o\'rin}-pog\'onada.',
  'Bu {oy} {ism} uchun yorqin bo\'ldi — {ball} ball, {o\'rin}-o\'rin.',
];

const CLOSING: Record<WinnerRank, string[]> = {
  1: [
    'Shu ruhda davom eting — cho\'qqi sizniki!',
    'Kelasi oy ham oltinni ushlab turing!',
    'Jamoa siz bilan faxrlanadi, yetakchi!',
    'Bu sur\'atni saqlang — siz o\'rnaksiz!',
    'G\'alaba tasodif emas. Davom eting!',
    'Keyingi oy ham shu darajada porlang!',
    'Chempionlikni himoya qilish vaqti!',
    'Sizdan o\'rnak olishadi. Oldinga!',
    'Oltin o\'rinni munosib saqlang!',
    'Mehnat va sifat — yana yuqoriroqqa!',
    'Jamoa cho\'qqisida qoling!',
    'Yangi oy — yangi rekordlar uchun!',
    'Faxr bilan davom eting!',
    'Siz allaqachon standartni belgiladingiz!',
    'Shu yo\'ldan qaytmang, chempion!',
    'Eng yaxshi versiyangizni ko\'rsatishda davom eting!',
    'G\'alaba sizga yarashadi. Oldinga!',
    'Keyingi oy ham birinchi bo\'ling!',
  ],
  2: [
    'Shu ruhda davom eting!',
    'Kelasi oy oltin yaqin turibdi!',
    'Jamoa sizning barqarorligingiz bilan faxrlanadi!',
    'Bir qadam yuqori — va cho\'qqi ham sizniki!',
    'Kuchli tempni saqlang!',
    'Kumush bugun, oltin ertaga bo\'lishi mumkin!',
    'Shu yo\'ldan qaytmang!',
    'Siz to\'g\'ri yo\'ldasiz. Davom eting!',
    'Keyingi oy 1-likka da\'vogar bo\'ling!',
    'Yaxshi ish — yanada yuqoriroqqa!',
    'Barqarorlik g\'alaba keltiradi!',
    'Jamoa sizga ishonadi!',
    'Sur\'atni oshirish vaqti!',
    'Kumush ham katta faxr. Oldinga!',
    'Keyingi oy yanada baland cho\'qqilarga!',
    'Sizning o\'rningiz yuqorida. Davom eting!',
    'Yaxshi natija — hali imkon katta!',
    'Oltin uchun hali yo\'l ochiq!',
  ],
  3: [
    'Shu ruhda davom eting!',
    'Kelasi oy yanada baland cho\'qqilarga!',
    'Jamoa siz bilan faxrlanadi!',
    'TOP-3 — bu boshlanish, yuqoriroqqa intiling!',
    'Yaxshi sur\'at, uni saqlang!',
    'Har oy o\'sish — sizning yo\'lingiz!',
    'Keyingi oy kumush va oltin yaqin!',
    'Mehnatingiz bejiz ketmaydi. Davom eting!',
    'Uchlikda qolish ham, ko\'tarilish ham qo\'lingizda!',
    'Iliq rag\'bat: siz to\'g\'ri yo\'ldasiz!',
    'Kichik qadamlar katta natija beradi!',
    'Jamoa sizni qo\'llab-quvvatlaydi!',
    'Bronza bugun — yuqoriroq ertaga!',
    'O\'zingizga ishoning va davom eting!',
    'Keyingi oy yanada yaxshiroq bo\'lishi mumkin!',
    'Siz allaqachon eng yaxshilar qatoridasiz!',
    'Shu tempda o\'sishda davom eting!',
    'Yaxshi start — endi yuqoriroq nishon!',
  ],
};

const UZ_MONTHS = [
  'yanvar',
  'fevral',
  'mart',
  'aprel',
  'may',
  'iyun',
  'iyul',
  'avgust',
  'sentabr',
  'oktabr',
  'noyabr',
  'dekabr',
];

export function formatCongratsMonth(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  if (!year || !month || month < 1 || month > 12) return monthKey;
  return `${year}-yil ${UZ_MONTHS[month - 1]}`;
}

export function comboKey(combo: CongratsCombo): string {
  return `${combo.a}-${combo.b}-${combo.c}`;
}

function fillVars(template: string, vars: CongratsVars): string {
  return template
    .split('{ism}').join(vars.ism)
    .split('{ball}').join(String(vars.ball))
    .split('{oy}').join(vars.oy)
    .split('{o\'rin}').join(String(vars.orin))
    .split('{orin}').join(String(vars.orin));
}

export function buildCongratsText(combo: CongratsCombo, rank: WinnerRank, vars: CongratsVars): string {
  const a = OPENING[rank][combo.a] ?? OPENING[rank][0];
  const b = ACHIEVEMENT[combo.b] ?? ACHIEVEMENT[0];
  const c = CLOSING[rank][combo.c] ?? CLOSING[rank][0];
  return `${a} ${fillVars(b, vars)} ${c}`;
}

export function listAllCombos(rank: WinnerRank): CongratsCombo[] {
  const aLen = OPENING[rank].length;
  const bLen = ACHIEVEMENT.length;
  const cLen = CLOSING[rank].length;
  const combos: CongratsCombo[] = [];
  for (let a = 0; a < aLen; a += 1) {
    for (let b = 0; b < bLen; b += 1) {
      for (let c = 0; c < cLen; c += 1) {
        combos.push({ a, b, c });
      }
    }
  }
  return combos;
}

const RECENT_LIMIT = 15;

export function pickFreshCombo(rank: WinnerRank, recentKeys: string[]): CongratsCombo {
  const all = listAllCombos(rank);
  const recent = new Set(recentKeys.slice(-RECENT_LIMIT));
  const fresh = all.filter((combo) => !recent.has(comboKey(combo)));
  const pool = fresh.length > 0 ? fresh : all.filter((combo) => comboKey(combo) !== recentKeys[recentKeys.length - 1]);
  return pool[Math.floor(Math.random() * pool.length)] ?? { a: 0, b: 0, c: 0 };
}
