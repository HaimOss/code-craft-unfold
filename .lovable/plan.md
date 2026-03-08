

## Plan: Expand Currency List + Smart Rate Logic

### What
1. **Add more currencies** to the `CURRENCIES` list and `CURRENCY_SYMBOLS` map — common travel currencies like AUD, CAD, NZD, SEK, NOK, DKK, PLN, CZK, HUF, TRY, KRW, SGD, HKD, MXN, BRL, ZAR, INR, etc.

2. **Smart rate logic in `currencyService.ts`** — implement the user's requested behavior:
   - If the event date is **in the future or today** → use `latest` rate (planning phase, rate updates daily)
   - If the event date is **in the past** → use the **historical rate** for that date (rate is locked)
   - This is already partially working since `normalizeCost` passes `event.date` to the Frankfurter API. The fix is to explicitly check: if `date >= today`, override to `latest`; if `date < today`, use the actual date.

### Technical Details

**`src/constants.ts`**:
- Expand `CURRENCIES` array with ~15 more popular currencies
- Expand `CURRENCY_SYMBOLS` map with matching symbols

**`src/services/currencyService.ts`**:
- Before making the API call, compare the `date` param to today:
  - `date >= today` → use `'latest'` endpoint (so planning always gets fresh rates)
  - `date < today` → use the historical `date` endpoint (locks in the rate for past days)
- Cache keys remain the same — historical dates cache permanently, `latest` caches per session

No database or other file changes needed. The Frankfurter API supports all these currencies natively.

