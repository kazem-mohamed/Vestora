# دليل ملفاتك العملي — قائد الفريق

الملف ده مش للمذاكرة النظرية — ده اللي بتفتحه وإنت قاعد على الجهاز.
بيقولك ملفاتك فين، ومحتاج تنزّل إيه، وإزاي تشغّل وتعرض.

الملف النظري الكامل: `study.pdf` في نفس الفولدر.

---

## ١. الأدوات اللي محتاجها

| الأداة | لإيه | تتأكد إزاي |
|---|---|---|
| .NET 8 SDK | تشغّل الـ API | `dotnet --version` |
| Node.js + npm | تشغّل الفرونت | `node --version` |
| SQL Server | الداتابيز (بعيدة ومشتركة) | — |
| Visual Studio / VS Code | تقرا وتعدّل | — |
| متصفّح بأدوات مطوّر | تفحص الشبكة والاتجاه | Chrome أو Edge |

---

## ٢. ملفاتك — الباكند

### الدفع (أخطر جزء)

| الملف | إيه اللي فيه |
|---|---|
| `Services/Payments/PaymentService.cs` | **1259 سطر — أهم ملف عندك.** كل ما يتعلق بالفلوس. ابدأ من `ApplyProviderResultAsync`. |
| `Services/FundingMath.cs` | **443 سطر.** المصدر الوحيد لأي رقم مالي — وفيه دوال الدفعات. |
| `Controllers/PaymentsController.cs` | نقاط الدفع والـcheckout والـwebhook. |
| `Services/Payments/SimulatedPaymentProvider.cs` | المزوّد الوهمي — نفس آلة الحالة من غير إنترنت. |
| `Services/Payments/StripeSandboxPaymentProvider.cs` | مزوّد Stripe التجريبي. |
| `Services/Payments/PaymentExpirySweeper.cs` | خدمة خلفية بتقفل اللي محدش خلّصه. |

### غرفة الصفقة والتفاوض

| الملف | إيه اللي فيه |
|---|---|
| `Controllers/DealRoomController.cs` | **1287 سطر — أكبر ملف في الباكند.** |
| `Services/TermSheetService.cs` | اقتراح وقبول واستبدال الشروط. |

### الأدمن (ستّة كنترولرز)

| الملف | الأسطر |
|---|---|
| `Controllers/AdminController.cs` | 720 — المستخدمين والأدوار والـbootstrap |
| `Controllers/AdminRevenueController.cs` | 434 — الإيرادات |
| `Controllers/AdminUserOverviewController.cs` | 373 — نظرة الحساب الواحد |
| `Controllers/AdminModerationController.cs` | 238 — طابور المراجعة |
| `Controllers/AdminInsightsController.cs` | 187 — التحليلات التاريخية |
| `Controllers/AdminSearchController.cs` | 141 — البحث الشامل |

### اللوحات

| الملف | الأسطر |
|---|---|
| `Controllers/InvestorController.cs` | 690 |
| `Controllers/FounderDashboardController.cs` | 415 |
| `Controllers/InvestorDashboardController.cs` | 300 |
| `Controllers/CapitalController.cs` | 257 |
| `Controllers/VentureInsightsController.cs` | 177 |

### الرسائل والوقت الفعلي

| الملف | إيه اللي فيه |
|---|---|
| `Controllers/MessagesController.cs` | المحادثات والمرفقات |
| `Controllers/NotificationController.cs` | الإشعارات |
| `Data/Models/Hubs/ChatHub.cs` | قناة SignalR |
| `Services/PresenceTracker.cs` | مين متصل |
| `Services/NotificationFanOutQueue.cs` + `Worker.cs` | الطابور والخدمة الخلفية |

### البنية التحتية

| الملف | إيه اللي فيه |
|---|---|
| `Program.cs` | **400 سطر.** الـDI، الـCORS، الـrate limiting، وحارس مفتاح Stripe. |
| `Services/ServiceResult.cs` | شكل موحّد لرد الخدمات |
| `Services/StageLog.cs` | الطريقة الوحيدة لتغيير مرحلة العلاقة |
| `Services/PipelineStages.cs` | مفردات المراحل |
| `Services/TrustSignals.cs` | إشارات المصداقية |
| `Services/UtcDateTimeConverter.cs` | كل تاريخ UTC |
| `Services/FileUploadSecurityService.cs` | فحص الملفات المرفوعة |

---

## ٣. ملفاتك — الفرونت

| الملف | إيه اللي فيه |
|---|---|
| `lib/api/client.ts` | **الناقل الوحيد.** التوكن وتجديده والأخطاء. |
| `lib/api/*.ts` | 17 ملف — استعلامات كل مجال |
| `lib/types/api.ts` | **1736 سطر** — عقد الأنواع |
| `lib/i18n/dictionaries.ts` | **4896 سطر** — كل نص بلغتين |
| `lib/i18n/locale.tsx` | مزوّد اللغة والاتجاه |
| `app/globals.css` | **775 سطر · 129 توكن** — نظام التصميم |
| `components/landing/` | 12 مكوّن لصفحة الهبوط |
| `components/motion/` | 9 مكوّنات حركة و3D |
| `app/(app)/admin/` | **13 صفحة أدمن** |
| `app/(app)/onboarding/page.tsx` | 590 سطر |

---

## ٤. التشغيل

### الـ API

```bash
cd MyAppApi/MyAppApi
dotnet run
```

Swagger بيفتح على `/swagger`.

### الفرونت

```bash
cd Frontend/vestora
npm install
npm run dev
```

بيفتح على `http://localhost:3000`.

> لو الـ API رفض يشتغل بسبب مفتاح Stripe — **ده مقصود وإنت اللي عملته**.
> لازم مفتاح يبدأ بـ `sk_test_`.

### الأسرار المطلوبة

مش في المستودع (قاعدة 12). محتاج تحطّهم في user secrets أو متغيّرات بيئة:

- `ConnectionStrings:InvestContextDB`
- `JwtSettings:Key` (32 بايت على الأقل)
- `AdminBootstrap:SecretKey`

### التأكّد إن كل حاجة سليمة

```bash
cd MyAppApi
dotnet build
dotnet test MyAppApi.Tests/MyAppApi.Tests.csproj
```

المفروض: **76 اختبار ناجح**.

```bash
cd Frontend/vestora
npx tsc --noEmit
npm run build
```

---

## ٥. سيناريو العرض (٥ دقايق)

1. **اللاندينج** — حرّك الماوس على الهيرو، وري الـ3D
2. **بدّل اللغة** — التخطيط كله بينقلب
3. **لوحة الأدمن** — النظرة العامة والمراجعة والإيرادات
4. **ارفض مشروع بسبب** — وري إن السبب بيوصل للمؤسّس
5. **غرفة الصفقة** — الأقسام الستّة
6. **اقترح شروط واقبلها**
7. **اطلب دفعة جزئية** — وبعدين اطلب أكتر من الفاضل ووري الرفض
8. **ادفع** — شارة الصندوق التجريبي والتأكيد
9. **سجلّ المراجعة** — الفعل بالسبب والفرق والـIP

> أقوى لحظتين: **الخطوة 7** (الدفعات والحارس) و**الخطوة 2** (قلب اللغة).

---

## ٦. لو حد سأل عن شغل عضو تاني

| العضو | ملفه |
|---|---|
| الباكند | `book/study/backend/study.pdf` |
| الفرونت | `book/study/frontend/study.pdf` |
| الداتابيز | `book/study/database/study.pdf` |
| الـ UI/UX | `book/study/ui-ux/study.pdf` |
| التستينج | `book/study/testing/study.pdf` |

خد نظرة على الـ Cheat Sheet بتاع كل واحد — مش عشان تحفظ شغلهم، بس عشان
تعرف تقول «ده بتاع فلان» بثقة.

---

## ٧. التوثيق اللي كتبته

| الملف | بيجاوب |
|---|---|
| `docs/01-OVERVIEW.md` | إيه المنتج والمصطلحات |
| `docs/02-ARCHITECTURE.md` | إزاي النظام متوصّل |
| `docs/03-DATA-MODEL.md` | الأعمدة والقيود |
| `docs/04-API-REFERENCE.md` | الـendpoints |
| `docs/05-BUSINESS-RULES.md` | القواعد اللي ماتتكسرش |
| `docs/06-FRONTEND.md` | المسارات والمكوّنات |
| `docs/07-SETUP.md` | التشغيل |
| `docs/08-CONVENTIONS.md` | إضافة فيتشر |
| `docs/09-STATUS.md` | الناقص |
| `docs/10-ROLES-AND-CAPABILITIES.md` | كل دور يقدر يعمل إيه |
| `docs/11-INVESTMENT-FLOW.md` | رحلة استثمار كاملة |
| `AGENTS.md` | **اتناشر قاعدة ملزمة للفريق** |
