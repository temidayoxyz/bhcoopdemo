import fs from 'fs';

let content = fs.readFileSync('src/pages/admin/AdminLoans.tsx', 'utf8');

// Update applicant info
content = content.replace(
  `                <h3 className="font-semibold text-seed-950">Loan Details</h3>`,
  `                <div>
                  <h3 className="font-semibold text-seed-950">Loan Details</h3>
                  <p className="text-xs text-ink-600 mt-1">{selectedLoan.member?.firstName} {selectedLoan.member?.lastName} • {selectedLoan.member?.membershipNumber}</p>
                </div>`
);

// Update guarantor fields
content = content.replace(
  `                            <p className="text-sm font-medium">{g.name}</p>
                            <p className="text-xs text-ink-600">{g.membershipNumber}</p>`,
  `                            <p className="text-sm font-medium">{g.member?.firstName} {g.member?.lastName}</p>
                            <p className="text-xs text-ink-600">{g.member?.membershipNumber}</p>`
);

// Add applicant's name to the list on the left side
content = content.replace(
  `                  <div className="text-xs text-ink-600">₦{(loan.principalKobo / 100).toLocaleString()}</div>`,
  `                  <div className="text-xs text-ink-600 mt-1">{loan.member?.firstName} {loan.member?.lastName}</div>
                  <div className="text-xs text-ink-600">₦{(loan.principalKobo / 100).toLocaleString()}</div>`
);

fs.writeFileSync('src/pages/admin/AdminLoans.tsx', content);
