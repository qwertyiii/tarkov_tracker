# -*- coding: utf-8 -*-
"""Собирает src/data/icons.json: для предметов из data.json подтягивает иконку и
короткое имя из бесплатного GraphQL API tarkov.dev (на русском).

Запуск: python scripts/build_icons.py  (или npm run build:icons)

Предохранители (важно для прогона без присмотра):
- Сопоставление имён ТОЛЬКО точное (после лёгкой нормализации). Никакого
  нечёткого поиска: лучше предмет без картинки, чем чужая картинка.
- Несовпавшие имена выгружаются в scripts/icons_unmatched.txt.
- Если рядом есть scripts/icons_overrides.json — он применяется поверх (ручные
  правки в приоритете).
- При ошибке сети скрипт НЕ падает и НЕ затирает существующий icons.json.
  icons.json существует всегда (минимум {}), иначе статический импорт в
  приложении сломает сборку.
"""
import json
import os
import re
import sys
import urllib.request

from dl_icon import localize

API = "https://api.tarkov.dev/graphql"
QUERY = "{ items(lang: ru) { name shortName iconLink gridImageLink } }"

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "src", "data", "data.json")
OUT = os.path.join(ROOT, "src", "data", "icons.json")
UNMATCHED = os.path.join(ROOT, "scripts", "icons_unmatched.txt")
OVERRIDES = os.path.join(ROOT, "scripts", "icons_overrides.json")


def normalize(name):
    """trim + нижний регистр + схлопывание пробелов; ё == е."""
    s = (name or "").strip().lower().replace("ё", "е")
    s = re.sub(r"\s+", " ", s)
    return s


def ensure_icons_file():
    """Гарантирует, что icons.json существует (минимум {})."""
    if not os.path.exists(OUT):
        with open(OUT, "w", encoding="utf-8") as f:
            f.write("{}")


def load_overrides():
    if os.path.exists(OVERRIDES):
        try:
            with open(OVERRIDES, encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:  # noqa: BLE001
            print(f"[icons] предупреждение: не удалось прочитать overrides: {e}")
    return {}


def fetch_items():
    body = json.dumps({"query": QUERY}).encode("utf-8")
    req = urllib.request.Request(
        API,
        data=body,
        headers={"Content-Type": "application/json", "User-Agent": "tarkov-tracker"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        payload = json.loads(resp.read().decode("utf-8"))
    if "errors" in payload and payload["errors"]:
        raise RuntimeError(f"GraphQL errors: {payload['errors']}")
    return payload["data"]["items"]


def main():
    ensure_icons_file()

    # Нужные имена предметов из data.json
    with open(DATA, encoding="utf-8") as f:
        data = json.load(f)
    wanted = set()
    for m in data["modules"]:
        for lvl in m["levels"]:
            for it in lvl["items"]:
                wanted.add(it["name"])

    # Тянем каталог tarkov.dev. При любой ошибке сети — мягкий выход.
    try:
        items = fetch_items()
    except Exception as e:  # noqa: BLE001
        print(f"[icons] предупреждение: API недоступен ({e}).")
        print(f"[icons] существующий {os.path.relpath(OUT, ROOT)} не тронут.")
        ensure_icons_file()
        return 0

    # Индекс по нормализованному имени. Берём первое непустое значение иконки.
    by_norm = {}
    for it in items:
        key = normalize(it.get("name"))
        if not key or key in by_norm:
            continue
        icon = it.get("iconLink") or it.get("gridImageLink") or ""
        by_norm[key] = {"icon": icon, "short": (it.get("shortName") or "").strip()}

    result = {}
    unmatched = []
    for name in sorted(wanted):
        hit = by_norm.get(normalize(name))
        if hit and hit.get("icon"):
            # Скачиваем иконку к себе в public/icons и пишем локальный путь.
            local = localize(hit["icon"])
            if local:
                result[name] = {"icon": local, "short": hit.get("short", "")}
            else:
                unmatched.append(name)
        else:
            unmatched.append(name)

    # Ручные правки поверх результата
    overrides = load_overrides()
    for name, val in overrides.items():
        result[name] = val
        if name in unmatched:
            unmatched.remove(name)

    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2, sort_keys=True)
    with open(UNMATCHED, "w", encoding="utf-8") as f:
        f.write("\n".join(unmatched) + ("\n" if unmatched else ""))

    print(f"[icons] предметов в data.json: {len(wanted)}")
    print(f"[icons] совпало: {len(result)}  без картинки: {len(unmatched)}")
    print(f"[icons] записано: {os.path.relpath(OUT, ROOT)}")
    print(f"[icons] несовпавшие: {os.path.relpath(UNMATCHED, ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
