# -*- coding: utf-8 -*-
"""Self-check: compute свод from data.json (all builtLevels=0, empty collected)
and compare against the 'Свод предметов' sheet of the xlsx.

Compares per item (name + FIR class): total qty, FIR/std split, usedIn list.
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from xlsx_reader import read_workbook  # noqa: E402

XLSX = "tarkov_hideout_requirements_2026-06-14.xlsx"


def compute_summary():
    with open(os.path.join("src", "data", "data.json"), encoding="utf-8") as f:
        data = json.load(f)
    # name -> {"fir": qty, "std": qty, "usedIn": [..]}
    agg = {}
    for m in data["modules"]:
        for lvl in m["levels"]:            # builtLevels=0 -> all levels count
            for it in lvl["items"]:
                # The reference 'Свод предметов' sheet counts only mandatory
                # items; optional ones are excluded there (the app shows them
                # with an "опционально" badge per ТЗ 6.2). Exclude here so the
                # parse/aggregation check is apples-to-apples.
                if it.get("optional"):
                    continue
                e = agg.setdefault(it["name"], {"fir": 0, "std": 0, "used": []})
                if it["fir"]:
                    e["fir"] += it["qty"]
                else:
                    e["std"] += it["qty"]
                e["used"].append(f"{m['name']} {lvl['level']}")
    return agg


def read_reference():
    wb = read_workbook(XLSX)
    sheet = wb[list(wb.keys())[1]]   # Свод предметов
    # header: Предмет, Всего штук, Из них FIR, Обычные, Где используется
    ref = {}
    for row in sheet[1:]:
        name = (row[0] or "").strip()
        if not name:
            continue
        ref[name] = {
            "total": int(float(row[1] or 0)),
            "fir": int(float(row[2] or 0)),
            "std": int(float(row[3] or 0)),
            "used": [u.strip() for u in (row[4] or "").split(";") if u.strip()],
        }
    return ref


def main():
    agg = compute_summary()
    ref = read_reference()

    errors = 0
    only_computed = set(agg) - set(ref)
    only_ref = set(ref) - set(agg)
    if only_computed:
        errors += 1
        print("Items only in computed:", sorted(only_computed))
    if only_ref:
        errors += 1
        print("Items only in reference:", sorted(only_ref))

    for name in sorted(set(agg) & set(ref)):
        a = agg[name]
        r = ref[name]
        total = a["fir"] + a["std"]
        if total != r["total"] or a["fir"] != r["fir"] or a["std"] != r["std"]:
            errors += 1
            print(f"QTY MISMATCH {name!r}: computed total={total} fir={a['fir']} std={a['std']}"
                  f" | ref total={r['total']} fir={r['fir']} std={r['std']}")
        if sorted(a["used"]) != sorted(r["used"]):
            errors += 1
            print(f"USEDIN MISMATCH {name!r}:")
            print("  computed:", sorted(a["used"]))
            print("  ref     :", sorted(r["used"]))

    print("-" * 50)
    print(f"Computed items: {len(agg)}  Reference items: {len(ref)}")
    if errors == 0:
        print("OK — свод полностью совпадает с эталонным листом.")
    else:
        print(f"FAILED — {errors} mismatch group(s).")
    return errors


if __name__ == "__main__":
    sys.exit(1 if main() else 0)
