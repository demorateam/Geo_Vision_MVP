# ساخت APK آزمایشی Android

پروژه از نظر PWA آماده است، اما APK نهایی فقط پس از مشخص شدن دامنه HTTPS و کلید امضای Android ساخته می‌شود. روش پیشنهادی Trusted Web Activity با Bubblewrap است؛ در این روش همان برنامه آنلاین داخل یک اپ تمام‌صفحه و قابل نصب ارائه می‌شود.

## پیش‌نیازهای مرحله نهایی

1. استقرار موفق پروژه روی یک دامنه HTTPS
2. دسترسی به Android Studio/JDK روی سیستم سازنده APK
3. انتخاب package id ثابت، پیشنهاد: `ir.uemp.mobile`
4. ساخت keystore و نگه‌داری امن آن برای همه نسخه‌های بعدی

## مراحل ساخت

```bash
npm install -g @bubblewrap/cli
bubblewrap init --manifest=https://app.example.com/app.webmanifest
bubblewrap build
```

در wizard نام برنامه، package id و رنگ‌ها را وارد کنید. فایل تولیدشده را ابتدا روی یک گوشی تست کنید.

## حذف نوار مرورگر با Digital Asset Links

بعد از ساخت keystore، SHA-256 certificate fingerprint را بگیرید و مقادیر placeholder داخل `public/.well-known/assetlinks.json.example` را جایگزین کنید. سپس نام فایل را به `assetlinks.json` تغییر دهید و دوباره deploy کنید. آدرس زیر باید بدون redirect و با HTTPS در دسترس باشد:

```text
https://app.example.com/.well-known/assetlinks.json
```

اگر domain، package id یا keystore تغییر کند، این فایل نیز باید هماهنگ شود.

## چک‌لیست تحویل APK

- ورود و خروج، ثبت تصویر با دوربین و gallery
- اجازه GPS و انتخاب دستی موقعیت
- ثبت رخداد و نمایش در داشبورد
- کارکرد صحیح back button اندروید
- ظاهر RTL در چند اندازه نمایشگر
- بررسی صفحه آفلاین و بازگشت پس از اتصال
- نگه‌داری امن keystore و رمز آن خارج از پروژه

تا زمانی که دامنه نهایی تحویل نشده، PWA را می‌توان در شبکه محلی بررسی کرد؛ اما GPS امن، نصب واقعی و TWA نهایی باید روی HTTPS تست شوند.
