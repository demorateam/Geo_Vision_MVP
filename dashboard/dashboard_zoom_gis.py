from flask import Flask, jsonify, render_template_string, request
import math
import random

app = Flask(__name__)

# ============================================================
# GeoVision Vision Dashboard - Zoom-based GIS Demo
# Static 10M incident model, no PostgreSQL required
# ============================================================

TOTAL_EVENTS = 10_000_000
TOTAL_USERS = 500_000

LAT_MIN, LAT_MAX = 35.60, 35.80
LON_MIN, LON_MAX = 51.20, 51.55

CATEGORY_COUNTS = {
    "عمرانی": 1_665_876,
    "ترافیکی": 1_667_626,
    "پسماند": 1_667_221,
    "برق و روشنایی": 1_666_309,
    "آبفا": 1_665_749,
    "ایمنی و بحران": 1_667_219,
}

STATUS_COUNTS = {
    "ثبت شده": 3_999_693,
    "در حال رسیدگی": 2_002_524,
    "حل شده": 3_498_441,
    "رد شده": 499_342,
}

SEVERITY_COUNTS = {
    "کم": 3_999_593,
    "متوسط": 3_498_572,
    "بالا": 1_500_866,
    "بحرانی": 1_000_969,
}

DISTRICT_COUNTS = {
    "منطقه 1": 453_595, "منطقه 2": 455_027, "منطقه 3": 453_815,
    "منطقه 4": 454_745, "منطقه 5": 453_950, "منطقه 6": 455_242,
    "منطقه 7": 454_287, "منطقه 8": 454_916, "منطقه 9": 455_496,
    "منطقه 10": 454_215, "منطقه 11": 454_195, "منطقه 12": 454_702,
    "منطقه 13": 454_039, "منطقه 14": 455_277, "منطقه 15": 454_316,
    "منطقه 16": 454_771, "منطقه 17": 455_160, "منطقه 18": 454_571,
    "منطقه 19": 454_612, "منطقه 20": 454_285, "منطقه 21": 453_989,
    "منطقه 22": 454_795,
}

RECENT_INCIDENTS = [
    {"title": "گزارش ترکیدگی لوله آب", "district": "منطقه 4", "category": "آبفا", "status": "در حال رسیدگی", "severity": "بالا", "created_at": "چهارشنبه 1405/06/18 - 14:47:20"},
    {"title": "اختلال در روشنایی معبر", "district": "منطقه 15", "category": "برق و روشنایی", "status": "ثبت شده", "severity": "متوسط", "created_at": "چهارشنبه 1405/06/18 - 14:42:05"},
    {"title": "تجمع پسماند شهری", "district": "منطقه 5", "category": "پسماند", "status": "در حال رسیدگی", "severity": "متوسط", "created_at": "چهارشنبه 1405/06/18 - 14:36:41"},
    {"title": "آسیب سطح آسفالت", "district": "منطقه 12", "category": "عمرانی", "status": "ثبت شده", "severity": "بالا", "created_at": "چهارشنبه 1405/06/18 - 14:31:18"},
    {"title": "انسداد مسیر ترافیکی", "district": "منطقه 2", "category": "ترافیکی", "status": "حل شده", "severity": "متوسط", "created_at": "چهارشنبه 1405/06/18 - 14:25:54"},
    {"title": "گزارش حادثه شهری", "district": "منطقه 14", "category": "ایمنی و بحران", "status": "در حال رسیدگی", "severity": "بحرانی", "created_at": "چهارشنبه 1405/06/18 - 14:19:37"},
    {"title": "خرابی چراغ راهنمایی", "district": "منطقه 7", "category": "ترافیکی", "status": "ثبت شده", "severity": "کم", "created_at": "چهارشنبه 1405/06/18 - 14:15:12"},
    {"title": "نشتی شبکه آب", "district": "منطقه 10", "category": "آبفا", "status": "حل شده", "severity": "بالا", "created_at": "چهارشنبه 1405/06/18 - 14:09:45"},
    {"title": "خرابی روشنایی محله", "district": "منطقه 18", "category": "برق و روشنایی", "status": "در حال رسیدگی", "severity": "متوسط", "created_at": "چهارشنبه 1405/06/18 - 14:04:28"},
    {"title": "گزارش نخاله ساختمانی", "district": "منطقه 1", "category": "عمرانی", "status": "رد شده", "severity": "کم", "created_at": "چهارشنبه 1405/06/18 - 13:58:10"},
    {"title": "پسماند رها شده در معبر", "district": "منطقه 20", "category": "پسماند", "status": "ثبت شده", "severity": "متوسط", "created_at": "چهارشنبه 1405/06/18 - 13:52:33"},
    {"title": "خطر سقوط سازه", "district": "منطقه 6", "category": "ایمنی و بحران", "status": "در حال رسیدگی", "severity": "بحرانی", "created_at": "چهارشنبه 1405/06/18 - 13:46:57"},
    {"title": "گودال در سطح خیابان", "district": "منطقه 9", "category": "عمرانی", "status": "حل شده", "severity": "متوسط", "created_at": "چهارشنبه 1405/06/18 - 13:41:22"},
    {"title": "اختلال شبکه روشنایی", "district": "منطقه 21", "category": "برق و روشنایی", "status": "ثبت شده", "severity": "بالا", "created_at": "چهارشنبه 1405/06/18 - 13:35:04"},
    {"title": "حادثه ترافیکی", "district": "منطقه 3", "category": "ترافیکی", "status": "حل شده", "severity": "بالا", "created_at": "چهارشنبه 1405/06/18 - 13:29:48"},
]


def ratio_from_selection(base_counts, selected):
    if not selected:
        return 1.0
    return sum(base_counts.get(x, 0) for x in selected) / TOTAL_EVENTS


def filter_ratio(args):
    return (
        ratio_from_selection(DISTRICT_COUNTS, args.getlist("districts"))
        * ratio_from_selection(CATEGORY_COUNTS, args.getlist("categories"))
        * ratio_from_selection(STATUS_COUNTS, args.getlist("statuses"))
        * ratio_from_selection(SEVERITY_COUNTS, args.getlist("severities"))
    )


def scale_counts(base_counts, selected, other_ratio):
    src = {k: v for k, v in base_counts.items() if not selected or k in selected}
    return {k: int(v * other_ratio) for k, v in src.items()}


def stable_hash(*values):
    s = "|".join(str(v) for v in values)
    h = 2166136261
    for ch in s.encode("utf-8"):
        h ^= ch
        h = (h * 16777619) & 0xFFFFFFFF
    return h


def grid_size_for_zoom(zoom):
    # Coarser grid when zoomed out, progressively finer when zooming in.
    if zoom <= 9:
        return 0.055
    if zoom <= 10:
        return 0.035
    if zoom <= 11:
        return 0.022
    if zoom <= 12:
        return 0.014
    if zoom <= 13:
        return 0.008
    if zoom <= 14:
        return 0.0045
    return 0.0022


def estimated_visible_count(north, south, east, west, ratio=1.0):
    full_area = (LAT_MAX - LAT_MIN) * (LON_MAX - LON_MIN)
    view_n = min(LAT_MAX, north)
    view_s = max(LAT_MIN, south)
    view_e = min(LON_MAX, east)
    view_w = max(LON_MIN, west)

    if view_n <= view_s or view_e <= view_w:
        return 0

    view_area = (view_n - view_s) * (view_e - view_w)
    return int(TOTAL_EVENTS * (view_area / full_area) * ratio)


def generate_clusters(north, south, east, west, zoom, ratio):
    grid = grid_size_for_zoom(zoom)

    s = max(LAT_MIN, south)
    n = min(LAT_MAX, north)
    w = max(LON_MIN, west)
    e = min(LON_MAX, east)

    if s >= n or w >= e:
        return []

    # Align grid for stable positions while panning.
    lat_start = math.floor((s - LAT_MIN) / grid) * grid + LAT_MIN
    lon_start = math.floor((w - LON_MIN) / grid) * grid + LON_MIN

    cells = []
    lat = lat_start
    while lat < n:
        lon = lon_start
        while lon < e:
            cell_s = max(lat, s)
            cell_n = min(lat + grid, n)
            cell_w = max(lon, w)
            cell_e = min(lon + grid, e)

            if cell_s < cell_n and cell_w < cell_e:
                full_area = (LAT_MAX - LAT_MIN) * (LON_MAX - LON_MIN)
                cell_area = (cell_n - cell_s) * (cell_e - cell_w)
                expected = TOTAL_EVENTS * (cell_area / full_area) * ratio

                # Stable local density variation around the uniform generator.
                seed = stable_hash(round(lat, 6), round(lon, 6), zoom)
                variation = 0.72 + ((seed % 5600) / 10000.0)  # 0.72..1.2799
                count = max(1, int(expected * variation))

                jitter_lat = (((seed >> 8) % 1000) / 1000.0 - 0.5) * grid * 0.35
                jitter_lon = (((seed >> 18) % 1000) / 1000.0 - 0.5) * grid * 0.35

                center_lat = max(cell_s, min(cell_n, (cell_s + cell_n) / 2 + jitter_lat))
                center_lon = max(cell_w, min(cell_e, (cell_w + cell_e) / 2 + jitter_lon))

                cells.append({
                    "type": "cluster",
                    "lat": round(center_lat, 6),
                    "lon": round(center_lon, 6),
                    "count": count,
                })
            lon += grid
        lat += grid

    # Protect browser if somebody zooms out too far.
    cells.sort(key=lambda x: x["count"], reverse=True)
    return cells[:1200]


def generate_incident_points(north, south, east, west, ratio, limit=2500):
    visible = estimated_visible_count(north, south, east, west, ratio)
    if visible <= 0:
        return []

    count = min(limit, visible)

    s = max(LAT_MIN, south)
    n = min(LAT_MAX, north)
    w = max(LON_MIN, west)
    e = min(LON_MAX, east)

    seed = stable_hash(round(north, 5), round(south, 5), round(east, 5), round(west, 5))
    rng = random.Random(seed)

    categories = list(CATEGORY_COUNTS.keys())
    statuses = ["ثبت شده", "در حال رسیدگی", "حل شده", "رد شده"]
    severities = ["کم", "متوسط", "بالا", "بحرانی"]

    points = []
    for i in range(count):
        category = rng.choice(categories)
        status = rng.choices(statuses, weights=[40, 20, 35, 5])[0]
        severity = rng.choices(severities, weights=[40, 35, 15, 10])[0]
        lat = rng.uniform(s, n)
        lon = rng.uniform(w, e)
        district = rng.randint(1, 22)

        points.append({
            "type": "incident",
            "id": f"GV-{seed:08X}-{i+1}",
            "lat": round(lat, 6),
            "lon": round(lon, 6),
            "title": f"گزارش رخداد {category}",
            "category": category,
            "status": status,
            "severity": severity,
            "district": f"منطقه {district}",
        })
    return points


TEMPLATE = """
<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>داشبورد مدیریت رخدادهای شهری - GeoVision UEMP</title>

    <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
    <link href="https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css" rel="stylesheet" type="text/css" />

    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>

    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>

    <style>
        body { font-family: 'Vazirmatn', sans-serif; }
        .dark-card { background: rgba(15, 23, 42, 0.95); border: 1px solid rgba(51, 65, 85, 0.6); }
        .dark-mode-map .leaflet-layer,
        .dark-mode-map .leaflet-control-zoom-in,
        .dark-mode-map .leaflet-control-zoom-out {
            filter: brightness(0.6) invert(1) contrast(3) hue-rotate(200deg) saturate(0.3) brightness(0.7);
        }
        .cluster-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 9999px;
            border: 2px solid rgba(103,232,249,.95);
            background: rgba(8,145,178,.78);
            color: white;
            font-weight: 900;
            box-shadow: 0 0 18px rgba(34,211,238,.30);
            backdrop-filter: blur(3px);
        }
    </style>
</head>

<body class="bg-slate-950 text-slate-100 h-screen overflow-hidden flex flex-col p-2 gap-2">

<header class="dark-card rounded-xl p-2.5 flex-none flex flex-row justify-between items-center shadow-lg">
    <div class="flex items-center gap-3">
        <span class="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
        <h1 class="text-sm md:text-base font-black text-slate-100">
            سامانه پایش هوشمند رخدادهای شهری (GeoVision UEMP) - ۱۰ میلیون رخداد | ۵۰۰ هزار کاربر
        </h1>
    </div>

    <div id="report-range-banner" class="text-xs text-amber-300 font-mono bg-slate-900 px-2.5 py-1 rounded border border-amber-500/40">
        بازه گزارش: ۱۴۰۴ تا ۱۴۰۵
    </div>
</header>

<div class="dark-card rounded-xl p-2.5 flex-none shadow border border-slate-700">
    <form id="filter-form" class="grid grid-cols-2 md:grid-cols-7 gap-2 text-[11px]">
        <div>
            <label class="block text-slate-400 mb-0.5">از تاریخ (شمسی):</label>
            <div class="flex gap-1">
                <select id="start_year" name="start_year" class="w-1/3 bg-slate-900 border border-slate-700 rounded p-0.5"><option value="">سال</option></select>
                <select id="start_month" name="start_month" class="w-1/3 bg-slate-900 border border-slate-700 rounded p-0.5"><option value="">ماه</option></select>
                <select id="start_day" name="start_day" class="w-1/3 bg-slate-900 border border-slate-700 rounded p-0.5"><option value="">روز</option></select>
            </div>
        </div>

        <div>
            <label class="block text-slate-400 mb-0.5">تا تاریخ (شمسی):</label>
            <div class="flex gap-1">
                <select id="end_year" name="end_year" class="w-1/3 bg-slate-900 border border-slate-700 rounded p-0.5"><option value="">سال</option></select>
                <select id="end_month" name="end_month" class="w-1/3 bg-slate-900 border border-slate-700 rounded p-0.5"><option value="">ماه</option></select>
                <select id="end_day" name="end_day" class="w-1/3 bg-slate-900 border border-slate-700 rounded p-0.5"><option value="">روز</option></select>
            </div>
        </div>

        <div>
            <label class="block text-slate-400 mb-0.5">ساعت (از - تا):</label>
            <div class="flex gap-1">
                <select name="start_hour" class="w-1/2 bg-slate-900 border border-slate-700 rounded p-0.5">
                    <option value="">شروع</option>
                    <script>for(let i=0;i<24;i++)document.write(`<option value="${i}">${i}:00</option>`)</script>
                </select>
                <select name="end_hour" class="w-1/2 bg-slate-900 border border-slate-700 rounded p-0.5">
                    <option value="">پایان</option>
                    <script>for(let i=0;i<24;i++)document.write(`<option value="${i}">${i}:59</option>`)</script>
                </select>
            </div>
        </div>

        <div>
            <label class="block text-slate-400 mb-0.5">مناطق شهرداری:</label>
            <select name="districts" multiple class="w-full bg-slate-900 border border-slate-700 rounded p-0.5 h-11">
                <script>for(let i=1;i<=22;i++)document.write(`<option value="منطقه ${i}">منطقه ${i}</option>`)</script>
            </select>
        </div>

        <div>
            <label class="block text-slate-400 mb-0.5">نوع رخداد:</label>
            <select name="categories" multiple class="w-full bg-slate-900 border border-slate-700 rounded p-0.5 h-11">
                <option value="آبفا">آب و فاضلاب</option>
                <option value="عمرانی">عمرانی و معابر</option>
                <option value="پسماند">پسماند و نظافت</option>
                <option value="برق و روشنایی">روشنایی معابر</option>
                <option value="ترافیکی">ترافیک و تابلوها</option>
                <option value="ایمنی و بحران">ایمنی و حوادث</option>
            </select>
        </div>

        <div>
            <label class="block text-slate-400 mb-0.5">وضعیت و شدت:</label>
            <div class="flex gap-1">
                <select name="statuses" multiple class="w-1/2 bg-slate-900 border border-slate-700 rounded p-0.5 h-11 text-[10px]">
                    <option value="ثبت شده">ثبت شده</option>
                    <option value="در حال رسیدگی">در حال رسیدگی</option>
                    <option value="حل شده">حل شده</option>
                    <option value="رد شده">رد شده</option>
                </select>
                <select name="severities" multiple class="w-1/2 bg-slate-900 border border-slate-700 rounded p-0.5 h-11 text-[10px]">
                    <option value="کم">کم</option>
                    <option value="متوسط">متوسط</option>
                    <option value="بالا">بالا</option>
                    <option value="بحرانی">بحرانی</option>
                </select>
            </div>
        </div>

        <div class="flex flex-col justify-end">
            <div class="flex gap-1">
                <button type="submit" class="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-1.5 rounded">اعمال فیلتر</button>
                <button type="button" id="reset-btn" class="bg-slate-700 hover:bg-slate-600 px-2 py-1.5 rounded">حذف</button>
            </div>
        </div>
    </form>
</div>

<div class="grid grid-cols-2 md:grid-cols-4 gap-2 flex-none">
    <div class="dark-card p-2.5 rounded-xl flex justify-between items-center border-r-4 border-cyan-500">
        <div><div class="text-[10px] text-slate-400">کل رخدادها در فیلتر</div><div id="stat-total" class="text-sm md:text-base font-black">-</div></div>
        <div class="text-cyan-400 text-lg">📊</div>
    </div>

    <div class="dark-card p-2.5 rounded-xl flex justify-between items-center border-r-4 border-red-500">
        <div><div class="text-[10px] text-slate-400">حوادث بحرانی</div><div id="stat-critical" class="text-sm md:text-base font-black text-red-400">-</div></div>
        <div class="text-red-400 text-lg">🚨</div>
    </div>

    <div class="dark-card p-2.5 rounded-xl flex justify-between items-center border-r-4 border-emerald-500">
        <div><div class="text-[10px] text-slate-400">میانگین زمان رسیدگی</div><div class="text-sm md:text-base font-black text-emerald-400">۴.۸ ساعت</div></div>
        <div class="text-emerald-400 text-lg">⏱</div>
    </div>

    <div class="dark-card p-2.5 rounded-xl flex justify-between items-center border-r-4 border-amber-500">
        <div><div class="text-[10px] text-slate-400">ساعت اوج گزارش‌ها</div><div id="stat-peak-hour" class="text-sm md:text-base font-black text-amber-400">۱۴:۰۰</div></div>
        <div class="text-amber-400 text-lg">⏰</div>
    </div>
</div>

<div class="grid grid-cols-1 lg:grid-cols-12 gap-2 flex-1 min-h-0 items-stretch">
    <div class="lg:col-span-3 flex flex-col gap-2 min-h-0">
        <div class="dark-card rounded-xl p-2.5 flex-1 flex flex-col shadow">
            <h2 class="text-xs font-bold text-amber-400 mb-1 border-b border-slate-800 pb-1">توزیع حوزه‌های شهری</h2>
            <div class="relative w-full flex-1 flex flex-col items-center justify-center p-1">
                <div style="width:120px;height:120px" class="mb-1"><canvas id="categoryDoughnutChart"></canvas></div>
                <div id="cat-legend" class="flex flex-wrap justify-center gap-1.5 text-[9px]"></div>
            </div>
        </div>

        <div class="dark-card rounded-xl p-2.5 flex-1 flex flex-col shadow">
            <h2 class="text-xs font-bold text-amber-400 mb-1 border-b border-slate-800 pb-1">وضعیت رسیدگی در سامانه</h2>
            <div class="relative w-full flex-1 flex flex-col items-center justify-center p-1">
                <div style="width:120px;height:120px" class="mb-1"><canvas id="statusPieChart"></canvas></div>
                <div id="stat-legend" class="flex flex-wrap justify-center gap-2 text-[9px]"></div>
            </div>
        </div>
    </div>

    <div class="lg:col-span-6 flex flex-col min-h-0">
        <div class="dark-card rounded-xl p-2.5 shadow relative flex flex-col border border-cyan-500/40 h-full">
            <div class="flex justify-between items-center mb-1 px-1 flex-none">
                <h2 class="text-xs font-bold text-cyan-400">🗺 تراکم جغرافیایی حوادث شهری تهران</h2>
                <div class="text-[10px] text-slate-400">
                    <span id="map-mode">در حال بارگذاری...</span>
                    <span class="mx-1">|</span>
                    <span id="map-visible-count"></span>
                </div>
            </div>

            <div id="map" class="w-full flex-1 rounded-lg overflow-hidden border border-cyan-900/50 bg-slate-950 min-h-[220px]"></div>
        </div>
    </div>

    <div class="lg:col-span-3 flex flex-col min-h-0">
        <div class="dark-card rounded-xl p-2.5 shadow flex flex-col h-full">
            <div class="flex justify-between items-center mb-1 border-b border-slate-800 pb-1">
                <h2 class="text-xs font-bold text-red-400">آخرین رخدادهای ثبت‌شده</h2>
            </div>
            <div class="space-y-1.5 text-[11px] overflow-y-auto flex-1 pr-1" id="recent-events"></div>
        </div>
    </div>
</div>

<div class="grid grid-cols-1 md:grid-cols-2 gap-2 flex-none">
    <div class="dark-card p-2 rounded-lg border-t-2 border-cyan-400 text-[11px]">
        <span class="text-cyan-400 font-bold">📍 تمرکز مکانی:</span>
        بیشترین: <span id="val-top-dist">...</span> |
        کمترین: <span id="val-low-dist">...</span>
    </div>
    <div class="dark-card p-2 rounded-lg border-t-2 border-amber-400 text-[11px]">
        <span class="text-amber-400 font-bold">🏷 حوزه رخداد:</span>
        بیشترین: <span id="val-top-cat">...</span> |
        کمترین: <span id="val-low-cat">...</span>
    </div>
</div>

<script>
const darkLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 });

const map = L.map('map', {
    center: [35.6892, 51.3890],
    zoom: 11,
    layers: [darkLayer],
    zoomControl: false,
    preferCanvas: true
});

L.control.zoom({position:'bottomleft'}).addTo(map);
document.getElementById('map').classList.add('dark-mode-map');

let mapLayer = L.layerGroup().addTo(map);
let catChartInstance = null;
let statusChartInstance = null;
let currentFilterQuery = '';
let mapRequestSeq = 0;

function fa(n) {
    return Number(n || 0).toLocaleString('fa-IR');
}

function populateSelect(id, values) {
    const el = document.getElementById(id);
    values.forEach(v => {
        const op = document.createElement('option');
        op.value = v;
        op.innerText = v;
        el.appendChild(op);
    });
}

fetch('api/meta')
    .then(r => r.json())
    .then(meta => {
        populateSelect('start_year', meta.years);
        populateSelect('end_year', meta.years);
        populateSelect('start_month', meta.months);
        populateSelect('end_month', meta.months);
        populateSelect('start_day', meta.days);
        populateSelect('end_day', meta.days);
    });

function renderRecent(items) {
    const box = document.getElementById('recent-events');
    box.innerHTML = '';

    items.forEach(inc => {
        let colorClass = inc.status === 'حل شده'
            ? 'border-emerald-500 text-emerald-400'
            : (inc.status === 'در حال رسیدگی'
                ? 'border-amber-500 text-amber-400'
                : 'border-red-500 text-red-400');

        let sevColor = inc.severity === 'بحرانی'
            ? 'text-red-400'
            : (inc.severity === 'بالا' ? 'text-orange-400' : 'text-slate-300');

        box.innerHTML += `
        <div class="bg-slate-900/90 p-2 rounded border-r-2 ${colorClass} flex justify-between items-center">
            <div>
                <div class="font-bold">${inc.title}</div>
                <div class="text-[9px] text-slate-400">${inc.district} | ${inc.status} | ${inc.created_at}</div>
            </div>
            <div class="text-left flex flex-col items-end gap-1">
                <span class="font-bold text-[9px] bg-slate-800 px-1.5 py-0.5 rounded text-amber-300">${inc.category}</span>
                <span class="text-[8px] font-bold ${sevColor}">شدت: ${inc.severity}</span>
            </div>
        </div>`;
    });
}

function renderCharts(data) {
    if (catChartInstance) catChartInstance.destroy();
    if (statusChartInstance) statusChartInstance.destroy();

    const catColors = ['#06b6d4','#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6'];
    catChartInstance = new Chart(document.getElementById('categoryDoughnutChart'), {
        type: 'doughnut',
        data: {
            labels: Object.keys(data.category_counts),
            datasets: [{data:Object.values(data.category_counts), backgroundColor:catColors}]
        },
        options: {responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}}
    });

    document.getElementById('cat-legend').innerHTML =
        Object.keys(data.category_counts).map((label, i) =>
            `<span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full inline-block" style="background:${catColors[i%catColors.length]}"></span>${label}</span>`
        ).join('');

    const statColors = ['#10b981','#f59e0b','#ef4444','#64748b'];
    statusChartInstance = new Chart(document.getElementById('statusPieChart'), {
        type: 'pie',
        data: {
            labels: Object.keys(data.status_counts),
            datasets: [{data:Object.values(data.status_counts), backgroundColor:statColors}]
        },
        options: {responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}}
    });

    document.getElementById('stat-legend').innerHTML =
        Object.keys(data.status_counts).map((label, i) =>
            `<span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full inline-block" style="background:${statColors[i%statColors.length]}"></span>${label}</span>`
        ).join('');
}

function loadDashboard(queryString='') {
    currentFilterQuery = queryString;

    fetch('api/data?' + queryString)
        .then(r => r.json())
        .then(data => {
            document.getElementById('stat-total').innerText = fa(data.total_events);
            document.getElementById('stat-critical').innerText = fa(data.severity_counts['بحرانی'] || 0);

            document.getElementById('val-top-dist').innerText =
                data.top_district ? `${data.top_district.district} (${fa(data.top_district.count)})` : 'ندارد';
            document.getElementById('val-low-dist').innerText =
                data.low_district ? `${data.low_district.district} (${fa(data.low_district.count)})` : 'ندارد';
            document.getElementById('val-top-cat').innerText =
                data.top_category ? `${data.top_category.category} (${fa(data.top_category.count)})` : 'ندارد';
            document.getElementById('val-low-cat').innerText =
                data.low_category ? `${data.low_category.category} (${fa(data.low_category.count)})` : 'ندارد';

            renderRecent(data.incidents || []);
            renderCharts(data);

            loadMapData();
        });
}

function clusterIcon(count) {
    const digits = String(count).length;
    const size = Math.min(62, 34 + digits * 3);

    return L.divIcon({
        className: '',
        html: `<div class="cluster-icon" style="width:${size}px;height:${size}px;font-size:${digits > 5 ? 10 : 11}px">${fa(count)}</div>`,
        iconSize: [size, size],
        iconAnchor: [size/2, size/2]
    });
}

function loadMapData() {
    const seq = ++mapRequestSeq;
    const b = map.getBounds();
    const zoom = map.getZoom();

    const params = new URLSearchParams(currentFilterQuery);
    params.set('north', b.getNorth());
    params.set('south', b.getSouth());
    params.set('east', b.getEast());
    params.set('west', b.getWest());
    params.set('zoom', zoom);

    document.getElementById('map-mode').innerText = 'در حال بارگذاری نقشه...';

    fetch('api/map?' + params.toString())
        .then(r => r.json())
        .then(data => {
            if (seq !== mapRequestSeq) return;

            mapLayer.clearLayers();

            document.getElementById('map-mode').innerText =
                data.mode === 'clusters' ? 'نمای خوشه‌ای رخدادها' : 'نمای رخدادهای منفرد';
            document.getElementById('map-visible-count').innerText =
                `رخداد در محدوده: ${fa(data.estimated_events)}`;

            if (data.mode === 'clusters') {
                data.features.forEach(c => {
                    const m = L.marker([c.lat, c.lon], {icon:clusterIcon(c.count)});
                    m.on('click', () => {
                        map.flyTo([c.lat, c.lon], Math.min(map.getZoom()+2, 16), {duration:.5});
                    });
                    m.bindTooltip(`${fa(c.count)} رخداد`, {direction:'top'});
                    mapLayer.addLayer(m);
                });
            } else {
                data.features.forEach(pt => {
                    const color =
                        pt.status === 'حل شده' ? '#10b981' :
                        pt.status === 'در حال رسیدگی' ? '#f59e0b' : '#ef4444';

                    const marker = L.circleMarker([pt.lat, pt.lon], {
                        renderer: L.canvas(),
                        radius: 4,
                        color: color,
                        fillColor: color,
                        fillOpacity: .85,
                        weight: 1
                    });

                    marker.bindPopup(`
                        <b>${pt.title}</b><br>
                        شناسه: ${pt.id}<br>
                        حوزه: ${pt.category}<br>
                        شدت: ${pt.severity}<br>
                        منطقه: ${pt.district}<br>
                        وضعیت: ${pt.status}
                    `);

                    mapLayer.addLayer(marker);
                });
            }
        })
        .catch(err => {
            console.error(err);
            document.getElementById('map-mode').innerText = 'خطا در دریافت داده نقشه';
        });
}

let mapTimer = null;
function scheduleMapReload() {
    clearTimeout(mapTimer);
    mapTimer = setTimeout(loadMapData, 180);
}

map.on('moveend zoomend', scheduleMapReload);

document.getElementById('filter-form').addEventListener('submit', function(e) {
    e.preventDefault();
    loadDashboard(new URLSearchParams(new FormData(this)).toString());
});

document.getElementById('reset-btn').addEventListener('click', function() {
    document.getElementById('filter-form').reset();
    loadDashboard('');
});

loadDashboard('');
</script>
</body>
</html>
"""


@app.route("/")
def index():
    return render_template_string(TEMPLATE)


@app.route("/api/meta")
def api_meta():
    return jsonify({
        "years": ["1404", "1405"],
        "months": [f"{m:02d}" for m in range(1, 13)],
        "days": [f"{d:02d}" for d in range(1, 32)],
    })


@app.route("/api/data")
def api_data():
    districts = request.args.getlist("districts")
    categories = request.args.getlist("categories")
    statuses = request.args.getlist("statuses")
    severities = request.args.getlist("severities")

    d_ratio = ratio_from_selection(DISTRICT_COUNTS, districts)
    c_ratio = ratio_from_selection(CATEGORY_COUNTS, categories)
    s_ratio = ratio_from_selection(STATUS_COUNTS, statuses)
    sev_ratio = ratio_from_selection(SEVERITY_COUNTS, severities)

    total_ratio = d_ratio * c_ratio * s_ratio * sev_ratio
    total_events = int(TOTAL_EVENTS * total_ratio)

    cat_counts = scale_counts(CATEGORY_COUNTS, categories, d_ratio * s_ratio * sev_ratio)
    stat_counts = scale_counts(STATUS_COUNTS, statuses, d_ratio * c_ratio * sev_ratio)
    sev_counts = scale_counts(SEVERITY_COUNTS, severities, d_ratio * c_ratio * s_ratio)
    dist_counts = scale_counts(DISTRICT_COUNTS, districts, c_ratio * s_ratio * sev_ratio)

    top_district = None
    low_district = None
    if dist_counts:
        td = max(dist_counts.items(), key=lambda x: x[1])
        ld = min(dist_counts.items(), key=lambda x: x[1])
        top_district = {"district": td[0], "count": td[1]}
        low_district = {"district": ld[0], "count": ld[1]}

    top_category = None
    low_category = None
    if cat_counts:
        tc = max(cat_counts.items(), key=lambda x: x[1])
        lc = min(cat_counts.items(), key=lambda x: x[1])
        top_category = {"category": tc[0], "count": tc[1]}
        low_category = {"category": lc[0], "count": lc[1]}

    incidents = [
        x for x in RECENT_INCIDENTS
        if (not districts or x["district"] in districts)
        and (not categories or x["category"] in categories)
        and (not statuses or x["status"] in statuses)
        and (not severities or x["severity"] in severities)
    ][:15]

    return jsonify({
        "total_events": total_events,
        "category_counts": cat_counts,
        "status_counts": stat_counts,
        "severity_counts": sev_counts,
        "top_district": top_district,
        "low_district": low_district,
        "top_category": top_category,
        "low_category": low_category,
        "incidents": incidents,
    })


@app.route("/api/map")
def api_map():
    try:
        north = float(request.args.get("north", LAT_MAX))
        south = float(request.args.get("south", LAT_MIN))
        east = float(request.args.get("east", LON_MAX))
        west = float(request.args.get("west", LON_MIN))
        zoom = int(float(request.args.get("zoom", 11)))
    except ValueError:
        return jsonify({"error": "invalid map bounds"}), 400

    ratio = filter_ratio(request.args)
    estimated_events = estimated_visible_count(north, south, east, west, ratio)

    # Zoom <= 14: clusters. Zoom >= 15: individual incidents.
    if zoom <= 14:
        features = generate_clusters(north, south, east, west, zoom, ratio)
        mode = "clusters"
    else:
        features = generate_incident_points(
            north, south, east, west, ratio,
            limit=2500 if zoom == 15 else 4000
        )
        mode = "incidents"

    return jsonify({
        "mode": mode,
        "zoom": zoom,
        "estimated_events": estimated_events,
        "features": features,
    })


if __name__ == "__main__":
    print("🚀 GeoVision Zoom-based GIS Dashboard")
    print("👉 http://127.0.0.1:5000")
    app.run(host="0.0.0.0", port=5000, debug=False)