/*
 * BBCode 解析器：将论坛风格 BBCode 标签转为安全的 HTML。
 * 流程：先整体 HTML 转义（防注入），再按标签替换；
 * [code] 内不做任何标签解析（原始文本展示）。
 */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** 校验颜色值：只放行 #hex / 英文颜色名 / rgb(a) 形式，防止样式注入 */
function safeColor(v: string): string | null {
  const t = v.trim();
  if (/^#[0-9a-fA-F]{3,8}$/.test(t)) return t;
  if (/^[a-zA-Z]{3,20}$/.test(t)) return t;
  if (/^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(,\s*(0|1|0?\.\d+)\s*)?\)$/.test(t)) return t;
  return null;
}

/** 校验尺寸值：数字(8-100) 转像素 */
function safeSize(v: string): string | null {
  const t = v.trim();
  if (/^\d{1,3}$/.test(t)) return Math.min(100, Math.max(8, parseInt(t, 10))) + 'px';
  return null;
}

/** 安全链接：仅允许 http(s) / 相对路径 */
function safeUrl(v: string): string | null {
  const t = v.trim();
  if (/^(https?:\/\/|\/)[^\s"'<>]*$/i.test(t)) return t;
  return null;
}

export function renderBBCode(input: string): string {
  if (!input) return '';
  let html = escapeHtml(input);

  // [code]...[/code] 先抽出占位，避免内部被其它规则替换
  const codeBlocks: string[] = [];
  html = html.replace(/\[code\]([\s\S]*?)\[\/code\]/gi, (_match, inner: string) => {
    codeBlocks.push(
      '<pre class="bbcode-code">' + inner.replace(/^\n+|\n+$/g, '') + '</pre>'
    );
    return '\u0000CODE' + (codeBlocks.length - 1) + '\u0000';
  });

  const rules: Array<[RegExp, (...args: string[]) => string]> = [
    // [b][i][u][s]
    [/\[b\]([\s\S]*?)\[\/b\]/gi, (_m, p1) => '<strong>' + p1 + '</strong>'],
    [/\[i\]([\s\S]*?)\[\/i\]/gi, (_m, p1) => '<em>' + p1 + '</em>'],
    [/\[u\]([\s\S]*?)\[\/u\]/gi, (_m, p1) => '<u>' + p1 + '</u>'],
    [/\[s\]([\s\S]*?)\[\/s\]/gi, (_m, p1) => '<s>' + p1 + '</s>'],
    // [color=xxx]
    [/\[color=([^\]]+)\]([\s\S]*?)\[\/color\]/gi, (_m, p1, p2) => {
      const c = safeColor(p1);
      return c ? '<span style="color:' + c + '">' + p2 + '</span>' : p2;
    }],
    // [size=n]
    [/\[size=([^\]]+)\]([\s\S]*?)\[\/size\]/gi, (_m, p1, p2) => {
      const s = safeSize(p1);
      return s ? '<span style="font-size:' + s + '">' + p2 + '</span>' : p2;
    }],
    // [url=...]text[/url] 与 [url]...[/url]
    [/\[url=([^\]]+)\]([\s\S]*?)\[\/url\]/gi, (_m, p1, p2) => {
      const u = safeUrl(p1);
      return u ? '<a href="' + u + '" target="_blank" rel="noopener noreferrer">' + p2 + '</a>' : p2;
    }],
    [/\[url\]([\s\S]*?)\[\/url\]/gi, (_m, p1) => {
      const u = safeUrl(p1);
      return u ? '<a href="' + u + '" target="_blank" rel="noopener noreferrer">' + u + '</a>' : p1;
    }],
    // [img]url[/img]
    [/\[img\]([\s\S]*?)\[\/img\]/gi, (_m, p1) => {
      const u = safeUrl(p1);
      return u
        ? '<img src="' + u + '" alt="图片" class="bbcode-img" loading="lazy" />'
        : p1;
    }],
    // [quote] 与 [quote=作者]
    [/\[quote=([^\]]*)\]([\s\S]*?)\[\/quote\]/gi, (_m, p1, p2) =>
      '<blockquote class="bbcode-quote"><span class="bbcode-quote-author">' + p1 + '：</span>' + p2 + '</blockquote>'],
    [/\[quote\]([\s\S]*?)\[\/quote\]/gi, (_m, p1) => '<blockquote class="bbcode-quote">' + p1 + '</blockquote>'],
    // [center]
    [/\[center\]([\s\S]*?)\[\/center\]/gi, (_m, p1) => '<div style="text-align:center">' + p1 + '</div>'],
    // [list][*]..[/list]
    [/\[list\]([\s\S]*?)\[\/list\]/gi, (_m, p1) => {
      const items = p1
        .split(/\[\*\]/)
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => '<li>' + s + '</li>')
        .join('');
      return items ? '<ul class="bbcode-list">' + items + '</ul>' : '';
    }],
  ];

  for (const [re, fn] of rules) {
    html = html.replace(re, fn as any);
  }

  // 未闭合的残留标签去掉方括号形式，避免裸露
  html = html.replace(/\[\/?(?:b|i|u|s|color|size|url|img|quote|center|list)\b[^\]]*\]/gi, '');

  // 还原 code 块
  html = html.replace(/\u0000CODE(\d+)\u0000/g, (_m, i: string) => codeBlocks[Number(i)] ?? '');

  // 裸链接转可点击（跳过已生成的属性值）
  html = html.replace(/(^|>|\s)(https?:\/\/[^\s<]+)/g, (m, pre: string, url: string) => {
    if (pre === '"' || pre === "'") return m;
    return pre + '<a href="' + url + '" target="_blank" rel="noopener noreferrer">' + url + '</a>';
  });

  // 换行
  html = html.replace(/\n/g, '<br/>');
  return html;
}
