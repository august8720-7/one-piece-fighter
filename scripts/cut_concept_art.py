"""
从 assets-src/characters/<id>/*.jpg 设定图裁切姿势，生成正式图集：
  public/assets/characters/<id>/atlas.png + atlas.json  (TexturePacker JSON Hash，逐帧 pivot)

流程：按坐标裁切 → 擦除标题文字区 → 从裁切框边缘泛洪抠掉背景（纸纹 / 灰底 / 灰色剪影）
    → 去边 → 按目标身高缩放 → 每帧按内容尺寸入图集，pivot 指向脚底中心
    → 按 frames.json 铺满全部动画帧 / 招式帧（招式的启动 / 命中 / 收招各配一张姿势）。

运行：npm run gen:atlas   （= vite-node scripts/export-frames.ts && python scripts/cut_concept_art.py）
依赖：Pillow
"""
from __future__ import annotations

import json
import os
import sys
from collections import deque
from dataclasses import dataclass, field

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "assets-src")
OUT = os.path.join(ROOT, "public", "assets", "characters")

Box = tuple[int, int, int, int]


@dataclass
class Pose:
    src: str            # 源图文件名
    box: Box            # 裁切框 (x0, y0, x1, y1)，源图坐标
    h: int              # 目标高度（像素，去边后的包围盒高度）
    anchor: float = 0.5  # 脚底中心在包围盒宽度上的比例（伸长手臂的姿势 < 0.5）
    rotate: int = 0     # 逆时针旋转角度（倒地用 90）
    bg: str = "paper"   # 背景：paper（浅色纸）/ dark（深灰）
    erase: list[Box] = field(default_factory=list)  # 源图坐标下要清空的区域（标题文字等）
    # 拼接段：把源图另一处（同一行，y 对齐）的内容接到主裁切框右侧，用于把过长的手臂缩短：
    # 主框只取到手臂前半段，再把拳头接上来
    append: list[Box] = field(default_factory=list)


@dataclass
class CharConfig:
    poses: dict[str, Pose]
    anims: dict[str, list[str]]                       # 状态动画 → 每帧姿势名（不足则重复最后一个）
    moves: dict[str, tuple[str, str, str]]            # 招式 → (启动, 命中, 收招)；'*' 默认


# ---------------------------------------------------------------- 配置

LUFFY = CharConfig(
    poses={
        "idle": Pose("sheet.jpg", (556, 12, 692, 306), 96),
        "hero": Pose("sheet.jpg", (40, 70, 545, 835), 100, anchor=0.45),
        "jump_kick": Pose("sheet.jpg", (566, 612, 805, 780), 86, anchor=0.4),
        "punch_start": Pose("moves.jpg", (36, 58, 160, 222), 92),
        "punch_stretch": Pose("moves.jpg", (150, 52, 400, 222), 92, anchor=0.2, erase=[(300, 40, 640, 96)], append=[(618, 52, 782, 222)]),
        "gatling_start": Pose("moves.jpg", (36, 296, 160, 472), 92),
        "gatling": Pose("moves.jpg", (150, 300, 560, 472), 92, anchor=0.18),
        "jump_start": Pose("moves.jpg", (44, 545, 176, 722), 92),
        "aerial": Pose("moves.jpg", (262, 498, 394, 628), 78),
        "stamp_smash": Pose("moves.jpg", (392, 528, 582, 706), 90, anchor=0.4),
        "redhawk_charge": Pose("moves.jpg", (36, 810, 168, 986), 88),
        "redhawk_lunge": Pose("moves.jpg", (228, 778, 480, 978), 92, anchor=0.22, erase=[(520, 770, 740, 830)], append=[(586, 778, 738, 978)]),
        "lying": Pose("sheet.jpg", (556, 12, 692, 306), 36, rotate=90),
    },
    anims={
        "idle": ["idle"],
        "walk_fwd": ["idle"],
        "walk_back": ["idle"],
        "crouch": ["redhawk_charge"],
        "prejump": ["jump_start"],
        "jump_neutral": ["aerial"],
        "jump_fwd": ["aerial"],
        "jump_back": ["aerial"],
        "landing": ["jump_start"],
        "dash": ["punch_start"],
        "backdash": ["aerial"],
        "roll_fwd": ["aerial"],
        "roll_back": ["aerial"],
        "block_stand": ["gatling_start"],
        "block_crouch": ["redhawk_charge"],
        "hit_stand": ["hero"],
        "hit_crouch": ["redhawk_charge"],
        "hit_air": ["aerial"],
        "knockdown": ["lying"],
        "getup": ["redhawk_charge", "jump_start"],
        "throw": ["punch_start", "punch_stretch"],
        "thrown": ["aerial"],
        "throw_tech": ["punch_start"],
        "ko": ["lying"],
    },
    moves={
        "*": ("punch_start", "punch_stretch", "punch_start"),
        "st_b": ("punch_start", "stamp_smash", "punch_start"),
        "cr_b": ("redhawk_charge", "stamp_smash", "redhawk_charge"),
        "st_d": ("punch_start", "stamp_smash", "punch_start"),
        "cr_d": ("redhawk_charge", "stamp_smash", "redhawk_charge"),
        "cr_a": ("redhawk_charge", "punch_stretch", "redhawk_charge"),
        "cr_c": ("redhawk_charge", "punch_stretch", "redhawk_charge"),
        "j_a": ("aerial", "jump_kick", "aerial"),
        "j_b": ("aerial", "jump_kick", "aerial"),
        "j_c": ("aerial", "punch_stretch", "aerial"),
        "j_d": ("aerial", "jump_kick", "aerial"),
        "j_2d": ("aerial", "stamp_smash", "aerial"),
        "j_cd": ("aerial", "jump_kick", "aerial"),
        "sp_gatling": ("gatling_start", "gatling", "gatling_start"),
        "sp_rocket": ("jump_start", "hero", "punch_start"),
        "sp_balloon": ("idle", "idle", "idle"),
        "sp_gear2": ("redhawk_charge", "redhawk_charge", "redhawk_charge"),
        "sp_storm": ("gatling_start", "gatling", "gatling_start"),
        "sp_gigant_pistol": ("redhawk_charge", "punch_stretch", "punch_start"),
        "ult_red_hawk": ("redhawk_charge", "redhawk_lunge", "redhawk_charge"),
    },
)

AKAINU = CharConfig(
    poses={
        "idle": Pose("sheet.jpg", (30, 4, 212, 300), 108, bg="dark"),
        "windup": Pose("sheet.jpg", (4, 322, 230, 486), 100, bg="dark"),
        "forward_attack": Pose("sheet.jpg", (4, 508, 236, 686), 100, anchor=0.35, bg="dark"),
        "intimidation": Pose("sheet.jpg", (20, 708, 224, 1004), 108, bg="dark"),
        "big_fist": Pose("sheet.jpg", (232, 70, 724, 704), 110, anchor=0.55, bg="dark"),
        "big_thrust": Pose("moves.jpg", (90, 12, 330, 162), 100, anchor=0.28, bg="dark", erase=[(0, 0, 380, 33)], append=[(455, 12, 610, 162)]),
        "uppercut": Pose("moves.jpg", (498, 312, 604, 472), 108, anchor=0.5, bg="dark"),
        "ground_burst": Pose("moves.jpg", (462, 540, 580, 660), 92, anchor=0.5, bg="dark"),
        "summon": Pose("moves.jpg", (284, 822, 412, 982), 108, bg="dark"),
        "lying": Pose("sheet.jpg", (30, 4, 212, 300), 40, rotate=90, bg="dark"),
    },
    anims={
        "idle": ["idle"],
        "walk_fwd": ["idle"],
        "walk_back": ["idle"],
        "crouch": ["windup"],
        "prejump": ["windup"],
        "jump_neutral": ["intimidation"],
        "jump_fwd": ["intimidation"],
        "jump_back": ["intimidation"],
        "landing": ["windup"],
        "dash": ["forward_attack"],
        "backdash": ["intimidation"],
        "roll_fwd": ["windup"],
        "roll_back": ["windup"],
        "block_stand": ["intimidation"],
        "block_crouch": ["windup"],
        "hit_stand": ["intimidation"],
        "hit_crouch": ["windup"],
        "hit_air": ["intimidation"],
        "knockdown": ["lying"],
        "getup": ["windup", "idle"],
        "throw": ["windup", "big_fist"],
        "thrown": ["intimidation"],
        "throw_tech": ["windup"],
        "ko": ["lying"],
    },
    moves={
        "*": ("windup", "forward_attack", "windup"),
        "st_c": ("windup", "big_thrust", "windup"),
        "f_c": ("windup", "big_thrust", "windup"),
        "cd": ("windup", "big_thrust", "windup"),
        "cr_b": ("windup", "ground_burst", "windup"),
        "cr_c": ("windup", "uppercut", "windup"),
        "cr_d": ("windup", "ground_burst", "windup"),
        "j_a": ("intimidation", "forward_attack", "intimidation"),
        "j_b": ("intimidation", "forward_attack", "intimidation"),
        "j_c": ("intimidation", "big_thrust", "intimidation"),
        "j_d": ("intimidation", "forward_attack", "intimidation"),
        "j_cd": ("intimidation", "big_thrust", "intimidation"),
        "sp_daifunka": ("windup", "big_thrust", "windup"),
        "sp_daifunka_ren": ("windup", "big_thrust", "windup"),
        "sp_inugami": ("windup", "forward_attack", "windup"),
        "sp_meteor": ("summon", "summon", "summon"),
        "sp_meteor_rain": ("summon", "summon", "summon"),
        "sp_meigou": ("windup", "big_fist", "big_fist"),
        "ult_meigou_end": ("windup", "big_fist", "big_fist"),
        "sp_ground_split": ("windup", "ground_burst", "windup"),
        "sp_magma_body": ("intimidation", "intimidation", "intimidation"),
        "throw_fwd": ("windup", "big_fist", "windup"),
        "throw_back": ("windup", "big_fist", "windup"),
    },
)

CONFIGS = {"luffy": LUFFY, "akainu": AKAINU}


# ---------------------------------------------------------------- 抠图

def lum_sat(px: tuple[int, int, int]) -> tuple[int, int]:
    r, g, b = px
    return (r * 299 + g * 587 + b * 114) // 1000, max(r, g, b) - min(r, g, b)


def border_reference(rgb: Image.Image, mode: str) -> tuple[int, int, int]:
    """背景参考色：边缘像素里低饱和度的那部分取中位数（比取四角稳）"""
    w, h = rgb.size
    px = rgb.load()
    samples: list[tuple[int, int, int]] = []
    for x in range(0, w, 2):
        for y in (0, 1, h - 2, h - 1):
            samples.append(px[x, y])
    for y in range(0, h, 2):
        for x in (0, 1, w - 2, w - 1):
            samples.append(px[x, y])
    filt = []
    for p in samples:
        lum, sat = lum_sat(p)
        if sat < 40 and ((mode == "paper" and lum > 150) or (mode == "dark" and 40 < lum < 170)):
            filt.append(p)
    if not filt:
        filt = samples
    filt.sort(key=lambda p: sum(p))
    return filt[len(filt) // 2]


def is_bg_candidate(px: tuple[int, int, int], ref: tuple[int, int, int], mode: str) -> bool:
    lum, sat = lum_sat(px)
    d = ((px[0] - ref[0]) ** 2 + (px[1] - ref[1]) ** 2 + (px[2] - ref[2]) ** 2) ** 0.5
    if mode == "paper":
        # 纸纹（近参考色或任何浅灰）、灰色剪影 / 墨迹。保留纯白（>236）和深色线稿
        return d < 40 or (sat < 30 and 150 <= lum <= 236) or (sat < 26 and 60 <= lum <= 200)
    # 深灰底、灰色烟雾 / 剪影、被岩浆映红的暗烟（偏红的暗灰）。保留纯黑（头发、鞋，lum < 45）与白（外套、帽）
    r, g, b = px
    reddish_smoke = sat < 90 and 45 <= lum <= 125 and r >= g >= b
    return d < 46 or (sat < 24 and 40 <= lum <= 170) or reddish_smoke


def key_background(im: Image.Image, mode: str) -> Image.Image:
    """从边缘泛洪，把与背景连通的候选像素设为透明；边缘软化一圈。"""
    rgb = im.convert("RGB")
    w, h = rgb.size
    ref = border_reference(rgb, mode)
    px = rgb.load()
    cand = bytearray(w * h)
    for y in range(h):
        for x in range(w):
            if is_bg_candidate(px[x, y], ref, mode):
                cand[y * w + x] = 1
    alpha = bytearray(b"\xff" * (w * h))
    seen = bytearray(w * h)
    q: deque[int] = deque()
    for x in range(w):
        for y in (0, h - 1):
            if cand[y * w + x]:
                q.append(y * w + x)
    for y in range(h):
        for x in (0, w - 1):
            if cand[y * w + x]:
                q.append(y * w + x)
    while q:
        i = q.popleft()
        if seen[i]:
            continue
        seen[i] = 1
        alpha[i] = 0
        x, y = i % w, i // w
        if x > 0 and cand[i - 1] and not seen[i - 1]:
            q.append(i - 1)
        if x < w - 1 and cand[i + 1] and not seen[i + 1]:
            q.append(i + 1)
        if y > 0 and cand[i - w] and not seen[i - w]:
            q.append(i - w)
        if y < h - 1 and cand[i + w] and not seen[i + w]:
            q.append(i + w)
    soft = bytearray(alpha)
    for y in range(1, h - 1):
        for x in range(1, w - 1):
            i = y * w + x
            if alpha[i] and (not alpha[i - 1] or not alpha[i + 1] or not alpha[i - w] or not alpha[i + w]):
                soft[i] = 150
    # 裁切框左 / 右 / 上边缘羽化：被框切断的烟雾、火焰渐隐而不是硬边（底边是脚，不羽化）
    feather = 12
    for y in range(h):
        for x in range(w):
            i = y * w + x
            if not soft[i]:
                continue
            d = min(x, w - 1 - x, y)
            if d < feather:
                soft[i] = soft[i] * (d + 1) // (feather + 1)
    out = rgb.convert("RGBA")
    out.putalpha(Image.frombytes("L", (w, h), bytes(soft)))
    return out


@dataclass
class Sprite:
    img: Image.Image
    pivot_x: float  # 脚底中心 x（归一化）


def key_box(im: Image.Image, box: Box, bg: str, erase: list[Box]) -> Image.Image:
    x0, y0, x1, y1 = box
    crop = im.crop(box)
    # 擦除区：填成背景参考色，随后会被抠掉
    if erase:
        ref = border_reference(crop, bg)
        for ex0, ey0, ex1, ey1 in erase:
            rx0, ry0 = max(0, ex0 - x0), max(0, ey0 - y0)
            rx1, ry1 = min(x1 - x0, ex1 - x0), min(y1 - y0, ey1 - y0)
            if rx1 > rx0 and ry1 > ry0:
                crop.paste(ref, (rx0, ry0, rx1, ry1))
    return key_background(crop, bg)


def cut_pose(char_dir: str, pose: Pose) -> Sprite:
    im = Image.open(os.path.join(char_dir, pose.src)).convert("RGB")
    keyed = key_box(im, pose.box, pose.bg, pose.erase)
    # 拼接：追加段按源图 y 对齐，接在主框右侧（用于缩短手臂：身体 + 短臂 + 拳头）
    for box in pose.append:
        part = key_box(im, box, pose.bg, pose.erase)
        pb = part.getbbox()
        if not pb:
            continue
        part = part.crop((pb[0], 0, pb[2], part.height))  # 只去左右空白，保留 y 对齐
        main_bbox = keyed.getbbox() or (0, 0, keyed.width, keyed.height)
        canvas = Image.new("RGBA", (main_bbox[2] + part.width, max(keyed.height, part.height)), (0, 0, 0, 0))
        canvas.alpha_composite(keyed, (0, 0))
        canvas.alpha_composite(part, (main_bbox[2] - 6, box[1] - pose.box[1]))
        keyed = canvas
    if pose.rotate:
        keyed = keyed.rotate(pose.rotate, expand=True)
    bbox = keyed.getbbox()
    if not bbox:
        raise SystemExit(f"pose keyed to nothing: {pose}")
    keyed = keyed.crop(bbox)
    scale = pose.h / keyed.height
    size = (max(1, round(keyed.width * scale)), max(1, round(keyed.height * scale)))
    return Sprite(keyed.resize(size, Image.Resampling.LANCZOS), pose.anchor)


# ---------------------------------------------------------------- 组装

def build(char_id: str, cfg: CharConfig, frames_info: dict) -> None:
    char_dir = os.path.join(SRC, "characters", char_id)
    cache: dict[str, Sprite] = {}

    def sprite_for(name: str) -> Sprite:
        if name not in cache:
            cache[name] = cut_pose(char_dir, cfg.poses[name])
        return cache[name]

    entries: list[tuple[str, str]] = []  # (frame name, pose name)
    for anim, count in frames_info["anims"].items():
        seq = cfg.anims.get(anim) or [next(iter(cfg.poses))]
        for i in range(count):
            entries.append((f"{char_id}/{anim}/{i}", seq[min(i, len(seq) - 1)]))
    for move_id, info in frames_info["moves"].items():
        start, active, recover = cfg.moves.get(move_id, cfg.moves["*"])
        actives = set(info["active"])
        n = info["frames"]
        for i in range(n):
            pose_name = active if i in actives else (recover if (i == n - 1 and n > 1) else start)
            entries.append((f"{char_id}/{move_id}/{i}", pose_name))

    # 每个姿势只在图集里放一份，多个帧名指向同一区域
    poses_used = sorted({p for _, p in entries})
    pad = 2
    max_w = 2048
    placements: dict[str, tuple[int, int]] = {}
    x = y = row_h = 0
    for name in poses_used:
        s = sprite_for(name).img
        if x + s.width + pad > max_w:
            x = 0
            y += row_h + pad
            row_h = 0
        placements[name] = (x, y)
        x += s.width + pad
        row_h = max(row_h, s.height)
    atlas_w = max_w
    atlas_h = y + row_h + pad
    atlas = Image.new("RGBA", (atlas_w, atlas_h), (0, 0, 0, 0))
    for name, (px_, py_) in placements.items():
        atlas.alpha_composite(sprite_for(name).img, (px_, py_))

    frames_json: dict[str, dict] = {}
    for frame_name, pose_name in entries:
        s = sprite_for(pose_name)
        px_, py_ = placements[pose_name]
        w, h = s.img.size
        frames_json[frame_name] = {
            "frame": {"x": px_, "y": py_, "w": w, "h": h},
            "rotated": False,
            "trimmed": False,
            "spriteSourceSize": {"x": 0, "y": 0, "w": w, "h": h},
            "sourceSize": {"w": w, "h": h},
            "pivot": {"x": round(s.pivot_x, 4), "y": 1},
        }

    out_dir = os.path.join(OUT, char_id)
    os.makedirs(out_dir, exist_ok=True)
    atlas.save(os.path.join(out_dir, "atlas.png"), optimize=True)
    with open(os.path.join(out_dir, "atlas.json"), "w", encoding="utf-8") as f:
        json.dump(
            {
                "frames": frames_json,
                "meta": {
                    "app": "one-piece-fighter/scripts/cut_concept_art.py",
                    "version": "1.0",
                    "image": "atlas.png",
                    "format": "RGBA8888",
                    "size": {"w": atlas_w, "h": atlas_h},
                    "scale": "1",
                },
            },
            f,
        )
    # 姿势总览（人工检查）：每格 260x140，脚底对齐底边，红点 = pivot
    cell_w, cell_h = 260, 140
    cols = 5
    rows = (len(cfg.poses) + cols - 1) // cols
    sheet = Image.new("RGBA", (cell_w * cols, cell_h * rows), (30, 30, 40, 255))
    for i, name in enumerate(cfg.poses):
        s = sprite_for(name)
        cx = (i % cols) * cell_w + cell_w // 2
        by = (i // cols) * cell_h + cell_h - 4
        ox = cx - round(s.img.width * s.pivot_x)
        sheet.alpha_composite(s.img, (max(0, ox), max(0, by - s.img.height)))
        for dx in range(-2, 3):
            for dy in range(-2, 3):
                sheet.putpixel((min(sheet.width - 1, cx + dx), min(sheet.height - 1, by + dy)), (255, 0, 0, 255))
    sheet.save(os.path.join(out_dir, "poses-preview.png"))
    print(f"{char_id}: {len(entries)} frames, {len(poses_used)} poses, atlas {atlas_w}x{atlas_h}")


def main() -> None:
    with open(os.path.join(SRC, "frames.json"), encoding="utf-8") as f:
        frames = json.load(f)
    for char_id in sys.argv[1:] or list(CONFIGS):
        build(char_id, CONFIGS[char_id], frames[char_id])


if __name__ == "__main__":
    main()
