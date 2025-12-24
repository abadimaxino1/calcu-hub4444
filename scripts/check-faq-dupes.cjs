
const { prisma } = require('../server/db.cjs');

async function check() {
  const countBefore = await prisma.fAQ.count();
  console.log('FAQs before:', countBefore);
  
  const faqs = await prisma.fAQ.findMany();
  const questions = faqs.map(f => f.questionAr);
  const duplicates = questions.filter((item, index) => questions.indexOf(item) !== index);
  
  if (duplicates.length > 0) {
    console.log('Found duplicates:', duplicates);
  } else {
    console.log('No duplicates found.');
  }
}

check().catch(console.error);
