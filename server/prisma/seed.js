const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    // Clear all existing data
    await prisma.reimbursement.deleteMany({});
    await prisma.systemSettings.deleteMany({});
    await prisma.user.deleteMany({});

    // Create the only admin user: root / passwd
    const hashedPassword = await bcrypt.hash('passwd', 10);

    const admin = await prisma.user.create({
        data: {
            username: 'root',
            password: hashedPassword,
            role: 'ADMIN'
        }
    });

    console.log('✅ Database seeded successfully!');
    console.log('📋 Default admin account:');
    console.log('   Username: root');
    console.log('   Password: passwd');
    console.log('⚠️  Please change the password after first login!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
