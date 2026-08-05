# Blessed Hands

Digital operating system for a thrift & credit cooperative: referral join & onboarding, share capital, savings, deposit wallet, loans, investments, dividends, development fees, and staff governance — on one shared ledger.

**Org:** Blessed Hands · **Member codes:** `BH-###` · **Repo:** [temidayoxyz/bhcoopdemo](https://github.com/temidayoxyz/bhcoopdemo)

**Live demo:** https://temidayoxyz.github.io/bhcoopdemo/

---

## Quick start

```bash
npm install
npm run dev
```

App runs at **http://localhost:3010**

Password for every seeded demo account: **`blessedhands`**

---

## Demo accounts

### Staff (also members)

| Name | Email | Role | Member ID | Duties |
|------|-------|------|-----------|--------|
| Dan Segun | `admin@blessedhands.ng` | Super Admin | **BH-001** | Full control, final money-out, roles. Referral code = **BH-001** |
| Tunde Bakare | `treasurer@blessedhands.ng` | Financial Secretary | BH-002 | Savings ops, fees, first money-out approval |
| Ola Dayo | `ops@blessedhands.ng` | Admin | BH-003 | Applications, suspend, second money-out approval |

### Members (password `blessedhands`)

| ID | Name | Opening position |
|----|------|------------------|
| BH-004 | Ada Okonkwo | Fully paid · shares met · strong savings |
| BH-005 | Chidi Okafor | Partial dues · active emergency loan · trial clean |
| BH-006 | Temidayo Adebayo | Arrears · development fee unpaid |
| BH-007 | Fatima Bello | Normal loan nearly complete · non-resident |
| BH-008 | Emeka Nwosu | Normal loan awaiting FS approval |
| BH-009 | Ngozi Eze | Recent deposit withdrawal |
| BH-010 | Ibrahim Yusuf | New · needs minimum shares · trial available |

Use **Restore default cooperative data** on the sign-in page before a clean walkthrough.

---

## What you can demo

1. **Join** (`/join`) with referral **`BH-001`** → pay ₦2,000 → KYM → admin approve → sign in with your password (you appear on `/login` members list)  
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
