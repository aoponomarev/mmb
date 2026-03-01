/**
 * ================================================================================================
 * APP FOOTER TEMPLATE - Шаблон компонента футера приложения
 * ================================================================================================
 *
 * ЦЕЛЬ: Шаблон для компонента футера приложения (app-footer).
 *
 * ПРОБЛЕМА: Шаблон должен быть доступен в DOM до инициализации Vue.js для работы компонента.
 *
 * РЕШЕНИЕ: Шаблон хранится как строка в JavaScript файле и автоматически вставляется в DOM
 * при загрузке файла как <script type="text/x-template"> элемент с id="app-footer-template".
 *
 * КАК ДОСТИГАЕТСЯ:
 * - Шаблон определён как строка в константе TEMPLATE
 * - При загрузке файла автоматически создаётся <script type="text/x-template"> элемент
 * - Элемент добавляется в document.body с id="app-footer-template"
 * - Компонент использует шаблон через template: '#app-footer-template'
 *
 * ОСОБЕННОСТИ ШАБЛОНА:
 * Структура HTML:
 * - Корневой элемент: ⟨footer⟩ с классами fixed-bottom, bg-body, py-2, px-2 px-md-5, font-monospace, text-muted, d-flex, align-items-center, justify-content-between, flex-wrap
 * - Время МСК: скрыто на мобильных (d-none d-md-inline), видно на десктопе
 * - Список метрик: метрики рынка (FGI, VIX, BTC, OI, FR, LSR) в виде спанов с адаптивными паддингами (px-1 px-md-2)
 * - Новость крипты: одна строка под метриками, скрыта на мобильных (d-none d-md-block), overflow-x-hidden, кликабельна для переключения, tooltip с полным текстом
 * - Без промежуточных оберток: все классы на корневом элементе footer
 * Layout и CSS-классы:
 * - Фиксированное позиционирование: fixed-bottom
 * - Фон: bg-body (наследует тему от body, переключается вместе с темой)
 * - Многослойная тень направленная вверх с холодными стальными оттенками
 * - Минимум стилей: только базовые Bootstrap классы (text-muted, small, font-monospace на футере)
 * - Распределение элементов: d-flex, justify-content-between, flex-wrap для равномерного распределения спанов
 *
 * ССЫЛКИ:
 * - Общие принципы работы с шаблонами: a/skills/app/skills/components/components-template-split.md
 * - Компонент: app/components/app-footer.js
 * - Стили: styles/layout/footer.css
 */

(function() {
    'use strict';

    const TEMPLATE = `<footer class="fixed-bottom bg-body app-footer">
    <div class="py-2 px-2 px-md-5 text-muted d-flex align-items-center justify-content-between flex-wrap">
        <span class="d-none d-md-inline px-1 px-md-2" @click="openTimezoneModal" style="cursor: pointer;">{{ timeDisplay }}</span>
        <span class="px-1 px-md-2" :title="tooltipFgi">FGI:{{ fgi }}</span>
        <span class="px-1 px-md-2" :title="tooltipVix">
            <span class="d-inline d-md-none">VIX:{{ formatValueMobile(vixValue, vix) }}</span>
            <span class="d-none d-md-inline">VIX:{{ vix }}</span>
        </span>
        <span class="px-1 px-md-2" :title="tooltipBtcDom">
            <span class="d-inline d-md-none">BTC:{{ formatValueMobile(btcDomValue, btcDom) }}%</span>
            <span class="d-none d-md-inline">BTC:{{ btcDom }}</span>
        </span>
        <span class="px-1 px-md-2" :title="tooltipOi">
            <span class="d-inline d-md-none">OI:{{ formatOIMobile() }}</span>
            <span class="d-none d-md-inline">OI:{{ oi }}</span>
        </span>
        <span class="px-1 px-md-2" :title="tooltipFr">FR:{{ fr }}</span>
        <span class="px-1 px-md-2" :title="tooltipLsr">
            <span class="d-inline d-md-none">LSR:{{ formatValueMobile(lsrValue, lsr) }}</span>
            <span class="d-none d-md-inline">LSR:{{ lsr }}</span>
        </span>
        <span class="px-1 px-md-2" :title="fallbackIndicatorTitle">
            <span class="d-inline d-md-none">FB:{{ fallbackCount }}</span>
            <span class="d-none d-md-inline">Fallbacks:{{ fallbackCount }}</span>
        </span>
        <div class="d-none d-md-block w-100 mt-1 px-1 px-md-2 overflow-x-hidden" style="text-overflow: ellipsis; white-space: nowrap; cursor: pointer;" v-if="currentNews" @click="switchToNextNews" :title="currentNewsTranslated || currentNews">{{ currentNews }}</div>
    </div>
</footer>`;

    /**
     * Вставляет шаблон в DOM
     */
    function insertTemplate() {
        const templateScript = document.createElement('script');
        templateScript.type = 'text/x-template';
        templateScript.id = 'app-footer-template';
        templateScript.textContent = TEMPLATE;
        document.body.appendChild(templateScript);
    }

    // Вставляем шаблон при загрузке
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', insertTemplate);
    } else {
        insertTemplate();
    }
})();

