import type {
  ApiResponse,
  AuthResult,
  ChatMessage,
  ContactUser,
  Conversation,
  ConversationCreateResult,
  FollowResult,
  FollowStatus,
  PrivateMessage,
  Room,
  RoomMember,
  UserInfo,
  AdminStats,
  TrendPoint,
  AdminUser,
  AdminRoom,
  AdminMessage,
  AdminPaginated,
  MessageReaction,
  ReportResult,
  Confession,
  ConfessionComment,
  PaginatedData,
  Bottle,
  BottleReply,
} from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

/** 获取本地存储的 token */
export function getToken(): string {
  return localStorage.getItem('arcle_token') || '';
}

/** 设置 token */
export function setToken(token: string): void {
  localStorage.setItem('arcle_token', token);
}

/** 清除 token */
export function clearToken(): void {
  localStorage.removeItem('arcle_token');
}

/** 统一请求封装 */
async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  // 401 未认证，清除 token
  if (res.status === 401) {
    clearToken();
    throw new Error('未登录或登录已过期');
  }

  const json: ApiResponse<T> = await res.json();

  if (json.code !== 200) {
    throw new Error(json.msg || '请求失败');
  }

  return json.data;
}

/** POST 请求 */
function post<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/** GET 请求 */
function get<T>(path: string): Promise<T> {
  return request<T>(path, { method: 'GET' });
}

/** PUT 请求 */
function put<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/** DELETE 请求 */
function del<T>(path: string): Promise<T> {
  return request<T>(path, { method: 'DELETE' });
}

// ============ 鉴权 API ============

export const authApi = {
  register: (data: { username: string; email: string; password: string }) =>
    post<AuthResult>('/chat/register', data),

  login: (data: { account: string; password: string }) =>
    post<AuthResult>('/chat/login', data),

  profile: () => get<UserInfo>('/chat/profile'),
};

// ============ 用户 API ============

export const userApi = {
  updateProfile: (data: { bio: string; avatar: string }) =>
    put<UserInfo>('/chat/user/profile', data),

  updatePassword: (data: { old_password: string; new_password: string }) =>
    put<null>('/chat/user/password', data),
};

// ============ 聊天室 API ============

export const roomApi = {
  list: (keyword = '') =>
    get<Room[]>(`/chat/rooms${keyword ? `?keyword=${encodeURIComponent(keyword)}` : ''}`),

  detail: (id: number) => get<Room>(`/chat/rooms/${id}`),

  create: (data: {
    name: string;
    description: string;
    type: string;
    invite_user_ids?: number[];
  }) => post<Room>('/chat/rooms', data),

  update: (id: number, data: { name?: string; description?: string; type?: string }) =>
    put<Room>(`/chat/rooms/${id}`, data),

  join: (id: number) => post<null>(`/chat/rooms/${id}/join`),

  leave: (id: number) => post<null>(`/chat/rooms/${id}/leave`),

  members: (id: number) => get<RoomMember[]>(`/chat/rooms/${id}/members`),

  transfer: (id: number, newOwnerId: number) =>
    post<null>(`/chat/rooms/${id}/transfer`, { new_owner_id: newOwnerId }),

  setAdmin: (id: number, userId: number, isAdmin: boolean) =>
    post<null>(`/chat/rooms/${id}/admin`, { user_id: userId, is_admin: isAdmin }),

  invite: (id: number, userIds: number[]) =>
    post<{ invited: number }>(`/chat/rooms/${id}/invite`, { user_ids: userIds }),

  kick: (id: number, userId: number) =>
    post<null>(`/chat/rooms/${id}/kick`, { user_id: userId }),
};

// ============ 消息 API ============

export const messageApi = {
  list: (roomId: number, params: { after_id?: number; before_id?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params.after_id) query.set('after_id', String(params.after_id));
    if (params.before_id) query.set('before_id', String(params.before_id));
    if (params.limit) query.set('limit', String(params.limit));
    const qs = query.toString();
    return get<ChatMessage[]>(`/chat/rooms/${roomId}/messages${qs ? `?${qs}` : ''}`);
  },

  send: (roomId: number, data: { content: string; type: string; reply_to?: number }) =>
    post<ChatMessage>(`/chat/rooms/${roomId}/messages`, data),

  react: (roomId: number, msgId: number, emoji: string) =>
    post<{ reacted: boolean; reactions: MessageReaction[] }>(
      `/chat/rooms/${roomId}/messages/${msgId}/react`,
      { emoji },
    ),

  report: (roomId: number, msgId: number, reason: string) =>
    post<ReportResult>(`/chat/rooms/${roomId}/messages/${msgId}/report`, { reason }),

  heartbeat: () => post<{ time: number }>('/chat/heartbeat'),
};

// ============ 关注 API ============

export const followApi = {
  follow: (userId: number) =>
    post<FollowResult>(`/chat/follows/${userId}`),

  unfollow: (userId: number) =>
    del<FollowResult>(`/chat/follows/${userId}`),

  status: (userId: number) =>
    get<FollowStatus>(`/chat/follows/${userId}/status`),
};

// ============ 通讯录 API ============

export const contactApi = {
  list: (type: 'following' | 'followers' | 'mutual') =>
    get<ContactUser[]>(`/chat/contacts?type=${type}`),

  search: (keyword: string) =>
    get<ContactUser[]>(`/chat/users/search?keyword=${encodeURIComponent(keyword)}`),
};

// ============ 私聊 API ============

export const conversationApi = {
  list: () => get<Conversation[]>('/chat/conversations'),

  create: (userId: number) =>
    post<ConversationCreateResult>('/chat/conversations', { user_id: userId }),

  messages: (convId: number, params: { after_id?: number; before_id?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params.after_id) query.set('after_id', String(params.after_id));
    if (params.before_id) query.set('before_id', String(params.before_id));
    if (params.limit) query.set('limit', String(params.limit));
    const qs = query.toString();
    return get<PrivateMessage[]>(`/chat/conversations/${convId}/messages${qs ? `?${qs}` : ''}`);
  },

  send: (convId: number, data: { content: string; type: string; reply_to?: number }) =>
    post<PrivateMessage>(`/chat/conversations/${convId}/messages`, data),

  react: (convId: number, msgId: number, emoji: string) =>
    post<{ reacted: boolean; reactions: MessageReaction[] }>(
      `/chat/conversations/${convId}/messages/${msgId}/react`,
      { emoji },
    ),

  report: (convId: number, msgId: number, reason: string) =>
    post<ReportResult>(`/chat/conversations/${convId}/messages/${msgId}/report`, { reason }),
};

// ============ 表白墙 API ============

export const confessionApi = {
  list: (page = 1, options?: { search?: string; sort?: string }) => {
    const params = new URLSearchParams({ page: String(page), per_page: '20' });
    if (options?.search) params.set('search', options.search);
    if (options?.sort) params.set('sort', options.sort);
    return get<PaginatedData<Confession>>(`/chat/confessions?${params.toString()}`);
  },

  create: (data: { content: string; target_name: string; anonymous: boolean }) =>
    post<{ id: number }>('/chat/confessions', data),

  like: (id: number) =>
    post<{ liked: boolean; like_count: number }>(`/chat/confessions/${id}/like`),

  bookmark: (id: number) =>
    post<{ bookmarked: boolean }>(`/chat/confessions/${id}/bookmark`),

  bookmarks: (page = 1) =>
    get<PaginatedData<Confession>>(`/chat/confessions/bookmarks?page=${page}&per_page=20`),

  ranking: (type: string = 'likes', limit: number = 10) =>
    get<Confession[]>(`/chat/confessions/ranking?type=${type}&limit=${limit}`),

  detail: (id: number) =>
    get<Confession & { comments: ConfessionComment[] }>(`/chat/confessions/${id}`),

  comments: (id: number, page = 1) =>
    get<PaginatedData<ConfessionComment>>(`/chat/confessions/${id}/comments?page=${page}&per_page=20`),

  addComment: (id: number, content: string) =>
    post<{ create_time: number }>(`/chat/confessions/${id}/comments`, { content }),

  delete: (id: number) =>
    del<null>(`/chat/confessions/${id}`),
};

// ============ 漂流瓶 API ============

export const bottleApi = {
  save: (data: { content: string; target: string }) =>
    post<{ id: number }>('/chat/bottles', data),

  mine: (page = 1) =>
    get<PaginatedData<Bottle>>(`/chat/bottles/mine?page=${page}&per_page=20`),

  pick: () =>
    get<Bottle & { replies: BottleReply[]; author_username: string; author_avatar: string; create_time_fmt: string }>(
      '/chat/bottles/pick'
    ),

  reply: (id: number, content: string) =>
    post<{ create_time: number }>(`/chat/bottles/${id}/reply`, { content }),

  delete: (id: number) =>
    del<null>(`/chat/bottles/${id}`),
};

// ============ 管理后台 API ============

function adminGet<T>(path: string, params?: Record<string, unknown>): Promise<T> {
  const qs = params
    ? Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== null && v !== '')
        .map(
          ([k, v]) =>
            `${encodeURIComponent(k)}=${encodeURIComponent(String(v as string | number | boolean))}`,
        )
        .join('&')
    : '';
  return get<T>(`/chat/admin${path}${qs ? `?${qs}` : ''}`);
}
function adminPost<T>(path: string, body?: unknown): Promise<T> {
  return post<T>(`/chat/admin${path}`, body);
}
function adminDelete<T>(path: string): Promise<T> {
  return del<T>(`/chat/admin${path}`);
}

export const adminApi = {
  // 仪表盘
  stats: () => adminGet<AdminStats>('/stats'),
  trend: () => adminGet<TrendPoint[]>('/stats/trend'),

  // 用户
  users: (p: { page?: number; per_page?: number; keyword?: string; status?: string }) =>
    adminGet<AdminPaginated<AdminUser>>('/users', p),
  createUser: (d: { username: string; email: string; password?: string; role?: string }) =>
    adminPost<{ id: number }>('/users', d),
  updateUser: (id: number, d: Partial<AdminUser> & { password?: string }) =>
    adminPost<AdminUser>(`/users/${id}`, d),

  // 房间
  rooms: (p: { page?: number; per_page?: number; keyword?: string; type?: string }) =>
    adminGet<AdminPaginated<AdminRoom>>('/rooms', p),
  updateRoom: (id: number, d: Partial<AdminRoom> & { owner_id?: number; status?: number }) =>
    adminPost<AdminRoom>(`/rooms/${id}`, d),
  deleteRoom: (id: number) => adminDelete<null>(`/rooms/${id}`),

  // 消息
  messages: (p: { page?: number; per_page?: number; scope?: string }) =>
    adminGet<AdminPaginated<AdminMessage>>('/messages', p),
  deleteMessage: (id: number, scope: 'room' | 'private') =>
    adminDelete<null>(`/messages/${id}?scope=${scope}`),
};
