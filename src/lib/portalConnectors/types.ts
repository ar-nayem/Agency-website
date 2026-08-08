export interface PortalStudentRecord {
  externalId: string
  passportNo: string | null
  passportName: string | null
  program: string | null
  applyStatus: string | null
  admitStatus: string | null
  appliedAt: string | null
  raw: any
}

export interface PortalConnector {
  scanPortal(baseUrl: string, username: string, password: string): Promise<PortalStudentRecord[]>
}
