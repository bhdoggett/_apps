const editor = document.getElementById('editor');
const copyStatus = document.getElementById('copy-status');

// Intercept paste — extract plain text only
editor.addEventListener('paste', (e) => {
  e.preventDefault();
  const plain = e.clipboardData.getData('text/plain');
  const start = editor.selectionStart;
  const end = editor.selectionEnd;
  const current = editor.value;
  editor.value = current.slice(0, start) + plain + current.slice(end);
  editor.selectionStart = editor.selectionEnd = start + plain.length;
});

// Copy
document.getElementById('btn-copy').addEventListener('click', async () => {
  if (!editor.value) return;
  await navigator.clipboard.writeText(editor.value);
  showStatus('copied');
});

// Clear
document.getElementById('btn-clear').addEventListener('click', () => {
  editor.value = '';
  copyStatus.textContent = '';
  editor.focus();
});

function showStatus(msg) {
  copyStatus.textContent = msg;
  setTimeout(() => { copyStatus.textContent = ''; }, 2000);
}
