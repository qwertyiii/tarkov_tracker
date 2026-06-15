# -*- coding: utf-8 -*-
"""Собирает src/data/kappa.json: предметы квеста «Коллекционер» (награда —
контейнер Каппа) из бесплатного GraphQL API tarkov.dev (на русском).

Запуск: python scripts/build_kappa.py  (или npm run build:kappa)

Предохранители (как в build_icons.py):
- При ошибке сети скрипт НЕ падает и НЕ затирает существующий kappa.json.
- kappa.json существует всегда (минимум []), иначе статический импорт в
  приложении сломает сборку.
- Если рядом есть scripts/kappa_overrides.json (массив того же формата) —
  применяется поверх результата (ручные правки в приоритете).
"""
import json
import os
import sys
import urllib.request

from dl_icon import localize

API = "https://api.tarkov.dev/graphql"
QUERY = """
{
  tasks(lang: ru) {
    name
    normalizedName
    objectives {
      ... on TaskObjectiveItem {
        item { id name shortName iconLink gridImageLink }
        count
      }
    }
  }
}
"""

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "src", "data", "kappa.json")
OVERRIDES = os.path.join(ROOT, "scripts", "kappa_overrides.json")


def ensure_file():
    """Гарантирует, что kappa.json существует (минимум [])."""
    if not os.path.exists(OUT):
        with open(OUT, "w", encoding="utf-8") as f:
            f.write("[]")


def load_overrides():
    if os.path.exists(OVERRIDES):
        try:
            with open(OVERRIDES, encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:  # noqa: BLE001
            print(f"[kappa] предупреждение: не удалось прочитать overrides: {e}")
    return []


def fetch_tasks():
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
    return payload["data"]["tasks"]


def main():
    ensure_file()

    try:
        tasks = fetch_tasks()
    except Exception as e:  # noqa: BLE001
        print(f"[kappa] предупреждение: API недоступен ({e}).")
        print(f"[kappa] существующий {os.path.relpath(OUT, ROOT)} не тронут.")
        ensure_file()
        return 0

    collector = next((t for t in tasks if t.get("normalizedName") == "collector"), None)
    if not collector:
        print("[kappa] предупреждение: задача 'collector' не найдена в API.")
        print(f"[kappa] существующий {os.path.relpath(OUT, ROOT)} не тронут.")
        ensure_file()
        return 0

    # Уникальные предметы по id из целей задачи (TaskObjectiveItem.item).
    result = []
    seen = set()
    for obj in collector.get("objectives") or []:
        item = obj.get("item")
        if not item:
            continue
        iid = item.get("id")
        if not iid or iid in seen:
            continue
        seen.add(iid)
        result.append(
            {
                "id": iid,
                "name": (item.get("name") or "").strip(),
                "short": (item.get("shortName") or "").strip(),
                # Скачиваем иконку к себе в public/icons и пишем локальный путь.
                "icon": localize(item.get("iconLink") or item.get("gridImageLink") or ""),
            }
        )

    # Ручные правки поверх (по id заменяем/добавляем).
    overrides = load_overrides()
    if overrides:
        by_id = {it["id"]: it for it in result}
        for ov in overrides:
            by_id[ov["id"]] = ov
        result = list(by_id.values())

    result.sort(key=lambda it: it["name"].lower())

    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    print(f"[kappa] задача: {collector.get('name')}")
    print(f"[kappa] предметов: {len(result)}")
    print(f"[kappa] записано: {os.path.relpath(OUT, ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
