export const API_BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL) ||
  'http://localhost:3000/api';

export interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: 'user' | 'admin';
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  expiresAt: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  price: number;
  isActive: boolean;
  imageUrl?: string | null;
  categories?: Array<{ id: string; name: string }>;
}

export interface Category {
  id: string;
  parentId: string | null;
  name: string;
  productCount: number;
}

export interface ListResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface CartItem {
  id: string;
  productId: string;
  sku: string;
  name: string;
  price: number;
  quantity: number;
  lineTotal: number;
  imageUrl?: string | null;
  createdAt: string;
}

export interface Cart {
  items: CartItem[];
  total: number;
  itemsCount: number;
}

export interface OrderItemInput {
  productId: string;
  quantity: number;
}

export interface Order {
  id: string;
  userId: string;
  deliveryAddressId: string;
  status: 'pending' | 'paid' | 'processing' | 'shipped' | 'completed' | 'cancelled';
  total: number;
  itemsCount?: number;
  createdAt?: string;
  deliveryAddress?: {
    id: string;
    country: string;
    city: string;
    street: string;
    house: string;
    apartment: string | null;
  };
  items: Array<{
    id?: string;
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
}

export interface ApiErrorDetail {
  field?: string;
  code?: string;
  message?: string;
  [key: string]: unknown;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: ApiErrorDetail[] | Record<string, unknown>;
  };
}

export class ShopApiClientError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ShopApiClientError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    headers: { 'content-type': 'application/json', ...init.headers },
    ...init,
  });

  if (!response.ok) {
    let body: ApiErrorResponse | null = null;
    try {
      body = (await response.json()) as ApiErrorResponse;
    } catch {
      // ответ не в формате json
    }
    const message = body?.error?.message ?? `HTTP ${response.status}`;
    const code = body?.error?.code ?? 'UNKNOWN_ERROR';
    throw new ShopApiClientError(response.status, code, message, body?.error?.details);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const api = {
  auth: {
    register(input: { email: string; password: string; firstName?: string; lastName?: string }) {
      return request<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify(input) });
    },
    login(input: { email: string; password: string }) {
      return request<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(input) });
    },
    logout() {
      return request<{ message: string }>('/auth/logout', { method: 'POST' });
    },
    me() {
      return request<{ user: User }>('/auth/me');
    },
  },

  cart: {
    get(userId?: string) {
      const suffix = userId ? `?userId=${encodeURIComponent(userId)}` : '';
      return request<Cart>(`/cart${suffix}`);
    },
    addItem(productId: string, quantity = 1, userId?: string) {
      const suffix = userId ? `?userId=${encodeURIComponent(userId)}` : '';
      return request<Cart>(`/cart/items${suffix}`, {
        method: 'POST',
        body: JSON.stringify({ productId, quantity }),
      });
    },
    updateQuantity(productId: string, quantity: number, userId?: string) {
      const suffix = userId ? `?userId=${encodeURIComponent(userId)}` : '';
      return request<Cart>(`/cart/items/${productId}${suffix}`, {
        method: 'PATCH',
        body: JSON.stringify({ quantity }),
      });
    },
    removeItem(productId: string, userId?: string) {
      const suffix = userId ? `?userId=${encodeURIComponent(userId)}` : '';
      return request<Cart>(`/cart/items/${productId}${suffix}`, { method: 'DELETE' });
    },
    clear(userId?: string) {
      const suffix = userId ? `?userId=${encodeURIComponent(userId)}` : '';
      return request<Cart>(`/cart${suffix}`, { method: 'DELETE' });
    },
    checkout(deliveryAddressId: string, userId?: string) {
      const suffix = userId ? `?userId=${encodeURIComponent(userId)}` : '';
      return request<Order>(`/cart/checkout${suffix}`, {
        method: 'POST',
        body: JSON.stringify({ deliveryAddressId }),
      });
    },
  },

  catalog: {
    products(params: {
      search?: string;
      categoryId?: string;
      minPrice?: number;
      maxPrice?: number;
      sortBy?: 'created_at' | 'price' | 'name';
      sortOrder?: 'asc' | 'desc';
      limit?: number;
      offset?: number;
    } = {}) {
      const query = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) query.set(key, String(value));
      }
      const suffix = query.toString() ? `?${query}` : '';
      return request<ListResponse<Product>>(`/catalog/products${suffix}`);
    },
    product(productId: string) {
      return request<Product>(`/catalog/products/${productId}`);
    },
    categories(params: { limit?: number; offset?: number } = {}) {
      const query = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) query.set(key, String(value));
      }
      const suffix = query.toString() ? `?${query}` : '';
      return request<ListResponse<Category>>(`/catalog/categories${suffix}`);
    },
    categoryProducts(categoryId: string, params: { limit?: number; offset?: number } = {}) {
      const query = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) query.set(key, String(value));
      }
      const suffix = query.toString() ? `?${query}` : '';
      return request<{ category: Category } & ListResponse<Product>>(
        `/catalog/categories/${categoryId}/products${suffix}`,
      );
    },
  },

  orders: {
    create(input: { userId: string; deliveryAddressId: string; items: OrderItemInput[] }) {
      return request<Order>('/orders', { method: 'POST', body: JSON.stringify(input) });
    },
    get(orderId: string) {
      return request<Order>(`/orders/${orderId}`);
    },
    byUser(userId: string, params: { limit?: number; offset?: number } = {}) {
      const query = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) query.set(key, String(value));
      }
      const suffix = query.toString() ? `?${query}` : '';
      return request<ListResponse<Order>>(`/users/${userId}/orders${suffix}`);
    },
  },

  favourites: {
    list(userId: string) {
      return request<{ items: Product[] }>(`/users/${userId}/favourites`);
    },
    add(userId: string, productId: string) {
      return request<Product>(`/users/${userId}/favourites`, {
        method: 'POST',
        body: JSON.stringify({ productId }),
      });
    },
    remove(userId: string, productId: string) {
      return request<void>(`/users/${userId}/favourites/${productId}`, { method: 'DELETE' });
    },
  },
};
