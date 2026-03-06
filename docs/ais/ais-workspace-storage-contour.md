---
id: ais-91b7f4
status: active
last_updated: "2026-03-05"
related_skills:
  - sk-02d3ea
related_ais:
  - ais-c6c35b
  - ais-c4e9b2

---
<!-- Важно: оставлять пустую строку перед "---" ! -->

# AIS: Контур хранения workspace-настроек (auth/non-auth)

## Идентификация и цель

- id: `ais-91b7f4` — спецификация контура хранения и восстановления UI/workspace-настроек.
- Цель: единый, предсказуемый контракт хранения состояния интерфейса в двух режимах:
  1) неавторизованный пользователь (локальный режим),
  2) авторизованный пользователь (облачный режим с привязкой к аккаунту).
- Принцип: SSOT на уровне клиента через `workspaceConfig`, с синхронизацией в Cloudflare для авторизованной сессии.

## Что входит в workspace

Контракт workspace задается в #JS-fW2M5Jbg (core/config/workspace-config.js):

- `activeModelId`
- `activeCoinSetIds`
- `mainTable`:
  - `selectedCoinIds`
  - `sortBy`
  - `sortOrder`
  - `coinSortType`
  - `showPriceColumn`
- `metrics`:
  - `horizonDays`
  - `mdnHours`
  - `activeTabId`
  - `agrMethod` (поддерживается merge-логикой)

Важно: именно этот объект считается рабочим состоянием экрана и должен быть консистентен между режимами.

## Режимы хранения

### 1) Неавторизованный режим (локальный)

Источник данных:

- `workspaceConfig` -> `cacheManager` (primary)
- fallback -> `localStorage['workspaceConfig']`

Сценарии:

- При открытии страницы workspace загружается локально.
- Если `activeCoinSetIds` пустой, таблица грузится в дефолтном режиме (`top`/50).
- Все изменения UI сохраняются через `workspaceConfig.saveWorkspace(...)`.

### 2) Авторизованный режим (облачный)

Источник данных:

- Cloudflare Worker API:
  - `GET /api/settings` (получение `data.workspace`)
  - `PUT /api/settings/workspace` (сохранение workspace)
- KV key scope: user-scoped (через JWT user context в worker).

Сценарии:

- После успешной авторизации:
  - делается snapshot локального pre-auth workspace;
  - выполняется попытка загрузки cloud workspace;
  - если cloud workspace найден — применяется к UI;
  - если cloud workspace отсутствует — локальный snapshot инициализирует облако.
- Во время авторизованной работы:
  - изменения workspace пишутся локально + debounce-синхронизация в облако.

## Архитектурный поток (SSOT + sync)

```mermaid
flowchart TD
    subgraph client [Frontend]
        UI[app-ui-root.js]
        WS[workspaceConfig]
        L1[cacheManager]
        L2[localStorage fallback]
        CWC[cloud-workspace-client]
    end

    subgraph cloud [Cloudflare]
        API[/api/settings]
        KV[SETTINGS KV user scope]
    end

    UI -->|saveTableSettings/saveActiveCoinSetIds| WS
    WS --> L1
    WS --> L2
    UI -->|authenticated| CWC
    CWC --> API
    API --> KV
    KV --> API
    API --> CWC
    CWC -->|workspace| UI
```

## Контракты компонентов и модулей

### `core/config/workspace-config.js`

- Локальный SSOT для структуры workspace.
- Частичные обновления через merge без потери остальных полей.
- Fallback-поведение при ошибках cacheManager.

### `core/api/cloudflare/cloud-workspace-client.js`

- Транспорт workspace в Cloudflare.
- Важно: для workspace используется workers base URL (`app-api`) как primary endpoint.
- API:
  - `load(): Promise<Object|null>`
  - `save(workspaceObj): Promise<boolean>`

### `is/cloudflare/edge-api/src/settings.js`

- Белый список `normalizeSettings(...)` включает `workspace`.
- Поддержаны:
  - `GET /api/settings`
  - `PUT /api/settings/:key` (для `workspace`)

### `app/app-ui-root.js`

- Login flow:
  - snapshot pre-auth workspace;
  - `_loadCloudWorkspace()`;
  - apply cloud workspace в `workspaceConfig` и UI.
- Logout flow:
  - восстановление pre-auth workspace (локального состояния ПК до логина).
- Startup flow:
  - проверка auth status;
  - если сессия авторизована на старте, подгрузка cloud workspace.

### `app/components/auth-modal-body.js`

- Успешный login/logout callback обрабатывается await-цепочкой (без гонки callback->apply).

## Матрица поведения

| Сценарий | Ожидаемое поведение |
|---|---|
| Гость, первый вход | Локальный workspace из cacheManager/localStorage |
| Гость меняет UI | Сохранение только локально |
| Login, cloud пуст | Локальный snapshot инициализирует cloud workspace |
| Login, cloud заполнен | Cloud workspace применяется сразу в таблицу |
| Авторизован, меняет UI | Локально + debounce save в cloud |
| F5 в авторизованной сессии | Восстановление cloud workspace |
| Logout | Возврат к pre-auth локальному workspace |
| Login после logout на том же ПК | Возврат cloud workspace пользователя |

## Критичные нюансы и инварианты

1. Нельзя использовать разные origins для auth-flow и workspace settings без явного контракта миграции.
2. `workspace` должен быть в allowlist backend-normalizer, иначе данные silently теряются.
3. `app-ui-root` должен явно зависеть от `cloud-workspace-client` в module graph.
4. Применение cloud workspace и восстановление pre-auth workspace должны быть idempotent.
5. Локальный SSOT не отключается: cloud — это source для auth-режима, но клиент продолжает жить через `workspaceConfig`.

## Наблюдаемость и диагностика

Минимальные признаки корректной работы:

- после login таблица отражает `activeCoinSetIds` из cloud workspace;
- после F5 в авторизованной сессии состав монет сохраняется;
- после logout таблица возвращается к pre-auth локальному набору;
- при следующем login cloud-набор снова применяется.

## Ограничения текущей реализации

- Синхронизация cloud workspace привязана к debounce и event-path в UI, не транзакционна.
- При недоступности API пользователь продолжает работать локально (degraded mode).
- Конфликт-резолвинг между несколькими устройствами — last-write-wins на стороне KV.

## Рекомендации по эволюции

1. Добавить версионирование workspace (`updatedAt`, `sourceDevice`) для диагностики multi-device конфликтов.
2. Добавить endpoint для атомарного compare-and-set при желании строгой консистентности.
3. Ввести e2e smoke-check:
   - login -> mutate workspace -> F5 -> logout -> login -> assert states.
4. Расширить docs/index-ais ссылкой на этот AIS как норматив по хранению UI-состояния.

## Ссылки

- Репозиторий (контекст кода): [vscode.dev/github/aoponomarev/mmb/blob/master](https://vscode.dev/github/aoponomarev/mmb/blob/master)
- `core/config/workspace-config.js`
- `core/api/cloudflare/cloud-workspace-client.js`
- `app/app-ui-root.js`
- `app/components/auth-modal-body.js`
- `is/cloudflare/edge-api/src/settings.js`
