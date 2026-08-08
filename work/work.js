// Masonry via grid-row spans. No hover effects, no pointer tracking.
//
// Row-gap is 0 in CSS and the gutter is carried as padding-bottom on each tile,
// so a tile of height H always costs exactly ceil(H / rowunit) rows. Putting the
// gap on the grid instead would make each row unit cost (rowunit + gap) and
// collapse every tile onto the same span.
(function () {
  var grid = document.getElementById('grid');
  if (!grid) return;

  var tiles = Array.prototype.slice.call(grid.querySelectorAll('.tile'));
  if (!tiles.length) return;

  function rowUnit() {
    var v = parseFloat(getComputedStyle(grid).getPropertyValue('--rowunit'));
    return v > 0 ? v : 4;
  }

  function layout() {
    var cols = getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length;
    if (cols < 2) {                       // single column: normal flow is correct
      grid.classList.remove('is-masonry');
      tiles.forEach(function (t) { t.style.removeProperty('--span'); });
      return;
    }
    // measure with spans cleared, otherwise we'd measure our own last result
    grid.classList.remove('is-masonry');
    tiles.forEach(function (t) { t.style.removeProperty('--span'); });

    var unit = rowUnit();
    var heights = tiles.map(function (t) { return t.getBoundingClientRect().height; });

    grid.classList.add('is-masonry');
    tiles.forEach(function (t, i) {
      t.style.setProperty('--span', Math.ceil(heights[i] / unit));
    });
  }

  var pending = 0;
  function schedule() {
    cancelAnimationFrame(pending);
    pending = requestAnimationFrame(layout);
  }

  grid.querySelectorAll('img').forEach(function (img) {
    if (!img.complete) {
      img.addEventListener('load', schedule, { once: true });
      img.addEventListener('error', schedule, { once: true });
    }
  });

  if (document.fonts && document.fonts.ready) document.fonts.ready.then(schedule);
  window.addEventListener('resize', schedule);
  window.addEventListener('load', schedule);
  schedule();
})();
