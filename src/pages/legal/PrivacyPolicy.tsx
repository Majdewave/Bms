import { Link } from 'react-router-dom'

export default function PrivacyPolicy() {
  return (
    <main
      dir="rtl"
      className="min-h-screen bg-slate-50 px-4 py-10 text-slate-800 sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <Link
            to="/login"
            className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
          >
            חזרה ל-Clienta
          </Link>
        </div>

        <article className="rounded-2xl bg-white p-6 shadow-sm sm:p-10">
          <header className="mb-10 border-b border-slate-200 pb-6">
            <div className="mb-2 text-sm font-semibold text-blue-600">
              Clienta - a product of DigitalPenPro
            </div>

            <h1 className="text-3xl font-bold text-slate-900">
              מדיניות פרטיות
            </h1>

            <p className="mt-3 text-sm text-slate-500">
              עדכון אחרון: ספטמבר 2026
            </p>
          </header>

          <div className="space-y-8 leading-8">
            <section>
              <h2 className="mb-3 text-xl font-bold text-slate-900">
                1. כללי
              </h2>

              <p>
                Clienta היא פלטפורמה טכנולוגית לניהול מרפאות, קליניקות,
                מרכזים רפואיים, אנשי מקצוע ועסקים.
              </p>

              <p className="mt-3">
                Clienta היא מוצר מבית DigitalPenPro, המופעלת על ידי
                סלמאן מג'ד (להלן: "Clienta", "DigitalPenPro", "המערכת",
                "השירות", "אנו" או "אנחנו").
              </p>

              <p className="mt-3">
                מדיניות פרטיות זו מסבירה כיצד מידע אישי ומידע אחר עשויים
                להיאסף, להישמר, להיות מעובדים ולהיות מוגנים במסגרת השימוש
                ב-Clienta.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-bold text-slate-900">
                2. סוגי המידע
              </h2>

              <p>
                בהתאם לאופן השימוש במערכת, Clienta עשויה לעבד סוגים שונים
                של מידע, לרבות:
              </p>

              <ul className="mt-3 list-disc space-y-2 pr-6">
                <li>
                  פרטי חשבון, כגון שם, כתובת דואר אלקטרוני, מספר טלפון
                  ופרטי העסק או המרפאה.
                </li>
                <li>
                  פרטי משתמשים, אנשי צוות, תפקידים והרשאות.
                </li>
                <li>
                  פרטי מטופלים או לקוחות המוזנים למערכת על ידי לקוחות
                  Clienta והמשתמשים המורשים מטעמם.
                </li>
                <li>
                  מידע הקשור לתורים, ביקורים, שירותים, הערות, מסמכים,
                  קבצים והיסטוריית פעילות.
                </li>
                <li>
                  מידע רפואי או מקצועי שהוזן או הועלה למערכת על ידי
                  משתמשים מורשים.
                </li>
                <li>
                  בדיקות דימות, קבצי DICOM, תמונות, סדרות, הפניות,
                  פענוחים ומידע הקשור לבדיקות דימות.
                </li>
                <li>
                  מידע טכני ואבטחתי הדרוש להפעלת השירות, אבטחתו, איתור
                  תקלות ומניעת שימוש לרעה.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-bold text-slate-900">
                3. מידע רפואי ומידע על מטופלים
              </h2>

              <p>
                לקוחות Clienta עשויים להזין למערכת מידע הנוגע למטופלים
                וללקוחות שלהם, ובכלל זה מידע רפואי ומידע אישי רגיש.
              </p>

              <p className="mt-3">
                המרפאה, העסק או איש המקצוע המשתמשים ב-Clienta אחראים לכך
                שאיסוף המידע והשימוש בו נעשים בהתאם לדין ולבסיס החוקי
                המתאים, לרבות קבלת הסכמות כאשר הן נדרשות.
              </p>

              <p className="mt-3">
                Clienta מעבדת מידע זה לצורך אספקת השירות ללקוח ובהתאם
                לפונקציות המערכת, להגדרות החשבון ולהוראות הלקוח, בכפוף
                לדין החל.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-bold text-slate-900">
                4. מטרות השימוש במידע
              </h2>

              <p>המידע עשוי לשמש, בין היתר, לצורך:</p>

              <ul className="mt-3 list-disc space-y-2 pr-6">
                <li>הקמה וניהול של חשבונות Clienta.</li>
                <li>אספקת הפונקציות והשירותים של המערכת.</li>
                <li>ניהול משתמשים, צוותים והרשאות.</li>
                <li>ניהול תורים, מטופלים, ביקורים ומסמכים.</li>
                <li>קליטה, אחסון והצגה של בדיקות דימות ומידע רפואי.</li>
                <li>אבטחת המערכת ומניעת גישה בלתי מורשית.</li>
                <li>איתור תקלות, תחזוקה ושיפור השירות.</li>
                <li>טיפול בפניות שירות ותמיכה.</li>
                <li>ניהול מנויים ותשלומים.</li>
                <li>עמידה בחובות חוקיות החלות עלינו.</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-bold text-slate-900">
                5. תשלומים
              </h2>

              <p>
                תשלומים עבור שירותי Clienta עשויים להיות מעובדים באמצעות
                ספקי תשלום חיצוניים, כגון Stripe.
              </p>

              <p className="mt-3">
                כאשר פרטי אמצעי התשלום נמסרים ישירות לספק התשלום, Clienta
                אינה נדרשת לקבל או לשמור את מלוא פרטי כרטיס התשלום.
              </p>

              <p className="mt-3">
                ספק התשלום עשוי לעבד מידע בהתאם למדיניות הפרטיות ולתנאים
                שלו.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-bold text-slate-900">
                6. שירותי דימות ו-DICOM
              </h2>

              <p>
                כאשר לקוח משתמש בשירותי Clienta Imaging, המערכת עשויה
                לעבד מידע הקשור לבדיקות דימות רפואי, לרבות פרטי מטופל,
                פרטי בדיקה, מספרי זיהוי של בדיקות, קבצי DICOM, תמונות,
                סדרות, הפניות ופענוחים.
              </p>

              <p className="mt-3">
                מידע עשוי לעבור בין ציוד הדימות או מערכות המרפאה לבין
                Clienta באמצעות רכיבי תקשורת כגון Clienta Imaging
                Gateway.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-bold text-slate-900">
                7. ספקי שירות ותשתיות
              </h2>

              <p>
                לצורך הפעלת Clienta אנו עשויים להיעזר בספקי שירות
                טכנולוגיים, לרבות ספקי תשתיות ענן, אחסון, מסדי נתונים,
                אבטחה, דואר אלקטרוני, תקשורת, תשלומים ושירותים טכנולוגיים
                נוספים.
              </p>

              <p className="mt-3">
                מידע יועבר לספקים אלה רק ככל שנדרש לצורך אספקת השירות,
                תפעולו, אבטחתו או מילוי חובה חוקית, ובכפוף להסדרים
                המתאימים ולדין החל.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-bold text-slate-900">
                8. העברת מידע מחוץ לישראל
              </h2>

              <p>
                חלק מספקי התשתית והשירותים שבהם Clienta משתמשת עשויים
                להפעיל מערכות או לאחסן ולעבד מידע מחוץ לישראל.
              </p>

              <p className="mt-3">
                כאשר מידע מועבר או מעובד מחוץ לישראל, נפעל בהתאם לדרישות
                הדין החלות על העברת מידע כאמור.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-bold text-slate-900">
                9. אבטחת מידע
              </h2>

              <p>
                אנו נוקטים אמצעים טכנולוגיים וארגוניים שנועדו להגן על
                המידע ולצמצם סיכונים של גישה בלתי מורשית, שימוש לרעה,
                אובדן, שינוי או חשיפה.
              </p>

              <p className="mt-3">
                עם זאת, אין מערכת מחשוב או תקשורת שניתן להבטיח את
                אבטחתה באופן מוחלט.
              </p>

              <p className="mt-3">
                המשתמשים אחראים גם לשמירה על פרטי ההתחברות שלהם, להגדרת
                הרשאות מתאימות ולאבטחת המחשבים, הרשתות והציוד שבשליטתם.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-bold text-slate-900">
                10. שמירת מידע
              </h2>

              <p>
                מידע נשמר למשך הזמן הנדרש לצורך אספקת השירות, קיום
                התחייבויותינו, אבטחה, טיפול במחלוקות ועמידה בדרישות הדין.
              </p>

              <p className="mt-3">
                משך השמירה עשוי להשתנות בהתאם לסוג המידע, הגדרות החשבון,
                דרישות הלקוח והחובות החוקיות או המקצועיות הרלוונטיות.
              </p>

              <p className="mt-3">
                סיום מנוי או סגירת חשבון אינם מבטיחים מחיקה מיידית של כל
                המידע, כאשר שמירתו נדרשת או מותרת בהתאם לדין או לצורך
                תפעולי לגיטימי.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-bold text-slate-900">
                11. הרשאות וגישה למידע
              </h2>

              <p>
                Clienta מאפשרת ללקוחות מסוימים לנהל תפקידים והרשאות
                משתמשים.
              </p>

              <p className="mt-3">
                באחריות בעל החשבון להעניק גישה רק למשתמשים מורשים ולוודא
                שהרשאותיהם מתאימות לתפקידם ולמידע שהם רשאים לראות.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-bold text-slate-900">
                12. מסירת מידע
              </h2>

              <p>
                איננו מוכרים מידע רפואי או מידע אישי של מטופלים.
              </p>

              <p className="mt-3">
                מידע עשוי להימסר כאשר הדבר נדרש לצורך אספקת השירות,
                לספקי שירות הפועלים עבורנו, לפי הוראת הלקוח, לצורך הגנה
                על המערכת או המשתמשים, או כאשר אנו נדרשים לעשות זאת על
                פי דין או מכוח דרישה חוקית מוסמכת.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-bold text-slate-900">
                13. זכויות ביחס למידע
              </h2>

              <p>
                בכפוף לדין החל, אדם עשוי להיות זכאי לעיין במידע אישי
                מסוים הנוגע אליו, לבקש את תיקונו או לממש זכויות אחרות
                הקבועות בדין.
              </p>

              <p className="mt-3">
                כאשר הבקשה מתייחסת למידע המוחזק ב-Clienta עבור מרפאה או
                לקוח עסקי, ייתכן שהבקשה תטופל באמצעות אותו לקוח, שהוא
                הגורם האחראי למידע ולמערכת היחסים עם המטופל.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-bold text-slate-900">
                14. עוגיות וטכנולוגיות דומות
              </h2>

              <p>
                Clienta עשויה להשתמש בעוגיות (Cookies), אחסון מקומי
                וטכנולוגיות דומות הדרושות לצורך התחברות, אבטחה, שמירת
                העדפות, תפעול המערכת ושיפור חוויית השימוש.
              </p>

              <p className="mt-3">
                ככל שייעשה שימוש בטכנולוגיות שאינן חיוניות ושדורשות
                הסכמה לפי הדין החל, יוצגו למשתמש האפשרויות המתאימות.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-bold text-slate-900">
                15. קטינים
              </h2>

              <p>
                Clienta מיועדת לשימוש מקצועי על ידי מרפאות, עסקים ואנשי
                מקצוע ואינה מיועדת לפתיחת חשבון עצמאי על ידי קטינים.
              </p>

              <p className="mt-3">
                מידע על מטופלים קטינים עשוי להיות מנוהל על ידי לקוחות
                Clienta במסגרת פעילותם המקצועית ובהתאם לדין החל.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-bold text-slate-900">
                16. שינויים במדיניות
              </h2>

              <p>
                אנו עשויים לעדכן מדיניות פרטיות זו מעת לעת בעקבות
                שינויים בשירות, בטכנולוגיה, בפעילות העסקית או בדרישות
                הדין.
              </p>

              <p className="mt-3">
                מועד העדכון האחרון של המדיניות יופיע בראש עמוד זה.
                במקרה של שינוי מהותי, אנו עשויים למסור הודעה מתאימה
                באמצעות המערכת, בדואר אלקטרוני או בדרך אחרת.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-bold text-slate-900">
                17. יצירת קשר
              </h2>

              <p>
                לשאלות או בקשות בנושא פרטיות ניתן ליצור קשר באמצעות:
              </p>

              <div className="mt-4 rounded-xl bg-slate-50 p-5">
                <p className="font-semibold">
                  Clienta - a product of DigitalPenPro
                </p>
                <p>מפעיל השירות: סלמאן מג'ד</p>
                <p>שם מסחרי: DigitalPenPro</p>
                <p>
                  דוא"ל:{' '}
                  <a
                    href="mailto:info@digitalpenpro.com"
                    className="text-blue-600 hover:underline"
                  >
                    info@digitalpenpro.com
                  </a>
                </p>
              </div>
            </section>
          </div>

          <footer className="mt-10 border-t border-slate-200 pt-6 text-center text-sm text-slate-500">
            © 2026 Clienta - a product of DigitalPenPro. כל הזכויות שמורות.
          </footer>
        </article>
      </div>
    </main>
  )
}