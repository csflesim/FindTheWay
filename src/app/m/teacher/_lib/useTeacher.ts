'use client'

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export type TeacherMe = {
  id: string
  name: string
  specialty: string
  email: string
  phone: string
  bio: string
  photoUrl: string | null
  isLineAccount: boolean
}

/** 取得目前登入者的教師身分；非教師時導回教師登入頁 */
export function useTeacher(redirect = true) {
  const router = useRouter()
  const [teacher, setTeacher] = useState<TeacherMe | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/teacher/me")
      .then(r => r.json())
      .then(d => {
        if (d.teacher) setTeacher(d.teacher)
        else if (redirect) router.replace("/m/teacher/login")
        setLoading(false)
      })
      .catch(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { teacher, loading }
}
