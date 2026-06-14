export type Student = {
  id: number
  name: string
  age: number
  relation: string
  tickets: number
}

// Derived from admin orders for account 賴大紫:
// ORD-0040: 賴大紫(本人), 5堂, 2 used → 3 remaining
// ORD-0036: 賴小柏, 10堂, 3 used → 7 remaining
// ORD-0038: 賴小紫, 10堂, 9 used → 1 remaining
export const STUDENTS: Student[] = [
  { id: 1, name: "本人",  age: 35, relation: "本人", tickets: 3 },
  { id: 2, name: "賴小柏", age: 9,  relation: "子女", tickets: 7 },
  { id: 3, name: "賴小紫", age: 7,  relation: "子女", tickets: 1 },
]

export function getStudent(id: number) {
  return STUDENTS.find(s => s.id === id)
}
