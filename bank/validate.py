#!/usr/bin/env python3
"""Validate EFE0102 question-bank files.

Usage: python3 validate.py FILE [FILE ...]
  chNN.json  -> chapter bank (mcq + short)
  swot.json  -> SWOT classification sets
Exit code 1 if any ERROR. WARNINGs must also be fixed (they flag broken Thai or weak items).
"""
import json
import os
import re
import sys
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
MANIFEST = os.path.join(HERE, "..", "sources", "manifest.json")

LEVELS = {"จำ", "เข้าใจ", "ประยุกต์"}
INTERNAL = {"structure", "service", "man", "money", "material", "management"}
EXTERNAL = {"social", "technological", "economic", "political"}

# pdftotext drops the vowel ำ (and splits Thai marks with spaces); none of this may reach the bank.
BROKEN_WORDS = [
    "กาหนด", "ดาเนิน", "สาคัญ", "สาเร็จ", "จานวน", "ตาแหน่ง", "ประจาปี", "สานัก", "กากับ",
    "อานาจ", "อานวย", "จาเป็น", "ทาให้", "ทาการ", "ทางาน", "ชานาญ", "กาลัง", "ลาดับ",
    "สาหรับ", "จัดทา", "นาเสนอ", "คาถาม", "คาตอบ", "คาว่า", "คาสั่ง",
    "ดาริ", "ทาไม", "สารวจ", "จาแนก", "ตาบล", "อาเภอ", "กาเนิด", "บารุง", "ความจา",
    "กฏหมาย", "กฏกระทรวง",
]
BROKEN_RE = [
    (re.compile("ํา"), "ํา (nikhahit+sara aa) instead of ำ"),
    (re.compile(" ำ"), "space before ำ"),
    (re.compile("ั "), "space after ั"),
    (re.compile(" [ัิ-ฺ็-๎]"), "space before a Thai vowel/tone mark"),
    (re.compile("[่-๋]{2,}"), "doubled tone mark"),
    (re.compile("�"), "replacement character"),
]
LABEL_PREFIX = re.compile(r"^\s*(\(?[กขคง1-4abcdABCD][\.\)])\s*")
NON_SHUFFLE = re.compile(r"ถูกทุกข้อ|ผิดทุกข้อ|ถูกทั้งหมด|ผิดทั้งหมด|ทุกข้อ|ทั้งข้อ|ข้อ\s*[กขคง]\s*(และ|หรือ)|ไม่มีข้อใด")

errors, warnings = [], []


def err(where, msg):
    errors.append(f"ERROR   {where}: {msg}")


def warn(where, msg):
    warnings.append(f"WARNING {where}: {msg}")


def check_thai(where, text):
    if not isinstance(text, str):
        return
    for w in BROKEN_WORDS:
        if w in text:
            warn(where, f"broken/misspelt Thai '{w}' (pdftotext artefact? e.g. กาหนด→กำหนด, กฏหมาย→กฎหมาย): …{snippet(text, w)}…")
    m = re.search(r"(?<!ชาว)(?<!ท้อง)(?<!ไร่)นา(ไป|มา|ผล)", text)
    if m:
        warn(where, f"broken Thai '{m.group(0)}' (นำ…?): …{text[max(0, m.start()-12):m.end()+12]}…")
    for rx, label in BROKEN_RE:
        m = rx.search(text)
        if m:
            err(where, f"{label}: …{text[max(0, m.start()-12):m.end()+12]}…")
    if "  " in text.strip():
        warn(where, "double space")


# คำกว้างเกินไป ถ้าใช้เป็นคำสำคัญทั้งคำ ระบบจะติ๊กให้แทบทุกคำตอบ
GENERIC_KEYWORDS = {
    "การ", "ความ", "คุณภาพ", "การศึกษา", "สถานศึกษา", "โรงเรียน", "ผู้เรียน", "นักเรียน", "ครู",
    "พัฒนา", "การพัฒนา", "ประเมิน", "การประเมิน", "มาตรฐาน", "ระบบ", "ข้อมูล", "แผน", "งาน",
    "บริหาร", "การบริหาร", "ผล", "เป้าหมาย", "หน่วยงาน", "ดำเนินการ", "การดำเนินงาน",
}


def norm_kw(text):
    """Same normalisation as the app: lower-case, ํา -> ำ, drop whitespace and zero-width characters."""
    text = text.replace("ํา", "ำ").lower()
    return re.sub(r"[\s​‌‍﻿]+", "", text)


def check_keywords(where, s, pts):
    kws = s.get("keywords")
    if not (isinstance(kws, list) and len(kws) == len(pts)):
        err(where, f"keywords must be a list with one entry per point ({len(pts)})")
        return
    answer = norm_kw(s.get("answer", ""))
    for j, group in enumerate(kws):
        w = f"{where} keywords[{j}]"
        if not (isinstance(group, list) and 1 <= len(group) <= 8 and all(is_str(k, 2) for k in group)):
            err(w, "must be a list of 1–8 keywords (each at least 2 characters)")
            continue
        normed = [norm_kw(k) for k in group]
        if len(set(normed)) != len(normed):
            warn(w, "duplicate keywords")
        for k in group:
            check_thai(w, k)
            if norm_kw(k) in {norm_kw(g) for g in GENERIC_KEYWORDS}:
                warn(w, f"'{k}' is too generic — it would match almost any answer")
        point = norm_kw(pts[j]) if j < len(pts) and isinstance(pts[j], str) else ""
        if not any(n in answer or n in point for n in normed):
            warn(w, "no keyword appears in the model answer or the point itself — the model answer would not get this point")


def snippet(text, w):
    i = text.find(w)
    return text[max(0, i - 15): i + len(w) + 15]


def is_str(x, minlen=1):
    return isinstance(x, str) and len(x.strip()) >= minlen


def load_manifest():
    try:
        with open(MANIFEST, encoding="utf-8") as f:
            return {c["id"]: c for c in json.load(f)["chapters"]}
    except Exception as e:  # noqa: BLE001
        err("manifest", f"cannot read {MANIFEST}: {e}")
        return {}


def check_chapter(path, data, chapters):
    cid = os.path.splitext(os.path.basename(path))[0]
    ch = data.get("chapter")
    if not isinstance(ch, dict):
        err(cid, "missing 'chapter' object")
        return
    if ch.get("id") != cid:
        err(cid, f"chapter.id '{ch.get('id')}' does not match file name")
    meta = chapters.get(cid, {})
    pages = meta.get("pages") or ch.get("pages") or 999
    for k in ("id", "no", "title", "file", "pages", "period"):
        if k not in ch:
            err(cid, f"chapter.{k} missing")

    mcq = data.get("mcq")
    if not isinstance(mcq, list) or not mcq:
        err(cid, "'mcq' must be a non-empty list")
        mcq = []
    ids = Counter()
    positions = Counter()
    longest_key = 0
    stems = {}
    for i, q in enumerate(mcq):
        where = f"{cid} mcq[{i}] {q.get('id', '?') if isinstance(q, dict) else '?'}"
        if not isinstance(q, dict):
            err(where, "not an object")
            continue
        qid = q.get("id")
        ids[qid] += 1
        if not (isinstance(qid, str) and re.fullmatch(rf"{cid}-m\d{{2,3}}", qid)):
            err(where, f"id must look like {cid}-m01")
        if not is_str(q.get("q"), 8):
            err(where, "q (stem) missing/too short")
        check_thai(where + " q", q.get("q"))
        ch_ = q.get("choices")
        if not (isinstance(ch_, list) and len(ch_) == 4 and all(is_str(c) for c in ch_)):
            err(where, "choices must be a list of exactly 4 non-empty strings")
            ch_ = None
        else:
            norm = [re.sub(r"\s+", " ", c.strip()) for c in ch_]
            if len(set(norm)) != 4:
                err(where, "duplicate choices")
            for j, c in enumerate(ch_):
                if LABEL_PREFIX.match(c):
                    err(where, f"choice {j} starts with a label ('{c[:6]}') — the app adds ก ข ค ง")
                check_thai(f"{where} choice{j}", c)
        a = q.get("answer")
        if not (isinstance(a, int) and not isinstance(a, bool) and 0 <= a <= 3):
            err(where, "answer must be an int 0–3")
            a = None
        else:
            positions[a] += 1
        if not is_str(q.get("explain"), 10):
            err(where, "explain missing/too short")
        check_thai(where + " explain", q.get("explain"))
        src = q.get("source")
        if not isinstance(src, dict):
            err(where, "source must be an object {page, quote}")
        else:
            p = src.get("page")
            if not (isinstance(p, int) and not isinstance(p, bool) and 1 <= p <= pages):
                err(where, f"source.page must be an int 1–{pages}")
            if not is_str(src.get("quote"), 3):
                err(where, "source.quote missing")
            check_thai(where + " quote", src.get("quote"))
        if q.get("level") not in LEVELS:
            err(where, f"level must be one of {sorted(LEVELS)}")
        if not isinstance(q.get("core"), bool):
            err(where, "core must be true/false")
        sh = q.get("shuffle")
        if not isinstance(sh, bool):
            err(where, "shuffle must be true/false")
        tags = q.get("tags")
        if not (isinstance(tags, list) and 1 <= len(tags) <= 4 and all(is_str(t) for t in tags)):
            err(where, "tags must be a list of 1–4 strings")
        if ch_ and sh is True and any(NON_SHUFFLE.search(c) for c in ch_):
            err(where, "has an order-dependent option (ถูกทุกข้อ / ข้อ ก และ ข …) but shuffle is true")
        if ch_ and a is not None:
            lens = sorted((len(c), j) for j, c in enumerate(ch_))
            if lens[-1][1] == a and lens[-1][0] > 1.3 * lens[-2][0]:
                longest_key += 1
        stem = re.sub(r"\s+", "", q.get("q", ""))
        if stem in stems:
            err(where, f"same stem as {stems[stem]}")
        stems[stem] = qid
    for qid, n in ids.items():
        if n > 1:
            err(cid, f"duplicate id {qid}")

    n = sum(positions.values())
    if n >= 12:
        for pos in range(4):
            share = positions[pos] / n
            if share < 0.15 or share > 0.35:
                warn(cid, f"answer position {'กขคง'[pos]} is {share:.0%} of keys (aim ≈25%)")
        if longest_key / n > 0.35:
            warn(cid, f"the key is clearly the longest option in {longest_key}/{n} items — students can guess by length")

    short = data.get("short")
    if not isinstance(short, list):
        err(cid, "'short' must be a list")
        short = []
    sids = Counter()
    for i, s in enumerate(short):
        where = f"{cid} short[{i}] {s.get('id', '?') if isinstance(s, dict) else '?'}"
        if not isinstance(s, dict):
            err(where, "not an object")
            continue
        sids[s.get("id")] += 1
        if not (isinstance(s.get("id"), str) and re.fullmatch(rf"{cid}-s\d{{2}}", s["id"])):
            err(where, f"id must look like {cid}-s01")
        if not is_str(s.get("q"), 8):
            err(where, "q missing")
        if not is_str(s.get("answer"), 20):
            err(where, "answer (model answer) missing/too short")
        pts = s.get("points")
        if not (isinstance(pts, list) and 2 <= len(pts) <= 8 and all(is_str(p) for p in pts)):
            err(where, "points must be a list of 2–8 strings")
        src = s.get("source")
        pg = src.get("pages") if isinstance(src, dict) else None
        if not (isinstance(pg, list) and pg and all(isinstance(p, int) and 1 <= p <= pages for p in pg)):
            err(where, f"source.pages must be a non-empty list of ints 1–{pages}")
        for k in ("q", "answer"):
            check_thai(f"{where} {k}", s.get(k))
        for j, p in enumerate(pts or []):
            check_thai(f"{where} point{j}", p)
        if "keywords" in s:
            check_keywords(where, s, pts if isinstance(pts, list) else [])
    for sid, k in sids.items():
        if k > 1:
            err(cid, f"duplicate id {sid}")

    lv = Counter(q.get("level") for q in mcq if isinstance(q, dict))
    print(f"{cid}: {len(mcq)} mcq ({', '.join(f'{k} {v}' for k, v in lv.items())}), "
          f"{len(short)} short, key positions ก{positions[0]} ข{positions[1]} ค{positions[2]} ง{positions[3]}")


def check_swot(data):
    sets = data.get("sets")
    if not isinstance(sets, list) or not sets:
        err("swot", "'sets' must be a non-empty list")
        return
    fw = data.get("framework")
    if not isinstance(fw, dict):
        err("swot", "missing 'framework' object")
    seen = Counter()
    total = 0
    for si, st in enumerate(sets):
        where = f"swot set[{si}] {st.get('id', '?') if isinstance(st, dict) else '?'}"
        if not isinstance(st, dict):
            err(where, "not an object")
            continue
        sid = st.get("id")
        seen[sid] += 1
        if not (isinstance(sid, str) and re.fullmatch(r"swot\d{2}", sid)):
            err(where, "id must look like swot01")
        for k in ("title", "context"):
            if not is_str(st.get(k), 5):
                err(where, f"{k} missing")
            check_thai(f"{where} {k}", st.get(k))
        items = st.get("items")
        if not (isinstance(items, list) and len(items) == 15):
            err(where, "items must be a list of exactly 15")
            items = items if isinstance(items, list) else []
        letters = Counter()
        by_id = {}
        for ii, it in enumerate(items):
            w = f"{where} item[{ii}] {it.get('id', '?') if isinstance(it, dict) else '?'}"
            if not isinstance(it, dict):
                err(w, "not an object")
                continue
            iid = it.get("id")
            seen[iid] += 1
            if not (isinstance(iid, str) and re.fullmatch(rf"{sid}-\d{{2}}", iid or "")):
                err(w, f"id must look like {sid}-01")
            by_id[iid] = it
            ans = it.get("answer")
            if ans not in ("S", "W", "O", "T"):
                err(w, "answer must be S/W/O/T")
            letters[ans] += 1
            fac = it.get("factor")
            if ans in ("S", "W") and fac not in INTERNAL:
                err(w, f"S/W item needs an internal factor {sorted(INTERNAL)}, got {fac}")
            if ans in ("O", "T") and fac not in EXTERNAL:
                err(w, f"O/T item needs an external factor {sorted(EXTERNAL)}, got {fac}")
            for k in ("text", "factorTh", "explain"):
                if not is_str(it.get(k), 2):
                    err(w, f"{k} missing")
                check_thai(f"{w} {k}", it.get(k))
            if not isinstance(it.get("tricky"), bool):
                err(w, "tricky must be true/false")
            total += 1
        for L in "SWOT":
            if not 3 <= letters[L] <= 5:
                err(where, f"{L} appears {letters[L]} times (need 3–5)")
        tows = st.get("tows")
        if not isinstance(tows, dict):
            err(where, "tows must be an object with SO, ST, WO, WT")
        else:
            for key in ("SO", "ST", "WO", "WT"):
                arr = tows.get(key)
                if not (isinstance(arr, list) and arr):
                    err(where, f"tows.{key} must be a non-empty list")
                    continue
                for ti, t in enumerate(arr):
                    w = f"{where} tows.{key}[{ti}]"
                    if not (isinstance(t, dict) and is_str(t.get("text"), 5)):
                        err(w, "needs {text, uses}")
                        continue
                    check_thai(w, t.get("text"))
                    uses = t.get("uses")
                    if not (isinstance(uses, list) and uses):
                        err(w, "uses must list item ids")
                        continue
                    used = set()
                    for u in uses:
                        if u not in by_id:
                            err(w, f"uses unknown item id {u}")
                        else:
                            used.add(by_id[u].get("answer"))
                    if not used <= set(key):
                        err(w, f"{key} strategy uses items answered {sorted(used)}")
                    if set(key) - used:
                        warn(w, f"{key} strategy does not use any {''.join(sorted(set(key) - used))} item")
        print(f"{sid}: {len(items)} items  S{letters['S']} W{letters['W']} O{letters['O']} T{letters['T']}  "
              f"tricky {sum(1 for it in items if isinstance(it, dict) and it.get('tricky'))}")
    for k, n in seen.items():
        if n > 1:
            err("swot", f"duplicate id {k}")
    print(f"swot: {len(sets)} sets, {total} items")


def main(paths):
    chapters = load_manifest()
    for path in paths:
        try:
            with open(path, encoding="utf-8") as f:
                data = json.load(f)
        except Exception as e:  # noqa: BLE001
            err(path, f"not valid JSON: {e}")
            continue
        if isinstance(data, dict) and "sets" in data:
            check_swot(data)
        else:
            check_chapter(path, data, chapters)
    for line in errors + warnings:
        print(line)
    print(f"\n{len(errors)} error(s), {len(warnings)} warning(s)")
    return 1 if errors else 0


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(2)
    sys.exit(main(sys.argv[1:]))
