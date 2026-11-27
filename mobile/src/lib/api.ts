import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// The live Houzeey API. Override with EXPO_PUBLIC_API_URL for local testing.
export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://handsome-upliftment-production.up.railway.app';

const TOKEN_KEY = 'houzeey_token';

// SecureStore keeps the login token in the iPhone Keychain / Android Keystore.
// (The web preview has no SecureStore, so it falls back to localStorage.)
export async function getToken(): Promise<string | null> {
  if (Platform.OS === 'web') return globalThis.localStorage?.getItem(TOKEN_KEY) ?? null;
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string | null) {
  if (Platform.OS === 'web') {
    if (token) globalThis.localStorage?.setItem(TOKEN_KEY, token);
    else globalThis.localStorage?.removeItem(TOKEN_KEY);
    return;
  }
  if (token) await SecureStore.setItemAsync(TOKEN_KEY, token);
  else await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = { Accept: 'application/json' };
  let body: BodyInit | undefined;
  if (options.body instanceof FormData) {
    body = options.body;
  } else if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.body);
  }
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(API_URL + path, { method: options.method || 'GET', headers, body });
  } catch {
    throw new ApiError('No internet connection. Please try again.', 0);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error || `Something went wrong (${res.status})`, res.status);
  return data as T;
}

const get = <T>(path: string) => request<T>(path);
const post = <T>(path: string, body: unknown = {}) => request<T>(path, { method: 'POST', body });
const del = <T>(path: string, body?: unknown) => request<T>(path, { method: 'DELETE', body });

// ---- Types (match the API responses) ----
export type User = {
  id: string;
  name: string;
  email: string;
  role: 'buyer' | 'seller';
  verified: boolean;
  is_admin: boolean;
  avatar_url: string | null;
  phone?: string | null;
  created_at?: string;
};

export type Listing = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  address: string | null;
  suburb: string | null;
  state: string | null;
  postcode: string | null;
  property_type: string | null;
  price: string | null;
  price_max: string | null;
  price_display: 'exact' | 'range' | 'contact' | null;
  beds: number | null;
  baths: number | null;
  cars: number | null;
  land_size: number | null;
  status: string;
  features: string[];
  created_at: string;
  seller_name: string;
  seller_verified?: boolean;
  primary_image?: string | null;
  video: { url: string; thumbnailUrl: string | null } | null;
};

export type Post = Listing & {
  images: string[];
  like_count: number;
  liked: boolean;
  saved: boolean;
  comment_count: number;
  recent_comments: { id: string; body: string; name: string; created_at: string }[];
};

export type ListingDetail = Listing & {
  images: { id: string; url: string }[];
  seller_since?: string;
};

export type Comment = { id: string; body: string; name: string; created_at: string };

export type MyListing = Listing & {
  solicitor_review_status: 'pending' | 'approved' | 'rejected' | 'superseded' | null;
  enquiries: string | number;
};

export type IdentityCheck = { status: 'pending' | 'approved' | 'rejected'; notes?: string | null };

export const api = {
  auth: {
    login: (email: string, password: string) => post<{ token: string; user: User }>('/api/auth/login', { email, password }),
    register: (data: { name: string; email: string; password: string; role: 'buyer' | 'seller' }) =>
      post<{ token: string; user: User }>('/api/auth/register', data),
    me: () => get<User>('/api/auth/me'),
    forgotPassword: (email: string) => post<{ message?: string }>('/api/auth/forgot-password', { email }),
    deleteAccount: (password: string) => del<{ success: boolean }>('/api/auth/account', { password }),
  },
  feed: (params: { q?: string; filter?: 'all' | 'video'; limit?: number; offset?: number }) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '') qs.set(k, String(v));
    });
    return get<{ posts: Post[]; hasMore: boolean }>(`/api/social/feed?${qs}`);
  },
  listing: (id: string) => get<ListingDetail>(`/api/listings/${id}`),
  like: (id: string) => post(`/api/social/listings/${id}/like`),
  unlike: (id: string) => del(`/api/social/listings/${id}/like`),
  comments: (id: string) => get<Comment[]>(`/api/social/listings/${id}/comments`),
  comment: (id: string, body: string) => post<Comment>(`/api/social/listings/${id}/comments`, { body }),
  saved: {
    list: () => get<Listing[]>('/api/saved'),
    save: (id: string) => post(`/api/saved/${id}`),
    unsave: (id: string) => del(`/api/saved/${id}`),
  },
  sell: {
    create: (form: FormData) => post<{ id: string }>('/api/listings', form),
    mine: () => get<MyListing[]>('/api/listings/my'),
    videoUploadUrl: (listingId: string, contentType: string, fileSize: number) =>
      post<{ videoId: string; uploadUrl: string; headers: Record<string, string> }>(
        `/api/videos/listings/${listingId}/upload-url`, { contentType, fileSize }),
    videoComplete: (videoId: string) => post(`/api/videos/${videoId}/complete`),
  },
  identity: {
    me: () => get<IdentityCheck | null>('/api/identity/me'),
    submit: (form: FormData) => post('/api/identity', form),
  },
  startConversation: (listingId: string, recipientId: string, message: string) =>
    post<{ conversation_id: string }>('/api/conversations', { listing_id: listingId, recipient_id: recipientId, message }),
};
