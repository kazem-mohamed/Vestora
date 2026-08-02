# 07 · تشغيل المشروع (Setup)

> من صفر لتطبيق شغّال. كل الأوامر من جذر المشروع إلا لو مكتوب غير كده.

---

## 1. المتطلّبات

| | الإصدار | ملاحظات |
|---|---|---|
| **.NET SDK** | 8.0 | `dotnet --version` |
| **Node.js** | 20+ | `node --version` |
| **SQL Server** | — | **مش محتاج تثبيت محلّي** — المشروع بيستخدم DB مستضافة على MonsterASP |
| **dotnet-ef** | 8.x | `dotnet tool install --global dotnet-ef` — للـ migrations بس |
| **Stripe CLI** | اختياري | لو هتشغّل Stripe test mode |

---

## 2. الأسرار (Secrets) — أهم خطوة

`appsettings.json` **مرفوع في المستودع** وكل قيمة سرّية فيه **فاضية عمدًا**. القيمة الفاضية معناها **"لازم توفّرها"**، مش "اختيارية".

- **في التطوير** → .NET User Secrets (`UserSecretsId = myappapi-investhub-dev-secrets`)
- **في الإنتاج** → environment variables، والفاصل بين الأقسام `__` (مثال: `ConnectionStrings__InvestContextDBMonster`)

> **التطبيق بيرمي exception ويرفض يقلع لو سرّ مطلوب ناقص.** ده مقصود — أحسن من إنه يشتغل بقيمة placeholder ويفشل بعدين بطريقة غامضة.

### الحد الأدنى للتشغيل

```bash
cd MyAppApi/MyAppApi
dotnet user-secrets set "ConnectionStrings:InvestContextDBMonster" "Server=...;Database=...;User Id=...;Password=...;TrustServerCertificate=True"
dotnet user-secrets set "JwtSettings:Key" "ضع-هنا-مفتاحًا-عشوائيًا-طوله-32-بايت-على-الأقل"
```

**فحوصات الإقلاع على `JwtSettings`:**
- `Key` مش فاضي، و**32 بايت على الأقل**.
- `Issuer` و `Audience` موجودين (ليهم قيم افتراضية في `appsettings.json`).

### كل مفاتيح الأسرار

| المفتاح | لإيه | مطلوب |
|---|---|---|
| `ConnectionStrings:InvestContextDB` | اتصال أساسي (يُجرَّب أولًا) | واحد منهم |
| `ConnectionStrings:InvestContextDBMonster` | اتصال احتياطي (MonsterASP) | واحد منهم |
| `JwtSettings:Key` | توقيع الـ JWT — **≥ 32 بايت** | ✅ |
| `EmailSettings:Host` / `Port` / `Username` / `Password` / `FromEmail` | إرسال الإيميل | للتسجيل الكامل |
| `EmailSettings:LogCodesInDevelopment` | يكتب الكود في اللوج بدل الإيميل | تطوير فقط |
| `AdminBootstrap:SecretKey` | إنشاء أول أدمن | مرّة واحدة |
| `Payments:Provider` | `simulated` (افتراضي) أو `stripe` | ❌ |
| `Payments:Stripe:SecretKey` | **`sk_test_…` فقط** | لو Stripe |
| `Payments:Stripe:WebhookSecret` | `whsec_…` من `stripe listen` | لو Stripe |

**أوامر مفيدة:**

```bash
cd MyAppApi/MyAppApi && dotnet user-secrets list
```

```bash
cd MyAppApi/MyAppApi && dotnet user-secrets clear
```

> ⚠️ **.NET بيقرا الـ user secrets وقت الإقلاع بس.** بعد أي `set` لازم **تعيد تشغيل الـ API**. ده أشهر سبب لإن إعداد "اتصلّح" يفضل شكله باظ.

### كيف يُختار الاتصال

`Program.cs` بيجرّب `InvestContextDB` الأول: بيفتح اتصال فعلي؛ لو نجح يستخدمه، لو فشل يجرّب `InvestContextDBMonster`. لو الاتنين فشلوا بيرجع لأول واحد فيه قيمة. لو مفيش أي قيمة → exception برسالة بتقولك تعمل إيه.

---

## 3. قاعدة البيانات

الـ schema بيتدار بـ EF Core migrations (22 migration).

```bash
cd MyAppApi/MyAppApi && dotnet ef database update
```

```bash
cd MyAppApi/MyAppApi && dotnet ef migrations add MyMigrationName
```

```bash
cd MyAppApi/MyAppApi && dotnet ef migrations list
```

> ⚠️ **القاعدة بعيدة ومشتركة بين التيم.** مفيش نسخة محلّية تجرّب عليها. **نسّق مع التيم قبل أي `database update`** — الـ migration بيتطبّق على الجميع في نفس اللحظة.

---

## 4. تشغيل الـ Backend

```bash
cd MyAppApi/MyAppApi && dotnet run
```

- الـ API: **`http://localhost:5078`**
- Swagger (**في التطوير بس**): `http://localhost:5078/swagger`
- SignalR hub: `/hubs/chat`

فحص سريع:

```bash
curl -s http://localhost:5078/api/payments/config
```

المفروض يرجّع `{"provider":"simulated","isSandbox":true,...}`.

---

## 5. تشغيل الـ Frontend

```bash
cd Frontend/vestora && npm install && npm run dev
```

- التطبيق: **`http://localhost:3000`**
- الإعداد الوحيد المطلوب في `.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:5078
```

- اختياري: `NEXT_PUBLIC_SITE_URL` — بيحدّد الأصل اللي بتتحلّ منه روابط الـ metadata (الافتراضي `http://localhost:3000`).

> **CORS:** الـ backend بيسمح بالأصول المكتوبة في `Cors:AllowedOrigins` (الافتراضي `http://localhost:3000`) مع `AllowCredentials`. لو غيّرت البورت، غيّرها هناك.

---

## 6. إنشاء أول أدمن

مفيش واجهة لترقية الأدوار. أول أدمن بيتعمل بسرّ الـ bootstrap:

```bash
cd MyAppApi/MyAppApi && dotnet user-secrets set "AdminBootstrap:SecretKey" "سرّ-قوي-هنا"
```

بعد إعادة التشغيل:

```bash
curl -s -X POST http://localhost:5078/api/admin/bootstrap -H "Content-Type: application/json" -d '{"secretKey":"سرّ-قوي-هنا","userName":"Admin","email":"admin@example.com","password":"YourStrongPass123"}'
```

المقارنة بتتم **بزمن ثابت** (constant-time)، والـ endpoint محكوم بحدّ `PasswordReset` (3 محاولات / 10 دقايق). أدمن إضافي بعد كده عن طريق `POST /api/admin/admins` وانت مسجّل كأدمن.

---

## 7. الإيميل

Vestora بتبعت رسالتين معاملاتيّتين بس: **كود تفعيل الإيميل** عند التسجيل، و**كود إعادة تعيين الباسورد**. الاتنين بيعدّوا من `MailKitEmailService` — وده SMTP عادي، يعني **تبديل المزوّد = إعدادات، مش كود**.

### الخيار أ — التطوير من غير مزوّد (الأسرع)

```bash
cd MyAppApi/MyAppApi && dotnet user-secrets set "EmailSettings:LogCodesInDevelopment" "true"
```

الكود بيتكتب في لوج السيرفر بدل ما يتبعت. **محروس مرّتين** — الفلاج **و** بيئة Development — لأن كود تفعيل حيّ في لوج إنتاج = اختراق حساب لأي حد يقرا اللوجات.

### الخيار ب — Brevo (مجاني، بيبعت لأي عنوان)

1. سجّل في <https://www.brevo.com> — من غير كارت.
2. **وثّق عنوان مُرسِل:** القائمة اليسرى → *Senders, Domains & Dedicated IPs* → **Senders** → *Add a sender*. أي بريد تملكه يمشي. هيبعتلك رابط تأكيد — اضغطه. العنوان ده هيبقى الـ `From:`.
3. **اعمل مفتاح SMTP:** القائمة اليسرى → *SMTP & API* → تبويب **SMTP** → *Generate a new SMTP key*. **بيتعرض مرّة واحدة** — انسخه.

```bash
cd MyAppApi/MyAppApi
dotnet user-secrets set "EmailSettings:Host" "smtp-relay.brevo.com"
dotnet user-secrets set "EmailSettings:Port" "587"
dotnet user-secrets set "EmailSettings:Username" "YOUR_BREVO_LOGIN"
dotnet user-secrets set "EmailSettings:Password" "YOUR_SMTP_KEY"
dotnet user-secrets set "EmailSettings:FromEmail" "YOUR_VERIFIED_SENDER"
dotnet user-secrets set "EmailSettings:FromName" "Vestora"
```

`EnableSsl` بيفضل `true` — Brevo بيستخدم STARTTLS على 587، وده بالظبط اللي `MailKitEmailService` بيعمله مع الفلاج ده.

> **ليه مش Resend:** الطبقة التجريبية بتاعته بترفض أي مستلم غير صاحب الحساب — حتى الـ `+alias` بيترفض. يعني أي حد تاني يسجّل بياخد حساب من غير كود.

### التحقّق إنه شغّال

سجّل بعنوان **مش** المُرسِل اللي وثّقته — دي كل نقطة التغيير:

```bash
curl -s -X POST http://localhost:5078/api/auth/register -F "FirstName=Mail" -F "LastName=Check" -F "Email=SOME_OTHER@gmail.com" -F "Password=Vestora!Test9" -F "ConfirmPassword=Vestora!Test9" -F "UserType=Investor" -F "Phone=01012345678" -F "BirthDate=1996-01-01"
```

**نجاح:** `{"message":"Registration completed successfully. …","emailDelivered":true}`
**فشل:** `emailDelivered:false` — والسيرفر بيلوّج رفض المزوّد الحرفي على مستوى **Error**.

`emailDelivered` هي الإشارة الصادقة: الحساب اتعمل، بس الكود مبعتش.

### ملاحظات التسليم

- أول كام رسالة ممكن تروح Spam لأن المُرسِل ملوش تاريخ. ابعت لنفسك مرّة واعملها *Not spam*.
- الطبقة المجانية في Brevo بتحطّ توقيع صغير في الرسالة — مش بيأثّر على التسليم.
- الترقية المهنية لاحقًا = دومين: اشتريه، وثّقه، وخلّي `FromEmail = no-reply@yourdomain`. مفيش حاجة تانية بتتغيّر.

---

## 8. Stripe (اختياري)

المشروع بيشتغل بـ **المحاكي الأوفلاين** افتراضيًا — نفس دورة التمويل بالظبط، نفس الـ state machine، نفس العمولات، نفس سجلّ التدقيق، من غير شبكة ولا حساب.

> 🔒 **Test mode بس.** التطبيق بيرفض يقلع لو `Payments:Stripe:SecretKey` مش `sk_test_…`. الفحص بيتعمل **مرّتين**: في `Program.cs` وفي constructor بتاع `StripeSandboxPaymentProvider`. Vestora مشروع تخرّج ومش مرخّص ينقل فلوس حقيقية.

### التفعيل

```bash
cd MyAppApi/MyAppApi
dotnet user-secrets set "Payments:Provider" "stripe"
dotnet user-secrets set "Payments:Stripe:SecretKey" "sk_test_YOUR_KEY"
```

### توجيه الـ webhooks للـ API المحلّي

الـ API على `localhost:5078` وStripe مش قادر يوصله. الـ CLI بيعمل النفق — **وده اللي بيغني عن ngrok**:

```bash
stripe listen --forward-to localhost:5078/api/payments/webhook/stripe
```

هيطبع `Ready! Your webhook signing secret is whsec_…`. انسخه في terminal تاني وبعدين **أعد تشغيل الـ API**:

```bash
cd MyAppApi/MyAppApi && dotnet user-secrets set "Payments:Stripe:WebhookSecret" "whsec_FROM_STRIPE_LISTEN"
```

سيب `stripe listen` شغّال طول الجلسة — بيصدر سرّ توقيع جديد كل مرة يقلع.

### التشغيل الكامل

```bash
stripe listen --forward-to localhost:5078/api/payments/webhook/stripe
```
```bash
cd MyAppApi/MyAppApi && dotnet run
```
```bash
cd Frontend/vestora && npm run dev
```

تأكيد إن الـ adapter اتبدّل فعلًا:

```bash
curl -s http://localhost:5078/api/payments/config
```

لو لسه بيقول `simulated`، يبقى المفتاح ناقص أو مش `sk_test_` — التطبيق بيرجع للمحاكي **عن قصد** بدل ما يفشل بصمت على مزوّد نصّ مضبوط.

### كروت الاختبار

أي تاريخ انتهاء مستقبلي، أي CVC، أي رمز بريدي.

| النتيجة | الرقم |
|---|---|
| نجاح | `4242 4242 4242 4242` |
| رفض عام | `4000 0000 0000 0002` |
| رصيد غير كافٍ | `4000 0000 0000 9995` |
| يطلب 3-D Secure | `4000 0025 0000 3155` |
| إلغاء | اضغط زر الرجوع في المتصفّح على صفحة Stripe |

### السيناريوهات اللي المفروض تمشيها

كل واحد منهم بيمشي بنفس المنطق في المحاكي:

1. **نجاح** — الاستثمار يتحوّل `Funded`.
2. **فشل** (`4000…0002`) — المحاولة تتسجّل `Failed`، الـ funding request يفضل `Open`، وإجمالي التمويل **مبيتحرّكش**.
3. **إلغاء** — اترك صفحة Stripe. المحاولة `Cancelled` والطلب يفضل مفتوح.
4. **إعادة محاولة** — ادفع تاني بعد الفشل. **صفّ جديد** (`Attempt #2`)؛ الفاشل مبيتعادش كتابته أبدًا.
5. **تكرار التسليم** — `stripe events resend evt_XXXX`. المتوقّع `{"received":true,"applied":false}` وإجمالي تمويل **ثابت**.
6. **Refund** — من `/admin/revenue` كأدمن. إجمالي التمويل وإيراد المنصّة الاتنين بينزلوا.

> `stripe trigger checkout.session.completed` بيبعت بيانات Stripe الوهمية، فـ Vestora بترد `"reason":"no matching transaction"` — **سلوك صحيح**، لأن الحدث مش تابع لأي معاملة عندنا. استخدم رحلة الواجهة الحقيقية عشان تختبر التسوية.

### فحص قاعدة البيانات

```sql
SELECT Reference, Status, Amount, FeeRateBps, FeeAmount, NetToFounder, Provider
FROM PaymentTransactions ORDER BY Id DESC;

-- صفّ واحد لكل حدث مقبول؛ المكرّر عمره ما بياخد صفّ تاني
SELECT Provider, ProviderEventId, EventType, Source, Applied, Outcome
FROM PaymentEvents ORDER BY Id DESC;
```

---

## 9. حسابات اختبار

عشان تختبر رحلة كاملة محتاج **3 حسابات**: Innovator + Investor + Admin.

1. سجّل مؤسّس ومستثمر من `/register`.
2. فعّل الإيميل — إمّا من الإنبوكس، أو من الكود اللي في اللوج لو `LogCodesInDevelopment` مفعّلة.
3. اعمل الأدمن بالـ bootstrap (قسم 6).

> **حيلة سريعة لو الإيميل معطّل تمامًا:** فعّل الحساب مباشرة في القاعدة —
> `UPDATE Users SET IsEmailVerified = 1, EmailVerifiedAtUtc = GETUTCDATE() WHERE Email = '…'`.
> للتطوير المحلّي فقط.

---

## 10. حلّ المشاكل

| العَرَض | السبب | الحلّ |
|---|---|---|
| `JWT signing key is not configured` | السرّ ناقص | اضبط `JwtSettings:Key` (≥ 32 بايت) وأعد التشغيل |
| `No SQL Server connection string is configured` | الاتنين فاضيين | اضبط `ConnectionStrings:InvestContextDBMonster` |
| التطبيق بيرمي عند الإقلاع بسبب مفتاح Stripe | مفتاح مش `sk_test_` | ده **مقصود** — حطّ مفتاح اختبار أو رجّع `Payments:Provider` لـ `simulated` |
| إعداد "اتصلّح" ولسه باظ | .NET بيقرا الأسرار وقت الإقلاع بس | **أعد تشغيل الـ API** |
| CORS error في المتصفّح | الأصل مش في القائمة | زوّد البورت في `Cors:AllowedOrigins` |
| 401 على كل الطلبات | التوكن منتهي والـ refresh فشل | سجّل خروج ودخول؛ الـ refresh token عمره 14 يوم |
| الدخول بيرفض بعد تسجيل ناجح | الإيميل مش مفعَّل (`RequireVerifiedEmailForLogin = true`) | فعّل الإيميل أو حدّث الصفّ في القاعدة |
| `429 Too Many Requests` | تخطّيت حدّ المعدّل | استنّى النافذة (auth: دقيقة · reset: 10 دقايق · checkout: 5 دقايق) |
| رفع الصورة بيترفض | الحجم > 2MB أو نوع غير مسموح أو **توقيع البايتات مش مطابق** | صورة jpeg/png/gif/bmp حقيقية ≤ 2MB |
| التواريخ ظاهرة بتوقيت غلط | serializer جديد من غير الـ UTC converters | سجّل `UtcDateTimeConverter` + `UtcNullableDateTimeConverter` عليه |
| الشات مش بيتّصل | التوكن مش بيتمرّر | لازم `?access_token=` في الـ URL بتاع الـ hub |
| `payments/config` بيقول `simulated` وانت عايز stripe | المفتاح ناقص أو غلط | راجع `Payments:Provider` و `SecretKey` |

---

## 11. تخطيط البورتات

| الخدمة | البورت |
|---|---|
| Backend API | `5078` |
| Frontend | `3000` |
| SignalR | نفس بورت الـ API على `/hubs/chat` |
