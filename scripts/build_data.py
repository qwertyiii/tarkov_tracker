# -*- coding: utf-8 -*-
"""Convert the 'Требования' sheet of the xlsx into src/data/data.json.

Run: python scripts/build_data.py
Reads:  tarkov_hideout_requirements_2026-06-14.xlsx
Writes: src/data/data.json
"""
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(__file__))
from xlsx_reader import read_workbook  # noqa: E402

XLSX = "tarkov_hideout_requirements_ru_2026-06-14.xlsx"
OUT = os.path.join("src", "data", "data.json")

ITEM_TYPES = {"Предмет", "Опционально"}  # collectible items; rest are conditions


def slugify(name):
    return re.sub(r"[^\w]+", "-", name.lower(), flags=re.UNICODE).strip("-") or "module"


def to_int(s):
    s = (s or "").strip()
    if s == "":
        return None
    return int(float(s))


def build():
    wb = read_workbook(XLSX)
    sheet_names = list(wb.keys())
    req = wb[sheet_names[0]]          # Требования
    notes = wb[sheet_names[2]]        # Примечания

    # date from notes sheet
    date = "2026-06-14"
    for row in notes:
        if len(row) >= 2 and "актуальны" in (row[0] or ""):
            date = (row[1] or "").strip()
            break

    modules = {}   # id -> module dict
    order = []      # preserve first-seen module order

    for row in req[1:]:
        module = (row[0] or "").strip()
        if not module:
            continue
        level = to_int(row[1])
        typ = (row[2] or "").strip()
        requirement = (row[3] or "").strip()
        qty = to_int(row[4])
        fir_raw = (row[5] or "").strip()
        note = (row[6] or "").strip()

        mid = slugify(module)
        if mid not in modules:
            modules[mid] = {
                "id": mid,
                "name": module,
                "maxLevel": 0,
                "isEvent": module in ("Christmas Tree", "Елка"),
                "_levels": {},   # level -> {items, conditions}
            }
            order.append(mid)
        m = modules[mid]
        m["maxLevel"] = max(m["maxLevel"], level)
        lvl = m["_levels"].setdefault(level, {"items": [], "conditions": []})

        if typ in ITEM_TYPES:
            item = {
                "name": requirement,
                "qty": qty if qty is not None else 1,
                "fir": fir_raw == "Да",
                "optional": typ == "Опционально",
            }
            if note:
                item["note"] = note
            lvl["items"].append(item)
        else:
            cond = {"type": typ, "text": requirement}
            if typ == "Валюта" and qty is not None:
                cond["qty"] = qty
            if note:
                cond["note"] = note
            lvl["conditions"].append(cond)

    # finalize: sort levels, items (required first), strip helper key
    out_modules = []
    for mid in order:
        m = modules[mid]
        levels = []
        for lvl_num in sorted(m["_levels"].keys()):
            data = m["_levels"][lvl_num]
            items = sorted(data["items"], key=lambda it: it["optional"])
            levels.append({
                "level": lvl_num,
                "items": items,
                "conditions": data["conditions"],
            })
        out_modules.append({
            "id": m["id"],
            "name": m["name"],
            "maxLevel": m["maxLevel"],
            "isEvent": m["isEvent"],
            "levels": levels,
        })

    result = {
        "meta": {
            "date": date,
            "source": "https://escapefromtarkov.fandom.com/wiki/Hideout",
        },
        "modules": out_modules,
    }

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    item_rows = sum(len(l["items"]) for m in out_modules for l in m["levels"])
    cond_rows = sum(len(l["conditions"]) for m in out_modules for l in m["levels"])
    print(f"Wrote {OUT}")
    print(f"Modules: {len(out_modules)}  item rows: {item_rows}  condition rows: {cond_rows}")
    return result


if __name__ == "__main__":
    build()
