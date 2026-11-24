export interface Scope {
  companyId: number | null;
  branchId: number | null;
}

export interface ScopeRequest {
  companyId?: number;
  branchId?: number;
}
