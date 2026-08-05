// Filled in by cavecrew agent instrumenting students/new and students/[id]/edit pages.
export const en = {
  addStudentTitle: 'Add Student',
  editStudentTitle: 'Edit Student',

  // Page headers
  applicationFormTitle: 'Student Application Form',
  completeAllSections: 'Complete all required sections below',
  downloadTemplate: 'Download Template',
  importFromExcel: 'Import from Excel',
  importSuccess: 'Student created from Excel file',
  importFailed: 'Failed to import Excel file',
  importBulkSuccess: '{count} students created from Excel file',
  importPartialFailed: '{count} rows failed to import:',
  importRowLabel: 'Row {row}',
  updateStudentInfoBelow: 'Update the student information below',
  loadingStudentData: 'Loading student data...',

  // Select placeholders / option labels (values kept in English for data storage)
  selectPlaceholder: 'Select',
  genderMale: 'Male',
  genderFemale: 'Female',
  maritalSingle: 'Single',
  maritalMarried: 'Married',
  maritalDivorced: 'Divorced',
  maritalWidowed: 'Widowed',

  // Misc field helpers
  ifAny: 'If any',
  yearPlaceholder: 'YYYY',
  monthPlaceholder: 'MM',
  dayPlaceholder: 'DD',
  photoPreviewAlt: 'Preview',

  // Repeatable section controls
  remove: 'Remove',
  addSponsor: 'Add Sponsor',
  addEducation: 'Add Education',
  addWorkExperience: 'Add Work Experience',
  addFamilyMember: 'Add Family Member',
  atLeastTwo: '(at least 2)',
  parentsInfoRequired: 'Parents information is required',

  // Photo / documents sidebar (new-student page)
  passportPhotoTitle: 'Passport Photo',
  uploadPhotoButton: 'Upload Photo',
  photoRequirements: '2-inch, white background, under 200KB',
  requiredDocumentsTitle: 'Required Documents',
  maxSizeLabel: 'Max:',

  // Tip boxes
  tip: 'Tip',
  tipSaveApplication: 'All information and documents will be saved together when you click Save Application.',
  tipUpdateApplication: 'All changes will be saved when you click Update Application. Documents and photo are managed separately.',

  // Submit buttons
  saveApplication: 'Save Application',
  updateApplication: 'Update Application',

  // Toast / status messages
  failedLoadDocCategories: 'Failed to load document categories',
  failedLoadFieldRequirements: 'Failed to load field requirements',
  failedCreateStudent: 'Failed to create student',
  studentCreatedWithDocs: 'Student created with {count} document(s) uploaded',
  somethingWentWrong: 'Something went wrong',
  failedLoadStudent: 'Failed to load student',
  failedUpdateStudent: 'Failed to update student',
  studentUpdatedSuccess: 'Student updated successfully',
}

export const zh = {
  addStudentTitle: '添加学生',
  editStudentTitle: '编辑学生',

  applicationFormTitle: '学生申请表',
  completeAllSections: '请完整填写以下所有必填信息',
  downloadTemplate: '下载模板',
  importFromExcel: '从 Excel 导入',
  importSuccess: '已通过 Excel 文件创建学生',
  importFailed: '导入 Excel 文件失败',
  importBulkSuccess: '已从 Excel 文件创建 {count} 名学生',
  importPartialFailed: '{count} 行导入失败：',
  importRowLabel: '第 {row} 行',
  updateStudentInfoBelow: '请在下方更新学生信息',
  loadingStudentData: '正在加载学生信息...',

  selectPlaceholder: '请选择',
  genderMale: '男',
  genderFemale: '女',
  maritalSingle: '未婚',
  maritalMarried: '已婚',
  maritalDivorced: '离异',
  maritalWidowed: '丧偶',

  ifAny: '如有',
  yearPlaceholder: '年',
  monthPlaceholder: '月',
  dayPlaceholder: '日',
  photoPreviewAlt: '预览',

  remove: '移除',
  addSponsor: '添加担保人',
  addEducation: '添加教育经历',
  addWorkExperience: '添加工作经历',
  addFamilyMember: '添加家庭成员',
  atLeastTwo: '（至少两位）',
  parentsInfoRequired: '需填写父母信息',

  passportPhotoTitle: '证件照片',
  uploadPhotoButton: '上传照片',
  photoRequirements: '2寸白底证件照，文件小于200KB',
  requiredDocumentsTitle: '所需材料',
  maxSizeLabel: '最大：',

  tip: '提示',
  tipSaveApplication: '点击"提交申请"后，所有信息和文件将一并保存。',
  tipUpdateApplication: '点击"保存修改"后，所有更改将被保存。证件照及申请材料请前往其他页面单独管理。',

  saveApplication: '提交申请',
  updateApplication: '保存修改',

  failedLoadDocCategories: '文件类别加载失败',
  failedLoadFieldRequirements: '字段要求加载失败',
  failedCreateStudent: '学生创建失败',
  studentCreatedWithDocs: '学生创建成功，已上传 {count} 份文件',
  somethingWentWrong: '出错了，请稍后重试',
  failedLoadStudent: '学生信息加载失败',
  failedUpdateStudent: '学生信息更新失败',
  studentUpdatedSuccess: '学生信息更新成功',
}
