const BASE = [
  // row 1 — dark greens → teals → navy → blues → reds → brown
  '#0A1810','#1B3D24','#1D5C38','#1A7A5E','#147878','#0E9490','#00A8A2','#00BEB8',
  '#0C1C3C','#1034A8','#1C5EC8','#5298D5','#6C0C20','#B81C1C','#F03A35','#F090A8',
  '#F7BFB0','#5D2A10',
  // row 2 — orange-reds, yellows, slate blues, rust, mauve
  '#C23B1C','#E05818','#E08B5A','#8B6C14','#C49C18','#D4B01C','#DECB24','#E8D250',
  '#1C2235','#2E3D4D','#4A5672','#7A92A8','#7C2C1A','#B4452A','#DA6240','#E8926E',
  '#C2807C','#B09ACC',
  // row 3 — purples, browns, tans, greens, navys, terra-cotta
  '#7A4AA2','#B07ACC','#6C3C20','#9A6240','#C49B72','#D4B690',
  '#1A5C3C','#1A7C6A','#2A9C82','#72B89A',
  '#0A1428','#0D2040','#163462','#2C4A82',
  '#5C3212','#8A522A','#C07242','#D49A6C',
  // row 4 — salmon, olive, purple, mauve, teal, crimson, rose
  '#E09282','#6C7214','#B09C22','#C8B07A','#D8C8A0',
  '#4C1A6C','#A2508A','#C27A9A','#D4A2B0',
  '#1A5042','#1A6856','#2A927C','#5CBAA2',
  '#8C1C2C','#9C2A3A','#D28092','#E2AAB2',
  // row 5 — navy, steel blue, wine, brown, amber, forest, purple
  '#0A1828','#102040','#3062A4','#7AA2CC',
  '#6C1428','#9C3062','#C27294','#D4A2BA',
  '#5C3018','#9C6C32','#C48E40','#E0B272',
  '#0A2818','#1A4A28','#2A6A3C','#3C9A72','#5ABA92','#3C1A62',
  // row 6 — purple, maroon, mauve, navy-teal, olive, gray-green
  '#5C2092','#8C52BC','#B282D2',
  '#5C1420','#8C2842','#B25272','#D29292','#E8B2BA',
  '#1A2840','#1A5062','#3082A2','#5292BC',
  '#1C2A10','#3A5218','#5A7228','#8A9A52','#2C504A','#5A7060',
  // row 7 — violet, maroon-browns, midnight, teal-blue, olive-sage
  '#3C1062','#7252A4','#9A7ACA',
  '#4A1E18','#7C2A32','#D26268','#E09480','#F0C2B0',
  '#0A1832','#1A4254','#2A6A84','#6292B4',
  '#1A2014','#3C4222','#5C6232','#7A8A52','#9AB87A','#A2BA92',
]

export function avatarColorFromId(id: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i)
    h = (h * 0x01000193) >>> 0
  }
  return BASE[h % BASE.length]
}
