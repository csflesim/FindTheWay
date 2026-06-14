export type Course = {
  id: number
  title: string
  category: string
  age: string
  teacher: string
  date: string
  time: string
  studio: string
  spots: number
  price: number
  desc: string
  highlights: string[]
  imgSquare?: string
  imgLandscape?: string
}

export const CATEGORIES = ["全部", "素描", "水彩", "油畫", "兒童美術", "親子"]

export const COURSES: Course[] = [
  {
    id: 1,
    title: "基礎水彩入門",
    category: "水彩",
    age: "8歲以上",
    teacher: "小紫老師、明德老師",
    date: "每週六",
    time: "10:00–12:00",
    studio: "Studio A",
    spots: 3,
    price: 1200,
    desc: "從零開始學習水彩技法，課程涵蓋基礎調色、運筆與構圖，適合從未接觸水彩的初學者。每堂課附贈練習用紙，材料費另計。",
    highlights: ["基礎調色技法", "濕畫法與乾畫法", "簡單靜物練習"],
    imgSquare: "/image/watercolor800x800.png",
    imgLandscape: "/image/watercolor1200x400.png",
  },
  {
    id: 2,
    title: "兒童創意素描",
    category: "兒童美術",
    age: "6–12歲",
    teacher: "小紫老師、明德老師",
    date: "每週日",
    time: "14:00–15:30",
    studio: "Studio B",
    spots: 5,
    price: 980,
    desc: "透過遊戲式教學啟發孩子的觀察力與創意，循序漸進學習素描基礎。小班制，老師能給予每位孩子充分關注。",
    highlights: ["觀察力訓練", "線條與形狀", "創意自由發揮"],
    imgSquare: "/image/sketch800x800.png",
    imgLandscape: "/image/sketch1200x400.png",
  },
  {
    id: 3,
    title: "成人油畫工作坊",
    category: "油畫",
    age: "18歲以上",
    teacher: "小紫老師、明德老師",
    date: "每週五",
    time: "19:00–21:00",
    studio: "Studio C",
    spots: 2,
    price: 1500,
    desc: "以輕鬆的工作坊形式進行，每次完成一幅小作品。使用壓克力顏料，學員無需先備知識，帶著好奇心來即可。",
    highlights: ["壓克力顏料運用", "色彩混合技巧", "每堂完成一件作品"],
    imgSquare: "/image/oilpainting800x800.png",
    imgLandscape: "/image/oilpainting1200x400.png",
  },
  {
    id: 4,
    title: "親子藝術探索",
    category: "親子",
    age: "4–8歲（含家長）",
    teacher: "小紫老師、明德老師",
    date: "每週六",
    time: "14:00–15:30",
    studio: "Studio A",
    spots: 4,
    price: 1100,
    desc: "親子共同創作的藝術時光，透過拼貼、水彩、印章等多種媒材讓大小朋友一起探索創意，無任何先備要求。",
    highlights: ["多媒材創作", "親子互動", "輕鬆愉快氛圍"],
    imgSquare: "/image/FamilyArt800x800.png",
    imgLandscape: "/image/FamilyArt1200x400.png",
  },
  {
    id: 5,
    title: "水墨入門體驗",
    category: "素描",
    age: "10歲以上",
    teacher: "小紫老師、明德老師",
    date: "每週三",
    time: "19:00–21:00",
    studio: "Studio B",
    spots: 6,
    price: 1300,
    desc: "認識傳統水墨工具與技法，體驗筆墨在宣紙上的韻味。從基本筆法出發，帶領學員完成花鳥或山水小品。",
    highlights: ["筆墨基本控制", "花鳥山水入門", "傳統文化探索"],
    imgSquare: "/image/inkpainting800x800.png",
    imgLandscape: "/image/inkpainting1200x400.png",
  },
]

export function getCourse(id: number): Course | undefined {
  return COURSES.find(c => c.id === id)
}
