/**
 * #JS-ed2z5Mao
 * @description Table numeric cell: format and display numbers; prefix, precision, colorize, unit.
 * @skill-anchor id:sk-add9a6 #for-classes-add-remove
 * @skill-anchor id:sk-eeb23d #for-bootstrap-event-proxying
 * @skill-anchor id:sk-cb75ec #for-utility-availability-check
 *
 * USAGE: <cell-num :value="coin.current_price" prefix="$" :precision="2" type="price" />; type 'price' = dynamic precision (≥2 significant digits).
 */

(function() {
    'use strict';

    window.cmpCellNum = {
        template: '#cell-num-template',

        props: {
            // Raw number
            value: {
                type: Number,
                default: 0
            },
            // Decimal places (0-10)
            precision: {
                type: Number,
                default: 2,
                validator: (value) => value >= 0 && value <= 10
            },
            // Prefix: '$', '€', '%'
            prefix: {
                type: String,
                default: ''
            },
            // Unit: '%', '₽', 'kg'
            unit: {
                type: String,
                default: ''
            },
            // Enable color by sign (positive/negative)
            colorize: {
                type: Boolean,
                default: false
            },
            // Display for empty value
            emptyValue: {
                type: String,
                default: '—'
            },
            // Decimal separator
            decimalSeparator: {
                type: String,
                default: '.',
                validator: (value) => [',', '.'].includes(value)
            },
            // Thousands separator
            thousandsSeparator: {
                type: String,
                default: ' ',
                validator: (value) => [' ', '&nbsp;', ',', ''].includes(value)
            },
            // Hide "+" for positive values (for price)
            hidePositiveSign: {
                type: Boolean,
                default: false
            },
            // Format type: 'default' | 'price'. 'price' = at least 2 significant digits
            type: {
                type: String,
                default: 'default',
                validator: (value) => ['default', 'price'].includes(value)
            }
        },

        computed: {
            // Is value empty
            isEmpty() {
                return this.value === null || this.value === undefined || isNaN(this.value);
            },

            // Is value infinite
            isInfinite() {
                return !Number.isFinite(this.value);
            },

            // Dynamic precision for 'price' type; for very small numbers (< 0.01) show at least 2 significant digits
            effectivePrecision() {
                if (this.type !== 'price' || this.isEmpty || this.isInfinite) {
                    return this.precision;
                }

                const absValue = Math.abs(this.value);

                // For values >= 0.01 use standard precision
                if (absValue >= 0.01) {
                    return this.precision;
                }

                // For very small numbers compute decimal places for 2 significant digits
                if (absValue === 0) {
                    return this.precision;
                }

                // Find first non-zero digit position after decimal
                const str = absValue.toExponential();
                const exponent = parseInt(str.split('e')[1]);
                
                // If exponent is negative (e.g. 0.000023)
                if (exponent < 0) {
                    // Return decimal places needed for 2 significant digits
                    return Math.abs(exponent) + 1; // +1 for second significant digit
                }

                return this.precision;
            },

            // Rounded value
            roundedValue() {
                if (this.isEmpty || this.isInfinite) return this.value;
                const factor = Math.pow(10, this.effectivePrecision);
                return Math.round(this.value * factor) / factor;
            },

            // Display for empty or infinite
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

            // Number sign (+ for positive unless hidePositiveSign)
            numberSign() {
                if (this.isEmpty || this.isInfinite) return '';
                if (this.hidePositiveSign) return '';
                const value = this.roundedValue;
                if (value < 0) return '−';
                if (value > 0) return '+';
                return '';
            },

            // Integer part (with thousands separator)
            integerPart() {
                if (this.isEmpty || this.isInfinite) return '';

                const value = this.roundedValue;
                const intPart = Math.floor(Math.abs(value));

                return this.addThousandsSeparator(intPart.toString());
            },

            // Has fraction part
            hasFractionPart() {
                if (this.isEmpty || this.isInfinite) return false;
                if (this.effectivePrecision <= 0) return false;

                const value = this.roundedValue;
                const absValue = Math.abs(value);
                const fracPart = absValue - Math.floor(absValue);

                // Check for significant digits in fraction
                const fracStr = fracPart.toFixed(this.effectivePrecision);
                const fracDigits = fracStr.substring(2);
                return fracDigits.replace(/0+$/, '').length > 0 || this.effectivePrecision > 0;
            },

            // Decimal separator display
            decimalSeparatorDisplay() {
                if (this.isEmpty || this.isInfinite) return '';
                if (!this.hasFractionPart) return '';
                return this.decimalSeparator;
            },

            // Fraction part
            fractionPart() {
                if (this.isEmpty || this.isInfinite) return '';
                if (!this.hasFractionPart) return '';

                const value = this.roundedValue;
                const absValue = Math.abs(value);
                const fracPart = absValue - Math.floor(absValue);

                const fracStr = fracPart.toFixed(this.effectivePrecision);
                const fracDigits = fracStr.substring(2);

                // For 'price' keep zeros to show significant digits
                if (this.type === 'price') {
                    // Trim trailing zeros but keep at least 2 significant digits
                    let trimmedFrac = fracDigits;
                    
                    // Find first non-zero digit
                    const firstNonZeroIndex = fracDigits.search(/[1-9]/);
                    
                    if (firstNonZeroIndex >= 0) {
                        // Keep up to second significant digit
                        const secondSignificantIndex = fracDigits.substring(firstNonZeroIndex + 1).search(/[1-9]/);
                        if (secondSignificantIndex >= 0) {
                            const endIndex = firstNonZeroIndex + 1 + secondSignificantIndex + 1;
                            trimmedFrac = fracDigits.substring(0, endIndex);
                        } else {
                            // If second significant digit is zero, keep it
                            trimmedFrac = fracDigits.substring(0, firstNonZeroIndex + 2);
                        }
                    }
                    
                    return trimmedFrac;
                }

                // For default type trim trailing zeros
                let trimmedFrac = fracDigits.replace(/0+$/, '');

                // If nothing left after trim but precision > 0, keep original
                if (trimmedFrac.length === 0 && this.effectivePrecision > 0) {
                    return fracDigits;
                }

                return trimmedFrac;
            },

            // Unit
            numberUnit() {
                return this.unit || '';
            },

            // CSS classes for number parts (Bootstrap). Color via data-value-sign selectors
            prefixClass() {
                return 'text-muted';
            },

            signClass() {
                // Sign has no own classes; color via CSS selectors
                return '';
            },

            integerClass() {
                // Integer: bold for positive with int part >= 1
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
                // Fraction has no own classes; color via CSS
                return '';
            },

            unitClass() {
                return 'text-muted small';
            },

            // Data attr for value sign (for CSS selectors)
            colorizeDataAttr() {
                if (!this.colorize) return null;

                if (this.isEmpty || this.isInfinite) return null;

                const value = this.roundedValue;
                const absValue = Math.abs(value);

                // If value near zero (< 1) use 'zero'
                if (absValue < 1) {
                    return 'zero';
                }

                // Otherwise by sign
                if (value > 0) {
                    return 'positive';
                } else if (value < 0) {
                    return 'negative';
                } else {
                    return 'zero';
                }
            },

            // Tooltip with full value
            tooltipText() {
                if (this.isEmpty || this.isInfinite) return null;
                return this.value.toString();
            }
        },

        methods: {
            // Add thousands separator (every 3 digits)
            addThousandsSeparator(str) {
                if (!this.thousandsSeparator || this.thousandsSeparator === '') {
                    return str;
                }

                // Split string into groups of 3 from right to left
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
