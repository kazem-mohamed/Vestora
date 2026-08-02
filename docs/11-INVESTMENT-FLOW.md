# 11 · رحلة الاستثمار الكاملة (End-to-End Flow)

> من أول ما المؤسّس يرفع المشروع، لحد ما الجولة تتقفل — **بالطرفين جنب بعض**، ومع اللي بيحصل في النظام في كل خطوة.
> كل خطوة فيها: **مين بيعمل** · **الشاشة** · **الـ endpoint** · **إيه اللي بيتغيّر في قاعدة البيانات** · **مين بيتبلّغ**.

---

## الخريطة الكاملة في نظرة

```
                🚀 المؤسّس                    │            💰 المستثمر
────────────────────────────────────────────┼────────────────────────────────────────
 0  ينشئ المشروع  ── PendingReview           │
                    ▼                        │
 1        🛡️ أدمن يراجع → Approved            │
                    ▼                        │
 2  يبني الملف (صور·فريق·خريطة·مستندات)      │  يتصفّح ويكتشف ويحفظ
                                             │            ▼
 3                                           │  يقدّم طلب دعم ── Investment(Pending·New)
                    ◀────────────────────────┘            │  ← Interest
                    ▼                                     │
 4  يوافق ── Status=Approved · Stage=Approved ────────────▶│  ← Committed
                    ▼                                     │
 5  يحرّك المراحل: Contacted → InDiscussion   ◀───────────▶│  غرفة الصفقة تفتح
                    │                                     │
 6  يرد على الأسئلة ويلبّي طلبات المستندات ◀──────────────┤  يسأل ويطلب مستندات
                    ▼                                     │
 7  «Request Funds» ── FundingRequest(Open) ──────────────▶│  ← PaymentDue
      Stage → Committed                                   │
                                                          ▼
 8                                              يدفع (sandbox) ── Transaction
                                                          │
                    ◀──────── Succeeded ──────────────────┘  ← Funded ✅
                    ▼                                     │
 9  يقفل الجولة بنتيجة معلَنة                              │  يكتب تزكية (لو مؤهَّل)
                                                          │
10        🛡️ أدمن يقدر يعمل refund لو لزم    ◀────────────┘
```

**الأربع أرقام بتتحرّك كده:**

| المرحلة | Interest | Committed | PaymentDue | Funded |
|---|:---:|:---:|:---:|:---:|
| 3 · طلب دعم اتقدّم | **+** | — | — | — |
| 4 · المؤسّس وافق | **−** | **+** | — | — |
| 7 · طلب تمويل اتبعت | — | ثابت | **+** | — |
| 8 · الدفعة تمّت | — | ثابت | **−** | **+** |
| 10 · refund | — | ثابت | — | **−** |

> لاحظ: **Committed مبيتحرّكش عند الدفع.** الالتزام موجود من ساعة الموافقة؛ الدفع بيضيف Funded جنبه، مش بدله.

---

## المرحلة 0 — المؤسّس ينشئ المشروع

| | |
|---|---|
| **مين** | 🚀 المؤسّس |
| **الشاشة** | `/my-projects/new` |
| **الـ endpoint** | `POST /api/projects` (body: `ProjectDto`) |

**البيانات المطلوبة:** الاسم · الوصف · **المبلغ المطلوب** (`InvestmentNeeded`) · القطاع · المكان · وشروط الصفقة (المرحلة · التقييم · نسبة الأسهم · استخدام الأموال).

**في قاعدة البيانات:**
```
Project ← جديد
  ModerationStatus = "PendingReview"     ← مش ظاهر للعامة
  LifecycleStatus  = "Active"
  CreatedDate      = UtcNow
  OwnerId          = المؤسّس
```

**المستثمر بيشوف:** لا شيء. المشروع مش موجود بالنسبة له لسه.
**المؤسّس بيشوف:** المشروع في `/my-projects` بعلامة "تحت المراجعة"، ويقدر يعاينه.

---

## المرحلة 1 — الأدمن يراجع

| | |
|---|---|
| **مين** | 🛡️ الأدمن |
| **الشاشة** | `/admin/review` |
| **الـ endpoint** | `GET /api/admin/projects/pending` ثم `POST .../approve` أو `.../reject` |

### ✅ لو وافق

```
Project.ModerationStatus = "Approved"
Project.ModeratedAtUtc   = UtcNow
AdminAuditLog            ← صفّ جديد (مين وافق وإمتى)
```
**إشعار `NewProject`** بيتبعت **لكل متابعي المؤسّس** — عن طريق طابور خلفي (`NotificationFanOutQueue`) عشان الطلب ميتعطّلش.

**من دلوقتي المشروع ظاهر في `/projects` للكل — حتى الزوّار.**

### ❌ لو رفض

```
Project.ModerationStatus = "Rejected"
Project.ModerationNote   = السبب     ← متخزّن على المشروع نفسه، مش بس في إشعار
```
**إشعار `ProjectRejected`** للمؤسّس، في مسار **«محتاجك»**، وبيوجّهه لـ `/my-projects/{id}/edit` — المكان اللي هيقرا فيه السبب ويصلّح.

> **ليه السبب بيتخزّن؟** عشان الطابور الإداري والمؤسّس يقدروا يقروه بعدين. الإشعار بيتقري مرّة ويضيع.

---

## المرحلة 2 — الجانبين بيشتغلوا بالتوازي

### 🚀 المؤسّس: يبني ملف يستاهل الاستثمار

| الحاجة | الـ endpoint | ليه مهمّة |
|---|---|---|
| **صور** | `POST /api/projects/{id}/images` | المعرض |
| **تحديثات** | `POST /api/projects/{id}/updates` | كل تحديث **بيبعت إشعار للمتابعين** |
| **خارطة طريق** | `POST /api/projects/{id}/milestones` | بحالة ونسبة إنجاز — **إشارة الثقة `roadmap_maintained` مبتظهرش إلا لو فيه milestone خلص فعلًا** |
| **الفريق** | `POST /api/projects/{id}/team` | الإيميل بيتخزّن **ومبيظهرش لغير المالك** |
| **المستندات** | `POST /api/projects/{id}/documents` | `Public` للكل · `BackersOnly` للداعمين المعتمَدين بس |

### 💰 المستثمر: يكتشف

```
/projects  →  بحث · فلاتر (قطاع·مكان·مرحلة·حالة الالتزام) · ترتيب
   │
   ├─ يحفظ المشروع            POST /api/bookmarks/{projectId}
   ├─ يحفظ البحث نفسه          POST /api/signals/searches
   │      └─ بيقول له بعدين كام مشروع جديد ظهر من آخر مرّة شافه
   └─ يفتح التفاصيل            GET /api/projects/details/{id}
          └─ بيتسجّل ProjectView (بتتمنع التكرار بالبصمة)
```

**اللي بيشوفه في صفحة التفاصيل:** الوصف · الصور · **شروط الصفقة** · الفريق · خارطة الطريق · التحديثات · التقييمات · **المستندات العامة** · إشارات الثقة · نسبة التمويل.
**اللي مبيشوفهوش:** مستندات `BackersOnly` — لسه مش داعم.

---

## المرحلة 3 — المستثمر يقدّم طلب دعم

| | |
|---|---|
| **مين** | 💰 المستثمر |
| **الشاشة** | `/projects/{id}` → زرّ **Support** (`support-modal`) |
| **الـ endpoint** | `POST /api/investor/{projectId}/support` |

**بيدخل:** المبلغ · طريقة التواصل (`ContactMethod`) · قيمتها (`ContactValue`).

**الطلب بيترفض لو أي واحدة اتحقّقت:**

| # | الشرط | الرسالة |
|---|---|---|
| 1 | المبلغ ≤ 0 | *Support amount must be greater than zero.* |
| 2 | هو صاحب المشروع | *Project owner cannot support their own project.* |
| 3 | المشروع `Paused` أو `Closed` | *This venture is not accepting new support requests.* |
| 4 | `ModerationStatus != Approved` | *This venture is not open for support yet.* |
| 5 | المبلغ > المتبقّي في الجولة | *Amount exceeds the remaining funding need (…).* |
| 6 | عنده طلب `Pending`/`Approved` بالفعل | *You already have a support request for this project.* |

> **الشرط 5 بيتقاس على `Committed` مش على `Funded`.** مؤسّس قبل الهدف كامل لازم يوقف الطلبات الجديدة **حتى لو محدّش دفع** — وإلا أول ما الدفعات تنزل تبقى الجولة زيادة عن الهدف ولازم حد اتقاله "أيوه" يتقاله "لأ".

**في قاعدة البيانات:**
```
Investment ← جديد
  Status      = "Pending"
  Stage       = "New"
  Amount      = المبلغ
  ContactInfo = "Email: someone@x.com"   ← الطريقة والقيمة مع بعض
  Date        = UtcNow
```
> **ليه الطريقة والقيمة مع بعض؟** قبل كده كان بيتخزّن الطريقة بس، فالمؤسّس كان بيلاقي كلمة "Email" من غير عنوان يبعت عليه.

**إشعارين لحظيين (SignalR):**

| المستلم | النوع | المسار | ملاحظة |
|---|---|---|---|
| 🚀 المؤسّس | `ProjectSupported` | **محتاجك** | **قابل للحسم من الصفّ نفسه** — موافقة/رفض من غير ما يسيب الصفحة |
| 💰 المستثمر | `ProjectSupportSubmitted` | نشاط | تأكيد إن طلبه وصل |

**الرقم اللي اتحرّك:** `Interest += المبلغ`. **دي مش فلوس ولا التزام** — دي طلب مستنّي قرار.

---

## المرحلة 4 — المؤسّس يقرّر

| | |
|---|---|
| **مين** | 🚀 المؤسّس |
| **الشاشة** | `/dashboard/requests` أو من صفّ الإشعار في `/notifications` |

### ✅ الموافقة

`POST /api/notification/{notificationId}/approve-support`

```
Investment.Status         = "Approved"
Investment.Stage          = "Approved"
Investment.StageUpdatedAt = UtcNow
Notification.IsRead       = true          ← بيتقفل لأنه اتحسم، مش لأنه اتقري
```

**إشعار `ProjectSupportApproved`** للمستثمر (مسار **نتيجة**).

**اللي بيتفتح دلوقتي:**
- 🔓 **غرفة الصفقة** `/deals/{investmentId}` للطرفين
- 🔓 **مستندات `BackersOnly`** بقت متاحة للمستثمر
- 🔓 **بيانات تواصل المستثمر** بقت ظاهرة للمؤسّس في `/api/investor/{projectId}/backers`

**الأرقام:** `Interest −= المبلغ` · `Committed += المبلغ`.

> ⚠️ **الموافقة مش فلوس.** دي قبول للعلاقة. الرقم اسمه **Committed** — ولا مرّة "raised" ولا "funded".

### ❌ الرفض

`POST /api/investor/{investmentId}/reject-support`

```
Investment.Status = "Declined"
Investment.Stage  = "Declined"      ← الصفّ بيفضل، عمره ما يتمسح
CloseFundingForAsync()              ← بيلغي أي طلب تمويل مفتوح وأي محاولة دفع جارية
```
**إشعار `ProjectSupportRejected`** للمستثمر. `Interest −= المبلغ`.

> 🔒 **استثمار اتموّل مينفعش يترفض** — لا من هنا ولا من تغيير المرحلة. الرد: *"Request a refund instead."* عكس فلوس وصلت إجراء إداري بسجلّ تدقيق، مش قائمة منسدلة على لوحة.

---

## المرحلة 5 — تحريك العلاقة على الـ Pipeline

| | |
|---|---|
| **مين** | 🚀 المؤسّس **فقط** (المستثمر بياخد **403**) |
| **الشاشة** | `/dashboard/requests` |
| **الـ endpoint** | `PATCH /api/investor/investments/{investmentId}/stage` |

```
New → Reviewing → Approved → Contacted → InDiscussion → Committed → Closed
                                                              └──▶ Declined
```

**قاعدتين مهمّتين:**
1. **أي مرحلة من `Approved` وطالع بتخلّي `Status = "Approved"` تلقائيًا** — بوّابة التمويل بتفضل متّسقة مع الـ pipeline من غير خطوة زيادة.
2. **`Declined` بتقفل كل حاجة**: `Status` كمان، السبب بيتخزّن، وأي طلب تمويل مفتوح أو محاولة دفع جارية بتتلغي.

**الملاحظات الخاصة** (بتتكتب في أي وقت من هنا):

| | الـ endpoint | مين يقراها |
|---|---|---|
| 🚀 `FounderNote` | `PUT /api/investor/investments/{id}/founder-note` | المؤسّس بس |
| 💰 `InvestorNote` | `PUT /api/investor/investments/{id}/investor-note` | المستثمر بس |

> **مركز الإجراءات** بيحسب علاقة قعدت على `Approved` من غير ما حد يكلّمها كـ **`ApprovedAwaitingContact`** — ده أشهر مكان بتقف فيه العلاقة، فالنظام بيعدّه ويقوله بالرقم.

---

## المرحلة 6 — غرفة الصفقة

| | |
|---|---|
| **مين** | الطرفين (والأدمن يقدر يقرا) |
| **الشاشة** | `/deals/{investmentId}` |
| **الـ endpoint** | `GET /api/deals/{investmentId}` |

**اللي بيرجع في استدعاء واحد:** الطرفين · **حالة التمويل** · الأسئلة · طلبات المستندات · المستندات · **جدول زمني كامل** · **خطوات تالية مشتقّة**.

### الأسئلة

| العملية | مين | الـ endpoint | الإشعار |
|---|---|---|---|
| يسأل | الطرفين | `POST /api/deals/{id}/questions` | `deal_question` → **محتاجك** |
| يرد | الطرف التاني | `PUT /api/deals/questions/{qid}/answer` | `deal_answer` → نتيجة |
| يسحب | صاحب السؤال | `POST .../withdraw` | — |

### طلبات المستندات

| العملية | مين | الـ endpoint | الإشعار |
|---|---|---|---|
| يطلب مستند | عادةً 💰 | `POST /api/deals/{id}/document-requests` | `doc_request` → **محتاجك** |
| يلبّي (بربط مستند) | 🚀 | `PUT /api/deals/document-requests/{rid}` | `doc_fulfilled` → نتيجة |
| يرفض بسبب | 🚀 | نفس الـ endpoint | `doc_declined` → نتيجة |
| يسحب | صاحب الطلب | `POST .../withdraw` | — |

> **لو المؤسّس مسح المستند اللي كان بيلبّي الطلب** → الطلب **بيترجع مفتوح تلقائيًا** بدل ما يختفي معاه.

**الجدول الزمني** بيجمّع كل حاجة بترتيب زمني: فتح العلاقة · تغييرات المراحل · الأسئلة والأجوبة · طلبات المستندات · المستندات المنشورة · الرسائل · الرفض · إغلاق الجولة.

---

## المرحلة 7 — المؤسّس يطلب الفلوس

> 🔑 **دي الخطوة اللي بتفصل «اتفقنا» عن «الفلوس وصلت».**
> الموافقة (مرحلة 4) كانت قبول للعلاقة. لسه محدّش اتفق على رقم نهائي.

| | |
|---|---|
| **مين** | 🚀 المؤسّس |
| **الشاشة** | `/dashboard/funding` أو من غرفة الصفقة (`request-funds-dialog`) |
| **الـ endpoint** | `POST /api/payments/investments/{investmentId}/funding-request` |

**بيدخل:** **المبلغ النهائي** (رقمه هو، مش اللي المستثمر بدأ بيه) + ملاحظة قصيرة.

**بيترفض لو:**

| # | الشرط |
|---|---|
| 1 | مش صاحب المشروع → **403** |
| 2 | العلاقة ملهاش مستثمر |
| 3 | `Status != "Approved"` → *Approve this request before asking for funds.* |
| 4 | المرحلة `Declined` أو `Closed` |
| 5 | الجولة `Closed` |
| 6 | المبلغ ≤ 0 أو > 100,000,000 |
| 7 | فيه طلب `Open` بالفعل على نفس العلاقة |
| 8 | فيه دفعة **لسه ناجحة** على نفس العلاقة |
| 9 | المبلغ > المتبقّي في الجولة (**بعد استبعاد التزام العلاقة دي نفسها**) |

> **الشرط 9 بيستبعد العلاقة الحالية** — لأن التزامها موجود أصلًا في الإجمالي، ومن غير الاستبعاد ده المؤسّس عمره ما هيقدر يطلب آخر صفقة.
>
> **الشرط 8 بيبصّ على المعاملة مش على حالة الطلب** — طلب اترجّعت فلوسه بيفضل `Paid` عن قصد (هو **اتدفع** وبعدين **اتعكس**)، بس الفلوس راحت، فالمؤسّس لازم يقدر يطلب تاني. لو قرينا حالة الطلب هنا، كل صفقة اترجّعت هتتجمّد للأبد.

**في قاعدة البيانات:**
```
FundingRequest ← جديد
  Reference    = "VST-FR-2026-000042"     ← رقم يتقال في مكالمة
  Status       = "Open"
  Amount       = المبلغ النهائي
  ExpiresAtUtc = UtcNow + 14 يوم
Investment.Stage → "Committed"            ← طلب الفلوس أوضح إعلان إن الشروط اتفقت
AdminAuditLog  ← صفّ جديد
```

🔒 **قيد قاعدة بيانات #1:** `UX_FundingRequests_OneOpenPerInvestment` — **طلب مفتوح واحد بحد أقصى لكل علاقة**. اتنين يعني الصفقة ممكن تتموّل مرّتين.

**إشعار `funding_requested`** للمستثمر — في مسار **«محتاجك»** لأنه فلوس مطلوبة منه، وبيوجّهه لغرفة الصفقة حيث زرّ الدفع.

**الرقم:** `PaymentDue += المبلغ`. **رأس مال موعود، لسه مش واصل.**

---

## المرحلة 8 — المستثمر يدفع

### 8.1 فتح صفحة الدفع

| | |
|---|---|
| **مين** | 💰 المستثمر |
| **الشاشة** | `/deals/{id}` → **Complete investment** |
| **الـ endpoint** | `POST /api/payments/funding-requests/{id}/checkout` (محدود: 8 / 5 دقايق) |

```
PaymentTransaction ← جديد
  Reference     = "VST-2026-000123"
  Status        = "Initiated"
  AttemptNumber = 1
  Amount        = مبلغ الطلب
  Provider      = "simulated" أو "stripe"
  ExpiresAtUtc  = UtcNow + 35 دقيقة
  CheckoutUrl   = رابط صفحة الدفع
```

🔒 **قيد #2:** `UX_PaymentTransactions_OneActivePerRequest` — **محاولة حيّة واحدة بس**.

**حالتين خاصّتين:**
- فيه **محاولة حيّة صالحة** → بيرجّع نفس الرابط بـ `Resumed: true`، **مش بيعمل واحدة جديدة**. اتنين checkout مفتوحين = أقصر طريق لدفع نفس الحاجة مرّتين.
- فيه **محاولة حيّة منتهية** → بتتقفل `Cancelled/abandoned` الأول عشان سجلّ المحاولات يفضل صادق.

### 8.2 الدفع

| المزوّد | الصفحة |
|---|---|
| `simulated` | `/payments/sandbox-checkout` — صفحة داخلية بتخلّيك تختار النتيجة (نجاح/فشل/إلغاء) |
| `stripe` | صفحة Stripe الحقيقية بكروت الاختبار |

### 8.3 الرجوع والتأكيد

```
المتصفّح بيرجع لـ /payments/return
        │
        ▼
POST /api/payments/transactions/{id}/verify   ← تحقّق من جهة السيرفر
        │
        │        وفي نفس اللحظة ممكن يوصل:
        │        POST /api/payments/webhook/stripe   ← webhook بتوقيع متحقَّق
        ▼
   الاتنين بيكتبوا PaymentEvent الأول
        │
   🔒 قيد #4: UX_PaymentEvents_ProviderEventId
        │
        ├─ اتصادم؟ → { received: true, applied: false }  ← مفيش حاجة بتتنفّذ
        └─ لأ → التنفيذ
```

> ⚠️ **الرجوع للمتصفّح مش دليل على الدفع أبدًا.** الوصول لصفحة النجاح بيشغّل تحقّق من السيرفر وبس. التسوية بتيجي من رد المزوّد نفسه أو من webhook موقَّع.

### 8.4 النجاح ✅

```
PaymentTransaction
  Status        = "Succeeded"
  SucceededAtUtc = UtcNow
  FeeRateBps    = 500              ← 5% مُجمَّدة على الصفّ
  FeeAmount     = round(Amount × 500 / 10000, 2)
  NetToFounder  = Amount − FeeAmount

FundingRequest.Status = "Paid" · PaidAtUtc · ClosedAtUtc
Investment.Stage      = "Committed"
AdminAuditLog         ← صفّ جديد
```

🔒 **قيد #3:** `UX_PaymentTransactions_OneSucceededPerRequest` — حتى لو كل الحراسات التانية فشلت، **قاعدة البيانات بترفض تسجّل نفس التمويل مرّتين**.

**العمولة بتتخصم من نصيب المؤسّس، مش بتتزوّد على المستثمر.** ونسبتها **بتتجمّد على الصفّ** — تغيير نسبة المنصّة السنة الجاية مينفعش يعيد كتابة اللي كسبته السنة اللي فاتت.

**إشعارين `payment_succeeded`:**

| المستلم | نصّ الإشعار |
|---|---|
| 🚀 المؤسّس | *"…: 50,000 USD has been funded. Net proceeds 47,500 USD after the 5% platform fee. **(Sandbox — no real funds moved.)**"* |
| 💰 المستثمر | *"Your investment in … is funded — 50,000 USD. Reference VST-2026-000123. **(Sandbox…)**"* |

**الأرقام:** `PaymentDue −= المبلغ` · **`Funded += المبلغ`** ← **دي أول مرّة في الرحلة كلها يتقال عليها فلوس.**

### 8.5 الفشل والمسارات التانية ❌

| الحالة | اللي بيحصل | حالة الطلب | Funded |
|---|---|---|---|
| **الكارت اترفض** | `Status = Failed` + `FailureCode` + `FailureMessage` | **بيفضل `Open`** | مبيتحرّكش |
| **المستثمر ألغى** | `Status = Cancelled` · `user_cancelled` | بيفضل `Open` | مبيتحرّكش |
| **ساب الصفحة** | الـ sweeper: `Cancelled` · `abandoned`/`expired` | بيفضل `Open` | مبيتحرّكش |
| **إعادة المحاولة** | **صفّ جديد** `AttemptNumber = 2` | بيفضل `Open` | — |
| **الطلب عدّى 14 يوم** | الـ sweeper: `Expired` | `Expired` | — · **بيفضّي مكانه في الجولة** |

> **الصفوف النهائية مبتتعادش كتابتها أبدًا.** تلات محاولات على طلب واحد بتتقري كتلات محاولات. الفشل حقيقة عن اللي حصل، مش غياب تاريخ.
>
> **`payment_failed`** بيتبعت **بس** لو الفشل حصل بعد ما المستثمر ساب الصفحة. إشعار بيقول لواحد عن رسالة الخطأ اللي قدامه دلوقتي = ضوضاء.

---

## المرحلة 9 — إغلاق الجولة

| | |
|---|---|
| **مين** | 🚀 المؤسّس |
| **الشاشة** | `/dashboard/ventures` → **Close round** (`close-round-dialog`) |
| **الـ endpoint** | `POST /api/projects/{projectId}/close-round` |

**بيختار النتيجة بنفسه:**

| القيمة | معناها |
|---|---|
| `Completed` | الجولة وصلت اللي كان بيدوّر عليه |
| `PartiallyRaised` | اتقفلت بأقلّ من الهدف |
| `Withdrawn` | اتقفلت من غير ما يكمّل |

> **المنصّة مبتستنتجش النتيجة من الأرقام.** هو الوحيد اللي يعرف إذا كانت جولة وصلت 60% نجاح ولا انسحاب — والتخمين هيحطّ في بقّه كلام مقالوش.

**اللي بيحصل:**

```
Project
  LifecycleStatus  = "Closed"
  RoundClosedAtUtc = UtcNow
  RoundOutcome     = المختار
  RoundClosingNote = ملاحظة (≤ 600 حرف)

كل FundingRequest مفتوح  → "Cancelled"  ("The round closed before this was paid.")

كل علاقة حيّة:
  ├─ معتمَدة أو متموّلة → Stage = "Closed"   ← التزامها بيفضل بيتحسب
  └─ متوافقش عليها     → Status = Stage = "Declined"
                          + "The round closed before this request was reviewed."

كل داعم متأثّر ← إشعار round_closed
```

> ⚠️ **محاولة دفع المستثمر واقف قدامها دلوقتي بتتساب شغّالة عن قصد** — سحبها من تحته وسط الدفع بيطلّع خصم ملوش حاجة يتعلّق بيها. لو نزلت، التسوية بتخلّي الطلب `Paid` والسجلّ بيتقري صادق: الطلب اتسحب، والدفعة اللي كانت ماشية خلصت برضه. لو منزلتش، الـ sweeper بيلغيها والسحب بيفضل قايم.

**اللي مبيحصلش:** **مفيش حاجة بتتمسح.** الالتزامات والعلاقات وغرفة البيانات والجدول الزمني كلها بتفضل. الإعلان بيتحوّل من **طلب مفتوح** لـ **سجلّ لما حصل**.

**إعادة الفتح:** `PATCH /api/projects/{id}/lifecycle` لـ `Active` بتمسح `RoundClosedAtUtc` و`RoundOutcome` و`RoundClosingNote` — جولة رجعت حيّة مينفعش تفضل شايلة نتيجة وتاريخ إغلاق.

---

## المرحلة 10 — بعد الجولة

### 💰 المستثمر

- **التزكية (Endorsement)** — لو **الشرطين** اتحقّقوا: عنده استثمار `Approved` **و** المشروع وصل هدفه.
  `POST /api/projects/{projectId}/reviews` — تقييم + نصّ + 4 محاور (`Communicative` · `Transparent` · `DeliveredOnPlan` · `WouldBackAgain`). **واحدة لكل مشروع.**
- **الإيصال** في `/invest/payments/{id}` — الرقم المرجعي · العمولة · الصافي · معرّف المزوّد.
- المشروع بيفضل في `/invest/portfolio`.

### 🚀 المؤسّس

- الإعلان بقى سجلّ بالنتيجة المعلَنة.
- التزكيات بتظهر على ملفه كإشارة ثقة `endorsed_by_backers`.
- `rounds_completed` بتزيد.

### 🛡️ الأدمن — الاسترجاع (Refund)

`POST /api/admin/revenue/transactions/{id}/refund` — **المسار الوحيد**، ومش self-service أبدًا.

```
PaymentTransaction.Status = "Refunded" + RefundedByAdminId + RefundReason
FundingRequest.Status     = بيفضل "Paid"    ← السجلّ الصادق: اتدفع، وبعدين اتعكس
```

**إجمالي التمويل وإيراد المنصّة بينزلوا لوحدهم** — لأن الصفّ خرج من `Succeeded`، فبيقع من كل مجموع بالبناء نفسه. **المنصّة مبتحتفظش بعمولة على فلوس رجّعتها.** الطرفين بياخدوا `refund_completed`.

بعدها المؤسّس **يقدر يبعت طلب تمويل جديد** على نفس العلاقة (الشرط 8 بيبصّ على المعاملة مش على الطلب).

---

## ملخّص الحالات في جدول واحد

| اللحظة | `Investment.Status` | `Investment.Stage` | `FundingRequest` | `PaymentTransaction` | الرقم |
|---|---|---|---|---|---|
| المشروع اتنشر | — | — | — | — | — |
| طلب دعم اتقدّم | `Pending` | `New` | — | — | Interest |
| المؤسّس وافق | `Approved` | `Approved` | — | — | Committed |
| المؤسّس حرّك المرحلة | `Approved` | `Contacted`→`InDiscussion` | — | — | Committed |
| طلب تمويل اتبعت | `Approved` | `Committed` | `Open` | — | + PaymentDue |
| المستثمر فتح الدفع | `Approved` | `Committed` | `Open` | `Initiated` | PaymentDue |
| **الدفعة تمّت** | `Approved` | `Committed` | `Paid` | `Succeeded` | **Funded** ✅ |
| الدفعة فشلت | `Approved` | `Committed` | `Open` | `Failed` | PaymentDue |
| الطلب انتهت مدّته | `Approved` | `Committed` | `Expired` | — | Committed |
| المؤسّس رفض | `Declined` | `Declined` | `Cancelled` | `Cancelled` | — |
| الجولة اتقفلت | `Approved` | `Closed` | `Cancelled` | — | Committed/Funded |
| refund | `Approved` | `Committed` | `Paid` | `Refunded` | − Funded |

---

## أخطاء شائعة في فهم الرحلة

| ❌ الفهم الغلط | ✅ الصح |
|---|---|
| "الموافقة معناها اتموّل" | الموافقة قبول للعلاقة. التمويل محتاج طلب تمويل **ودفعة ناجحة**. |
| "المستثمر بيحدّد المبلغ النهائي" | المستثمر بيقترح في الطلب الأول. **المبلغ النهائي رقم المؤسّس** في طلب التمويل. |
| "المستثمر بيقدر يحرّك مرحلته" | المؤسّس بس. المستثمر بياخد **403**. |
| "الرجوع لصفحة النجاح = اتدفع" | أبدًا. التسوية من رد المزوّد أو webhook موقَّع. |
| "إعادة المحاولة بتصلّح المحاولة الفاشلة" | لأ — **صفّ جديد**. الفاشلة بتفضل مسجّلة. |
| "الرفض بيمسح الطلب" | لأ — `Declined` والصفّ بيفضل. |
| "قفل الجولة بيمسح البيانات" | لأ — بيحوّلها لسجلّ. |
| "المنصّة بتحدّد نتيجة الجولة" | المؤسّس بيعلنها بنفسه. |
| "المستثمر يقدر يسترجع فلوسه" | الأدمن بس. |
| "Committed بينزل لما الفلوس تيجي" | لأ — Funded بتزيد **جنبه**، مش بدله. |

---

## للمزيد

- المصطلحات → [01-OVERVIEW §3](01-OVERVIEW.md)
- كل دور يقدر يعمل إيه → [10-ROLES-AND-CAPABILITIES.md](10-ROLES-AND-CAPABILITIES.md)
- القواعد والـ state machines بالتفصيل التقني → [05-BUSINESS-RULES.md](05-BUSINESS-RULES.md)
- الـ endpoints → [04-API-REFERENCE.md](04-API-REFERENCE.md)
- تشغيل سيناريوهات الدفع الستة → [07-SETUP §8](07-SETUP.md)
