const pad = value => String(value).padStart(2, '0');

export function updateClock(prefs, now = new Date()) {
  const time = document.querySelector('#clock-time');
  const date = document.querySelector('#clock-date');
  if (!time || !date) return;
  const hours = now.getHours(); const minutes = pad(now.getMinutes());
  const month = pad(now.getMonth() + 1); const day = pad(now.getDate());
  time.textContent = prefs.clock24 ? `${pad(hours)}:${minutes}` : `${hours < 12 ? '上午' : '下午'} ${hours % 12 || 12}:${minutes}`;
  time.dateTime = `${now.getFullYear()}-${month}-${day}T${pad(hours)}:${minutes}`;
  date.hidden = !prefs.showDate;
  date.textContent = prefs.dateFormat === 'mm-dd' ? `${month}-${day}` : `${now.getFullYear()}-${month}-${day}`;
}

export function startClock(getPrefs) {
  updateClock(getPrefs());
  return setInterval(() => updateClock(getPrefs()), 1000);
}
