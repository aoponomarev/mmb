// Skill: id:sk-318305
// =========================
// экземпляров компонентов и кастомных стилей
// Генерирует стабильный Base58 хэш из строки for маркировки экземпляров компонентов
// =========================
// PURPOSE: Предоставить утилиту for генерации детерминированных хэшей for идентификации
// экземпляров компонентов и кастомных стилей
//
// PRINCIPLES:
// - Детерминированность: один и тот же входной параметр всегда дает один и тот же хэш
// - Base58 алфавит (без 0, O, I, l for избежания путаницы)
// - Настраиваемая длина хэша
// - Поддержка префикса for классов маркировки (avto-)
//
// USAGE:
// - instanceHash: идентификация экземпляров компонентов (привязка к расположению в DOM)
// - styleHash: идентификация кастомных стилей (привязка к комбинации CSS-свойств)

window.hashGenerator = {
  // Base58 алфавит (без 0, O, I, l for избежания путаницы)
  base58: '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz',

  // Генерация детерминированного Base58 хэша из строки
  // Всегда возвращает одинаковый хэш for одной и той же входной строки
  generateHash(input, length = 8) {
    if (!input || typeof input !== 'string') {
      input = String(input || '');
    }

    // Простая хэш-функция (djb2 алгоритм)
    let hash = 5381;
    for (let i = 0; i < input.length; i++) {
      hash = ((hash << 5) + hash) + input.charCodeAt(i);
      hash = hash & hash; // Convert to 32bit integer
    }

    // Преобразуем в Base58
    let result = '';
    const absHash = Math.abs(hash);
    let num = absHash;

    // Генерируем Base58 строку нужной длины
    for (let i = 0; i < length; i++) {
      result = this.base58[num % this.base58.length] + result;
      num = Math.floor(num / this.base58.length);
      // Если число закончилось, используем остаток хэша с дополнительным смещением
      if (num === 0) {
        num = absHash + (i + 1) * 37; // Добавляем смещение for продолжения генерации
      }
    }

    return result;
  },

  // Генерация полного класса маркировки (с префиксом avto-)
  generateMarkupClass(input, length = 8) {
    return `avto-${this.generateHash(input, length)}`;
  }
};

