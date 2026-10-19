/** Thin D-candidate host. Reuses the existing normal-speed roster preview HTML;
 * no new animation engine, canonical asset writes, browser open or adoption.
 */
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { lstat, readFile, realpath } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const project = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const allowed = resolve('D:/one-piece-fighter-crossover-0922/roster-0929/six-game1014/candidate');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const requireValue = (value, message) => { if (!value) throw new Error(message); };
const regular = async path => {
  const info = await lstat(path);
  requireValue(info.isFile() && !info.isSymbolicLink() && (await realpath(path)).toLowerCase() === path.toLowerCase(), `拒绝链接或非常规文件：${path}`);
  return readFile(path);
};

async function main() {
  const args = process.argv.slice(2), options = {};
  if (args.includes('--help')) {
    console.log('node scripts/previewGear5Candidate1017.mjs --candidate <D:/.../six-game1014/candidate/<唯一目录>/build> --port <端口> [--check]\n只托管builder哈希匹配的五档候选；复用rosterPosePreview0929.html，不打开浏览器、不修改正式素材。');
    return;
  }
  for (let index = 0; index < args.length; index++) {
    const flag = args[index];
    requireValue(['--candidate', '--port', '--check', '--allow-partial'].includes(flag) && !(flag in options), `未知或重复参数：${flag}`);
    options[flag] = ['--check', '--allow-partial'].includes(flag) ? true : args[++index];
  }
  requireValue(typeof options['--candidate'] === 'string', '必须指定候选build目录');
  const root = resolve(options['--candidate']);
  requireValue(root.toLowerCase().startsWith((allowed + sep).toLowerCase()) && (await realpath(root)).toLowerCase() === root.toLowerCase()
    && !(await lstat(root)).isSymbolicLink(), '只允许D盘six-game1014/candidate真实子目录');
  const reportPath = resolve(root, 'build-report.json'), reportBytes = await regular(reportPath), reportHash = hash(reportBytes);
  const report = JSON.parse(reportBytes);
  requireValue(report.character === 'luffy' && report.status === 'validated-candidate-not-art-acceptance' && report.outputHashes, '缺少luffy候选build-report');
  const files = new Map();
  for (const [name, expected] of Object.entries(report.outputHashes)) {
    requireValue(/^(runtime\.json|atlas(?:-p\d+)?\.(png|json))$/.test(name) && /^[a-f0-9]{64}$/.test(expected), '只允许builder原PNG/runtime/atlas白名单');
    const bytes = await regular(resolve(root, name));
    requireValue(hash(bytes) === expected, `${name}与构建哈希不同`);
    files.set(`/assets/${name}`, { path: resolve(root, name), expected, bytes });
  }
  const runtime = JSON.parse(files.get('/assets/runtime.json')?.bytes ?? 'null');
  requireValue(runtime?.schemaVersion === 2 && runtime.characterId === 'luffy' && runtime.formId === 'gear5'
    && runtime.style === 'anime' && runtime.formEvidence?.review === 'candidate-not-accepted', '仅接受显式未采用五档候选，不借常态替代');
  const required = options['--allow-partial'] ? ['idle', 'st_a', 'hit_stand'] : ['idle', 'walk_fwd', 'st_a', 'hit_stand'];
  requireValue(required.every(name => runtime.anims?.[name]), '样板不完整；三动作候选必须显式--allow-partial');
  const missing = ['idle', 'walk_fwd', 'st_a', 'hit_stand'].filter(name => !runtime.anims?.[name]);
  for (const [name, anim] of Object.entries(runtime.anims)) {
    requireValue(Array.isArray(anim.exposures) && anim.exposures.length && anim.exposures.every(x => Number.isInteger(x.frame) && x.frame >= 0 && x.frame < anim.frames && Number.isInteger(x.ticks) && x.ticks > 0), `${name}缺实际60Hz时序`);
    for (let frame = 0; frame < anim.frames; frame++) {
      const key = `luffy/${name}/${frame}`, page = runtime.pages.find(p => p.id === runtime.framePages[key]);
      requireValue(page && files.has(`/assets/${page.image}`) && files.has(`/assets/${page.data}`), `缺实际页：${key}`);
      const atlas = JSON.parse(files.get(`/assets/${page.data}`).bytes), box = atlas.frames?.[key]?.frame, geometry = runtime.attachments?.[key];
      requireValue(box && box.w > 0 && box.h > 0 && box.x >= 0 && box.y >= 0 && box.x + box.w <= page.width && box.y + box.h <= page.height
        && geometry?.size?.width === box.w && geometry.size.height === box.h && Number.isFinite(geometry.root?.x) && Number.isFinite(geometry.root?.y), `帧边界/根点错误：${key}`);
    }
  }
  const summary = { root, formId: 'gear5', reportSha256: reportHash, animations: Object.keys(runtime.anims),
    normalSpeed: 'existing rosterPosePreview0929.html fixed60Hz exposures at1x', missingSampleActions: missing, adoption: false };
  if (options['--check']) { console.log(JSON.stringify(summary)); return; }
  requireValue(/^\d+$/.test(options['--port'] ?? '') && +options['--port'] > 0 && +options['--port'] <= 65535, '必须指定未占用--port');
  const port = +options['--port'], origin = `http://127.0.0.1:${port}`;
  const config = { character: 'luffy', runtimeUrl: '/assets/runtime.json', reportHash, textureDensity: runtime.textureDensity,
    pageCount: runtime.pages.length, animationCount: Object.keys(runtime.anims).length, kind: 'gear5-four-action-candidate-not-adoption' };
  const template = (await regular(resolve(project, 'scripts/rosterPosePreview0929.html'))).toString('utf8');
  const html = template.replace('__ROSTER_PREVIEW_CONFIG__', JSON.stringify(config).replaceAll('<', '\\u003c'))
    .replaceAll('内部动作预览', missing.length ? '五档三动作候选（走路未完成）' : '五档候选动作预览');
  const server = createServer(async (request, response) => {
    const reply = (status, body, type = 'text/plain; charset=utf-8') => {
      response.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'",
        'X-OPF-Gear5-Candidate': reportHash });
      response.end(request.method === 'HEAD' ? undefined : body);
    };
    if (request.headers.host !== `127.0.0.1:${port}` || (request.headers.origin && request.headers.origin !== origin)) { reply(403, 'Local preview only'); return; }
    if (!['GET', 'HEAD'].includes(request.method)) { reply(405, 'Read-only candidate'); return; }
    const name = (request.url ?? '/').split('?')[0], file = files.get(name);
    if (name !== '/' && !file) { reply(404, 'Not in explicit candidate whitelist'); return; }
    try {
      requireValue(hash(await regular(reportPath)) === reportHash, '候选已更新，停止并重启服务');
      if (name === '/') { reply(200, html, 'text/html; charset=utf-8'); return; }
      const bytes = await regular(file.path);
      requireValue(hash(bytes) === file.expected, '候选文件已改变或损坏');
      reply(200, bytes, name.endsWith('.png') ? 'image/png' : 'application/json; charset=utf-8');
    } catch (error) { reply(409, error.message); }
  });
  server.on('error', error => { console.error(error.message); process.exitCode = 1; });
  server.listen(port, '127.0.0.1', () => console.log(JSON.stringify({ ...summary, url: origin, browserOpened: false })));
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
