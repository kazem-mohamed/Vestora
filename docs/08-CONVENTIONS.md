# 08 · اتفاقيات الكود وكيف تضيف feature

> الملف ده بيقول لك **إزاي تشتغل** على Vestora عشان الكود اللي تكتبه يبقى شبه اللي حواليه.

---

## 1. القواعد الخمسة

1. **اتبع الأسلوب اللي جنبك.** المشروع فيه أسلوب واضح ومتّسق. متجيبش pattern جديد من مشروع تاني.
2. **متكرّرش منطق ماليّ.** أي رقم فلوس بيتحسب في `FundingMath` وبس.
3. **متدّعيش حاجة المنصّة متقدرش تثبتها.** راجع [05-BUSINESS-RULES §9](05-BUSINESS-RULES.md).
4. **الدور مش كفاية — افحص الملكية.** `[Authorize(Roles=…)]` بيقول "مين النوع ده"، مش "ده بتاعه".
5. **لو غيّرت قاعدة في مكانين، غيّرهم في نفس الـ commit.** (`AccountRules.cs` ↔ `rules.ts`، الـ DTO ↔ `types/api.ts`، `PipelineStages.cs` ↔ `stages.ts`)

---

## 2. اتفاقيات الـ Backend

### التسمية

| العنصر | النمط | مثال |
|---|---|---|
| Controller | `{Domain}Controller` | `ProjectStoryController` |
| Entity | مفرد | `Project`, `FundingRequest` |
| DbSet | جمع | `Projects`, `FundingRequests` |
| DTO | `{Thing}Dto` أو `{Verb}{Thing}Input` | `ProjectDto`, `CreateFundingRequestInput` |
| Service | `{Domain}Service` | `PaymentService` |
| Status constants | كلاس `static` بـ `const` + `All[]` | `PaymentStatus`, `FundingRequestStatus` |

### شكل الـ Controller

```csharp
[Route("api/[controller]")]
[ApiController]
[Authorize]
public class ThingController : ControllerBase
{
    private readonly AppDbContext _context;

    private int GetCurrentUserId() =>
        int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

    [HttpGet("{id}")]
    public async Task<IActionResult> Get(int id) { … }
}
```

- كل controller بيعرّف `GetCurrentUserId()` (أو `Me()`) الخاص بيه — ده الـ pattern الموجود، مش تكرار مطلوب إزالته.
- الأخطاء المتوقّعة: `BadRequest(new { message = "…" })` — **دايمًا `message` صغيرة**، لأن الـ client بيقرا `p.message`.
- الأخطاء غير المتوقّعة: سيبها تطلع؛ الـ `UseExceptionHandler` بيتصرّف.

### إمتى تعمل Service؟

| الحالة | الحل |
|---|---|
| CRUD بسيط | في الـ controller مباشرة بـ LINQ |
| منطق بيتشارك بين controllers | Service |
| منطق بيلمس فلوس أو مصادقة | **Service إجباري**، وبيرجّع `ServiceResult<T>` |

```csharp
var result = await _service.DoThingAsync(...);
return this.ToActionResult(result);
```

### الاستعلامات

```csharp
// قراءة فقط
await _context.Projects.AsNoTracking().Where(...).Select(p => new Dto { ... }).ToListAsync(ct);
```

- استخدم `AsNoTracking()` لكل قراءة.
- اعمل `Select` لـ DTO — **متحمّلش الـ entity كاملة** لو محتاج 3 أعمدة (خصوصًا مع أعمدة `varbinary`).
- للأرقام المالية: `FundingMath.SummariesAsync(db, ids, ct)` مرّة واحدة للمجموعة كلها، مش داخل حلقة.
- الـ paging: `PagedResult<T>` بنفس شكل باقي الـ endpoints.

### الأمان في كل endpoint جديد

- [ ] `[Authorize]` أو `[Authorize(Roles=…)]` أو `[AllowAnonymous]` **صريحة**.
- [ ] فحص ملكية جوّه الـ action لو المورد مملوك.
- [ ] الرفض بـ `Forbid()` (403) مش `NotFound()` — إلا لو الوجود نفسه سرّ.
- [ ] لو الـ endpoint حسّاس (auth / إعادة تعيين / دفع) → `[EnableRateLimiting("…")]`.
- [ ] لو بيرفع ملف → `IFileUploadSecurityService`.

### الفلوس

```csharp
// في AppDbContext.OnModelCreating
modelBuilder.Entity<Thing>().Property(t => t.Amount).HasPrecision(18, 2);
```

**كل عمود فلوس، من غير استثناء.**

### التواريخ

```csharp
var now = DateTime.UtcNow;   // ✅ دايمًا
DateTime.Now;                // ❌ ممنوع
```

سمّي الأعمدة الجديدة `…AtUtc` زي الموجود.

---

## 3. اتفاقيات الـ Frontend

### التسمية

| العنصر | النمط |
|---|---|
| ملف component | `kebab-case.tsx` |
| اسم الـ component | `PascalCase` |
| Hook | `use-thing.ts` → `useThing()` |
| API module | `lib/api/{domain}.ts` بيصدّر object باسم `{domain}Api` |
| نوع | `PascalCase` interface في `lib/types/api.ts` |

### مكوّن جديد

```tsx
"use client";                      // لازم لأي حاجة فيها state/effects/context

import { useQuery } from "@tanstack/react-query";
import { useT } from "@/lib/i18n/locale";
import { thingApi } from "@/lib/api/thing";

export function ThingPanel({ id }: { id: number }) {
  const t = useT();
  const { data, isLoading } = useQuery({
    queryKey: ["thing", id],
    queryFn: () => thingApi.get(id),
  });

  if (isLoading) return <div className="skeleton-shimmer h-24 rounded-lg" />;
  return <p className="font-numeric">{t("thing.label")}</p>;
}
```

**قواعد ثابتة:**
- ✅ كل نصّ مرئي من `t()`.
- ✅ خصائص CSS منطقية: `ms-4` / `inset-inline-start` — **مش** `ml-4` / `left`.
- ✅ الأرقام المالية بـ `.font-numeric`.
- ✅ الألوان من الـ tokens: `text-primary`, `bg-card`, `text-muted-foreground` — **مش** `text-[#b08a3f]`.
- ❌ **مفيش `fetch`** — كله عبر `lib/api/*`.
- ❌ متحطّش حالة سيرفر في Zustand — دي شغلانة TanStack Query.

### الفورمات

```tsx
const form = useForm({ resolver: zodResolver(schema) });
```

استخدم `components/ui/form.tsx` + `react-hook-form` + `zod`، وحوّل أخطاء السيرفر لأخطاء حقول بـ `lib/validation/server-errors.ts`.

### الحركة

- الحركة العامة: `framer-motion` + مكوّنات `components/motion/`.
- **متكتبش `useReducedMotion` في كل مكوّن** — `<MotionConfig reducedMotion="user">` بيتكفّل. استخدمه بس لو محتاج تغيّر حاجة أكتر من الحركة (تستبدل نبضة لا نهائية بنقطة ثابتة مثلًا).

---

## 4. Playbook: إضافة feature كاملة

مثال — **"المؤسّس يقدر يأرشف مشروع"**.

### 1) Entity + migration

```csharp
// Data/Models/Project.cs
public bool IsArchived { get; set; }
```

```bash
cd MyAppApi/MyAppApi && dotnet ef migrations add AddProjectArchive
```
```bash
cd MyAppApi/MyAppApi && dotnet ef database update   # نسّق مع التيم — القاعدة مشتركة
```

**تحقّق:** الـ migration المتولّد فيه العمود اللي انت متوقّعه وبس.

### 2) Endpoint

```csharp
[Authorize(Roles = "Innovator")]
[HttpPatch("{projectId}/archive")]
public async Task<IActionResult> Archive(int projectId)
{
    var project = await _dbContext.Projects.FirstOrDefaultAsync(p => p.Id == projectId);
    if (project == null) return NotFound(new { message = "Project not found." });
    if (project.OwnerId != GetCurrentUserId()) return Forbid();   // ← الملكية

    project.IsArchived = true;
    await _dbContext.SaveChangesAsync();
    return Ok(new { message = "Archived." });
}
```

**تحقّق:** جرّبه من Swagger بحساب مالك (200) وبحساب تاني (403).

### 3) نوع + API module

```ts
// lib/types/api.ts — ضيف الحقل على interface Project
isArchived: boolean;

// lib/api/projects.ts
archive: (id: number) => api.patch<ApiMessage>(`/api/projects/${id}/archive`),
```

### 4) Hook / mutation

```ts
const { mutate } = useMutation({
  mutationFn: projectsApi.archive,
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-ventures"] }),
});
```

**تحقّق:** بعد النجاح القايمة بتتحدّث لوحدها.

### 5) UI + ترجمة

- ضيف الزر في المكان المناسب (`components/projects/…`).
- ضيف المفتاحين `en` و `ar` في `lib/i18n/dictionaries.ts`.

**تحقّق:** الزر ظاهر وشغّال بالعربي والإنجليزي، والتخطيط سليم في RTL.

### 6) الفحص النهائي

```bash
cd Frontend/vestora && npm run build
```
```bash
cd MyAppApi/MyAppApi && dotnet build
```

راجع [قائمة الفحص في 05-BUSINESS-RULES §11](05-BUSINESS-RULES.md).

---

## 5. Playbook: إضافة نوع إشعار جديد

1. **Backend** — اكتب صفّ `Notification` بـ `NotificationType` جديد (اتبع نمط تسمية الموجود — الـ deal room بيستخدم `snake_case` والباقي `PascalCase`؛ **متوحّدهمش**، الاتنين شغّالين على صفوف موجودة فعلًا).
2. لو فيه مستلمين كتير → استخدم `NotificationFanOutQueue.Enqueue(...)` بدل ما تحفظ في الحلقة.
3. ادفعه لحظيًا: `await _hub.PushAsync(notification);`
4. **Frontend** — ضيف مدخل في `lib/notifications/taxonomy.ts`: `lane` + `icon` + `titleKey` + `tone` + `href`.
5. ضيف `titleKey` في القاموسين.

> الأنواع اللي متعرّفتش في `taxonomy.ts` بتقع تلقائيًا في مسار `activity` بجملة السيرفر نفسها — يعني مش هتضيع، بس هتبان عامّة.

---

## 6. Playbook: إضافة فلتر على صفحة الاكتشاف

1. **Backend** — ضيف الـ parameter في `ProjectsController.GetAllProjects` و`GetProjectFacets`، وطبّقه جوّه `ApplyBrowseFilters` (المكان الوحيد لمنطق الفلترة).
2. لو الفلتر هيتنفّذ على كل استعلام → اعمل index في `AppDbContext`.
3. **Frontend** — ضيف الحقل في `lib/browse/use-browse-state.ts` (الحالة في الـ URL) + عنصر في `components/browse/discovery-bar.tsx` أو `facet-menu.tsx`.
4. ضيف الترجمة.

**تحقّق:** الفلتر بيفضل موجود بعد refresh (لأنه في الـ URL) وبيرجع سليم لما ترجع من صفحة التفاصيل.

---

## 7. متعملش كده

| ❌ | ليه | ✅ بدلها |
|---|---|---|
| `Investments.Where(i => i.Status == "Approved").Sum(...)` | كان مكرّر في 15 مكان وكلهم كانوا بيسمّوها "raised" | `FundingMath.CommittedOf` |
| تسمية موافقة المؤسّس "raised" | كذبة عن حالة الفلوس | `committed` |
| `DateTime.Now` | بيكسر كل التواريخ في التطبيق | `DateTime.UtcNow` |
| عمود فلوس من غير `HasPrecision(18,2)` | SQL Server بيقصّ الكسور بصمت | `HasPrecision(18, 2)` |
| فحص الدور من غير فحص الملكية | أي مؤسّس يعدّل مشروع أي مؤسّس تاني | `if (project.OwnerId != me) return Forbid();` |
| `fetch()` جوّه component | بيتخطّى الـ refresh وتوحيد الأخطاء | `lib/api/*` |
| نصّ ثابت في JSX | بيكسر العربي | `t("key")` |
| `ml-*` / `left-*` | بيتكسر في RTL | `ms-*` / `inset-inline-start-*` |
| لون hex في className | بيكسر الوضع الداكن | token (`text-primary`) |
| تعديل صفّ `PaymentTransaction` نهائي | الصفوف النهائية غير قابلة للتعديل | اعمل صفّ محاولة جديد |
| تنفيذ أثر دفع قبل كتابة `PaymentEvent` | بيكسر الـ idempotency | اكتب الحدث الأول |
| index تاني على نفس العمود من غير اسم صريح | EF بيدمجهم ويضيع واحد | `HasIndex(x => x.Col, "UX_Explicit_Name")` |
| حذف صفّ علاقة عند الرفض | بيمسح التاريخ | `Status = Stage = "Declined"` |
| إضافة شارة "Verified" | المنصّة مبتتحقّقش من حاجة | Trust Signal بحقيقة محدّدة |

---

## 8. اختبار التغيير

**`MyAppApi.Tests` فيه 85 اختبار على نصفين**: 57 اختبار وحدة على طبقة المجال (`FundingMath` · `PipelineStages` · `ProjectCategories`) و28 integration بيشغّلوا التطبيق الحقيقي ويكلّموه عبر HTTP (`AuthEndpointsTests` · `PaymentsEndpointsTests` · `ProjectsEndpointsTests` · `SecurityBoundaryTests`).

⚠️ **نصف الـ integration بيشتغل على EF Core InMemory مش SQL Server.** بيثبت سلوك الـ endpoint وأكواد الحالة والصلاحيات، لكنه **مبيثبتش إن الاستعلام بيترجم لـ SQL** — استعلام بيشتغل في الذاكرة وبيقع على القاعدة هيعدّي من هنا. (ده بالظبط اللي خلّى بق `IsPrimaryAdmin` يعدّي.) الواجهة والـ E2E **تحقّقها يدوي**، فخلّي معاييرك واضحة قبل ما تبدأ.

| النوع | إزاي |
|---|---|
| المجال (`FundingMath` · `PipelineStages`) | `cd MyAppApi && dotnet test MyAppApi.Tests/MyAppApi.Tests.csproj` — **لازم تعدّي قبل ما تسلّم**. لو غيّرت رقم مالي أو مرحلة، ضيف الحالة هنا |
| Endpoint | Swagger (`/swagger` في التطوير) — جرّب المسموح والممنوع |
| الصلاحيات | جرّب بحساب من كل دور، وبمالك وغير مالك |
| رحلة الواجهة | امشي الرحلة كاملة زي المستخدم |
| الدفع | 6 سيناريوهات [07-SETUP §8](07-SETUP.md) على المحاكي أو Stripe |
| RTL | بدّل للعربي وشوف كل شاشة لمستها |
| الوضع الداكن | بدّل الثيم |
| تقليل الحركة | فعّله من إعدادات النظام |
| البناء | `npm run build` + `dotnet build` قبل ما تسلّم |

> **الطبقة اللي المشروع محتاجها ومش موجودة:** integration tests على `PaymentService` — التسوية، الـ idempotency، الـ refund، وسباق الـ webhook/verify. لو بتلمس المسار ده، خد وقتك في التحقّق اليدوي بالسيناريوهات الستة، لأن مفيش شبكة أمان تحتك.

---

## 9. أدوات الوكلاء (Agent tooling) في المستودع

| المسار | إيه ده |
|---|---|
| `.claude/launch.json` | تعريف سيرفري التطوير `vestora-frontend` و`vestora-backend` لأدوات المعاينة |
| `.claude/settings.local.json` | إعدادات Claude Code المحلّية |
| `.codex/hooks.json` · `.kiro/steering/` | إعدادات أدوات وكلاء تانية |
| `.impeccable/` · `**/.impeccable/` | كاش مؤقّت لأداة — **مُتجاهَل في `.gitignore`، متلمسهوش** |
| `Frontend/vestora/AGENTS.md` | تحذير Next.js: الإصدار ده مختلف عن اللي في بيانات التدريب |
| `Frontend/vestora/CLAUDE.md` | بيستورد `AGENTS.md` |
| `AGENTS.md` (الجذر) | القواعد المختصرة لأي موديل AI بيشتغل على المشروع |
