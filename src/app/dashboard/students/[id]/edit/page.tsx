'use client'


import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Save, ArrowLeft, Loader2, Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { useLanguage } from '@/src/lib/i18n/LanguageContext'

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
  const { t } = useLanguage()
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1.5">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
      <div className="flex gap-2">
        <input
          type="text"
          placeholder={t('studentForm.yearPlaceholder')}
          maxLength={4}
          value={year}
          onChange={e => onChange(e.target.value, month, day)}
          className="w-20 px-3 py-2 border border-border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm text-center bg-card"
        />
        <span className="self-center text-muted-foreground font-medium">/</span>
        <input
          type="text"
          placeholder={t('studentForm.monthPlaceholder')}
          maxLength={2}
          value={month}
          onChange={e => onChange(year, e.target.value, day)}
          className="w-14 px-3 py-2 border border-border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm text-center bg-card"
        />
        <span className="self-center text-muted-foreground font-medium">/</span>
        <input
          type="text"
          placeholder={t('studentForm.dayPlaceholder')}
          maxLength={2}
          value={day}
          onChange={e => onChange(year, month, e.target.value)}
          className="w-14 px-3 py-2 border border-border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm text-center bg-card"
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
  const { t } = useLanguage()
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
      .catch(() => toast.error(t('studentForm.failedLoadFieldRequirements')))

    if (!id) return

    fetch(`/api/students/${id}`)
      .then(r => {
        if (!r.ok) throw new Error(t('studentForm.failedLoadStudent'))
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
        toast.error(err.message || t('studentForm.failedLoadStudent'))
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
        toast.error(errData.error || t('studentForm.failedUpdateStudent'))
        setLoading(false)
        return
      }

      toast.success(t('studentForm.studentUpdatedSuccess'))
      router.push(`/dashboard/students/${id}`)
    } catch {
      toast.error(t('studentForm.somethingWentWrong'))
    } finally {
      setLoading(false)
    }
  }

  const inputClass = "w-full px-3.5 py-2.5 border border-border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm bg-card transition-all"
  const labelClass = "block text-sm font-medium text-foreground mb-1.5"
  const sectionClass = "bg-card rounded-2xl shadow-sm border border-border/60 p-6 backdrop-blur-sm"
  const sectionTitle = "text-lg font-bold text-foreground mb-5 pb-3 border-b border-border flex items-center gap-2"

  if (fetching) {
    return (
      <div className="max-w-6xl mx-auto flex flex-col items-center justify-center py-24">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
        <p className="text-muted-foreground text-sm">{t('studentForm.loadingStudentData')}</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href={`/dashboard/students/${id}`} className="text-muted-foreground hover:text-foreground transition p-2 hover:bg-muted rounded-xl">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">{t('studentForm.editStudentTitle')}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{t('studentForm.updateStudentInfoBelow')}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">

            {/* 1. Personal Information */}
            <div className={sectionClass}>
              <h3 className={sectionTitle}><span className="text-indigo-600 font-bold">1.</span> {t('studentFields.personalInformation')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>{reqLabel(t('studentFields.passportFamilyName'), 'passportFamilyName')}</label>
                  <input required={isRequired('passportFamilyName')} value={passportFamilyName} onChange={e => setPassportFamilyName(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>{reqLabel(t('studentFields.givenName'), 'givenName')}</label>
                  <input required={isRequired('givenName')} value={givenName} onChange={e => setGivenName(e.target.value)} className={inputClass} />
                </div>
                <div className="md:col-span-2">
                  <label className={labelClass}>{reqLabel(t('studentFields.fullName'), 'fullName')}</label>
                  <input required={isRequired('fullName')} value={fullName} onChange={e => setFullName(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>{reqLabel(t('studentFields.gender'), 'gender')}</label>
                  <select required={isRequired('gender')} value={gender} onChange={e => setGender(e.target.value)} className={inputClass}>
                    <option value="">{t('studentForm.selectPlaceholder')}</option>
                    <option value="Male">{t('studentForm.genderMale')}</option>
                    <option value="Female">{t('studentForm.genderFemale')}</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>{reqLabel(t('studentFields.maritalStatus'), 'maritalStatus')}</label>
                  <select required={isRequired('maritalStatus')} value={maritalStatus} onChange={e => setMaritalStatus(e.target.value)} className={inputClass}>
                    <option value="">{t('studentForm.selectPlaceholder')}</option>
                    <option value="Single">{t('studentForm.maritalSingle')}</option>
                    <option value="Married">{t('studentForm.maritalMarried')}</option>
                    <option value="Divorced">{t('studentForm.maritalDivorced')}</option>
                    <option value="Widowed">{t('studentForm.maritalWidowed')}</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>{t('studentFields.chineseName')}</label>
                  <input value={chineseName} onChange={e => setChineseName(e.target.value)} className={inputClass} placeholder={t('studentForm.ifAny')} />
                </div>
                <div>
                  <label className={labelClass}>{reqLabel(t('studentFields.religion'), 'religion')}</label>
                  <input required={isRequired('religion')} value={religion} onChange={e => setReligion(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>{reqLabel(t('studentFields.occupation'), 'occupation')}</label>
                  <input required={isRequired('occupation')} value={occupation} onChange={e => setOccupation(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>{t('studentFields.employerInstitution')}</label>
                  <input value={employerInstitution} onChange={e => setEmployerInstitution(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>{reqLabel(t('studentFields.nationality'), 'nationality')}</label>
                  <input required={isRequired('nationality')} value={nationality} onChange={e => setNationality(e.target.value)} className={inputClass} />
                </div>
                <YearMonthDayInput
                  label={reqLabel(t('studentFields.dateOfBirth'), 'dateOfBirth')}
                  required={isRequired('dateOfBirth')}
                  year={dateOfBirthYMD.year}
                  month={dateOfBirthYMD.month}
                  day={dateOfBirthYMD.day}
                  onChange={(y, m, d) => setDateOfBirthYMD({ year: y, month: m, day: d })}
                />
                <div>
                  <label className={labelClass}>{reqLabel(t('studentFields.countryOfBirth'), 'countryOfBirth')}</label>
                  <input required={isRequired('countryOfBirth')} value={countryOfBirth} onChange={e => setCountryOfBirth(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>{reqLabel(t('studentFields.placeOfBirth'), 'placeOfBirth')}</label>
                  <input required={isRequired('placeOfBirth')} value={placeOfBirth} onChange={e => setPlaceOfBirth(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>{t('studentFields.yearsInHomeCountry')}</label>
                  <input value={yearsInHomeCountry} onChange={e => setYearsInHomeCountry(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>{t('studentFields.wechat')}</label>
                  <input value={wechat} onChange={e => setWechat(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>{reqLabel(t('studentFields.chineseDescent'), 'chineseDescent')}</label>
                  <select required={isRequired('chineseDescent')} value={chineseDescent} onChange={e => setChineseDescent(e.target.value)} className={inputClass}>
                    <option value="No">{t('common.no')}</option>
                    <option value="Yes">{t('common.yes')}</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>{reqLabel(t('studentFields.currentlyInChina'), 'currentlyInChina')}</label>
                  <select required={isRequired('currentlyInChina')} value={currentlyInChina} onChange={e => setCurrentlyInChina(e.target.value)} className={inputClass}>
                    <option value="No">{t('common.no')}</option>
                    <option value="Yes">{t('common.yes')}</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 2. Correspondence Address */}
            <div className={sectionClass}>
              <h3 className={sectionTitle}><span className="text-indigo-600 font-bold">2.</span> {t('studentFields.correspondenceAddress')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className={labelClass}>{t('studentFields.homeAddress')}</label>
                  <input value={homeAddress} onChange={e => setHomeAddress(e.target.value)} className={inputClass} />
                </div>
                <div className="md:col-span-2">
                  <label className={labelClass}>{reqLabel(t('studentFields.detailedAddress'), 'detailedAddress')}</label>
                  <input required={isRequired('detailedAddress')} value={detailedAddress} onChange={e => setDetailedAddress(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>{reqLabel(t('studentFields.cityProvince'), 'cityProvince')}</label>
                  <input required={isRequired('cityProvince')} value={cityProvince} onChange={e => setCityProvince(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>{reqLabel(t('studentFields.country'), 'country')}</label>
                  <input required={isRequired('country')} value={country} onChange={e => setCountry(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>{reqLabel(t('studentFields.zipcode'), 'zipcode')}</label>
                  <input required={isRequired('zipcode')} value={zipcode} onChange={e => setZipcode(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>{reqLabel(t('studentFields.phoneMobile'), 'phoneMobile')}</label>
                  <input required={isRequired('phoneMobile')} value={phoneMobile} onChange={e => setPhoneMobile(e.target.value)} className={inputClass} />
                </div>
                <div className="md:col-span-2">
                  <label className={labelClass}>{reqLabel(t('studentFields.mainEmail'), 'mainEmail')}</label>
                  <input type="email" required={isRequired('mainEmail')} value={mainEmail} onChange={e => setMainEmail(e.target.value)} className={inputClass} />
                </div>
              </div>
            </div>

            {/* 3. Passport & Visa */}
            <div className={sectionClass}>
              <h3 className={sectionTitle}><span className="text-indigo-600 font-bold">3.</span> {t('studentFields.passportVisaSection')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>{reqLabel(t('studentFields.passportNo'), 'passportNo')}</label>
                  <input required={isRequired('passportNo')} value={passportNo} onChange={e => setPassportNo(e.target.value)} className={inputClass} />
                </div>
                <YearMonthDayInput
                  label={reqLabel(t('studentFields.passportExpiryDate'), 'passportExpiryDate')}
                  required={isRequired('passportExpiryDate')}
                  year={passportExpiryYMD.year}
                  month={passportExpiryYMD.month}
                  day={passportExpiryYMD.day}
                  onChange={(y, m, d) => setPassportExpiryYMD({ year: y, month: m, day: d })}
                />
                <div>
                  <label className={labelClass}>{t('studentFields.oldPassportNo')}</label>
                  <input value={oldPassportNo} onChange={e => setOldPassportNo(e.target.value)} className={inputClass} />
                </div>
                <YearMonthDayInput
                  label={t('studentFields.oldPassportExpiry')}
                  year={oldPassportExpiryYMD.year}
                  month={oldPassportExpiryYMD.month}
                  day={oldPassportExpiryYMD.day}
                  onChange={(y, m, d) => setOldPassportExpiryYMD({ year: y, month: m, day: d })}
                />
              </div>
            </div>

            {/* 4. Learning Experience in China */}
            <div className={sectionClass}>
              <h3 className={sectionTitle}><span className="text-indigo-600 font-bold">4.</span> {t('studentFields.learningExperienceChina')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>{reqLabel(t('studentFields.studiedInChina'), 'studiedInChina')}</label>
                  <select required={isRequired('studiedInChina')} value={studiedInChina} onChange={e => setStudiedInChina(e.target.value)} className={inputClass}>
                    <option value="No">{t('common.no')}</option>
                    <option value="Yes">{t('common.yes')}</option>
                  </select>
                </div>
                {studiedInChina === 'Yes' && (
                  <>
                    <div>
                      <label className={labelClass}>{t('studentFields.visaType')}</label>
                      <input value={visaType} onChange={e => setVisaType(e.target.value)} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>{t('studentFields.chinaInstitution')}</label>
                      <input value={chinaInstitution} onChange={e => setChinaInstitution(e.target.value)} className={inputClass} />
                    </div>
                    <YearMonthDayInput
                      label={t('studentFields.visaExpiryDate')}
                      year={visaExpiryYMD.year}
                      month={visaExpiryYMD.month}
                      day={visaExpiryYMD.day}
                      onChange={(y, m, d) => setVisaExpiryYMD({ year: y, month: m, day: d })}
                    />
                    <YearMonthDayInput
                      label={t('studentFields.studyInChinaFrom')}
                      year={studyInChinaFromYMD.year}
                      month={studyInChinaFromYMD.month}
                      day={studyInChinaFromYMD.day}
                      onChange={(y, m, d) => setStudyInChinaFromYMD({ year: y, month: m, day: d })}
                    />
                    <YearMonthDayInput
                      label={t('studentFields.studyInChinaTo')}
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
              <h3 className={sectionTitle}><span className="text-indigo-600 font-bold">5.</span> {t('studentFields.programAppliedSection')}</h3>
              <div>
                <label className={labelClass}>{reqLabel(t('studentFields.programApplied'), 'programApplied')}</label>
                <input value={programApplied} onChange={e => setProgramApplied(e.target.value)} className={inputClass} required={isRequired('programApplied')} />
              </div>
            </div>

            {/* 6. Financial Sponsors */}
            <div className={sectionClass}>
              <h3 className={sectionTitle}><span className="text-indigo-600 font-bold">6.</span> {t('studentFields.financialSponsors')}</h3>
              {financialSponsors.map((s, i) => (
                <div key={i} className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3 p-3 bg-muted/70 rounded-xl border border-border">
                  <input placeholder={`${t('studentFields.name')} *`} required value={s.name} onChange={e => updateSponsor(i, 'name', e.target.value)} className={inputClass} />
                  <input placeholder={`${t('studentFields.relationship')} *`} required value={s.relationship} onChange={e => updateSponsor(i, 'relationship', e.target.value)} className={inputClass} />
                  <input placeholder={`${t('studentFields.nationality')} *`} required value={s.nationality} onChange={e => updateSponsor(i, 'nationality', e.target.value)} className={inputClass} />
                  <input placeholder={t('studentFields.employer')} value={s.employer} onChange={e => updateSponsor(i, 'employer', e.target.value)} className={inputClass} />
                  <input placeholder={t('studentFields.occupation')} value={s.occupation} onChange={e => updateSponsor(i, 'occupation', e.target.value)} className={inputClass} />
                  <input placeholder={t('studentFields.phone')} value={s.phone} onChange={e => updateSponsor(i, 'phone', e.target.value)} className={inputClass} />
                  <input placeholder={t('studentFields.email')} value={s.email} onChange={e => updateSponsor(i, 'email', e.target.value)} className={inputClass} />
                  <div className="md:col-span-2 flex justify-end">
                    {financialSponsors.length > 1 && (
                      <button type="button" onClick={() => removeSponsor(i)} className="text-red-500 text-sm flex items-center gap-1 hover:text-red-700 transition">
                        <Trash2 className="w-4 h-4" /> {t('studentForm.remove')}
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <button type="button" onClick={addSponsor} className="text-indigo-600 text-sm flex items-center gap-1.5 mt-2 font-medium hover:text-indigo-800 transition">
                <Plus className="w-4 h-4" /> {t('studentForm.addSponsor')}
              </button>
            </div>

            {/* 7. Education Background */}
            <div className={sectionClass}>
              <h3 className={sectionTitle}><span className="text-indigo-600 font-bold">7.</span> {t('studentFields.educationHistory')}</h3>
              {educationHistory.map((edu, i) => (
                <div key={i} className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3 p-3 bg-muted/70 rounded-xl border border-border">
                  <input placeholder={`${t('studentFields.degree')} *`} required value={edu.degree} onChange={e => updateEducation(i, 'degree', e.target.value)} className={inputClass} />
                  <input placeholder={`${t('studentFields.schoolName')} *`} required value={edu.schoolName} onChange={e => updateEducation(i, 'schoolName', e.target.value)} className={inputClass} />
                  <input placeholder={t('studentFields.yearFrom')} value={edu.yearFrom} onChange={e => updateEducation(i, 'yearFrom', e.target.value)} className={inputClass} />
                  <input placeholder={t('studentFields.yearTo')} value={edu.yearTo} onChange={e => updateEducation(i, 'yearTo', e.target.value)} className={inputClass} />
                  <input placeholder={t('studentFields.contactPerson')} value={edu.contactPerson} onChange={e => updateEducation(i, 'contactPerson', e.target.value)} className={inputClass} />
                  <div className="flex justify-end items-center">
                    {educationHistory.length > 1 && (
                      <button type="button" onClick={() => removeEducation(i)} className="text-red-500 text-sm flex items-center gap-1 hover:text-red-700 transition">
                        <Trash2 className="w-4 h-4" /> {t('studentForm.remove')}
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <button type="button" onClick={addEducation} className="text-indigo-600 text-sm flex items-center gap-1.5 mt-2 font-medium hover:text-indigo-800 transition">
                <Plus className="w-4 h-4" /> {t('studentForm.addEducation')}
              </button>
            </div>

            {/* 8. Work Experience */}
            <div className={sectionClass}>
              <h3 className={sectionTitle}><span className="text-indigo-600 font-bold">8.</span> {t('studentFields.workExperience')}</h3>
              {workExperience.map((w, i) => (
                <div key={i} className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3 p-3 bg-muted/70 rounded-xl border border-border">
                  <input placeholder={t('studentFields.yearFrom')} value={w.yearFrom} onChange={e => updateWork(i, 'yearFrom', e.target.value)} className={inputClass} />
                  <input placeholder={t('studentFields.yearTo')} value={w.yearTo} onChange={e => updateWork(i, 'yearTo', e.target.value)} className={inputClass} />
                  <input placeholder={t('studentFields.company')} value={w.company} onChange={e => updateWork(i, 'company', e.target.value)} className={inputClass} />
                  <input placeholder={t('studentFields.occupation')} value={w.occupation} onChange={e => updateWork(i, 'occupation', e.target.value)} className={inputClass} />
                  <input placeholder={t('studentFields.reference')} value={w.reference} onChange={e => updateWork(i, 'reference', e.target.value)} className={inputClass} />
                  <input placeholder={t('studentFields.phone')} value={w.phone} onChange={e => updateWork(i, 'phone', e.target.value)} className={inputClass} />
                  <input placeholder={t('studentFields.email')} value={w.email} onChange={e => updateWork(i, 'email', e.target.value)} className={inputClass} />
                  <div className="md:col-span-2 flex justify-end">
                    {workExperience.length > 1 && (
                      <button type="button" onClick={() => removeWork(i)} className="text-red-500 text-sm flex items-center gap-1 hover:text-red-700 transition">
                        <Trash2 className="w-4 h-4" /> {t('studentForm.remove')}
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <button type="button" onClick={addWork} className="text-indigo-600 text-sm flex items-center gap-1.5 mt-2 font-medium hover:text-indigo-800 transition">
                <Plus className="w-4 h-4" /> {t('studentForm.addWorkExperience')}
              </button>
            </div>

            {/* 9. Family Members */}
            <div className={sectionClass}>
              <h3 className={sectionTitle}><span className="text-indigo-600 font-bold">9.</span> {t('studentFields.familyMembers')} {t('studentForm.atLeastTwo')}</h3>
              <p className="text-xs text-muted-foreground mb-3">{t('studentForm.parentsInfoRequired')}</p>
              {familyMembers.map((f, i) => (
                <div key={i} className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3 p-3 bg-muted/70 rounded-xl border border-border">
                  <input placeholder={`${t('studentFields.name')} *`} required value={f.name} onChange={e => updateFamily(i, 'name', e.target.value)} className={inputClass} />
                  <input placeholder={`${t('studentFields.relationship')} *`} required value={f.relationship} onChange={e => updateFamily(i, 'relationship', e.target.value)} className={inputClass} />
                  <input placeholder={`${t('studentFields.nationality')} *`} required value={f.nationality} onChange={e => updateFamily(i, 'nationality', e.target.value)} className={inputClass} />
                  <input placeholder={t('studentFields.employer')} value={f.employer} onChange={e => updateFamily(i, 'employer', e.target.value)} className={inputClass} />
                  <input placeholder={t('studentFields.occupation')} value={f.occupation} onChange={e => updateFamily(i, 'occupation', e.target.value)} className={inputClass} />
                  <input placeholder={t('studentFields.phone')} value={f.phone} onChange={e => updateFamily(i, 'phone', e.target.value)} className={inputClass} />
                  <input placeholder={t('studentFields.email')} value={f.email} onChange={e => updateFamily(i, 'email', e.target.value)} className={inputClass} />
                  <div className="md:col-span-2 flex justify-end">
                    {familyMembers.length > 1 && (
                      <button type="button" onClick={() => removeFamily(i)} className="text-red-500 text-sm flex items-center gap-1 hover:text-red-700 transition">
                        <Trash2 className="w-4 h-4" /> {t('studentForm.remove')}
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <button type="button" onClick={addFamily} className="text-indigo-600 text-sm flex items-center gap-1.5 mt-2 font-medium hover:text-indigo-800 transition">
                <Plus className="w-4 h-4" /> {t('studentForm.addFamilyMember')}
              </button>
            </div>

            {/* Notes */}
            <div className={sectionClass}>
              <h3 className={sectionTitle}><span className="text-indigo-600 font-bold">10.</span> {t('studentFields.additionalNotes')}</h3>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className={inputClass} />
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            <div className="bg-indigo-50/70 rounded-2xl border border-indigo-100 p-5">
              <h4 className="text-sm font-bold text-indigo-900 mb-1">{t('studentForm.tip')}</h4>
              <p className="text-xs text-indigo-700 leading-relaxed">{t('studentForm.tipUpdateApplication')}</p>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3 pt-5 border-t bg-card rounded-2xl shadow-sm border border-border/60 p-5 sticky bottom-4 backdrop-blur-sm">
          <Link href={`/dashboard/students/${id}`} className="px-6 py-2.5 border border-border rounded-xl text-foreground hover:bg-muted transition font-medium">
            {t('common.cancel')}
          </Link>
          <button type="submit" disabled={loading} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition disabled:opacity-50 flex items-center gap-2 font-medium shadow-sm">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            <Save className="w-4 h-4" />
            {t('studentForm.updateApplication')}
          </button>
        </div>
      </form>
    </div>
  )
}