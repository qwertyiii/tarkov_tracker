# -*- coding: utf-8 -*-
"""Собирает src/data/module_icons.json: для модулей убежища из data.json
подтягивает иконку станции из GraphQL API tarkov.dev (hideoutStations, ru).

Запуск: python scripts/build_module_icons.py  (или npm run build:modicons)

Предохранители (как в build_icons.py):
- Сопоставление имён ТОЛЬКО точное (после лёгкой нормализации).
- Несовпавшие модули выгружаются в scripts/module_icons_unmatched.txt.
- scripts/module_icons_overrides.json (ключ — moduleId) применяется поверх.
- При ошибке сети не падать и не затирать существующий файл; module_icons.json
  существует всегда (минимум {}), иначе статический импорт сломает сборку.
"""
import json
import os
import re
import sys
import urllib.request

from dl_icon import localize

API = "https://api.tarkov.dev/graphql"
QUERY = "{ hideoutStations(lang: ru) { name normalizedName imageLink } }"

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "src", "data", "data.json")
OUT = os.path.join(ROOT, "src", "data", "module_icons.json")
UNMATCHED = os.path.join(ROOT, "scripts", "module_icons_unmatched.txt")
OVERRIDES = os.path.join(ROOT, "scripts", "module_icons_overrides.json")


def normalize(name):
    """trim + нижний регистр + схлопывание пробелов; ё == е."""
    s = (name or "").strip().lower().replace("ё", "е")
    s = re.sub(r"\s+", " ", s)
    return s


def ensure_file():
    """Гарантирует, что module_icons.json существует (минимум {})."""
    if not os.path.exists(OUT):
        with open(OUT, "w", encoding="utf-8") as f:
            f.write("{}")


def load_overrides():
    if os.path.exists(OVERRIDES):
        try:
            with open(OVERRIDES, encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:  # noqa: BLE001
            print(f"[modicons] предупреждение: не удалось прочитать overrides: {e}")
    return {}


def fetch_stations():
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
    return payload["data"]["hideoutStations"]


def main():
    ensure_file()

    # Модули из data.json: id + name
    with open(DATA, encoding="utf-8") as f:
        data = json.load(f)
    modules = [(m["id"], m["name"]) for m in data["modules"]]

    # Тянем станции tarkov.dev. При любой ошибке сети — мягкий выход.
    try:
        stations = fetch_stations()
    except Exception as e:  # noqa: BLE001
        print(f"[modicons] предупреждение: API недоступен ({e}).")
        print(f"[modicons] существующий {os.path.relpath(OUT, ROOT)} не тронут.")
        ensure_file()
        return 0

    # Индекс станций по нормализованному имени. Берём первую непустую картинку.
    by_norm = {}
    for st in stations:
        key = normalize(st.get("name"))
        if not key or key in by_norm:
            continue
        img = st.get("imageLink") or ""
        if img:
            by_norm[key] = img

    result = {}
    unmatched = []
    for mid, name in modules:
        img = by_norm.get(normalize(name))
        # Скачиваем иконку к себе в public/icons и пишем локальный путь.
        local = localize(img) if img else ""
        if local:
            result[mid] = local
        else:
            unmatched.append(f"{mid}\t{name}")

    # Ручные правки поверх результата (ключ — moduleId)
    overrides = load_overrides()
    for mid, img in overrides.items():
        result[mid] = img
        unmatched = [u for u in unmatched if not u.startswith(mid + "\t")]

    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2, sort_keys=True)
    with open(UNMATCHED, "w", encoding="utf-8") as f:
        f.write("\n".join(unmatched) + ("\n" if unmatched else ""))

    print(f"[modicons] модулей: {len(modules)}")
    print(f"[modicons] совпало: {len(result)}  без иконки: {len(unmatched)}")
    print(f"[modicons] записано: {os.path.relpath(OUT, ROOT)}")
    print(f"[modicons] несовпавшие: {os.path.relpath(UNMATCHED, ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
