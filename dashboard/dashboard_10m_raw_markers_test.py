from datetime import datetime
from flask import Flask, jsonify, render_template_string, request

app = Flask(__name__)

# ============================================================
# GeoVision Vision Dashboard - Static Demo Version
# No PostgreSQL / No psycopg2 / No external database
# ============================================================

TOTAL_EVENTS = 10_000_000
TOTAL_USERS = 500_000

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

# توزیع ثابت رخداد در مناطق ۲۲گانه تهران
DISTRICT_COUNTS = {
    "منطقه 1": 453_595,
    "منطقه 2": 455_027,
    "منطقه 3": 453_815,
    "منطقه 4": 454_745,
    "منطقه 5": 453_950,
    "منطقه 6": 455_242,
    "منطقه 7": 454_287,
    "منطقه 8": 454_916,
    "منطقه 9": 455_496,
    "منطقه 10": 454_215,
    "منطقه 11": 454_195,
    "منطقه 12": 454_702,
    "منطقه 13": 454_039,
    "منطقه 14": 455_277,
    "منطقه 15": 454_316,
    "منطقه 16": 454_771,
    "منطقه 17": 455_160,
    "منطقه 18": 454_571,
    "منطقه 19": 454_612,
    "منطقه 20": 454_285,
    "منطقه 21": 453_989,
    "منطقه 22": 454_795,
}

# ساعت‌های ثابت گزارش و توزیع نمایشی
HOURLY_COUNTS = {
    0: 415_454,
    1: 416_670,
    2: 416_821,
    3: 417_359,
    4: 417_074,
    5: 417_053,
    6: 416_555,
    7: 416_498,
    8: 417_039,
    9: 416_525,
    10: 417_068,
    11: 416_780,
    12: 416_619,
    13: 417_370,
    14: 416_162,
    15: 415_905,
    16: 416_430,
    17: 416_571,
    18: 416_834,
    19: 416_871,
    20: 416_865,
    21: 416_210,
    22: 416_293,
    23: 416_974,
}
HOURLY_COUNTS = {
    h: int(v * TOTAL_EVENTS / _hour_sum) for h, v in HOURLY_COUNTS.items()
}
HOURLY_COUNTS[14] += TOTAL_EVENTS - sum(HOURLY_COUNTS.values())

# مختصات ثابت تقریبی برای مناطق تهران
DISTRICT_CENTERS = {
    1: (35.8080, 51.4300), 2: (35.7700, 51.3650), 3: (35.7750, 51.4200),
    4: (35.7480, 51.4900), 5: (35.7480, 51.3300), 6: (35.7200, 51.3900),
    7: (35.7200, 51.4300), 8: (35.7250, 51.4650), 9: (35.6950, 51.3300),
    10: (35.7050, 51.3650), 11: (35.6900, 51.3900), 12: (35.6750, 51.4250),
    13: (35.7000, 51.4750), 14: (35.6750, 51.4850), 15: (35.6500, 51.4450),
    16: (35.6400, 51.4000), 17: (35.6650, 51.3650), 18: (35.6650, 51.3200),
    19: (35.6250, 51.3600), 20: (35.6000, 51.4400), 21: (35.7000, 51.2700),
    22: (35.7600, 51.2500),
}

CATEGORIES = list(CATEGORY_COUNTS.keys())
STATUSES = list(STATUS_COUNTS.keys())
SEVERITIES = list(SEVERITY_COUNTS.keys())

# رخدادهای اخیر ثابت
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


def build_static_map_points():
    """
    ۴۰۰ نقطه ثابت مطابق منطق فایل datatest.py کارفرما:
    - category: انتخاب یکنواخت از ۶ حوزه
    - status: وزن‌های 40/20/35/5
    - severity: وزن‌های 40/35/15/10
    - latitude: 35.60 تا 35.80
    - longitude: 51.20 تا 51.55
    - district: تصادفی از ۱ تا ۲۲

    Seed فقط برای ثابت ماندن نسخه نمایشی اضافه شده است.
    """
    import random

    rng = random.Random(14050618)

    category_db = [
        ("infrastructure", "عمرانی"),
        ("traffic", "ترافیکی"),
        ("waste", "پسماند"),
        ("lighting", "برق و روشنایی"),
        ("water_supply", "آبفا"),
        ("safety", "ایمنی و بحران"),
    ]

    statuses = ["ثبت شده", "در حال رسیدگی", "حل شده", "رد شده"]
    severities = ["کم", "متوسط", "بالا", "بحرانی"]

    points = []
    for _ in range(400):
        cat_db, cat_fa = rng.choice(category_db)
        status = rng.choices(statuses, weights=[40, 20, 35, 5])[0]
        severity = rng.choices(severities, weights=[40, 35, 15, 10])[0]
        lat = round(rng.uniform(35.60, 35.80), 6)
        lon = round(rng.uniform(51.20, 51.55), 6)
        district = rng.randint(1, 22)

        points.append({
            "title": f"گزارش خرابی {cat_db}",
            "district": f"منطقه {district}",
            "lat": lat,
            "lon": lon,
            "category": cat_fa,
            "status": status,
            "severity": severity,
        })

    return points


MAP_POINTS = build_static_map_points()


def ratio_from_selection(base_counts, selected):
    if not selected:
        return 1.0
    selected_total = sum(base_counts.get(item, 0) for item in selected)
    return selected_total / TOTAL_EVENTS if TOTAL_EVENTS else 0.0


def get_date_ratio(args):
    """
    بازه زمانی فقط برای تجربه فیلتر داشبورد استفاده می‌شود.
    داده اصلی ثابت است و نسبت بازه از یک سال نمایشی محاسبه می‌شود.
    """
    start_year = args.get("start_year")
    start_month = args.get("start_month")
    start_day = args.get("start_day")
    end_year = args.get("end_year")
    end_month = args.get("end_month")
    end_day = args.get("end_day")

    if not (start_year and start_month and start_day and end_year and end_month and end_day):
        return 1.0

    try:
        # تبدیل ساده برای محاسبه نسبت نمایشی بازه؛ سال شمسی ۳۶۵ روز در نظر گرفته شده است.
        def day_index(y, m, d):
            y = int(y)
            m = int(m)
            d = int(d)
            month_lengths = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29]
            base = (y - 1404) * 365
            return base + sum(month_lengths[:m - 1]) + d

        s = day_index(start_year, start_month, start_day)
        e = day_index(end_year, end_month, end_day)
        if e < s:
            return 0.0

        selected_days = e - s + 1
        return min(1.0, max(0.0, selected_days / 366.0))
    except Exception:
        return 1.0


def get_hour_ratio(args):
    start_hour = args.get("start_hour")
    end_hour = args.get("end_hour")
    if start_hour == "" or start_hour is None:
        start_hour = 0
    else:
        start_hour = int(start_hour)

    if end_hour == "" or end_hour is None:
        end_hour = 23
    else:
        end_hour = int(end_hour)

    if end_hour < start_hour:
        return 0.0

    selected = sum(HOURLY_COUNTS.get(h, 0) for h in range(start_hour, end_hour + 1))
    return selected / TOTAL_EVENTS if TOTAL_EVENTS else 0.0


def scale_counts(base_counts, allowed_keys, other_ratio):
    if allowed_keys:
        source = {k: v for k, v in base_counts.items() if k in allowed_keys}
    else:
        source = dict(base_counts)
    return {k: int(v * other_ratio) for k, v in source.items()}


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
    <script src="https://unpkg.com/leaflet.heat/dist/leaflet-heat.js"></script>
    <style>
        body { font-family: 'Vazirmatn', sans-serif; }
        .dark-card { background: rgba(15, 23, 42, 0.95); border: 1px solid rgba(51, 65, 85, 0.6); }
        .dark-mode-map .leaflet-layer, .dark-mode-map .leaflet-control-zoom-in, .dark-mode-map .leaflet-control-zoom-out {
            filter: brightness(0.6) invert(1) contrast(3) hue-rotate(200deg) saturate(0.3) brightness(0.7);
        }
    </style>
</head>
<body class="bg-slate-950 text-slate-100 h-screen overflow-hidden flex flex-col p-2 gap-2">

    <header class="dark-card rounded-xl p-2.5 flex-none flex flex-row justify-between items-center shadow-lg">
        <div class="flex items-center gap-3">
            <span class="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
            <h1 class="text-sm md:text-base font-black text-slate-100">سامانه پایش هوشمند رخدادهای شهری (GeoVision UEMP) - ۱۰ میلیون رخداد | ۵۰۰ هزار کاربر</h1>
        </div>
        <div id="report-range-banner" class="text-xs text-amber-300 font-mono bg-slate-900 px-2.5 py-1 rounded border border-amber-500/40">
            بازه گزارش: در حال بارگذاری...
        </div>
    </header>

    <div class="dark-card rounded-xl p-2.5 flex-none shadow border border-slate-700">
        <form id="filter-form" class="grid grid-cols-2 md:grid-cols-7 gap-2 text-[11px]">
            <div>
                <label class="block text-slate-400 mb-0.5">از تاریخ (شمسی):</label>
                <div class="flex gap-1">
                    <select id="start_year" name="start_year" class="w-1/3 bg-slate-900 border border-slate-700 rounded p-0.5 text-slate-200"><option value="">سال</option></select>
                    <select id="start_month" name="start_month" class="w-1/3 bg-slate-900 border border-slate-700 rounded p-0.5 text-slate-200"><option value="">ماه</option></select>
                    <select id="start_day" name="start_day" class="w-1/3 bg-slate-900 border border-slate-700 rounded p-0.5 text-slate-200"><option value="">روز</option></select>
                </div>
            </div>
            <div>
                <label class="block text-slate-400 mb-0.5">تا تاریخ (شمسی):</label>
                <div class="flex gap-1">
                    <select id="end_year" name="end_year" class="w-1/3 bg-slate-900 border border-slate-700 rounded p-0.5 text-slate-200"><option value="">سال</option></select>
                    <select id="end_month" name="end_month" class="w-1/3 bg-slate-900 border border-slate-700 rounded p-0.5 text-slate-200"><option value="">ماه</option></select>
                    <select id="end_day" name="end_day" class="w-1/3 bg-slate-900 border border-slate-700 rounded p-0.5 text-slate-200"><option value="">روز</option></select>
                </div>
            </div>
            <div>
                <label class="block text-slate-400 mb-0.5">ساعت (از - تا):</label>
                <div class="flex gap-1">
                    <select name="start_hour" class="w-1/2 bg-slate-900 border border-slate-700 rounded p-0.5 text-slate-200"><option value="">شروع</option><script>for(let i=0; i<24; i++) document.write(`<option value="${i}">${i}:00</option>`);</script></select>
                    <select name="end_hour" class="w-1/2 bg-slate-900 border border-slate-700 rounded p-0.5 text-slate-200"><option value="">پایان</option><script>for(let i=0; i<24; i++) document.write(`<option value="${i}">${i}:59</option>`);</script></select>
                </div>
            </div>
            <div>
                <label class="block text-slate-400 mb-0.5">مناطق شهرداری:</label>
                <select name="districts" multiple class="w-full bg-slate-900 border border-slate-700 rounded p-0.5 text-slate-200 h-11"><script>for(let i=1; i<=22; i++) document.write(`<option value="منطقه ${i}">منطقه ${i}</option>`);</script></select>
            </div>
            <div>
                <label class="block text-slate-400 mb-0.5">نوع رخداد:</label>
                <select name="categories" multiple class="w-full bg-slate-900 border border-slate-700 rounded p-0.5 text-slate-200 h-11">
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
                    <select name="statuses" multiple class="w-1/2 bg-slate-900 border border-slate-700 rounded p-0.5 text-slate-200 h-11 text-[10px]">
                        <option value="ثبت شده">ثبت شده</option>
                        <option value="در حال رسیدگی">در حال رسیدگی</option>
                        <option value="حل شده">حل شده</option>
                        <option value="رد شده">رد شده</option>
                    </select>
                    <select name="severities" multiple class="w-1/2 bg-slate-900 border border-slate-700 rounded p-0.5 text-slate-200 h-11 text-[10px]">
                        <option value="کم">کم</option>
                        <option value="متوسط">متوسط</option>
                        <option value="بالا">بالا</option>
                        <option value="بحرانی">بحرانی</option>
                    </select>
                </div>
            </div>
            <div class="flex flex-col justify-end">
                <div class="flex gap-1">
                    <button type="submit" class="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-1.5 rounded cursor-pointer transition">اعمال فیلتر</button>
                    <button type="button" id="reset-btn" class="bg-slate-700 hover:bg-slate-600 text-slate-300 px-2 py-1.5 rounded cursor-pointer">حذف</button>
                </div>
            </div>
        </form>
    </div>

    <div class="grid grid-cols-2 md:grid-cols-4 gap-2 flex-none">
        <div class="dark-card p-2.5 rounded-xl flex justify-between items-center border-r-4 border-cyan-500">
            <div><div class="text-[10px] text-slate-400">کل رخدادها در فیلتر</div><div class="text-sm md:text-base font-black text-white" id="stat-total">-</div></div>
            <div class="text-cyan-400 text-lg">📊</div>
        </div>
        <div class="dark-card p-2.5 rounded-xl flex justify-between items-center border-r-4 border-red-500">
            <div><div class="text-[10px] text-slate-400">حوادث بحرانی</div><div class="text-sm md:text-base font-black text-red-400" id="stat-critical">-</div></div>
            <div class="text-red-400 text-lg">🚨</div>
        </div>
        <div class="dark-card p-2.5 rounded-xl flex justify-between items-center border-r-4 border-emerald-500">
            <div><div class="text-[10px] text-slate-400">میانگین زمان رسیدگی</div><div class="text-sm md:text-base font-black text-emerald-400" id="stat-time">۴.۸ ساعت</div></div>
            <div class="text-emerald-400 text-lg">⏱</div>
        </div>
        <div class="dark-card p-2.5 rounded-xl flex justify-between items-center border-r-4 border-amber-500">
            <div><div class="text-[10px] text-slate-400">ساعت اوج گزارش‌ها</div><div class="text-sm md:text-base font-black text-amber-400" id="stat-peak-hour">-</div></div>
            <div class="text-amber-400 text-lg">⏰</div>
        </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-2 flex-1 min-h-0 items-stretch">
        <div class="lg:col-span-3 flex flex-col gap-2 min-h-0">
            <div class="dark-card rounded-xl p-2.5 flex-1 flex flex-col shadow">
                <h2 class="text-xs font-bold text-amber-400 mb-1 border-b border-slate-800 pb-1 flex-none">توزیع حوزه‌های شهری</h2>
                <div class="relative w-full flex-1 flex flex-col items-center justify-center p-1">
                    <div style="width: 120px; height: 120px; position: relative;" class="mb-1">
                        <canvas id="categoryDoughnutChart"></canvas>
                    </div>
                    <div id="cat-legend" class="flex flex-wrap justify-center gap-1.5 text-[9px] text-slate-300"></div>
                </div>
            </div>
            <div class="dark-card rounded-xl p-2.5 flex-1 flex flex-col shadow">
                <h2 class="text-xs font-bold text-amber-400 mb-1 border-b border-slate-800 pb-1 flex-none">وضعیت رسیدگی در سامانه</h2>
                <div class="relative w-full flex-1 flex flex-col items-center justify-center p-1">
                    <div style="width: 120px; height: 120px; position: relative;" class="mb-1">
                        <canvas id="statusPieChart"></canvas>
                    </div>
                    <div id="stat-legend" class="flex flex-wrap justify-center gap-2 text-[9px] text-slate-300"></div>
                </div>
            </div>
        </div>

        <div class="lg:col-span-6 flex flex-col min-h-0">
            <div class="dark-card rounded-xl p-2.5 shadow relative flex flex-col border border-cyan-500/40 h-full">
                <div class="flex justify-between items-center mb-1 px-1 flex-none">
                    <h2 class="text-xs font-bold text-cyan-400">🗺 تراکم جغرافیایی حوادث شهری تهران</h2>
                    <span class="text-[10px] text-slate-400">طیف هیت‌مپ: زرد (متوسط)، نارنجی (بالا)، قرمز (بحرانی)</span>
                </div>
                <div id="map" class="w-full flex-1 rounded-lg overflow-hidden border border-cyan-900/50 bg-slate-950 min-h-[220px]"></div>
            </div>
        </div>

        <div class="lg:col-span-3 flex flex-col min-h-0">
            <div class="dark-card rounded-xl p-2.5 shadow flex flex-col h-full">
                <div class="flex justify-between items-center mb-1 border-b border-slate-800 pb-1 flex-none">
                    <h2 class="text-xs font-bold text-red-400">آخرین رخدادهای ثبت‌شده</h2>
                </div>
                <div class="space-y-1.5 text-[11px] overflow-y-auto flex-1 pr-1" id="recent-events"></div>
            </div>
        </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-2 flex-none">
        <div class="dark-card p-2 rounded-lg border-t-2 border-cyan-400 text-[11px]">
            <span class="text-cyan-400 font-bold">📍 تمرکز مکانی:</span> بیشترین: <span id="val-top-dist" class="text-white">...</span> | کمترین: <span id="val-low-dist" class="text-white">...</span>
        </div>
        <div class="dark-card p-2 rounded-lg border-t-2 border-amber-400 text-[11px]">
            <span class="text-amber-400 font-bold">🏷 حوزه رخداد:</span> بیشترین: <span id="val-top-cat" class="text-white">...</span> | کمترین: <span id="val-low-cat" class="text-white">...</span>
        </div>
    </div>

    <script>
        const darkLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 });
        const map = L.map('map', { center: [35.6892, 51.3890], zoom: 11, layers: [darkLayer], zoomControl: false });
        let markersLayer = L.layerGroup().addTo(map);
        let heatLayer = L.heatLayer([], { radius: 28, blur: 18, maxZoom: 17, minOpacity: 0.35, gradient: { 0.4: 'yellow', 0.7: 'orange', 1.0: 'red' } }).addTo(map);

        L.control.layers({"نمای تیره": darkLayer}, {"پین‌ها": markersLayer, "نقشه حرارتی": heatLayer}, {position: 'topright'}).addTo(map);
        L.control.zoom({position: 'bottomleft'}).addTo(map);
        document.getElementById('map').classList.add('dark-mode-map');

        let catChartInstance = null;
        let statusChartInstance = null;

        fetch('api/meta')
            .then(res => res.json())
            .then(meta => {
                populateSelect('start_year', meta.years);
                populateSelect('end_year', meta.years);
                populateSelect('start_month', meta.months);
                populateSelect('end_month', meta.months);
                populateSelect('start_day', meta.days);
                populateSelect('end_day', meta.days);
            }).catch(err => console.error("Error loading meta:", err));

        function populateSelect(elementId, values) {
            const select = document.getElementById(elementId);
            values.forEach(v => {
                let opt = document.createElement('option');
                opt.value = v;
                opt.innerText = v;
                select.appendChild(opt);
            });
        }

        function loadDashboard(queryString = '') {
            fetch('api/data?' + queryString)
                .then(res => res.json())
                .then(data => {
                    document.getElementById('report-range-banner').innerText = "بازه گزارش: " + data.report_range;
                    document.getElementById('stat-total').innerText = (data.total_events || 0).toLocaleString('fa-IR');
                    document.getElementById('stat-critical').innerText = (data.severity_counts['بحرانی'] || 0).toLocaleString('fa-IR');
                    document.getElementById('stat-peak-hour').innerText = data.peak_hour !== null ? (data.peak_hour + ':۰۰') : 'نامشخص';

                    document.getElementById('val-top-dist').innerText = data.top_district ? (data.top_district.district + ' (' + data.top_district.count.toLocaleString('fa-IR') + ')') : 'ندارد';
                    document.getElementById('val-low-dist').innerText = data.low_district ? (data.low_district.district + ' (' + data.low_district.count.toLocaleString('fa-IR') + ')') : 'ندارد';
                    document.getElementById('val-top-cat').innerText = data.top_category ? (data.top_category.category + ' (' + data.top_category.count.toLocaleString('fa-IR') + ')') : 'ندارد';
                    document.getElementById('val-low-cat').innerText = data.low_category ? (data.low_category.category + ' (' + data.low_category.count.toLocaleString('fa-IR') + ')') : 'ندارد';

                    const eventContainer = document.getElementById('recent-events');
                    eventContainer.innerHTML = '';
                    if(!data.incidents || data.incidents.length === 0) {
                        eventContainer.innerHTML = '<div class="text-slate-500 text-center py-4">موردی یافت نشد.</div>';
                    } else {
                        data.incidents.forEach(inc => {
                            let colorClass = inc.status === 'حل شده' ? 'border-emerald-500 text-emerald-400' : (inc.status === 'در حال رسیدگی' ? 'border-amber-500 text-amber-400' : 'border-red-500 text-red-400');
                            let sevColor = inc.severity === 'بحرانی' ? 'text-red-400' : (inc.severity === 'بالا' ? 'text-orange-400' : 'text-slate-300');
                            eventContainer.innerHTML += `
                                <div class="bg-slate-900/90 p-2 rounded border-r-2 ${colorClass} flex justify-between items-center">
                                    <div>
                                        <div class="font-bold">${inc.title}</div>
                                        <div class="text-[9px] text-slate-400">${inc.district} | ${inc.status} | ${inc.created_at}</div>
                                    </div>
                                    <div class="text-left flex flex-col items-end gap-1">
                                        <span class="font-bold text-[9px] bg-slate-800 px-1.5 py-0.5 rounded text-amber-300">${inc.category}</span>
                                        <span class="text-[8px] font-bold ${sevColor}">شدت: ${inc.severity}</span>
                                    </div>
                                </div>
                            `;
                        });
                    }

                    markersLayer.clearLayers();
                    heatLayer.setLatLngs([]);

                    // ============================================================
                    // STRESS TEST: 10,000,000 raw Leaflet CircleMarkers
                    // Markers are generated client-side in batches so the server
                    // is not forced to send a multi-gigabyte JSON response.
                    // ============================================================
                    const TOTAL_STRESS_MARKERS = 10000000;
                    const BATCH_SIZE = 2000;

                    // Remove a previous progress widget if loadDashboard runs again.
                    const oldProgress = document.getElementById('marker-stress-progress');
                    if (oldProgress) oldProgress.remove();

                    const progressBox = document.createElement('div');
                    progressBox.id = 'marker-stress-progress';
                    progressBox.style.position = 'absolute';
                    progressBox.style.zIndex = '9999';
                    progressBox.style.left = '12px';
                    progressBox.style.top = '48px';
                    progressBox.style.direction = 'rtl';
                    progressBox.style.background = 'rgba(2,6,23,.92)';
                    progressBox.style.border = '1px solid rgba(34,211,238,.45)';
                    progressBox.style.borderRadius = '8px';
                    progressBox.style.padding = '6px 10px';
                    progressBox.style.fontSize = '11px';
                    progressBox.style.color = '#67e8f9';
                    progressBox.innerText = 'مارکرهای بارگذاری‌شده: ۰ / ۱۰٬۰۰۰٬۰۰۰';
                    document.getElementById('map').appendChild(progressBox);

                    let stressIndex = 0;
                    let seed = 14050618 >>> 0;

                    function nextRand() {
                        // Deterministic LCG; keeps the stress test repeatable.
                        seed = (1664525 * seed + 1013904223) >>> 0;
                        return seed / 4294967296;
                    }

                    const stressCategories = ['عمرانی', 'ترافیکی', 'پسماند', 'برق و روشنایی', 'آبفا', 'ایمنی و بحران'];

                    function weightedStatus(r) {
                        if (r < 0.40) return 'ثبت شده';
                        if (r < 0.60) return 'در حال رسیدگی';
                        if (r < 0.95) return 'حل شده';
                        return 'رد شده';
                    }

                    function weightedSeverity(r) {
                        if (r < 0.40) return 'کم';
                        if (r < 0.75) return 'متوسط';
                        if (r < 0.90) return 'بالا';
                        return 'بحرانی';
                    }

                    function addStressBatch() {
                        const end = Math.min(stressIndex + BATCH_SIZE, TOTAL_STRESS_MARKERS);

                        for (; stressIndex < end; stressIndex++) {
                            const category = stressCategories[Math.floor(nextRand() * stressCategories.length)];
                            const status = weightedStatus(nextRand());
                            const severity = weightedSeverity(nextRand());
                            const lat = 35.60 + nextRand() * 0.20;
                            const lon = 51.20 + nextRand() * 0.35;
                            const district = 1 + Math.floor(nextRand() * 22);

                            const colorHex =
                                status === 'حل شده'
                                    ? '#10b981'
                                    : (status === 'در حال رسیدگی' ? '#f59e0b' : '#ef4444');

                            const marker = L.circleMarker([lat, lon], {
                                color: colorHex,
                                fillColor: colorHex,
                                fillOpacity: 0.8,
                                radius: 3
                            });

                            marker.bindPopup(
                                `<b>رخداد شهری ${stressIndex + 1}</b><br>` +
                                `حوزه: ${category}<br>` +
                                `شدت: ${severity}<br>` +
                                `آدرس: منطقه ${district}<br>` +
                                `وضعیت: ${status}`
                            );

                            markersLayer.addLayer(marker);
                        }

                        progressBox.innerText =
                            'مارکرهای بارگذاری‌شده: ' +
                            stressIndex.toLocaleString('fa-IR') +
                            ' / ' +
                            TOTAL_STRESS_MARKERS.toLocaleString('fa-IR');

                        if (stressIndex < TOTAL_STRESS_MARKERS) {
                            // Yield back to the browser between batches.
                            setTimeout(addStressBatch, 0);
                        } else {
                            progressBox.innerText =
                                '۱۰٬۰۰۰٬۰۰۰ مارکر بارگذاری شد';
                        }
                    }

                    setTimeout(addStressBatch, 250);

                    if (catChartInstance) catChartInstance.destroy();
                    const catColors = ['#06b6d4', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
                    const ctxCat = document.getElementById('categoryDoughnutChart').getContext('2d');
                    catChartInstance = new Chart(ctxCat, {
                        type: 'doughnut',
                        data: {
                            labels: Object.keys(data.category_counts),
                            datasets: [{ data: Object.values(data.category_counts), backgroundColor: catColors }]
                        },
                        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
                    });

                    const catLegend = document.getElementById('cat-legend');
                    catLegend.innerHTML = '';
                    Object.keys(data.category_counts).forEach((label, idx) => {
                        catLegend.innerHTML += `<span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full inline-block" style="background:${catColors[idx % catColors.length]}"></span>${label}</span>`;
                    });

                    if (statusChartInstance) statusChartInstance.destroy();
                    const statColors = ['#10b981', '#f59e0b', '#ef4444', '#64748b'];
                    const ctxStatus = document.getElementById('statusPieChart').getContext('2d');
                    statusChartInstance = new Chart(ctxStatus, {
                        type: 'pie',
                        data: {
                            labels: Object.keys(data.status_counts),
                            datasets: [{ data: Object.values(data.status_counts), backgroundColor: statColors }]
                        },
                        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
                    });

                    const statLegend = document.getElementById('stat-legend');
                    statLegend.innerHTML = '';
                    Object.keys(data.status_counts).forEach((label, idx) => {
                        statLegend.innerHTML += `<span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full inline-block" style="background:${statColors[idx % statColors.length]}"></span>${label}</span>`;
                    });
                }).catch(err => console.error("Error loading data:", err));
        }

        loadDashboard();

        document.getElementById('filter-form').addEventListener('submit', function(e) {
            e.preventDefault();
            const formData = new FormData(this);
            loadDashboard(new URLSearchParams(formData).toString());
        });

        document.getElementById('reset-btn').addEventListener('click', function() {
            document.getElementById('filter-form').reset();
            loadDashboard();
        });
    </script>
</body>
</html>
"""


@app.route("/")
def index():
    return render_template_string(TEMPLATE)


@app.route("/api/meta")
def get_meta():
    return jsonify({
        "years": ["1404", "1405"],
        "months": [f"{m:02d}" for m in range(1, 13)],
        "days": [f"{d:02d}" for d in range(1, 32)],
    })


@app.route("/api/data")
def get_data():
    districts = request.args.getlist("districts")
    categories = request.args.getlist("categories")
    statuses = request.args.getlist("statuses")
    severities = request.args.getlist("severities")

    district_ratio = ratio_from_selection(DISTRICT_COUNTS, districts)
    category_ratio = ratio_from_selection(CATEGORY_COUNTS, categories)
    status_ratio = ratio_from_selection(STATUS_COUNTS, statuses)
    severity_ratio = ratio_from_selection(SEVERITY_COUNTS, severities)
    date_ratio = get_date_ratio(request.args)
    hour_ratio = get_hour_ratio(request.args)

    total_ratio = district_ratio * category_ratio * status_ratio * severity_ratio * date_ratio * hour_ratio
    total_events = int(TOTAL_EVENTS * total_ratio)

    if total_events <= 0:
        return jsonify({
            "report_range": "بدون داده در بازه انتخابی",
            "total_events": 0,
            "top_district": None,
            "low_district": None,
            "top_category": None,
            "low_category": None,
            "peak_hour": None,
            "severity_counts": {},
            "category_counts": {},
            "status_counts": {},
            "incidents": [],
            "map_points": [],
        })

    # برای هر نمودار، نسبت فیلترهای دیگر اعمال می‌شود تا اعداد با فیلتر هماهنگ بمانند.
    category_other_ratio = district_ratio * status_ratio * severity_ratio * date_ratio * hour_ratio
    status_other_ratio = district_ratio * category_ratio * severity_ratio * date_ratio * hour_ratio
    severity_other_ratio = district_ratio * category_ratio * status_ratio * date_ratio * hour_ratio
    district_other_ratio = category_ratio * status_ratio * severity_ratio * date_ratio * hour_ratio

    category_counts = scale_counts(CATEGORY_COUNTS, categories, category_other_ratio)
    status_counts = scale_counts(STATUS_COUNTS, statuses, status_other_ratio)
    severity_counts = scale_counts(SEVERITY_COUNTS, severities, severity_other_ratio)
    district_counts = scale_counts(DISTRICT_COUNTS, districts, district_other_ratio)

    top_district = None
    low_district = None
    if district_counts:
        top_d = max(district_counts.items(), key=lambda x: x[1])
        low_d = min(district_counts.items(), key=lambda x: x[1])
        top_district = {"district": top_d[0], "count": top_d[1]}
        low_district = {"district": low_d[0], "count": low_d[1]}

    top_category = None
    low_category = None
    if category_counts:
        top_c = max(category_counts.items(), key=lambda x: x[1])
        low_c = min(category_counts.items(), key=lambda x: x[1])
        top_category = {"category": top_c[0], "count": top_c[1]}
        low_category = {"category": low_c[0], "count": low_c[1]}

    # رخدادهای اخیر ثابت ولی متناسب با فیلترهای انتخابی
    incidents = [
        inc for inc in RECENT_INCIDENTS
        if (not districts or inc["district"] in districts)
        and (not categories or inc["category"] in categories)
        and (not statuses or inc["status"] in statuses)
        and (not severities or inc["severity"] in severities)
    ][:15]

    # نقاط نقشه ثابت ولی قابل فیلتر
    map_points = [
        pt for pt in MAP_POINTS
        if (not districts or pt["district"] in districts)
        and (not categories or pt["category"] in categories)
        and (not statuses or pt["status"] in statuses)
        and (not severities or pt["severity"] in severities)
    ]

    # ساعت اوج در بازه انتخابی
    start_hour = request.args.get("start_hour")
    end_hour = request.args.get("end_hour")
    h1 = int(start_hour) if start_hour not in (None, "") else 0
    h2 = int(end_hour) if end_hour not in (None, "") else 23
    valid_hours = {h: v for h, v in HOURLY_COUNTS.items() if h1 <= h <= h2}
    peak_hour = max(valid_hours.items(), key=lambda x: x[1])[0] if valid_hours else None

    start_year = request.args.get("start_year")
    start_month = request.args.get("start_month")
    start_day = request.args.get("start_day")
    end_year = request.args.get("end_year")
    end_month = request.args.get("end_month")
    end_day = request.args.get("end_day")

    if all([start_year, start_month, start_day, end_year, end_month, end_day]):
        report_range = f"{start_year}/{start_month}/{start_day} تا {end_year}/{end_month}/{end_day}"
    else:
        report_range = "۱۴۰۴ تا ۱۴۰۵"

    return jsonify({
        "report_range": report_range,
        "total_events": total_events,
        "top_district": top_district,
        "low_district": low_district,
        "top_category": top_category,
        "low_category": low_category,
        "peak_hour": peak_hour,
        "severity_counts": severity_counts,
        "category_counts": category_counts,
        "status_counts": status_counts,
        "incidents": incidents,
        "map_points": map_points,
    })


if __name__ == "__main__":
    print("🚀 GeoVision Static Vision Dashboard")
    print("👉 http://127.0.0.1:5000")
    app.run(host="0.0.0.0", port=5000, debug=False)
