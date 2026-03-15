---
id: doc-33b33e
status: active
last_updated: "2026-03-15"

---

# Changes vs Previous State

## Baseline

- Target: `yandex-api-gateway`
- Baseline: `d4elmf31apg0ggbecrhj`

## Added Keys

- `$.api_gateway.connectivity` = {}
- `$.api_gateway.domain` = "d5dl2ia43kck6aqb1el5.k1mxzkh0.apigw.yandexcloud.net"
- `$.api_gateway.execution_timeout` = "300s"
- `$.api_gateway.id` = "d5dl2ia43kck6aqb1el5"
- `$.api_gateway.log_options.folder_id` = "b1gv03a122le5a934cqj"
- `$.api_gateway.name` = "mbb-api-gw"
- `$.api_gateway.openapi_routes./health[0]` = "GET"
- `$.api_gateway.openapi_routes./health[1]` = "OPTIONS"
- `$.api_gateway.openapi_routes./{proxy+}[0]` = "ANY"
- `$.api_gateway.openapi_routes.integration_function_id` = "d4eb8mf98rc3k6p3ef7g"
- `$.api_gateway.status` = "ACTIVE"
- `$.api_gateway_access_bindings` = []
- `$.downstream_function_access_bindings[0].role_id` = "serverless.functions.invoker"
- `$.downstream_function_access_bindings[0].subject.id` = "allUsers"
- `$.downstream_function_access_bindings[0].subject.type` = "system"
- `$.downstream_function_reference.http_invoke_url` = "https://functions.yandexcloud.net/d4elqjuhiem6mavs9v0e"
- `$.downstream_function_reference.id` = "d4elqjuhiem6mavs9v0e"
- `$.downstream_function_reference.name` = "coingecko-fetcher"
- `$.integrated_function.active_version.concurrency` = "1"
- `$.integrated_function.active_version.created_at` = "2026-03-15T13:54:28.708Z"
- `$.integrated_function.active_version.entrypoint` = "api-gateway/index.handler"
- `$.integrated_function.active_version.env_contract.required_names[0]` = "COINGECKO_FETCHER_URL"
- `$.integrated_function.active_version.env_contract.required_names[1]` = "DB_HOST"
- `$.integrated_function.active_version.env_contract.required_names[2]` = "DB_NAME"
- `$.integrated_function.active_version.env_contract.required_names[3]` = "DB_PASSWORD"
- `$.integrated_function.active_version.env_contract.required_names[4]` = "DB_PORT"
- `$.integrated_function.active_version.env_contract.required_names[5]` = "DB_USER"
- `$.integrated_function.active_version.env_contract.secret_names[0]` = "DB_PASSWORD"
- `$.integrated_function.active_version.execution_timeout` = "30s"
- `$.integrated_function.active_version.id` = "d4e8h5kvf8ksvnfsu0nd"
- `$.integrated_function.active_version.image_size` = "266240"
- `$.integrated_function.active_version.log_options.folder_id` = "b1gv03a122le5a934cqj"
- `$.integrated_function.active_version.memory_bytes` = "268435456"
- `$.integrated_function.active_version.runtime` = "nodejs18"
- `$.integrated_function.http_invoke_url` = "https://functions.yandexcloud.net/d4eb8mf98rc3k6p3ef7g"
- `$.integrated_function.id` = "d4eb8mf98rc3k6p3ef7g"
- `$.integrated_function.name` = "coins-db-gateway"
- `$.integrated_function_access_bindings[0].role_id` = "functions.functionInvoker"
- `$.integrated_function_access_bindings[0].subject.id` = "allUsers"
- `$.integrated_function_access_bindings[0].subject.type` = "system"

## Changed Keys

- none

## Removed Keys

- `$.comparison_baseline.notes` = "No prior dated snapshot is required for baseline; previous state is derived from cloud function version history."
- `$.comparison_baseline.type` = "previous_active_function_version"
- `$.integrated_function_previous_version.concurrency` = "1"
- `$.integrated_function_previous_version.created_at` = "2026-03-15T13:49:12.361Z"
- `$.integrated_function_previous_version.entrypoint` = "api-gateway/index.handler"
- `$.integrated_function_previous_version.env_contract.required_names[0]` = "COINGECKO_FETCHER_URL"
- `$.integrated_function_previous_version.env_contract.required_names[1]` = "DB_HOST"
- `$.integrated_function_previous_version.env_contract.required_names[2]` = "DB_NAME"
- `$.integrated_function_previous_version.env_contract.required_names[3]` = "DB_PASSWORD"
- `$.integrated_function_previous_version.env_contract.required_names[4]` = "DB_PORT"
- `$.integrated_function_previous_version.env_contract.required_names[5]` = "DB_USER"
- `$.integrated_function_previous_version.env_contract.secret_names[0]` = "DB_PASSWORD"
- `$.integrated_function_previous_version.execution_timeout` = "30s"
- `$.integrated_function_previous_version.id` = "d4elmf31apg0ggbecrhj"
- `$.integrated_function_previous_version.image_size` = "266240"
- `$.integrated_function_previous_version.log_options.folder_id` = "b1gv03a122le5a934cqj"
- `$.integrated_function_previous_version.memory_bytes` = "268435456"
- `$.integrated_function_previous_version.runtime` = "nodejs18"

## Causality Diffs

- Causality updates are tracked in `is/skills/causality-registry.md` and referenced in snapshot README.

