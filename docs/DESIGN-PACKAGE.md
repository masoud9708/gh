# پکیج طراحی پلتفرم لجستیک غیرمتمرکز (Ghachagh Design Package)

این سند شامل مشخصات دقیق طراحی پلتفرم لجستیک غیرمتمرکز Ghachagh (نسخه 3.0) می‌باشد و به عنوان مرجع اصلی برای توسعه‌دهندگان، معماران و ذی‌نفعان سیستم عمل می‌کند.

---

## 1. Contract State Machine Specification (مشخصات ماشین وضعیت قراردادها)

پلتفرم از دو قرارداد هوشمند اصلی برای مدیریت چرخه‌های حیات متفاوت استفاده می‌کند:

### 1.1 FreightEscrow (قرارداد حمل بار)

*   **`NONE` (0)**: وضعیت اولیه / پیش‌فرض.
*   **`CREATED` (1)**:
    *   **انتقال**: `createFreight()` توسط `shipper`.
    *   **قوانین**: بارنامه در سیستم ثبت شده، اما هنوز وجهی واریز نشده است. شناسه بار، هش‌های تحویل و ارزش بار ذخیره می‌شوند.
*   **`FUNDED` (2)**:
    *   **انتقال**: `fund()` توسط `shipper`.
    *   **قوانین**: مبلغ کرایه (USDT) به قرارداد اسکرو منتقل شده است. بار اکنون برای رانندگان قابل مشاهده و پذیرش است.
*   **`ACCEPTED` (3)**:
    *   **انتقال**: `acceptJob()` توسط `driver`.
    *   **قوانین**: راننده بار را پذیرفته و **وثیقه (Collateral)** معادل یا بیشتر از ارزش بار به قرارداد واریز کرده است.
*   **`PICKED_UP` (4)**:
    *   **انتقال**: `pickUp()` توسط `driver`.
    *   **قوانین**: راننده بار را از مبدا دریافت کرده است. نیاز به ارائه `pickupCode` صحیح (که هش آن با `pickupHash` مطابقت داشته باشد) و ترجیحا آپلود عکس (`photoHash` / `photoUrl`) دارد.
*   **`IN_TRANSIT` (5)**:
    *   **انتقال**: `startTransit()` توسط `driver`.
    *   **قوانین**: راننده حرکت به سمت مقصد را آغاز کرده است. `deliveryDeadline` (مهلت تحویل) و `latePenaltyPerDay` (جریمه دیرکرد روزانه) در این مرحله تنظیم می‌شوند.
*   **`DELIVERED` (6)**:
    *   **انتقال**: `markDelivered()` توسط `driver`.
    *   **قوانین**: راننده رسیدن به مقصد و تحویل فیزیکی بار را اعلام می‌کند.
*   **`CONFIRMED` (7)**:
    *   **انتقال**: `confirmDelivery()` (با کد) توسط `shipper/driver/buyer` یا `confirmAsShipper()` (بدون کد) توسط `shipper`.
    *   **قوانین**: تحویل موفقیت‌آمیز تأیید شده است.
*   **`RELEASED` (8)**:
    *   **انتقال**: انتقال خودکار پس از `CONFIRMED` یا توسط ادمین در `resolveDispute()`.
    *   **قوانین**: وجه کرایه (پس از کسر کارمزد پلتفرم و جرایم احتمالی) به راننده پرداخت شده و وثیقه راننده آزاد می‌شود. این وضعیت نهایی (Terminal State) برای یک فرآیند موفق است.
*   **`DISPUTED` (9)**:
    *   **انتقال**: `raiseDispute()` توسط `shipper` یا `driver` (از وضعیت‌های `ACCEPTED`, `PICKED_UP`, `IN_TRANSIT`, `DELIVERED`).
    *   **قوانین**: یکی از طرفین اختلاف ثبت کرده است. وجوه و وثیقه تا زمان دخالت ادمین قفل می‌شوند.
*   **`CANCELLED` (10)**:
    *   **انتقال**: `cancel()` توسط `shipper` (فقط از وضعیت‌های `CREATED` یا `FUNDED`).
    *   **قوانین**: بارنامه لغو شده است. اگر در وضعیت `FUNDED` بود، وجه به `shipper` بازگردانده می‌شود. این یک وضعیت نهایی است.

### 1.2 RetailEscrow (قرارداد خرده‌فروشی)

*   **`NONE` (0)**: وضعیت اولیه.
*   **`CREATED` (1)**:
    *   **انتقال**: `createOrder()` توسط `buyer`.
    *   **قوانین**: سفارش خرید ثبت شده و جمع کل (`amount` + `shipping`) محاسبه شده است.
*   **`FUNDED` (2)**:
    *   **انتقال**: `fund()` توسط `buyer`.
    *   **قوانین**: کل مبلغ (USDT) به قرارداد اسکرو واریز شده است.
*   **`DELIVERED` (3)**:
    *   **انتقال**: `markDelivered()` توسط `driver`.
    *   **قوانین**: راننده تحویل کالا به خریدار را اعلام می‌کند. (پیش‌نیاز: `assignDriver()` باید فراخوانی شده باشد).
*   **`CONFIRMED` (4)**:
    *   **انتقال**: `confirmDelivery()` توسط `buyer` با ارائه `deliveryCode` صحیح، یا توسط ادمین در `resolveDispute()`.
    *   **قوانین**: تحویل تأیید شده است. وجه کالا به فروشنده و هزینه ارسال به راننده (پس از کسر کارمزد پلتفرم) پرداخت می‌شود. وضعیت نهایی موفق.
*   **`REFUNDED` (5)**:
    *   **انتقال**: `refund()` توسط ادمین (`ADMIN_ROLE`).
    *   **قوانین**: کل وجه به خریدار بازگردانده می‌شود (معمولا پس از اختلاف یا لغو پیش از ارسال). وضعیت نهایی.
*   **`DISPUTED` (6)**:
    *   **انتقال**: `raiseDispute()` توسط `buyer`, `seller` یا `driver` (از وضعیت `FUNDED` یا `DELIVERED`).
    *   **قوانین**: اختلاف ثبت شده و وجوه تا بررسی ادمین قفل می‌شوند.

---

## 2. Business Rules Catalog (کاتالوگ قوانین تجاری)

این بخش قوانین تجاری حاکم بر منطق پلتفرم را تعریف می‌کند.

### BR-01: سیستم وثیقه رانندگان (Driver Collateral)
برای پذیرش یک بار در `FreightEscrow` (`acceptJob`)، راننده موظف است مبلغی به عنوان وثیقه (`collateral`) واریز کند که **باید بزرگتر یا مساوی** ارزش اعلام شده بار (`cargoValue`) باشد. این وثیقه تا زمان تأیید تحویل (`RELEASED`) یا حل اختلاف (`resolveDispute`) در قرارداد قفل می‌ماند.

### BR-02: جریمه دیرکرد (Late Penalty)
در قرارداد حمل بار، اگر زمان تأیید تحویل از مهلت مقرر (`deliveryDeadline`) فراتر رود، جریمه‌ای به صورت روزانه (بر اساس `latePenaltyPerDay` در مقیاس Basis Points) محاسبه می‌شود.
*   فرمول: `Penalty = Amount * (DaysLate * latePenaltyPerDay) / 10000`
*   **سقف جریمه**: جریمه هرگز نمی‌تواند از **20%** کل مبلغ کرایه تجاوز کند.
*   مبلغ جریمه از پرداختی راننده کسر شده و به حساب پلتفرم (`platformWallet`) واریز می‌گردد.

### BR-03: کارمزد پلتفرم (Platform Fee)
پلتفرم از تمام تراکنش‌های موفق (قراردادهای Freight و Retail که به وضعیت `CONFIRMED`/`RELEASED` می‌رسند) **2%** (`200 Basis Points`) کارمزد کسر می‌کند. کارمزد مستقیماً به `platformWallet` منتقل می‌شود.

### BR-04: تأیید تحویل (Delivery Confirmation)
تأیید تحویل در هر دو قرارداد نیازمند ارائه کد تحویل (`deliveryCode`) به صورت Plain Text است. قرارداد این کد را هش کرده و با هش ذخیره شده در زمان ایجاد قرارداد (`deliveryHash`) مطابقت می‌دهد. در قرارداد حمل بار، فرستنده می‌تواند بدون کد (`confirmAsShipper()`) دریافت را تأیید کند.

### BR-05: تراکنش‌های بدون گس (Meta-Transactions)
تمام تعاملات کاربران با قراردادهای هوشمند از طریق EIP-2771 انجام می‌شود. کاربران نیازی به پرداخت هزینه Gas (MATIC) ندارند. آنها یک پیام EIP-712 را امضا کرده و به Relayer بک‌اند ارسال می‌کنند. Relayer تراکنش را با پرداخت Gas از طریق قرارداد `Forwarder` به شبکه می‌فرستد. در صورت خرابی Relayer، مکانیزم Fallback برای ارسال مستقیم تراکنش توسط کاربر وجود دارد.

### BR-06: سطوح کاربری و ریپوتیشن
*   **رانندگان**: 5 سطح (1 تا 5 ستاره). سطح بالاتر اجازه حمل بارهای با ارزش بیشتر و دریافت حداقل تعداد تحویل‌های مشخص را می‌دهد (رجوع به `SYSTEM-DESIGN.md`).
*   **فروشندگان**: 5 سطح (1 تا 5 ستاره) بر اساس حداقل تعداد فروش.
*   **ریپوتیشن (Reputation)**: از 0 تا 100 محاسبه می‌شود (NEWBIE, TRUSTED, PROFESSIONAL, ELITE). اختلافات باز (`openDisputes`) و تخلفات (`violations`) این امتیاز را کاهش می‌دهند.

---

## 3. Sequence Diagrams (جریان کامل سناریوها)

*(Note: In actual implementation, tools like Mermaid.js would be used here. Below is a text-based sequence representation)*

### 3.1 Freight Lifecycle (چرخه حیات حمل بار)

```text
Shipper -> Backend API: POST /api/v1/cargo (Details)
Backend API -> Shipper: Returns Cargo ID
Shipper -> Frontend: Generate pickupCode & deliveryCode, hash them
Shipper -> Wallet: Sign Meta-Tx `createFreight(id, pickupHash, deliveryHash, value)`
Frontend -> Backend Relayer: POST /relay { tx, signature }
Backend Relayer -> Forwarder Contract: execute()
Forwarder Contract -> FreightEscrow: createFreight() (State: CREATED)

Shipper -> Wallet: Sign Meta-Tx `fund(id, amount)`
Frontend -> Backend Relayer: POST /relay { tx, signature }
Backend Relayer -> Forwarder Contract -> FreightEscrow: fund() (State: FUNDED)

Driver -> Wallet: Sign Meta-Tx `acceptJob(id, collateral)`
Frontend -> Backend Relayer -> Forwarder Contract -> FreightEscrow: acceptJob() (State: ACCEPTED)

Driver -> Shipper: (Physical Interaction) Receives Cargo & pickupCode
Driver -> Wallet: Sign Meta-Tx `pickUp(id, pickupCode, photoHash, photoUrl)`
Frontend -> Backend Relayer -> Forwarder Contract -> FreightEscrow: pickUp() (State: PICKED_UP)

Driver -> Wallet: Sign Meta-Tx `startTransit(id, deadline, penalty)`
Frontend -> Backend Relayer -> Forwarder Contract -> FreightEscrow: startTransit() (State: IN_TRANSIT)

Driver -> Destination: (Physical Interaction) Arrives
Driver -> Wallet: Sign Meta-Tx `markDelivered(id)`
Frontend -> Backend Relayer -> Forwarder Contract -> FreightEscrow: markDelivered() (State: DELIVERED)

Buyer/Shipper -> Wallet: Sign Meta-Tx `confirmDelivery(id, deliveryCode)`
Frontend -> Backend Relayer -> Forwarder Contract -> FreightEscrow: confirmDelivery()
FreightEscrow -> FreightEscrow: Calculate Penalties & Fees
FreightEscrow -> Driver Wallet: Transfer (Amount - Fee - Penalty) + Collateral
FreightEscrow -> Platform Wallet: Transfer (Fee + Penalty)
(State: RELEASED)
```

---

## 4. Event Catalog (کاتالوگ رویدادها)

رویدادهایی (Events) که توسط قراردادهای هوشمند Emit می‌شوند تا بک‌اند بتواند وضعیت را همگام‌سازی کند.

### 4.1 FreightEscrow Events
*   `FreightCreated(string id, address indexed shipper, uint256 amount, uint256 cargoValue)`
*   `FreightFunded(string id)`
*   `FreightAccepted(string id, address indexed driver, uint256 collateral)`
*   `FreightPickedUp(string id)`
*   `TransitStarted(string id, uint256 deadline, uint256 penalty)`
*   `FreightDelivered(string id)`
*   `FreightConfirmed(string id)`
*   `FreightReleased(string id, uint256 amount)`: نشان‌دهنده پرداخت نهایی به راننده.
*   `FreightDisputed(string id)`
*   `FreightCancelled(string id)`

### 4.2 RetailEscrow Events
*   `OrderCreated(string id, address indexed buyer, address indexed seller, uint256 total)`
*   `OrderFunded(string id)`
*   `DriverAssigned(string id, address indexed driver)`
*   `OrderDelivered(string id)`
*   `OrderConfirmed(string id)`
*   `OrderDisputed(string id)`
*   `OrderRefunded(string id)`

---

## 5. Permission Matrix (ماتریس دسترسی نقش‌ها)

| Function / Action | Shipper | Driver | Buyer | Seller | Admin | Anyone / Platform |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Freight: create** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Freight: fund** | ✅ (If Owner) | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Freight: acceptJob** | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Freight: pickUp** | ❌ | ✅ (If Assigned) | ❌ | ❌ | ❌ | ❌ |
| **Freight: transit/deliver** | ❌ | ✅ (If Assigned) | ❌ | ❌ | ❌ | ❌ |
| **Freight: confirm** | ✅ (If Owner) | ✅ (If Assigned) | ❌ | ❌ | ❌ | ❌ |
| **Freight: dispute** | ✅ (If Owner) | ✅ (If Assigned) | ❌ | ❌ | ❌ | ❌ |
| **Retail: create** | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| **Retail: fund** | ❌ | ❌ | ✅ (If Owner) | ❌ | ❌ | ❌ |
| **Retail: assignDriver**| ❌ | ❌ | ❌ | ✅ (If Seller) | ✅ | ❌ |
| **Retail: confirm** | ❌ | ❌ | ✅ (If Owner)| ✅ (If Seller) | ❌ | ❌ |
| **Resolve Disputes** | ❌ | ❌ | ❌ | ❌ | ✅ (`ADMIN_ROLE`) | ❌ |
| **Pause Contracts** | ❌ | ❌ | ❌ | ❌ | ✅ (`PAUSER_ROLE`)| ❌ |
| **Refund Retail** | ❌ | ❌ | ❌ | ❌ | ✅ (`ADMIN_ROLE`) | ❌ |

---

## 6. Exception & Recovery Flows (سناریوهای خطا و بازیابی)

### EF-01: راننده بار را تحویل نمی‌دهد یا گم می‌کند
*   **محرک (Trigger)**: فرستنده یا خریدار متوجه عدم تحویل یا مفقودی بار می‌شوند.
*   **جریان**:
    1. فرستنده `raiseDispute()` را فراخوانی می‌کند. (وضعیت -> `DISPUTED`).
    2. ادمین مستندات را بررسی می‌کند.
    3. ادمین متوجه تقصیر راننده می‌شود و `resolveDispute()` را فراخوانی می‌کند.
    4. وجه کرایه به همراه **وثیقه راننده (Collateral)** به عنوان خسارت به فرستنده (`shipper`) پرداخت می‌شود. راننده جریمه شده و وثیقه خود را از دست می‌دهد (Slash).
    5. امتیاز Reputation راننده کاهش یافته و در بک‌اند `violations` او افزایش می‌یابد.

### EF-02: خرابی Relayer بک‌اند (Backend Relayer Downtime)
*   **محرک**: سرور بک‌اند آفلاین است یا درخواست‌های `/api/v1/relay` با خطای 500/Timeout مواجه می‌شوند.
*   **جریان (Recovery)**:
    1. هوک `useRelayTx` در فرانت‌اند خطا را Catch می‌کند.
    2. فرانت‌اند به مکانیزم Fallback سوییچ می‌کند.
    3. مستقیماً کیف پول کاربر (مثلاً MetaMask) را فراخوانی کرده تا متد قرارداد را با استفاده از `walletClient.sendTransaction` (و پرداخت هزینه Gas توسط خود کاربر) اجرا کند.
    4. عملیات روی شبکه بلاکچین بدون نیاز به Relayer با موفقیت انجام می‌شود.

### EF-03: فرستنده از تحویل بار انصراف می‌دهد
*   **محرک**: فرستنده قبل از پذیرش راننده تصمیم به لغو می‌گیرد.
*   **جریان**:
    1. فرستنده `cancel()` را فراخوانی می‌کند.
    2. قرارداد بررسی می‌کند که وضعیت `CREATED` یا `FUNDED` باشد.
    3. اگر `FUNDED` باشد، قرارداد USDT را به فرستنده باز می‌گرداند.
    4. وضعیت به `CANCELLED` تغییر می‌یابد.

---

## 7. Smart Contract Interaction Specification (تعامل Backend و بلاکچین)

بک‌اند (NestJS) از طریق `BlockchainService` و کتابخانه `ethers.js` با گره (Node) بلاکچین ارتباط برقرار می‌کند:

1.  **Relayer Service**:
    *   درخواست‌های Meta-Transaction را دریافت می‌کند.
    *   امضاها را با استفاده از EIP-712 Typed Data بررسی می‌کند (اگرچه قرارداد `Forwarder` نیز این کار را روی زنجیره انجام می‌دهد، اما بک‌اند می‌تواند برای جلوگیری از Spam پیش-بررسی انجام دهد).
    *   تراکنش را از طریق کلید خصوصی پلتفرم (که دارای اتر/ماتیک است) به متد `Forwarder.execute` ارسال می‌کند.
2.  **Event Listeners** *(در فازهای بعدی توسعه)*:
    *   بک‌اند به رویدادهای بلاکچین (مثل `FreightFunded`, `OrderConfirmed`) گوش می‌دهد.
    *   پس از دریافت رویداد، پایگاه داده محلی (Prisma PostgreSQL) را به‌روزرسانی می‌کند تا داشبوردهای کاربران سریعاً رفرش شوند (Event Indexing).
3.  **Authentication**:
    *   از SIWE (Sign-In with Ethereum) استفاده می‌شود. پیام توسط کیف پول امضا شده و بک‌اند با استفاده از `@spruceid/siwe` آن را تأیید کرده و یک توکن JWT صادر می‌کند.

---

## 8. API Contract Specification (تعریف خلاصه API)

برای لیست کامل 75+ اندپوینت به `SYSTEM-DESIGN.md` رجوع کنید. در اینجا مهم‌ترین اینترفیس‌ها مشخص شده‌اند:

### 8.1 Meta-Transactions
*   `POST /api/v1/relay`: ارسال امضای EIP-712.
    *   **Payload**: `{ req: ForwardRequest, signature: string }`
    *   **Response**: `{ txHash: string }`
*   `GET /api/v1/relay/nonce/:wallet`: دریافت Nonce فعلی برای EIP-2771.
    *   **Response**: `{ nonce: number }`

### 8.2 Authentication (SIWE)
*   `POST /api/v1/auth/nonce`: دریافت Nonce تصادفی برای SIWE.
    *   **Payload**: `{ address: string }`
    *   **Response**: `{ nonce: string }`
*   `POST /api/v1/auth/verify`: تأیید امضا و ورود.
    *   **Payload**: `{ message: object, signature: string, role: string }`
    *   **Response**: `{ token: string, user: UserObject }`

### 8.3 Core Entities (Freight)
*   `GET /api/v1/cargo`: لیست بارهای موجود (فیلتر شده).
*   `GET /api/v1/cargo/:id`: جزئیات یک بار خاص.
*   `POST /api/v1/cargo`: ایجاد رکورد بار جدید در دیتابیس.

### 8.4 Users & Reputation
*   `GET /api/v1/users/:wallet/reputation`: دریافت امتیاز و سطح کاربری.
*   `POST /api/v1/users/roles`: اضافه/تغییر نقش کاربری فعلی.
