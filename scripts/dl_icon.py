# -*- coding: utf-8 -*-
"""Общий загрузчик иконок: скачивает картинку в public/icons/ и возвращает
локальный путь /icons/<имя>. Используется всеми тремя build-скриптами, поэтому
одинаковые иконки (один предмет в убежище и в Каппе) качаются один раз.
"""
import os
import urllib.request

# Путь к public/icons относительно корня проекта (на уровень выше scripts/).
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ICONS_DIR = os.path.join(ROOT, "public", "icons")


def localize(url):
    """Скачивает иконку в public/icons (если её ещё нет) и возвращает путь
    вида /icons/<имя>. При ошибке возвращает '' (тогда покажется заглушка).
    Уже скачанные файлы повторно не качаются — можно перезапускать."""
    if not url:
        return ""
    fname = url.split("/")[-1].split("?")[0]
    if not fname:
        return ""
    os.makedirs(ICONS_DIR, exist_ok=True)
    dest = os.path.join(ICONS_DIR, fname)
    if not os.path.exists(dest):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=30) as r, open(dest, "wb") as f:
                f.write(r.read())
        except Exception as e:  # noqa: BLE001
            print("  не скачалось:", url, e)
            return ""
    return "/icons/" + fname
