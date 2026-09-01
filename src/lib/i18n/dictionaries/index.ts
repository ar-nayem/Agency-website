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
import * as portals from './portals'
import * as analytics from './analytics'
import * as platform from './platform'
import * as tasks from './tasks'
import * as intake from './intake'
import * as universities from './universities'
import * as campaigns from './campaigns'

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
    portals: portals.en,
    analytics: analytics.en,
    platform: platform.en,
    tasks: tasks.en,
    intake: intake.en,
    universities: universities.en,
    campaigns: campaigns.en,
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
    portals: portals.zh,
    analytics: analytics.zh,
    platform: platform.zh,
    tasks: tasks.zh,
    intake: intake.zh,
    universities: universities.zh,
    campaigns: campaigns.zh,
  },
}
