// Product detail page logic
(function () {
  const form = document.getElementById('product-form');
  if (!form) return;

  // Color swatch selection
  const swatches = document.querySelectorAll('#color-swatches button');
  swatches.forEach(swatch => {
    swatch.addEventListener('click', (e) => {
      e.preventDefault();
      swatches.forEach(s => s.classList.remove('ring-2', 'ring-brand'));
      swatch.classList.add('ring-2', 'ring-brand');
    });
  });

  // Size selection validation
  const sizeSelect = document.getElementById('size-select');
  const buyButton = document.getElementById('buy-button');

  buyButton.addEventListener('click', (e) => {
    if (!sizeSelect.value) {
      sizeSelect.classList.add('border-brand', 'bg-brand/5');
      sizeSelect.focus();
      return;
    }
    sizeSelect.classList.remove('border-brand', 'bg-brand/5');
  });
}());
