import Link from "next/link"
import { Plus, ChevronRight } from "lucide-react"
import { STUDENTS } from "../_lib/students"

export default function StudentsPage() {
  return (
    <div>
      <header className="sticky top-0 bg-white/90 backdrop-blur-sm border-b border-[#ebebeb] px-5 py-4 flex items-center justify-between z-10">
        <h1 className="text-base font-medium">名下學員</h1>
        <Link href="/m/students/add" className="flex items-center gap-1 text-xs text-black">
          <Plus size={14} />新增
        </Link>
      </header>

      <div className="px-4 py-4 flex flex-col gap-3">
        {STUDENTS.map(s => (
          <Link
            key={s.id}
            href={`/m/students/${s.id}`}
            className="bg-white rounded-xl border border-[#f0f0f0] px-4 py-4 flex items-center gap-4"
          >
            <div className="w-11 h-11 bg-[#f2f2f2] rounded-full shrink-0 flex items-center justify-center text-sm text-[#999]">
              {s.name.slice(0, 1)}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{s.name}</p>
              <p className="text-xs text-[#aaa] mt-0.5">{s.age} 歲 · {s.relation}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-lg font-light">{s.tickets}</p>
              <p className="text-[10px] text-[#aaa]">堂</p>
            </div>
            <ChevronRight size={16} className="text-[#ccc]" />
          </Link>
        ))}
      </div>
    </div>
  )
}
