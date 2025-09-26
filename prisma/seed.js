const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create default carriers
  const carriers = [
    {
      name: 'USPS',
      displayName: 'United States Postal Service',
      apiEndpoint: 'https://secure.shippingapis.com/shippingapi.dll'
    },
    {
      name: 'UPS',
      displayName: 'United Parcel Service',
      apiEndpoint: 'https://onlinetools.ups.com/api'
    },
    {
      name: 'FedEx',
      displayName: 'FedEx Corporation',
      apiEndpoint: 'https://apis.fedex.com'
    },
    {
      name: 'DHL',
      displayName: 'DHL International',
      apiEndpoint: 'https://api-eu.dhl.com'
    }
  ];

  for (const carrier of carriers) {
    const existing = await prisma.carrier.findUnique({
      where: { name: carrier.name }
    });

    if (!existing) {
      await prisma.carrier.create({
        data: carrier
      });
      console.log(`✅ Created carrier: ${carrier.displayName}`);
    } else {
      console.log(`⏭️  Carrier already exists: ${carrier.displayName}`);
    }
  }

  console.log('🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
