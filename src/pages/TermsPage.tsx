import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function TermsPage() {
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
        <h1 className="text-base font-bold" style={{ color: 'var(--color-text)' }}>服务条款</h1>
      </div>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>
          最后更新日期：2026年8月
        </p>

        <Section title="一、接受条款">
          欢迎使用 Arcle 聊天互联平台。使用本服务即表示您同意本服务条款。如果您未满18周岁，请在监护人陪同下阅读本条款。我们保留随时修改本条款的权利，修改后的条款将在页面公布后生效。
        </Section>

        <Section title="二、账号注册">
          注册账号需提供真实有效的信息，包括但不限于用户名、邮箱、密码。您应当对账号下的所有行为负责，不得将账号转让、出借给他人使用。如发现账号被盗用，请及时联系我们。
        </Section>

        <Section title="三、用户行为规范">
          <ul className="list-disc pl-5 space-y-1.5">
            <li>不得发布违反法律法规的内容；</li>
            <li>不得发布歧视、侮辱、诽谤他人或组织的内容；</li>
            <li>不得发布侵犯他人隐私或个人信息的内容；</li>
            <li>不得发送垃圾信息、恶意刷屏或大量重复内容；</li>
            <li>不得冒充他人或使用虚假身份；</li>
            <li>不得利用本平台从事诈骗、传销等违法活动；</li>
            <li>不得干扰平台正常运行或破坏他人正常使用。</li>
          </ul>
        </Section>

        <Section title="四、内容责任">
          用户自行发布的内容（包括文字、图片、表情等）由发布用户承担法律责任。平台有权对违规内容进行删除、屏蔽，并视情节对用户采取警告、限制功能、暂停或永久封禁账号等措施。
        </Section>

        <Section title="五、隐私保护">
          我们重视您的隐私。用户个人信息（邮箱、QQ号等）仅用于账号注册和身份验证，不会向第三方出售或泄露。详见我们的<Link to="/privacy">《隐私政策》</Link>。
        </Section>

        <Section title="六、知识产权">
          平台所有内容（包括但不限于文字、图片、图形、界面设计、代码）的知识产权归 Arcle 平台所有。未经书面授权，任何个人或组织不得以任何形式复制、传播或用于商业用途。
        </Section>

        <Section title="七、免责声明">
          平台不对用户之间的交易、交流行为承担责任。用户因信赖或依赖平台信息而做出的任何决策，风险由用户自行承担。平台尽力保证服务的连续性和安全性，但不保证服务无任何中断或错误。
        </Section>

        <Section title="八、服务变更与终止">
          平台有权根据运营需要调整服务内容、功能或收费标准。如您不同意变更后的条款，可停止使用本服务。平台亦有权在提前通知后终止对您账号的服务。
        </Section>

        <Section title="九、联系方式">
          如对本服务条款有任何疑问，请通过平台内反馈功能或发送邮件至：support@arcle.local。
        </Section>

        <Section title="十、其他">
          本条款的解释权归 Arcle 平台所有。本条款的订立、执行和解释及争议的解决均适用中华人民共和国法律。
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

function Link({ to, children }: { to: string; children: React.ReactNode }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(to)}
      className="underline"
      style={{ color: 'var(--color-primary)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 'inherit' }}
    >
      {children}
    </button>
  );
}
