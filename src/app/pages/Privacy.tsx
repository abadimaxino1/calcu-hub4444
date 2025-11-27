import React from 'react';
import SeoHead from '../../lib/seoHead';

export default function PrivacyPage({ lang }: { lang: 'ar' | 'en' }) {
  const content = {
    en: {
      title: 'Privacy Policy | Calcu-Hub',
      meta: 'Read the Calcu-Hub privacy policy to understand how we handle analytics data, cookies, and advertising information while keeping your personal information protected.',
      h1: 'Privacy Policy',
      intro: 'This Privacy Policy explains how Calcu-Hub collects and uses information when you visit our website and use our calculators.',
      sections: [
        {
          title: '1. Personal data',
          body: 'Calcu-Hub does not require you to create an account to use the public calculators, and we do not ask you to enter your name, national ID, or bank details in any of the tools. Any salary or work data you enter is processed in your browser or on our servers only for calculation purposes and is not used to personally identify you.'
        },
        {
          title: '2. Analytics and cookies',
          body: 'We may use analytics tools (such as Google Analytics) to measure visits, traffic sources, and usage patterns. These tools rely on cookies and similar technologies. The data is aggregated and used to improve the website and user experience. You can manage cookies from your browser settings.'
        },
        {
          title: '3. Advertising and AdSense',
          body: 'Calcu-Hub may display ads through Google AdSense or similar services. These services may use cookies to show more relevant ads based on your visit to this and other websites. You can learn more about how Google uses data for advertising and how to control your ad settings directly from Google\'s policies.'
        },
        {
          title: '4. Data security',
          body: 'We take reasonable technical and organizational measures to protect our servers and analytics data. However, no method of transmission over the internet is completely secure, so we cannot guarantee absolute security.'
        },
        {
          title: '5. Third-party links',
          body: 'Our website may contain links to other websites. We are not responsible for the content or privacy practices of those external sites.'
        },
        {
          title: '6. Updates to this policy',
          body: 'We may update this Privacy Policy from time to time. The latest version will always be available on this page.'
        }
      ],
      contact: 'If you have questions about this policy, you can contact us through the contact information provided on the website.'
    },
    ar: {
      title: 'سياسة الخصوصية | Calcu-Hub',
      meta: 'اطلع على سياسة الخصوصية في Calcu-Hub لمعرفة كيفية التعامل مع بيانات الزوار وملفات تعريف الارتباط وتحليلات الاستخدام والإعلانات مع الحفاظ على سرية معلوماتك.',
      h1: 'سياسة الخصوصية',
      intro: 'توضح هذه السياسة كيفية تعامل منصة Calcu-Hub مع بيانات الزوار عند استخدام الموقع والحاسبات.',
      sections: [
        {
          title: '1. البيانات الشخصية',
          body: 'لا يتطلب استخدام الحاسبات العامة إنشاء حساب أو إدخال اسمك أو رقم هويتك أو بياناتك البنكية. البيانات التي تقوم بإدخالها في الحاسبات (مثل الراتب أو التواريخ) تُستخدم فقط لغرض إجراء الحسابات ولا يتم ربطها بهويتك الشخصية.'
        },
        {
          title: '2. التحليلات وملفات تعريف الارتباط (Cookies)',
          body: 'قد نستخدم أدوات تحليل مثل Google Analytics لقياس عدد الزيارات ومصادرها وأنماط الاستخدام. تعتمد هذه الأدوات على ملفات تعريف الارتباط وتقنيات مشابهة. تُستخدم البيانات بشكل إجمالي لتحسين الموقع وتجربة المستخدم، ويمكنك التحكم في ملفات الارتباط من إعدادات المتصفح.'
        },
        {
          title: '3. الإعلانات وAdSense',
          body: 'قد يعرض الموقع إعلانات من خلال Google AdSense أو خدمات مشابهة، والتي قد تستخدم ملفات تعريف الارتباط لعرض إعلانات أكثر ملاءمة استنادًا إلى زيارتك لهذا الموقع ومواقع أخرى. يمكنك معرفة مزيد من التفاصيل عن كيفية استخدام Google للبيانات وضبط تفضيلات الإعلانات من خلال سياسات Google الرسمية.'
        },
        {
          title: '4. أمن البيانات',
          body: 'نعمل على اتخاذ إجراءات تقنية وتنظيمية معقولة لحماية خوادمنا وبيانات التحليلات، مع العلم بأن أي نقل للبيانات عبر الإنترنت لا يمكن أن يكون آمنًا بنسبة 100٪.'
        },
        {
          title: '5. الروابط الخارجية',
          body: 'قد يحتوي الموقع على روابط لمواقع أخرى، ولسنا مسؤولين عن محتوى أو ممارسات الخصوصية في تلك المواقع الخارجية.'
        },
        {
          title: '6. تحديث السياسة',
          body: 'قد نقوم بتحديث هذه السياسة من وقت لآخر، وسيتم نشر أحدث نسخة دائمًا في هذه الصفحة.'
        }
      ],
      contact: 'في حال وجود أي استفسار حول سياسة الخصوصية يمكنكم التواصل معنا عبر بيانات الاتصال المتاحة في الموقع.'
    }
  };

  const c = content[lang];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6">
      <SeoHead title={c.title} description={c.meta} />

      <section className="space-y-4 sm:space-y-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">{c.h1}</h1>
        <p className="text-sm sm:text-base text-slate-700 leading-relaxed">{c.intro}</p>

        {c.sections.map((section, i) => (
          <div key={i} className="space-y-2">
            <h2 className="text-lg sm:text-xl font-semibold text-slate-900">{section.title}</h2>
            <p className="text-sm sm:text-base text-slate-700 leading-relaxed">{section.body}</p>
          </div>
        ))}

        <p className="text-sm sm:text-base text-slate-700 leading-relaxed italic">{c.contact}</p>
      </section>
    </div>
  );
}
