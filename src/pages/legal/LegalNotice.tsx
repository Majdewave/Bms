import { Link } from 'react-router-dom'

export default function LegalNotice() {
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
              הודעה משפטית
            </h1>

            <p className="mt-3 text-sm text-slate-500">
              עדכון אחרון: ספטמבר 2026
            </p>
          </header>

          <div className="space-y-8 leading-8">
            <section>
              <h2 className="mb-3 text-xl font-bold text-slate-900">
                1. פרטי מפעיל השירות
              </h2>

              <p>
                Clienta היא פלטפורמת תוכנה ומוצר מבית DigitalPenPro,
                המופעלת על ידי סלמאן מג'ד.
              </p>

              <div className="mt-4 rounded-xl bg-slate-50 p-5">
                <p>
                  <strong>שם השירות:</strong> Clienta
                </p>
                <p>
                  <strong>מוצר של:</strong> DigitalPenPro
                </p>
                <p>
                  <strong>מפעיל השירות:</strong> סלמאן מג'ד
                </p>
                <p>
                  <strong>שם מסחרי:</strong> DigitalPenPro
                </p>
                <p>
                  <strong>דוא"ל:</strong>{' '}
                  <a
                    href="mailto:info@digitalpenpro.com"
                    className="text-blue-600 hover:underline"
                  >
                    info@digitalpenpro.com
                  </a>
                </p>
              </div>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-bold text-slate-900">
                2. מטרת המערכת
              </h2>

              <p>
                Clienta היא פלטפורמה טכנולוגית המיועדת לסייע בניהול
                מרפאות, קליניקות, מרכזים רפואיים, אנשי מקצוע ועסקים.
              </p>

              <p className="mt-3">
                המערכת עשויה לכלול, בהתאם למסלול ולתכונות הזמינות,
                כלים לניהול מטופלים ולקוחות, תורים, תור חי, צוותים,
                הרשאות, ביקורים, מסמכים, קבצים, מידע רפואי, דימות רפואי,
                הפניות, פענוחים, דוחות וכלים טכנולוגיים נוספים.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-bold text-slate-900">
                3. Clienta אינה ספק שירות רפואי
              </h2>

              <p>
                Clienta ו-DigitalPenPro מספקות תשתית טכנולוגית ואינן
                מרפאה, מוסד רפואי, רופא, רדיולוג או ספק שירות רפואי.
              </p>

              <p className="mt-3">
                השימוש במערכת אינו מהווה ואינו מחליף אבחון רפואי,
                טיפול רפואי, פענוח רפואי, מרשם, ייעוץ רפואי או שיקול
                דעת מקצועי.
              </p>

              <p className="mt-3">
                האחריות לטיפול במטופל, לאבחון, לקבלת החלטות רפואיות
                ולבדיקת המידע הרפואי היא של אנשי המקצוע והגופים
                המוסמכים המטפלים במטופל.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-bold text-slate-900">
                4. מידע רפואי
              </h2>

              <p>
                מידע רפואי המופיע ב-Clienta עשוי להיות מוזן, מועלה,
                נוצר או מועבר על ידי מרפאות, רופאים, אנשי צוות, מכשירים
                רפואיים או מערכות אחרות.
              </p>

              <p className="mt-3">
                Clienta אינה מאשרת באופן עצמאי את נכונותו, שלמותו או
                התאמתו הרפואית של מידע שהוזן או הועבר למערכת על ידי
                משתמשים או מערכות חיצוניות.
              </p>

              <p className="mt-3">
                לפני הסתמכות על מידע לצורך החלטה רפואית, על איש המקצוע
                הרלוונטי לוודא את נכונות המידע ואת התאמתו למטופל.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-bold text-slate-900">
                5. דימות רפואי ו-DICOM
              </h2>

              <p>
                Clienta עשויה לספק כלים טכנולוגיים לקליטה, העברה,
                אחסון, הצגה וניהול של בדיקות דימות רפואי וקבצי DICOM.
              </p>

              <p className="mt-3">
                שירותים אלה עשויים לכלול תקשורת עם מכשירי דימות,
                Modality Worklist, העברת בדיקות באמצעות DICOM C-STORE,
                Clienta Imaging Gateway, אחסון תמונות והצגת בדיקות
                במערכת.
              </p>

              <p className="mt-3">
                תקינות ציוד הדימות, הגדרות המכשירים, החיבור לרשת,
                התאמת פרטי המטופל והפעלת הציוד באופן מקצועי ובטוח הן
                באחריות המרפאה והגורמים המוסמכים המפעילים את הציוד.
              </p>

              <p className="mt-3">
                לפני הסתמכות רפואית על בדיקת דימות, על איש המקצוע
                הרלוונטי לוודא כי הבדיקה, התמונות והסדרות שייכות למטופל
                הנכון ולבדיקה הנכונה וכי החומר הנדרש התקבל באופן תקין.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-bold text-slate-900">
                6. פענוחים ודוחות
              </h2>

              <p>
                Clienta עשויה לאפשר שליחת בדיקות לאנשי מקצוע לצורך
                פענוח, קבלת דוחות ושמירתם במערכת.
              </p>

              <p className="mt-3">
                האחריות המקצועית לתוכן הפענוח, האבחנה, ההמלצות והמסקנות
                הרפואיות היא של איש המקצוע שהפיק או אישר אותם.
              </p>

              <p className="mt-3">
                Clienta משמשת במקרה זה כפלטפורמה טכנולוגית לניהול
                ולהעברת המידע ואינה מאשרת את נכונותו הרפואית של
                הפענוח.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-bold text-slate-900">
                7. דיוק ושלמות המידע
              </h2>

              <p>
                משתמשי Clienta אחראים לבדוק את נכונות המידע שהם מזינים
                למערכת ואת המידע שעליו הם מסתמכים במסגרת עבודתם.
              </p>

              <p className="mt-3">
                טעויות בהקלדה, זיהוי מטופל, הגדרת מכשיר, קישור בדיקה,
                העלאת קובץ או מידע שמקורו במערכת חיצונית עלולות להשפיע
                על המידע המוצג.
              </p>

              <p className="mt-3">
                כאשר קיים ספק לגבי נכונות המידע, אין להסתמך עליו לפני
                ביצוע בדיקה ואימות מתאימים.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-bold text-slate-900">
                8. זמינות המערכת
              </h2>

              <p>
                אנו פועלים לשמירה על זמינות, יציבות ואבטחת Clienta,
                אולם מערכות מחשוב ושירותים מקוונים עשויים להיות מושפעים
                מתחזוקה, עדכונים, תקלות תוכנה, תשתיות ענן, תקשורת,
                אינטרנט, ציוד מקומי, ספקי צד שלישי או אירועים שאינם
                בשליטתנו.
              </p>

              <p className="mt-3">
                לפיכך, אין התחייבות לכך שהשירות יהיה זמין בכל עת וללא
                הפרעות או תקלות.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-bold text-slate-900">
                9. גיבויים והמשכיות עסקית
              </h2>

              <p>
                Clienta עשויה להפעיל אמצעי אחסון, גיבוי והתאוששות כחלק
                מתפעול השירות.
              </p>

              <p className="mt-3">
                עם זאת, המרפאה או העסק אחראים לבדוק אילו חובות חלות
                עליהם בנוגע לגיבוי, שמירת מסמכים, ארכיון רפואי, זמני
                שמירת מידע והמשכיות עסקית.
              </p>

              <p className="mt-3">
                אלא אם הוסכם אחרת במפורש, אין לראות ב-Clienta כמערכת
                הגיבוי היחידה לכל חובה מקצועית, רפואית או רגולטורית של
                הלקוח.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-bold text-slate-900">
                10. שירותי צד שלישי
              </h2>

              <p>
                חלק מפעילות Clienta עשוי להתבסס על שירותים ומערכות של
                צדדים שלישיים, לרבות שירותי ענן, אחסון, מסדי נתונים,
                סליקה, דואר אלקטרוני, תקשורת ושירותים טכנולוגיים אחרים.
              </p>

              <p className="mt-3">
                תקלות, שינויים או הפסקות בשירותי צד שלישי עלולים
                להשפיע על חלק מתכונות Clienta.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-bold text-slate-900">
                11. כלי בינה מלאכותית
              </h2>

              <p>
                Clienta עשויה להציע תכונות המבוססות על בינה מלאכותית,
                לרבות סיוע בתיעוד, סיכום ביקורים, עיבוד קול או טקסט,
                חיפוש או פעולות מסייעות אחרות.
              </p>

              <p className="mt-3">
                תוצאות המופקות באמצעות מערכות בינה מלאכותית עשויות
                להכיל שגיאות, השמטות או מידע שאינו מדויק.
              </p>

              <p className="mt-3">
                אין להסתמך על פלט של כלי בינה מלאכותית לצורך החלטה
                רפואית ללא בדיקה ואישור של איש מקצוע מוסמך. האחריות
                הסופית לתיעוד או למסמך שאושר ונעשה בו שימוש מקצועי
                מוטלת על המשתמש המקצועי המאשר אותו.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-bold text-slate-900">
                12. קניין רוחני
              </h2>

              <p>
                התוכנה, הקוד, הממשקים, העיצוב, המיתוג, הלוגואים,
                המבנה, הרכיבים והתכנים המקוריים של Clienta מוגנים
                בזכויות קניין רוחני בהתאם לדין.
              </p>

              <p className="mt-3">
                אין להעתיק, להפיץ, לשכפל, לפרסם או לעשות שימוש מסחרי
                בלתי מורשה ברכיבים אלה, למעט כפי שהותר במסגרת השירות
                או על פי דין.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-bold text-slate-900">
                13. הגבלת אחריות
              </h2>

              <p>
                Clienta מספקת פלטפורמה טכנולוגית ואינה מקבלת החלטות
                רפואיות בשם המשתמשים.
              </p>

              <p className="mt-3">
                בכפוף להוראות דין שאינן ניתנות להתניה, Clienta
                ו-DigitalPenPro לא יהיו אחראים להחלטות רפואיות או
                מקצועיות שהתקבלו על ידי משתמשים, למידע שגוי שהוזן על
                ידי משתמש או מערכת חיצונית, לשימוש בלתי מורשה בחשבון,
                או לכשל שמקורו בציוד, רשתות או שירותים שאינם בשליטת
                Clienta.
              </p>

              <p className="mt-3">
                אין בהודעה משפטית זו כדי לשלול או להגביל אחריות במקום
                שבו הדין אינו מאפשר שלילה או הגבלה כאמור.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-bold text-slate-900">
                14. פרטיות ותנאי שימוש
              </h2>

              <p>
                השימוש ב-Clienta כפוף גם ל{' '}
                <Link
                  to="/privacy"
                  className="font-medium text-blue-600 hover:underline"
                >
                  מדיניות הפרטיות
                </Link>{' '}
                ול{' '}
                <Link
                  to="/terms"
                  className="font-medium text-blue-600 hover:underline"
                >
                  תנאי השימוש
                </Link>{' '}
                של Clienta.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-bold text-slate-900">
                15. הדין החל
              </h2>

              <p>
                השימוש ב-Clienta והמסמכים המשפטיים של השירות כפופים
                לדיני מדינת ישראל, בכפוף להוראות דין מחייבות שאינן
                ניתנות להתניה.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-bold text-slate-900">
                16. יצירת קשר
              </h2>

              <p>
                לשאלות בנוגע לשירות או להודעה משפטית זו ניתן ליצור קשר
                באמצעות:
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