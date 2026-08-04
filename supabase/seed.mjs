import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
)

function die(step, error) {
  console.error(`[FAIL] ${step}:`, error.message)
  process.exit(1)
}

// ── 教師 ──
const { data: teachers, error: tErr } = await supabase.from("teachers").insert([
  { name: "小紫老師", specialty: "兒童創意・親子",  email: "zico@findtheway.com",    phone: "0911-111-111", photo_url: "/image/purple.jpg",  status: "在職" },
  { name: "明德老師", specialty: "水彩・水墨・油畫", email: "mingdez@findtheway.com", phone: "0922-222-222", photo_url: "/image/mingdez.jpg", status: "在職" },
]).select("id, name")
if (tErr) die("teachers", tErr)
console.log("teachers:", teachers.map(t => t.name).join(", "))

// ── 教室 ──
const { data: rooms, error: rErr } = await supabase.from("classrooms").insert([
  { name: "忙碌不迷路工作室", capacity: 20, equipment: [] },
  { name: "Studio A", capacity: 10, equipment: ["畫架", "投影機", "白板"] },
  { name: "Studio B", capacity: 8,  equipment: ["畫架", "工作桌"] },
  { name: "Studio C", capacity: 8,  equipment: ["拉坯機", "窯爐", "工作桌"] },
]).select("id, name")
if (rErr) die("classrooms", rErr)
console.log("classrooms:", rooms.map(r => r.name).join(", "))

const roomId = Object.fromEntries(rooms.map(r => [r.name, r.id]))
const allTickets = ["單堂試課券", "5堂精選包", "10堂體驗包", "20堂年繳包"]

// ── 課程（來自前台 courses.ts 的真實內容）──
const COURSES = [
  {
    title: "基礎水彩入門", schedule: "每週六 10:00–12:00", studio: "Studio A",
    capacity: 10, enrolled: 7, price: 1200,
    description: "從零開始學習水彩技法，課程涵蓋基礎調色、運筆與構圖，適合從未接觸水彩的初學者。每堂課附贈練習用紙，材料費另計。",
    highlights: ["基礎調色技法", "濕畫法與乾畫法", "簡單靜物練習"],
    cover_url: "/image/watercolor800x800.png", banner_url: "/image/watercolor1200x400.png",
  },
  {
    title: "兒童創意素描", schedule: "每週日 14:00–15:30", studio: "Studio B",
    capacity: 10, enrolled: 5, price: 980,
    description: "透過遊戲式教學啟發孩子的觀察力與創意，循序漸進學習素描基礎。小班制，老師能給予每位孩子充分關注。",
    highlights: ["觀察力訓練", "線條與形狀", "創意自由發揮"],
    cover_url: "/image/sketch800x800.png", banner_url: "/image/sketch1200x400.png",
  },
  {
    title: "成人油畫工作坊", schedule: "每週五 19:00–21:00", studio: "Studio C",
    capacity: 8, enrolled: 6, price: 1500,
    description: "以輕鬆的工作坊形式進行，每次完成一幅小作品。使用壓克力顏料，學員無需先備知識，帶著好奇心來即可。",
    highlights: ["壓克力顏料運用", "色彩混合技巧", "每堂完成一件作品"],
    cover_url: "/image/oilpainting800x800.png", banner_url: "/image/oilpainting1200x400.png",
  },
  {
    title: "親子藝術探索", schedule: "每週六 14:00–15:30", studio: "Studio A",
    capacity: 8, enrolled: 4, price: 1100,
    description: "親子共同創作的藝術時光，透過拼貼、水彩、印章等多種媒材讓大小朋友一起探索創意，無任何先備要求。",
    highlights: ["多媒材創作", "親子互動", "輕鬆愉快氛圍"],
    cover_url: "/image/FamilyArt800x800.png", banner_url: "/image/FamilyArt1200x400.png",
  },
  {
    title: "水墨入門體驗", schedule: "每週三 19:00–21:00", studio: "Studio B",
    capacity: 8, enrolled: 2, price: 1300,
    description: "認識傳統水墨工具與技法，體驗筆墨在宣紙上的韻味。從基本筆法出發，帶領學員完成花鳥或山水小品。",
    highlights: ["筆墨基本控制", "花鳥山水入門", "傳統文化探索"],
    cover_url: "/image/inkpainting800x800.png", banner_url: "/image/inkpainting1200x400.png",
  },
]

const rowsToInsert = COURSES.map((c, i) => ({
  title: c.title,
  types: ["內部"],
  schedule: c.schedule,
  status: "開課中",
  visible: true,
  classroom_id: roomId[c.studio],
  capacity: c.capacity,
  enrolled: c.enrolled,
  ticket_types: allTickets,
  price: c.price,
  description: c.description,
  highlights: c.highlights,
  cover_url: c.cover_url,
  banner_url: c.banner_url,
  sort_order: (i + 1) * 10,
}))

const { data: courses, error: cErr } = await supabase.from("courses").insert(rowsToInsert).select("id, title")
if (cErr) die("courses", cErr)
console.log("courses:", courses.map(c => c.title).join(", "))

// ── 授課老師連結（五堂課皆為雙師）──
const links = courses.flatMap(c => teachers.map(t => ({ course_id: c.id, teacher_id: t.id })))
const { error: lErr } = await supabase.from("course_teachers").insert(links)
if (lErr) die("course_teachers", lErr)
console.log(`course_teachers: ${links.length} links`)

console.log("SEED OK")
