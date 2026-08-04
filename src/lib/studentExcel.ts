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

export function buildStudentWorkbook(student: Record<string, any> | null): XLSX.WorkBook {
  const wb = XLSX.utils.book_new()

  const flatRow: Record<string, string> = {}
  for (const f of FLAT_FIELDS) {
    flatRow[f.label] = student ? (student[f.key] ?? '') : ''
  }
  const studentSheet = XLSX.utils.json_to_sheet([flatRow], { header: FLAT_FIELDS.map(f => f.label) })
  XLSX.utils.book_append_sheet(wb, studentSheet, 'Student')

  for (const [relKey, section] of Object.entries(NESTED_SECTIONS)) {
    const rows: Record<string, string>[] = student?.[relKey]?.length
      ? student[relKey].map((row: any) => {
          const r: Record<string, string> = {}
          for (const f of section.fields) r[f.label] = row[f.key] ?? ''
          return r
        })
      : []
    const sheet = XLSX.utils.json_to_sheet(rows, { header: section.fields.map(f => f.label) })
    XLSX.utils.book_append_sheet(wb, sheet, section.sheet)
  }

  return wb
}

export function parseStudentWorkbook(buffer: Buffer | ArrayBuffer) {
  const wb = XLSX.read(buffer, { type: 'buffer' })

  const labelToKey = new Map(FLAT_FIELDS.map(f => [f.label, f.key]))
  const studentData: Record<string, string> = {}
  const studentSheet = wb.Sheets['Student']
  if (studentSheet) {
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(studentSheet, { defval: '' })
    if (rows[0]) {
      for (const [label, value] of Object.entries(rows[0])) {
        const key = labelToKey.get(label.trim())
        if (key) studentData[key] = String(value ?? '').trim()
      }
    }
  }

  function parseSection(relKey: string): Record<string, string>[] {
    const section = NESTED_SECTIONS[relKey]
    const sectionLabelToKey = new Map(section.fields.map(f => [f.label, f.key]))
    const sheet = wb.Sheets[section.sheet]
    const result: Record<string, string>[] = []
    if (!sheet) return result
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' })
    for (const row of rows) {
      const mapped: Record<string, string> = {}
      let hasAny = false
      for (const [label, value] of Object.entries(row)) {
        const key = sectionLabelToKey.get(label.trim())
        const strVal = String(value ?? '').trim()
        if (key) {
          mapped[key] = strVal
          if (strVal) hasAny = true
        }
      }
      if (hasAny) result.push(mapped)
    }
    return result
  }

  return {
    studentData,
    educationHistory: parseSection('educationHistory'),
    workExperience: parseSection('workExperience'),
    familyMembers: parseSection('familyMembers'),
    financialSponsors: parseSection('financialSponsors'),
  }
}
