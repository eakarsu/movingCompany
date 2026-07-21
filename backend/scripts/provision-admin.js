const bcrypt = require('bcryptjs');
const { z } = require('zod');
const prisma = require('../src/lib/prisma');

const strongPassword = z.string().min(12).max(128)
  .regex(/[a-z]/)
  .regex(/[A-Z]/)
  .regex(/[0-9]/)
  .regex(/[^A-Za-z0-9]/);

const inputSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(320),
  password: strongPassword,
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
}).strict();

async function main() {
  if (
    process.env.PROVISION_INITIAL_ADMIN !== 'true' &&
    process.env.BOOTSTRAP_ACKNOWLEDGEMENT !== 'create-initial-admin'
  ) {
    throw new Error('Confirm initial administrator provisioning explicitly');
  }
  const [fallbackFirstName, ...fallbackLastNameParts] = String(process.env.BOOTSTRAP_ADMIN_NAME || '').trim().split(/\s+/);
  const input = inputSchema.parse({
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
    firstName: process.env.ADMIN_FIRST_NAME || fallbackFirstName,
    lastName: process.env.ADMIN_LAST_NAME || fallbackLastNameParts.join(' ') || 'Administrator',
  });
  if (await prisma.user.count() !== 0) {
    throw new Error('Provisioning refused because users already exist; use the authenticated administration workflow');
  }
  const passwordHash = await bcrypt.hash(input.password, 12);
  const user = await prisma.user.create({
    data: {
      email: input.email,
      password: passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      role: 'ADMIN',
      emailVerified: true,
    },
    select: { id: true, email: true, role: true, createdAt: true },
  });
  console.log(`Provisioned initial administrator ${user.email} (${user.id})`);
}

main()
  .catch((error) => {
    console.error(`Provisioning failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
