const { prisma } = require('../server/db.cjs');

async function main() {
  console.log('Seeding job definitions...');

  const definitions = [
    {
      key: 'SITEMAP_REGENERATE',
      name: 'Sitemap Regeneration',
      description: 'Regenerates the sitemap.xml file for SEO.',
      scheduleCron: '0 0 * * *', // Every day at midnight
      enabled: true,
      defaultPayload: '{}'
    },
    {
      key: 'CACHE_WARM',
      name: 'Cache Warming',
      description: 'Pre-fetches popular pages to warm up the cache.',
      scheduleCron: '0 1 * * *', // Every day at 1 AM
      enabled: true,
      defaultPayload: '{}'
    },
    {
      key: 'ANALYTICS_SYNC',
      name: 'Analytics Sync',
      description: 'Syncs local analytics data with external providers.',
      scheduleCron: '*/30 * * * *', // Every 30 minutes
      enabled: true,
      defaultPayload: '{}'
    },
    {
      key: 'BACKUP_DATABASE',
      name: 'Database Backup',
      description: 'Creates a full database backup.',
      scheduleCron: '0 2 * * *', // Every day at 2 AM
      enabled: true,
      defaultPayload: '{"type": "scheduled"}'
    },
    {
      key: 'BROKEN_LINK_CHECK',
      name: 'Broken Link Check',
      description: 'Scans the site for broken internal and external links.',
      scheduleCron: '0 3 * * 0', // Every Sunday at 3 AM
      enabled: true,
      defaultPayload: '{}'
    },
    {
      key: 'DIAGNOSTICS',
      name: 'System Diagnostics',
      description: 'Runs a suite of system health checks.',
      scheduleCron: '0 * * * *', // Every hour
      enabled: true,
      defaultPayload: '{"checks": ["db", "storage", "env"]}'
    },
    {
      key: 'AUDIT_RETENTION',
      name: 'Audit Log Retention',
      description: 'Cleans up old audit logs based on retention policy.',
      scheduleCron: '0 4 * * *', // Every day at 4 AM
      enabled: true,
      defaultPayload: '{"days": 90}'
    }
  ];

  for (const def of definitions) {
    await prisma.jobDefinition.upsert({
      where: { key: def.key },
      update: def,
      create: def
    });
  }

  console.log('Job definitions seeded successfully.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });