/** Read-only, character-scoped animation viewer. This is not a FightScene or gameplay test. */
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { lstat, readFile, realpath } from 'node:fs/promises';
import { dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const filePattern = /^(?:runtime\.json|atlas(?:-p\d+)?\.(?:png|json))$/;
const hashPattern = /^[a-f0-9]{64}$/;
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const requireValue = (condition, message) => { if (!condition) throw new Error(message); };
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const positive = value => Number.isInteger(value) && value > 0;
const samePath = (a, b) => process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b;

function options(argv) {
  if (argv.includes('--help') || argv.includes('-h')) return null;
  const result = {};
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index], value = argv[index + 1];
    requireValue(['--character', '--port'].includes(flag) && value && !value.startsWith('--') && !(flag in result), `无效或重复参数：${flag ?? ''}`);
    result[flag] = value;
  }
  requireValue(/^[a-z][a-z0-9_]*$/.test(result['--character'] ?? ''), '必须显式指定 --character <角色ID>。');
  requireValue(/^\d+$/.test(result['--port'] ?? '') && Number(result['--port']) > 0 && Number(result['--port']) <= 65535, '必须显式指定 --port <1—65535的未占用端口>。');
  return { character: result['--character'], port: Number(result['--port']) };
}

async function regularFile(path) {
  const info = await lstat(path);
  requireValue(info.isFile() && !info.isSymbolicLink() && samePath(await realpath(path), path), `拒绝链接或非常规文件：${path}`);
  return readFile(path);
}

function validateRuntime(character, runtime, jsonFiles, pngSizes) {
  requireValue(record(runtime) && [1, 2].includes(runtime.schemaVersion) && runtime.characterId === character && runtime.style === 'anime', 'runtime.json 的角色或结构不匹配。');
  const density = runtime.textureDensity ?? 1;
  requireValue(Number.isFinite(density) && density > 0 && density <= 4, 'textureDensity 无效。');
  const pages = runtime.schemaVersion === 2 ? runtime.pages : [{ id: 'p0', ...runtime.atlas }];
  requireValue(Array.isArray(pages) && pages.length > 0, '没有实际图集页。');
  const pageMap = new Map();
  for (const page of pages) {
    requireValue(record(page) && /^p\d+$/.test(page.id ?? '') && !pageMap.has(page.id), '图集页ID无效或重复。');
    requireValue(jsonFiles.has(page.data) && pngSizes.has(page.image), `图集页未列入 build-report 白名单：${page.id}`);
    const atlas = jsonFiles.get(page.data), size = pngSizes.get(page.image);
    requireValue(record(atlas.frames) && atlas.meta?.image === page.image && atlas.meta?.size?.w === size.width && atlas.meta?.size?.h === size.height, `${page.id} 图集尺寸或图片引用不匹配。`);
    if (runtime.schemaVersion === 2) requireValue(page.width === size.width && page.height === size.height, `${page.id} runtime 尺寸不匹配。`);
    pageMap.set(page.id, { atlas, size });
  }
  requireValue(record(runtime.anims) && Object.keys(runtime.anims).length > 0 && record(runtime.attachments), '没有已构建动画或根点记录。');
  const validateFrame = name => {
    const page = pageMap.get(runtime.schemaVersion === 2 ? runtime.framePages?.[name] : 'p0');
    const packed = page?.atlas.frames[name], geometry = runtime.attachments[name], box = packed?.frame;
    requireValue(page && record(box) && packed.rotated === false && packed.trimmed === false, `缺帧或不支持的旋转/裁边：${name}`);
    requireValue(Number.isInteger(box.x) && box.x >= 0 && Number.isInteger(box.y) && box.y >= 0 && positive(box.w) && positive(box.h)
      && box.x + box.w <= page.size.width && box.y + box.h <= page.size.height, `图集帧越界：${name}`);
    requireValue(geometry?.size?.width === box.w && geometry?.size?.height === box.h && Number.isFinite(geometry?.root?.x) && Number.isFinite(geometry?.root?.y), `根点/帧尺寸无效：${name}`);
  };
  for (const [name, animation] of Object.entries(runtime.anims)) {
    requireValue(/^[a-z][a-z0-9_]*$/.test(name) && record(animation) && positive(animation.frames) && typeof animation.loop === 'boolean', `动画记录无效：${name}`);
    requireValue(Array.isArray(animation.exposures) && animation.exposures.length > 0 && animation.exposures.every(exposure => record(exposure)
      && Number.isInteger(exposure.frame) && exposure.frame >= 0 && exposure.frame < animation.frames && positive(exposure.ticks)), `动画缺少真实60Hz时序：${name}`);
    for (let index = 0; index < animation.frames; index++) {
      const frame = `${character}/${name}/${index}`;
      validateFrame(frame);
      const foreground = runtime.foregroundFrames?.[frame];
      if (foreground !== undefined) { requireValue(typeof foreground === 'string', `前景帧名无效：${frame}`); validateFrame(foreground); }
    }
  }
  return { pages, density };
}

async function start({ character, port }) {
  const root = resolve(projectRoot, 'public/assets/characters', character, 'anime');
  requireValue(samePath(await realpath(root), root) && !(await lstat(root)).isSymbolicLink(), '角色目录不能使用链接或目录联接。');
  const reportPath = resolve(root, 'build-report.json');
  const reportBytes = await regularFile(reportPath), reportHash = hash(reportBytes);
  const report = JSON.parse(reportBytes.toString('utf8'));
  requireValue(report.character === character && record(report.outputHashes) && Object.keys(report.outputHashes).length > 0, 'build-report.json 角色或输出清单无效。');
  const files = new Map(), jsonFiles = new Map(), pngSizes = new Map();
  for (const [name, expectedHash] of Object.entries(report.outputHashes)) {
    requireValue(filePattern.test(name) && typeof expectedHash === 'string' && hashPattern.test(expectedHash), `拒绝图集白名单以外的文件：${name}`);
    const path = resolve(root, name), bytes = await regularFile(path);
    requireValue(hash(bytes) === expectedHash, `${name} 与 build-report 的 SHA256 不一致；请先完成图集构建。`);
    if (extname(name) === '.json') jsonFiles.set(name, JSON.parse(bytes.toString('utf8')));
    else {
      requireValue(bytes.length >= 24 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) && bytes.toString('ascii', 12, 16) === 'IHDR', `${name} 不是原PNG图集。`);
      pngSizes.set(name, { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) });
    }
    files.set(`/assets/${name}`, { path, expectedHash, size: bytes.length, type: extname(name) === '.json' ? 'application/json; charset=utf-8' : 'image/png' });
  }
  const runtime = jsonFiles.get('runtime.json');
  const { pages, density } = validateRuntime(character, runtime, jsonFiles, pngSizes);
  const previewConfig = { character, runtimeUrl: '/assets/runtime.json', reportHash, textureDensity: density, pageCount: pages.length,
    animationCount: Object.keys(runtime.anims).length, kind: 'internal-pose-preview-not-gameplay-acceptance' };
  const template = await regularFile(resolve(projectRoot, 'scripts/rosterPosePreview0929.html'));
  const html = Buffer.from(template.toString('utf8').replace('__ROSTER_PREVIEW_CONFIG__', JSON.stringify(previewConfig).replaceAll('<', '\\u003c')), 'utf8');
  const origin = `http://127.0.0.1:${port}`;
  const server = createServer(async (request, response) => {
    const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'X-OPF-Pose-Preview': reportHash,
      'Content-Security-Policy': "default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'" };
    const reply = (status, body, type = 'text/plain; charset=utf-8') => {
      response.writeHead(status, { ...headers, 'Content-Type': type, 'Content-Length': Buffer.byteLength(body) });
      response.end(request.method === 'HEAD' ? undefined : body);
    };
    if (request.headers.host !== `127.0.0.1:${port}` || (request.headers.origin && request.headers.origin !== origin)) { reply(403, 'Local preview origin only'); return; }
    if (!['GET', 'HEAD'].includes(request.method ?? '')) { response.setHeader('Allow', 'GET, HEAD'); reply(405, 'Read-only preview'); return; }
    let pathname;
    try { pathname = decodeURIComponent((request.url ?? '/').split('?')[0]); }
    catch { reply(400, 'Invalid path'); return; }
    if (!pathname.startsWith('/') || pathname.includes('\\') || pathname.includes('\0') || pathname.split('/').some(part => part === '.' || part === '..')) { reply(400, 'Invalid path'); return; }
    const file = files.get(pathname), isPage = pathname === '/' || pathname === '/index.html';
    if (!file && !isPage) { reply(404, 'Not in this character preview'); return; }
    try {
      requireValue(hash(await regularFile(reportPath)) === reportHash, '图集构建已更新，请停止并重启此预览服务。');
      if (isPage) { reply(200, html, 'text/html; charset=utf-8'); return; }
      const bytes = await regularFile(file.path);
      requireValue(bytes.length === file.size && hash(bytes) === file.expectedHash, '图集文件已更新或损坏，请重新构建后重启预览。');
      reply(200, bytes, file.type);
    } catch (error) { reply(409, error.message); }
  });
  server.on('error', error => {
    console.error(error.code === 'EADDRINUSE' ? `端口 ${port} 已占用；请另选 --port。此工具不会复用或终止旧服务。` : error.message);
    process.exitCode = 1;
  });
  server.listen(port, '127.0.0.1', () => {
    console.log(`内部动作预览 · 不含战斗判定/声音：${origin}/`);
    console.log(`${character} · ${Object.keys(runtime.anims).length} 个真实动画 · ${pages.length} 页图集 · report ${reportHash.slice(0, 12)}`);
    console.log('左右移动；A 出拳；H 受击；F 镜像；空格暂停；. 单步。图集更新后重启。Ctrl+C 停止本服务。');
  });
}

try {
  const args = options(process.argv.slice(2));
  if (!args) console.log('用法：node scripts/previewRosterPoses0929.mjs --character <id> --port <未占用端口>\n仅读取该角色 build-report.json 校验通过的 runtime/atlas JSON与PNG。内部动作预览，不构建、不生成素材、不代表游戏验收。');
  else await start(args);
} catch (error) {
  console.error(`无法启动内部动作预览：${error.message}`);
  process.exitCode = 1;
}
