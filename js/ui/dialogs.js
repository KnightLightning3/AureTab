export const $ = selector => document.querySelector(selector);
let toastTimer;
export function toast(message) { $('#toast').textContent = message; $('#toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 2000); }
export function report(error) { console.error(error); toast(error.message || '操作失败，请重试'); }
export function bindDialogClose() { document.querySelectorAll('dialog [data-close]').forEach(button => button.onclick = () => button.closest('dialog').close()); }
/** DOM-only fields: no imported string is interpreted as HTML. */
export function editDialog(title, fields, customize) {
  const dialog = $('#editor-dialog'); $('#editor-title').textContent = title; const container = $('#editor-fields'); container.replaceChildren();
  for (const field of fields) {
    const label = document.createElement('label'); label.textContent = field.label;
    const input = document.createElement(field.options ? 'select' : 'input'); input.name = field.name;
    if (field.options) for (const [value, text] of field.options) { const option = document.createElement('option'); option.value = value; option.textContent = text; input.append(option); }
    else { input.type = field.type ?? 'text'; if (field.accept) input.accept = field.accept; input.required = Boolean(field.required); if (field.maxLength) input.maxLength = field.maxLength; }
    if (field.value !== undefined) input.value = field.value; label.append(input); container.append(label);
  }
  if (customize) customize({ dialog, form: $('#editor-form'), container });
  dialog.showModal();
  return new Promise(resolve => {
    const form = $('#editor-form'); let settled = false;
    const finish = value => { if (settled) return; settled = true; form.removeEventListener('submit', submit); dialog.removeEventListener('close', onClose); resolve(value); };
    const submit = event => { event.preventDefault(); const data = new FormData(form); finish(data); dialog.close(); };
    const onClose = () => finish(null);
    form.addEventListener('submit', submit);
    dialog.addEventListener('close', onClose);
  });
}
