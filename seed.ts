import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seed() {
  console.log('Seeding users...');
  
  const users = [
    { id: '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed', name: 'Aisha', email: 'aisha@test.com' },
    { id: '2b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed', name: 'Rohan', email: 'rohan@test.com' },
    { id: '3b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed', name: 'Sam', email: 'sam@test.com' },
    { id: '4b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed', name: 'Priya', email: 'priya@test.com' },
    { id: '5b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed', name: 'Vivek', email: 'vivek@test.com' },
  ];

  const passwordHash = await bcrypt.hash('password123', 10);

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: {
        id: user.id,
        name: user.name,
        email: user.email,
        passwordHash,
      },
    });
  }

  // Also create the group
  const groupId = '9157a2df-da76-4b16-864d-34351f19acad';
  await prisma.group.upsert({
    where: { id: groupId },
    update: {},
    create: {
      id: groupId,
      name: 'Goa Trip',
      members: {
        connect: users.map(u => ({ id: u.id }))
      }
    }
  });

  console.log('Seed completed successfully!');
}

seed().catch(console.error).finally(() => prisma.$disconnect());
