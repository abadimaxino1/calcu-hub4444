const { prisma } = require('./server/db.cjs');

async function checkBlog() {
  try {
    const count = await prisma.blogPost.count();
    console.log(`Blog posts count: ${count}`);
    if (count > 0) {
      const posts = await prisma.blogPost.findMany({ take: 1 });
      console.log('First blog post:', JSON.stringify(posts[0], null, 2));
    }
  } catch (error) {
    console.error('Error checking blog:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBlog();
