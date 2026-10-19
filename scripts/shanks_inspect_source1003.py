"""Read-only source diagnostics for the single Shanks completion task.

This does not draw or repair runtime art. Diagnostic composites stay on D:.
"""
from pathlib import Path
import json
import sys
from array import array
from collections import Counter, deque
from PIL import Image

source = Path(sys.argv[1]) if len(sys.argv) > 1 else Path('C:/Users/august/Downloads/香克斯六连跳跃动作精灵图.png')
image = Image.open(source).convert('RGBA')
alpha = image.getchannel('A')
width, height = image.size
mask = bytearray(1 if value >= 8 else 0 for value in alpha.tobytes())
labels = array('I', [0]) * len(mask)
report = []
component = 0
for seed in range(len(mask)):
    if not mask[seed]:
        continue
    component += 1
    mask[seed] = 0
    queue = deque([seed])
    area = 0
    left, top, right, bottom = width, height, 0, 0
    while queue:
        p = queue.popleft()
        labels[p] = component
        y, x = divmod(p, width)
        area += 1
        left, top, right, bottom = min(left, x), min(top, y), max(right, x + 1), max(bottom, y + 1)
        candidates = []
        if x: candidates.append(p - 1)
        if x + 1 < width: candidates.append(p + 1)
        if y: candidates.append(p - width)
        if y + 1 < height: candidates.append(p + width)
        for neighbor in candidates:
            if mask[neighbor]:
                mask[neighbor] = 0
                queue.append(neighbor)
    if area >= 300:
        report.append({'component': component, 'area': area, 'bbox': [left, top, right, bottom], 'width': right - left, 'height': bottom - top})
components = sorted(report, key=lambda r:r['area'], reverse=True)
if len(sys.argv) < 3:
    print(json.dumps(components, ensure_ascii=False))
else:
    root = Path(__file__).resolve().parents[1]
    measurement = json.loads(Path(sys.argv[2]).read_text(encoding='utf-8'))
    catalog = json.loads((root / 'scripts/roster_pirate_sources0929.json').read_text(encoding='utf-8'))['sources']
    major = {entry['component'] for entry in components}
    checks = []
    for name, frame in measurement['frames'].items():
        if (root / catalog[frame['source']]['file']).resolve() != source.resolve():
            continue
        x, y, w, h = frame['crop']
        counts = Counter()
        for row in range(y, y + h):
            counts.update(labels[row * width + x:row * width + x + w])
        counts.pop(0, None)
        target = counts.most_common(1)[0][0]
        erased = Counter()
        for ex, ey, ew, eh in frame.get('excludeRects', []):
            for row in range(y + ey, y + ey + eh):
                erased.update(labels[row * width + x + ex:row * width + x + ex + ew])
        remaining_neighbors = {str(label): count - erased[label] for label, count in counts.items() if label != target and label in major and count > erased[label]}
        neighbor_bounds = {}
        for remaining in remaining_neighbors:
            wanted = int(remaining)
            px, py, qx, qy = w, h, 0, 0
            for local_y in range(h):
                for local_x in range(w):
                    if labels[(y + local_y) * width + x + local_x] != wanted:
                        continue
                    if any(ex <= local_x < ex + ew and ey <= local_y < ey + eh for ex, ey, ew, eh in frame.get('excludeRects', [])):
                        continue
                    px, py, qx, qy = min(px, local_x), min(py, local_y), max(qx, local_x + 1), max(qy, local_y + 1)
            neighbor_bounds[remaining] = [px, py, qx - px, qy - py]
        checks.append({'frame': name, 'targetComponent': target, 'targetAlpha8Pixels': counts[target], 'targetAlpha8PixelsErased': erased[target], 'remainingMajorNeighborAlpha8Pixels': remaining_neighbors, 'remainingNeighborRectBounds': neighbor_bounds})
    print(json.dumps({'components': components, 'cropChecks': checks, 'kind': 'alpha8-component-diagnostic-not-art-or-contact-acceptance'}, ensure_ascii=False))
