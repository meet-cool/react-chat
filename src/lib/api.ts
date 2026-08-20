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
  SystemInfo,
  AiChat,
  AiMsg,
  AiConfig,
  AdminNotice,
  AdminAiStats,
  AdminAiChat,
  Moment,
  MomentComment,
  MomentSaveResult,
} from '../types';

const DEFAULT_API_BASE = import.meta.env.VITE_API_BASE_URL || '';
const API_STORAGE_KEY = 'arcle_api_base';

export function getApiBaseUrl(): string {
  return localStorage.getItem(API_STORAGE_KEY) || DEFAULT_API_BASE;
}

export function setApiBaseUrl(url: string): void {
  localStorage.setItem(API_STORAGE_KEY, url.trim());
}

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

  const res = await fetch(`${getApiBaseUrl()}${path}`, {
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

/** PATCH 请求 */
export function patch<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: 'PATCH',
    body: body ? JSON.stringify(body) : undefined,
  });
}

// ============ 系统信息 API（无需登录） ============
export const systemApi = {
  health: () => get<SystemInfo>('/chat/health'),
};

// ============ 鉴权 API ============

export const authApi = {
  register: (data: { username: string; email: string; password: string; qq?: string }) =>
    post<AuthResult>('/chat/register', data),

  login: (data: { account: string; password: string }) =>
    post<AuthResult>('/chat/login', data),

  profile: () => get<UserInfo>('/chat/profile'),
};

// ============ 用户 API ============

export const userApi = {
  updateProfile: (data: {
    bio: string;
    avatar: string;
    qq?: string;
    gender?: string;
    city?: string;
    motto?: string;
    birthday?: string;
    age?: number;
    profile_visible?: number;
  }) => put<UserInfo>('/chat/user/profile', data),

  updatePassword: (data: { old_password: string; new_password: string }) =>
    put<null>('/chat/user/password', data),

  getOtherProfile: (username: string) =>
    get<UserInfo>(`/chat/user/profile/${encodeURIComponent(username)}`),

  updateProfileVisible: (visible: boolean) =>
    put<{ profile_visible: number }>('/chat/user/profile/visible', { profile_visible: visible ? 1 : 0 }),
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

// ============ 用户备注 API ============
export const aliasApi = {
  set: (targetUserId: number, alias: string) =>
    post<{ alias: string }>('/chat/user/alias', { target_user_id: targetUserId, alias }),

  list: () =>
    get<{ target_user_id: number; alias: string }[]>('/chat/user/aliases'),

  delete: (targetUserId: number) =>
    del<null>(`/chat/user/alias/${targetUserId}`),
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

  create: (data: { content: string; target_name: string; anonymous: boolean; theme?: string; bg_type?: string; bg_color?: string; bg_svg?: string }) =>
    post<{ id: number }>('/chat/confessions', data),

  like: (slug: string) =>
    post<{ liked: boolean; like_count: number }>(`/chat/confessions/${encodeURIComponent(slug)}/like`),

  bookmark: (slug: string) =>
    post<{ bookmarked: boolean; bookmark_count: number }>(`/chat/confessions/${encodeURIComponent(slug)}/bookmark`),

  bookmarks: (page = 1) =>
    get<PaginatedData<Confession>>(`/chat/confessions/bookmarks?page=${page}&per_page=20`),
  mine: (page = 1, options?: { per_page?: number }) =>
    get<PaginatedData<Confession & { status_label: string; create_time_fmt: string }>>(
      `/chat/confessions/mine?page=${page}${options?.per_page ? `&per_page=${options.per_page}` : ''}`,
    ),

  ranking: (type: string = 'likes', limit: number = 10) =>
    get<Confession[]>(`/chat/confessions/ranking?type=${type}&limit=${limit}`),

  detail: (slug: string) =>
    get<Confession & { comments: ConfessionComment[] }>(`/chat/confessions/${encodeURIComponent(slug)}`),

  comments: (slug: string, page = 1) =>
    get<PaginatedData<ConfessionComment>>(`/chat/confessions/${encodeURIComponent(slug)}/comments?page=${page}&per_page=20`),

  addComment: (slug: string, content: string) =>
    post<{ create_time: number }>(`/chat/confessions/${encodeURIComponent(slug)}/comments`, { content }),

  delete: (slug: string) =>
    del<null>(`/chat/confessions/${encodeURIComponent(slug)}`),

  report: (slug: string, reason: string) =>
    post<{ id: number }>(`/chat/confessions/${encodeURIComponent(slug)}/report`, { reason }),

  // 自定义墙
  myWall: () => get<any[]>('/chat/confessions/wall/my'),
  placeOnWall: (data: { confession_id: number; row: number; col: number; bg_type: string; bg_color: string; bg_svg: string }) =>
    post<null>('/chat/confessions/wall/place', data),
  emptyPositions: (rows: number = 5, cols: number = 5) =>
    get<{ row: number; col: number }[]>(`/chat/confessions/wall/empty-positions?rows=${rows}&cols=${cols}`),
  moveOnWall: (data: { from_row: number; from_col: number; to_row: number; to_col: number }) =>
    patch<null>('/chat/confessions/wall/move', data),

  // QR码
  qrCode: (slug: string) => `${getApiBaseUrl()}/chat/qrcode/confession/${encodeURIComponent(slug)}`,
};

// ============ 积分 / 签到 API ============
export const pointsApi = {
  getPoints: () =>
    get<{
      points: number;
      exp: number;
      level: number;
      exp_to_next: number;
      sign_in_streak: number;
      last_sign_in_date: string;
      signed_today: boolean;
      today_max_points: number;
    }>('/chat/user/points'),

  signin: () =>
    post<{
      points_earned: number;
      exp_earned: number;
      streak: number;
      new_level: number;
      signed_today: boolean;
    }>('/chat/user/signin'),

  pointsHistory: (page = 1) =>
    get<PaginatedData<{
      id: number;
      change_points: number;
      change_exp: number;
      type: string;
      ref_id: number;
      remark: string;
      create_time: number;
      create_time_fmt: string;
    }>>(`/chat/user/points/history?page=${page}&per_page=20`),

  signinHistory: () =>
    get<{ sign_date: string; points_earned: number }[]>('/chat/user/signin/history'),
};

// ============ 漂流瓶 API ============

export const bottleApi = {
  save: (data: { content: string; target: string }) =>
    post<{ id: number }>('/chat/bottles', data),

  mine: (page = 1) =>
    get<PaginatedData<Bottle>>(`/chat/bottles/mine?page=${page}&per_page=20`),

  pick: () =>
    post<Bottle & { replies: BottleReply[]; author_username: string; author_avatar: string; create_time_fmt: string }>(
      '/chat/bottles/pick'
    ),

  reply: (id: number, content: string) =>
    post<{ create_time: number }>(`/chat/bottles/${id}/reply`, { content }),

  delete: (id: number) =>
    del<null>(`/chat/bottles/${id}`),
};

// ============ AI 广场 API ============
export const aiApi = {
  // 获取 AI 配置
  config: () => get<AiConfig>('/chat/ai/config'),

  // 创建新会话
  createChat: (mode: 'fast' | 'professional') =>
    post<{ id: number }>('/chat/ai/chats', { mode }),

  // 获取会话列表
  listChats: () => get<AiChat[]>('/chat/ai/chats'),

  // 获取会话详情（含消息）
  getChat: (id: number) =>
    get<{ title: string; mode: string; deep_thinking: number; messages: AiMsg[] }>(`/chat/ai/chats/${id}`),

  // 删除会话
  deleteChat: (id: number) => del<null>(`/chat/ai/chats/${id}`),

  // 重命名会话
  renameChat: (id: number, title: string) =>
    put<null>(`/chat/ai/chats/${id}`, { title }),

  // 流式聊天
  streamChat: async (messages: AiMsg[], mode: string, deepThinking: boolean): Promise<ReadableStream<Uint8Array> | null> => {
    const res = await fetch(`${getApiBaseUrl()}/chat/ai/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      },
      body: JSON.stringify({ messages, mode, deep_thinking: deepThinking ? 1 : 0 }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.body || null;
  },

  // 非流式聊天（用于标题生成等）
  chat: (data: { conv_id: number; messages: AiMsg[]; mode: string; deep_thinking: boolean }) =>
    post<{ content: string; usage: unknown; conv_id: number }>('/chat/ai/chat', data),

  // AI 私聊（融入私聊系统）
  privateChats: () => get<any[]>('/chat/ai/private/chats'),
  createPrivateChat: () => post<any>('/chat/ai/private/chats', {}),
  getPrivateMessages: (id: number) =>
    get<any[]>(`/chat/ai/private/chats/${id}/messages`),
  sendPrivateMessage: (id: number, content: string) =>
    post<any>(`/chat/ai/private/chats/${id}/messages`, { content }),
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

  // 表白墙管理
  confessions: (p: { page?: number; per_page?: number; status?: string }) =>
    adminGet<AdminPaginated<Omit<Confession, 'status'> & { username: string; user_avatar: string; status_label: string; content_short: string; status: number }>>('/confessions', p),
  updateConfession: (id: number, action: 'approve' | 'reject') =>
    adminPost<null>(`/confessions/${id}`, { action }),

  // AI 广场管理
  aiStats: () => adminGet<AdminAiStats>('/ai/stats'),
  aiChats: (p: { page?: number; per_page?: number; keyword?: string; user_id?: number }) =>
    adminGet<AdminPaginated<AdminAiChat>>('/ai/chats', p),
  deleteAiChat: (id: number) => adminDelete<null>(`/ai/chats/${id}`),

  // 公告（公开读取 / 管理员保存）
  getNotice: () => get<AdminNotice>('/chat/notice'),
  saveNotice: (content: string) => adminPost<null>('/notice', { content }),
};

// ============================================================
// 朋友圈 API
// ============================================================
export const momentApi = {
  moments: (params?: { user_id?: number; last_id?: number; limit?: number }) => {
    const qs = params ? Object.entries(params as Record<string, unknown>)
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&') : '';
    return get<Moment[]>(`/moments${qs ? '?' + qs : ''}`);
  },
  momentsDetail: (id: number) => get<Moment>(`/moments/${id}`),
  momentsSave: (data: { content: string; images?: string[]; privacy?: string }) =>
    post<MomentSaveResult>('/moments', data),
  momentsLike: (id: number) => post<{ liked: boolean; like_count: number }>(`/moments/${id}/like`, {}),
  momentsComment: (id: number, data: { content: string; reply_to_id?: number }) =>
    post<MomentComment>(`/moments/${id}/comments`, data),
  momentsDelete: (id: number) => del<null>(`/moments/${id}`),
  momentsMine: (params?: { last_id?: number; limit?: number }) => {
    const qs = params ? Object.entries(params as Record<string, unknown>)
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&') : '';
    return get<Moment[]>(`/moments/mine${qs ? '?' + qs : ''}`);
  },
};

// ============================================================
// 插件系统 API
// ============================================================
export interface PluginInfo {
  id: number;
  slug: string;
  name: string;
  description: string;
  version: string;
  author: string;
  icon: string;
  color: string;
  route_path: string;
  status: number;
  sort_order: number;
  config: Record<string, unknown>;
}

export const pluginApi = {
  list: () => get<PluginInfo[]>('/chat/plugins'),
  detail: (slug: string) => get<any>(`/chat/plugins/${slug}`),
  saveConfig: (slug: string, config: Record<string, unknown>) =>
    put<null>(`/chat/plugins/${slug}/config`, config),
};

// ============================================================
// 游戏中心 API
// ============================================================
export interface GameInfo {
  slug: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  difficulty: string[];
}

export interface GameLeaderboardItem {
  id: number;
  user_id: number;
  score: number;
  level: number;
  time_used: number;
  username: string;
  avatar: string;
}

export const gameApi = {
  list: () => get<GameInfo[]>('/chat/plugins/games'),
  leaderboard: (slug: string, params?: { page?: number; limit?: number }) => {
    const qs = params ? Object.entries(params as Record<string, unknown>)
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&') : '';
    return get<{ items: GameLeaderboardItem[]; pagination: any }>(`/chat/plugins/games/${slug}/leaderboard${qs ? '?' + qs : ''}`);
  },
  submitScore: (slug: string, data: { score: number; level?: number; time_used?: number; metadata?: any }) =>
    post<{ score: number; points_earned: number; rank: number }>(`/chat/plugins/games/${slug}/score`, data),
  generateSudoku: (difficulty = 'medium') =>
    get<{ puzzle: number[][]; difficulty: string }>(`/chat/plugins/games/sudoku/generate?difficulty=${difficulty}`),
  memoryCardsState: (difficulty = 'easy') =>
    get<{ cards: string[]; pairs: number; difficulty: string }>(`/chat/plugins/games/memory_cards/state?difficulty=${difficulty}`),
  generateNumberGuess: () =>
    get<{ code: string; max_attempts: number }>(`/chat/plugins/games/number_guess/generate`),
};

// ============================================================
// 礼物系统 API
// ============================================================
export interface GiftInfo {
  id: string;
  name: string;
  cost: number;
  icon: string;
  description: string;
}

export const giftApi = {
  list: () => get<GiftInfo[]>('/chat/plugins/gifts'),
  send: (data: { target_id: number; gift_id: string; quantity: number }) =>
    post<{ gift_id: string; quantity: number; cost: number }>('/chat/plugins/gifts/send', data),
  wall: (userId: number) => get<any[]>(`/chat/plugins/gifts/wall/${userId}`),
};
