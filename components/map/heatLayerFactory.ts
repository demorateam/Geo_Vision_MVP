import simpleheat from "simpleheat";

export interface HeatLayerOptions {
  /** شعاع پایه (در پایین‌ترین زوم مجاز برای heatmap) */
  radius?: number;
  blur?: number;
  minOpacity?: number;
  gradient?: Record<number, string>;
  /** زوم مرجع برای محاسبه‌ی کوچک‌شدن تدریجی شعاع */
  minZoom?: number;
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 1;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx] || 1;
}

/**
 * لایه‌ی حرارتی سفارشی Leaflet-compatible، بدون وابستگی به leaflet.heat
 * (که با @neshan-maps-platform/leaflet تضاد resolve دارد). موتور رسم از
 * پکیج مستقل simpleheat گرفته می‌شود و خودِ لایه با L تزریقی از بیرون ساخته می‌شود.
 *
 * ویژگی‌ها:
 * - شعاع با افزایش زوم کمی کوچک‌تر می‌شود (کاهش قاطی‌شدن لکه‌ها)
 * - سقف رنگ (max) به‌صورت پویا از صدک ۹۰ وزن سلول‌های قابل‌مشاهده محاسبه می‌شود
 *   (نه یک عدد ثابت)، تا نقاط هم‌پوشان خیلی سریع به قرمز کامل اشباع نشوند
 * - حین انیمیشن زوم، canvas مخفی و بعد از پایان زوم با موقعیت درست دوباره نمایان می‌شود
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createHeatLayer(L: any, latlngs: [number, number, number?][], options: HeatLayerOptions = {}) {
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
      map.on("zoomend", this._onZoomEnd, this);
      this._reset();
    },

    onRemove(map: any) {
      map.getPanes().overlayPane.removeChild(this._canvas);
      map.off("moveend", this._reset, this);
      map.off("zoomstart", this._hideCanvas, this);
      map.off("zoomend", this._onZoomEnd, this);
    },

    _hideCanvas() {
      if (this._canvas) this._canvas.style.opacity = "0";
    },

    _onZoomEnd() {
      this._applyZoomRadius();
      this._reset();
    },

    _initCanvas() {
      const canvas = (this._canvas = L.DomUtil.create("canvas", "leaflet-heatmap-layer leaflet-layer"));
      canvas.style.transition = "opacity 150ms linear";
      const size = this._map.getSize();
      canvas.width = size.x;
      canvas.height = size.y;
      const animated = this._map.options.zoomAnimation && L.Browser.any3d;
      L.DomUtil.addClass(canvas, "leaflet-zoom-" + (animated ? "animated" : "hide"));
      this._heat = simpleheat(canvas);
      if (this.options.gradient) this._heat.gradient(this.options.gradient);
      this._applyZoomRadius();
    },

    _applyZoomRadius() {
      if (!this._map || !this._heat) return;
      const baseRadius = this.options.radius || 25;
      const minZoom = this.options.minZoom ?? 5;
      const zoom = this._map.getZoom();
      const steps = Math.max(0, zoom - minZoom);
      const shrunk = baseRadius - steps * 2.5;
      this._currentRadius = Math.max(baseRadius * 0.45, shrunk);
      this._heat.radius(this._currentRadius, this.options.blur);
    },

    _reset() {
      if (!this._map || !this._heat) return;
      const topLeft = this._map.containerPointToLayerPoint([0, 0]);
      L.DomUtil.setPosition(this._canvas, topLeft);
      const size = this._map.getSize();
      if (this._heat._width !== size.x) this._canvas.width = this._heat._width = size.x;
      if (this._heat._height !== size.y) this._canvas.height = this._heat._height = size.y;
      this._redraw();
      this._canvas.style.opacity = "1";
      return this;
    },

    _redraw() {
      if (!this._map || !this._heat) return;
      const r = this._currentRadius || this.options.radius || 25;
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

      const data: [number, number, number][] = [];
      const weights: number[] = [];
      for (const row of grid) {
        if (!row) continue;
        for (const cell of row) {
          if (cell) {
            data.push([Math.round(cell[0]), Math.round(cell[1]), cell[2]]);
            weights.push(cell[2]);
          }
        }
      }

      const dynamicMax = percentile(weights, 90);
      this._heat.max(dynamicMax || 1);
      this._heat.data(data).draw(this.options.minOpacity ?? 0.05);
    },
  });

  return new HeatLayer(latlngs, options);
}
