export function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

export function formatTime(dateString) {
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export const toCamelCaseObject = obj =>
  Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [
      key.charAt(0).toLowerCase() + key.slice(1),
      value
    ])
  );

