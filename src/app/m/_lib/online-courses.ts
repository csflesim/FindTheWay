export type CourseType = "免費課程" | "系列課"

export type Section = {
  id: number
  title: string
  videoUrl: string
  label: string
  sort: number
  freePreview: boolean
}

export type OnlineCourse = {
  id: number
  title: string
  subtitle: string
  desc: string
  type: CourseType
  price: number
  rating: number
  sort: number
  publishDate: string
  published: boolean
  coverUrl: string
  recommendedIds: number[]
  sections: Section[]
  categories: string[]
}

export const ONLINE_COURSES: OnlineCourse[] = [
  {
    id: 1,
    title: "The Perfect E-commerce Marketing Team Setup For 2025",
    subtitle: "面向電商與實體零售的團隊分工、獲客與轉化課",
    desc: "這套課程圍繞 2025 年電商銷售團隊的崗位配置和協作方式展開，適合正在搭建線上銷售、直播行銷或實體零售數字化團隊的負責人參考。課程重點包括團隊角色拆分、內容與廣告配合、數據複盤、轉化優化和增長節奏安排，幫助學員用更清晰的組織方式提升獲客效率。",
    type: "免費課程", price: 0, rating: 4.6, sort: 10,
    publishDate: "2025-03-12", published: true, coverUrl: "",
    recommendedIds: [2, 3], categories: ["直播營銷", "實體零售"],
    sections: [
      { id: 1, title: "電商銷售團隊配置", videoUrl: "https://www.youtube.com/watch?v=xssFGErVuqw", label: "策略課", sort: 1, freePreview: true },
      { id: 2, title: "內容與廣告配合",   videoUrl: "https://www.youtube.com/watch?v=xssFGErVuqw", label: "視頻課程", sort: 2, freePreview: false },
      { id: 3, title: "數據複盤技巧",     videoUrl: "https://www.youtube.com/watch?v=xssFGErVuqw", label: "視頻課程", sort: 3, freePreview: false },
      { id: 4, title: "轉化優化實戰",     videoUrl: "https://www.youtube.com/watch?v=xssFGErVuqw", label: "視頻課程", sort: 4, freePreview: false },
    ],
  },
  {
    id: 2,
    title: "DIGITAL MARKETING Full Course for Beginners in 3 Hours",
    subtitle: "從 SEO、社媒、廣告到內容漏斗的數字行銷入門課",
    desc: "全面涵蓋數位行銷核心知識，適合剛入門或想系統補強的學員。從搜尋引擎優化、社群媒體行銷、付費廣告到內容行銷漏斗，帶你建立完整的數位行銷認知框架。",
    type: "系列課", price: 0, rating: 4.8, sort: 20,
    publishDate: "2025-04-01", published: true, coverUrl: "",
    recommendedIds: [1, 3], categories: ["直播營銷"],
    sections: [
      { id: 10, title: "數位行銷概覽",    videoUrl: "https://www.youtube.com/watch?v=demo", label: "視頻課程", sort: 1, freePreview: true },
      { id: 11, title: "SEO 基礎",        videoUrl: "https://www.youtube.com/watch?v=demo", label: "視頻課程", sort: 2, freePreview: false },
      { id: 12, title: "社群媒體行銷",    videoUrl: "https://www.youtube.com/watch?v=demo", label: "視頻課程", sort: 3, freePreview: false },
    ],
  },
  {
    id: 3,
    title: "AI for Business: Start Your Enterprise AI Journey",
    subtitle: "用企業視角理解生成式 AI、自動化與落地路線",
    desc: "課程幫助企業主與主管理解生成式 AI 的核心應用場景、導入策略與落地工具選型。透過案例分析，掌握如何在不同業務情境中引入 AI 能力，提升營運效率。",
    type: "系列課", price: 0, rating: 4.7, sort: 30,
    publishDate: "2025-05-10", published: true, coverUrl: "",
    recommendedIds: [1, 2], categories: ["AI諮詢"],
    sections: [
      { id: 20, title: "生成式 AI 概論",   videoUrl: "https://www.youtube.com/watch?v=demo2", label: "視頻課程", sort: 1, freePreview: true },
      { id: 21, title: "導入策略規劃",     videoUrl: "https://www.youtube.com/watch?v=demo2", label: "視頻課程", sort: 2, freePreview: false },
    ],
  },
]

export const CATEGORIES = ["全部", "AI諮詢", "直播營銷", "創造力", "實體零售"]
