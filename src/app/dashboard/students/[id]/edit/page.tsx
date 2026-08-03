'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Save, ArrowLeft, Loader2, Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'

interface EducationItem {
  degree: string
  schoolName: string
  yearFrom: string
  yearTo: string
  contactPerson: string
}

interface WorkItem {
  yearFrom: string
  yearTo: string
  company: string
  occupation: string
  reference: string
  phone: string
  email: string
}

interface FamilyItem {
  name: string
  relationship: string
  nationality: string
  employer: string
  occupation: string
  phone: string
  email: string
}

interface SponsorItem {
  name: string
  relationship: string
  nationality: string
  employer: string
  occupation: string
  phone: string
  email: string
}

interface FieldReq {
  key: string
  label: string
  section: string
  isRequired: boolean
}

function parseDate(dateStr: string | null | undefined) {
  if (!dateStr || dateStr === '-') return { year: '', month: '', day: '' }
  const parts = dateStr.split('/')
  return { year: parts[0] || '', month: parts[1] || '', day: parts[2] || '' }
}

function YearMonthDayInput({ label, required, year, month, day, onChange }: {
  label: string
  required?: boolean
  year: string
  month: string
  day: string
  onChange: (y: string, m: string, d: string) => void
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="YYYY"
          maxLength={4}
          value={year}
          onChange={e => onChange(e.target.value, month, day)}
          className="w-20 px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm text-center bg-white"
        />
        <span className="self-center text-slate-300 font-medium">/</span>
        <input
          type="text"
          placeholder="MM"
          maxLength={2}
          value={month}
          onChange={e => onChange(year, e.target.value, day)}
          className="w-14 px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm text-center bg-white"
        />
        <span className="self-center text-slate-300 font-medium">/</span>
        <input
          type="text"
          placeholder="DD"
          maxLength={2}
          value={day}
          onChange={e => onChange(year, month, e.target.value)}
          className="w-14 px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm text-center bg-white"
        />
      </div>
    </div>
  )
}

function buildDate(year: string, month: string, day: string) {
  if (!year && !month && !day) return ''
  return `${year}/${month.padStart(2, '0')}/${day.padStart(2, '0')}`
}

export default function EditStudentPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [fieldRequirements, setFieldRequirements] = useState<FieldReq[]>([])

  // Personal Information
  const [passportFamilyName, setPassportFamilyName] = useState('')
  const [givenName, setGivenName] = useState('')
  const [fullName, setFullName] = useState('')
  const [gender, setGender] = useState('')
  const [chineseName, setChineseName] = useState('')
  const [maritalStatus, setMaritalStatus] = useState('')
  const [religion, setReligion] = useState('')
  const [occupation, setOccupation] = useState('')
  const [employerInstitution, setEmployerInstitution] = useState('')
  const [nationality, setNationality] = useState('')
  const [dateOfBirthYMD, setDateOfBirthYMD] = useState({ year: '', month: '', day: '' })
  const [yearsInHomeCountry, setYearsInHomeCountry] = useState('')
  const [countryOfBirth, setCountryOfBirth] = useState('')
  const [wechat, setWechat] = useState('')
  const [placeOfBirth, setPlaceOfBirth] = useState('')
  const [chineseDescent, setChineseDescent] = useState('No')
  const [currentlyInChina, setCurrentlyInChina] = useState('No')

  // Address
  const [homeAddress, setHomeAddress] = useState('')
  const [detailedAddress, setDetailedAddress] = useState('')
  const [cityProvince, setCityProvince] = useState('')
  const [country, setCountry] = useState('')
  const [zipcode, setZipcode] = useState('')
  const [phoneMobile, setPhoneMobile] = useState('')
  const [mainEmail, setMainEmail] = useState('')

  // Passport
  const [passportNo, setPassportNo] = useState('')
  const [passportExpiryYMD, setPassportExpiryYMD] = useState({ year: '', month: '', day: '' })
  const [oldPassportNo, setOldPassportNo] = useState('')
  const [oldPassportExpiryYMD, setOldPassportExpiryYMD] = useState({ year: '', month: '', day: '' })

  // China Study
  const [studiedInChina, setStudiedInChina] = useState('No')
  const [visaType, setVisaType] = useState('')
  const [chinaInstitution, setChinaInstitution] = useState('')
  const [visaExpiryYMD, setVisaExpiryYMD] = useState({ year: '', month: '', day: '' })
  const [studyInChinaFromYMD, setStudyInChinaFromYMD] = useState({ year: '', month: '', day: '' })
  const [studyInChinaToYMD, setStudyInChinaToYMD] = useState({ year: '', month: '', day: '' })

  // Program
  const [programApplied, setProgramApplied] = useState('')
  const [notes, setNotes] = useState('')

  // Arrays
  const [educationHistory, setEducationHistory] = useState<EducationItem[]>([
    { degree: '', schoolName: '', yearFrom: '', yearTo: '', contactPerson: '' }
  ])
  const [workExperience, setWorkExperience] = useState<WorkItem[]>([
    { yearFrom: '', yearTo: '', company: '', occupation: '', reference: '', phone: '', email: '' }
  ])
  const [familyMembers, setFamilyMembers] = useState<FamilyItem[]>([
    { name: '', relationship: '', nationality: '', employer: '', occupation: '', phone: '', email: '' }
  ])
  const [financialSponsors, setFinancialSponsors] = useState<SponsorItem[]>([
    { name: '', relationship: '', nationality: '', employer: '', occupation: '', phone: '', email: '' }
  ])

  useEffect(() => {
    fetch('/api/field-requirements')
      .then(r => r.json())
      .then(data => setFieldRequirements(data))
      .catch(() => toast.error('Failed to load field requirements'))

    if (!id) return

    fetch(`/api/students/${id}`)
      .then(r => {
        if (!r.ok) throw new Error('Failed to load student')
        return r.json()
      })
      .then(student => {
        // Personal Information
        setPassportFamilyName(student.passportFamilyName || '')
        setGivenName(student.givenName || '')
        setFullName(student.fullName || '')
        setGender(student.gender || '')
        setChineseName(student.chineseName || '')
        setMaritalStatus(student.maritalStatus || '')
        setReligion(student.religion || '')
        setOccupation(student.occupation || '')
        setEmployerInstitution(student.employerInstitution || '')
        setNationality(student.nationality || '')
        setDateOfBirthYMD(parseDate(student.dateOfBirth))
        setYearsInHomeCountry(student.yearsInHomeCountry || '')
        setCountryOfBirth(student.countryOfBirth || '')
        setWechat(student.wechat || '')
        setPlaceOfBirth(student.placeOfBirth || '')
        setChineseDescent(student.chineseDescent || 'No')
        setCurrentlyInChina(student.currentlyInChina || 'No')

        // Address
        setHomeAddress(student.homeAddress || '')
        setDetailedAddress(student.detailedAddress || '')
        setCityProvince(student.cityProvince || '')
        setCountry(student.country || '')
        setZipcode(student.zipcode || '')
        setPhoneMobile(student.phoneMobile || '')
        setMainEmail(student.mainEmail || '')

        // Passport
        setPassportNo(student.passportNo || '')
        setPassportExpiryYMD(parseDate(student.passportExpiryDate))
        setOldPassportNo(student.oldPassportNo || '')
        setOldPassportExpiryYMD(parseDate(student.oldPassportExpiry))

        // China Study
        setStudiedInChina(student.studiedInChina || 'No')
        setVisaType(student.visaType || '')
        setChinaInstitution(student.chinaInstitution || '')
        setVisaExpiryYMD(parseDate(student.visaExpiryDate))
        setStudyInChinaFromYMD(parseDate(student.studyInChinaFrom))
        setStudyInChinaToYMD(parseDate(student.studyInChinaTo))

        // Program
        setProgramApplied(student.programApplied || '')
        setNotes(student.notes || '')

        // Arrays - use existing if non-empty, otherwise default single-item arrays
        setEducationHistory(
          student.educationHistory?.length > 0
            ? student.educationHistory
            : [{ degree: '', schoolName: '', yearFrom: '', yearTo: '', contactPerson: '' }]
        )
        setWorkExperience(
          student.workExperience?.length > 0
            ? student.workExperience
            : [{ yearFrom: '', yearTo: '', company: '', occupation: '', reference: '', phone: '', email: '' }]
        )
        setFamilyMembers(
          student.familyMembers?.length > 0
            ? student.familyMembers
            : [{ name: '', relationship: '', nationality: '', employer: '', occupation: '', phone: '', email: '' }]
        )
        setFinancialSponsors(
          student.financialSponsors?.length > 0
            ? student.financialSponsors
            : [{ name: '', relationship: '', nationality: '', employer: '', occupation: '', phone: '', email: '' }]
        )
      })
      .catch(err => {
        toast.error(err.message || 'Failed to load student')
      })
      .finally(() => setFetching(false))
  }, [id])

  function isRequired(key: string) {
    const req = fieldRequirements.find(f => f.key === key)
    return req ? req.isRequired : false
  }

  function reqLabel(label: string, key: string) {
    return isRequired(key) ? `${label} *` : label
  }

  // Array helpers
  function addEducation() {
    setEducationHistory(prev => [...prev, { degree: '', schoolName: '', yearFrom: '', yearTo: '', contactPerson: '' }])
  }
  function updateEducation(index: number, field: keyof EducationItem, value: string) {
    setEducationHistory(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item))
  }
  function removeEducation(index: number) {
    setEducationHistory(prev => prev.filter((_, i) => i !== index))
  }

  function addWork() {
    setWorkExperience(prev => [...prev, { yearFrom: '', yearTo: '', company: '', occupation: '', reference: '', phone: '', email: '' }])
  }
  function updateWork(index: number, field: keyof WorkItem, value: string) {
    setWorkExperience(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item))
  }
  function removeWork(index: number) {
    setWorkExperience(prev => prev.filter((_, i) => i !== index))
  }

  function addFamily() {
    setFamilyMembers(prev => [...prev, { name: '', relationship: '', nationality: '', employer: '', occupation: '', phone: '', email: '' }])
  }
  function updateFamily(index: number, field: keyof FamilyItem, value: string) {
    setFamilyMembers(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item))
  }
  function removeFamily(index: number) {
    setFamilyMembers(prev => prev.filter((_, i) => i !== index))
  }

  function addSponsor() {
    setFinancialSponsors(prev => [...prev, { name: '', relationship: '', nationality: '', employer: '', occupation: '', phone: '', email: '' }])
  }
  function updateSponsor(index: number, field: keyof SponsorItem, value: string) {
    setFinancialSponsors(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item))
  }
  function removeSponsor(index: number) {
    setFinancialSponsors(prev => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const studentData = {
        passportFamilyName,
        givenName,
        fullName,
        gender,
        chineseName,
        maritalStatus,
        religion,
        occupation,
        employerInstitution,
        nationality,
        dateOfBirth: buildDate(dateOfBirthYMD.year, dateOfBirthYMD.month, dateOfBirthYMD.day),
        yearsInHomeCountry,
        countryOfBirth,
        wechat,
        placeOfBirth,
        chineseDescent,
        currentlyInChina,
        homeAddress,
        detailedAddress,
        cityProvince,
        country,
        zipcode,
        phoneMobile,
        mainEmail,
        passportNo,
        passportExpiryDate: buildDate(passportExpiryYMD.year, passportExpiryYMD.month, passportExpiryYMD.day),
        oldPassportNo,
        oldPassportExpiry: buildDate(oldPassportExpiryYMD.year, oldPassportExpiryYMD.month, oldPassportExpiryYMD.day),
        studiedInChina,
        visaType,
        chinaInstitution,
        visaExpiryDate: buildDate(visaExpiryYMD.year, visaExpiryYMD.month, visaExpiryYMD.day),
        studyInChinaFrom: buildDate(studyInChinaFromYMD.year, studyInChinaFromYMD.month, studyInChinaFromYMD.day),
        studyInChinaTo: buildDate(studyInChinaToYMD.year, studyInChinaToYMD.month, studyInChinaToYMD.day),
        programApplied,
        notes,
        educationHistory: educationHistory.filter(e => e.degree || e.schoolName),
        workExperience: workExperience.filter(w => w.company || w.occupation),
        familyMembers: familyMembers.filter(f => f.name || f.relationship),
        financialSponsors: financialSponsors.filter(s => s.name || s.relationship),
      }

      const res = await fetch(`/api/students/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(studentData)
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        toast.error(errData.error || 'Failed to update student')
        setLoading(false)
        return
      }

      toast.success('Student updated successfully')
      router.push(`/dashboard/students/${id}`)
    } catch {
      toast.error('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const inputClass = "w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm bg-white transition-all"
  const labelClass = "block text-sm font-medium text-slate-700 mb-1.5"
  const sectionClass = "bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 backdrop-blur-sm"
  const sectionTitle = "text-lg font-bold text-slate-900 mb-5 pb-3 border-b border-slate-100 flex items-center gap-2"

  if (fetching) {
    return (
      <div className="max-w-6xl mx-auto flex flex-col items-center justify-center py-24">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
        <p className="text-slate-500 text-sm">Loading student data...</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href={`/dashboard/students/${id}`} className="text-slate-400 hover:text-slate-600 transition p-2 hover:bg-slate-100 rounded-xl">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Edit Student</h1>
          <p className="text-slate-500 mt-1 text-sm">Update the student information below</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">

            {/* 1. Personal Information */}
            <div className={sectionClass}>
              <h3 className={sectionTitle}><span className="text-indigo-600 font-bold">1.</span> Personal Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>{reqLabel('Passport Family Name', 'passportFamilyName')}</label>
                  <input required={isRequired('passportFamilyName')} value={passportFamilyName} onChange={e => setPassportFamilyName(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>{reqLabel('Given Name', 'givenName')}</label>
                  <input required={isRequired('givenName')} value={givenName} onChange={e => setGivenName(e.target.value)} className={inputClass} />
                </div>
                <div className="md:col-span-2">
                  <label className={labelClass}>{reqLabel('Full Name (as on passport)', 'fullName')}</label>
                  <input required={isRequired('fullName')} value={fullName} onChange={e => setFullName(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>{reqLabel('Gender', 'gender')}</label>
                  <select required={isRequired('gender')} value={gender} onChange={e => setGender(e.target.value)} className={inputClass}>
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>{reqLabel('Marital Status', 'maritalStatus')}</label>
                  <select required={isRequired('maritalStatus')} value={maritalStatus} onChange={e => setMaritalStatus(e.target.value)} className={inputClass}>
                    <option value="">Select</option>
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Divorced">Divorced</option>
                    <option value="Widowed">Widowed</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Chinese Name</label>
                  <input value={chineseName} onChange={e => setChineseName(e.target.value)} className={inputClass} placeholder="If any" />
                </div>
                <div>
                  <label className={labelClass}>{reqLabel('Religion', 'religion')}</label>
                  <input required={isRequired('religion')} value={religion} onChange={e => setReligion(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>{reqLabel('Occupation', 'occupation')}</label>
                  <input required={isRequired('occupation')} value={occupation} onChange={e => setOccupation(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Employer / Institution Affiliated</label>
                  <input value={employerInstitution} onChange={e => setEmployerInstitution(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>{reqLabel('Nationality', 'nationality')}</label>
                  <input required={isRequired('nationality')} value={nationality} onChange={e => setNationality(e.target.value)} className={inputClass} />
                </div>
                <YearMonthDayInput
                  label={reqLabel('Date of Birth', 'dateOfBirth')}
                  required={isRequired('dateOfBirth')}
                  year={dateOfBirthYMD.year}
                  month={dateOfBirthYMD.month}
                  day={dateOfBirthYMD.day}
                  onChange={(y, m, d) => setDateOfBirthYMD({ year: y, month: m, day: d })}
                />
                <div>
                  <label className={labelClass}>{reqLabel('Country of Birth', 'countryOfBirth')}</label>
                  <input required={isRequired('countryOfBirth')} value={countryOfBirth} onChange={e => setCountryOfBirth(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>{reqLabel('Place of Birth', 'placeOfBirth')}</label>
                  <input required={isRequired('placeOfBirth')} value={placeOfBirth} onChange={e => setPlaceOfBirth(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Years Living in Home Country</label>
                  <input value={yearsInHomeCountry} onChange={e => setYearsInHomeCountry(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>WeChat</label>
                  <input value={wechat} onChange={e => setWechat(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>{reqLabel('Of Chinese Descent?', 'chineseDescent')}</label>
                  <select required={isRequired('chineseDescent')} value={chineseDescent} onChange={e => setChineseDescent(e.target.value)} className={inputClass}>
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>{reqLabel('Currently in China?', 'currentlyInChina')}</label>
                  <select required={isRequired('currentlyInChina')} value={currentlyInChina} onChange={e => setCurrentlyInChina(e.target.value)} className={inputClass}>
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 2. Correspondence Address */}
            <div className={sectionClass}>
              <h3 className={sectionTitle}><span className="text-indigo-600 font-bold">2.</span> Correspondence Address</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className={labelClass}>Home Address</label>
                  <input value={homeAddress} onChange={e => setHomeAddress(e.target.value)} className={inputClass} />
                </div>
                <div className="md:col-span-2">
                  <label className={labelClass}>{reqLabel('Detailed Address', 'detailedAddress')}</label>
                  <input required={isRequired('detailedAddress')} value={detailedAddress} onChange={e => setDetailedAddress(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>{reqLabel('City / Province', 'cityProvince')}</label>
                  <input required={isRequired('cityProvince')} value={cityProvince} onChange={e => setCityProvince(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>{reqLabel('Country', 'country')}</label>
                  <input required={isRequired('country')} value={country} onChange={e => setCountry(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>{reqLabel('Zipcode', 'zipcode')}</label>
                  <input required={isRequired('zipcode')} value={zipcode} onChange={e => setZipcode(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>{reqLabel('Phone / Mobile', 'phoneMobile')}</label>
                  <input required={isRequired('phoneMobile')} value={phoneMobile} onChange={e => setPhoneMobile(e.target.value)} className={inputClass} />
                </div>
                <div className="md:col-span-2">
                  <label className={labelClass}>{reqLabel('Main Email', 'mainEmail')}</label>
                  <input type="email" required={isRequired('mainEmail')} value={mainEmail} onChange={e => setMainEmail(e.target.value)} className={inputClass} />
                </div>
              </div>
            </div>

            {/* 3. Passport & Visa */}
            <div className={sectionClass}>
              <h3 className={sectionTitle}><span className="text-indigo-600 font-bold">3.</span> Passport & Visa Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>{reqLabel('Passport No.', 'passportNo')}</label>
                  <input required={isRequired('passportNo')} value={passportNo} onChange={e => setPassportNo(e.target.value)} className={inputClass} />
                </div>
                <YearMonthDayInput
                  label={reqLabel('Passport Expiry Date', 'passportExpiryDate')}
                  required={isRequired('passportExpiryDate')}
                  year={passportExpiryYMD.year}
                  month={passportExpiryYMD.month}
                  day={passportExpiryYMD.day}
                  onChange={(y, m, d) => setPassportExpiryYMD({ year: y, month: m, day: d })}
                />
                <div>
                  <label className={labelClass}>Old Passport No.</label>
                  <input value={oldPassportNo} onChange={e => setOldPassportNo(e.target.value)} className={inputClass} />
                </div>
                <YearMonthDayInput
                  label="Old Passport Expiry"
                  year={oldPassportExpiryYMD.year}
                  month={oldPassportExpiryYMD.month}
                  day={oldPassportExpiryYMD.day}
                  onChange={(y, m, d) => setOldPassportExpiryYMD({ year: y, month: m, day: d })}
                />
              </div>
            </div>

            {/* 4. Learning Experience in China */}
            <div className={sectionClass}>
              <h3 className={sectionTitle}><span className="text-indigo-600 font-bold">4.</span> Learning Experience in China</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>{reqLabel('Have you studied in China?', 'studiedInChina')}</label>
                  <select required={isRequired('studiedInChina')} value={studiedInChina} onChange={e => setStudiedInChina(e.target.value)} className={inputClass}>
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                </div>
                {studiedInChina === 'Yes' && (
                  <>
                    <div>
                      <label className={labelClass}>Visa Type</label>
                      <input value={visaType} onChange={e => setVisaType(e.target.value)} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Institution in China</label>
                      <input value={chinaInstitution} onChange={e => setChinaInstitution(e.target.value)} className={inputClass} />
                    </div>
                    <YearMonthDayInput
                      label="Visa Expiry Date"
                      year={visaExpiryYMD.year}
                      month={visaExpiryYMD.month}
                      day={visaExpiryYMD.day}
                      onChange={(y, m, d) => setVisaExpiryYMD({ year: y, month: m, day: d })}
                    />
                    <YearMonthDayInput
                      label="Study Duration (From)"
                      year={studyInChinaFromYMD.year}
                      month={studyInChinaFromYMD.month}
                      day={studyInChinaFromYMD.day}
                      onChange={(y, m, d) => setStudyInChinaFromYMD({ year: y, month: m, day: d })}
                    />
                    <YearMonthDayInput
                      label="Study Duration (To)"
                      year={studyInChinaToYMD.year}
                      month={studyInChinaToYMD.month}
                      day={studyInChinaToYMD.day}
                      onChange={(y, m, d) => setStudyInChinaToYMD({ year: y, month: m, day: d })}
                    />
                  </>
                )}
              </div>
            </div>

            {/* 5. Program Applied */}
            <div className={sectionClass}>
              <h3 className={sectionTitle}><span className="text-indigo-600 font-bold">5.</span> Program Applied For</h3>
              <div>
                <label className={labelClass}>{reqLabel('Program / Course', 'programApplied')}</label>
                <input value={programApplied} onChange={e => setProgramApplied(e.target.value)} className={inputClass} required={isRequired('programApplied')} />
              </div>
            </div>

            {/* 6. Financial Sponsors */}
            <div className={sectionClass}>
              <h3 className={sectionTitle}><span className="text-indigo-600 font-bold">6.</span> Financial Sponsor's Information</h3>
              {financialSponsors.map((s, i) => (
                <div key={i} className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3 p-3 bg-slate-50/70 rounded-xl border border-slate-100">
                  <input placeholder="Name *" required value={s.name} onChange={e => updateSponsor(i, 'name', e.target.value)} className={inputClass} />
                  <input placeholder="Relationship *" required value={s.relationship} onChange={e => updateSponsor(i, 'relationship', e.target.value)} className={inputClass} />
                  <input placeholder="Nationality *" required value={s.nationality} onChange={e => updateSponsor(i, 'nationality', e.target.value)} className={inputClass} />
                  <input placeholder="Employer" value={s.employer} onChange={e => updateSponsor(i, 'employer', e.target.value)} className={inputClass} />
                  <input placeholder="Occupation" value={s.occupation} onChange={e => updateSponsor(i, 'occupation', e.target.value)} className={inputClass} />
                  <input placeholder="Phone" value={s.phone} onChange={e => updateSponsor(i, 'phone', e.target.value)} className={inputClass} />
                  <input placeholder="Email" value={s.email} onChange={e => updateSponsor(i, 'email', e.target.value)} className={inputClass} />
                  <div className="md:col-span-2 flex justify-end">
                    {financialSponsors.length > 1 && (
                      <button type="button" onClick={() => removeSponsor(i)} className="text-red-500 text-sm flex items-center gap-1 hover:text-red-700 transition">
                        <Trash2 className="w-4 h-4" /> Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <button type="button" onClick={addSponsor} className="text-indigo-600 text-sm flex items-center gap-1.5 mt-2 font-medium hover:text-indigo-800 transition">
                <Plus className="w-4 h-4" /> Add Sponsor
              </button>
            </div>

            {/* 7. Education Background */}
            <div className={sectionClass}>
              <h3 className={sectionTitle}><span className="text-indigo-600 font-bold">7.</span> Education Background</h3>
              {educationHistory.map((edu, i) => (
                <div key={i} className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3 p-3 bg-slate-50/70 rounded-xl border border-slate-100">
                  <input placeholder="Degree *" required value={edu.degree} onChange={e => updateEducation(i, 'degree', e.target.value)} className={inputClass} />
                  <input placeholder="School Name *" required value={edu.schoolName} onChange={e => updateEducation(i, 'schoolName', e.target.value)} className={inputClass} />
                  <input placeholder="Year From" value={edu.yearFrom} onChange={e => updateEducation(i, 'yearFrom', e.target.value)} className={inputClass} />
                  <input placeholder="Year To" value={edu.yearTo} onChange={e => updateEducation(i, 'yearTo', e.target.value)} className={inputClass} />
                  <input placeholder="Contact Person" value={edu.contactPerson} onChange={e => updateEducation(i, 'contactPerson', e.target.value)} className={inputClass} />
                  <div className="flex justify-end items-center">
                    {educationHistory.length > 1 && (
                      <button type="button" onClick={() => removeEducation(i)} className="text-red-500 text-sm flex items-center gap-1 hover:text-red-700 transition">
                        <Trash2 className="w-4 h-4" /> Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <button type="button" onClick={addEducation} className="text-indigo-600 text-sm flex items-center gap-1.5 mt-2 font-medium hover:text-indigo-800 transition">
                <Plus className="w-4 h-4" /> Add Education
              </button>
            </div>

            {/* 8. Work Experience */}
            <div className={sectionClass}>
              <h3 className={sectionTitle}><span className="text-indigo-600 font-bold">8.</span> Work Experience</h3>
              {workExperience.map((w, i) => (
                <div key={i} className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3 p-3 bg-slate-50/70 rounded-xl border border-slate-100">
                  <input placeholder="Year From" value={w.yearFrom} onChange={e => updateWork(i, 'yearFrom', e.target.value)} className={inputClass} />
                  <input placeholder="Year To" value={w.yearTo} onChange={e => updateWork(i, 'yearTo', e.target.value)} className={inputClass} />
                  <input placeholder="Company" value={w.company} onChange={e => updateWork(i, 'company', e.target.value)} className={inputClass} />
                  <input placeholder="Occupation" value={w.occupation} onChange={e => updateWork(i, 'occupation', e.target.value)} className={inputClass} />
                  <input placeholder="Reference" value={w.reference} onChange={e => updateWork(i, 'reference', e.target.value)} className={inputClass} />
                  <input placeholder="Phone" value={w.phone} onChange={e => updateWork(i, 'phone', e.target.value)} className={inputClass} />
                  <input placeholder="Email" value={w.email} onChange={e => updateWork(i, 'email', e.target.value)} className={inputClass} />
                  <div className="md:col-span-2 flex justify-end">
                    {workExperience.length > 1 && (
                      <button type="button" onClick={() => removeWork(i)} className="text-red-500 text-sm flex items-center gap-1 hover:text-red-700 transition">
                        <Trash2 className="w-4 h-4" /> Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <button type="button" onClick={addWork} className="text-indigo-600 text-sm flex items-center gap-1.5 mt-2 font-medium hover:text-indigo-800 transition">
                <Plus className="w-4 h-4" /> Add Work Experience
              </button>
            </div>

            {/* 9. Family Members */}
            <div className={sectionClass}>
              <h3 className={sectionTitle}><span className="text-indigo-600 font-bold">9.</span> Family Members (at least 2)</h3>
              <p className="text-xs text-slate-500 mb-3">Parents information is required</p>
              {familyMembers.map((f, i) => (
                <div key={i} className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3 p-3 bg-slate-50/70 rounded-xl border border-slate-100">
                  <input placeholder="Name *" required value={f.name} onChange={e => updateFamily(i, 'name', e.target.value)} className={inputClass} />
                  <input placeholder="Relationship *" required value={f.relationship} onChange={e => updateFamily(i, 'relationship', e.target.value)} className={inputClass} />
                  <input placeholder="Nationality *" required value={f.nationality} onChange={e => updateFamily(i, 'nationality', e.target.value)} className={inputClass} />
                  <input placeholder="Employer" value={f.employer} onChange={e => updateFamily(i, 'employer', e.target.value)} className={inputClass} />
                  <input placeholder="Occupation" value={f.occupation} onChange={e => updateFamily(i, 'occupation', e.target.value)} className={inputClass} />
                  <input placeholder="Phone" value={f.phone} onChange={e => updateFamily(i, 'phone', e.target.value)} className={inputClass} />
                  <input placeholder="Email" value={f.email} onChange={e => updateFamily(i, 'email', e.target.value)} className={inputClass} />
                  <div className="md:col-span-2 flex justify-end">
                    {familyMembers.length > 1 && (
                      <button type="button" onClick={() => removeFamily(i)} className="text-red-500 text-sm flex items-center gap-1 hover:text-red-700 transition">
                        <Trash2 className="w-4 h-4" /> Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <button type="button" onClick={addFamily} className="text-indigo-600 text-sm flex items-center gap-1.5 mt-2 font-medium hover:text-indigo-800 transition">
                <Plus className="w-4 h-4" /> Add Family Member
              </button>
            </div>

            {/* Notes */}
            <div className={sectionClass}>
              <h3 className={sectionTitle}><span className="text-indigo-600 font-bold">10.</span> Additional Notes</h3>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className={inputClass} />
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            <div className="bg-indigo-50/70 rounded-2xl border border-indigo-100 p-5">
              <h4 className="text-sm font-bold text-indigo-900 mb-1">Tip</h4>
              <p className="text-xs text-indigo-700 leading-relaxed">All changes will be saved when you click Update Application. Documents and photo are managed separately.</p>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3 pt-5 border-t bg-white rounded-2xl shadow-sm border border-slate-200/60 p-5 sticky bottom-4 backdrop-blur-sm">
          <Link href={`/dashboard/students/${id}`} className="px-6 py-2.5 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 transition font-medium">
            Cancel
          </Link>
          <button type="submit" disabled={loading} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition disabled:opacity-50 flex items-center gap-2 font-medium shadow-sm">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            <Save className="w-4 h-4" />
            Update Application
          </button>
        </div>
      </form>
    </div>
  )
}
