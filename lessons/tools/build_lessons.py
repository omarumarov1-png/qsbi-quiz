#!/usr/bin/env python3
"""Build the web lessons (lessons.html) from the parsed lesson plans of the 2nd-quarter deck pipeline.

Source: ~/qsbi-presentations/q2  (data/<gg>_<ll>.json, photos/<gg>_<ll>.jpg + .json, out/<gg>_<ll>.pptx)
Output: lessons/data/index.js            grade -> lesson list (topic, module, format)
        lessons/data/gNN.js              full web content of every lesson of grade NN
        lessons/img/<gg>_<ll>.jpg        photo of the lesson, 1100 px, for the web
        lessons/tools/release/qsbi-gNN-lLL.pptx   the original decks, uploaded as GitHub Release assets

The content logic mirrors q2/render.js so the website and the slides say the same thing:
warm-up built from the lesson's glossary (replaces the stock «Великаны и лилипуты» etc.), answers pulled
off the task cards into a hidden «Ответы» block, examples split into labelled cards, myth → fix, etc.
Usage: python3 lessons/tools/build_lessons.py [path-to-q2]
"""
import json, os, re, sys, shutil, glob
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser("~/qsbi-presentations/q2")
OUT = os.path.join(ROOT, "lessons")
RELEASE_TAG = "slides-q2"
RELEASE_URL = f"https://github.com/omarumarov1-png/qsbi-quiz/releases/download/{RELEASE_TAG}/"

def uc(t): return t[:1].upper() + t[1:] if t else t
def sentences(t):
    t = re.sub(r"\s+", " ", str(t or "")).strip()
    return [x.strip() for x in re.split(r"(?<=[.!?…])\s+(?=[А-ЯЁA-Z«\"(\d—–])", t) if x.strip()]
def parse_questions(text):
    return [{"q": re.sub(r"^[.\s]+", "", m.group(1).strip()), "a": m.group(2).strip().rstrip(".")}
            for m in re.finditer(r"([^?()]*?[^?()\s][^?()]*\?)\s*\(([^)]*)\)", text or "")]
def parse_steps(text):
    parts = [p.strip() for p in re.split(r"\s*Шаг\s*\d+\s*[:.)—-]\s*", text, flags=re.I) if p.strip()]
    if len(parts) >= 3: return parts
    parts = [p.strip().rstrip(";") for p in re.split(r"(?:^|[\s;:])\s*[а-е]\)\s+", text) if p.strip()]
    if len(parts) >= 3: return parts
    parts = [p.strip() for p in re.split(r"(?:^|\s)\d\)\s+", text) if p.strip()]
    if len(parts) >= 3: return parts
    return sentences(text)
def plain_term(t): return re.sub(r"\s*\([^)]*\)", "", t)

STOCK_WARM = re.compile(r"велика|лилипут|узел|цепочк[аи] постав|молчалив|башня на бюджет", re.I)
WARM_NAMES = {"truth": "Правда или ловушка?", "guess": "Угадай слово", "match": "Найди пару"}
WARM_RULES = {
    "truth": ["Учитель читает слово урока и объяснение — правильное или «перепутанное».", "10 секунд молча решаем, так ли объясняется слово.", "«Три-два-один!» — все сразу показывают: ладонь вверх = ПРАВДА, кулак = ЛОВУШКА."],
    "guess": ["Слово спрятано — звучит только его объяснение и первая буква.", "10 секунд команда шёпотом выбирает одно слово.", "«Три-два-один!» — все команды хором называют слово. Верно — балл команде."],
    "match": ["На экране определения под номерами.", "Учитель называет слово, например: «Слово А — …». 10 секунд на поиск.", "Все одновременно показывают номер подходящего определения на пальцах."],
}

def warmup(D):
    gl = [g for g in (D.get("glossary_list") or []) if g.get("term") and g.get("def")][:6]
    n = 6 if len(gl) >= 6 else 4 if len(gl) >= 4 else len(gl)
    if n < 3: return None
    kind = ["truth", "guess", "match"][(D["grade"] + D["lesson"]) % 3]
    items = []
    for i in range(n):
        g = gl[i]; truth = i % 2 == 0; other = gl[(i + 1 + len(gl) // 2) % len(gl)]
        real = g["def"].rstrip(".")
        shown = real if (truth or other is g) else other["def"].rstrip(".")
        items.append({"term": g["term"], "real": uc(real), "shown": uc(shown), "truth": truth or other is g, "first": (plain_term(g["term"]).strip()[:1] or "?")})
    perm = list(range(n)); off = 2 + ((D["lesson"] + D["grade"]) % max(1, n - 2))
    perm = [(n - 1 - p + off) % n for p in range(n)]
    if any(w == p for p, w in enumerate(perm)): perm = [(p + 1) % n for p in range(n)]
    return {"kind": kind, "name": WARM_NAMES[kind], "rules": WARM_RULES[kind], "items": items, "perm": perm}

LABELS = re.compile(r"(?<=[.?!»)])\s+(?=(?:Задание|Сдать|Траты|Доходы|Расходы|Вопросы?|Ответ|Данные|Условие|Подсказка|Ситуация|Цель|Шаг \d+|Раунд \d+|Задача \d*)\s*:)")
def card(c, ci, D):
    m = re.match(r"^Карточка\s*(\d+)\.?\s*(.*)$", c["title"])
    num, title = (m.group(1), m.group(2)) if m else (str(ci + 1), c["title"])
    pre = []
    for l in c["lines"]:
        pre += [p.strip() for p in LABELS.split(l) if p and p.strip()]
    lines = []
    for l in pre:
        if l.count("□") > 1: lines += [p for p in re.split(r"\s*□\s*", l) if p]
        else: lines.append(re.sub(r"^□\s*", "", l))
    is_test = bool(re.search("тест", c["title"], re.I)) or D["lesson"] == 30
    answers, kept = [], []
    for l in lines:
        lab = (re.match(r"^(\d+)\)", l) or re.match(r"^([а-е]\))", l) or re.match(r"^(Задача\s*\d+)", l, re.I))
        lab = lab.group(1) if lab else ""
        if re.match(r"^Для (тренера|учителя)\s*:", l, re.I):
            answers.append(["Тренеру", re.sub(r"^Для (тренера|учителя)\s*:\s*", "", l, flags=re.I)]); continue
        out = l
        def take(mm):
            answers.append([lab, mm.group(1).strip()]); return ""
        out = re.sub(r"\s*\(?\s*Ответы?\s*:\s*([^)]*)\)?\.?\s*$", take, out, flags=re.I)
        mm = re.search(r"\s*\(\s*(?:[ответ]+:)?\s*([^()]{1,120})\)\.?$", out, flags=re.I)
        if mm:
            before = out[:mm.start()]
            ans = mm.group(1).strip()
            if re.search(r"\?\s*$", before) or (is_test and (re.match(r"^[А-ЕA-E]$", ans) or re.match(r"^\d+\)", l))):
                answers.append([lab, ans]); out = before
        out = out.strip()
        if out: kept.append(out)
    hand = next((x for x in kept if re.match(r"^Сдать:", x, re.I)), None)
    if hand: kept.remove(hand)
    return {"n": num, "title": title or "Задание", "lines": kept, "hand": hand, "answers": [[a, uc(b)] for a, b in answers]}

def examples(body):
    marks = list(re.finditer(r"(Казахстанск[а-яё]* пример|Мировой пример|Пример из мира|Казахстан[а-яё]*|Мир[а-яё]*|Задача[^:.]{0,40}|Расчёт[^:.]{0,30}|Пример[^:.]{0,30}|Школьн[а-яё]*[^:.]{0,30}|Второй пример|Третий пример)\s*:", body, re.I))
    segs = []
    if marks:
        pre = body[:marks[0].start()].strip()
        if pre: segs.append({"lab": "Пример", "text": pre})
        for i, m in enumerate(marks):
            end = marks[i + 1].start() if i + 1 < len(marks) else len(body)
            segs.append({"lab": m.group(1).strip(), "text": body[m.end():end].strip()})
    else:
        segs = [{"lab": "Пример", "text": t} for t in sentences(body)]
    for s in segs:
        if re.match(r"^пример$", s["lab"], re.I):
            m = re.match(r"^(Казахстан[а-яё]*|Мир[а-яё]*)[\s,:]", s["text"], re.I)
            if m: s["lab"] = m.group(1)
        s["lab"] = uc(s["lab"]); s["text"] = uc(s["text"].lstrip(" —–-"))
    merged = []
    for s in segs:
        if merged and merged[-1]["lab"] == s["lab"] and len(merged[-1]["text"]) + len(s["text"]) < 420: merged[-1]["text"] += " " + s["text"]
        else: merged.append(dict(s))
    return [s for s in merged if s["text"]]

def strip_kz(t):
    lines = [x for x in sentences(t) if not re.match(r"^(На уроке|Вопрос ученикам|Показать|Покажите|Попросите|Спросите|Предложите|Обсудите|Задайте)", x, re.I)]
    link = next((x for x in lines if re.match(r"^Связь с темой", x, re.I)), None)
    return {"text": " ".join(x for x in lines if x != link), "link": re.sub(r"^Связь с темой\s*:?\s*", "", link or "", flags=re.I)}

def lesson(D, key):
    sec = lambda k: next((s for s in D.get("theory_sections") or [] if s["kind"] == k), None)
    w = warmup(D)
    stages = [{"stage": s["stage"], "min": int(re.search(r"\d+", s["min"]).group())} for s in D.get("stages") or [] if re.search(r"\d", s.get("min", ""))]
    if stages and w and re.search(r"начало|разогрев|разминк", stages[0]["stage"] + (D["stages"][0].get("teacher") or ""), re.I):
        stages[0]["stage"] = f"Разминка «{w['name']}»"
    L = {"id": key, "g": D["grade"], "l": D["lesson"], "topic": D.get("topic") or D.get("file_topic"), "module": D.get("module"), "format": D.get("format"),
         "skills": D.get("skills_list") or [], "goal": D.get("goal"), "criteria": D.get("criteria_list") or [], "result": D.get("result"),
         "stages": stages if len(stages) >= 3 else [], "warm": w,
         "glossary": [{"term": g["term"], "def": uc(g["def"].rstrip("."))} for g in D.get("glossary_list") or [] if g.get("term") and g.get("def")],
         "english": D.get("english") or ""}
    c = sec("concepts")
    if c: L["concepts"] = {"head": uc(c["head"]) if c.get("head") and len(c["head"]) < 40 else "Главное о теме", "items": sentences(c["body"])}
    s = sec("steps")
    if s: L["steps"] = {"head": uc(s.get("head") or "По шагам"), "items": [uc(x.rstrip(";.")) for x in parse_steps(s["body"])]}
    sc = sec("scheme")
    if sc: L["scheme"] = uc(re.sub(r"^[:\s]+", "", sc["body"]))
    e = sec("examples")
    if e: L["examples"] = examples(e["body"])
    mi = sec("mistake")
    if mi:
        myth, fix = mi.get("myth"), mi.get("fix")
        if not myth:
            parts = re.split(r"\s*Разбира?е?м?\s*:\s*|\s*Разбор\s*:\s*", mi["body"], maxsplit=1)
            myth, fix = parts[0], parts[1] if len(parts) > 1 else ""
        L["mistake"] = {"myth": uc(re.sub(r"^[:\s]+", "", myth).rstrip(".")), "fix": uc((fix or "").strip())}
    q = sec("questions")
    if q: L["check"] = parse_questions(q["body"])[:6]
    if D.get("kz"): L["kz"] = strip_kz(D["kz"])
    if D.get("global"): L["world"] = strip_kz(D["global"])
    if D.get("fact"): L["fact"] = re.sub(r"\s*\((?:проверить|источник)[^)]*\)", "", D["fact"], flags=re.I).strip()
    L["cards"] = [card(cd, i, D) for i, cd in enumerate(c2 for c2 in D.get("cards") or [] if not STOCK_WARM.search(c2["title"]))]
    for k in ("homework", "support", "advanced"):
        if D.get(k): L[k] = D[k]
    # photo + discussion
    ph = os.path.join(SRC, "photos", key + ".jpg")
    if os.path.exists(ph):
        meta = json.load(open(os.path.join(SRC, "photos", key + ".json"), encoding="utf-8"))
        gq = re.search(r"Вопрос[^:]*:\s*(.+?\?)", D.get("global") or "")
        L["photo"] = {"src": f"lessons/img/{key}.jpg", "author": meta.get("author", ""),
                      "q": ["Что вы видите на фото? Как это связано с нашей темой?", uc(gq.group(1).strip()) if gq else f"Где в нашем городе можно встретить тему «{L['topic']}»?"]}
        dst = os.path.join(OUT, "img", key + ".jpg")
        if not os.path.exists(dst):
            im = Image.open(ph).convert("RGB"); im.thumbnail((1100, 1100), Image.LANCZOS); im.save(dst, "JPEG", quality=70, optimize=True, progressive=True)
    deck = os.path.join(SRC, "out", key + ".pptx")
    if os.path.exists(deck):
        asset = f"qsbi-g{key[:2]}-l{key[3:]}.pptx"
        L["deck"] = {"url": RELEASE_URL + asset, "name": (D.get("file") or "").replace(".docx", ".pptx"), "mb": round(os.path.getsize(deck) / 1e6, 1)}
        rel = os.path.join(OUT, "tools", "release", asset)
        if not os.path.exists(rel) or os.path.getsize(rel) != os.path.getsize(deck): shutil.copyfile(deck, rel)
    return L

def main():
    for d in ("data", "img", "tools/release"): os.makedirs(os.path.join(OUT, d), exist_ok=True)
    by_grade, problems = {}, []
    for f in sorted(glob.glob(os.path.join(SRC, "data", "*.json"))):
        key = os.path.basename(f)[:-5]
        D = json.load(open(f, encoding="utf-8"))
        L = lesson(D, key)
        if not L["cards"]: problems.append(f"{key}: no cards")
        if not L.get("deck"): problems.append(f"{key}: no pptx")
        by_grade.setdefault(D["grade"], []).append(L)
    index = {}
    for g, ls in sorted(by_grade.items()):
        ls.sort(key=lambda x: x["l"])
        with open(os.path.join(OUT, "data", f"g{g:02d}.js"), "w", encoding="utf-8") as fh:
            fh.write(f"window.QSBI_LESSONS=window.QSBI_LESSONS||{{}};QSBI_LESSONS[{g}]=")
            json.dump(ls, fh, ensure_ascii=False, separators=(",", ":")); fh.write(";\n")
        index[g] = [{"l": x["l"], "topic": x["topic"], "module": x["module"], "format": x["format"], "photo": bool(x.get("photo"))} for x in ls]
    with open(os.path.join(OUT, "data", "index.js"), "w", encoding="utf-8") as fh:
        fh.write("window.QSBI_LESSON_INDEX="); json.dump(index, fh, ensure_ascii=False, separators=(",", ":")); fh.write(";\n")
    total = sum(len(v) for v in by_grade.values())
    print(f"lessons: {total} in {len(by_grade)} grades | problems: {problems or 'none'}")

main()
