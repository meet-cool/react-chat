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
  mbti?: string;
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
  qq: string;
  online?: boolean;
  birthday: string;
  gender: string;
  city: string;
  motto: string;
  age: number;
  profile_visible?: number;
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
  is_recalled?: boolean;
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
  is_recalled?: boolean;
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
  bookmark_count: number;
  liked: boolean;
  bookmarked: boolean;
  slug: string;
  create_time: number;
  create_time_fmt: string;
  status?: number;
  theme?: string;
  bg_type?: string;
  bg_color?: string;
  bg_svg?: string;
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

// ============ 系统信息 ============
export interface SystemInfo {
  version: string;
  build_time: string;
  php_version: string;
  uptime: number;
}

// ============ AI 广场 ============
export interface AiChat {
  id: number;
  user_id: number;
  title: string;
  mode: string;
  deep_thinking: number;
  message_count: number;
  create_time: number;
  update_time: number;
  create_time_fmt?: string;
  update_time_fmt?: string;
  pinned?: number;
  archived?: number;
  /** 会话状态（P0+P1 后端新增）：0=active 1=archived（列表/详情为数字；status 端点入参为 'active'|'archived'） */
  status?: number | string;
  /** 标题锁定标记：手动改名 / 自动标题后为 1，后端不再覆盖 */
  title_locked?: number;
}

export interface AiMsg {
  id: number;
  role: string;
  content: string;
  mode: string;
  deep_thinking: number;
  create_time: number;
  /** 消息反馈：0 无 / 1 赞 / 2 踩（P0+P1 后端新增） */
  feedback?: number;
  /** 该助手回复是否失败留痕（1=failed，可重试） */
  failed?: number;
  /** 变体来源：>0 表示这是某条助手回复的再生成版本 */
  variant_of?: number;
}

export interface AiConfig {
  model_name: string;
  api_url: string;
  temperature: number;
  max_tokens: number;
  has_api_key: boolean;
  /** 快捷提问提示词（点击填入输入框），可为空数组 */
  quick_prompts?: string[];
  /** 每日调用上限，0=不限 */
  daily_call_limit?: number;
}

/** AI 广场配额仪表盘（GET /chat/ai/dashboard） */
export interface AiDashboard {
  chat_count: number;
  msg_count: number;
  total_calls: number;
  today_calls: number;
  /** 每日调用上限，0=不限 */
  daily_limit: number;
  /** 今日剩余调用次数，null=不限 */
  remaining: number | null;
  /** 累计 token 估算值 */
  tokens_est: number;
}

// ============ 管理后台 ============
export interface AdminNotice {
  content: string;
}

export interface AdminAiStats {
  total_chats: number;
  today_chats: number;
  total_msgs: number;
  today_msgs: number;
  active_users: number;
}

export interface AdminAiChat {
  id: number;
  user_id: number;
  title: string;
  mode: string;
  mode_label: string;
  deep_thinking: number;
  message_count: number;
  create_time: number;
  create_time_fmt: string;
  update_time: number;
  update_time_fmt: string;
  username: string;
}

// 管理端 AI 模型配置（脱敏视图）：
// - api_key 后端脱敏（len>8 → 前4****后4，否则 ***；未配置为 ***）
// - api_url 后端脱敏（保留 scheme+host+路径首段，中段 ***）
// - source 标记配置来源：'db'=ai_config 表已落库覆盖，'env'=走 .env/默认
export interface AdminAiConfig {
  api_key: string;
  api_url: string;
  model_name: string;
  temperature: number;
  max_tokens: number;
  timeout: number;
  system_prompt: string;
  source: 'db' | 'env';
  has_api_key: boolean;
}

// 保存 AI 模型配置的请求体（白名单字段，均可缺省）：
// - api_key 留空串 = 不落库覆盖，运行时回落到 .env
// - system_prompt 留空串 = 使用内置提示词
export interface AdminAiConfigSave {
  api_key?: string;
  api_url?: string;
  model_name?: string;
  temperature?: number;
  max_tokens?: number;
  timeout?: number;
  system_prompt?: string;
}

// AI 配置连通性测试结果（测试「当前生效配置」或「表单当前值」）
export interface AdminAiConfigTest {
  ok: boolean;
  latency_ms: number;
  model: string;
  error?: string;
  reply_excerpt?: string;
}

// ============ 朋友圈 ============
export interface MomentComment {
  id: number;
  moment_id: number;
  user_id: number;
  username: string;
  avatar: string;
  content: string;
  reply_to_id: number;
  reply_to_username?: string;
  create_time: number;
  create_time_fmt: string;
  time_ago: string;
  is_self: boolean;
  children?: MomentComment[];
}

export interface Moment {
  id: number;
  user_id: number;
  username: string;
  avatar: string;
  content: string;
  images: string[];
  image_count: number;
  privacy: string;
  like_count: number;
  comment_count: number;
  share_count: number;
  create_time: number;
  create_time_fmt: string;
  time_ago: string;
  is_self: boolean;
  is_liked: boolean;
  comments?: MomentComment[];
}

export interface MomentSaveResult extends Moment {
  id: number;
}

/* ==================== 群聊（严格管理） ==================== */

export interface GroupInfo {
  id: number;
  name: string;
  description: string;
  avatar: string;
  owner_id: number;
  announcement?: string;
  join_approval: number;
  member_count: number;
  max_members: number;
  status?: number;
  create_time: number;
  update_time?: number;
  my_role?: string;
  my_muted?: boolean;
  is_owner?: boolean;
  is_member?: boolean;
  pending_count?: number;
  my_request_status?: string;
  avatar_seed: string;
}

export interface GroupMember {
  user_id: number;
  username: string;
  avatar: string;
  role: 'owner' | 'admin' | 'member';
  muted: boolean;
  join_time: number;
  online: boolean;
}

export interface GroupRequest {
  id: number;
  user_id: number;
  username: string;
  avatar: string;
  message: string;
  create_time: number;
}
export interface ShopItem {
  id: number;
  name: string;
  description: string;
  icon: string;
  image: string;
  price: number;
  stock: number;
  scope: 'school' | 'campus' | 'tuckshop';
  sort_order: number;
}

export interface ShopOrder {
  id: number;
  item_id: number;
  item_name: string;
  icon: string;
  price: number;
  quantity: number;
  total_price: number;
  scope: string;
  status: number;
  create_time: number;
  create_time_fmt?: string;
}
