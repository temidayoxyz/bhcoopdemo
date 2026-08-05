import fs from 'fs';

let content = fs.readFileSync('src/server/api.ts', 'utf8');

// For member dashboard, fetch guarantors
content = content.replace(
  `  const loans = await db.query.loans.findMany({
    where: eq(schema.loans.memberId, member.id),
    orderBy: [desc(schema.loans.appliedAt)]
  });`,
  `  const loans = await db.query.loans.findMany({
    where: eq(schema.loans.memberId, member.id),
    orderBy: [desc(schema.loans.appliedAt)]
  });

  const enrichedLoans = await Promise.all(loans.map(async (loan) => {
    const guarantorsReqs = await db.select({
      id: schema.guarantorRequests.id,
      status: schema.guarantorRequests.status,
      member: {
        id: schema.members.id,
        firstName: schema.members.firstName,
        lastName: schema.members.lastName,
        membershipNumber: schema.members.membershipNumber,
      }
    }).from(schema.guarantorRequests)
      .leftJoin(schema.members, eq(schema.guarantorRequests.guarantorMemberId, schema.members.id))
      .where(eq(schema.guarantorRequests.loanId, loan.id));
      
    return { ...loan, guarantors: guarantorsReqs };
  }));`
);

content = content.replace(
  `  res.json({
    member,
    loans,
    obligations
  });`,
  `  res.json({
    member,
    loans: enrichedLoans,
    obligations
  });`
);

// For admin loans, fetch guarantors and applicant
content = content.replace(
  `  const loans = await db.query.loans.findMany({
    orderBy: [desc(schema.loans.appliedAt)]
  });

  res.json({ loans });`,
  `  const loans = await db.query.loans.findMany({
    orderBy: [desc(schema.loans.appliedAt)]
  });

  const enrichedLoans = await Promise.all(loans.map(async (loan) => {
    const member = await db.query.members.findFirst({ where: eq(schema.members.id, loan.memberId) });
    
    const guarantorsReqs = await db.select({
      id: schema.guarantorRequests.id,
      status: schema.guarantorRequests.status,
      member: {
        id: schema.members.id,
        firstName: schema.members.firstName,
        lastName: schema.members.lastName,
        membershipNumber: schema.members.membershipNumber,
      }
    }).from(schema.guarantorRequests)
      .leftJoin(schema.members, eq(schema.guarantorRequests.guarantorMemberId, schema.members.id))
      .where(eq(schema.guarantorRequests.loanId, loan.id));

    return { ...loan, member, guarantors: guarantorsReqs };
  }));

  res.json({ loans: enrichedLoans });`
);

fs.writeFileSync('src/server/api.ts', content);
