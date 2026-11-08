// إعداد رابط الباك إند عند نشر الواجهة بشكل مستقل.
// غيّر القيمة إلى أصل API الفعلي، دون إضافة /api في النهاية.
// مثال: https://api.students.example.com
window.APP_CONFIG = Object.freeze({
    API_BASE_URL: "https://kb7rmoggtype-production-6spmgk0k.us-central1.suga.run",
    // فعّلها فقط إذا كان وسيط الحماية الخارجي يعتمد على Cookie وصول.
    INCLUDE_CREDENTIALS: false
});
