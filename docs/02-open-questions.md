# GameHub — Open Questions (Resolved)

**Version:** v1.0 Resolved  
**Date:** 2026-08-23  
**Status:** ✅ LOCKED — Owner approved all Proposed defaults on 2026-08-23  
**Parent:** `01-user-workflows.md` v1.0

All **Proposed** values below are now the authoritative decisions for Business Rules and NoSQL Design. No further input required unless owner reopens.

---

## Resolved Decisions (Authoritative)

| # | Question | Locked Answer | Business Rule |
|---|----------|---------------|---------------|
| Q01 | Grace before NO_SHOW | **15 min** auto → NO_SHOW | BR-14 |
| Q02 | Cleaning buffer | **10 min** between bookings | BR-03 |
| Q03 | Customer accounts | **Guest only (name+contact)**; USER accounts deferred | BR-02 |
| Q04 | Cancel window | **Any time before startTime** | BR-15 |
| Q05 | Max advance | **7 days** | BR-04 |
| Q06 | Overlapping per contact | **No** — one active per contact per slot | BR-03 |
| Q07 | Billing unit | **Per minute, ceil to minute** | BR-19 |
| Q08 | Extension increment | **Any 15–240 min** | BR-17 |
| Q09 | Max extensions | **Unlimited** (audited) | BR-17 |
| Q10 | Extension rate | **Same pricingSnapshot** | BR-20 |
| Q11 | Overrun extension | **Yes, before payment** | BR-17 |
| Q12 | Who can extend/end | **CASHIER+ADMIN** | BR-28 |
| Q13 | Queue vs reservation priority | **Reservations win** | BR-22 |
| Q14 | CALLED expiry | **10 min → EXPIRED** | BR-23 |
| Q15 | Preferred table | **Preference only** | BR-22 |
| Q16 | Payment methods | **Cash + GCash (manual ref)** | BR-25 |
| Q17 | Partial payment | **No — full payment required** | BR-26 |
| Q18 | Void permission | **ADMIN only, reason required** | BR-27 |
| Q19 | Receipt | **Screen + printable** | — |
| Q20 | MAINTENANCE blocks reservations | **Yes, block new** | BR-01 |
| Q21 | Pricing model | **Flat per hour with effectiveFrom** | BR-20 |
| Q22 | Rate retroactive | **Never — snapshot preserved** | BR-21 |
| Q23 | Cashier schedule enforcement | **Soft warning (allow but log)** | BR-29 |
| Q24 | Logs retention | **Forever** | BR-30 |
| Q25 | Dashboard refresh | **Poll 30s** | Arch |
| Q26 | PII visibility | **Full to CASHIER/ADMIN, masked public** | BR-31 |
| Q27 | Email | **Phone only, email optional** | BR-02 |

Reopen by editing this file and notifying the programmer.

*End of 02-open-questions.md — LOCKED*
