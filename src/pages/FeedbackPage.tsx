import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Flag,
  Bug,
  Lightbulb,
  Send,
  Loader2,
  ArrowLeft,
  Shield,
  MessageSquare,
  X,
  CheckCircle2,
  Inbox,
} from 'lucide-react';
import { useApp } from '../lib/AppContext';
import { feedbackApi, type FeedbackType, type FeedbackRecord, type FeedbackEvidenceItem } from '../lib/api';

// 举报原因列表（与 ReportDialog 保持一致）
const REPORT_REASONS = [
  '垃圾广告 / 推广信息',
  '辱骂 / 人身攻击',
  '色情 / 低俗内容',
  '政治敏感 / 违法信息',
  '诈骗 / 恶意链接',
  '其他',
];

/** 从跳转来源携带的反馈初始化信息 */
interface FeedbackInitState {
  type?: FeedbackType;
  targetUser?: string;
  targetUserId?: number;
  contextType?: '' | 'room' | 'private' | 'group';
  contextId?: number;
  context?: FeedbackEvidenceItem[];
}

interface FeedbackPageProps {
  onBack: () => void;
}

export function FeedbackPage({ onBack }: FeedbackPageProps) {
  const { addToast } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  // Tab 状态：user_report / suggestion
  const [tab, setTab] = useState<'user_report' | 'suggestion'>(
    (location.state as FeedbackInitState | null)?.type === 'bug' ||
    (location.state as FeedbackInitState | null)?.type === 'feature'
      ? 'suggestion'
      : 'user_report',
  );

  // 跳转来源携带的初始值
  const initState = (location.state as FeedbackInitState | null) ?? {};
  // URL query 兜底：?target=xxx&type=user_report
  const queryTarget = new URLSearchParams(location.search).get('target') || '';

  // ---- 举报用户表单 ----
  const [reportTarget, setReportTarget] = useState<string>(initState.targetUser || queryTarget || '');
  const [reportReason, setReportReason] = useState('');
  const [reportOther, setReportOther] = useState('');
  const [reportDetail, setReportDetail] = useState('');

  // ---- Bug/建议表单 ----
  const [sugType, setSugType] = useState<'bug' | 'feature'>(
    (initState.type === 'feature' || initState.type === 'bug') ? initState.type : 'bug',
  );
  const [sugTitle, setSugTitle] = useState('');
  const [sugDetail, setSugDetail] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submittedId, setSubmittedId] = useState<number | null>(null);

  // ---- 我的反馈记录 ----
  const [records, setRecords] = useState<FeedbackRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);

  // 加载自己的反馈记录
  const loadRecords = useCallback(async () => {
    setRecordsLoading(true);
    try {
      const list = await feedbackApi.list();
      setRecords(list);
    } catch (err) {
      addToast(err instanceof Error ? err.message : '加载反馈记录失败', 'error');
    } finally {
      setRecordsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  // 跳转到综合反馈页时，把被举报消息的上下文（前后各 5 条）存到 sessionStorage
  // 这里读出来展示
  const evidence: FeedbackEvidenceItem[] = initState.context ?? [];

  const handleReportSubmit = async () => {
    const reason = reportReason === '其他' ? reportOther.trim() : reportReason;
    if (!reportTarget.trim()) {
      addToast('请填写被举报用户', 'error');
      return;
    }
    if (!reason) {
      addToast('请选择或填写举报原因', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const res = await feedbackApi.submit({
        type: 'user_report',
        target_user_id: initState.targetUserId ?? 0,
        context_type: initState.contextType ?? 'room',
        context_id: initState.contextId ?? 0,
        reason: reason.slice(0, 255),
        detail: reportDetail.slice(0, 2000),
        evidence: evidence.length > 0 ? JSON.stringify(evidence) : '',
      });
      setSubmittedId(res.id);
      addToast(`举报已提交，ID ${res.id}`, 'success');
      loadRecords();
    } catch (err) {
      addToast(err instanceof Error ? err.message : '提交失败', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSuggestionSubmit = async () => {
    if (!sugTitle.trim()) {
      addToast('请填写标题/原因', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const res = await feedbackApi.submit({
        type: sugType,
        reason: sugTitle.slice(0, 255),
        detail: sugDetail.slice(0, 2000),
      });
      setSubmittedId(res.id);
      addToast(`${sugType === 'bug' ? 'Bug' : '建议'}已提交，ID ${res.id}`, 'success');
      loadRecords();
    } catch (err) {
      addToast(err instanceof Error ? err.message : '提交失败', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const tabBtn = (active: boolean) =>
    `flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
      active ? 'text-[var(--color-text)]' : 'text-[var(--color-text-muted)]'
    }`;

  const tabIndicator = (active: boolean) =>
    active ? { background: 'var(--color-primary)', color: 'var(--color-primary-light)' } : {};

  const inputClass = 'w-full text-sm p-2.5 bg-[var(--color-card)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary-light)] transition-colors';
  const labelClass = 'block text-xs font-medium mb-1.5 text-[var(--color-text-secondary)]';

  return (
    <div
      className="min-h-screen flex flex-col p-4 sm:p-6 max-w-3xl mx-auto"
      style={{ background: 'var(--color-bg-page)' }}
    >
      {/* 顶部导航 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button
            className="btn btn-sm p-2 rounded-sm"
            style={{ minHeight: 36, minWidth: 36 }}
            onClick={onBack}
            aria-label="返回"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-lg font-semibold text-[var(--color-text)]">综合反馈</h1>
        </div>
        {submittedId && (
          <button
            className="btn btn-sm"
            onClick={onBack}
          >
            <CheckCircle2 size={14} /> 已提交 #{submittedId}
          </button>
        )}
      </div>

      {/* Tab 切换 */}
      <div className="flex border-b border-[var(--color-divider)] mb-4" style={{ background: 'var(--color-card)' }}>
        <button
          className={tabBtn(tab === 'user_report')}
          style={tabIndicator(tab === 'user_report')}
          onClick={() => setTab('user_report')}
        >
          <Flag size={16} /> 举报用户
        </button>
        <button
          className={tabBtn(tab === 'suggestion')}
          style={tabIndicator(tab === 'suggestion')}
          onClick={() => setTab('suggestion')}
        >
          <Bug size={16} /> Bug / 功能建议
        </button>
      </div>

      {/* 表单区域 */}
      <div
        className="bg-[var(--color-card)] border border-[var(--color-border)] p-4 sm:p-6 mb-4"
        style={{ borderRadius: 0 }}
      >
        {tab === 'user_report' ? (
          <div className="space-y-4">
            {/* 被举报人 */}
            <div>
              <label className={labelClass}>被举报用户 <span style={{ color: 'var(--color-error)' }}>*</span></label>
              <input
                className={inputClass}
                value={reportTarget}
                onChange={(e) => setReportTarget(e.target.value)}
                placeholder="请输入被举报人的用户名"
                maxLength={64}
              />
              {evidence.length > 0 && (
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  {evidence.length} 条聊天上下文将自动附带
                </p>
              )}
            </div>

            {/* 举报原因 */}
            <div>
              <label className={labelClass}>举报原因 <span style={{ color: 'var(--color-error)' }}>*</span></label>
              <select
                className={inputClass}
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
              >
                <option value="">请选择</option>
                {REPORT_REASONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            {/* 其他说明 */}
            {reportReason === '其他' && (
              <div>
                <label className={labelClass}>请描述具体原因 <span style={{ color: 'var(--color-error)' }}>*</span></label>
                <input
                  className={inputClass}
                  value={reportOther}
                  onChange={(e) => setReportOther(e.target.value)}
                  placeholder="请输入具体原因"
                  maxLength={255}
                />
              </div>
            )}

            {/* 补充说明 */}
            <div>
              <label className={labelClass}>补充说明（选填）</label>
              <textarea
                className={inputClass}
                rows={3}
                value={reportDetail}
                onChange={(e) => setReportDetail(e.target.value)}
                placeholder="请补充描述举报的具体情况"
                maxLength={2000}
              />
            </div>

            {/* 聊天上下文（只读） */}
            {evidence.length > 0 && (
              <div>
                <label className={labelClass}>附带的聊天上下文（{evidence.length} 条，前后各 5 条）</label>
                <div
                  className="border border-[var(--color-divider)] rounded-sm max-h-64 overflow-y-auto"
                  style={{ background: 'var(--color-card-alt)' }}
                >
                  {evidence.map((m, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 p-2 border-b border-[var(--color-divider)] last:border-b-0"
                      style={{ background: m.is_self ? 'var(--color-primary-light)' : 'transparent' }}
                    >
                      <span
                        className="text-xs font-medium w-16 flex-shrink-0"
                        style={{ color: m.is_self ? 'var(--color-primary)' : 'var(--color-text-secondary)' }}
                      >
                        {m.is_self ? '我' : m.username}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs break-words text-[var(--color-text)]">{m.content}</p>
                        <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">{m.create_time_fmt}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  以上上下文将随举报一并提交，用于核实情况。
                </p>
              </div>
            )}

            {/* 提交 */}
            <div className="pt-2">
              <button
                className="btn btn-primary w-full"
                disabled={submitting || !reportTarget.trim() || !reportReason}
                onClick={handleReportSubmit}
              >
                {submitting ? (
                  <><Loader2 size={14} className="animate-spin" /> 提交中…</>
                ) : (
                  <><Send size={14} /> 提交举报</>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 类型 */}
            <div>
              <label className={labelClass}>反馈类型</label>
              <div className="flex gap-2">
                <button
                  className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-sm text-sm font-medium transition-colors border ${
                    sugType === 'bug'
                      ? 'border-[var(--color-error)] bg-[var(--color-error-bg)] text-[var(--color-error)]'
                      : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-hover-bg)]'
                  }`}
                  onClick={() => setSugType('bug')}
                >
                  <Bug size={16} /> Bug 反馈
                </button>
                <button
                  className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-sm text-sm font-medium transition-colors border ${
                    sugType === 'feature'
                      ? 'border-[var(--color-info)] bg-[var(--color-info-bg)] text-[var(--color-info)]'
                      : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-hover-bg)]'
                  }`}
                  onClick={() => setSugType('feature')}
                >
                  <Lightbulb size={16} /> 功能建议
                </button>
              </div>
            </div>

            {/* 标题 */}
            <div>
              <label className={labelClass}>
                {sugType === 'bug' ? 'Bug 描述' : '建议标题'} <span style={{ color: 'var(--color-error)' }}>*</span>
              </label>
              <input
                className={inputClass}
                value={sugTitle}
                onChange={(e) => setSugTitle(e.target.value)}
                placeholder={sugType === 'bug' ? '请简述遇到的问题' : '请简述功能建议'}
                maxLength={255}
              />
            </div>

            {/* 详细描述 */}
            <div>
              <label className={labelClass}>详细描述（选填）</label>
              <textarea
                className={inputClass}
                rows={4}
                value={sugDetail}
                onChange={(e) => setSugDetail(e.target.value)}
                placeholder={sugType === 'bug' ? '请描述复现步骤、期望行为、实际行为等' : '请描述具体功能需求、使用场景、期望效果等'}
                maxLength={2000}
              />
            </div>

            {/* 提交 */}
            <div className="pt-2">
              <button
                className={`btn w-full ${sugType === 'bug' ? 'btn-error' : 'btn-info'}`}
                disabled={submitting || !sugTitle.trim()}
                onClick={handleSuggestionSubmit}
              >
                {submitting ? (
                  <><Loader2 size={14} className="animate-spin" /> 提交中…</>
                ) : (
                  <><Send size={14} /> 提交{sugType === 'bug' ? ' Bug' : '建议'}</>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 我的反馈记录 */}
      <div
        className="bg-[var(--color-card)] border border-[var(--color-border)] p-4 sm:p-6"
        style={{ borderRadius: 0 }}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-[var(--color-text)] flex items-center gap-2">
            <Inbox size={16} /> 我的反馈记录
          </h2>
          <span className="text-xs text-[var(--color-text-muted)]">{records.length} 条</span>
        </div>

        {recordsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={20} className="animate-spin text-[var(--color-text-muted)]" />
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-8 text-[var(--color-text-muted)]">
            <MessageSquare size={32} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">暂无反馈记录</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {records.map((r) => (
              <div
                key={r.id}
                className="flex items-start gap-3 p-3 rounded-sm border border-[var(--color-divider)] transition-colors hover:bg-[var(--color-hover-bg)]"
                style={{ background: 'var(--color-card-alt)' }}
              >
                <div
                  className="flex-shrink-0 w-8 h-8 rounded-sm flex items-center justify-center"
                  style={{
                    background: r.type === 'user_report' ? 'var(--color-error-bg)' : r.type === 'bug' ? 'var(--color-info-bg)' : 'var(--color-success-bg)',
                    color: r.type === 'user_report' ? 'var(--color-error)' : r.type === 'bug' ? 'var(--color-info)' : 'var(--color-success)',
                  }}
                >
                  {r.type === 'user_report' ? <Shield size={16} /> : r.type === 'bug' ? <Bug size={16} /> : <Lightbulb size={16} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-sm font-medium text-[var(--color-text)]">
                    <span className="truncate">
                      {r.type === 'user_report'
                        ? `举报 ${r.target_username || r.target_user_id || '用户'}`
                        : r.type === 'bug'
                          ? 'Bug 反馈'
                          : '功能建议'}
                    </span>
                    <span className="text-xs text-[var(--color-text-muted)] flex-shrink-0">#{r.id}</span>
                  </div>
                  {r.reason && (
                    <p className="text-xs text-[var(--color-text-secondary)] mt-1 truncate">{r.reason}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1.5 text-[11px] text-[var(--color-text-muted)]">
                    <span
                      className="px-1.5 py-0.5 rounded-sm"
                      style={{
                        background: r.status === 0 ? 'var(--color-warning-light)' : r.status === 1 ? 'var(--color-success-light)' : 'var(--color-error-light)',
                        color: r.status === 0 ? 'var(--color-warning)' : r.status === 1 ? 'var(--color-success)' : 'var(--color-error)',
                      }}
                    >
                      {r.status === 0 ? '待处理' : r.status === 1 ? '已处理' : '已忽略'}
                    </span>
                    <span>{new Date(r.create_time * 1000).toLocaleString('zh-CN')}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
