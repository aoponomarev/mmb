---
id: ais-bfd150
status: active
last_updated: "2026-03-02"
related_skills:
  - sk-883639
  - sk-02d3ea

---

# AIS: Фундаментальная Архитектура (Architecture Concepts)



## Концепция (High-Level Concept)

Новое приложение строится на принципах строгой изоляции слоев, отказа от транзитных аббревиатур легаси-проекта и централизации истины (SSOT). Мы мыслим категориями независимых контуров, которые взаимодействуют только через контракты.

## Инфраструктура и Потоки данных (Infrastructure & Data Flow)

Система разделена на три жестко изолированных контура:

- `**app/**` — клиентский интерфейс, бизнес-логика пользователя (Vue). Отвечает только за отображение и реактивность.
- `**core/**` — ядро приложения, независимое от фреймворков (Vue/React) и платформы (Браузер/Node). Содержит бизнес-правила, математические модели и менеджеры провайдеров.
- `**is/` (Information System / Infrastructure)** — инфраструктурный контур: облачные воркеры (Cloudflare), скрипты автоматизации (MCP, Preflight), базы данных (SQLite, D1), управление секретами и архитектурные гейты (Causality).

## Локальные Политики (Module Policies)

- **Отказ от легаси-терминологии (Anti-Calque):** Жестко избегаем транзитных аббревиатур (MBB / MMB). Мы используем стандартную IT-терминологию (Target App, SSOT) для снижения когнитивной нагрузки и предотвращения галлюцинаций ИИ.
- **Концепция SSOT (Single Source of Truth):** Вся правда о конфигурации должна лежать в одном месте:
  - *Пути:* Реестр путей.
  - *Секреты:* Окружение `.env` (только локально) и зашифрованные архивы.
  - *Нейминг:* Строгие правила для именования файлов и папок.

## Компоненты и Контракты (Components & Contracts)

- Взаимодействие между слоями (например, `app/` вызывает `core/api/`) происходит строго через интерфейсы менеджеров (например, `AIProviderManager`, `DataProviderManager`).
- Инфраструктура настроена на принцип **Fail-Fast**: система должна падать на этапе сборки/префлайта, если нарушен контракт (например, удален казуальный хэш без причины), а не деградировать в рантайме.

## Лог перепривязки legacy-маршрутизации

| Legacy path | Атомарный шаг | Риск | Статус | Новый путь / rationale |
|------------|--------------|------|--------|---------------------------|
| `is/scripts/architecture/` | `LIR-008.A1` | Legacy bucket in old path notation | `MAPPED` | `is/scripts/architecture/` |
| `is/scripts/infrastructure/` | `LIR-008.A2` | Legacy bucket in old path notation | `MAPPED` | `is/scripts/infrastructure/` |
| `is/scripts/secrets/` | `LIR-008.A3` | Legacy bucket in old path notation | `MAPPED` | `is/scripts/secrets/` |
| `is/scripts/tests/` | `LIR-008.A4` | Legacy bucket in old path notation | `MAPPED` | `is/scripts/tests/` |
| `lib-loader.js` | `LIR-014.A1` | Legacy loader token in layout governance skill | `MAPPED` | `core/module-loader.js` + `core/modules-config.js` |
| `libs/assets/coins/` | `LIR-014.A2` | Historical assets bucket not deployed in current Target App structure | `REQUIRES_ARCH_CHANGE` | Deferred infra/assets decision; keep as non-active contract until dedicated assets path exists |

