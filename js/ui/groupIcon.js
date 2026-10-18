/** Sidebar group icons: a fixed set of Material-style glyphs chosen when creating a group.
 * Path data is inlined from assets/icons/group-icons/ for reliable <currentColor> rendering. */
const VIEW_BOX = '0 -960 960 960';
export const GROUP_ICONS = Object.freeze([
  { id: 'code', label: '编程', path: 'M240-280 40-480l200-200 56 56-143 144 143 144-56 56Zm178 132-76-24 200-640 76 24-200 640Zm302-132-56-56 143-144-143-144 56-56 200 200-200 200Z' },
  { id: 'favorite', label: '收藏', path: 'm480-120-58-52q-101-91-167-157T150-447.5Q111-500 95.5-544T80-634q0-94 63-157t157-63q52 0 99 22t81 62q34-40 81-62t99-22q94 0 157 63t63 157q0 46-15.5 90T810-447.5Q771-395 705-329T538-172l-58 52Zm0-108q96-86 158-147.5t98-107q36-45.5 50-81t14-70.5q0-60-40-100t-100-40q-47 0-87 26.5T518-680h-76q-15-41-55-67.5T300-774q-60 0-100 40t-40 100q0 35 14 70.5t50 81q36 45.5 98 107T480-228Zm0-273Z' },
  { id: 'home', label: '主页', path: 'M240-200h120v-240h240v240h120v-360L480-740 240-560v360Zm-80 80v-480l320-240 320 240v480H520v-240h-80v240H160Zm320-350Z' },
  { id: 'shopping', label: '购物', path: 'm480-560-56-56 63-64H320v-80h167l-64-64 57-56 160 160-160 160ZM223.5-103.5Q200-127 200-160t23.5-56.5Q247-240 280-240t56.5 23.5Q360-193 360-160t-23.5 56.5Q313-80 280-80t-56.5-23.5Zm400 0Q600-127 600-160t23.5-56.5Q647-240 680-240t56.5 23.5Q760-193 760-160t-23.5 56.5Q713-80 680-80t-56.5-23.5ZM40-800v-80h131l170 360h280l156-280h91L692-482q-11 20-29.5 31T622-440H324l-44 80h480v80H280q-45 0-68.5-39t-1.5-79l54-98-144-304H40Z' },
  { id: 'game', label: '游戏', path: 'M189-160q-60 0-102.5-43T42-307q0-9 1-18t3-18l84-336q14-54 57-87.5t98-33.5h390q55 0 98 33.5t57 87.5l84 336q2 9 3.5 18.5T919-306q0 61-43.5 103.5T771-160q-42 0-78-22t-54-60l-28-58q-5-10-15-15t-21-5H385q-11 0-21 5t-15 15l-28 58q-18 38-54 60t-78 22Zm3-80q19 0 34.5-10t23.5-27l28-57q15-31 44-48.5t63-17.5h190q34 0 63 18t45 48l28 57q8 17 23.5 27t34.5 10q28 0 48-18.5t21-46.5q0 1-2-19l-84-335q-7-27-28-44t-49-17H285q-28 0-49.5 17T208-659l-84 335q-2 6-2 18 0 28 20.5 47t49.5 19Zm376.5-291.5Q580-543 580-560t-11.5-28.5Q557-600 540-600t-28.5 11.5Q500-577 500-560t11.5 28.5Q523-520 540-520t28.5-11.5Zm80-80Q660-623 660-640t-11.5-28.5Q637-680 620-680t-28.5 11.5Q580-657 580-640t11.5 28.5Q603-600 620-600t28.5-11.5Zm0 160Q660-463 660-480t-11.5-28.5Q637-520 620-520t-28.5 11.5Q580-497 580-480t11.5 28.5Q603-440 620-440t28.5-11.5Zm80-80Q740-543 740-560t-11.5-28.5Q717-600 700-600t-28.5 11.5Q660-577 660-560t11.5 28.5Q683-520 700-520t28.5-11.5Zm-367 63Q370-477 370-490v-40h40q13 0 21.5-8.5T440-560q0-13-8.5-21.5T410-590h-40v-40q0-13-8.5-21.5T340-660q-13 0-21.5 8.5T310-630v40h-40q-13 0-21.5 8.5T240-560q0 13 8.5 21.5T270-530h40v40q0 13 8.5 21.5T340-460q13 0 21.5-8.5ZM480-480Z' },
]);
export const GROUP_ICON_IDS = GROUP_ICONS.map(icon => icon.id);
export const DEFAULT_GROUP_ICON = 'favorite';

const SVG_NS = 'http://www.w3.org/2000/svg';
export function groupIconElement(id, className = 'group-icon') {
  const icon = GROUP_ICONS.find(item => item.id === id);
  if (!icon) return null;
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', className); svg.setAttribute('viewBox', VIEW_BOX); svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('focusable', 'false');
  const path = document.createElementNS(SVG_NS, 'path'); path.setAttribute('d', icon.path); path.setAttribute('fill', 'currentColor');
  svg.append(path);
  return svg;
}

/** Renders the radio group of default icons; choosing one also fills in the group name. */
export function mountGroupIconPicker(container, form, selected = DEFAULT_GROUP_ICON) {
  const field = document.createElement('div'); field.className = 'group-icon-field';
  const label = document.createElement('span'); label.className = 'field-label'; label.textContent = '分组图标';
  const choices = document.createElement('div'); choices.className = 'icon-choices group-icon-choices'; choices.setAttribute('role', 'radiogroup'); choices.setAttribute('aria-label', '分组图标');
  const hidden = document.createElement('input'); hidden.type = 'hidden'; hidden.name = 'groupIcon';
  const name = form.elements.name;
  const setChoice = choice => {
    hidden.value = choice;
    choices.querySelectorAll('.group-icon-choice').forEach(button => {
      const active = button.dataset.choice === choice;
      button.classList.toggle('selected', active); button.setAttribute('aria-checked', String(active));
      button.tabIndex = active ? 0 : -1;
    });
  };
  for (const icon of GROUP_ICONS) {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'icon-choice group-icon-choice'; button.dataset.choice = icon.id; button.setAttribute('role', 'radio');
    button.title = icon.label;
    const glyph = groupIconElement(icon.id); if (glyph) button.append(glyph);
    const caption = document.createElement('span'); caption.className = 'choice-label'; caption.textContent = icon.label;
    button.append(caption); button.onclick = () => { setChoice(icon.id); if (name) name.value = icon.label; }; choices.append(button);
  }
  choices.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    const buttons = [...choices.querySelectorAll('.group-icon-choice')]; if (!buttons.length) return;
    const index = buttons.indexOf(document.activeElement); if (index < 0) return;
    event.preventDefault();
    const forward = event.key === 'ArrowRight' || event.key === 'ArrowDown';
    const next = buttons[(index + (forward ? 1 : -1) + buttons.length) % buttons.length];
    next.focus(); next.click();
  });
  setChoice(GROUP_ICON_IDS.includes(selected) ? selected : DEFAULT_GROUP_ICON);
  field.append(label, choices, hidden); container.append(field);
  return { setChoice };
}
