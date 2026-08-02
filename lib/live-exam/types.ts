export interface MarksRequest {
  national_id: string;
}

export interface CodeSelectionRequest {
  national_id: string;
  selected_code: string;
}

export interface SimpleCodeRequest {
  registration_code: string;
}

export interface ExamResultDetails {
  registrationCode: string;
  status: string;
  examType: string;
  examTypeRaw: string;
  isPractical: boolean;
  isTheory: boolean;
  licenseCategory: string;
  examDate: string;
  testCenter: string;
  marksObtained: number;
  totalMarks: number;
  passMark: number;
  passed: boolean;
  grade: string;
  candidateName: string;
  nationalId: string;
}

export interface CheckMarksResponse {
  status: "success" | "error";
  code?: string;
  message?: string;
  candidateName?: string;
  nationalId?: string;
  practical_codes?: string[];
  theory_codes?: string[];
  results?: Record<string, ExamResultDetails>;
}

export interface SelectCodeResponse {
  status: "success" | "error";
  result?: ExamResultDetails;
  message?: string;
}

export interface FetchMarksResponse {
  error?: string;
  [key: string]: unknown;
}

export interface AllowedCategory {
  category: string;
  description: string;
}

export interface LicenseInfo {
  licenseNumber: string;
  status: string;
  vehicleClass: string;
  expiryDate: string;
  placeOfIssue: string;
}

export interface DocumentInfo {
  documentNumber: string;
  names: string;
  dateOfBirth: string;
  placeOfBirth: string;
  civilStatus: string;
  nationality: string;
  sex: string;
  fatherNames: string;
  motherNames: string;
  province: string;
  district: string;
  sector: string;
  cell: string;
  village: string;
  dateOfIssue: string;
  dateOfExpiry: string;
  placeOfIssue: string;
  signature: string;
  photo: string;
}

export interface DLInfoResponse {
  status: boolean;
  data: {
    resultCode: string;
    message: string | null;
    license: LicenseInfo;
    document: DocumentInfo;
    tariff: unknown;
    categoriesAllowed: AllowedCategory[];
  };
  responseCode: string;
  message: string;
  responseEncrypted: boolean;
  traceId: string;
}

export interface DLInfoAPIResponse {
  status: "success" | "error";
  message?: string;
  license?: LicenseInfo;
  document?: DocumentInfo;
  categoriesAllowed?: AllowedCategory[];
  categoryCount?: number;
}
