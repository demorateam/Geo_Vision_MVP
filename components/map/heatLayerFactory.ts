import simpleheat from "simpleheat";


// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createHeatLayer(L: any, latlngs: [number, number, number?][], options: any = {}) {
  const HeatLayer = L.Layer.extend({
    initialize(latlngs: unknown, opts: unknown) {
      this._latlngs = latlngs;
      L.Util.setOptions(this, opts);
    },

    setLatLngs(latlngs: unknown) {
      this._latlngs = latlngs;
      return this._reset();
    },

    addTo(map: any) {
      map.addLayer(this);
      return this;
    },

    onAdd(map: any) {
      this._map = map;
      if (!this._canvas) this._initCanvas();
      map.getPanes().overlayPane.appendChild(this._canvas);
      map.on("moveend", this._reset, this);
      map.on("zoomstart", this._hideCanvas, this);
      map.on("zoomend", this._reset, this);
      this._reset();
    },

     onRemove(map: any) {
      map.getPanes().overlayPane.removeChild(this._canvas);
      map.off("moveend", this._reset, this);
      map.off("zoomstart", this._hideCanvas, this);
      map.off("zoomend", this._reset, this);
    },

    _hideCanvas() {
      if (this._canvas) this._canvas.style.opacity = "0";
    },

    _initCanvas() {
      const canvas = (this._canvas = L.DomUtil.create("canvas", "leaflet-heatmap-layer leaflet-layer"));
      canvas.style.transition = "opacity 150ms linear"; // ← اضافه شد
      const size = this._map.getSize();
      canvas.width = size.x;
      canvas.height = size.y;
      const animated = this._map.options.zoomAnimation && L.Browser.any3d;
      L.DomUtil.addClass(canvas, "leaflet-zoom-" + (animated ? "animated" : "hide"));
      this._heat = simpleheat(canvas);
      this._updateOptions();
    },

    _updateOptions() {
      this._heat.radius(this.options.radius || this._heat.defaultRadius, this.options.blur);
      if (this.options.gradient) this._heat.gradient(this.options.gradient);
       this._heat.max(this.options.max ?? 1);
    },

     _reset() {
      const topLeft = this._map.containerPointToLayerPoint([0, 0]);
      L.DomUtil.setPosition(this._canvas, topLeft);
      const size = this._map.getSize();
      if (this._heat._width !== size.x) this._canvas.width = this._heat._width = size.x;
      if (this._heat._height !== size.y) this._canvas.height = this._heat._height = size.y;
      this._redraw();
      this._canvas.style.opacity = "1"; // ← دوباره نمایانش کن بعد از محاسبه‌ی صحیح
      return this;
    },

       _redraw() {
      if (!this._map) return;
      const data: [number, number, number][] = [];
      const r = this._heat._r;
      const size = this._map.getSize();
      const bounds = new L.Bounds(L.point([-r, -r]), size.add([r, r]));
      const cellSize = r / 2;
      const grid: any[] = [];
      const panePos = this._map._getMapPanePos();
      const offsetX = panePos.x % cellSize;
      const offsetY = panePos.y % cellSize;

      for (let i = 0; i < this._latlngs.length; i++) {
        const p = this._map.latLngToContainerPoint(this._latlngs[i]);
        if (bounds.contains(p)) {
          const x = Math.floor((p.x - offsetX) / cellSize) + 2;
          const y = Math.floor((p.y - offsetY) / cellSize) + 2;
          // بدون افت وزنی بر اساس زوم — هر نقطه وزن خودش (intensity) رو کامل حفظ می‌کنه
          const k = this._latlngs[i][2] !== undefined ? +this._latlngs[i][2] : 1;
          grid[y] = grid[y] || [];
          const cell = grid[y][x];
          if (!cell) grid[y][x] = [p.x, p.y, k];
          else {
            cell[0] = (cell[0] * cell[2] + p.x * k) / (cell[2] + k);
            cell[1] = (cell[1] * cell[2] + p.y * k) / (cell[2] + k);
            cell[2] += k;
          }
        }
      }

      for (const row of grid) {
        if (!row) continue;
        for (const cell of row) {
          if (cell) data.push([Math.round(cell[0]), Math.round(cell[1]), cell[2]]);
        }
      }

      this._heat.data(data).draw(this.options.minOpacity);
      this._frame = null;
    },

    
  });

  return new HeatLayer(latlngs, options);
}