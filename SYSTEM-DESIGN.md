# سند معماری نهایی پلتفرم لجستیک غیرمتمرکز (Ghachagh)

> **نسخه:** 3.0
> **آخرین به‌روزرسانی:** ۱۴۰۵
> **وضعیت:** فعال (Development)
> **منبع:** ۳۲۵ فایل | ~۲۰۲٬۰۲۵ خط کد | ۷۵+ API endpoint | ۳ قرارداد هوشمند (۸۶۰ خط Solidity)

---

## ۱. نمای کلی معماری

```
┌─────────────────────────────────────────────────────────────────┐
│                      کلاینت‌ها (Frontend)                         │
│   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│   │ فرستنده  │ │ راننده   │ │ خریدار   │ │ فروشنده  │          │
│   └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘          │
│        │            │            │            │                  │
│        └────────────┴────────────┴────────────┘                  │
│                            │                                     │
│              ┌─────────────┴─────────────┐                       │
│              │    Next.js 14 (App Router) │                       │
│              │  wagmi + viem + ethers v6  │                       │
│              │  Zustand + TanStack Query │                       │
│              │  TailwindCSS + Lucide     │                       │
│              │  react-hot-toast          │                       │
│              └─────────────┬─────────────┘                       │
└────────────────────────────┼─────────────────────────────────────┘
                             │ HTTP REST / FormData / Relay
┌────────────────────────────┼─────────────────────────────────────┐
│                 ┌──────────┴──────────┐                          │
│                 │   API Gateway (4000)  │  ← NestJS 10 + SWC     │
│                 │   Helmet + CORS +    │                          │
│                 │   Rate Limiting      │                          │
│                 └──────────┬──────────┘                          │
│                            │                                      │
│          ┌─────────────────┼──────────────────┐                   │
│          ▼                 ▼                  ▼                   │
│   ┌────────────┐   ┌──────────────┐   ┌────────────┐             │
│   │ Smart      │   │ In-Memory   │   │ External   │             │
│   │ Contracts  │   │ DB (Maps)   │   │ Postgres    │             │
│   │ ┌ Freight  │   │ Redis       │   │ Email,     │             │
│   │ └ Retail   │   │ (optional)  │   │ Google     │             │
│   │ Forwarder  │   │              │   │ Auth       │             │
│   └────────────┘   └──────────────┘   └────────────┘             │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

### لایه‌ها

| لایه | فناوری | توضیح |
|------|--------|-------|
| **Presentation** | Next.js 14 (App Router) SSR/CSR | ۴ پنل کاربری + landing page + admin control center |
| **API Gateway** | NestJS 10 (Express) | REST API یکپارچه + رله meta-transaction |
| **Smart Contracts** | Solidity 0.8.20 / Hardhat | FreightEscrow + RetailEscrow + Forwarder (EIP-2771) |
| **Data** | In-memory Map / Postgres / Redis | ذخیره‌سازی موقت + دائمی |
| **Auth** | SIWE + JWT + OAuth (Google) + Email | احراز هویت چهارگانه |
| **Meta-Tx** | EIP-2771 + Forwarder | تراکنش‌های بدون گس از طریق رله بک‌اند |
| **i18n** | Zustand persist (localStorage) | فارسی + انگلیسی با سوئیچ لحظه‌ای |

---

## ۲. ساختار پروژه (Monorepo / Turborepo)

```
ghachagh/
├── contracts/                 # ← Smart Contracts (Hardhat + Solidity)
│   ├── contracts/
│   │   ├── FreightEscrow.sol      # 532 lines — قرارداد حمل بار
│   │   ├── RetailEscrow.sol       # 250 lines — قرارداد خرده‌فروشی
│   │   ├── Forwarder.sol          # 78 lines — رله EIP-2771
│   │   ├── GhachaghEscrow.sol     # 291 lines — (legacy) قرارداد قدیمی
│   │   ├── EscrowV2.sol           # 502 lines — (legacy) قرارداد قدیمی لجستیک
│   │   └── Escrow.sol             # (legacy)
│   ├── scripts/
│   │   ├── deploy.ts              # دیپلوی EscrowV2
│   │   ├── deploy-ghachagh.ts     # دیپلوی GhachaghEscrow
│   │   ├── deploy-v2.ts / v3.ts   # نسخه‌های قبلی
│   │   ├── deploy-v4.ts           # دیپلوی FreightEscrow + RetailEscrow + Forwarder
│   │   ├── e2e-test.ts            # تست یکپارچه (legacy)
│   │   └── e2e-v4.ts              # تست یکپارچه v4 ✓
│   ├── test/
│   └── hardhat.config.ts
│
├── backend/                   # ← API Gateway (NestJS Monorepo)
│   ├── apps/
│   │   └── api-gateway/
│   │       └── src/
│   │           ├── gateways/
│   │           │   └── gateway.controller.ts  │ 3526 lines — ۷۵+ endpoint
│   │           └── services/
│   │               ├── blockchain.service.ts   │ 287 lines — ۳ قرارداد + ۶ event listener
│   │               └── relayer.service.ts      │ 92 lines — رله meta-tx
│   ├── libs/
│   └── package.json
│
├── frontend/                  # ← Web App اصلی (Next.js 14)
│   ├── app/                   # ۱۴ مسیر (صفحات)
│   ├── components/            # auth/ layout/ cargo/ chat/ map/
│   ├── lib/
│   │   ├── contracts/
│   │   │   ├── ghachagh-escrow-abi.ts    # (legacy)
│   │   │   ├── freight-escrow-abi.ts     # ABI جدید حمل بار
│   │   │   ├── retail-escrow-abi.ts      # ABI جدید خرده‌فروشی
│   │   │   └── usdt-abi.ts
│   │   └── hooks/
│   │       ├── useGhachaghEscrow.ts      # (legacy)
│   │       ├── useFreightEscrow.ts       # هوک جدید حمل بار
│   │       └── useRetailEscrow.ts        # هوک جدید خرده‌فروشی
│
├── apps/web/                  # ← کپی دوم برای استقرار جداگانه
│   └── (mirror کامل frontend/)
│
├── smart-contracts/           # (کپی قدیمی)
├── mobile/                    # (خالی)
├── infra/                     # (docker/k8s)
├── tor/                       # کانفیگ Tor
│
├── turbo.json                 # Turborepo pipeline
├── package.json               # Workspace root
├── start.sh                   # لانچر همه سرویس‌ها
└── SYSTEM-DESIGN.md           # ← این سند
```

### آمار کدها (خطوط)

| بخش | تعداد فایل‌ها | خطوط |
|-----|--------------|-------|
| **کل پروژه** | **۳۲۵ فایل** | **~۲۰۲,۰۲۵ خط** |
| Smart Contracts (v4) | ۳ فایل جدید | ۸۶۰ خط |
| Smart Contracts (کل) | ۶ فایل | ۱,۶۵۳ خط |
| Backend (API Gateway) | ۱ فایل اصلی | ~۳,۵۲۶ خط |
| Frontend Pages | ۲۸ فایل (×۲) | ~۸,۵۰۰ خط |
| Frontend Components | ۵ فایل | ~۱,۲۰۰ خط |
| i18n Translations | ۴ فایل | ~۲,۲۰۰ خط |

---

## ۳. Roles و احراز هویت

### ۳.۱ چهار نقش سیستم

| نقش | پنل | مسیر | دسترسی‌ها |
|-----|-----|------|----------|
| 📦 **فرستنده (Shipper)** | `/shipper` | ثبت بار، انتخاب راننده، پیگیری، اختلاف |
| 🚚 **راننده (Driver)** | `/driver` | پیشنهاد قیمت، حمل بار، دریافت وجه، سطح‌بندی |
| 🛒 **خریدار (Buyer)** | `/buyer` | خرید کالا با اسکرو، تأیید تحویل، کیف پول |
| 🏪 **فروشنده (Seller)** | `/seller` | فروش کالا، مدیریت محصولات، آمار، سطح‌بندی |
| 🛡️ **مدیر (Admin)** | `/admin` | ۱۰ ماژول مدیریتی (داشبورد، کاربران، اختلافات، امنیت، ...) |

### ۳.۲ چند-نقشی (Multi-Role)

- هر کاربر می‌تواند **چند نقش همزمان** داشته باشد
- فیلد `roles: UserRole[]` در user object
- نقش اصلی (`role`) = اولین نقش در آرایه
- API: `POST /api/v1/user/roles` و `GET /api/v1/user/roles`

### ۳.۳ روش‌های احراز هویت

| روش | جزئیات |
|-----|--------|
| **Wallet (SIWE)** | Nonce → Sign Message (MetaMask) → Verify → JWT |
| **Email + Password** | Register → Verify Code → Login → JWT |
| **Google OAuth** | Google Login → Backend Verify Token → JWT |

### ۳.۴ جریان Wallet Auth

```
1. کاربر نقش را انتخاب می‌کند (shipper/driver/buyer/seller/admin)
2. MetaMask متصل می‌شود (connect)
3. GET /api/v1/auth/nonce ← دریافت message برای امضا
4. Wallet signMessage(message) ← امضای پیام در MetaMask
5. POST /api/v1/auth/verify { walletAddress, signature, message, role }
6. دریافت JWT + user object + role
7. ذخیره در Zustand store → ریدایرکت به پنل نقش انتخاب‌شده
```

### ۳.۵ امنیت احراز هویت

- **SIWE Domain Validation**: دامنه پیام امضا اعتبارسنجی می‌شود
- **JWT**: توکن با انقضای ۲۴ ساعت
- **Nonce یکبار مصرف**: هر nonce فقط یکبار قابل استفاده
- **x-wallet-address header**: تمام درخواست‌های API از این هدر برای شناسایی کاربر استفاده می‌کنند

---

## ۴. قراردادهای هوشمند (معماری دو-قراردادی)

سیستم از **دو قرارداد مجزا** به جای یک قرارداد یکپارچه استفاده می‌کند:

### ۴.۱ FreightEscrow — قرارداد حمل بار (باربری)

| ویژگی | مقدار |
|--------|-------|
| فایل | `contracts/contracts/FreightEscrow.sol` |
| خطوط | ۵۳۲ خط |
| Token | USDT (ERC20) |
| امنیت | ReentrancyGuard + AccessControl + Pausable + SafeERC20 |
| Meta-Tx | EIP-2771 (trustedForwarder) |

**State Machine:**

```
CREATED → FUNDED → ACCEPTED → PICKED_UP → IN_TRANSIT → DELIVERED → CONFIRMED → RELEASED
                                              ↘ DISPUTED → RELEASED / CANCELLED
```

| وضعیت | توضیح | توسط |
|-------|-------|------|
| `CREATED` | بارنامه ایجاد شده | فرستنده |
| `FUNDED` | وجه واریز شده | فرستنده |
| `ACCEPTED` | راننده بار را پذیرفت + وثیقه واریز کرد | راننده |
| `PICKED_UP` | بارگیری با کد pickup | راننده |
| `IN_TRANSIT` | در مسیر حمل + مهلت تحویل تنظیم شد | راننده |
| `DELIVERED` | تحویل به مقصد | راننده |
| `CONFIRMED` | تأیید نهایی (با deliveryCode یا توسط فرستنده) | خریدار/فرستنده |
| `RELEASED` | وجه آزاد شد (اتوماتیک) | — |
| `DISPUTED` | اختلاف ثبت شده | هر دو طرف |
| `CANCELLED` | لغو (قبل از FUNDED) | فرستنده |

**ساختار:**

```solidity
struct Freight {
    string id;
    address shipper;
    address driver;
    uint256 amount;              // مبلغ کرایه
    uint256 cargoValue;          // ارزش بار
    uint256 collateralAmount;    // وثیقه راننده
    bytes32 pickupHash;
    bytes32 deliveryHash;
    bytes32 photoHash;
    string photoUrl;
    uint256 deliveryDeadline;
    uint256 latePenaltyPerDay;
    State state;
    uint256 createdAt, fundedAt, acceptedAt, pickedUpAt, deliveredAt, confirmedAt, releasedAt;
}
```

**توابع اصلی:**

| تابع | caller | توضیح |
|------|--------|-------|
| `createFreight` | shipper | ایجاد بارنامه با هش کدها |
| `fund` | shipper | واریز کرایه (USDT) |
| `acceptJob` | driver | پذیرش + واریز وثیقه (collateral) |
| `pickUp` | driver | بارگیری با کد pickup + عکس |
| `startTransit` | driver | شروع حمل + مهلت + جریمه |
| `markDelivered` | driver | تحویل به مقصد |
| `confirmDelivery` | shipper/driver | تأیید نهایی با deliveryCode |
| `confirmAsShipper` | shipper | تأیید بدون کد (برای فرستنده) |
| `raiseDispute` | هر دو طرف | ثبت اختلاف |
| `resolveDispute` | ADMIN | حل اختلاف + توزیع وجه |
| `stakeBond` | driver | واریز وثیقه راننده |
| `withdrawBond` | driver | برداشت وثیقه |
| `claimInsurance` | shipper | دریافت خسارت از صندوق بیمه |

**سیستم وثیقه (Bond):**
- راننده برای پذیرش بار باید وثیقه واریز کند (≥ ارزش بار)
- وثیقه پس از تأیید تحویل آزاد می‌شود
- در صورت تخلف، وثیقه جریمه (Slash) می‌شود

**جریمه تأخیر (Late Penalty):**
- روزانه بر اساس `latePenaltyPerDay` basis points
- حداکثر ۲۰٪ از مبلغ قرارداد
- وجه جریمه به حساب کارمزد (پلتفرم) واریز می‌شود

### ۴.۲ RetailEscrow — قرارداد خرده‌فروشی

| ویژگی | مقدار |
|--------|-------|
| فایل | `contracts/contracts/RetailEscrow.sol` |
| خطوط | ۲۵۰ خط |
| Token | USDT (ERC20) |
| امنیت | ReentrancyGuard + AccessControl + Pausable + SafeERC20 |
| Meta-Tx | EIP-2771 (trustedForwarder) |

**State Machine:**

```
CREATED → FUNDED → DELIVERED → CONFIRMED
                   ↘ DISPUTED → CONFIRMED / REFUNDED
```

| وضعیت | توضیح |
|-------|-------|
| `CREATED` | سفارش ثبت شد (buyer) |
| `FUNDED` | وجه واریز شد (buyer) |
| `DELIVERED` | راننده تحویل داد |
| `CONFIRMED` | خریدار تأیید کرد + وجه آزاد شد |
| `REFUNDED` | بازگشت وجه (توسط ادمین) |
| `DISPUTED` | اختلاف ثبت شد |

**ساختار:**

```solidity
struct Order {
    string id;
    address buyer;
    address seller;
    address driver;
    uint256 amount;          // مبلغ کالا
    uint256 shipping;        // هزینه ارسال
    uint256 total;           // جمع کل
    bytes32 deliveryHash;
    State state;
    uint256 createdAt, fundedAt, confirmedAt;
}
```

**توابع اصلی:**

| تابع | caller | توضیح |
|------|--------|-------|
| `createOrder` | buyer | ثبت سفارش با آدرس فروشنده |
| `fund` | buyer | واریز وجه (USDT) |
| `assignDriver` | anyone | تعیین راننده |
| `markDelivered` | driver | اعلام تحویل |
| `confirmDelivery` | buyer | تأیید با deliveryCode |
| `raiseDispute` | هر طرف | ثبت اختلاف |
| `resolveDispute` | ADMIN | حل اختلاف |
| `refund` | ADMIN | بازگشت وجه |

### ۴.۳ Forwarder — رله Meta-Transaction (EIP-2771)

| ویژگی | مقدار |
|--------|-------|
| فایل | `contracts/contracts/Forwarder.sol` |
| خطوط | ۷۸ خط |
| استاندارد | EIP-2771 |

**جریان Meta-Tx:**

```
1. کاربر در فرانت‌اند درخواست را با EIP-712 TypedData امضا می‌کند
2. امضا + درخواست به POST /api/v1/relay ارسال می‌شود
3. بک‌اند (RelayerService) امضا را验证 و از طریق Forwarder.execute() ارسال می‌کند
4. Forwarder در calldata末尾 `req.from` را ضمیمه می‌کند
5. قرارداد مقصد با `_msgSender()` آدرس واقعی را از calldata استخراج می‌کند
```

```
Frontend                         Backend                         Forwarder
   │                               │                               │
   │── signTypedData(domain, req) ──│                               │
   │                               │                               │
   │── POST /relay { req, sig } ───│                               │
   │                               │── Forwarder.execute(req, sig)──│
   │                               │                               │── req.target.call(data + req.from)
   │                               │                               │
   └───────────────────────────────┴───────────────────────────────┘
```

**Fallback:** اگر رله در دسترس نباشد، کاربر می‌تواند مستقیماً تراکنش بدهد (با پرداخت گس).

### ۴.۴ امنیت قراردادها

| مکانیزم | توضیح |
|---------|-------|
| **ReentrancyGuard** | جلوگیری از حملات بازگشتی روی تمام توابع state-changing |
| **AccessControl** | مدیریت دسترسی: `DEFAULT_ADMIN_ROLE`, `ADMIN_ROLE`, `PAUSER_ROLE` |
| **Pausable** | توقف اضطراری تمام عملیات توسط PAUSER_ROLE |
| **SafeERC20** | استفاده از `safeTransfer` / `safeTransferFrom` برای USDT |
| **Custom Errors** | ۱۰+ خطای سفارشی (Gas-efficient) |
| **Checks-Effects-Interactions** | رعایت الگوی امنیتی در تمام توابع |
| **EIP-2771** | Meta-transaction با Forwarder معتبر |

### ۴.۵ قراردادهای قدیمی (Legacy)

| قرارداد | خطوط | وضعیت |
|---------|-------|--------|
| `GhachaghEscrow.sol` | ۲۹۱ خط | قدیمی — فقط برای backward compatibility |
| `EscrowV2.sol` | ۵۰۲ خط | قدیمی — با MATIC کار می‌کند (جایگزین نشده) |
| `Escrow.sol` | — | قدیمی — اولین نسخه |

---

## ۵. Meta-Transaction Relay

### ۵.۱ معماری رله

```
┌──────────────┐        ┌─────────────────┐        ┌──────────────┐
│   Frontend   │ ────►  │  Backend Relay  │ ────►  │  Forwarder   │
│  (امضا)      │ POST   │  (گس رایگان)    │ execute │  (EIP-2771)  │
└──────────────┘ /relay └─────────────────┘        └──────┬───────┘
                                                          │
                                                  ┌───────┴───────┐
                                                  │  FreightEscrow│
                                                  │ /RetailEscrow │
                                                  └───────────────┘
```

### ۵.۲ EIP-712 TypedData

```typescript
const FORWARD_REQUEST_TYPE = {
  ForwardRequest: [
    { name: 'from', type: 'address' },
    { name: 'target', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'data', type: 'bytes' },
    { name: 'deadline', type: 'uint256' },
  ],
};
```

**نکته امنیتی:** `req.from` در انتهای `calldata` ضمیمه می‌شود (نه هش) تا `_msgSender()` بتواند آن را استخراج کند — این الگوی استاندارد EIP-2771 است.

### ۵.۳ هوک relayTx (استفاده در فرانت‌اند)

```typescript
async function relayTx(contractAddress, funcData, meta) {
  1. GET /relay/nonce/{wallet} ← nonce
  2. signTypedData(domain, FORWARD_REQUEST_TYPE, req)
  3. POST /relay { req, signature }
  ← txHash

  // Fallback (اگر رله خطا داد):
  4. direct sendTransaction (نیاز به گس)
}
```

---

## ۶. API Endpoints (۷۵+ اندپوینت)

### ۶.۱ Health & Auth

| Method | Path | توضیح |
|--------|------|-------|
| `GET` | `/api/v1/health` | Health check |
| `POST` | `/api/v1/auth/nonce` | دریافت پیام SIWE برای امضا |
| `POST` | `/api/v1/auth/verify` | تأیید امضا و دریافت JWT + user |
| `GET` | `/api/v1/auth/profile` | پروفایل کاربر لاگین شده |
| `POST` | `/api/v1/auth/email/register` | ثبت‌نام با ایمیل و رمز |
| `POST` | `/api/v1/auth/email/verify-code` | تأیید کد ارسال شده به ایمیل |
| `POST` | `/api/v1/auth/email/resend-code` | ارسال مجدد کد تأیید |
| `POST` | `/api/v1/auth/email/login` | ورود با ایمیل و رمز |
| `GET` | `/api/v1/auth/email/me` | پروفایل کاربر ایمیل |
| `POST` | `/api/v1/auth/email/logout` | خروج از حساب ایمیل |
| `POST` | `/api/v1/auth/google` | ورود با Google OAuth (id_token) |

### ۶.۲ Meta-Transaction Relay

| Method | Path | توضیح |
|--------|------|-------|
| `POST` | `/api/v1/relay` | ارسال meta-transaction (امضا + درخواست) |
| `GET` | `/api/v1/relay/nonce/:wallet` | دریافت nonce برای امضا |

### ۶.۳ Users

| Method | Path | توضیح |
|--------|------|-------|
| `GET` | `/api/v1/users/:wallet/reputation` | امتیاز + سطح راننده + سطح رانندگی |
| `GET` | `/api/v1/fraud/check/:wallet` | بررسی ریسک کلاهبرداری |
| `POST` | `/api/v1/user/roles` | بروزرسانی نقش‌های کاربر |
| `GET` | `/api/v1/user/roles` | دریافت نقش‌های فعلی کاربر |
| `POST` | `/api/v1/reviews` | ثبت نظر و امتیاز برای قرارداد |

### ۶.۴ Cargo, Bids, Contracts

(همانند نسخه قبلی — ۳۰+ اندپوینت برای مدیریت بار، پیشنهادات، و قراردادهای حمل)

### ۶.۵ Retail Escrow

| Method | Path | توضیح |
|--------|------|-------|
| `GET` | `/api/v1/retail/orders` | لیست سفارش‌ها |
| `POST` | `/api/v1/retail/orders` | ثبت درخواست خرید جدید |
| `POST` | `/api/v1/retail/orders/:id/accept` | قبول سفارش توسط فروشنده |
| `POST` | `/api/v1/retail/orders/:id/fund` | واریز وجه توسط خریدار |
| `POST` | `/api/v1/retail/orders/:id/ship` | ارسال کالا توسط فروشنده |
| `POST` | `/api/v1/retail/orders/:id/confirm` | تأیید تحویل توسط خریدار |
| `POST` | `/api/v1/retail/orders/:id/cancel` | لغو سفارش |
| `GET` | `/api/v1/retail/orders/:id` | جزئیات سفارش |
| `GET` | `/api/v1/retail/products` | لیست محصولات |
| `GET` | `/api/v1/retail/products/:id` | جزئیات محصول |
| `POST` | `/api/v1/retail/products` | ثبت محصول جدید |
| `PUT` | `/api/v1/retail/products/:id` | ویرایش محصول |
| `DELETE` | `/api/v1/retail/products/:id` | حذف محصول |
| `POST` | `/api/v1/retail/products/:id/toggle` | فعال/غیرفعال کردن محصول |
| `GET` | `/api/v1/retail/stats/seller` | آمار فروشنده |
| `GET` | `/api/v1/retail/stats/buyer` | آمار خریدار |

### ۶.۶ Disputes, Chat, Dashboards, Admin

(بیش از ۳۰ اندپوینت اضافی برای اختلافات، پیام‌رسانی، داشبوردهای نقش‌ها، و ۱۰ ماژول مدیریتی)

---

## ۷. داده‌ها (In-Memory Data Model)

پیاده‌سازی در `gateway.controller.ts` با استفاده از Map‌های جاوااسکریپت + Postgres از طریق Prisma.

### ۷.۱  User

```typescript
interface User {
  walletAddress: string;          // کلید اصلی (lowercase)
  role: UserRole | null;          // نقش اصلی
  roles: UserRole[];              // همه نقش‌ها
  name?: string;
  email?: string;
  reputationScore: number;        // 0-100
  reputationLevel: ReputationLevel;
  totalOrders: number;
  completedOrders: number;
  failedOrders: number;
  cancelledOrders: number;
  disputesRaised: number;
  openDisputes: number;
  violations: number;
  repeatedDelays: number;
  driverLevel: number;            // 1-5
  sellerRating?: number;
  totalEarningsWei: string;
  createdAt: string;
}
```

### ۷.۲ Unified Contract

```typescript
interface Contract {
  id: string;
  contract_type: 'FREIGHT' | 'RETAIL';
  // FREIGHT:
  cargoId?: string;
  shipperWallet?: string;
  driverWallet?: string;
  cargoValue?: number;
  amountMatic: number;
  chainContractId?: number | null;
  // RETAIL:
  retailOrderId?: string;
  buyerWallet?: string;
  sellerWallet?: string;
  // Common:
  pickupCode: string;
  deliveryCode: string;
  state: ContractState;
  createdAt: string;
}
```

### ۷.۳ سایر موجودیت‌ها

Cargo, Bid, Dispute, Alert, Transaction, RetailOrder, RetailProduct — همه مشابه نسخه قبل.

---

## ۸. جریان‌های اصلی (Business Flows)

### ۸.۱ حمل بار (FreightEscrow)

```
۱. فرستنده بارنامه ایجاد می‌کند
   → createFreight(freightId, pickupHash, deliveryHash, cargoValue)
۲. فرستنده کرایه را واریز می‌کند
   → fund(freightId, amount) — USDT به قرارداد
۳. راننده پیشنهاد می‌دهد و می‌پذیرد
   → acceptJob(freightId, collateral) — وثیقه به قرارداد
۴. راننده بارگیری می‌کند
   → pickUp(freightId, pickupCode, photoHash, photoUrl)
۵. راننده مسیر را شروع می‌کند
   → startTransit(freightId, deadline, latePenaltyPerDay)
۶. راننده تحویل می‌دهد
   → markDelivered(freightId)
۷. تأیید نهایی
   → confirmDelivery(freightId, deliveryCode) یا confirmAsShipper(freightId)
۸. آزادسازی خودکار وجه
   → RELEASED: driver ← وجه + وثیقه, platform ← کارمزد, insurance ← سهم بیمه
```

### ۸.۲ خرید کالا (RetailEscrow)

```
۱. خریدار سفارش ایجاد می‌کند
   → createOrder(orderId, seller, amount, shipping, deliveryHash)
۲. خریدار وجه واریز می‌کند
   → fund(orderId) — USDT به قرارداد
۳. راننده تعیین می‌شود
   → assignDriver(orderId)
۴. راننده تحویل می‌دهد
   → markDelivered(orderId)
۵. خریدار تأیید می‌کند
   → confirmDelivery(orderId, deliveryCode)
۶. توزیع خودکار وجه
   → CONFIRMED: seller ← مبلغ, driver ← کرایه, platform ← کارمزد
```

### ۸.۳ Meta-Transaction Relay

```
۱. فرانت‌اند تابع مورد نظر را ABI encode می‌کند
۲. Nonce از GET /relay/nonce/:wallet دریافت می‌شود
۳. کاربر درخواست را با EIP-712 امضا می‌کند
۴. POST /relay { req, signature }
۵. بک‌اند امضا را verification می‌کند
۶. Forwarder.execute(req, signature) فراخوانی می‌شود
۷. Forwarder req.from را به calldata ضمیمه می‌کند
۸. قرارداد مقصد _msgSender() را از calldata می‌خواند
۹. تابع مورد نظر اجرا می‌شود

Fallback: اگر رله در دسترس نباشد، کاربر می‌تواند مستقیماً
sendTransaction کند (نیاز به گس دارد)
```

---

## ۹. سیستم سطح‌بندی

### ۹.۱ رانندگان (۵ سطح)

| سطح | ستاره | حداقل تحویل | حداکثر ارزش بار |
|-----|-------|-------------|----------------|
| ۱ | ⭐ | ۰ | ۶۰۰ MATIC |
| ۲ | ⭐⭐ | ۱۵۰ | ۲,۰۰۰ MATIC |
| ۳ | ⭐⭐⭐ | ۳۰۰ | ۶۰,۰۰۰ MATIC |
| ۴ | ⭐⭐⭐⭐ | ۴۵۰ | ۲۰۰,۰۰۰ MATIC |
| ۵ | ⭐⭐⭐⭐⭐ | ۷۵۰ | نامحدود |

### ۹.۲ فروشندگان (۵ سطح)

| سطح | ستاره | حداقل فروش |
|-----|-------|------------|
| ۱ | ⭐ | ۰ |
| ۲ | ⭐⭐ | ۱۰ |
| ۳ | ⭐⭐⭐ | ۵۰ |
| ۴ | ⭐⭐⭐⭐ | ۱۵۰ |
| ۵ | ⭐⭐⭐⭐⭐ | ۴۰۰ |

### ۹.۳ سطح‌بندی ریپوتیشن

| سطح | محدوده امتیاز |
|-----|--------------|
| NEWBIE (تازه‌کار) | ۰-۴۰ |
| TRUSTED (قابل اعتماد) | ۴۱-۷۰ |
| PROFESSIONAL (حرفه‌ای) | ۷۱-۹۰ |
| ELITE (نخبه) | ۹۱-۱۰۰ |

---

## ۱۰. پنل‌های کاربری

(۱۲ بخش landing page + ۷ تب shipper + ۶ تب driver + ۷ تب buyer + ۹ تب seller + ۱۰ ماژول admin — مشابه نسخه قبل)

---

## ۱۱. امنیت

| مکانیزم | توضیح |
|---------|-------|
| **ReentrancyGuard** | جلوگیری از حملات بازگشتی در قراردادها |
| **AccessControl** | RBAC: ADMIN_ROLE, PAUSER_ROLE |
| **Pausable** | توقف اضطراری قرارداد توسط PAUSER_ROLE |
| **SafeERC20** | انتقال امن USDT با بررسی返回值 |
| **Custom Errors** | خطاهای سفارشی (Gas-efficient) |
| **EIP-2771** | Meta-transaction با تأیید Forwarder |
| **SIWE** | Sign-In with Ethereum (EIP-4361) |
| **JWT** | توکن Bearer با انقضای ۲۴ ساعت |
| **Hash Codes** | کدهای pickup/delivery با SHA-256 |
| **Sanitize Contract** | deliveryCode فقط در وضعیت ≥ DELIVERED |
| **CORS** | محدود به دامنه‌های مجاز |
| **Helmet** | هدرهای امنیتی HTTP |
| **Rate Limiting** | محدودیت درخواست (۱۰۰ req/۶۰s) |
| **IP Block** | مسدودسازی دستی IP |
| **Wallet Freeze** | فریز کیف پول از Admin |

---

## ۱۲. محیط‌های اجرا

| محیط | Backend | Frontend | Contract | Network |
|------|---------|----------|----------|---------|
| **Local Development** | ۴۰۰۰ | ۴۰۰۱ | Hardhat Node | `localhost:8545` |
| **Web (second app)** | ۴۰۰۰ | ۴۰۰۲ | Hardhat Node | `localhost:8545` |
| **Testnet** | ۴۰۰۰ | ۴۰۰۱ | Polygon Amoy | `rpc-amoy.polygon.technology` |
| **Production** | — | — | Polygon Mainnet | — |

### آدرس قراردادها (Local Hardhat — 31337)

| قرارداد | آدرس |
|---------|-------|
| Forwarder | `0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0` |
| MockUSDT | `0x5FbDB2315678afecb367f032d93F642f64180aa3` |
| FreightEscrow | `0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9` |
| RetailEscrow | `0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9` |

### متغیرهای محیطی کلیدی

```bash
# Backend
RPC_URL=http://localhost:8545
FREIGHT_ESCROW_ADDRESS=0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9
RETAIL_ESCROW_ADDRESS=0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9
FORWARDER_ADDRESS=0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
USDT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
PORT=4000

# Frontend
NEXT_PUBLIC_FREIGHT_ESCROW_ADDRESS=0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9
NEXT_PUBLIC_RETAIL_ESCROW_ADDRESS=0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9
NEXT_PUBLIC_FORWARDER_ADDRESS=0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
NEXT_PUBLIC_USDT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
NEXT_PUBLIC_CHAIN_ID=31337
```

### اسکریپت‌های اجرا

```bash
# شروع همه سرویس‌ها
./start.sh

# فقط هاردهاد
cd contracts && npx hardhat node
cd contracts && npx hardhat run scripts/deploy-v4.ts --network localhost

# فقط بک‌اند
cd backend && npm run start:dev    # port 4000

# فقط فرانت‌اند
cd frontend && npm run dev          # port 4001
cd apps/web && npm run dev          # port 4002
```

### وابستگی‌های اصلی

**Backend (NestJS 10):**
`@nestjs/common`, `@nestjs/core`, `ethers@^6`, `siwe`, `nodemailer`, `helmet`

**Frontend (Next.js 14):**
`next@^14`, `react@^18`, `wagmi@^2`, `viem@^2`, `@web3modal/wagmi`,
`zustand`, `@tanstack/react-query`, `tailwindcss`, `lucide-react`, `react-hot-toast`

**Smart Contracts:**
`solc@0.8.20`, `hardhat@^2.19`, `@openzeppelin/contracts@^5.6`

---

## ۱۳. ادمین پنل (۱۰ ماژول)

| # | ماژول | آیکون | توضیح |
|---|-------|-------|-------|
| ۱ | Overview | 📊 | ۸ کارت آمار + وضعیت سامانه |
| ۲ | Users | 👥 | جدول کاربران + ویرایش + فریز |
| ۳ | Contracts | 📄 | همه قراردادهای یکپارچه |
| ۴ | Disputes | ⚖️ | گردش کار رأی (۶ نوع تصمیم) |
| ۵ | Transactions | 💰 | خلاصه کارمزد + حجم |
| ۶ | Monitoring | 📡 | آمار زنده |
| ۷ | Alerts | 🔔 | هشدارهای خودکار |
| ۸ | Reports | 📈 | روزانه/هفتگی/ماهانه |
| ۹ | Security | 🔒 | مسدود IP + فریز کیف پول + rate limit |
| ۱۰ | Marketplace | 🏪 | مدیریت محصولات خرده‌فروشی |

---

## ۱۴. Roadmap

### ✅ انجام شده (نسخه ۳.۰)

- [x] **معماری دو-قراردادی**: FreightEscrow (حمل بار) + RetailEscrow (خرده‌فروشی)
- [x] **Meta-Transaction (EIP-2771)**: تراکنش بدون گس از طریق Forwarder + RelayerService
- [x] **امنیت**: ReentrancyGuard, AccessControl (RBAC), Pausable, SafeERC20, Custom Errors
- [x] **سیستم وثیقه (Bond)**: واریز، قفل، آزادسازی، جریمه (Slash)
- [x] **صندوق بیمه**: کسر درصدی از هر قرارداد + امکانclaim خسارت
- [x] **جریمه تأخیر**: late penalty روزانه با سقف ۲۰٪
- [x] **سیستم سطح‌بندی**: ۵ سطح رانندگی + ۵ سطح فروشندگی + ۴ سطح ریپوتیشن
- [x] **خرده‌فروشی امانی**: چرخه کامل create → fund → deliver → confirm
- [x] **پنل خریدار**: داشبورد، بازار، سفارش‌ها، کیف پول
- [x] **پنل فروشنده**: داشبورد، کالاها، سفارش‌ها، آمار
- [x] **نمایش یکپارچه قراردادها**: FREIGHT + RETAIL در یک视图
- [x] **ادمین پنل**: ۱۰ ماژول مدیریتی (Overview, Users, Contracts, Disputes, Transactions, Monitoring, Alerts, Reports, Security, Marketplace)
- [x] **حل اختلاف**: ۶ نوع تصمیم (آزادسازی، بازگشت، تقسیم، مسدود)
- [x] **چند-نقشی (Multi-Role)**: هر کاربر می‌تواند چند نقش همزمان داشته باشد
- [x] **i18n**: فارسی + انگلیسی (۵۵۰+ کلید ترجمه)
- [x] **SSR-safe hydration**: بدون خطای hydration در Next.js
- [x] **Relay fallback**: اگر رله در دسترس نباشد، کاربر مستقیم تراکنش می‌دهد
- [x] **ABI + هوک اختصاصی**: useFreightEscrow + useRetailEscrow با relayTx داخلی

### 📋 در حال انجام

- [ ] استقرار روی Polygon Amoy (Testnet)
- [ ] تکمیل سیستم امتیازدهی و نظر
- [ ] چت لحظه‌ای با Socket.IO
- [ ] مدیریت کیف پول (واریز/برداشت کاربر)

### 🔜 برنامه آینده

- [ ] سیستم رهگیری GPS با نقشه
- [ ] استقرار روی Polygon Mainnet
- [ ] اپلیکیشن موبایل (React Native)
- [ ] اعتبارسنجی گواهینامه رانندگی
- [ ] احراز هویت两步 (2FA)
- [ ] داشبورد تحلیلی با نمودار
- [ ] حاکمیت DAO برای کارمزدها

---

## ۱۵. عیب‌یابی رایج

| مشکل | راه‌حل |
|------|--------|
| **MetaMask متصل نمی‌شود** | نصب MetaMask + انتخاب شبکه Hardhat (chainId: 31337) |
| **خطای Nonce** | پاک کردن localStorage + رفرش صفحه |
| **Backend خطای RPC** | اجرای `npx hardhat node` در ترمینال جداگانه |
| **Error: Contract not found** | اجرای `npx hardhat run scripts/deploy-v4.ts --network localhost` |
| **Relay fails** | بررسی `FORWARDER_ADDRESS` در `.env` + `trustedForwarder` در قرارداد |
| **Frontend خطای ۴۰۴** | بررسی `NEXT_PUBLIC_API_URL=http://localhost:4000` |
| **کد تحویل نمایش داده نمی‌شود** | بررسی وضعیت قرارداد (باید ≥ DELIVERED باشد) |
| **خطای CORS** | بررسی `CORS_ORIGIN` در بک‌اند |
| **USDT approve failed** | بررسی موجودی + allowance در MetaMask |
| **Driver can't accept job** | بررسی موجودی وثیقه (باید ≥ ارزش بار باشد) |

---

> **این سند آخرین بار در ۱۴۰۵ به‌روزرسانی شده و منعکس‌کننده وضعیت فعلی سیستم با ۳۲۵ فایل منبع، ~۲۰۲,۰۲۵ خط کد، ۳ قرارداد هوشمند جدید (نسخه ۴)، و پشتیبانی از Meta-Transaction است.**
