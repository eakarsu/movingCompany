const { z } = require('zod');
const prisma = require('../src/lib/prisma');

async function main() {
  if (process.env.REVOKE_CONFIRMED !== 'true') {
    throw new Error('Set REVOKE_CONFIRMED=true to confirm revocation of every active session for one user');
  }
  const email = z.string().trim().toLowerCase().email().max(320).parse(process.env.USER_EMAIL);
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true } });
  if (!user) throw new Error('User not found');
  await prisma.user.update({ where: { id: user.id }, data: { authVersion: { increment: 1 } } });
  console.log(`Revoked all sessions for ${user.email}`);
}

main()
  .catch((error) => {
    console.error(`Session revocation failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
