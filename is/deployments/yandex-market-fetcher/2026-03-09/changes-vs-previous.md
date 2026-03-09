---
id: doc-af4e50
status: active
last_updated: "2026-03-09"

---
<!-- Важно: оставлять пустую строку перед "---" ! -->

# Changes vs Previous State

## Baseline

- Target: `yandex-market-fetcher`
- Baseline: `d4eojmho1itgaa7k4cdi`

## Added Keys

- `$.function.active_version.concurrency` = "1"
- `$.function.active_version.created_at` = "2026-03-09T10:31:08.687Z"
- `$.function.active_version.entrypoint` = "index.handler"
- `$.function.active_version.env_contract.required_names[0]` = "DB_HOST"
- `$.function.active_version.env_contract.required_names[1]` = "DB_NAME"
- `$.function.active_version.env_contract.required_names[2]` = "DB_PASSWORD"
- `$.function.active_version.env_contract.required_names[3]` = "DB_PORT"
- `$.function.active_version.env_contract.required_names[4]` = "DB_USER"
- `$.function.active_version.env_contract.secret_names[0]` = "DB_PASSWORD"
- `$.function.active_version.execution_timeout` = "600s"
- `$.function.active_version.id` = "d4eh5naqp8c3e4o3nfu4"
- `$.function.active_version.image_size` = "622592"
- `$.function.active_version.log_options.folder_id` = "b1gv03a122le5a934cqj"
- `$.function.active_version.memory_bytes` = "268435456"
- `$.function.active_version.runtime` = "nodejs18"
- `$.function.description` = "CoinGecko top-250 fetcher to PostgreSQL coin_market_cache"
- `$.function.http_invoke_url` = "https://functions.yandexcloud.net/d4elqjuhiem6mavs9v0e"
- `$.function.id` = "d4elqjuhiem6mavs9v0e"
- `$.function.name` = "coingecko-fetcher"
- `$.function.status` = "ACTIVE"
- `$.function_access_bindings[0].role_id` = "serverless.functions.invoker"
- `$.function_access_bindings[0].subject.id` = "allUsers"
- `$.function_access_bindings[0].subject.type` = "system"
- `$.invoke_contract.fallback_mode` = "minute-based routing for timer invocations"
- `$.invoke_contract.manual_payload_order_values[0]` = "market_cap"
- `$.invoke_contract.manual_payload_order_values[1]` = "volume"
- `$.timer_triggers[0].cron_expression` = "0 * * * ? *"
- `$.timer_triggers[0].id` = "a1ssi7jom1ne63hc0kue"
- `$.timer_triggers[0].invoke_function_id` = "d4elqjuhiem6mavs9v0e"
- `$.timer_triggers[0].invoke_function_tag` = "$latest"
- `$.timer_triggers[0].invoke_service_account_id` = "ajeudqscq65r5d5u7ras"
- `$.timer_triggers[0].name` = "coingecko-fetcher-cron-cap"
- `$.timer_triggers[0].status` = "ACTIVE"
- `$.timer_triggers[1].cron_expression` = "30 * * * ? *"
- `$.timer_triggers[1].id` = "a1str2later83rj3fkkv"
- `$.timer_triggers[1].invoke_function_id` = "d4elqjuhiem6mavs9v0e"
- `$.timer_triggers[1].invoke_function_tag` = "$latest"
- `$.timer_triggers[1].invoke_service_account_id` = "ajeudqscq65r5d5u7ras"
- `$.timer_triggers[1].name` = "coingecko-fetcher-cron-vol"
- `$.timer_triggers[1].status` = "ACTIVE"

## Changed Keys

- none

## Removed Keys

- `$.comparison_baseline.notes` = "No prior dated snapshot is required for baseline; previous state is derived from cloud function version history."
- `$.comparison_baseline.type` = "previous_active_function_version"
- `$.function_previous_version.concurrency` = "1"
- `$.function_previous_version.created_at` = "2026-03-07T17:21:54.861Z"
- `$.function_previous_version.entrypoint` = "index.handler"
- `$.function_previous_version.env_contract.required_names[0]` = "DB_HOST"
- `$.function_previous_version.env_contract.required_names[1]` = "DB_NAME"
- `$.function_previous_version.env_contract.required_names[2]` = "DB_PASSWORD"
- `$.function_previous_version.env_contract.required_names[3]` = "DB_PORT"
- `$.function_previous_version.env_contract.required_names[4]` = "DB_USER"
- `$.function_previous_version.env_contract.secret_names[0]` = "DB_PASSWORD"
- `$.function_previous_version.execution_timeout` = "600s"
- `$.function_previous_version.id` = "d4eojmho1itgaa7k4cdi"
- `$.function_previous_version.image_size` = "679936"
- `$.function_previous_version.log_options.folder_id` = "b1gv03a122le5a934cqj"
- `$.function_previous_version.memory_bytes` = "268435456"
- `$.function_previous_version.runtime` = "nodejs18"

## Causality Diffs

- Causality updates are tracked in `is/skills/causality-registry.md` and referenced in snapshot README.

