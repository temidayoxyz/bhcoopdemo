# SeedCoop

Digital operating system for a thrift cooperative: referral join & onboarding, share capital, contributions, deposit wallet, loans, investments, dividends, development fees, and staff governance — on one shared ledger.

**Live demo:** https://temidayoxyz.github.io/seedcoopdemo/

---

## Quick start

```bash
npm install
npm run dev
```

App runs at **http://localhost:3010**

Password for every seeded demo account: **`seedcoop`**

---

## Demo accounts

### Staff (also members)

| Name | Email | Role | Member ID | Duties |
|------|-------|------|-----------|--------|
| Dan Segun | `admin@seedcoop.ng` | Super Admin | **SC-001** | Full control, final money-out, roles. Referral code = **SC-001** |
| Tunde Bakare | `treasurer@seedcoop.ng` | Financial Secretary | SC-002 | Savings ops, fees, first money-out approval |
| Ola Dayo | `ops@seedcoop.ng` | Admin | SC-003 | Applications, suspend, second money-out approval |

### Members (password `seedcoop`)

| ID | Name | Opening position |
|----|------|------------------|
| SC-004 | Ada Okonkwo | Fully paid · shares met · strong savings |
| SC-005 | Chidi Okafor | Partial dues · active emergency loan · trial clean |
| SC-006 | Temidayo Adebayo | Arrears · development fee unpaid |
| SC-007 | Fatima Bello | Normal loan nearly complete · non-resident |
| SC-008 | Emeka Nwosu | Normal loan awaiting FS approval |
| SC-009 | Ngozi Eze | Recent deposit withdrawal |
| SC-010 | Ibrahim Yusuf | New · needs minimum shares · trial available |

Use **Restore default cooperative data** on the sign-in page before a clean walkthrough.

---

## What you can demo

1. **Join** (`/join`) with referral **`SC-001`** → pay ₦2,000 → KYM → admin approve → sign in with your password (you appear on `/login` members list)  
2. **Shares** — buy min ₦20,000 on the Shares tab only (not mixed with savings)  
3. **Savings** — monthly thrift obligations (renamed from Contributions)  
4. **Trial loan** → unlock Normal & Emergency  
5. **Money-out chain** — Financial Secretary → Admin → Super Admin  
6. **Withdraw** deposit wallet only (instant)  
7. **Dividends** — share-weighted; credit to deposit wallet  
8. **Super Admin** — assign staff roles only (Member is default); remove staff role to demote  

### Dividend formula

For each active member with shares &gt; 0:

```
member_dividend = floor( surplus × member_shares / total_shares )
```

Remainder kobo go to the largest shareholder so the pool always sums exactly.

---

## Stack

React 19 · Vite · TypeScript · Tailwind CSS · client-side cooperative state (static / GitHub Pages) · Express optional for local API

---

## License

Private demo project.
