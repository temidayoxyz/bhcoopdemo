import fs from 'fs';

let content = fs.readFileSync('src/pages/member/MemberLoans.tsx', 'utf8');

const replacement = `                </section>

                {selectedLoan.guarantors && selectedLoan.guarantors.length > 0 && (
                  <section>
                    <h4 className="text-sm font-semibold text-seed-800 uppercase tracking-wider mb-4 border-b border-ink-100 pb-2">Guarantors</h4>
                    <div className="space-y-3">
                      {selectedLoan.guarantors.map((g: any) => (
                        <div key={g.id} className="flex justify-between items-center bg-ivory-50 p-3 rounded-[8px] border border-ink-200">
                          <div>
                            <p className="text-sm font-medium text-seed-950">{g.member?.firstName} {g.member?.lastName}</p>
                            <p className="text-xs font-mono text-ink-600">{g.member?.membershipNumber}</p>
                          </div>
                          <span className={\`text-[10px] font-bold px-2 py-0.5 rounded-full \${
                            g.status === 'PENDING' ? 'bg-warning/10 text-warning' : 
                            g.status === 'ACCEPTED' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
                          }\`}>
                            {g.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>`;

content = content.replace(`                </section>
              </div>`, replacement);

fs.writeFileSync('src/pages/member/MemberLoans.tsx', content);
