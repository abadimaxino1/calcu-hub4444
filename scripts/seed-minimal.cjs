const { prisma } = require('../server/db.cjs');
const { v4: uuidv4 } = require('uuid');

async function seed() {
  console.log('🌱 Seeding minimal data for sitemap...');

  // Create a CMS page
  try {
    await prisma.cmsPage.create({
      data: {
        slug: 'salary-calculator',
        pageType: 'calculator',
        status: 'published'
      }
    });
    console.log('✅ Created CMS page: salary-calculator');
  } catch (e) {
    console.log('⚠️ CMS page might already exist');
  }

  // Create a blog post
  try {
    await prisma.blogPost.create({
      data: {
        slug: 'how-to-calculate-eos',
        title: 'How to Calculate End of Service',
        content: 'Content here...',
        isPublished: true,
        publishedAt: new Date().toISOString()
      }
    });
    console.log('✅ Created blog post: how-to-calculate-eos');
  } catch (e) {
    console.log('⚠️ Blog post might already exist');
  }

  // Create an analytics event definition
  try {
    await prisma.analyticsEvent.create({
      data: {
        key: 'calculator_used',
        name: 'Calculator Used',
        category: 'engagement',
        enabled: true
      }
    });
    console.log('✅ Created analytics event: calculator_used');
  } catch (e) {
    console.log('⚠️ Analytics event might already exist');
  }

  console.log('✨ Minimal seed complete');
}

seed().catch(console.error);
