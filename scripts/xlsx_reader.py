"""Minimal xlsx reader using only the standard library (no openpyxl).

xlsx is a zip of XML. We read sharedStrings + each sheet, resolve cell
references (A1, B2, ...) into a 2D grid of strings.
"""
import zipfile
import re
import xml.etree.ElementTree as ET

NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"


def col_to_idx(col_letters):
    idx = 0
    for ch in col_letters:
        idx = idx * 26 + (ord(ch) - ord("A") + 1)
    return idx - 1


def parse_ref(ref):
    m = re.match(r"([A-Z]+)(\d+)", ref)
    col = col_to_idx(m.group(1))
    row = int(m.group(2)) - 1
    return row, col


def read_workbook(path):
    z = zipfile.ZipFile(path)

    # shared strings
    shared = []
    if "xl/sharedStrings.xml" in z.namelist():
        root = ET.fromstring(z.read("xl/sharedStrings.xml"))
        for si in root.findall(f"{NS}si"):
            # concatenate all <t> descendants (handles rich text runs)
            text = "".join(t.text or "" for t in si.iter(f"{NS}t"))
            shared.append(text)

    # sheet name -> file mapping
    wb = ET.fromstring(z.read("xl/workbook.xml"))
    rels = ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
    rel_ns = "{http://schemas.openxmlformats.org/package/2006/relationships}"
    rid_to_target = {}
    for r in rels.findall(f"{rel_ns}Relationship"):
        rid_to_target[r.get("Id")] = r.get("Target")

    r_ns = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"
    sheets = {}
    for s in wb.find(f"{NS}sheets").findall(f"{NS}sheet"):
        name = s.get("name")
        rid = s.get(f"{r_ns}id")
        target = rid_to_target[rid].lstrip("/")
        if not target.startswith("xl/"):
            target = "xl/" + target
        sheets[name] = target

    def read_sheet(target):
        root = ET.fromstring(z.read(target))
        data = root.find(f"{NS}sheetData")
        grid = {}
        maxr = maxc = 0
        for row in data.findall(f"{NS}row"):
            for c in row.findall(f"{NS}c"):
                ref = c.get("r")
                r, col = parse_ref(ref)
                t = c.get("t")
                v = c.find(f"{NS}v")
                is_node = c.find(f"{NS}is")
                if t == "s":
                    val = shared[int(v.text)] if v is not None else ""
                elif t == "inlineStr" and is_node is not None:
                    val = "".join(x.text or "" for x in is_node.iter(f"{NS}t"))
                else:
                    val = v.text if v is not None else ""
                grid[(r, col)] = val
                maxr = max(maxr, r)
                maxc = max(maxc, col)
        rows = []
        for r in range(maxr + 1):
            rows.append([grid.get((r, c), "") for c in range(maxc + 1)])
        return rows

    return {name: read_sheet(target) for name, target in sheets.items()}


if __name__ == "__main__":
    import sys
    wb = read_workbook("tarkov_hideout_requirements_2026-06-14.xlsx")
    for name, rows in wb.items():
        print("=" * 60)
        print("SHEET:", name, "rows:", len(rows))
        for row in rows[:8]:
            print(row)
