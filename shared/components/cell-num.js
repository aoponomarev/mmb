/**
 * ================================================================================================
 * CELL NUM - Компонент числовой ячейки таблицы
 * ================================================================================================
 *
 * PURPOSE: Форматирование и отображение числовых значений в таблице.
 *
 * PRINCIPLES:
 * - Минимальная кастомизация, дефолтный Bootstrap
 * - Разбиение числа на части (префикс, знак, целая часть, разделитель, дробная часть, единица)
 * - Цветизация на основе знака значения (for процентов)
 * - Разделители разрядов (пробелы каждые 3 цифры)
 *
 * USAGE:
 * <cell-num :value="coin.current_price" prefix="$" :precision="2" type="price"></cell-num>
 * <cell-num :value="coin.price_change_percentage_24h" :precision="2" colorize unit="%"></cell-num>
 *
 * ТИПЫ ФОРМАТИРОВАНИЯ:
 * - 'default': стандартное форматирование с фиксированной точностью
 * - 'price': динамическая точность for отображения минимум 2 значащих цифр
 *   (например: $0.000023 вместо $0.00)
 *
 * REFERENCES:
 * - Старая версия: do-overs/BOT/ui/components/cell-num.js
 * - Архитектура: is/skills/arch-foundation
 */

(function() {
    'use strict';

    window.cmpCellNum = {
        template: '#cell-num-template',

        props: {
            // Исходное число
            value: {
                type: Number,
                default: 0
            },
            // Знаки после запятой (0-10)
            precision: {
                type: Number,
                default: 2,
                validator: (value) => value >= 0 && value <= 10
            },
            // Префикс: '$', '€', '%'
            prefix: {
                type: String,
                default: ''
            },
            // Единица измерения: '%', '₽', 'kg'
            unit: {
                type: String,
                default: ''
            },
            // Включить автоматическую цветизацию на основе знака значения
            colorize: {
                type: Boolean,
                default: false
            },
            // Отображение for пустых значений
            emptyValue: {
                type: String,
                default: '—'
            },
            // Десятичный разделитель
            decimalSeparator: {
                type: String,
                default: '.',
                validator: (value) => [',', '.'].includes(value)
            },
            // Разделитель разрядов
            thousandsSeparator: {
                type: String,
                default: ' ',
                validator: (value) => [' ', '&nbsp;', ',', ''].includes(value)
            },
            // Скрыть знак "+" for положительных значений (for Price)
            hidePositiveSign: {
                type: Boolean,
                default: false
            },
            // Тип форматирования: 'default' | 'price'
            // 'price' - всегда показывать минимум 2 значащие цифры
            type: {
                type: String,
                default: 'default',
                validator: (value) => ['default', 'price'].includes(value)
            }
        },

        computed: {
            // Проверка, является ли значение пустым
            isEmpty() {
                return this.value === null || this.value === undefined || isNaN(this.value);
            },

            // Проверка, является ли значение бесконечностью
            isInfinite() {
                return !Number.isFinite(this.value);
            },

            // Динамическая точность for типа 'price'
            // Для очень малых чисел (< 0.01) вычисляем точность так, чтобы показать минимум 2 значащие цифры
            effectivePrecision() {
                if (this.type !== 'price' || this.isEmpty || this.isInfinite) {
                    return this.precision;
                }

                const absValue = Math.abs(this.value);

                // Для чисел >= 0.01 используем стандартную точность (2 знака)
                if (absValue >= 0.01) {
                    return this.precision;
                }

                // Для очень малых чисел вычисляем, сколько нулей после запятой
                // и добавляем 2 значащие цифры
                if (absValue === 0) {
                    return this.precision;
                }

                // Находим позицию первой ненулевой цифры после запятой
                const str = absValue.toExponential();
                const exponent = parseInt(str.split('e')[1]);
                
                // Если число в экспоненциальной форме с отрицательным показателем
                if (exponent < 0) {
                    // Возвращаем количество знаков, необходимое for отображения 2 значащих цифр
                    // Например: 0.000023 -> нужно 6 знаков (000023)
                    return Math.abs(exponent) + 1; // +1 for второй значащей цифры
                }

                return this.precision;
            },

            // Округленное значение
            roundedValue() {
                if (this.isEmpty || this.isInfinite) return this.value;
                const factor = Math.pow(10, this.effectivePrecision);
                return Math.round(this.value * factor) / factor;
            },

            // Отображение for пустых значений или бесконечности
            emptyOrInfiniteDisplay() {
                if (this.isEmpty) {
                    return this.emptyValue;
                }

                if (this.isInfinite) {
                    if (this.value === Infinity) {
                        return '∞';
                    }
                    if (this.value === -Infinity) {
                        return '−∞';
                    }
                    return this.emptyValue;
                }

                return null;
            },

            // Знак числа (всегда показываем "+" for положительных, если не отключено через prop)
            numberSign() {
                if (this.isEmpty || this.isInfinite) return '';
                if (this.hidePositiveSign) return ''; // Для Price не показываем "+"
                const value = this.roundedValue;
                if (value < 0) return '−';
                if (value > 0) return '+';
                return '';
            },

            // Целая часть числа (с разделителями разрядов)
            integerPart() {
                if (this.isEmpty || this.isInfinite) return '';

                const value = this.roundedValue;
                const intPart = Math.floor(Math.abs(value));

                return this.addThousandsSeparator(intPart.toString());
            },

            // Есть ли дробная часть
            hasFractionPart() {
                if (this.isEmpty || this.isInfinite) return false;
                if (this.effectivePrecision <= 0) return false;

                const value = this.roundedValue;
                const absValue = Math.abs(value);
                const fracPart = absValue - Math.floor(absValue);

                // Проверяем, есть ли значащие цифры в дробной части
                const fracStr = fracPart.toFixed(this.effectivePrecision);
                const fracDigits = fracStr.substring(2);
                return fracDigits.replace(/0+$/, '').length > 0 || this.effectivePrecision > 0;
            },

            // Десятичный разделитель
            decimalSeparatorDisplay() {
                if (this.isEmpty || this.isInfinite) return '';
                if (!this.hasFractionPart) return '';
                return this.decimalSeparator;
            },

            // Дробная часть
            fractionPart() {
                if (this.isEmpty || this.isInfinite) return '';
                if (!this.hasFractionPart) return '';

                const value = this.roundedValue;
                const absValue = Math.abs(value);
                const fracPart = absValue - Math.floor(absValue);

                const fracStr = fracPart.toFixed(this.effectivePrecision);
                const fracDigits = fracStr.substring(2);

                // Для типа 'price' НЕ убираем нули в конце, чтобы показать все значащие цифры
                if (this.type === 'price') {
                    // Убираем только лишние нули в конце, оставляя минимум 2 значащие цифры
                    let trimmedFrac = fracDigits;
                    
                    // Находим позицию первой ненулевой цифры
                    const firstNonZeroIndex = fracDigits.search(/[1-9]/);
                    
                    if (firstNonZeroIndex >= 0) {
                        // Оставляем все до второй значащей цифры включительно
                        const secondSignificantIndex = fracDigits.substring(firstNonZeroIndex + 1).search(/[1-9]/);
                        if (secondSignificantIndex >= 0) {
                            const endIndex = firstNonZeroIndex + 1 + secondSignificantIndex + 1;
                            trimmedFrac = fracDigits.substring(0, endIndex);
                        } else {
                            // Если вторая значащая цифра - это ноль, оставляем её
                            trimmedFrac = fracDigits.substring(0, firstNonZeroIndex + 2);
                        }
                    }
                    
                    return trimmedFrac;
                }

                // Для обычных чисел убираем лишние нули в конце
                let trimmedFrac = fracDigits.replace(/0+$/, '');

                // Если после удаления нулей ничего не осталось, но precision требует знаки
                if (trimmedFrac.length === 0 && this.effectivePrecision > 0) {
                    return fracDigits;
                }

                return trimmedFrac;
            },

            // Единицы измерения
            numberUnit() {
                return this.unit || '';
            },

            // CSS классы for частей числа (Bootstrap)
            // Цветизация применяется через CSS селекторы на основе data-value-sign
            prefixClass() {
                return 'text-muted';
            },

            signClass() {
                // Знак не имеет собственных классов - цвет применяется через CSS селекторы
                return '';
            },

            integerClass() {
                // Целая часть: жирный шрифт for положительных чисел с целой частью >= 1
                if (this.colorize && !this.isEmpty && !this.isInfinite) {
                    const value = this.roundedValue;
                    const absValue = Math.abs(value);
                    const intPart = Math.floor(absValue);

                    if (value > 0 && intPart >= 1) {
                        return 'fw-bold';
                    }
                }
                return '';
            },

            separatorClass() {
                return 'text-muted';
            },

            fractionClass() {
                // Дробная часть не имеет собственных классов - цвет применяется через CSS селекторы
                return '';
            },

            unitClass() {
                return 'text-muted small';
            },

            // Data-атрибут for определения знака значения (for CSS селекторов)
            colorizeDataAttr() {
                if (!this.colorize) return null;

                if (this.isEmpty || this.isInfinite) return null;

                const value = this.roundedValue;
                const absValue = Math.abs(value);

                // Если значение близко к нулю (< 1), используем 'zero'
                if (absValue < 1) {
                    return 'zero';
                }

                // Иначе определяем по знаку
                if (value > 0) {
                    return 'positive';
                } else if (value < 0) {
                    return 'negative';
                } else {
                    return 'zero';
                }
            },

            // Tooltip с полным значением
            tooltipText() {
                if (this.isEmpty || this.isInfinite) return null;
                // Показываем точное значение в tooltip
                return this.value.toString();
            }
        },

        methods: {
            // Добавление разделителя разрядов (каждые 3 цифры)
            addThousandsSeparator(str) {
                if (!this.thousandsSeparator || this.thousandsSeparator === '') {
                    return str;
                }

                // Разбиваем строку на группы по 3 цифры справа налево
                const parts = [];
                for (let i = str.length; i > 0; i -= 3) {
                    parts.unshift(str.substring(Math.max(0, i - 3), i));
                }

                const separator = this.thousandsSeparator === '&nbsp;' ? '\u00A0' : this.thousandsSeparator;
                return parts.join(separator);
            }
        }
    };

    console.log('✅ cell-num component loaded');
})();
