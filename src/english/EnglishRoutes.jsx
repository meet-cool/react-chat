import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import WordBook from './pages/WordBook';
import WrongWords from './pages/WrongWords';
import WrongWordsExam from './pages/WrongWordsExam';
import Profile from './pages/Profile';
import Points from './pages/Points';
import Console from './pages/Console';

// 七大模块学习页（共用 LearnModule 核心逻辑，独立路由）
import ListenWordPage from '@eng/learn/pages/ListenWordPage';
import ListenMeaningPage from '@eng/learn/pages/ListenMeaningPage';
import WordSelectPage from '@eng/learn/pages/WordSelectPage';
import MeaningSelectPage from '@eng/learn/pages/MeaningSelectPage';
import DictationPage from '@eng/learn/pages/DictationPage';
import WritePage from '@eng/learn/pages/WritePage';
// 综合测试：考试模式（答题卡 + 后端判分）
import AnswerSheet from '@eng/learn/AnswerSheet';

// 模块补充样式（选项状态 / 结算动画等，主站 index.css 之外的部分）
import './english.css';

/**
 * english（英语背单词）模块路由
 *
 * - 由主站 App.tsx 以 <Route path="/english/*"> 嵌套挂载；
 * - 账号体系统一（SSO）：模块不再有自己的登录/注册页，
 *   未登录访问受保护页面时跳转主站 /login?redirect=...，登录后回到原页；
 * - 管理后台与教学面板合并为 /english/admin（Console）。
 */
function EnglishShell() {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-[var(--color-text-muted)]">加载中...</div>
            </div>
        );
    }

    // 未登录：跳主站登录页，登录后回到当前页
    if (!user) {
        const redirect = encodeURIComponent(location.pathname + location.search);
        return <Navigate to={`/login?redirect=${redirect}`} replace />;
    }

    return (
        <Routes>
            <Route path="/" element={<Layout />}>
                <Route index element={<Home />} />
                <Route path="wordbook" element={<WordBook />} />
                {/* 兼容旧三段路径：默认跳看词选意 */}
                <Route path="learn/:unitId/:partId" element={<WordSelectPage />} />
                {/* 六大基础模块独立页面 */}
                <Route path="learn/:unitId/:partId/listen_word" element={<ListenWordPage />} />
                <Route path="learn/:unitId/:partId/listen_meaning" element={<ListenMeaningPage />} />
                <Route path="learn/:unitId/:partId/word_select" element={<WordSelectPage />} />
                <Route path="learn/:unitId/:partId/meaning_select" element={<MeaningSelectPage />} />
                <Route path="learn/:unitId/:partId/dictation" element={<DictationPage />} />
                <Route path="learn/:unitId/:partId/write" element={<WritePage />} />
                {/* 综合测试（考试模式） */}
                <Route path="learn/:unitId/:partId/test" element={<AnswerSheet />} />
                <Route path="wrong-words" element={<WrongWords />} />
                <Route path="wrong-words-exam" element={<WrongWordsExam />} />
                <Route path="profile" element={<Profile />} />
                <Route path="points" element={<Points />} />
            </Route>

            {/* 管理后台 + 教学面板（合并页） */}
            <Route path="admin" element={<Console />} />
            {/* 兼容旧地址 */}
            <Route path="panel" element={<Navigate to="/english/admin" replace />} />

            <Route
                path="*"
                element={
                    <div className="max-w-xl mx-auto px-4 py-20 text-center">
                        <h2 className="text-xl font-semibold mb-4">页面不存在</h2>
                        <a href="/english" className="btn btn-primary">返回主页</a>
                    </div>
                }
            />
        </Routes>
    );
}

export default function EnglishRoutes() {
    return (
        <ThemeProvider>
            <AuthProvider>
                <EnglishShell />
            </AuthProvider>
        </ThemeProvider>
    );
}
