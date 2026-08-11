import { Sparkles, Globe, BookOpen, HelpCircle } from 'lucide-react';

interface ExtensionsViewProps {
  onOpenConversation?: (userId: number) => void;
}

interface ExtItem {
  icon: typeof Globe;
  title: string;
  desc: string;
  status: 'planned' | 'beta' | 'soon';
}

const items: ExtItem[] = [
  { icon: Globe, title: '公共大厅', desc: '所有人可见的公共聊天室，无需加入即可发言', status: 'planned' },
  { icon: BookOpen, title: '消息收藏', desc: '收藏重要消息，方便后续查找', status: 'soon' },
  { icon: HelpCircle, title: '帮助中心', desc: '常见问题与使用指南', status: 'soon' },
];

export function ExtensionsView(_: ExtensionsViewProps) {
  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--color-card)' }}>
      <div className="p-4 border-b" style={{ borderColor: 'var(--color-divider)' }}>
        <h2 className="text-base font-semibold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
          <Sparkles size={16} /> 插件
        </h2>
        <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
          更多功能即将上线
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <div
              key={it.title}
              className="flex items-start gap-3 p-4"
              style={{
                background: 'var(--color-card-alt)',
                border: '1px solid var(--color-border-light)',
              }}
            >
              <div
                className="p-2 flex-shrink-0"
                style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}
              >
                <Icon size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                    {it.title}
                  </h3>
                  <span
                    className="text-[10px] px-1.5 py-0.5"
                    style={
                      it.status === 'planned'
                        ? {
                            background: 'var(--color-info-bg)',
                            color: 'var(--color-info)',
                            border: '1px solid var(--color-info-light)',
                          }
                        : it.status === 'beta'
                          ? {
                              background: 'var(--color-success-bg)',
                              color: 'var(--color-success)',
                              border: '1px solid var(--color-success-light)',
                            }
                          : {
                              background: 'var(--color-card)',
                              color: 'var(--color-text-muted)',
                              border: '1px solid var(--color-border-light)',
                            }
                    }
                  >
                    {it.status === 'planned' ? '规划中' : it.status === 'beta' ? 'Beta' : '即将上线'}
                  </span>
                </div>
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-light)' }}>
                  {it.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
