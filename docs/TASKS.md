# وضعیت تسک‌های پروژه

## TASK-001

- **Title:** بررسی ساختار فعلی پروژه و مستندات نسخهٔ نصب‌شدهٔ Next.js
- **Description:** بررسی قالب اولیه، اسکریپت‌ها، وابستگی‌ها، پیکربندی و راهنمای محلی Next.js پیش از هر تغییر معماری یا کدنویسی.
- **Files:** `package.json`، `next.config.ts`، `app/`، `node_modules/next/dist/docs/`
- **Dependencies:** ندارد
- **Acceptance Criteria:** وضعیت اولیه و محدودیت‌های فنی شناسایی شوند؛ بررسی lint موفق باشد؛ تسک بعدی مشخص باشد.
- **Testing:** اجرای `npm run lint`
- **Status:** DONE

### نتیجه

- پروژه یک قالب اولیهٔ Next.js 16.4.6 با React 19.3.0، TypeScript، Tailwind CSS 4 و App Router است.
- هیچ دیتابیس، ORM، احراز هویت، تست، فایل محیط نمونه یا مستندات پروژه‌ای وجود ندارد.
- پیکربندی `cacheComponents` و `partialPrefetching` فعال است؛ کدهای بعدی باید با مدل Cache Components در Next.js 16 سازگار باشند و از Node runtime استفاده کنند.
- `npm run lint` بدون خطا اجرا شد.

## TASK-002

- **Title:** ایجاد اسکلت مستندات پروژه
- **Description:** ایجاد فایل‌های مختصر و اولیهٔ PRD، معماری، مدل داده، طراحی AI، نقشهٔ راه و تغییرات برای نگهداری تصمیم‌ها و وضعیت پروژه.
- **Files:** `docs/PRD.md`، `docs/ARCHITECTURE.md`، `docs/DATABASE.md`، `docs/AI_DESIGN.md`، `docs/ROADMAP.md`، `docs/CHANGELOG.md`
- **Dependencies:** TASK-001
- **Acceptance Criteria:** همهٔ فایل‌های مستندات موردنیاز ایجاد شوند، با MVP و نقشه‌راه مصوب هم‌راستا باشند و TASKS وضعیت به‌روز داشته باشد.
- **Testing:** بازبینی ساختار و پیوندهای داخلی مستندات.
- **Status:** DONE

### نتیجه

- ساختار مستندات پروژه ایجاد و با محدودهٔ MVP مصوب هم‌راستا شد.
- تصمیم‌های اولیهٔ معماری، مدل داده و ایمنی AI ثبت شدند.

## TASK-003

- **Title:** تنظیم استانداردهای محیط و فایل پیکربندی نمونه
- **Description:** تعریف متغیرهای محیطی موردنیاز برای برنامه، دیتابیس، احراز هویت و Ollama در یک فایل نمونه، بدون ثبت رازها در Git.
- **Files:** `.env.example`، `.gitignore`، `README.md`
- **Dependencies:** TASK-002
- **Acceptance Criteria:** تمام متغیرهای موردنیاز مستند شده باشند؛ هیچ مقدار حساس در repository قرار نگیرد؛ راهنمای اجرای اولیه به‌روز باشد.
- **Testing:** بازبینی `.gitignore` و اعتبارسنجی نبودن فایل محیط واقعی در وضعیت Git.
- **Status:** DONE

### نتیجه

- قرارداد متغیرهای محیطی PostgreSQL، احراز هویت و Ollama در `.env.example` ثبت شد.
- فایل نمونه به‌طور صریح از قانون نادیده‌گیری محیط مستثنا شد و فایل‌های محیط واقعی همچنان وارد Git نمی‌شوند.
- راهنمای اجرای محلی و بررسی کیفیت به‌روز شد.

## TASK-004

- **Title:** پیکربندی PostgreSQL توسعه‌ای
- **Description:** افزودن پیکربندی Docker Compose برای PostgreSQL و مستندسازی اجرای پایدار محیط توسعه.
- **Files:** `docker-compose.yml`، `README.md`، `.env.example`
- **Dependencies:** TASK-003
- **Acceptance Criteria:** PostgreSQL با یک دستور مستند اجرا شود؛ داده‌ها در volume پایدار بمانند؛ اتصال نمونه با `DATABASE_URL` سازگار باشد.
- **Testing:** اجرای سرویس، بررسی سلامت کانتینر و آزمایش اتصال به پایگاه داده.
- **Status:** DONE

### نتیجه

- سرویس PostgreSQL 16 با volume پایدار و healthcheck در Docker Compose تعریف شد.
- پیکربندی Compose و تطابق متغیرهای راه‌اندازی با `DATABASE_URL` بررسی شدند.
- PostgreSQL توسط کاربر اجرا و با `pg_isready` در وضعیت پذیرش اتصال تأیید شد.

## TASK-005

- **Title:** نصب و پیکربندی Prisma
- **Description:** افزودن Prisma، تعریف تنظیمات اتصال PostgreSQL و آماده‌سازی پایهٔ migration بدون طراحی مدل‌های دامنه.
- **Files:** `package.json`، `package-lock.json`، `prisma/schema.prisma`، `prisma.config.ts`، `.env.example`
- **Dependencies:** TASK-004
- **Acceptance Criteria:** Prisma به PostgreSQL محلی متصل شود؛ دستورهای generate و migration برای اجرای آینده قابل استفاده باشند؛ هیچ مدل کسب‌وکاری پیش از تأیید طراحی نشود.
- **Testing:** اجرای Prisma generate و اعتبارسنجی schema با اتصال محلی.
- **Status:** DONE

### نتیجه

- Prisma Client، Prisma CLI و dotenv با نسخهٔ پایدار 7.10.1 پیکربندی شدند.
- تنظیمات ESM و TypeScript مطابق نیاز Prisma 7 به‌روز شدند.
- تولید Client، اعتبارسنجی schema و lint موفق هستند.
- Prisma CLI در کانتینر ابزار روی شبکهٔ Docker به PostgreSQL متصل شد. خطای P4001 فقط نشان می‌دهد دیتابیس هنوز جدول ندارد که پیش از طراحی مدل‌ها مورد انتظار است.

## TASK-006

- **Title:** طراحی و پیاده‌سازی مدل‌های پایهٔ سازمان و کاربر
- **Description:** تعریف مدل‌های Organization، User، Membership و نقش‌های اولیه برای جداسازی داده و آماده‌سازی احراز هویت.
- **Files:** `prisma/schema.prisma`، `prisma/migrations/`، `docs/DATABASE.md`، `docs/TASKS.md`
- **Dependencies:** TASK-005
- **Acceptance Criteria:** مدل‌ها دارای شناسه، زمان ایجاد/به‌روزرسانی و ارتباط‌های صحیح باشند؛ نقش‌های Admin، Accountant و Viewer پشتیبانی شوند؛ migration در PostgreSQL اعمال شود.
- **Testing:** اجرای migration و بررسی وضعیت آن از کانتینر Prisma.
- **Status:** DONE

### نتیجه

- مدل‌های `User`، `Organization` و `Membership` با نقش‌های Admin، Accountant و Viewer ایجاد شدند.
- یکتایی عضویت کاربر در سازمان، ارتباط‌ها و حذف آبشاری در schema اعمال شدند.
- migration پایدار `20261121110000_add_organizations_and_users` ایجاد و در PostgreSQL اعمال شد.

## TASK-007

- **Title:** افزودن مدل‌های اصلی Better Auth
- **Description:** افزودن مدل‌های Session، Account و Verification با رابطه‌های لازم به User، پیش از پیکربندی سرویس احراز هویت.
- **Files:** `prisma/schema.prisma`، `prisma/migrations/`، `docs/DATABASE.md`، `docs/TASKS.md`
- **Dependencies:** TASK-006
- **Acceptance Criteria:** مدل‌ها با قرارداد Better Auth سازگار باشند؛ Session و Account به User متصل شوند؛ migration در PostgreSQL اعمال شود.
- **Testing:** اجرای migration، Prisma generate و اعتبارسنجی schema.
- **Status:** DONE

### نتیجه

- مدل‌های `Session`، `Account` و `Verification` مطابق قرارداد اصلی Better Auth اضافه شدند.
- یکتایی ترکیب `providerId` و `accountId` و روابط حذف آبشاری با User اعمال شدند.
- migration پایدار `20261121110246_add_better_auth_core_models` ایجاد و در PostgreSQL اعمال شد.

## TASK-008

- **Title:** نصب وابستگی‌های اجرای Better Auth و Prisma PostgreSQL
- **Description:** افزودن Better Auth، Prisma adapter آن، driver adapter PostgreSQL و driver `pg` با نسخه‌های سازگار؛ بدون ایجاد endpoint یا منطق ورود.
- **Files:** `package.json`، `package-lock.json`، `docs/TASKS.md`
- **Dependencies:** TASK-007
- **Acceptance Criteria:** وابستگی‌ها بدون آسیب به dependencyهای موجود نصب شوند و نسخه‌های Prisma با adapter سازگار باشند.
- **Testing:** بررسی درخت وابستگی npm و اجرای TypeScript/lint.
- **Status:** DONE

### نتیجه

- `better-auth` و Prisma adapter رسمی آن نصب شدند.
- `@prisma/adapter-pg` با Prisma 7.10.1 و driver `pg` نصب شدند.
- بررسی npm audit برای وابستگی‌های تولید هیچ آسیب‌پذیری گزارش نکرد.

## TASK-009

- **Title:** ایجاد Prisma Client مشترک
- **Description:** ایجاد یک نمونهٔ Prisma Client با PostgreSQL driver adapter و چرخهٔ حیات مناسب محیط توسعهٔ Next.js.
- **Files:** `lib/prisma.ts`، `docs/ARCHITECTURE.md`، `docs/TASKS.md`
- **Dependencies:** TASK-008
- **Acceptance Criteria:** یک نمونهٔ قابل استفاده سمت سرور وجود داشته باشد؛ اتصال از `DATABASE_URL` خوانده شود؛ نمونه‌های تکراری در hot reload ایجاد نشوند.
- **Testing:** TypeScript type check و import سمت سرور.
- **Status:** DONE

### نتیجه

- Prisma Client مشترک با PostgreSQL driver adapter در `lib/prisma.ts` ایجاد شد.
- اتصال فقط از `DATABASE_URL` خوانده می‌شود و نمونه در محیط توسعه روی `globalThis` نگهداری می‌شود.
- محافظ `server-only` از واردشدن ماژول به Client Component جلوگیری می‌کند.

## TASK-010

- **Title:** پیکربندی سرویس Better Auth
- **Description:** ایجاد نمونهٔ Better Auth با Prisma adapter، احراز هویت ایمیل/رمز عبور و تنظیمات سازگار با مدل‌های فعلی؛ بدون ایجاد صفحه یا Route Handler.
- **Files:** `lib/auth.ts`، `docs/ARCHITECTURE.md`، `docs/TASKS.md`
- **Dependencies:** TASK-009
- **Acceptance Criteria:** پیکربندی از Prisma Client مشترک استفاده کند؛ مدل‌های اصلی Better Auth شناسایی شوند؛ پیکربندی TypeScript معتبر باشد.
- **Testing:** TypeScript type check و بررسی import سمت سرور.
- **Status:** DONE

### نتیجه

- سرویس Better Auth با Prisma adapter و PostgreSQL پیکربندی شد.
- ورود ایمیل/رمز عبور فعال و تولید شناسه به Prisma واگذار شد تا با شناسه‌های schema سازگار باشد.
- پیکربندی و Prisma Client هر دو فقط سمت سرور قابل import هستند.

## TASK-011

- **Title:** ایجاد Route Handler احراز هویت
- **Description:** اتصال handlerهای Better Auth به مسیر App Router برای دریافت درخواست‌های ثبت‌نام، ورود، خروج و session.
- **Files:** `app/api/auth/[...all]/route.ts`، `docs/TASKS.md`
- **Dependencies:** TASK-010
- **Acceptance Criteria:** Route Handler همهٔ متدهای موردنیاز Better Auth را به auth handler متصل کند و در مسیر مناسب App Router قرار داشته باشد.
- **Testing:** TypeScript type check و درخواست سلامت/پاسخ handler محلی.
- **Status:** DONE

### نتیجه

- Route Handler catch-all در `app/api/auth/[...all]/route.ts` ایجاد شد.
- درخواست GET و POST به handler رسمی Better Auth متصل شدند.
- مسیر `get-session` در حالت بدون ورود پاسخ 200 و `null` برگرداند.

## TASK-012

- **Title:** ایجاد Better Auth Client
- **Description:** ایجاد client-side SDK برای فراخوانی ثبت‌نام، ورود، خروج و مشاهدهٔ session از رابط کاربر.
- **Files:** `lib/auth-client.ts`، `docs/TASKS.md`
- **Dependencies:** TASK-011
- **Acceptance Criteria:** client فقط در ماژول‌های Client Component قابل استفاده باشد و به مسیر پیش‌فرض `/api/auth` متصل شود.
- **Testing:** TypeScript type check و بررسی import در یک Client Component آزمایشی بدون تغییر رابط اصلی.
- **Status:** TODO
