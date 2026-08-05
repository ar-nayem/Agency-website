import * as XLSX from 'xlsx'

export const FLAT_FIELDS: { key: string; label: string }[] = [
  { key: 'passportFamilyName', label: 'Passport Family Name' },
  { key: 'givenName', label: 'Given Name' },
  { key: 'fullName', label: 'Full Name' },
  { key: 'gender', label: 'Gender' },
  { key: 'chineseName', label: 'Chinese Name' },
  { key: 'maritalStatus', label: 'Marital Status' },
  { key: 'religion', label: 'Religion' },
  { key: 'occupation', label: 'Occupation' },
  { key: 'employerInstitution', label: 'Employer/Institution' },
  { key: 'nationality', label: 'Nationality' },
  { key: 'dateOfBirth', label: 'Date of Birth' },
  { key: 'yearsInHomeCountry', label: 'Years in Home Country' },
  { key: 'countryOfBirth', label: 'Country of Birth' },
  { key: 'wechat', label: 'WeChat' },
  { key: 'placeOfBirth', label: 'Place of Birth' },
  { key: 'chineseDescent', label: 'Chinese Descent' },
  { key: 'currentlyInChina', label: 'Currently in China' },
  { key: 'homeAddress', label: 'Home Address' },
  { key: 'detailedAddress', label: 'Detailed Address' },
  { key: 'cityProvince', label: 'City/Province' },
  { key: 'country', label: 'Country' },
  { key: 'zipcode', label: 'Zipcode' },
  { key: 'phoneMobile', label: 'Phone/Mobile' },
  { key: 'mainEmail', label: 'Main Email' },
  { key: 'passportNo', label: 'Passport No.' },
  { key: 'passportExpiryDate', label: 'Passport Expiry' },
  { key: 'oldPassportNo', label: 'Old Passport No.' },
  { key: 'oldPassportExpiry', label: 'Old Passport Expiry' },
  { key: 'studiedInChina', label: 'Studied in China' },
  { key: 'visaType', label: 'Visa Type' },
  { key: 'chinaInstitution', label: 'China Institution' },
  { key: 'visaExpiryDate', label: 'Visa Expiry' },
  { key: 'studyInChinaFrom', label: 'Study in China From' },
  { key: 'studyInChinaTo', label: 'Study in China To' },
  { key: 'programApplied', label: 'Program Applied' },
  { key: 'notes', label: 'Notes' },
]

// Kept in sync with the required-field check in the import route — single source of truth
// for both the "*" markers on the template and the server-side validation.
export const REQUIRED_FLAT_KEYS = ['passportFamilyName', 'givenName', 'fullName', 'passportNo', 'mainEmail']

const PASSPORT_LINK_LABEL = 'Passport No. (links to Student sheet)'

type NestedSection = {
  sheet: string
  fields: { key: string; label: string }[]
}

export const NESTED_SECTIONS: Record<string, NestedSection> = {
  educationHistory: {
    sheet: 'Education History',
    fields: [
      { key: 'degree', label: 'Degree' },
      { key: 'schoolName', label: 'School Name' },
      { key: 'yearFrom', label: 'Year From' },
      { key: 'yearTo', label: 'Year To' },
      { key: 'contactPerson', label: 'Contact Person' },
    ],
  },
  workExperience: {
    sheet: 'Work Experience',
    fields: [
      { key: 'yearFrom', label: 'Year From' },
      { key: 'yearTo', label: 'Year To' },
      { key: 'company', label: 'Company' },
      { key: 'occupation', label: 'Occupation' },
      { key: 'reference', label: 'Reference' },
      { key: 'phone', label: 'Phone' },
      { key: 'email', label: 'Email' },
    ],
  },
  familyMembers: {
    sheet: 'Family Members',
    fields: [
      { key: 'name', label: 'Name' },
      { key: 'relationship', label: 'Relationship' },
      { key: 'nationality', label: 'Nationality' },
      { key: 'employer', label: 'Employer' },
      { key: 'occupation', label: 'Occupation' },
      { key: 'phone', label: 'Phone' },
      { key: 'email', label: 'Email' },
    ],
  },
  financialSponsors: {
    sheet: 'Financial Sponsors',
    fields: [
      { key: 'name', label: 'Name' },
      { key: 'relationship', label: 'Relationship' },
      { key: 'nationality', label: 'Nationality' },
      { key: 'employer', label: 'Employer' },
      { key: 'occupation', label: 'Occupation' },
      { key: 'phone', label: 'Phone' },
      { key: 'email', label: 'Email' },
    ],
  },
}

function headerLabel(f: { key: string; label: string }): string {
  return REQUIRED_FLAT_KEYS.includes(f.key) ? `${f.label} *` : f.label
}

function stripMarker(label: string): string {
  return label.replace(/\s*\*\s*$/, '').trim()
}

export function buildStudentWorkbook(
  student: Record<string, any> | null,
  opts?: { blankRows?: number; requiredDocs?: string[] }
): XLSX.WorkBook {
  const wb = XLSX.utils.book_new()

  if (!student) {
    const requiredDocs = opts?.requiredDocs?.length ? opts.requiredDocs : ['(none configured yet)']
    const lines: string[][] = [
      ['How to use this template'],
      [''],
      ['1. Fill in one row per student on the "Student" sheet — add as many rows as you need, there is no limit.'],
      ['2. Columns marked with * are required for every student.'],
      ['3. If a student has more than one education entry, job, family member, or financial sponsor, add one row per'],
      ['   entry on the matching sheet, and put that student\'s Passport No. in the first column so it links back to the'],
      ['   right student. You can leave those sheets empty if not needed.'],
      ['4. Save the file and upload it on the "Add Student" page — every filled row becomes a student.'],
      [''],
      ['Required documents (upload separately per student after import, from the student\'s Documents page)'],
      ...requiredDocs.map(d => [`  • ${d}`]),
    ]
    const infoSheet = XLSX.utils.aoa_to_sheet(lines)
    infoSheet['!cols'] = [{ wch: 100 }]
    XLSX.utils.book_append_sheet(wb, infoSheet, 'Instructions')
  }

  const flatHeader = FLAT_FIELDS.map(headerLabel)
  const rows: Record<string, string>[] = student
    ? [buildFlatRow(student)]
    : Array.from({ length: opts?.blankRows ?? 5 }, () => buildFlatRow(null))

  const studentSheet = XLSX.utils.json_to_sheet(rows, { header: flatHeader })
  studentSheet['!cols'] = flatHeader.map(h => ({ wch: Math.max(14, Math.min(28, h.length + 2)) }))
  XLSX.utils.book_append_sheet(wb, studentSheet, 'Student')

  for (const [relKey, section] of Object.entries(NESTED_SECTIONS)) {
    const sectionHeader = [PASSPORT_LINK_LABEL, ...section.fields.map(f => f.label)]
    const rows: Record<string, string>[] = student?.[relKey]?.length
      ? student[relKey].map((row: any) => {
          const r: Record<string, string> = { [PASSPORT_LINK_LABEL]: student.passportNo ?? '' }
          for (const f of section.fields) r[f.label] = row[f.key] ?? ''
          return r
        })
      : []
    const sheet = XLSX.utils.json_to_sheet(rows, { header: sectionHeader })
    sheet['!cols'] = sectionHeader.map(h => ({ wch: Math.max(14, Math.min(28, h.length + 2)) }))
    XLSX.utils.book_append_sheet(wb, sheet, section.sheet)
  }

  return wb
}

function buildFlatRow(student: Record<string, any> | null): Record<string, string> {
  const row: Record<string, string> = {}
  for (const f of FLAT_FIELDS) row[headerLabel(f)] = student ? (student[f.key] ?? '') : ''
  return row
}

export interface ParsedStudentEntry {
  studentData: Record<string, string>
  educationHistory: Record<string, string>[]
  workExperience: Record<string, string>[]
  familyMembers: Record<string, string>[]
  financialSponsors: Record<string, string>[]
}

export function parseStudentWorkbook(buffer: Buffer | ArrayBuffer): ParsedStudentEntry[] {
  const wb = XLSX.read(buffer, { type: 'buffer' })

  const labelToKey = new Map(FLAT_FIELDS.map(f => [f.label, f.key]))
  const studentRows: Record<string, string>[] = []
  const studentSheet = wb.Sheets['Student']
  if (studentSheet) {
    const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(studentSheet, { defval: '' })
    for (const raw of rawRows) {
      const mapped: Record<string, string> = {}
      let hasAny = false
      for (const [label, value] of Object.entries(raw)) {
        const key = labelToKey.get(stripMarker(label))
        const strVal = String(value ?? '').trim()
        if (key) {
          mapped[key] = strVal
          if (strVal) hasAny = true
        }
      }
      if (hasAny) studentRows.push(mapped)
    }
  }

  function parseSectionRows(relKey: string): { passportNo: string; data: Record<string, string> }[] {
    const section = NESTED_SECTIONS[relKey]
    const sectionLabelToKey = new Map(section.fields.map(f => [f.label, f.key]))
    const sheet = wb.Sheets[section.sheet]
    const result: { passportNo: string; data: Record<string, string> }[] = []
    if (!sheet) return result
    const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' })
    for (const raw of rawRows) {
      const mapped: Record<string, string> = {}
      let hasAny = false
      let passportNo = ''
      for (const [label, value] of Object.entries(raw)) {
        const strVal = String(value ?? '').trim()
        const cleanLabel = stripMarker(label)
        if (cleanLabel === PASSPORT_LINK_LABEL || cleanLabel === 'Passport No.') {
          passportNo = strVal
          continue
        }
        const key = sectionLabelToKey.get(cleanLabel)
        if (key) {
          mapped[key] = strVal
          if (strVal) hasAny = true
        }
      }
      if (hasAny) result.push({ passportNo, data: mapped })
    }
    return result
  }

  const sectionRows: Record<string, { passportNo: string; data: Record<string, string> }[]> = {}
  for (const relKey of Object.keys(NESTED_SECTIONS)) sectionRows[relKey] = parseSectionRows(relKey)

  return studentRows.map(studentData => {
    const passport = (studentData.passportNo || '').trim().toLowerCase()
    const entry: ParsedStudentEntry = {
      studentData,
      educationHistory: [],
      workExperience: [],
      familyMembers: [],
      financialSponsors: [],
    }
    for (const relKey of Object.keys(NESTED_SECTIONS) as (keyof Omit<ParsedStudentEntry, 'studentData'>)[]) {
      const all = sectionRows[relKey]
      // Rows tagged with this passport belong to this student. If the whole workbook
      // only has one student, untagged rows (old single-student template format) fall
      // back to them too — keeps pre-existing downloaded templates working.
      const matched = passport ? all.filter(r => r.passportNo.trim().toLowerCase() === passport) : []
      const fallback = studentRows.length === 1 ? all.filter(r => !r.passportNo.trim()) : []
      entry[relKey] = [...matched, ...fallback].map(r => r.data)
    }
    return entry
  })
}
