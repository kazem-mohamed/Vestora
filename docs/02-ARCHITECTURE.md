# 02 · معمارية النظام

> إزاي المشروع مبني، والقرارات اللي وراه. المصطلحات التقنية بالإنجليزي زي ما هي في الكود.

---

## 1. الصورة الكبيرة

```
┌──────────────────────────────────────────────────────────────────────┐
│  Browser                                                             │
│  Next.js 16 · App Router · React 19 · TypeScript                     │
│  ┌────────────┬──────────────┬───────────────┬────────────────────┐  │
│  │ TanStack   │ Zustand      │ next-themes   │ LocaleProvider     │  │
│  │ Query      │ (auth store) │ (light/dark)  │ (EN/AR + RTL)      │  │
│  │ (server    │              │               │                    │  │
│  │  cache)    │              │               │                    │  │
│  └────────────┴──────────────┴───────────────┴────────────────────┘  │
└──────────┬────────────────────────────────────┬──────────────────────┘
           │ REST (fetch + Bearer JWT)          │ WebSocket (SignalR)
           │ lib/api/*.ts                       │ ?access_token=…
           ▼                                    ▼
┌──────────────────────────────────────────────────────────────────────┐
│  ASP.NET Core 8 Web API  (http://localhost:5078)                     │
│                                                                      │
│  Middleware: ResponseCompression → Swagger(dev) → ExceptionHandler    │
│              → HttpsRedirection → CORS → RateLimiter → Session        │
│              → Authentication → Authorization → Endpoints             │
│                                                                      │
│  ┌─────────────┐   ┌──────────────┐   ┌──────────────────────────┐   │
│  │ Controllers │──▶│ Services      │──▶│ AppDbContext (EF Core)  │   │
│  │ (22)        │   │ Auth·Payments │   │ 32 DbSet · query filters│   │
│  │             │   │ FundingMath   │   │ TPH · unique indexes    │   │
│  └─────────────┘   └──────────────┘   └──────────────────────────┘   │
│         │                                                            │
│         │  ┌───────────┐  ┌─────────────────────┐  ┌──────────────┐  │
│         └─▶│ ChatHub   │  │ NotificationFanOut  │  │ PaymentExpiry│  │
│            │ (SignalR) │  │ Worker (background) │  │ Sweeper (bg) │  │
│            └───────────┘  └─────────────────────┘  └──────────────┘  │
└──────────────────────────────┬───────────────────────────────────────┘
                               ▼
                    ┌─────────────────────┐    ┌──────────────────┐
                    │ SQL Server          │    │ SMTP (MailKit)   │
                    │ (MonsterASP remote) │    │ Stripe REST (test)│
                    └─────────────────────┘    └──────────────────┘
```

---

## 2. الـ Backend — `MyAppApi/MyAppApi`

### 2.1 هيكل المجلدات

```
MyAppApi/
├── Program.cs              ← نقطة الدخول: DI, auth, CORS, rate limiting, middleware
├── appsettings.json        ← إعدادات غير سرّية فقط (كل السرّ فاضي عمدًا)
├── Controllers/            ← 22 controller — طبقة HTTP فقط
├── Data/
│   ├── AppDbContext.cs     ← الـ DbSets + OnModelCreating (كل العلاقات والقيود)
│   └── Models/             ← الـ entities
│       ├── DTOs/           ← عقود الإدخال والإخراج
│       └── Hubs/ChatHub.cs ← SignalR hub
├── Migrations/             ← 22 EF migration
├── Services/               ← منطق العمل والخدمات المشتركة
│   └── Payments/           ← نظام الدفع (adapter pattern)
└── Settings/               ← كلاسات الإعدادات (Options pattern)
```

### 2.2 الطبقات — والحقيقة عنها

المشروع **مش** Clean Architecture ومفيش Repository pattern. المعمارية الفعلية:

```
Controller  →  (Service حيثما وُجد)  →  AppDbContext  →  SQL
```

- **الأغلبية**: الـ controller بيتكلّم مع `AppDbContext` مباشرة بـ LINQ. `EF Core DbSet` هو الـ repository.
- **الاستثناءات** (فيها service layer حقيقي): `AuthService` و `PaymentService` — لأن الاتنين فيهم منطق حسّاس ومتعدّد الخطوات.
- الخدمات الحسّاسة بترجّع `ServiceResult<T>` (Ok / Created / NoContent / BadRequest / Unauthorized / Forbidden / NotFound) والـ controller بيحوّلها لـ HTTP بـ `this.ToActionResult(result)` — عشان الـ service ميعرفش حاجة عن HTTP.

> **مهم للـ AI models:** متفترضش وجود repositories أو use-cases. لو بتضيف endpoint بسيط، اكتبه في الـ controller بنفس أسلوب اللي جنبه. اعمل service بس لو المنطق بيتشارك بين أكتر من controller أو بيلمس فلوس.

### 2.3 الخدمات المشتركة (`Services/`)

| الملف | مسؤوليته |
|---|---|
| **`FundingMath.cs`** | **المصدر الوحيد** لكل رقم مالي. Expression trees بتتترجم SQL + `SummariesAsync` لتحميل مجمّع. |
| **`PipelineStages.cs`** | مفردات الـ 8 مراحل + `CountsTowardFunding()`. |
| **`AccountRules.cs`** | قواعد التحقّق (باسورد/اسم/إيميل/تليفون/تاريخ ميلاد) + Validation Attributes. مرآة لـ `lib/validation/rules.ts` بالحرف. |
| **`TrustSignals.cs`** | بناء إشارات الثقة من حقائق فعلية بس. |
| **`AuthService.cs`** | تسجيل، دخول، refresh، تفعيل إيميل، إعادة تعيين باسورد، قفل الحساب، تسجيل أمني. |
| **`FileUploadSecurityService.cs`** | فحص الصور: الحجم + الـ content type + **توقيع البايتات (magic numbers)**. |
| **`MailKitEmailService.cs`** | SMTP. تبديل المزوّد = إعدادات، مش كود. |
| **`NotificationFanOutQueue/Worker`** | طابور داخلي (`System.Threading.Channels`) عشان "بلّغ كل المتابعين" ميعطّلش الـ request. |
| **`NotificationPush.cs`** | Extension بتدفع الإشعار لحظيًا على مجموعة `user:{id}` في SignalR. |
| **`PresenceTracker.cs`** | Singleton بيعدّ الاتصالات الحيّة لكل مستخدم (تابات كتير = مستخدم واحد online). |
| **`UtcDateTimeConverter.cs`** | **حرج** — SQL Server بيرجّع `DateTimeKind.Unspecified`، فالمتصفّح بيقراها كتوقيت محلّي. الـ converter ده بيختم كل تاريخ بـ `Z`. |
| **`ServiceResult.cs`** | نتيجة محايدة عن HTTP. |

### 2.4 الـ Background workers

| Worker | كل قد إيه | بيعمل إيه |
|---|---|---|
| `NotificationFanOutWorker` | مستمرّ (channel reader) | بيفرغ طابور الإشعارات → يكتبها في DB → يدفعها عبر SignalR |
| `PaymentExpirySweeper` | دوري | بيقفل محاولات الدفع المهجورة (`Initiated`/`Processing` بعد `ExpiresAtUtc`) → `Cancelled`، وبيخلّي الـ funding requests المنتهية `Expired` عشان تفضّي مكان في الجولة |

### 2.5 المدفوعات — Adapter pattern

```
PaymentsController → PaymentService → IPaymentProvider
                                          ├── SimulatedPaymentProvider    (افتراضي، أوفلاين)
                                          └── StripeSandboxPaymentProvider (HttpClient على REST مباشرة)
```

- الاختيار بيتم في `Program.cs` وقت الإقلاع حسب `Payments:Provider` ووجود `sk_test_` key.
- **مفيش Stripe SDK** — الـ adapter بيكلّم 3 endpoints بس عبر `HttpClient`.
- `StripeWebhookVerifier` بيتحقّق من توقيع الـ webhook.
- **التطبيق بيرمي exception ويرفض يقلع** لو المفتاح مش `sk_test_` — الفحص متكرّر مرتين (Program.cs + constructor الـ provider).

---

## 3. المصادقة والأمان

### 3.1 دورة حياة الـ token

```
POST /api/auth/login
   ↓
accessToken  (JWT · 60 دقيقة · في ذاكرة الـ JS بس)
refreshToken (عشوائي · 14 يوم · متخزّن hashed في DB · في localStorage عند العميل)
   ↓ أي طلب
Authorization: Bearer <accessToken>
   ↓ لو رجع 401
POST /api/auth/refresh  ← single-flight في lib/api/client.ts (كل الـ 401 المتزامنة بتشارك طلب واحد)
   ↓ لو فشل
clearSession() → /login
```

**تفاصيل مهمة:**
- الـ `refreshToken` بيتخزّن في DB كـ **hash** (`RefreshToken.TokenHash` عليه unique index) — القيمة الخام مبتتخزّنش أبدًا.
- الـ JWT بيحمل `NameIdentifier` (userId) و `Role` (= `UserType`).
- `ClockSkew = TimeSpan.Zero` — الانتهاء بيتحسب بالثانية مفيش تسامح.
- SignalR مبيقدرش يبعت header في الـ handshake، فالـ token بيتبعت في query string (`?access_token=…`) و`OnMessageReceived` بيلقطه لمسارات `/hubs` بس.

### 3.2 حماية الحساب

| الحماية | القيمة | مكانها |
|---|---|---|
| قفل بعد محاولات فاشلة | 5 محاولات → 15 دقيقة | `AuthSecurity:MaxFailedLoginAttempts` / `LockoutMinutes` |
| صلاحية كود التفعيل | 60 دقيقة | `EmailVerificationTokenMinutes` |
| صلاحية كود إعادة التعيين | 10 دقايق | `PasswordResetTokenMinutes` |
| فترة انتظار قبل إعادة الإرسال | 60 ثانية | `…ResendCooldownSeconds` |
| إيميل مفعَّل شرط للدخول | `true` | `RequireVerifiedEmailForLogin` |
| تشفير الباسورد | BCrypt | `BCrypt.Net-Next` |
| سجلّ أمني | كل حدث | `SecurityLog` (دخول ناجح/فاشل، قفل، منع معلَّق) |

### 3.3 Rate limiting

`PartitionedRateLimiter` بيقسّم حسب `user:{id}` للمسجّلين و `ip:{address}` للزوّار:

| السياسة | الحدّ |
|---|---|
| **Global** (كل الطلبات) | 100 / دقيقة |
| **Auth** (كل `AuthController`) | 10 / دقيقة |
| **PasswordReset** (نسيان/إعادة تعيين/إعادة إرسال/admin bootstrap) | 3 / 10 دقايق |
| **Checkout** (فتح جلسة دفع) | 8 / 5 دقايق |

### 3.4 رفع الملفات

`FileUploadSecurityService` بيرفض الملف لو أي واحدة اتكسرت:
1. الحجم > 2 ميجا (`MaxImageBytes`).
2. الـ content type مش في القايمة المسموحة (jpeg/png/gif/bmp).
3. **توقيع البايتات مش مطابق للنوع المعلَن** — ده اللي بيمنع رفع ملف تنفيذي مسمّى `.jpg`.

كل الصور والمستندات بتتخزّن `varbinary` جوّه قاعدة البيانات (مفيش تخزين خارجي).

### 3.5 الأخطاء

`UseExceptionHandler` بيلوّج الاستثناء كامل على السيرفر، وبيرجّع `ProblemDetails` عام للعميل — **مفيش stack trace بيوصل المتصفّح أبدًا**.

---

## 4. الـ Realtime — SignalR

Hub واحد على `/hubs/chat` (`Data/Models/Hubs/ChatHub.cs`).

**عند الاتصال (`OnConnectedAsync`):**
1. المستخدم بينضمّ لمجموعة `user:{id}`.
2. `PresenceTracker.Connect()` — لو أول اتصال، كل شركاء المحادثات بيتبلّغوا إنه online.

**عند الانفصال:** لو آخر اتصال قفل → `User.LastSeenAt = UtcNow` (دائم في DB) + إبلاغ الشركاء.

**الأحداث المتاحة:**

| من العميل | من السيرفر |
|---|---|
| `GetPresence(int[] userIds)` | `ReceiveMessage` |
| `Typing(receiverId, isTyping)` | `ReceiveNotification` |
| `SendMessage(receiverId, content)` | أحداث الحضور / الكتابة / القراءة |

**نفس صيغة التاريخ:** الـ Hub مسجَّل بنفس `UtcDateTimeConverter` بتاع الـ REST — عشان الرسالة اللحظية والرسالة المحمّلة من التاريخ يطلعوا بنفس التوقيت بالظبط.

---

## 5. الـ Frontend — `Frontend/vestora`

التفاصيل الكاملة في [06-FRONTEND.md](06-FRONTEND.md). هنا الطبقات بس:

```
app/                    ← الـ routes (App Router)
├── (app)/              ← route group محمي — كل اللي جوّاه ورا RequireAuth + SiteHeader
├── projects/ · u/ · legal/ · about/ …  ← المسارات العامة
└── layout.tsx          ← الخطوط + الـ metadata + <Providers>

components/             ← 145 component مقسّمين بالمجال (ui/ = 22 primitive)
lib/
├── api/                ← 17 module — كل استدعاء HTTP في المشروع بيعدّي من هنا
├── auth/               ← zustand store + تخزين الـ refresh token
├── hooks/              ← 9 TanStack Query hooks
├── i18n/               ← قاموس EN/AR (4259 سطر) + LocaleProvider
├── types/api.ts        ← 1318 سطر — عقد الأنواع المطابق للـ DTOs
└── …                   ← browse · chat · deals · format · nav · notifications · validation
```

### تدفّق البيانات

```
Component
   ↓ useQuery / useMutation
lib/hooks/use-*.ts
   ↓
lib/api/*.ts       ← بيبني المسار والـ body
   ↓
lib/api/client.ts  ← بيحطّ الـ Bearer، بيعمل refresh عند 401، بيوحّد شكل الخطأ (ApiError)
   ↓
Backend
```

**قواعد ثابتة:**
- **مفيش `fetch` مباشر** في أي component — كله عبر `lib/api/*`.
- **الحالة من السيرفر** ملك TanStack Query. **حالة الجلسة** ملك Zustand. متخلطهمش.
- الـ `accessToken` في الذاكرة بس؛ الـ `refreshToken` في `localStorage` تحت مفتاح `vestora.refreshToken`.

---

## 6. قرارات معمارية مهمة (ولماذا)

| القرار | السبب |
|---|---|
| **Soft delete** على `User` و `Project` عبر global query filter | الحذف الإداري لازم يبقى قابل للاسترجاع، ومن غير ما نضطر نـ cascade كل جدول تابع يدويًا. للوصول للمحذوف: `IgnoreQueryFilters()`. |
| **TPH** (جدول واحد للمستخدمين) بدل جدول لكل نوع | كل الـ FKs بتشاور على `Users` مرة واحدة، والـ JWT role بيتقرأ من عمود واحد. |
| **`decimal(18,2)`** صريحة على كل عمود فلوس | من غيرها SQL Server بيرجع لـ `decimal(18,0)` وبيقصّ الكسور بصمت. |
| **قيود على مستوى DB** مش على مستوى الكود | كود التطبيق بيخسر الـ races، الـ unique index لأ. أربع قيود بتحمل نزاهة نظام الدفع كله (تفاصيلها في [05-BUSINESS-RULES.md](05-BUSINESS-RULES.md)). |
| **`FundingMath` مصدر وحيد** | قبله كان نفس الحساب متكرّر في 15 مكان وبيتّفقوا بالصدفة — وكلهم كانوا بيسمّوا موافقة المؤسّس "raised". |
| **RowVersion على `PaymentTransaction`** | الـ webhook والـ return-verify ممكن يوصلوا في نفس اللحظة. الخسران في السباق بيعتبرها نجاح لأن الكسبان عمل الشغل. |
| **Adapter للدفع** | الـ demo مينفعش يبقى رهينة الشبكة؛ نفس الـ state machine بالظبط في الوضعين. |
| **صور/مستندات في DB** | مفيش تخزين سحابي في نطاق المشروع. **مقايضة معروفة**: حجم DB ومصرف ذاكرة. |
| **Client-side auth guard** | التوكن في الذاكرة مش في cookie، فالسيرفر مش شايفه وقت الـ SSR. الحماية الحقيقية في الـ backend. |
| **مفيش `fetch` في components** | ضمان إن الـ refresh والـ error shape يتطبّقوا في مكان واحد. |

---

## 7. الحدود الخارجية

| الخدمة | الاستخدام | الحالة |
|---|---|---|
| **SQL Server** (MonsterASP) | كل البيانات | مطلوب — التطبيق بيجرّب `InvestContextDB` الأول وبعدين `InvestContextDBMonster` |
| **SMTP** (MailKit) | كود التفعيل + إعادة تعيين الباسورد | مطلوب للتسجيل الكامل — في التطوير ممكن `LogCodesInDevelopment` |
| **Stripe** (test mode) | checkout حقيقي في الـ sandbox | اختياري — الافتراضي simulator أوفلاين |

كلهم متضبوطين عبر **user secrets** (تطوير) أو **environment variables** (إنتاج). لا شيء منهم في ملف مرفوع.
