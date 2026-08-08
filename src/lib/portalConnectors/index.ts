import { scanPortal as scanAt0086 } from './at0086'
import { scanPortal as scanIstudyedu } from './istudyedu'
import type { PortalStudentRecord } from './types'

export type { PortalStudentRecord }

export const SUPPORTED_PLATFORMS = ['AT0086', 'ISTUDYEDU'] as const
export type PortalPlatform = (typeof SUPPORTED_PLATFORMS)[number]

export async function scanPortal(
  platform: string,
  baseUrl: string,
  username: string,
  password: string
): Promise<PortalStudentRecord[]> {
  switch (platform) {
    case 'ISTUDYEDU':
      return scanIstudyedu(baseUrl, username, password)
    case 'AT0086':
    default:
      return scanAt0086(baseUrl, username, password)
  }
}
