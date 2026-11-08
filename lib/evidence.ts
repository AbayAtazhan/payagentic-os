// Collects evidence from what the freelancer delivered: a live website or a public GitHub repo.
// The result is plain text for the verification agent. Everything here is untrusted content
// written by the party who wants to be paid, and the prompt treats it that way.

import dns from 'dns/promises';
import net from 'net';

export type Evidence = {
  kind: 'website' | 'github';
  url: string;
  title: string;
  report: string; // structured text handed to the AI
  hiddenText: string[]; // text a human visitor would not see (used to spot prompt injection)
};

const MAX_BYTES = 1_500_000;
const MAX_REPORT = 14_000;

function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return (
      a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127)
    );
  }
  const v6 = ip.toLowerCase();
  return v6 === '::1' || v6 === '::' || v6.startsWith('fc') || v6.startsWith('fd') || v6.startsWith('fe80') || v6.startsWith('::ffff:127.');
}

async function assertPublicUrl(raw: string, selfOrigin: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('That is not a valid URL');
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error('Only http(s) links can be checked');
  // ProofPay's own sample deliveries are always allowed, including on localhost.
  if (url.origin === selfOrigin) return url;
  const { address } = await dns.lookup(url.hostname).catch(() => {
    throw new Error(`Could not resolve ${url.hostname}`);
  });
  if (isPrivateIp(address)) throw new Error('Links to private or local network addresses are not allowed');
  return url;
}

async function fetchText(url: string, accept = 'text/html,application/xhtml+xml'): Promise<{ text: string; finalUrl: string; status: number }> {
  const headers: Record<string, string> = { 'User-Agent': 'ProofPay-Verifier/1.0 (+https://github.com/AbayAtazhan/payagentic-os)', Accept: accept };
  if (url.startsWith('https://api.github.com') && process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const res = await fetch(url, { headers, redirect: 'follow', signal: AbortSignal.timeout(15_000), cache: 'no-store' });
  const buf = await res.arrayBuffer();
  return { text: new TextDecoder().decode(buf.slice(0, MAX_BYTES)), finalUrl: res.url || url, status: res.status };
}

const decodeEntities = (s: string) =>
  s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));

const stripTags = (s: string) => decodeEntities(s.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

function attr(tag: string, name: string): string | undefined {
  const m = tag.match(new RegExp(`${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'));
  return m ? decodeEntities(m[2] ?? m[3] ?? m[4] ?? '') : undefined;
}

function analyzeHtml(html: string, url: string): Evidence {
  const title = stripTags(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '') || url;
  const metaDescription = attr(html.match(/<meta[^>]+name=["']description["'][^>]*>/i)?.[0] ?? '', 'content');
  const hasViewport = /<meta[^>]+name=["']viewport["'][^>]*>/i.test(html);
  const lang = attr(html.match(/<html[^>]*>/i)?.[0] ?? '', 'lang');

  // Text a visitor can't see: hidden elements, HTML comments, tiny or transparent text.
  const hiddenText: string[] = [];
  for (const m of html.matchAll(/<!--([\s\S]*?)-->/g)) {
    const t = m[1].trim();
    if (t.length > 15) hiddenText.push(`HTML comment: ${t.slice(0, 400)}`);
  }
  for (const m of html.matchAll(
    /<(\w+)[^>]*(?:hidden|aria-hidden=["']true["']|display\s*:\s*none|visibility\s*:\s*hidden|font-size\s*:\s*0|opacity\s*:\s*0(?![.\d]))[^>]*>([\s\S]*?)<\/\1>/gi,
  )) {
    const t = stripTags(m[2]);
    if (t.length > 15) hiddenText.push(`Hidden element: ${t.slice(0, 400)}`);
  }

  const body = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');

  const headings = [...body.matchAll(/<h([1-4])[^>]*>([\s\S]*?)<\/h\1>/gi)]
    .map((m) => `${'#'.repeat(Number(m[1]))} ${stripTags(m[2])}`)
    .filter((h) => h.length > 2)
    .slice(0, 60);
  const links = [...body.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/gi)]
    .map((m) => {
      const href = attr(m[0], 'href') ?? '';
      return `[${stripTags(m[1]).slice(0, 80) || '(no text)'}](${href.slice(0, 200)})`;
    })
    .slice(0, 80);
  const images = [...body.matchAll(/<img\b[^>]*>/gi)].map((m) => `image alt="${attr(m[0], 'alt') ?? ''}"`).slice(0, 40);
  const forms = [...body.matchAll(/<(input|textarea|select|button)\b[^>]*>/gi)]
    .map((m) => {
      const t = m[0];
      return `${m[1].toLowerCase()} type=${attr(t, 'type') ?? '-'} name=${attr(t, 'name') ?? '-'} placeholder="${attr(t, 'placeholder') ?? ''}"${/\brequired\b/i.test(t) ? ' required' : ''}`;
    })
    .slice(0, 40);
  const text = stripTags(body.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] ?? body);
  const looksClientRendered = text.length < 200 && /<script/i.test(html);

  const report = [
    `SOURCE: live website ${url}`,
    `TITLE: ${title}`,
    metaDescription ? `META DESCRIPTION: ${metaDescription}` : null,
    `LANG: ${lang ?? 'not set'} | MOBILE VIEWPORT META: ${hasViewport ? 'present' : 'missing'}`,
    looksClientRendered ? 'NOTE: page renders mostly with JavaScript; visible text below may be incomplete.' : null,
    `\nHEADINGS:\n${headings.join('\n') || '(none)'}`,
    `\nLINKS:\n${links.join('\n') || '(none)'}`,
    `\nIMAGES (${images.length}):\n${images.join('\n') || '(none)'}`,
    `\nFORM FIELDS:\n${forms.join('\n') || '(none)'}`,
    `\nVISIBLE TEXT:\n${text}`,
  ]
    .filter(Boolean)
    .join('\n');

  return { kind: 'website', url, title, report: report.slice(0, MAX_REPORT), hiddenText: hiddenText.slice(0, 10) };
}

// Full file list; for very large repos (response too big to parse) only the top level.
async function listFiles(api: string, branch: string): Promise<string[]> {
  const parse = (text: string, all: boolean) => {
    const t = JSON.parse(text) as { tree?: { path: string; type: string }[] };
    return (t.tree ?? []).filter((n) => all || n.type === 'blob').map((n) => (n.type === 'tree' ? `${n.path}/` : n.path));
  };
  const ref = encodeURIComponent(branch);
  const recursive = await fetchText(`${api}/git/trees/${ref}?recursive=1`, 'application/vnd.github+json');
  try {
    if (recursive.status === 200) return parse(recursive.text, false);
  } catch {
    // fall through to the top level
  }
  const top = await fetchText(`${api}/git/trees/${ref}`, 'application/vnd.github+json');
  try {
    return top.status === 200 ? parse(top.text, true) : [];
  } catch {
    return [];
  }
}

async function analyzeGithub(owner: string, repo: string, url: string): Promise<Evidence> {
  const api = `https://api.github.com/repos/${owner}/${repo}`;
  const metaRes = await fetchText(api, 'application/vnd.github+json');
  if (metaRes.status === 404) throw new Error(`GitHub repo ${owner}/${repo} not found or private`);
  if (metaRes.status === 403) throw new Error('GitHub rate limit reached, try again in a minute');
  const meta = JSON.parse(metaRes.text) as {
    full_name: string;
    description?: string;
    language?: string;
    default_branch: string;
    pushed_at?: string;
    license?: { spdx_id?: string } | null;
    homepage?: string;
    topics?: string[];
  };

  const [readme, tree] = await Promise.all([
    fetchText(`${api}/readme`, 'application/vnd.github.raw+json').then((r) => (r.status === 200 ? r.text : '')),
    listFiles(api, meta.default_branch),
  ]);

  const manifest = tree.find((p) => p === 'package.json') ?? tree.find((p) => /^(requirements\.txt|pyproject\.toml|go\.mod|Cargo\.toml)$/.test(p));
  const manifestText = manifest
    ? await fetchText(`${api}/contents/${manifest}`, 'application/vnd.github.raw+json').then((r) => (r.status === 200 ? r.text.slice(0, 2500) : ''))
    : '';
  const tests = tree.filter((p) => /(^|\/)(__tests__|tests?|spec)\/|\.(test|spec)\.[jt]sx?$|_test\.(go|py)$/.test(p));

  const report = [
    `SOURCE: public GitHub repository ${url}`,
    `REPO: ${meta.full_name} | language: ${meta.language ?? '-'} | license: ${meta.license?.spdx_id ?? 'none'} | last push: ${meta.pushed_at ?? '-'}`,
    meta.description ? `DESCRIPTION: ${meta.description}` : null,
    meta.homepage ? `HOMEPAGE: ${meta.homepage}` : null,
    `FILES (${tree.length} total, ${tests.length} test files):\n${tree.slice(0, 250).join('\n')}`,
    manifest ? `\n${manifest}:\n${manifestText}` : null,
    `\nREADME:\n${readme.slice(0, 6000) || '(no README)'}`,
  ]
    .filter(Boolean)
    .join('\n');

  const hiddenText = [...readme.matchAll(/<!--([\s\S]*?)-->/g)].map((m) => `README comment: ${m[1].trim().slice(0, 400)}`).filter((t) => t.length > 30);
  return { kind: 'github', url, title: meta.full_name, report: report.slice(0, MAX_REPORT), hiddenText };
}

export async function collectEvidence(rawUrl: string, selfOrigin: string): Promise<Evidence> {
  const url = await assertPublicUrl(rawUrl.trim(), selfOrigin);
  if (url.hostname === 'github.com' || url.hostname === 'www.github.com') {
    const [owner, repo] = url.pathname.split('/').filter(Boolean);
    if (owner && repo) return analyzeGithub(owner, repo.replace(/\.git$/, ''), url.toString());
  }
  // Follow redirects by hand so every hop is checked against private addresses too.
  let current = url;
  for (let hop = 0; hop < 4; hop++) {
    const res = await fetch(current, {
      headers: { 'User-Agent': 'ProofPay-Verifier/1.0', Accept: 'text/html,application/xhtml+xml' },
      redirect: 'manual',
      signal: AbortSignal.timeout(15_000),
      cache: 'no-store',
    });
    const location = res.headers.get('location');
    if (res.status >= 300 && res.status < 400 && location) {
      current = await assertPublicUrl(new URL(location, current).toString(), selfOrigin);
      continue;
    }
    if (res.status >= 400) throw new Error(`The delivered link returned HTTP ${res.status}`);
    const html = new TextDecoder().decode((await res.arrayBuffer()).slice(0, MAX_BYTES));
    return analyzeHtml(html, current.toString());
  }
  throw new Error('The delivered link redirects too many times');
}
