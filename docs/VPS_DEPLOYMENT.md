# استقرار MVP روی Ubuntu VPS

این راهنما برای یک VPS با Ubuntu 24.04، دو هسته، دو گیگابایت RAM و یک IPv4 نوشته شده است. برای تست محدود کارفرما کافی است. برنامه را فقط با یک پردازش PM2 اجرا کنید تا SQLite و OTP آزمایشی رفتار قابل پیش‌بینی داشته باشند.

## ۱. آماده‌سازی دامنه و سرور

یک رکورد A برای دامنه یا زیردامنه به IPv4 سرور متصل کنید. پورت‌های 22، 80 و 443 را در firewall باز کنید. HTTPS برای GPS، نصب PWA و ساخت APK الزامی است.

## ۲. نصب ابزارها

Node.js 20.9 یا جدیدتر، Nginx، SQLite و PM2 را نصب کنید. سپس پروژه را در مسیری مانند `/var/www/uemp` قرار دهید.

```bash
cd /var/www/uemp
npm ci
cp .env.example .env
```

داخل `.env` حداقل `JWT_SECRET`، دامنه، کلید نقشه و در صورت نیاز کلید تحلیل هوش مصنوعی را تنظیم کنید. برای ساخت secret می‌توانید از این دستور استفاده کنید:

```bash
openssl rand -base64 48
```

## ۳. دیتابیس و build

```bash
npm run db:deploy
npm run build
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

خروجی دستور آخر PM2 را نیز اجرا کنید تا برنامه بعد از restart سرور بالا بیاید.

## ۴. Nginx و HTTPS

فایل `deploy/nginx-uemp.conf.example` را در `/etc/nginx/sites-available/uemp` کپی، دامنه و مسیر را جایگزین و سپس فعال کنید.

```bash
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d app.example.com
```

بعد از استقرار، `https://app.example.com/api/health` باید وضعیت `ok` برگرداند.

## ۵. ماندگاری SQLite و تصاویر

این دو مسیر حتماً باید روی دیسک دائمی باقی بمانند:

- `prisma/dev.db`
- `public/uploads/`

قبل از هر بروزرسانی نسخه از هر دو پشتیبان بگیرید. برای backup سازگار SQLite:

```bash
mkdir -p backups
sqlite3 prisma/dev.db ".backup 'backups/uemp.db'"
tar -czf backups/uploads.tar.gz public/uploads
```

برای بروزرسانی پروژه، فایل‌های جدید را جایگزین کنید اما `.env`، دیتابیس، uploads و backups را حذف نکنید؛ سپس:

```bash
npm ci
npm run db:deploy
npm run build
pm2 restart uemp-mobile-mvp --update-env
```

## ۶. نکات عملیاتی MVP

- PM2 را با `instances: 1` نگه دارید.
- برای دیسک، هشدار مصرف و backup روزانه تنظیم کنید.
- حالت `OTP_MODE=demo` فقط برای ارائه آزمایشی است.
- فایل `.env` را در پیام‌رسان، Git یا فایل ZIP عمومی قرار ندهید.
- قبل از نسخه نهایی، سرویس پیامک و PostgreSQL را جایگزین حالت آزمایشی کنید.
