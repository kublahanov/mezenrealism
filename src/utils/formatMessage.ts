/**
 * Экранирование HTML для защиты от XSS
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Форматирование текста сообщения:
 * - Экранирование HTML
 * - Преобразование URL в кликабельные ссылки
 * - Преобразование @username в ссылки на Telegram
 * - Сохранение переносов строк
 */
export function formatMessage(text: string | null): string {
  if (!text) return '';

  // 1. Экранируем HTML
  let html = escapeHtml(text);

  // 2. Преобразуем URL в ссылки
  // Поддерживаем http://, https://, www.
  html = html.replace(/(https?:\/\/[^\s<]+|www\.[^\s<]+)/g, (url) => {
    const href = url.startsWith('www.') ? `https://${url}` : url;
    return `<a href="${href}" target="_blank" rel="noopener noreferrer">${url}</a>`;
  });

  // 3. Преобразуем @username в ссылки на Telegram
  html = html.replace(
    /(^|\s)@([a-zA-Z0-9_]{5,32})/g,
    '$1<a href="https://t.me/$2" target="_blank" rel="noopener noreferrer">@$2</a>',
  );

  // 4. Сохраняем переносы строк
  html = html.replace(/\n/g, '<br>');

  return html;
}
