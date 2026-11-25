import type { components, paths } from './openapi.js';

type Schemas = components['schemas'];

export type { components, paths };

export type ApiError = Schemas['Error'];
export type Role = Schemas['Role'];
export type SessionUser = Schemas['SessionUser'];
export type LoginRequest = Schemas['LoginRequest'];
export type Company = Schemas['Company'];
export type Branch = Schemas['Branch'];
export type Period = Schemas['Period'];
export type Counter = Schemas['Counter'];
export type DayMetrics = Schemas['DayMetrics'];
export type ReviewStats = Schemas['ReviewStats'];
export type AnalyticsSummary = Schemas['AnalyticsSummary'];
export type AnalyticsReport = Schemas['AnalyticsReport'];
export type ReviewStatus = Schemas['ReviewStatus'];
export type Review = Schemas['Review'];
export type ReviewPage = Schemas['ReviewPage'];
export type UpdateReviewStatusRequest = Schemas['UpdateReviewStatusRequest'];
