# وضعیت تسک‌های پروژه

این سند تاریخچهٔ تسک‌های انجام‌شده و فهرست کارهای آینده را نگه می‌دارد. توضیح و نتیجهٔ هر تسک انجام‌شده وضعیت زمان پایان همان تسک است و ممکن است با تسک‌های بعدی تغییر کرده باشد؛ برای وضعیت فعلی به [نقشه راه](./ROADMAP.md) و [معماری](./ARCHITECTURE.md) مراجعه کنید. تمام ردیف‌های جدول کارهای آینده هنوز انجام نشده‌اند.

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
- **Status:** DONE

### نتیجه

- SDK سمت‌کلاینت Better Auth در `lib/auth-client.ts` ایجاد شد.
- با directive `"use client"` فقط برای Client Componentها بسته‌بندی می‌شود.
- بدون پیکربندی مسیر اختصاصی، از مسیر پیش‌فرض `/api/auth` در مبدأ فعلی استفاده می‌کند.

## TASK-013

- **Title:** ایجاد صفحه و فرم ثبت‌نام
- **Description:** ایجاد یک صفحهٔ عمومی فارسی و راست‌به‌چپ برای ثبت‌نام با ایمیل و رمز عبور، با استفاده از Better Auth Client.
- **Files:** `app/(auth)/sign-up/page.tsx`، `docs/TASKS.md`
- **Dependencies:** TASK-012
- **Acceptance Criteria:** کاربر بتواند نام، ایمیل و رمز عبور را وارد کند؛ درخواست از طریق `authClient.signUp.email` ارسال شود؛ خطا و وضعیت ارسال برای کاربر نمایش داده شود.
- **Testing:** TypeScript type check، lint و بررسی دستی صفحه در توسعه.
- **Status:** DONE

### نتیجه

- صفحهٔ عمومی و راست‌به‌چپ ثبت‌نام در مسیر `/sign-up` ایجاد شد.
- فرم با `authClient.signUp.email` به Better Auth متصل است و نام، ایمیل و رمز عبور را ارسال می‌کند.
- اعتبارسنجی پایه، حالت در حال ارسال و پیام قابل‌دسترس موفقیت یا خطا افزوده شد.
- پیام خطای دقیق Better Auth از payload پاسخ استخراج و نمایش داده می‌شود.

## TASK-014

- **Title:** ایجاد صفحه و فرم ورود
- **Description:** ایجاد صفحهٔ عمومی فارسی برای ورود با ایمیل و رمز عبور و اتصال آن به Better Auth Client.
- **Files:** `app/(auth)/sign-in/page.tsx`، `docs/TASKS.md`
- **Dependencies:** TASK-013
- **Acceptance Criteria:** کاربر بتواند با ایمیل و رمز عبور وارد شود؛ درخواست از طریق `authClient.signIn.email` ارسال شود؛ خطا و وضعیت ارسال به کاربر نشان داده شود.
- **Testing:** TypeScript type check، lint و بررسی دستی صفحه در توسعه.
- **Status:** DONE

### نتیجه

- صفحهٔ عمومی و راست‌به‌چپ ورود در مسیر `/sign-in` ایجاد شد.
- فرم با `authClient.signIn.email` به Better Auth متصل است و ایمیل و رمز عبور را ارسال می‌کند.
- حالت ارسال، پیام خطا یا موفقیت و مسیرهای رفت‌وبرگشت ورود/ثبت‌نام افزوده شدند.

## TASK-017

- **Title:** محافظت از مسیر برنامه پس از ورود
- **Description:** ایجاد مسیر اولیهٔ برنامه و کنترل session تا فقط کاربر واردشده به آن دسترسی داشته باشد.
- **Files:** `app/(app)/dashboard/page.tsx`، `app/(auth)/sign-in/page.tsx`، `docs/TASKS.md`
- **Dependencies:** TASK-014
- **Acceptance Criteria:** کاربر ناشناس به صفحهٔ ورود هدایت شود و کاربر واردشده صفحهٔ اولیهٔ برنامه را ببیند.
- **Testing:** بررسی دستی دو وضعیت session و TypeScript type check.
- **Status:** DONE

### نتیجه

- مسیر محافظت‌شدهٔ `/dashboard` ایجاد شد و session را در سرور با Better Auth بررسی می‌کند.
- کاربر ناشناس به `/sign-in` هدایت می‌شود و کاربر واردشده پیام خوش‌آمد و نام خود را می‌بیند.
- پس از ورود موفق، فرم ورود کاربر را به `/dashboard` منتقل می‌کند.

## TASK-018

- **Title:** افزودن خروج امن از حساب
- **Description:** افزودن کنترل خروج در داشبورد با Better Auth Client و بازگرداندن کاربر به صفحهٔ ورود.
- **Files:** `app/(app)/dashboard/page.tsx`، `app/(app)/dashboard/sign-out-button.tsx`، `docs/TASKS.md`
- **Dependencies:** TASK-017
- **Acceptance Criteria:** کاربر واردشده بتواند session را پایان دهد و پس از خروج به `/sign-in` منتقل شود.
- **Testing:** TypeScript type check، lint و بررسی دستی session پس از خروج.
- **Status:** DONE

### نتیجه

- دکمهٔ خروج سمت‌کلاینت به داشبورد افزوده شد.
- خروج از طریق `authClient.signOut` انجام می‌شود و کاربر سپس به `/sign-in` منتقل می‌شود.

## TASK-019

- **Title:** ایجاد سازمان اولیه پس از ثبت‌نام
- **Description:** تعریف جریان ایجاد نخستین سازمان کاربر و عضویت او با نقش مدیر، پس از تکمیل ثبت‌نام.
- **Files:** `app/(app)/onboarding/page.tsx`، `app/(app)/onboarding/organization-form.tsx`، `app/(app)/onboarding/actions.ts`، `app/(app)/dashboard/page.tsx`، `package.json`، `docs/TASKS.md`
- **Dependencies:** TASK-018
- **Acceptance Criteria:** هر کاربر بتواند سازمان نخست خود را با نام و شناسهٔ یکتا ایجاد کند و به‌عنوان Admin عضو آن شود.
- **Testing:** migration در PostgreSQL، TypeScript type check و بررسی دستی جریان.
- **Status:** DONE

### نتیجه

- onboarding محافظت‌شده در مسیر `/onboarding` ایجاد شد.
- نام و شناسهٔ سازمان با Zod در سرور اعتبارسنجی می‌شوند.
- سازمان و عضویت Admin در یک تراکنش Prisma ساخته می‌شوند و شناسهٔ تکراری توسط constraint پایگاه‌داده محافظت می‌شود.
- کاربرِ بدون سازمان از داشبورد به onboarding هدایت می‌شود و پس از ایجاد سازمان به داشبورد بازمی‌گردد.

## TASK-020

- **Title:** نمایش سازمان فعال در داشبورد
- **Description:** واکشی سازمان نخست کاربر واردشده و نمایش نام آن در داشبورد برای تأیید فضای کاری فعال.
- **Files:** `app/(app)/dashboard/page.tsx`، `docs/TASKS.md`
- **Dependencies:** TASK-019
- **Acceptance Criteria:** داشبورد نام سازمانی که کاربر عضو آن است را نمایش دهد و عضویت را از سرور بخواند.
- **Testing:** TypeScript type check، lint و بررسی دستی کاربر عضو سازمان.
- **Status:** DONE

### نتیجه

- داشبورد عضویت کاربر را از سمت سرور همراه با سازمان مرتبط واکشی می‌کند.
- نام، شناسه، تاریخ ایجاد سازمان و نقش کاربر به فارسی در کارت «فضای کاری فعال» نمایش داده می‌شوند.
- انتخاب سازمان فعلی قطعی است و بر اساس نخستین عضویت ایجادشده انجام می‌شود.

## TASK-021

- **Title:** مدل و قیود بک‌اند سال مالی
- **Description:** ایجاد مدل سازمان‌محور سال مالی با وضعیت باز/بسته و قیود داده‌ای لازم، بدون رابط کاربری.
- **Files:** `prisma/schema.prisma`، `prisma/migrations/`، `docs/DATABASE.md`، `docs/TASKS.md`
- **Dependencies:** TASK-020
- **Acceptance Criteria:** سال مالی به سازمان متصل باشد؛ تاریخ پایان پس از شروع باشد؛ هر سازمان حداکثر یک سال مالی باز داشته باشد؛ migration با موفقیت اعمال شود.
- **Testing:** Prisma generate، migration status و اعتبارسنجی schema.
- **Status:** DONE

### نتیجه

- مدل `FiscalYear` با اتصال اجباری به سازمان، تاریخ شروع/پایان و وضعیت `OPEN` یا `CLOSED` اضافه شد.
- migration `20261121133623_add_fiscal_years` اعمال شد و قید بازهٔ تاریخ و index جزئیِ «فقط یک سال مالی باز برای هر سازمان» را در PostgreSQL ایجاد کرد.
- Prisma Client دوباره تولید شد و schema و migration با پایگاه‌دادهٔ محلی همگام هستند.

## TASK-022

- **Title:** پوستهٔ داشبورد و جابه‌جایی بین صفحات موجود
- **Description:** ایجاد هدر و سایدبار راست واکنش‌گرا و صفحهٔ اطلاعات سازمان.
- **Files:** `app/(app)/dashboard/layout.tsx`، `app/(app)/dashboard/page.tsx`، `app/(app)/dashboard/organization/page.tsx`
- **Dependencies:** TASK-020
- **Acceptance Criteria:** دسترسی به نمای کلی و اطلاعات سازمان از منو؛ حفظ کنترل دسترسی و سازگاری با موبایل.
- **Testing:** lint و production build.
- **Status:** DONE

## TASK-023

- **Title:** API خواندن و ایجاد سال مالی
- **Description:** خواندن سال‌های سازمان فعال و ایجاد سال مالی توسط مدیر با اعتبارسنجی سمت سرور.
- **Files:** `app/api/fiscal-years/route.ts`
- **Dependencies:** TASK-021
- **Acceptance Criteria:** کنترل session و نقش، محدودسازی به سازمان فعال، اعتبارسنجی تاریخ و مدیریت تعارض.
- **Testing:** lint، build، آزمون تراکنشی قیود دیتابیس و آزمون API با نشست واقعی مدیر و مشاهده‌گر، ورودی نامعتبر و درخواست بدون نشست یا با مبدأ نامعتبر موفق بودند.
- **Status:** DONE

## TASK-024

- **Title:** رابط سال مالی
- **Description:** نمایش سال‌های مالی سازمان و فرم ایجاد برای مدیر از طریق سایدبار داشبورد.
- **Files:** `app/(app)/dashboard/fiscal-years/`، `app/(app)/dashboard/layout.tsx`
- **Dependencies:** TASK-023
- **Acceptance Criteria:** فهرست، وضعیت خالی، فرم و پیام خطا نمایش داده شوند و نقش مدیر رعایت شود.
- **Testing:** lint و production build موفق؛ بررسی بصری در مرورگر هنوز انجام نشده است.
- **Status:** DONE

## TASK-025

- **Title:** بک‌اند بستن سال مالی
- **Description:** بستن اتمی سال باز توسط مدیر سازمان فعال و پاسخ روشن به درخواست تکراری.
- **Files:** `app/api/fiscal-years/[id]/close/route.ts`، `tests/fiscal-years-api.mjs`
- **Dependencies:** TASK-023
- **Acceptance Criteria:** کنترل نشست، نقش و سازمان؛ رد درخواست تکراری و مبدأ نامعتبر.
- **Testing:** آزمون عملی API برای مدیر، مشاهده‌گر، سازمان دیگر، درخواست تکراری و ایجاد سال جدید پس از بستن موفق بود.
- **Status:** DONE
- **Notes:** کنترل اسناد ناتمام و ثبت در گزارش حسابرسی هنوز پیاده‌سازی نشده و پیش از استفادهٔ حسابداری واقعی ضروری است.

## TASK-026

- **Title:** رابط بستن سال مالی
- **Description:** افزودن دکمه و تأیید صریح بستن سال باز برای مدیر همراه با نمایش محدودیت‌های فعلی.
- **Files:** `app/(app)/dashboard/fiscal-years/page.tsx`، `app/(app)/dashboard/fiscal-years/close-year-button.tsx`
- **Dependencies:** TASK-025
- **Acceptance Criteria:** دکمه فقط برای مدیر و سال باز نمایش یابد؛ خطا و تأیید مشخص باشند؛ پس از موفقیت اطلاعات تازه شوند.
- **Testing:** lint و production build موفق؛ بررسی بصری و تعامل مرورگر انجام نشده است.
- **Status:** DONE

## TASK-027

- **Title:** جلوگیری از هم‌پوشانی سال‌های مالی و تقویم شمسی
- **Description:** قید پایگاه‌داده برای بازه‌های سازمان و انتخاب تاریخ شمسی در فرم.
- **Files:** `prisma/migrations/20261121150000_fiscal_year_no_overlap/`، `app/api/fiscal-years/route.ts`، `app/(app)/dashboard/fiscal-years/year-form.tsx`، `tests/`، `package.json`
- **Dependencies:** TASK-026
- **Acceptance Criteria:** جلوگیری از هم‌پوشانی حتی در درخواست هم‌زمان و انتخاب تاریخ شمسی با تبدیل صحیح برای API.
- **Testing:** migration، تست API و قیود دیتابیس، lint، build و تبدیل نمونه‌های تاریخ شمسی؛ بررسی مرورگر هنوز انجام نشده است.
- **Status:** DONE

## TASK-028

- **Title:** ثبت رویدادهای ایجاد و بستن سال مالی
- **Description:** ثبت شناسه و نام کاربر، زمان و جزئیات عملیات در همان تراکنش تغییر سال مالی.
- **Files:** `prisma/schema.prisma`، `prisma/migrations/20261121160000_fiscal_year_events/`، `app/api/fiscal-years/`، `tests/fiscal-years-api.mjs`
- **Dependencies:** TASK-027
- **Acceptance Criteria:** ثبت اتمی و سازمان‌محور رویدادها و عدم ثبت رویداد تکراری هنگام بستن مجدد.
- **Testing:** migration، تولید کلاینت، آزمون یکپارچه، lint و build.
- **Status:** DONE
- **Notes:** تست یکپارچهٔ ایجاد، بستن، نقش‌ها و عدم ثبت رویداد تکراری موفق بود. رویدادهای پیش از این قابلیت قابل بازسازی نیستند؛ این جدول با حذف سازمان حذف می‌شود و هنوز حفاظت append-only در سطح دیتابیس ندارد.

## TASK-029

- **Title:** مدل و قیود بک‌اند کدینگ حساب‌ها
- **Description:** ایجاد حساب‌های دفتر کل سازمان‌محور با ساختار درختی و پنج نوع اصلی حساب، بدون رابط کاربری.
- **Files:** `prisma/schema.prisma`، `prisma/migrations/20261121180917_add_ledger_accounts/`، `tests/ledger-accounts-db.mjs`، `docs/DATABASE.md`
- **Dependencies:** TASK-021
- **Acceptance Criteria:** کد حساب در سازمان یکتا باشد؛ ساختار پدر/فرزند از حذف والد محافظت کند؛ حساب نتواند والد خودش باشد.
- **Testing:** migration status، آزمون تراکنشی قیود دیتابیس، lint و production build موفق بودند.
- **Status:** DONE

## TASK-030

- **Title:** API خواندن و ایجاد کدینگ حساب‌ها
- **Description:** دریافت فهرست حساب‌های سازمان فعال و ایجاد حساب توسط مدیر با اعتبارسنجی ساختار درختی.
- **Files:** `app/api/ledger-accounts/route.ts`، `lib/prisma.ts`، `tests/ledger-accounts-api.mjs`
- **Dependencies:** TASK-029
- **Acceptance Criteria:** کنترل نشست و نقش، کد یکتا، اعتبار حساب والد و جلوگیری از اتصال به حساب سازمان دیگر.
- **Testing:** آزمون API با نشست واقعی مدیر و مشاهده‌گر، حساب تکراری، کد نامعتبر و والد خارجی موفق بود.
- **Status:** DONE

## TASK-031

- **Title:** رابط درخت حساب‌ها
- **Description:** نمایش حساب‌های سازمان و فرم ایجاد حساب و زیرحساب برای مدیر.
- **Files:** `app/(app)/dashboard/accounts/`، `app/(app)/dashboard/layout.tsx`
- **Dependencies:** TASK-030
- **Acceptance Criteria:** نمایش درخت و وضعیت خالی، انتخاب والد هم‌نوع، و نمایش خطای ثبت.
- **Testing:** lint و build موفق؛ بررسی بصری مرورگر انجام نشده است.
- **Status:** DONE

## TASK-032

- **Title:** بک‌اند ویرایش و تغییر وضعیت حساب‌ها
- **Description:** ویرایش نام و کد و فعال یا غیرفعال کردن حساب توسط مدیر سازمان.
- **Files:** `app/api/ledger-accounts/`، `tests/ledger-accounts-api.mjs`
- **Dependencies:** TASK-030
- **Acceptance Criteria:** کنترل نقش و سازمان، جلوگیری از کد تکراری و حفظ وضعیت سازگار والد و فرزند.
- **Testing:** آزمون یکپارچهٔ API، lint و build موفق بودند.
- **Status:** DONE
- **Notes:** تغییر والد و نوع و همچنین حسابرسی تغییرات در این مرحله پیاده‌سازی نشده‌اند؛ محدودیت‌های سند حسابداری پس از ایجاد آن باید افزوده شوند.

## TASK-033

- **Title:** رابط ویرایش و تغییر وضعیت حساب
- **Description:** افزودن کنترل‌های ویرایش نام و کد و فعال/غیرفعال‌کردن حساب در درخت حساب‌ها برای مدیر.
- **Files:** `app/(app)/dashboard/accounts/page.tsx`، `app/(app)/dashboard/accounts/account-controls.tsx`
- **Dependencies:** TASK-032
- **Acceptance Criteria:** نمایش کنترل‌ها فقط به مدیر، تأیید تغییر وضعیت، نمایش خطا و تازه‌سازی فهرست پس از موفقیت.
- **Testing:** lint، build و آزمون API موفق بودند؛ بررسی تعامل در مرورگر انجام نشده است.
- **Status:** DONE

## TASK-034

- **Title:** مدل پایهٔ سند و ردیف حسابداری
- **Description:** مدل سازمان‌محور سند و ردیف با مبلغ دقیق، شمارهٔ یکتا و اتصال هم‌سازمان به حساب و سال مالی.
- **Files:** `prisma/schema.prisma`، `prisma/migrations/20261121190000_add_journal_entries/`، `tests/journal-db.mjs`، `docs/DATABASE.md`
- **Dependencies:** TASK-030
- **Acceptance Criteria:** migration اعمال شود و قیود مبلغ و جداسازی سازمان در دیتابیس آزموده شوند.
- **Testing:** migration، تولید Prisma Client، تست تراکنشی دیتابیس و lint.
- **Status:** DONE
- **Notes:** API ثبت و کنترل تراز، منع تغییر سند نهایی و کنترل سال بسته هنوز ساخته نشده‌اند.

## TASK-035

- **Title:** API ایجاد و فهرست پیش‌نویس اسناد
- **Description:** ایجاد سند پیش‌نویس سازمان‌محور توسط مدیر یا حسابدار، با اعتبارسنجی مبلغ و سال مالی باز.
- **Files:** `app/api/journal-entries/route.ts`، `lib/prisma.ts`، `tests/journal-api.mjs`
- **Dependencies:** TASK-034
- **Acceptance Criteria:** کنترل نقش، سال باز، تاریخ، حساب‌های فعال سازمان، شمارهٔ یکتا و مبلغ دقیق؛ ثبت سند و ردیف‌ها اتمی باشد.
- **Testing:** آزمون API، lint و build.
- **Status:** DONE
- **Notes:** پیش‌نویس می‌تواند نامتوازن باشد؛ نهایی‌سازی و کنترل تراز هنوز پیاده نشده است.

## TASK-036

- **Title:** رابط پیش‌نویس اسناد حسابداری
- **Description:** نمایش اسناد سازمان و فرم پیش‌نویس با تاریخ شمسی و ردیف‌های بدهکار/بستانکار.
- **Files:** `app/(app)/dashboard/journal/`، `app/(app)/dashboard/layout.tsx`
- **Dependencies:** TASK-035
- **Acceptance Criteria:** نمایش وضعیت و جزئیات سند، ایجاد پیش‌نویس توسط نقش مجاز، محاسبهٔ دقیق جمع‌ها و نمایش خطا.
- **Testing:** lint، build و آزمون API موفق؛ بررسی تعامل مرورگر انجام نشده است.
- **Status:** DONE

## TASK-037

- **Title:** بک‌اند ثبت نهایی سند حسابداری
- **Description:** نهایی‌سازی اتمی سند متوازن در سال مالی باز با حساب‌های فعال و ثبت رویداد.
- **Files:** `app/api/journal-entries/[id]/post/route.ts`، `prisma/schema.prisma`، `prisma/migrations/20261121200000_journal_events/`، `tests/journal-api.mjs`
- **Dependencies:** TASK-035
- **Acceptance Criteria:** حداقل دو ردیف، جمع برابر و مثبت، نقش مجاز، سال باز، حساب‌های فعال، جلوگیری از ثبت تکراری و ثبت رویداد.
- **Testing:** آزمون یکپارچهٔ API، lint و build موفق.
- **Status:** DONE
- **Notes:** محافظت تغییرناپذیری در سطح دیتابیس، کنترل اسناد ناتمام در بستن سال و امکان اصلاح/برگشت سند هنوز پیاده نشده‌اند.

## TASK-038

- **Title:** رابط ثبت نهایی سند
- **Description:** افزودن کنترل ثبت نهایی پیش‌نویس با تأیید صریح و نمایش خطای سرور.
- **Files:** `app/(app)/dashboard/journal/page.tsx`، `app/(app)/dashboard/journal/post-journal-button.tsx`
- **Dependencies:** TASK-037
- **Acceptance Criteria:** نمایش کنترل فقط به مدیر یا حسابدار برای پیش‌نویس؛ تأیید، خطا و تازه‌سازی وضعیت.
- **Testing:** lint، build و آزمون API موفق؛ تعامل بصری مرورگر بررسی نشده است.
- **Status:** DONE

## TASK-039

- **Title:** محافظت سند ثبت‌شده در پایگاه داده
- **Description:** جلوگیری از ویرایش و حذف سند نهایی و تغییر ردیف‌های آن در PostgreSQL.
- **Files:** `prisma/migrations/20261121210000_lock_posted_journals/`، `tests/journal-db.mjs`، `tests/journal-api.mjs`، `docs/DATABASE.md`
- **Dependencies:** TASK-037
- **Acceptance Criteria:** رد ویرایش/حذف سند نهایی و افزودن/ویرایش/حذف ردیف‌های آن؛ محافظت از داده‌های تست با rollback.
- **Testing:** تست تراکنشی دیتابیس، آزمون API پیش‌نویس و lint موفق.
- **Status:** DONE
- **Notes:** آزمون موفق نهایی‌سازی API برای پاکسازی ایمن اکنون به دیتابیس موقت مجزا نیاز دارد. ثبت مستقیم وضعیت در دیتابیس و دسترسی مدیریتی از محدودهٔ این محافظت خارج‌اند.

## TASK-040

- **Title:** جلوگیری از بستن سال دارای پیش‌نویس
- **Description:** بررسی پیش‌نویس‌های سازمان در تراکنش بستن سال مالی با قفل مشترک با عملیات ثبت سند.
- **Files:** `app/api/fiscal-years/[id]/close/route.ts`، `tests/journal-api.mjs`، `app/(app)/dashboard/fiscal-years/close-year-button.tsx`
- **Dependencies:** TASK-035، TASK-039
- **Acceptance Criteria:** بستن سال دارای پیش‌نویس رد و سال بدون پیش‌نویس طبق مجوز بسته شود.
- **Testing:** آزمون‌های API سال مالی و سند، lint و build موفق؛ آزمون هم‌زمانی اجرا نشده است.
- **Status:** DONE
- **Notes:** پیش‌نویس نامتوازن تا افزودن امکان ویرایش یا حذف قابل تعیین تکلیف نیست؛ سایر کنترل‌های پایان سال هنوز تکمیل نشده‌اند.

## TASK-041

- **Title:** بک‌اند ویرایش پیش‌نویس سند
- **Description:** ویرایش اتمی شماره، تاریخ، شرح و ردیف‌های سند پیش‌نویس با کنترل سازمان و سال مالی.
- **Files:** `app/api/journal-entries/[id]/route.ts`، `tests/journal-api.mjs`
- **Dependencies:** TASK-040
- **Acceptance Criteria:** فقط نقش مجاز در سال باز بتواند پیش‌نویس را با حساب‌های فعال ویرایش کند؛ سند نهایی قابل ویرایش نباشد.
- **Testing:** آزمون API، lint و build موفق؛ تست تغییر هم‌زمان و تست ویرایش سند نهایی در دیتابیس مجزای آزمایشی باقی است.
- **Status:** DONE
- **Notes:** رابط ویرایش هنوز ساخته نشده و تغییر سال مالی سند در این API مجاز نیست.

## TASK-042

- **Title:** رابط ویرایش پیش‌نویس سند
- **Description:** بارگذاری و اصلاح شماره، تاریخ شمسی، شرح و ردیف‌های سند پیش‌نویس.
- **Files:** `app/(app)/dashboard/journal/[id]/edit/page.tsx`، `app/(app)/dashboard/journal/journal-form.tsx`، `app/(app)/dashboard/journal/page.tsx`
- **Dependencies:** TASK-041
- **Acceptance Criteria:** نمایش فرم فقط برای کاربر مجاز و سند پیش‌نویس در سال باز، نمایش داده‌های قبلی و ارسال اصلاحات به API.
- **Testing:** lint، build و آزمون API موفق؛ بررسی بصری و تعامل مرورگر انجام نشده است.
- **Status:** DONE

## TASK-043

- **Title:** بک‌اند حذف پیش‌نویس سند
- **Description:** حذف اتمی پیش‌نویس و ردیف‌های آن در سال مالی باز توسط نقش مجاز.
- **Files:** `app/api/journal-entries/[id]/route.ts`، `tests/journal-api.mjs`
- **Dependencies:** TASK-041
- **Acceptance Criteria:** کنترل نقش، سازمان و وضعیت؛ حفاظت از سند نهایی و سال بسته و حذف اتمی ردیف‌ها.
- **Testing:** آزمون API و قیود دیتابیس، lint و build موفق؛ تست هم‌زمانی اجرا نشده است.
- **Status:** DONE
- **Notes:** حذف پیش‌نویس دائمی است و شمارهٔ آن قابل استفادهٔ مجدد می‌شود؛ تاریخچهٔ حذف ثبت نمی‌شود. رابط کاربری هنوز اضافه نشده است.

## TASK-044

- **Title:** رابط حذف پیش‌نویس سند
- **Description:** نمایش دکمهٔ حذف پیش‌نویس در سال باز برای کاربر مجاز، با تأیید و هشدار حذف دائمی.
- **Files:** `app/(app)/dashboard/journal/page.tsx`، `app/(app)/dashboard/journal/delete-draft-button.tsx`
- **Dependencies:** TASK-043
- **Acceptance Criteria:** تأیید صریح، نمایش خطا، جلوگیری از ارسال تکراری و تازه‌سازی فهرست پس از حذف.
- **Testing:** lint، build و آزمون API موفق؛ تعامل مرورگر بررسی نشده است.
- **Status:** DONE

## TASK-045

- **Title:** بک‌اند گزارش تراز آزمایشی
- **Description:** محاسبهٔ گردش و ماندهٔ مستقیم حساب‌ها از اسناد نهایی یک سازمان و سال مالی.
- **Files:** `app/api/reports/trial-balance/route.ts`، `tests/journal-api.mjs`
- **Dependencies:** TASK-037
- **Acceptance Criteria:** جداسازی سازمان، حذف پیش‌نویس‌ها از گزارش و محاسبهٔ دقیق ریالی.
- **Testing:** lint، build، کنترل دسترسی، کنارگذاشتن پیش‌نویس و محاسبه با دو سند نهایی و مبالغ بزرگ در دیتابیس مجزا موفق بودند.
- **Status:** DONE
- **Notes:** حساب‌های بدون گردش نمایش داده نمی‌شوند؛ گردش زیرحساب به والد تجمیع نمی‌شود. دیتابیس موقت آزمایشی پس از آزمون حذف شد.

## TASK-046

- **Title:** رابط گزارش تراز آزمایشی
- **Description:** انتخاب سال مالی و نمایش گردش و ماندهٔ حساب‌ها با واحد ریال.
- **Files:** `app/(app)/dashboard/reports/trial-balance/`، `app/(app)/dashboard/layout.tsx`
- **Dependencies:** TASK-045
- **Acceptance Criteria:** انتخاب سال، نمایش جدول، جمع‌ها، وضعیت خالی و خطای دریافت؛ مبالغ دقیق نمایش داده شوند.
- **Testing:** lint و build موفق؛ بررسی بصری و تعامل در مرورگر انجام نشده است.
- **Status:** DONE

## TASK-047

- **Title:** بک‌اند گزارش دفتر کل حساب
- **Description:** نمایش گردش مستقیم حساب از اسناد نهایی یک سال مالی با ماندهٔ تجمعی دقیق.
- **Files:** `app/api/reports/general-ledger/route.ts`، `tests/trial-balance-isolated.mjs`
- **Dependencies:** TASK-045
- **Acceptance Criteria:** کنترل دسترسی سازمانی، حذف پیش‌نویس، ترتیب پایدار و محاسبهٔ دقیق ماندهٔ بدهکار/بستانکار.
- **Testing:** آزمون API با دیتابیس مجزا و مبالغ بزرگ، کنترل دسترسی، lint و build موفق بودند.
- **Status:** DONE
- **Notes:** گزارش یک حساب را در کل سال مالی پوشش می‌دهد؛ گردش زیرحساب‌ها تجمیع نمی‌شود و فیلتر بازهٔ تاریخ هنوز وجود ندارد.

## TASK-048

- **Title:** رابط گزارش دفتر کل
- **Description:** انتخاب سال و حساب و نمایش گردش مستقیم و ماندهٔ تجمعی به ریال.
- **Files:** `app/(app)/dashboard/reports/general-ledger/`، `app/(app)/dashboard/layout.tsx`
- **Dependencies:** TASK-047
- **Acceptance Criteria:** فهرست حساب‌های فعال و غیرفعال، انتخاب سال، گردش و مانده، وضعیت خالی و خطا.
- **Testing:** lint و build موفق؛ تعامل مرورگر هنوز بررسی نشده است.
- **Status:** DONE

## TASK-049

- **Title:** بک‌اند گزارش سود و زیان
- **Description:** محاسبهٔ ماندهٔ مستقیم درآمد و هزینه از اسناد نهایی سازمان در سال مالی.
- **Files:** `app/api/reports/profit-loss/route.ts`، `tests/trial-balance-isolated.mjs`
- **Dependencies:** TASK-047
- **Acceptance Criteria:** تفکیک سازمان، محاسبهٔ دقیق درآمد، هزینه و نتیجه و کنارگذاشتن پیش‌نویس‌ها.
- **Testing:** آزمون یکپارچه در دیتابیس مجزا با سند نهایی، کنترل دسترسی، lint و build موفق.
- **Status:** DONE
- **Notes:** گزارش بر اساس گردش مستقیم حساب‌ها در کل سال است؛ بستن حساب‌های موقت، سند اختتامیه و فیلتر بازه هنوز پیاده نشده‌اند.

## TASK-050

- **Title:** رابط گزارش سود و زیان
- **Description:** نمایش خالص درآمد، هزینه، نتیجه و جزئیات حساب‌های سال مالی انتخاب‌شده.
- **Files:** `app/(app)/dashboard/reports/profit-loss/`، `app/(app)/dashboard/layout.tsx`
- **Dependencies:** TASK-049
- **Acceptance Criteria:** انتخاب سال، نمایش سود یا زیان، جزئیات، وضعیت خالی و خطای دریافت.
- **Testing:** lint و build موفق؛ بررسی بصری و تعامل مرورگر هنوز انجام نشده است.
- **Status:** DONE

## TASK-051

- **Title:** بک‌اند خلاصه مالی داشبورد
- **Description:** ارائه درآمد، هزینه، سود یا زیان، تعداد اسناد و آخرین اسناد نهایی برای سال مالی انتخاب‌شده در سازمان کاربر.
- **Files:** `app/api/dashboard/summary/route.ts`، `tests/trial-balance-isolated.mjs`
- **Dependencies:** TASK-049
- **Acceptance Criteria:** کنترل دسترسی سازمان، محاسبه بر اساس اسناد نهایی و تفکیک تعداد پیش‌نویس‌ها.
- **Testing:** lint، build و آزمون یکپارچه در پایگاه داده مجزا موفق بودند؛ ارقام با گزارش سود و زیان تطبیق داده شدند.
- **Status:** DONE
- **Notes:** داده‌ها مربوط به کل سال مالی هستند؛ نمودار، فیلتر بازه و رابط داشبورد در این تسک پیاده‌سازی نشده‌اند.

## TASK-052

- **Title:** رابط خلاصه مالی داشبورد
- **Description:** نمایش خودکار عملکرد سال مالی، وضعیت اسناد و آخرین اسناد نهایی با امکان انتخاب سال.
- **Files:** `app/(app)/dashboard/page.tsx`، `app/(app)/dashboard/dashboard-summary.tsx`
- **Dependencies:** TASK-051
- **Acceptance Criteria:** نمایش واکنش‌گرا، مبالغ ریالی، تاریخ شمسی، وضعیت بارگذاری، خطا و اطلاعات خالی.
- **Testing:** lint و build موفق؛ بررسی بصری و تعامل مرورگر انجام نشده است.
- **Status:** DONE

## TASK-053

- **Title:** بک‌اند عملکرد ماهانه درآمد و هزینه
- **Description:** تجمیع گردش اسناد نهایی سال مالی به تفکیک ماه شمسی برای نمودار داشبورد، با کنترل دسترسی سازمان.
- **Files:** `app/api/dashboard/monthly/route.ts`، `tests/trial-balance-isolated.mjs`
- **Dependencies:** TASK-051
- **Acceptance Criteria:** مبالغ دقیق، رعایت مرز سال شمسی، حذف پیش‌نویس‌ها و کنترل دسترسی.
- **Testing:** lint، build و آزمون یکپارچه در پایگاه داده مجزا موفق بودند.
- **Status:** DONE
- **Notes:** خروجی تنها ماه‌های دارای گردش حساب درآمد یا هزینه را شامل می‌شود؛ رابط نمودار در تسک بعدی ساخته می‌شود.

## TASK-054

- **Title:** نمایش نمودار درآمد و هزینه ماهانه
- **Description:** نمایش مقایسه ماهانه در داشبورد برای سال مالی انتخاب‌شده، همراه با مبلغ دقیق، حالت خطا و حالت خالی.
- **Files:** `app/(app)/dashboard/dashboard-summary.tsx`، `app/(app)/dashboard/monthly-chart.tsx`
- **Dependencies:** TASK-053
- **Acceptance Criteria:** ماه‌های شمسی دارای گردش، مقادیر مثبت و منفی، مبالغ ریالی دقیق و تغییر سال مالی نمایش داده شوند.
- **Testing:** lint و build موفق؛ بررسی بصری و تعامل مرورگر انجام نشده است.
- **Status:** DONE
- **Notes:** نصب Recharts پاسخی نداد و متوقف شد؛ نمودار با امکانات موجود ساخته شد. ماه‌های بدون گردش در خروجی سرویس وجود ندارند.

## TASK-055

- **Title:** مدل داده مشتریان و تأمین‌کنندگان
- **Description:** ایجاد موجودیت شخص در هر سازمان با نقش مشتری، تأمین‌کننده یا هر دو و اطلاعات تماس اختیاری.
- **Files:** `prisma/schema.prisma`، `prisma/migrations/20261121220000_add_parties/`، `docs/DATABASE.md`، `tests/trial-balance-isolated.mjs`
- **Dependencies:** TASK-006
- **Acceptance Criteria:** وابستگی به سازمان، نام غیرخالی و حداقل یک نقش در دیتابیس تضمین شود.
- **Testing:** اعتبارسنجی و تولید Prisma Client، lint و آزمون قیود در دیتابیس مجزا موفق؛ migration روی دیتابیس محلی اعمال شد.
- **Status:** DONE
- **Notes:** API، رابط، ارتباط حساب‌ها و محاسبه مانده اشخاص به مراحل بعدی موکول شده‌اند.

## TASK-056

- **Title:** API ثبت و فهرست اشخاص
- **Description:** ایجاد شخص و دریافت فهرست صفحه‌بندی‌شده با جست‌وجو و فیلتر نقش و وضعیت در محدوده سازمان.
- **Files:** `app/api/parties/route.ts`، `tests/trial-balance-isolated.mjs`
- **Dependencies:** TASK-055
- **Acceptance Criteria:** مدیر و حسابدار امکان ثبت دارند، مشاهده‌گر فقط فهرست را می‌بیند، ورودی اعتبارسنجی و سازمان‌ها تفکیک می‌شوند.
- **Testing:** lint، build و آزمون یکپارچه نقش‌ها، اعتبارسنجی، فیلتر و تفکیک سازمان در دیتابیس مجزا موفق بودند.
- **Status:** DONE
- **Notes:** ویرایش و غیرفعال‌سازی اشخاص و رابط کاربری هنوز پیاده‌سازی نشده‌اند.

## TASK-057

- **Title:** رابط ثبت و فهرست اشخاص
- **Description:** صفحه راست‌چین ثبت مشتری و تأمین‌کننده، جست‌وجو، فیلتر و صفحه‌بندی با اتصال به API.
- **Files:** `app/(app)/dashboard/parties/`، `app/(app)/dashboard/layout.tsx`
- **Dependencies:** TASK-056
- **Acceptance Criteria:** فرم سمت راست، نمایش متناسب با نقش، خطا و وضعیت خالی و دسترسی از منوی داشبورد.
- **Testing:** lint و build موفق بودند؛ بررسی بصری و تعاملی مرورگر انجام نشده است.
- **Status:** DONE
- **Notes:** ویرایش و غیرفعال‌سازی در این مرحله موجود نیست.

## TASK-058

- **Title:** API ویرایش و تغییر وضعیت اشخاص
- **Description:** ویرایش مشخصات و نقش‌ها و فعال یا غیرفعال‌کردن اشخاص سازمان با کنترل دسترسی.
- **Files:** `app/api/parties/[id]/route.ts`، `app/api/parties/route.ts`، `lib/party-validation.ts`، `tests/trial-balance-isolated.mjs`
- **Dependencies:** TASK-056
- **Acceptance Criteria:** نقش مشاهده‌گر مجوز ویرایش ندارد؛ حداقل یک نقش شخص باقی می‌ماند؛ اطلاعات سازمان دیگر تغییر نمی‌کند.
- **Testing:** lint، build و آزمون یکپارچه ویرایش، نقش‌ها، داده نامعتبر و تفکیک سازمان موفق بودند.
- **Status:** DONE
- **Notes:** رابط ویرایش و تغییر وضعیت در تسک بعدی اضافه می‌شود.

## TASK-059

- **Title:** رابط ویرایش و تغییر وضعیت اشخاص
- **Description:** ویرایش مشخصات و نقش و فعال یا غیرفعال‌کردن شخص در فهرست اشخاص.
- **Files:** `app/(app)/dashboard/parties/parties.tsx`، `app/(app)/dashboard/parties/party-controls.tsx`
- **Dependencies:** TASK-057، TASK-058
- **Acceptance Criteria:** کنترل‌ها برای مدیر و حسابدار نمایش داده شوند؛ خطا، تأیید تغییر وضعیت و به‌روزرسانی فهرست مدیریت شود.
- **Testing:** lint و build موفق بودند؛ بررسی ظاهری و تعامل در مرورگر انجام نشده است.
- **Status:** DONE

## TASK-060

- **Title:** مدل داده کالا و خدمات
- **Description:** تعریف کالا و خدمت سازمان با کد یکتا، واحد، قیمت‌های ریالی دقیق و وضعیت فعال.
- **Files:** `prisma/schema.prisma`، `prisma/migrations/20261121230000_add_products/`، `docs/DATABASE.md`، `tests/trial-balance-isolated.mjs`
- **Dependencies:** TASK-006
- **Acceptance Criteria:** سازمان معتبر، کد یکتای سازمانی، فیلدهای ضروری و قیمت‌های نامنفی در دیتابیس کنترل شوند.
- **Testing:** اعتبارسنجی و تولید Prisma Client، lint و آزمون قیود در دیتابیس مجزا موفق؛ migration روی دیتابیس محلی اعمال شد.
- **Status:** DONE
- **Notes:** API و رابط، ارتباط با فاکتور و مدیریت موجودی هنوز پیاده‌سازی نشده‌اند.

+
## TASK-061

- **Title:** یکپارچه‌سازی مستندات و برنامه کار
- **Description:** تطبیق مستندات با کد، ثبت محدودیت‌ها و تعریف تسک‌های آتی.
- **Files:** `README.md`، `docs/ARCHITECTURE.md`، `docs/AI_DESIGN.md`، `docs/ROADMAP.md`، `docs/CHANGELOG.md`، `docs/TASKS.md`
- **Dependencies:** TASK-060
- **Acceptance Criteria:** تفکیک قابلیت موجود از هدف، ثبت نحوه اجرا و فهرست تسک‌های قابل پیگیری.
- **Testing:** بازبینی فایل‌ها، وابستگی‌ها و لینک‌های محلی مستندات.
- **Status:** DONE

## TASK-062

- **Title:** API ثبت و فهرست کالا و خدمات
- **Description:** ایجاد کالا یا خدمت و فهرست صفحه‌بندی‌شده با جست‌وجو و فیلتر نوع و وضعیت در محدوده سازمان.
- **Files:** `app/api/products/route.ts`، `tests/trial-balance-isolated.mjs`
- **Dependencies:** TASK-060
- **Acceptance Criteria:** نقش‌های مجاز، جداسازی سازمان، قیمت ریالی صحیح رشته‌ای و کد یکتای سازمانی کنترل شوند.
- **Testing:** lint، build و آزمون یکپارچه دسترسی، مبلغ، کد تکراری، فیلتر و تفکیک سازمان موفق بودند.
- **Status:** DONE
- **Notes:** رابط ثبت و فهرست و همچنین ویرایش و تغییر وضعیت هنوز ساخته نشده‌اند.

## TASK-063

- **Title:** رابط ثبت و فهرست کالا و خدمات
- **Description:** صفحه راست‌چین ثبت، جست‌وجو، فیلتر و صفحه‌بندی کالا و خدمات با اتصال به API.
- **Files:** `app/(app)/dashboard/products/`، `app/(app)/dashboard/layout.tsx`
- **Dependencies:** TASK-062
- **Acceptance Criteria:** فرم سمت راست، قیمت ریالی دقیق، دسترسی متناسب با نقش و وضعیت خالی و خطا.
- **Testing:** lint و build موفق بودند؛ بررسی ظاهری و تعامل در مرورگر انجام نشده است.
- **Status:** DONE
- **Notes:** ویرایش و تغییر وضعیت در تسک‌های بعدی انجام می‌شوند.

## TASK-118

- **Title:** رفع استفاده از Prisma Client قدیمی در سرور توسعه
- **Description:** بازسازی نمونه کش‌شده هنگام تغییر schema یا تولید مجدد Prisma Client و جلوگیری از استفاده از نمونه بدون مدل‌های شخص و کالا.
- **Files:** `lib/prisma.ts`، `README.md`
- **Dependencies:** TASK-055، TASK-060
- **Acceptance Criteria:** نمونه قدیمی پس از تغییر schema یا client دوباره استفاده نشود و مسیرهای شخص و کالا در سرور تازه کار کنند.
- **Testing:** وضعیت migration محلی، lint، build و آزمون یکپارچه ثبت و فهرست در دیتابیس مجزا موفق؛ سناریوی hot reload مرورگر به‌صورت خودکار آزمایش نشده است.
- **Status:** DONE

## TASK-064

- **Title:** API ویرایش و تغییر وضعیت کالا و خدمات
- **Description:** ویرایش مشخصات و قیمت و فعال یا غیرفعال‌کردن کالا در سازمان کاربر.
- **Files:** `app/api/products/`، `lib/product-validation.ts`، `tests/trial-balance-isolated.mjs`
- **Dependencies:** TASK-062
- **Acceptance Criteria:** کنترل نقش و سازمان، اعتبارسنجی قیمت و جلوگیری از کد تکراری.
- **Testing:** build، lint فایل‌های تغییرکرده و آزمون یکپارچه در دیتابیس مجزا موفق؛ lint کل پروژه به علت طولانی شدن متوقف شد.
- **Status:** DONE
- **Notes:** رابط ویرایش و تغییر وضعیت در TASK-065 ساخته می‌شود.

## TASK-065

- **Title:** رابط ویرایش و تغییر وضعیت کالا و خدمات
- **Description:** ویرایش مشخصات، قیمت و فعال یا غیرفعال‌کردن کالا و خدمت در فهرست.
- **Files:** `app/(app)/dashboard/products/`
- **Dependencies:** TASK-063، TASK-064
- **Acceptance Criteria:** کنترل‌ها متناسب با نقش، با تأیید تغییر وضعیت، اعتبارسنجی قیمت و به‌روزرسانی فهرست کار کنند.
- **Testing:** lint پوشه کالا و خدمات و build موفق؛ بررسی ظاهری و تعاملی در مرورگر انجام نشده است.
- **Status:** DONE

## TASK-119

- **Title:** تکمیل داده نمایشی سازمان test
- **Description:** افزودن اشخاص، کالا و خدمات و اسناد نمونه در ماه‌های مختلف سال مالی باز برای ارزیابی رابط و گزارش‌ها.
- **Files:** `scripts/seed-test-showcase.mjs`، `README.md`
- **Dependencies:** TASK-055، TASK-060، TASK-065
- **Acceptance Criteria:** اطلاعات فقط به سازمان test اضافه شوند، داده‌های قبلی حفظ شوند، اسناد متوازن و نمونه‌ها قابل تشخیص باشند.
- **Testing:** اجرای تراکنشی موفق؛ کنترل تعداد، وضعیت و توازن اسناد جدید و lint اسکریپت موفق بود.
- **Status:** DONE
- **Notes:** ۸ شخص، ۸ کالا/خدمت، ۱۵ سند نهایی و ۲ پیش‌نویس در سال مالی ۱۴۰۴ افزوده شدند. برچسب‌های نمایشی بعداً به درخواست کاربر حذف شدند. فاکتور و پرداخت هنوز ساخته نشده‌اند.

## TASK-120

- **Title:** حذف برچسب از داده‌های سازمان test
- **Description:** حذف برچسب‌های نمایشی از حساب‌ها، اشخاص، کالاها و شرح اسناد انتخاب‌شده سازمان test بنا به درخواست کاربر.
- **Files:** `scripts/clean-test-labels.mjs`، `scripts/seed-test-showcase.mjs`، `README.md`
- **Dependencies:** TASK-119
- **Acceptance Criteria:** داده مالی و توازن حفظ شود، محافظ سند نهایی دوباره فعال باشد و تغییر شرح سند نهایی ثبت حسابرسی داشته باشد.
- **Testing:** بررسی نبود برچسب در داده‌های سازمان، توازن ۲۲ سند، فعال‌بودن trigger و lint اسکریپت موفق بود.
- **Status:** DONE
- **Notes:** برای اصلاح فقط شرح‌های انتخاب‌شدهٔ test، trigger در همان تراکنش و زیر قفل جدول موقتاً غیرفعال و پیش از commit فعال شد؛ ۲۰ رویداد حسابرسی شامل شرح قبل و بعد ثبت شد.

## TASK-066

- **Title:** طراحی ارتباط حساب اشخاص
- **Description:** طراحی ارتباط اختصاصی دریافتنی و پرداختنی اشخاص، قواعد مانده و حفاظت از تاریخچه و سازمان.
- **Files:** `docs/DATABASE.md`، `docs/TASKS.md`
- **Dependencies:** TASK-055، TASK-029
- **Acceptance Criteria:** نوع حساب، یکتایی، پایداری اتصال، محاسبه و محدودیت‌های سازمان و هم‌زمانی مشخص باشند.
- **Testing:** بازبینی طرح با مدل و مسیرهای فعلی سند، کدینگ و گزارش دفتر کل.
- **Status:** DONE
- **Notes:** فقط طراحی مستند شد؛ هیچ schema یا API تغییری نکرده است. TASK-067 احتمالاً باید به تسک‌های کوچک‌تر تقسیم شود.

## TASK-067

- **Title:** مدل اتصال حساب شخص و ممیزی
- **Description:** تعریف اتصال اختصاصی دریافتنی/پرداختنی، نشانگر اولین استفاده و ساختار ثبت تغییرات.
- **Files:** `prisma/schema.prisma`، `prisma/migrations/20261122200000_add_party_account_links/`، `tests/trial-balance-isolated.mjs`، `docs/DATABASE.md`
- **Dependencies:** TASK-066
- **Acceptance Criteria:** دو کاربرد مستقل، یکتایی اتصال، کلیدهای خارجی هم‌سازمانی و نگهداری رویداد پس از قطع اتصال.
- **Testing:** Prisma validate و generate، lint تست و آزمون قیود در دیتابیس مجزا موفق؛ migration در دیتابیس محلی اعمال شد.
- **Status:** DONE
- **Notes:** تنظیم خودکار firstUsedAt، بررسی نوع/نقش/فعال بودن حساب، محافظت عملیات و ایجاد رویداد خودکار هنوز پیاده نشده‌اند و در TASK-121 و TASK-122 انجام می‌شوند.

## TASK-121

- **Title:** محافظت از حساب و نقش متصل
- **Description:** محافظت حساب و نقش متصل در مسیرهای موجود و ثبت نخستین استفاده در پیش‌نویس سند.
- **Files:** `app/api/ledger-accounts/`، `app/api/parties/[id]/`، `app/api/journal-entries/`، `lib/journal-account-locks.ts`، `tests/trial-balance-isolated.mjs`
- **Dependencies:** TASK-067
- **Acceptance Criteria:** جلوگیری از تغییر نقش، غیرفعال‌سازی یا افزودن فرزند ناسازگار؛ ثبت firstUsedAt در ایجاد/ویرایش سند و حفظ آن پس از حذف پیش‌نویس؛ رد ثبت سند برای شخص غیرفعال.
- **Testing:** build، lint فایل‌های مرتبط و آزمون یکپارچه در پایگاه مجزا موفق؛ مسابقه غیرفعال‌سازی شخص با ایجاد سند نیز آزموده شد.
- **Status:** DONE
- **Notes:** API اتصال، ممیزی تغییر اتصال، حفاظت از حذف/تعویض آن و آزمون هم‌زمانی اتصال با ایجاد سند یا فرزند در TASK-122 باقی است. ثبت مستقیم در دیتابیس تحت محافظت API نیست.

## TASK-122

- **Title:** API مدیریت اتصال حساب اشخاص
- **Description:** مشاهده، اتصال، تعویض و قطع حساب دریافتنی/پرداختنی با ممیزی و قفل‌های سازگار.
- **Files:** `app/api/parties/[id]/accounts/route.ts`، `app/api/journal-entries/`، `tests/trial-balance-isolated.mjs`
- **Dependencies:** TASK-067، TASK-121
- **Acceptance Criteria:** فقط مدیر تغییر دهد؛ حساب متعلق به سازمان، فعال، هم‌نوع، اختصاصی، بدون فرزند و بدون گردش قبلی باشد؛ تغییر حساب استفاده‌شده رد و هر تغییر ثبت شود.
- **Testing:** build، lint فایل‌های مرتبط و آزمون یکپارچه مجزا موفق؛ اتصال هم‌زمان با سند، زیرحساب و اتصال شخص دیگر بررسی شد.
- **Status:** DONE
- **Notes:** رابط انتخاب حساب و گزارش مانده هنوز ساخته نشده‌اند. ثبت مستقیم در دیتابیس خارج از این کنترل‌های API است.

## TASK-068

- **Title:** رابط اتصال حساب به شخص
- **Description:** نمایش و مدیریت حساب دریافتنی و پرداختنی در کارت شخص با استفاده از API اتصال.
- **Files:** `app/(app)/dashboard/parties/`
- **Dependencies:** TASK-122
- **Acceptance Criteria:** مشاهده برای نقش‌های مجاز، مدیریت توسط مدیر، نمایش حساب استفاده‌شده و شرایط انتخاب و خطا.
- **Testing:** lint بخش اشخاص و build موفق؛ بررسی ظاهری و تعاملی مرورگر انجام نشده است.
- **Status:** DONE
- **Notes:** فهرست انتخاب فقط نوع، فعال‌بودن و نداشتن زیرحساب را در رابط بررسی می‌کند؛ گردش قبلی و اختصاص به شخص دیگر هنگام ذخیره توسط سرور بررسی می‌شوند. گزارش مانده هنوز ساخته نشده است.

## TASK-069

- **Title:** مدل رویداد درآمد و هزینه
- **Description:** مدل رویداد مالی با مبلغ دقیق و اتصال یکتای سند نهایی در همان سازمان و سال.
- **Files:** `prisma/schema.prisma`، `prisma/migrations/20261122210000_add_financial_transactions/`، `tests/trial-balance-isolated.mjs`، `docs/DATABASE.md`
- **Dependencies:** TASK-034
- **Acceptance Criteria:** مبلغ مثبت، حساب‌های متفاوت، روابط هم‌سازمانی، وضعیت معتبر، سند یکتای نهایی و تاریخ یکسان کنترل شوند.
- **Testing:** Prisma validate و generate، آزمون قیود در دیتابیس مجزا، lint تست و مقایسه schema با دیتابیس موفق؛ migration روی دیتابیس محلی اعمال شد.
- **Status:** DONE
- **Notes:** هنوز API یا رابط وجود ندارد؛ نوع و فعال بودن حساب‌ها، سال باز و تطبیق مبلغ با ردیف‌های سند باید در مراحل بعد کنترل شوند.

## TASK-070

- **Title:** API پیش‌نویس درآمد و هزینه
- **Description:** ثبت، فهرست و حذف پیش‌نویس مالی با اعتبارسنجی سمت سرور و جلوگیری از بستن سال دارای پیش‌نویس مالی.
- **Files:** `app/api/transactions/`، `app/api/fiscal-years/[id]/close/route.ts`، `lib/prisma-errors.ts`، `app/api/journal-entries/`، `app/api/parties/[id]/accounts/route.ts`، `tests/trial-balance-isolated.mjs`
- **Dependencies:** TASK-069
- **Acceptance Criteria:** فقط کاربر مجاز بتواند پیش‌نویس معتبر و هم‌سازمانی در سال باز بسازد یا حذف کند؛ هیچ سند نهایی ساخته نشود و بستن سال دارای پیش‌نویس رد شود.
- **Testing:** build، lint فایل‌های مرتبط و آزمون یکپارچه در دیتابیس مجزا موفق؛ تداخل ایجاد پیش‌نویس و بستن سال، محدودیت سازمان، نقش، نوع حساب و مبلغ بررسی شدند.
- **Status:** DONE
- **Notes:** API فقط پیش‌نویس‌ها را فهرست می‌کند. ویرایش، نهایی‌سازی و رابط هنوز ساخته نشده‌اند؛ ثبت نهایی باید همه اعتبارسنجی‌ها را دوباره انجام دهد و سند متوازن بسازد.

## TASK-071

- **Title:** رابط پیش‌نویس درآمد و هزینه
- **Description:** فرم راست‌چین ثبت، فهرست و حذف پیش‌نویس با تقویم شمسی و فیلتر.
- **Files:** `app/(app)/dashboard/transactions/`، `app/(app)/dashboard/layout.tsx`، `tests/trial-balance-isolated.mjs`
- **Dependencies:** TASK-070
- **Acceptance Criteria:** نقش مشاهده‌گر فقط فهرست ببیند؛ ثبت و حذف با پیام وضعیت و تأکید بر عدم ایجاد سند نهایی انجام شود.
- **Testing:** build، lint بخش مرتبط و آزمون دسترسی صفحه و API در دیتابیس مجزا موفق؛ بررسی ظاهری و تعاملی مرورگر انجام نشده است.
- **Status:** DONE
- **Notes:** تا پیش از TASK-072 ثبت نهایی وجود ندارد و سال مالی دارای پیش‌نویس بسته نمی‌شود.

## TASK-072

- **Title:** بک‌اند ثبت نهایی درآمد و هزینه
- **Description:** ایجاد اتمی سند دوطرفه و اتصال آن به رویداد مالی، با بررسی مجدد شرایط و جلوگیری از ثبت تکراری.
- **Files:** `app/api/transactions/`، `lib/financial-accounts.ts`، `tests/trial-balance-isolated.mjs`
- **Dependencies:** TASK-070، TASK-037
- **Acceptance Criteria:** ثبت درآمد و هزینه سند متوازن با شماره یکتا و رویداد حسابرسی بسازد؛ تغییرات هم‌زمان، حساب نامعتبر و ثبت مجدد رد شوند و گزارش دوباره‌شماری نکند.
- **Testing:** build، lint فایل‌های مرتبط و آزمون یکپارچه در پایگاه مجزا موفق؛ جهت ردیف‌ها، تطبیق سود و زیان، حساب غیرفعال، ثبت هم‌زمان، حذف هم‌زمان و پایان محدوده شماره بررسی شدند.
- **Status:** DONE
- **Notes:** رابط ثبت نهایی در TASK-073 ساخته می‌شود؛ ویرایش پیش‌نویس و اصلاح رویداد نهایی هنوز موجود نیست.

## TASK-073

- **Title:** رابط ثبت نهایی درآمد و هزینه
- **Description:** پیش‌نمایش ردیف‌های بدهکار و بستانکار و ثبت نهایی پیش‌نویس با نمایش شماره سند.
- **Files:** `app/(app)/dashboard/transactions/draft-list.tsx`، `app/(app)/dashboard/transactions/transactions.tsx`
- **Dependencies:** TASK-071، TASK-072
- **Acceptance Criteria:** کاربر مجاز پیش از تأیید حساب‌ها و مبلغ را ببیند، نتیجه یا خطا و شماره سند نمایش داده شود و پیش‌نویس نهایی‌شده از فهرست خارج شود.
- **Testing:** build، lint بخش مرتبط و آزمون یکپارچه API و دسترسی صفحه در دیتابیس مجزا موفق؛ تعامل بصری مرورگر بررسی نشده است.
- **Status:** DONE
- **Notes:** بعد از ثبت نهایی، سند در صفحه اسناد در دسترس است؛ فهرست این صفحه هنوز فقط پیش‌نویس‌ها را نمایش می‌دهد.

## کارهای آینده پیشنهادی

همه موارد زیر **TODO** هستند؛ فایل‌ها مسیرهای احتمالی‌اند و پس از بررسی پیش از اجرا نهایی می‌شوند. هر ردیف یک تسک مستقل است و پس از دستور کاربر آغاز می‌شود. موارد طراحی و آزمون ممکن است به تسک‌های کوچک‌تر تقسیم شوند.

| شناسه | عنوان و شرح | وابستگی | فایل‌های احتمالی | معیار پذیرش | آزمون |
|---|---|---|---|---|---|
| TASK-074 | مدل پیش‌نویس فاکتور و اقلام | TASK-060، TASK-055 | `prisma/`، `docs/DATABASE.md` | مالکیت سازمانی، قیمت دقیق و snapshot اقلام مشخص شود | تست migration و قیود |
| TASK-075 | محاسبه سروری اقلام فاکتور | TASK-074 | `lib/`، `tests/` | تعداد، تخفیف، مالیات و گردکردن با قرارداد دقیق محاسبه شوند | تست موارد مرزی و مبالغ بزرگ |
| TASK-076 | API ایجاد و مشاهده پیش‌نویس فاکتور | TASK-074، TASK-075 | `app/api/invoices/` | انتخاب مشتری و اقلام مجاز با محاسبه سمت سرور | تست دسترسی و محاسبه |
| TASK-077 | رابط پیش‌نویس فاکتور | TASK-076 | `app/(app)/dashboard/invoices/` | انتخاب مشتری، کالا و اقلام با نمایش مبلغ سروری | تست مرورگر |
| TASK-078 | API ویرایش پیش‌نویس فاکتور | TASK-076 | `app/api/invoices/[id]/` | فقط پیش‌نویس مجاز ویرایش و مجدداً محاسبه شود | تست وضعیت و سازمان |
| TASK-079 | رابط ویرایش پیش‌نویس فاکتور | TASK-077، TASK-078 | `app/(app)/dashboard/invoices/` | اصلاح اقلام و نمایش خطا | تست تعاملی |
| TASK-080 | صدور فاکتور و سند مالی | TASK-122، TASK-075، TASK-078 | `app/api/invoices/`، `prisma/` | صدور اتمی، سند متوازن و جلوگیری از صدور مجدد | تست هم‌زمانی و ثبت تکراری |
| TASK-081 | رابط صدور فاکتور | TASK-080 | `app/(app)/dashboard/invoices/` | نمایش پیش‌نمایش و نتیجه صدور | تست مرورگر |
| TASK-082 | مدل دریافت، پرداخت و تخصیص | TASK-074 | `prisma/`، `docs/DATABASE.md` | رابطه سازمانی، مبلغ دقیق و تخصیص قابل ردیابی تعریف شود | تست قیود و migration |
| TASK-083 | ثبت دریافت و تخصیص فاکتور | TASK-080، TASK-082 | `app/api/payments/` | پرداخت جزئی/کامل، سقف مانده و ضدتکرار اتمی باشند | تست اضافه‌پرداخت و هم‌زمانی |
| TASK-084 | رابط ثبت دریافت | TASK-083 | `app/(app)/dashboard/` | فاکتور، مانده و نتیجه پرداخت نمایش داده شوند | تست تعاملی |
| TASK-085 | ثبت پرداخت به تأمین‌کننده | TASK-122، TASK-082 | `app/api/payments/` | پرداخت و سند متوازن با مجوز و ضدتکرار ثبت شود | تست حسابداری و تکرار |
| TASK-086 | رابط ثبت پرداخت | TASK-085 | `app/(app)/dashboard/` | ثبت پرداخت و نمایش نتیجه و خطا | تست تعاملی |
| TASK-087 | گزارش مانده اشخاص و فاکتور | TASK-083، TASK-085 | `app/api/reports/` | مانده از ثبت‌های معتبر بدون دوباره‌شماری محاسبه شود | تست بدهکار، بستانکار و جزئی |
| TASK-088 | رابط گزارش اشخاص و فاکتور | TASK-087 | `app/(app)/dashboard/reports/` | فیلتر و مانده دقیق نمایش داده شود | تست مرورگر |
| TASK-089 | پیش‌نویس سند برگشتی | TASK-037، TASK-039 | `app/api/journal-entries/` | ارجاع به سند نهایی، معکوس‌سازی و جلوگیری از برگشت تکراری | تست توازن، وضعیت و تکرار |
| TASK-090 | رابط سند برگشتی | TASK-089 | `app/(app)/dashboard/journal/` | پیش‌نمایش و ایجاد برگشت مجاز | تست مرورگر |
| TASK-091 | طراحی اختتامیه و انتقال مانده | TASK-025، TASK-089 | `docs/`، `prisma/` | قاعده حساب‌های موقت و دائمی و مسیر بازبینی مشخص شود | بازبینی حسابداری |
| TASK-092 | خروجی گزارش CSV | TASK-045، TASK-047، TASK-049 | `app/api/reports/` | خروجی مجاز سازمان با کدگذاری مناسب فارسی | تست دسترسی و مقادیر |
| TASK-093 | بازه زمانی داشبورد | TASK-051، TASK-053 | `app/api/dashboard/` | اعتبارسنجی بازه در سال و محاسبه دقیق | تست مرزهای شمسی |
| TASK-094 | رابط فیلتر بازه داشبورد | TASK-093 | `app/(app)/dashboard/` | انتخاب شمسی و بازخورد خطا | تست تعاملی |
| TASK-095 | شاخص مطالبات، بدهی و صندوق | TASK-122، TASK-083، TASK-085 | `app/api/dashboard/` | تعریف حساب‌ها و جلوگیری از شمارش تکراری | تست تطبیق مانده |
| TASK-096 | رابط شاخص‌های مالی تکمیلی | TASK-095 | `app/(app)/dashboard/` | نمایش شاخص‌های واقعی با واحد ریال | تست مرورگر |
| TASK-097 | پروفایل و تغییر رمز | TASK-010 | `app/(app)/dashboard/`، `lib/auth.ts` | ویرایش پروفایل و تغییر رمز با کنترل هویت | تست نشست و رمز نامعتبر |
| TASK-098 | اتصال محلی Ollama و وضعیت سرویس | TASK-010 | `lib/`، `app/api/` | مهلت و خطای سرویس محلی مدیریت شود | تست سرویس در دسترس و قطع |
| TASK-099 | ابزار خواندنی AI | TASK-098، TASK-051 | `lib/`، `app/api/` | فقط داده مجاز سازمان از سرویس معتبر خوانده شود | تست مجوز و داده نامعتبر |
| TASK-100 | ابزار پیش‌نویس AI | TASK-099، TASK-070، TASK-076 | `lib/`، `app/api/` | خروجی مدل اعتبارسنجی و تنها پیش‌نویس آماده کند | تست خروجی نامعتبر و عدم ثبت ناخواسته |
| TASK-101 | رابط گفتگو و تأیید AI | TASK-100 | `app/(app)/dashboard/` | پیش‌نمایش و تأیید کاربر پیش از اقدام نوشتنی | تست تعاملی و انصراف |
| TASK-102 | تست هم‌زمانی عملیات مالی | TASK-040، TASK-080، TASK-083 | `tests/` | تداخل بستن سال، صدور و پرداخت به نتایج معتبر برسد | تست چند درخواست هم‌زمان |
| TASK-103 | بازبینی رابط و دسترس‌پذیری | TASK-065، TASK-081، TASK-101، TASK-106، TASK-108، TASK-112، TASK-116، TASK-117، TASK-124، TASK-126، TASK-131، TASK-136 | `app/` | RTL، موبایل، صفحه‌کلید و پیام‌های خطا بازبینی شوند | مرورگر و صفحه‌کلید |
| TASK-104 | سناریوی دمو و راهنمای نهایی | TASK-088، TASK-101، TASK-102، TASK-103، TASK-110، TASK-115 | `docs/`، `README.md` | سناریوی ثبت تا گزارش و راه‌اندازی تکرارپذیر باشد | اجرای سرتاسری |
| TASK-105 | API اختتامیه و انتقال مانده | TASK-091 | `app/api/fiscal-years/`، `prisma/` | اختتامیه طبق طراحی تأییدشده، اتمی و قابل ردیابی باشد | تست توازن و تکرار |
| TASK-106 | رابط اختتامیه | TASK-105 | `app/(app)/dashboard/fiscal-years/` | پیش‌نمایش و نتیجه اختتامیه نمایش داده شود | تست مرورگر |
| TASK-107 | API ابطال فاکتور | TASK-080، TASK-089 | `app/api/invoices/` | محدودیت پرداخت و آثار سند برگشتی رعایت شود | تست وضعیت و تکرار |
| TASK-108 | رابط ابطال فاکتور | TASK-107 | `app/(app)/dashboard/invoices/` | وضعیت و نتیجه ابطال با پیام روشن نمایش داده شود | تست مرورگر |
| TASK-109 | نسخه چاپی فاکتور | TASK-080 | `app/(app)/dashboard/invoices/` | نسخه فارسی مناسب چاپ و اطلاعات لازم نمایش داده شود | بازبینی چاپ |
| TASK-110 | خروجی PDF فاکتور | TASK-109 | `app/(app)/dashboard/invoices/` | PDF فارسی با مبالغ و تاریخ درست ساخته شود | بررسی فایل خروجی |
| TASK-111 | گزارش فروش و فاکتورهای پرداخت‌نشده | TASK-083 | `app/api/reports/` | فروش و مانده فاکتورهای معتبر با فیلتر گزارش شوند | تست پرداخت جزئی و ابطال |
| TASK-112 | رابط گزارش فروش و فاکتورهای پرداخت‌نشده | TASK-111 | `app/(app)/dashboard/reports/` | فیلتر و نتایج فارسی در رابط نمایش داده شوند | تست مرورگر |
| TASK-113 | بک‌اند فیلتر و جزئیات اسناد | TASK-035 | `app/api/journal-entries/` | جزئیات و جست‌وجو بر اساس تاریخ و وضعیت ارائه شوند | تست API |
| TASK-114 | بک‌اند تعداد فاکتور و فروش داشبورد | TASK-080، TASK-111 | `app/api/dashboard/` | تعداد و فروش فقط از فاکتورهای معتبر محاسبه شوند | تست تطبیق فاکتور و گزارش |
| TASK-115 | آزمون مدل محلی و انتخاب نسخه مناسب | TASK-098 | `docs/AI_DESIGN.md`، `tests/` | فارسی، سرعت و پشتیبانی ابزار مدل روی سیستم هدف بررسی شود | سناریوهای فارسی و اندازه‌گیری |
| TASK-116 | رابط فیلتر و جزئیات اسناد | TASK-113 | `app/(app)/dashboard/journal/` | جست‌وجو، فیلتر و جزئیات در دسترس باشند | تست مرورگر |
| TASK-117 | رابط تعداد فاکتور و نمودار فروش | TASK-114 | `app/(app)/dashboard/` | شمارش و فروش دریافتی از API نمایش داده شوند | تست مرورگر |
| TASK-123 | API ویرایش پیش‌نویس درآمد و هزینه | TASK-070 | `app/api/`، `tests/` | فقط پیش‌نویس مجاز همان سازمان و سال باز با اعتبارسنجی حساب‌ها و مبلغ و بدون تغییر رویداد نهایی ویرایش شود | تست دسترسی، اعتبارسنجی و رقابت با ثبت نهایی |
| TASK-124 | رابط ویرایش پیش‌نویس درآمد و هزینه | TASK-123 | `app/(app)/dashboard/` | ویرایش پیش‌نویس، تقویم شمسی و نمایش خطاها در رابط فراهم شود | تست تعاملی و وضعیت نهایی |
| TASK-125 | API فهرست رویدادهای مالی ثبت‌شده | TASK-072 | `app/api/`، `tests/` | فهرست امن در محدوده سازمان و سال با صفحه‌بندی و ارجاع به سند مرتبط ارائه شود | تست نقش، محدوده سازمان و صفحه‌بندی |
| TASK-126 | رابط فهرست درآمد و هزینه ثبت‌شده | TASK-125 | `app/(app)/dashboard/` | رویدادهای ثبت‌شده با امکان مشاهده سند و تفکیک از پیش‌نویس نمایش داده شوند | تست مرورگر و حالت خالی |
| TASK-127 | طراحی انتخاب سازمان فعال | TASK-019 | `docs/ARCHITECTURE.md`، `docs/DATABASE.md` | منبع سازمان فعال، چرخه انتخاب و ابطال عضویت، سازگاری نشست و کنترل دسترسی همه مسیرها مشخص شود | بازبینی سناریوهای چندعضویتی و عدم افشای داده |
| TASK-128 | بک‌اند انتخاب سازمان فعال | TASK-127 | `app/api/`، `lib/`، `prisma/` | انتخاب و بازیابی سازمان فعال در سمت سرور تنها برای عضو مجاز و مطابق طراحی انجام شود | تست نشست، عضویت نامعتبر و تغییر سازمان |
| TASK-129 | اعمال سازمان فعال در APIها | TASK-128 | `app/api/`، `lib/` | همه مسیرهای سازمانی بررسی و به کنترل مشترک و امن سازمان فعال منتقل شوند | تست جداسازی سازمان در مسیرهای موجود |
| TASK-130 | اعمال سازمان فعال در صفحات سروری | TASK-128 | `app/(app)/`، `lib/` | همه خواندن‌های سروری سازمانی با انتخاب و مجوز معتبر سازگار شوند | تست تغییر سازمان و جلوگیری از نمایش داده دیگر سازمان‌ها |
| TASK-131 | رابط انتخاب سازمان فعال | TASK-129، TASK-130 | `app/(app)/` | کاربر چندعضوی بتواند سازمان مجاز را انتخاب کند و داده‌ها با سازمان انتخابی هماهنگ شوند | تست مرورگر، تغییر عضویت و حالت بدون سازمان |
| TASK-132 | طراحی مدیریت اعضا و نقش‌ها | TASK-127 | `docs/PRD.md`، `docs/ARCHITECTURE.md` | افزودن، تغییر نقش و حذف دسترسی، نحوه شناسایی کاربر، مجوزها و حفظ دست‌کم یک مدیر مشخص شوند | بازبینی امنیت و سناریوهای خطا |
| TASK-133 | API فهرست و افزودن اعضا | TASK-128، TASK-132 | `app/api/`، `lib/` | فقط مدیر سازمان مجاز اعضا را مشاهده و طبق طراحی اضافه کند؛ عضویت تکراری و بین‌سازمانی رد شود | تست نقش‌ها و عضویت تکراری |
| TASK-134 | API تغییر نقش اعضا | TASK-133 | `app/api/`، `lib/` | تغییر نقش مجاز و اتمی باشد و آخرین مدیر سازمان حفظ شود | تست نقش‌ها و رقابت تغییر مدیر |
| TASK-135 | API حذف دسترسی اعضا | TASK-134 | `app/api/`، `lib/` | حذف عضویت مجاز باشد، آخرین مدیر حفظ و دسترسی عضو حذف‌شده بی‌درنگ بررسی شود | تست دسترسی پس از حذف و هم‌زمانی |
| TASK-136 | رابط مدیریت اعضا و نقش‌ها | TASK-133، TASK-134، TASK-135 | `app/(app)/dashboard/` | مدیر بتواند اعضا را مشاهده و طبق مجوز اضافه، ویرایش یا حذف کند | تست مرورگر، مجوزها و خطاها |

## TASK-015

- **Title:** استفاده از فونت‌های محلی در رابط کاربر
- **Description:** پیکربندی و اعمال خانواده‌های فونت ارسالی کاربر به‌شکل بهینه و محلی در Next.js.
- **Files:** `app/fonts.ts`، `app/layout.tsx`، `app/globals.css`، `app/(auth)/sign-up/page.tsx`، `docs/TASKS.md`
- **Dependencies:** TASK-013
- **Acceptance Criteria:** رابط فارسی از IRANYekanXFaNum برای متن‌ها و Modam برای عنوان‌ها استفاده کند؛ درخواست شبکه‌ای برای فونت خارجی وجود نداشته باشد.
- **Testing:** TypeScript type check، lint و production build.
- **Status:** DONE

### نتیجه

- فونت‌های محلی IRANYekanXFaNum و Modam با `next/font/local` پیکربندی شدند.
- فونت متن و عنوان به‌ترتیب در کل رابط و عنوان صفحهٔ ثبت‌نام اعمال شدند.
- وابستگی Google Fonts از Root Layout حذف شد.
- اعمال فونت با selector صریح برای متن، کنترل‌های فرم و عنوان مقاوم‌سازی شد.

## TASK-016

- **Title:** هدایت صفحهٔ نخست به ثبت‌نام
- **Description:** حذف صفحهٔ پیش‌فرض Next.js و هدایت بازدیدکنندهٔ ریشهٔ برنامه به صفحهٔ ثبت‌نام.
- **Files:** `app/page.tsx`، `docs/TASKS.md`
- **Dependencies:** TASK-013
- **Acceptance Criteria:** درخواست `GET /` با وضعیت redirect به `/sign-up` پاسخ داده شود.
- **Testing:** بررسی پاسخ HTTP مسیر ریشه و TypeScript type check.
- **Status:** DONE

### نتیجه

- صفحهٔ پیش‌فرض قالب حذف و مسیر `/` به `/sign-up` هدایت شد تا فرم ثبت‌نام در نخستین بازدید نمایش داده شود.
