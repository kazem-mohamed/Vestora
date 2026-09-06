# Vestora

> منصّة تربط **روّاد الأعمال (Founders / Innovators)** اللي بيدوّروا على تمويل، بـ **المستثمرين (Investors)** اللي بيدوّروا على فُرَص — من أول ما المشروع يتنشر، لحد ما الفلوس توصل فعلاً وتتسجّل على الطرفين. غرفة الصفقة نفسها فيها تفاوض حقيقي: شروط متّفق عليها بموافقة الطرفين، عروض مقابلة على المبلغ، وتمويل على أقساط لو الالتزام كبير.

```
Vestora/
├── MyAppApi/            ← Backend  · .NET 8 Web API + EF Core + SQL Server + SignalR
│   └── MyAppApi.Tests/  ← اختبارات وحدة (xUnit) على طبقة المجال
├── Frontend/vestora/    ← Frontend · Next.js 16 (App Router) + React 19 + TypeScript
├── docs/                ← التوثيق الكامل (ابدأ من هنا)
├── Vestora-Brand-Sheet.html  ← هوية البراند (quiet-luxury) — مصدر ألوان وخطوط الـ design system
└── AGENTS.md            ← قواعد مختصرة لموديلات الـ AI اللي هتشتغل على الكود
```

---

## ابدأ من هنا

اقرا بالترتيب ده لو انت جديد على المشروع. كل ملف مستقلّ بذاته ومستخرَج من الكود الفعلي.

| # | الملف | ليه تقراه |
|---|---|---|
| 1 | [docs/01-OVERVIEW.md](docs/01-OVERVIEW.md) | إيه هو Vestora، المصطلحات، الأدوار الأربعة، رحلة كل مستخدم |
| 2 | [docs/02-ARCHITECTURE.md](docs/02-ARCHITECTURE.md) | إزاي النظام مبني: الطبقات، دورة الطلب، المصادقة، الـ realtime، الـ background jobs |
| 3 | [docs/03-DATA-MODEL.md](docs/03-DATA-MODEL.md) | *(EN)* كل جدول، كل عمود، كل علاقة، كل constraint، وكل migration |
| 4 | [docs/04-API-REFERENCE.md](docs/04-API-REFERENCE.md) | *(EN)* الـ 161 endpoint كلهم: المسار، الصلاحية، المدخلات، المخرجات |
| 5 | [docs/05-BUSINESS-RULES.md](docs/05-BUSINESS-RULES.md) | *(EN)* **الأهم** — القواعد اللي مينفعش تتكسر: حسابات التمويل، الـ state machines، مصفوفة الصلاحيات |
| 6 | [docs/06-FRONTEND.md](docs/06-FRONTEND.md) | كل صفحة، كل component، إدارة الحالة، الـ design system، الترجمة، الحركة |
| 7 | [docs/07-SETUP.md](docs/07-SETUP.md) | تشغيل المشروع محليًا: الأسرار، قاعدة البيانات، الإيميل، Stripe، حل المشاكل |
| 8 | [docs/08-CONVENTIONS.md](docs/08-CONVENTIONS.md) | إزاي تضيف feature من الأول للآخر، اتفاقيات الكود، الفخاخ المعروفة |
| 9 | [docs/09-STATUS.md](docs/09-STATUS.md) | اللي خلص، اللي ناقص، الثغرات المعروفة، اللي جاي |
| 10 | [docs/10-ROLES-AND-CAPABILITIES.md](docs/10-ROLES-AND-CAPABILITIES.md) | **كل دور يقدر يعمل إيه بالظبط** (مستثمر · مؤسّس · أدمن · زائر) + كتالوج وظائف المشروع |
| 11 | [docs/11-INVESTMENT-FLOW.md](docs/11-INVESTMENT-FLOW.md) | **رحلة الاستثمار كاملة** من رفع المشروع لإغلاق الجولة — بالطرفين، خطوة بخطوة، بالحالات والإشعارات |

> **ملاحظة عن اللغة:** الشرح والسياق بالعربي، والمراجع التقنية (schema / API / rules) بالإنجليزي — عشان تطابق لغة الكود والتعليقات حرف بحرف ومتبقاش فيه مصطلح مترجم بطريقتين.

---

## تشغيل سريع (Quick start)

محتاج: **.NET 8 SDK**، **Node.js 20+**، واتصال بقاعدة بيانات SQL Server (المشروع بيستخدم DB مستضافة على MonsterASP — مفيش SQL Server محلّي مطلوب).

```bash
# 1) الأسرار (مرة واحدة) — التفاصيل الكاملة في docs/07-SETUP.md
cd MyAppApi/MyAppApi
dotnet user-secrets set "ConnectionStrings:InvestContextDBMonster" "…"
dotnet user-secrets set "JwtSettings:Key" "…(32 بايت على الأقل)…"
```

```bash
# 2) الـ Backend  → http://localhost:5078  (Swagger على /swagger)
cd MyAppApi/MyAppApi && dotnet run
```

```bash
# 3) الـ Frontend → http://localhost:3000
cd Frontend/vestora && npm install && npm run dev
```

```bash
# 4) اختبارات المجال (مش محتاجة أسرار ولا قاعدة بيانات)
cd MyAppApi && dotnet test MyAppApi.Tests/MyAppApi.Tests.csproj
```

التطبيق **بيرفض يشتغل** لو أي سرّ مطلوب ناقص — ده مقصود، مش عطل. الرسالة نفسها بتقولك تعمل إيه.

---

## أرقام المشروع في سطر

| | |
|---|---|
| Backend | 22 controller · 161 endpoint · 34 DbSet · 30 migration · 1 SignalR hub · 2 background worker |
| Frontend | 55 صفحة (route) · 149 component · 17 API module · دعم كامل EN/AR مع RTL |
| الاختبارات | 85 اختبار (xUnit): 57 على طبقة المجال — `FundingMath` + `PipelineStages` + `ProjectCategories` — و28 integration بيشغّلوا التطبيق فعليًا على EF Core InMemory. مفيش E2E ولا CI. |
| المدفوعات | **Sandbox فقط** — simulator أوفلاين أو Stripe test-mode. التطبيق بيرفض يشتغل بمفتاح Stripe حقيقي. |
| الإيميل | SMTP حقيقي (Brevo عبر MailKit) — الأسرار في `user-secrets`، مش في الكود. تفاصيل الإعداد في [docs/07-SETUP.md §7](docs/07-SETUP.md). |

---

القائمة الكاملة في [docs/09-STATUS.md](docs/09-STATUS.md).
