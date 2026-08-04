
import { Languages } from 'lucide-react'
import { useLanguage } from '@/src/lib/i18n/LanguageContext'

export function LanguageToggle({ className = '' }: { className?: string }) {
  const { lang, toggleLang } = useLanguage()

  return (
    <button
      type="button"
      onClick={toggleLang}
      title={lang === 'en' ? 'Switch to Chinese' : 'Switch to English'}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors ${className}`}
    >
      <Languages className="w-3.5 h-3.5" />
      {lang === 'en' ? 'EN' : '中文'}
    </button>
  )
}
