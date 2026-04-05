// ============================================
// بوت تسجيل تلقائي - يعمل على Render.com
// ============================================

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

// تفعيل التخفي
puppeteer.use(StealthPlugin());

// ============= الإعدادات =============
const CONFIG = {
    targetUrl: 'https://chat-elnsr.top',
    username: "ليليان الححححححقيرة",
    about: "من اليمن",
    gender: "1",  // 1 = أنثى
    age: "25",
    
    // إعدادات التشغيل
    intervalBetweenRegistrations: 30000,  // 30 ثانية بين كل تسجيل
    maxRegistrationsPerHour: 30,          // حد أقصى 30 تسجيل في الساعة
    
    // إعدادات المتصفح
    headless: true,
    timeout: 20000
};

// ============= إحصائيات =============
let stats = {
    totalSuccess: 0,
    totalFailed: 0,
    startTime: new Date(),
    lastRegistration: null,
    hourlyCount: 0,
    lastHourReset: new Date()
};

// ============= دالة التأخير =============
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ============= تسجيل حساب واحد =============
async function registerOneAccount() {
    console.log(`\n🚀 بدء تسجيل جديد في ${new Date().toLocaleTimeString()}`);
    console.log(`👤 الاسم: ${CONFIG.username}`);
    
    let browser = null;
    
    try {
        // تشغيل المتصفح
        browser = await puppeteer.launch({
            headless: CONFIG.headless,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--disable-software-rasterizer',
                '--disable-webgl',
                '--disable-images',
                '--max_old_space_size=256',
                '--window-size=1024,768'
            ],
            defaultViewport: { width: 1024, height: 768 },
            timeout: 10000
        });
        
        const page = await browser.newPage();
        
        // إخفاء آثار البوت
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36');
        
        // فتح الموقع
        console.log(`🌐 فتح ${CONFIG.targetUrl}...`);
        await page.goto(CONFIG.targetUrl, {
            waitUntil: 'domcontentloaded',
            timeout: CONFIG.timeout
        });
        
        await sleep(2000);
        
        // البحث عن حقل الاسم
        console.log(`🔍 البحث عن نموذج التسجيل...`);
        
        let usernameField = null;
        let attempts = 0;
        
        while (!usernameField && attempts < 10) {
            usernameField = await page.$('#guest_username, input[name="username"], .guest-name-input, input[placeholder*="اسم"], input[placeholder*="username"]');
            if (!usernameField) {
                await sleep(1000);
                attempts++;
            }
        }
        
        if (!usernameField) {
            throw new Error('لم يتم العثور على حقل الاسم');
        }
        
        console.log(`✅ تم العثور على حقل الاسم`);
        
        // تعبئة البيانات
        await usernameField.click();
        await usernameField.type(CONFIG.username, { delay: 50 });
        
        // حقل "عن"
        const aboutField = await page.$('#user_about, input[name="about"], textarea[name="about"], input[placeholder*="عن"]');
        if (aboutField) {
            await aboutField.type(CONFIG.about, { delay: 30 });
        }
        
        // اختيار الجنس
        const genderSelect = await page.$('#guest_gender, select[name="gender"], select:has(option[value="1"])');
        if (genderSelect) {
            await genderSelect.select(CONFIG.gender);
        }
        
        // اختيار العمر
        const ageSelect = await page.$('#guest_age, select[name="age"], select:has(option[value="25"])');
        if (ageSelect) {
            await ageSelect.select(CONFIG.age);
        }
        
        // زر التسجيل
        const submitBtn = await page.$('.submit_btn, button[type="submit"], .enter-btn, input[type="submit"], button:has-text("دخول"), button:has-text("تسجيل")');
        
        if (!submitBtn) {
            throw new Error('لم يتم العثور على زر التسجيل');
        }
        
        await submitBtn.click();
        console.log(`🔘 تم الضغط على زر التسجيل`);
        
        // انتظار النتيجة
        await sleep(3000);
        
        // التحقق من النجاح
        const pageContent = await page.content();
        
        // كلمات تدل على الفشل
        const failureIndicators = [
            'error', 'invalid', 'already', 'exists', 'fail',
            'خطأ', 'موجود', 'مستخدم', 'فشل', 'ممنوع', 'رفض'
        ];
        
        let isSuccess = true;
        
        for (let indicator of failureIndicators) {
            if (pageContent.toLowerCase().includes(indicator)) {
                isSuccess = false;
                break;
            }
        }
        
        if (isSuccess) {
            console.log(`✅✅✅ نجاح! تم تسجيل: ${CONFIG.username}`);
            stats.totalSuccess++;
            stats.lastRegistration = new Date();
            stats.hourlyCount++;
        } else {
            console.log(`❌ فشل التسجيل (الموقع رفض الطلب)`);
            stats.totalFailed++;
        }
        
        await browser.close();
        return isSuccess;
        
    } catch (error) {
        console.log(`❌ خطأ: ${error.message}`);
        stats.totalFailed++;
        if (browser) {
            try { await browser.close(); } catch(e) {}
        }
        return false;
    }
}

// ============= التحكم في المعدل =============
async function canRegister() {
    const now = new Date();
    
    // إعادة تعيين العداد كل ساعة
    if (now - stats.lastHourReset > 3600000) {
        stats.hourlyCount = 0;
        stats.lastHourReset = now;
        console.log(`\n🔄 إعادة تعيين العداد الساعي - بداية ساعة جديدة`);
    }
    
    // التحقق من الحد الأقصى
    if (stats.hourlyCount >= CONFIG.maxRegistrationsPerHour) {
        const waitTime = 3600000 - (now - stats.lastHourReset);
        const waitMinutes = Math.ceil(waitTime / 60000);
        console.log(`⏳ تم الوصول للحد الأقصى (${CONFIG.maxRegistrationsPerHour}/ساعة). انتظر ${waitMinutes} دقيقة...`);
        await sleep(waitTime);
        return canRegister();
    }
    
    // التحقق من الفاصل الزمني بين التسجيلات
    if (stats.lastRegistration) {
        const timeSinceLast = now - stats.lastRegistration;
        if (timeSinceLast < CONFIG.intervalBetweenRegistrations) {
            const waitTime = CONFIG.intervalBetweenRegistrations - timeSinceLast;
            console.log(`⏳ انتظر ${Math.ceil(waitTime / 1000)} ثانية...`);
            await sleep(waitTime);
        }
    }
    
    return true;
}

// ============= عرض الإحصائيات =============
function displayStats() {
    const runtime = (new Date() - stats.startTime) / 1000 / 60; // دقائق
    const successRate = stats.totalSuccess + stats.totalFailed > 0
        ? ((stats.totalSuccess / (stats.totalSuccess + stats.totalFailed)) * 100).toFixed(1)
        : 0;
    
    console.log('\n' + '='.repeat(50));
    console.log(`📊 إحصائيات البوت`);
    console.log('='.repeat(50));
    console.log(`✅ النجاح: ${stats.totalSuccess}`);
    console.log(`❌ الفشل: ${stats.totalFailed}`);
    console.log(`📈 نسبة النجاح: ${successRate}%`);
    console.log(`⏱️  وقت التشغيل: ${runtime.toFixed(1)} دقيقة`);
    console.log(`🕐 آخر تسجيل: ${stats.lastRegistration ? stats.lastRegistration.toLocaleTimeString() : 'لا يوجد'}`);
    console.log(`⏲️  تسجيلات هذه الساعة: ${stats.hourlyCount}/${CONFIG.maxRegistrationsPerHour}`);
    console.log('='.repeat(50));
}

// ============= الحلقة الرئيسية =============
async function main() {
    console.log('\n' + '='.repeat(50));
    console.log('🤖 بوت التسجيل التلقائي');
    console.log('='.repeat(50));
    console.log(`🎯 الهدف: ${CONFIG.targetUrl}`);
    console.log(`👤 الاسم: ${CONFIG.username}`);
    console.log(`⏱️  الفاصل: ${CONFIG.intervalBetweenRegistrations / 1000} ثانية`);
    console.log(`📊 الحد الساعي: ${CONFIG.maxRegistrationsPerHour}`);
    console.log(`🌐 المنصة: Render.com (مجاني للأبد)`);
    console.log('='.repeat(50));
    console.log(`\n🚀 بدء التشغيل...\n`);
    
    // تشغيل البوت بشكل مستمر
    while (true) {
        try {
            await canRegister();
            await registerOneAccount();
            displayStats();
        } catch (error) {
            console.log(`💥 خطأ فادح: ${error.message}`);
            await sleep(10000); // انتظر 10 ثواني قبل المحاولة مرة أخرى
        }
    }
}

// معالجة إشارات الإيقاف
process.on('SIGINT', () => {
    console.log('\n\n👋 إيقاف البوت...');
    displayStats();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n\n👋 إيقاف البوت...');
    displayStats();
    process.exit(0);
});

// تشغيل البوت
main().catch(console.error);
