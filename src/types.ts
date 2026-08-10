// 统一 API 响应类型
export interface ApiResponse<T = unknown> {
  code: number;
  msg: string;
  data: T;
}

// 分页响应
export interface PaginatedData<T> {
  items: T[];
  pagination: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
  };
}

// 用户信息
export interface UserInfo {
  id: number;
  username: string;
  email: string;
  avatar: string;
  bio: string;
  status: number;
  role: string;
  create_time: number;
  points: number;
  exp: number;
  level: number;
  exp_to_next: number;
  sign_in_streak: number;
  last_sign_in_date: string;
}

// 登录/注册响应
export interface AuthResult {
  token: string;
  userinfo: UserInfo;
}

// 聊天室
export interface Room {
  id: number;
  name: string;
  description: string;
  avatar: string;
  owner_id: number;
  type: string;
  member_count: number;
  create_time: number;
  create_time_fmt?: string;
  joined?: boolean;
  online_count?: number;
}

// 房间成员
export interface RoomMember {
  id: number;
  username: string;
  avatar: string;
  bio: string;
  role: string;
  create_time: number;
  online: boolean;
  last_active_fmt: string;
  is_owner?: boolean;
}

// 消息
export interface ChatMessage {
  id: number;
  room_id: number;
  user_id: number;
  username: string;
  avatar: string;
  content: string;
  type: string;
  create_time: number;
  create_time_fmt: string;
  is_self: boolean;
  reply_to?: number;
  reply?: MessageReply | null;
  reactions?: MessageReaction[];
}

// 消息引用
export interface MessageReply {
  id: number;
  username: string;
  content_short: string;
}

// 消息反应
export interface MessageReaction {
  emoji: string;
  count: number;
  users: number[];
}

// 举报原因
export interface ReportResult {
  id: number;
}

// 主题类型
export type ThemeName = 'light' | 'dark' | 'high1' | 'high2';

// Toast 通知
export interface ToastItem {
  id: number;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

// 关注状态
export interface FollowStatus {
  i_follow: boolean;
  follows_me: boolean;
  mutual: boolean;
  can_message: boolean;
}

// 关注操作返回
export interface FollowResult {
  followed: boolean;
  mutual?: boolean;
  can_message?: boolean;
}

// 通讯录用户
export interface ContactUser {
  id: number;
  username: string;
  avatar: string;
  bio: string;
  online: boolean;
  last_active_fmt: string;
  create_time: number;
  // 通讯录特有
  i_follow?: boolean;
  follows_me?: boolean;
  mutual?: boolean;
  last_message?: string;
  last_message_time?: number;
  alias?: string;
}

// 私信会话
export interface Conversation {
  id: number;
  other_id: number;
  other_username: string;
  other_avatar: string;
  other_online: boolean;
  last_message: string;
  last_message_time: number;
  last_message_fmt: string;
  unread: number;
  update_time: number;
}

// 私聊消息
export interface PrivateMessage {
  id: number;
  conversation_id: number;
  sender_id: number;
  username: string;
  avatar: string;
  content: string;
  type: string;
  is_read: number;
  create_time: number;
  create_time_fmt: string;
  is_self: boolean;
  reply_to?: number;
  reply?: MessageReply | null;
  reactions?: MessageReaction[];
}

// 私聊会话创建结果
export interface ConversationCreateResult {
  id: number;
  other_id: number;
  other_username: string;
  other_avatar: string;
  other_online: boolean;
  create_time: number;
}

// 侧边栏分类
export type SidebarCategory = 'recent' | 'rooms' | 'contacts' | 'confession' | 'bottle' | 'extensions';

// ============ 管理后台 ============
export type AdminUserRole = 'member' | 'admin' | 'super_admin';

export interface AdminStats {
  total_users: number;
  today_users: number;
  online_users: number;
  total_rooms: number;
  active_rooms: number;
  total_messages: number;
  today_messages: number;
  private_total: number;
}

export interface TrendPoint {
  date: string;
  room: number;
  private: number;
  total: number;
}

export interface AdminUser {
  id: number;
  username: string;
  email: string;
  avatar: string;
  bio: string;
  role: AdminUserRole;
  status: number;
  online: boolean;
  last_active: number;
  last_active_fmt: string;
  create_time: number;
  create_time_fmt: string;
  update_time: number;
}

export interface AdminRoom {
  id: number;
  name: string;
  description: string;
  avatar: string;
  owner_id: number;
  owner_username: string;
  type: 'public' | 'private';
  member_count: number;
  status?: number;
  create_time: number;
  create_time_fmt: string;
  update_time: number;
  update_time_fmt: string;
}

export interface AdminMessage {
  id: number;
  target_id: number;
  sender_id: number;
  sender_name: string;
  sender_avatar: string;
  content: string;
  content_short: string;
  type: string;
  create_time: number;
  create_time_fmt: string;
}

export interface AdminPaginated<T> {
  items: T[];
  pagination: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
  };
}

// ============ 表白墙 ============
export interface Confession {
  id: number;
  user_id: number;
  content: string;
  target_name: string;
  anonymous: boolean;
  username: string;
  avatar: string;
  like_count: number;
  comment_count: number;
  liked: boolean;
  bookmarked: boolean;
  slug: string;
  create_time: number;
  create_time_fmt: string;
}

export interface ConfessionComment {
  id: number;
  confession_id: number;
  user_id: number;
  content: string;
  username: string;
  avatar: string;
  create_time: number;
  create_time_fmt: string;
}

// ============ 漂流瓶 ============
export interface Bottle {
  id: number;
  user_id: number;
  content: string;
  target: string;
  status: number;
  picked: boolean;
  replies: number;
  create_time: number;
  create_time_fmt: string;
}

export interface BottleReply {
  id: number;
  bottle_id: number;
  user_id: number;
  content: string;
  username: string;
  avatar: string;
  create_time: number;
  create_time_fmt: string;
}
