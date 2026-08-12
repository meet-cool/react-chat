import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function PrivacyPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg-page)' }}>
      <div
        className="px-4 py-3 border-b flex items-center gap-3 sticky top-0 z-10"
        style={{ background: 'var(--color-card)', borderColor: 'var(--color-divider)' }}
      >
        <button onClick={() => navigate(-1)} className="btn btn-sm" style={{ minWidth: 36 }}>
          <ArrowLeft size={14} />
        </button>
        <h1 className="text-base font-bold" style={{ color: 'var(--color-text)' }}>隐私政策</h1>
      </div>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>
          最后更新日期：2026年8月
        </p>

        <Section title="一、我们收集的信息">
          <ul className="list-disc pl-5 space-y-1.5">
            <li><b>账号信息</b>：用户名、邮箱、QQ号（用于获取头像）、注册时间。</li>
            <li><b>内容数据</b>：您发布的聊天记录、表白内容、漂流瓶信息、评论互动等。</li>
            <li><b>设备信息</b>：IP 地址、浏览器类型、操作系统版本（用于安全保障与服务优化）。</li>
          </ul>
        </Section>

        <Section title="二、信息的使用方式">
          我们收集的信息仅用于以下目的：
          <ul className="list-disc pl-5 space-y-1.5">
            <li>为您提供聊天、表白、漂流瓶等核心功能服务；</li>
            <li>账号注册、登录验证及安全防护；</li>
            <li>处理您的投诉与反馈；</li>
            <li>改善和优化平台体验；</li>
            <li>遵守法律法规要求。</li>
          </ul>
        </Section>

        <Section title="三、信息的存储与保护">
          您的个人信息存储于加密的数据库服务器中，我们采取合理的技术和管理措施防止信息泄露、丢失或被滥用。但我们无法保证传输过程的绝对安全，请您谨慎分享敏感信息。
        </Section>

        <Section title="四、信息的共享与披露">
          我们不会将您的个人信息出售给第三方。仅在以下情况可能共享信息：
          <ul className="list-disc pl-5 space-y-1.5">
            <li>获得您的明确授权；</li>
            <li>应法律法规或政府机关的要求；</li>
            <li>为保护平台及用户的合法权益。</li>
          </ul>
          您在聊天室发布的公开内容，其他用户可见，请注意保护个人隐私。
        </Section>

        <Section title="五、Cookie 与本地存储">
          我们使用 Cookie 和本地存储（localStorage）来保存您的登录状态和偏好设置。您可以在浏览器设置中管理或删除这些内容。
        </Section>

        <Section title="六、未成年人保护">
          我们非常重视对未成年人个人信息的保护。若您是未成年人，建议在监护人指导下使用本平台。如监护人发现未成年人在未经同意的情况下提供了个人信息，请联系我们及时处理。
        </Section>

        <Section title="七、您的权利">
          您有权：
          <ul className="list-disc pl-5 space-y-1.5">
            <li>查看、修改或删除您的个人资料；</li>
            <li>申请注销账号，注销后您的个人信息将被清除；</li>
            <li>撤回对个人信息处理的授权（不影响已基于授权进行的处理）；</li>
            <li>对信息处理问题向我们提出质疑或投诉。</li>
          </ul>
        </Section>

        <Section title="八、政策的更新">
          我们可能会不时更新本隐私政策。更新后的政策将在本页面上公布，重大变更会通过站内消息等方式通知您。请您定期查阅本页面。
        </Section>

        <Section title="九、联系方式">
          如您对本隐私政策有任何疑问或建议，请通过以下方式联系我们：
          <br />
          邮箱：support@arcle.local
          <br />
          平台内：设置 → 意见反馈
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h2 className="text-base font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
        {title}
      </h2>
      <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
        {children}
      </p>
    </div>
  );
}
