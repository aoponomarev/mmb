// Утилита для склонения русских числительных
// Использование: pluralize(число, ['форма1', 'форма2', 'форма5'])
// Пример: pluralize(5, ['монета', 'монеты', 'монет']) => "5 монет"
window.pluralize = function(number, forms) {
  if (!Array.isArray(forms) || forms.length < 3) {
    return forms[0] || '';
  }

  const n = Math.abs(number) % 100;
  const n1 = n % 10;

  if (n > 10 && n < 20) {
    return forms[2]; // 11-19 всегда форма 5
  }
  if (n1 > 1 && n1 < 5) {
    return forms[1]; // 2, 3, 4 - форма 2
  }
  if (n1 === 1) {
    return forms[0]; // 1 - форма 1
  }
  return forms[2]; // 0, 5-9 - форма 5
};

