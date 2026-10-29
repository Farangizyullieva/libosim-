export type UserRole = 'user' | 'admin';

export interface AuthUser {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  role: UserRole;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
}

export type DonationCondition = 'NEW' | 'LIKE_NEW' | 'GOOD' | 'USED';
export type DonationGender = 'MEN' | 'WOMEN' | 'UNISEX' | 'KIDS';
export type DonationAgeGroup = 'ADULT' | 'TEEN' | 'CHILD' | 'INFANT';
export type DonationStatus =
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'AVAILABLE'
  | 'REQUESTED'
  | 'RESERVED'
  | 'COLLECTED'
  | 'COMPLETED'
  | 'REJECTED'
  | 'CANCELLED';

export interface Donation {
  id: string;
  donorId: string;
  donor?: { id: string; fullName: string; phone?: string };
  title: string;
  description: string;
  categoryId: string;
  category?: Category;
  size: string | null;
  condition: DonationCondition;
  gender: DonationGender;
  ageGroup: DonationAgeGroup;
  quantity: number;
  images: string[];
  location: string | null;
  status: DonationStatus;
  rejectionReason: string | null;
  autoFlagged: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export type NotificationType =
  | 'DONATION_SUBMITTED'
  | 'DONATION_APPROVED'
  | 'DONATION_REJECTED'
  | 'DONATION_REQUESTED'
  | 'REQUEST_APPROVED'
  | 'REQUEST_REJECTED'
  | 'DONATION_COMPLETED';

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface ApiEnvelope<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
  // Present only outside production, when the backend hit an unexpected
  // (non-validation) error — shows the real error name/message so it can be
  // diagnosed straight from the UI, without needing the server terminal.
  debug?: { name: string; detail: string };
}
