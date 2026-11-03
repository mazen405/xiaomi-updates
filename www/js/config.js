"use strict";
/* إعدادات التطبيق الثابتة. أي تغيير مستقبلي في مصدر البيانات أو المفتاح يتم هنا فقط. */
window.XU_CONFIG = Object.freeze({
  schema: 2,
  appVersion: "1.0.0",
  /* مكان البيانات المحدّثة على GitHub (يُقرأ فقط ويُتحقق من توقيعه قبل الاستخدام) */
  remoteBase: "https://raw.githubusercontent.com/mazen405/xiaomi-updates/main/data",
  /* المفتاح العام للتحقق من توقيع الفهرس (ECDSA P-256). المفتاح الخاص محفوظ كسر في GitHub */
  publicKey: "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE9cga6X8OjO4lG7x8atWA0FVLxsWpH8SJOtPq5LcUS/+XA9B89eGslSmeXjMBMmXZVh1lec6+pJ2x72RUK88AXg==",
  /* روابط التحميل المسموحة: خوادم شاومي الرسمية فقط */
  linkHost: /^(?:[a-z0-9-]+\.d\.miui\.com|bkt-sgp-miui-ota-update-[a-z0-9-]+\.oss-[a-z0-9-]+\.aliyuncs\.com)$/,
  sourceName: "XiaomiFirmwareUpdater",
  sourceUrl: "https://github.com/XiaomiFirmwareUpdater/miui-updates-tracker"
});
