import * as common from './common'
import * as nav from './nav'
import * as login from './login'
import * as dashboard from './dashboard'
import * as students from './students'
import * as studentFields from './studentFields'
import * as studentForm from './studentForm'
import * as messages from './messages'
import * as agentsPage from './agentsPage'
import * as settings from './settings'
import * as finance from './finance'

export type Language = 'en' | 'zh'

export const dictionaries = {
  en: {
    common: common.en,
    nav: nav.en,
    login: login.en,
    dashboard: dashboard.en,
    students: students.en,
    studentFields: studentFields.en,
    studentForm: studentForm.en,
    messages: messages.en,
    agentsPage: agentsPage.en,
    settings: settings.en,
    finance: finance.en,
  },
  zh: {
    common: common.zh,
    nav: nav.zh,
    login: login.zh,
    dashboard: dashboard.zh,
    students: students.zh,
    studentFields: studentFields.zh,
    studentForm: studentForm.zh,
    messages: messages.zh,
    agentsPage: agentsPage.zh,
    settings: settings.zh,
    finance: finance.zh,
  },
}
