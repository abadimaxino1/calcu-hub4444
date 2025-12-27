
const { prisma } = require('../server/db.cjs');

async function main() {
  console.log('Checking for duplicates...');

  // 1. Check Blog Posts
  const posts = prisma.blogPost.findMany({
    orderBy: { createdAt: 'desc' }
  });
  
  const seenSlugs = new Set();
  const duplicates = [];

  for (const post of posts) {
    if (seenSlugs.has(post.slug)) {
      duplicates.push(post);
    } else {
      seenSlugs.add(post.slug);
    }
  }

  console.log(`Found ${duplicates.length} duplicate blog posts.`);
  
  for (const dup of duplicates) {
    console.log(`Deleting duplicate post: ${dup.title} (${dup.slug}) - ID: ${dup.id}`);
    prisma.blogPost.delete({ where: { id: dup.id } });
  }

  // 2. Check FAQs
  const faqs = prisma.fAQ.findMany({
    orderBy: { createdAt: 'desc' }
  });

  const seenQuestions = new Set();
  const faqDuplicates = [];

  for (const faq of faqs) {
    const key = (faq.questionAr || '') + (faq.questionEn || '');
    if (seenQuestions.has(key)) {
      faqDuplicates.push(faq);
    } else {
      seenQuestions.add(key);
    }
  }

  console.log(`Found ${faqDuplicates.length} duplicate FAQs.`);

  for (const dup of faqDuplicates) {
    console.log(`Deleting duplicate FAQ: ${dup.questionAr?.substring(0, 30)}... - ID: ${dup.id}`);
    prisma.fAQ.delete({ where: { id: dup.id } });
  }

  console.log('Deduplication complete.');
}

main()
  .catch(e => console.error(e));
