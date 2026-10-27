// базовый url для api запросов
export const API_BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL) ||
  '/api';

// интерфейс пользователя системы
export interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: 'user' | 'admin';
  createdAt: string;
}

// ответ сервера при успешной авторизации
export interface AuthResponse {
  user: User;
}

// интерфейс категории товара
export interface Category {
  id: string;
  parentId: string | null;
  name: string;
  productCount: number;
}

// интерфейс товара в каталоге
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

// стандартный пагинированный ответ списка
export interface ListResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

// позиция товара в корзине
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

// состояние корзины пользователя
export interface Cart {
  items: CartItem[];
  total: number;
  itemsCount: number;
}

// элемент заказа для создания
export interface OrderItemInput {
  productId: string;
  quantity: number;
}

// адрес доставки заказа
export interface DeliveryAddress {
  id: string;
  country: string;
  city: string;
  street: string;
  house: string;
  apartment: string | null;
}

// сущность заказа
export interface Order {
  id: string;
  userId: string;
  deliveryAddressId: string;
  status: 'pending' | 'paid' | 'processing' | 'shipped' | 'completed' | 'cancelled';
  total: number;
  itemsCount?: number;
  createdAt?: string;
  user?: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
  deliveryAddress?: DeliveryAddress;
  items: Array<{
    id?: string;
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
}

// деталь ошибки валидации
export interface ApiErrorDetail {
  field?: string;
  code?: string;
  message?: string;
  [key: string]: unknown;
}

// стандартизированная ошибка бэкенда
export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: ApiErrorDetail[] | Record<string, unknown>;
  };
}

// класс клиентской ошибки с информацией от сервера
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

// универсальный метод выполнения http-запросов
async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    // передача http-only cookie для авторизации
    credentials: 'include',
    headers: { 'content-type': 'application/json', ...init.headers },
    ...init,
  });

  // обработка неуспешного статуса ответа
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

  // обработка пустого ответа 204 no content
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

// фасад для работы с api бэкенда
export const api = {
  // методы авторизации и профиля
  auth: {
    // регистрация нового пользователя
    register(input: { email: string; password: string; firstName?: string; lastName?: string }) {
      return request<AuthResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(input),
      });
    },
    // вход в систему по email и паролю
    login(input: { email: string; password: string }) {
      return request<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(input) });
    },
    // выход из текущей сессии
    logout() {
      return request<{ message: string }>('/auth/logout', { method: 'POST' });
    },
    // получение данных текущего авторизованного пользователя
    me() {
      return request<{ user: User }>('/auth/me');
    },
  },

  // методы работы с корзиной
  cart: {
    // получение текущей корзины
    get() {
      return request<Cart>('/cart');
    },
    // добавление товара в корзину
    addItem(productId: string, quantity = 1) {
      return request<Cart>('/cart/items', {
        method: 'POST',
        body: JSON.stringify({ productId, quantity }),
      });
    },
    // обновление количества товара в корзине
    updateQuantity(productId: string, quantity: number) {
      return request<Cart>(`/cart/items/${productId}`, {
        method: 'PATCH',
        body: JSON.stringify({ quantity }),
      });
    },
    // удаление одного товара из корзины
    removeItem(productId: string) {
      return request<Cart>(`/cart/items/${productId}`, { method: 'DELETE' });
    },
    // полная очистка корзины
    clear() {
      return request<Cart>('/cart', { method: 'DELETE' });
    },
    // оформление заказа из товаров в корзине
    checkout(deliveryAddressId: string) {
      return request<Order>('/cart/checkout', {
        method: 'POST',
        body: JSON.stringify({ deliveryAddressId }),
      });
    },
  },

  // методы каталога товаров и категорий
  catalog: {
    // получение списка товаров с фильтрацией и пагинацией
    products(
      params: {
        search?: string;
        categoryId?: string;
        minPrice?: number;
        maxPrice?: number;
        sortBy?: 'created_at' | 'price' | 'name';
        sortOrder?: 'asc' | 'desc';
        limit?: number;
        offset?: number;
      } = {},
    ) {
      const query = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null && value !== '') {
          query.set(key, String(value));
        }
      }
      const suffix = query.toString() ? `?${query}` : '';
      return request<ListResponse<Product>>(`/catalog/products${suffix}`);
    },
    // получение детальной информации о товаре
    product(productId: string) {
      return request<Product>(`/catalog/products/${productId}`);
    },
    // получение списка категорий
    categories(params: { limit?: number; offset?: number } = {}) {
      const query = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) query.set(key, String(value));
      }
      const suffix = query.toString() ? `?${query}` : '';
      return request<ListResponse<Category>>(`/catalog/categories${suffix}`);
    },
    // получение товаров конкретной категории
    categoryProducts(categoryId: string, params: { limit?: number; offset?: number } = {}) {
      const query = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) query.set(key, String(value));
      }
      const suffix = query.toString() ? `?${query}` : '';
      return request<{ category: Category } & ListResponse<Product>>(
        `/catalog/categories/${categoryId}/products${suffix}`,
      );
    },
    // создание нового товара (только для администратора)
    createProduct(input: {
      sku: string;
      name: string;
      description?: string | null;
      price: number;
      isActive?: boolean;
      imageUrl?: string | null;
      categoryIds?: string[];
    }) {
      return request<Product>('/catalog/products', {
        method: 'POST',
        body: JSON.stringify(input),
      });
    },
    // обновление данных товара (только для администратора)
    updateProduct(
      productId: string,
      input: {
        sku?: string;
        name?: string;
        description?: string | null;
        price?: number;
        isActive?: boolean;
        imageUrl?: string | null;
        categoryIds?: string[];
      },
    ) {
      return request<Product>(`/catalog/products/${productId}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      });
    },
    // удаление товара из каталога (только для администратора)
    deleteProduct(productId: string) {
      return request<void>(`/catalog/products/${productId}`, {
        method: 'DELETE',
      });
    },
    // создание категории (только для администратора)
    createCategory(input: { name: string; parentId?: string | null }) {
      return request<Category>('/catalog/categories', {
        method: 'POST',
        body: JSON.stringify(input),
      });
    },
    // удаление категории (только для администратора)
    deleteCategory(categoryId: string) {
      return request<void>(`/catalog/categories/${categoryId}`, {
        method: 'DELETE',
      });
    },
  },

  // методы работы с заказами
  orders: {
    // список всех заказов магазина (только для администратора)
    list(params: { limit?: number; offset?: number; status?: Order['status'] } = {}) {
      const query = new URLSearchParams();
      if (params.limit !== undefined) query.set('limit', String(params.limit));
      if (params.offset !== undefined) query.set('offset', String(params.offset));
      if (params.status) query.set('status', params.status);
      const suffix = query.toString() ? `?${query}` : '';
      return request<ListResponse<Order>>(`/orders${suffix}`);
    },
    // ручное создание заказа
    create(input: { userId?: string; deliveryAddressId: string; items: OrderItemInput[] }) {
      return request<Order>('/orders', { method: 'POST', body: JSON.stringify(input) });
    },
    // получение конкретного заказа по id
    get(orderId: string) {
      return request<Order>(`/orders/${orderId}`);
    },
    // список заказов конкретного пользователя
    byUser(userId: string, params: { limit?: number; offset?: number } = {}) {
      const query = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) query.set(key, String(value));
      }
      const suffix = query.toString() ? `?${query}` : '';
      return request<ListResponse<Order>>(`/users/${userId}/orders${suffix}`);
    },
    // обновление статуса заказа (только для администратора)
    updateStatus(orderId: string, status: Order['status']) {
      return request<Order>(`/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
    },
  },

  // методы управления избранными товарами
  favourites: {
    // список избранных товаров пользователя
    list(userId: string) {
      return request<{ items: Product[] }>(`/users/${userId}/favourites`);
    },
    // добавление товара в избранное
    add(userId: string, productId: string) {
      return request<Product>(`/users/${userId}/favourites`, {
        method: 'POST',
        body: JSON.stringify({ productId }),
      });
    },
    // удаление товара из избранного
    remove(userId: string, productId: string) {
      return request<void>(`/users/${userId}/favourites/${productId}`, { method: 'DELETE' });
    },
  },

  // методы управления сохраненными адресами доставки
  addresses: {
    // получение списка адресов пользователя
    list(userId: string) {
      return request<{ items: DeliveryAddress[] }>(`/users/${userId}/addresses`);
    },
    // добавление нового адреса пользователя
    create(
      userId: string,
      input: {
        country?: string;
        city: string;
        street: string;
        house: string;
        apartment?: string | null;
      },
    ) {
      return request<DeliveryAddress>(`/users/${userId}/addresses`, {
        method: 'POST',
        body: JSON.stringify(input),
      });
    },
    // удаление адреса пользователя
    delete(userId: string, addressId: string) {
      return request<void>(`/users/${userId}/addresses/${addressId}`, { method: 'DELETE' });
    },
  },
};
