---
id: env-pc-office
label: pc-office
description: "Office PC — current environment after Node/Python/Build Tools setup."
last_updated: "2026-03-06"

---
<!-- Важно: оставлять пустую строку перед "---" ! -->

# pc-office (Офисный ПК)

Текущая машина. Окружение приведено в порядок после рассинхрона с домашним ПК (Node, Python, better-sqlite3).

| Компонент | Значение |
|-----------|----------|
| **Node** | 18.12.0, `C:\Program Files\nodejs` |
| **Python** | 3.12.10; установлен setuptools (для node-gyp/distutils) |
| **Build** | Visual Studio 2022 Build Tools, workload C++ |
| **Терминал** | `.vscode/settings.json` → Path с префиксом Node выше |
| **better-sqlite3** | Собран локально; preflight проходит |

При миграции на другой офисный ПК использовать этот профиль как образец и id:env-pc-readme (.cursor/environment-pc/README.md) для чеклиста.
