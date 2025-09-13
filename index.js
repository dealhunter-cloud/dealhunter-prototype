const { Telegraf } = require('telegraf');

// Replace with your bot token from Step 1
const bot = new Telegraf(process.env.BOT_TOKEN);

// In-memory storage (no DB for prototype)
const users = new Map(); // { userId: { name, address, subscribed } }

// Mock deals function
function getMockDeals(query) {
  return [
    { name: 'Wireless Earbuds', price: 29.99, rating: 4.5, store: 'Amazon', url: 'https://amazon.com/earbuds' },
    { name: 'Running Shoes', price: 49.99, rating: 4.7, store: 'Nike', url: 'https://nike.com/shoes' },
    { name: 'Laptop', price: 599.99, rating: 4.3, store: 'BestBuy', url: 'https://bestbuy.com/laptop' }
  ].filter(deal => deal.name.toLowerCase().includes(query.toLowerCase()) || query === 'any');
}

// Onboarding state (simple)
let onboardingStates = new Map(); // { chatId: { step, data } }

// Start command
bot.start(async (ctx) => {
  const userId = ctx.from.id;
  const chatId = ctx.chat.id;
  const user = users.get(userId);

  if (user && user.subscribed) {
    ctx.reply('Welcome back! Ask for deals, e.g., "earbuds under $50" or "shoes".');
    return;
  }

  // Start onboarding
  onboardingStates.set(chatId, { step: 'name' });
  ctx.reply('Hi! Welcome to DealHunter Prototype. What\'s your full name?');
});

// Handle text messages
bot.on('text', async (ctx) => {
  const text = ctx.message.text.toLowerCase().trim();
  const userId = ctx.from.id;
  const chatId = ctx.chat.id;
  const user = users.get(userId);
  const state = onboardingStates.get(chatId);

  // Onboarding
  if (state) {
    if (state.step === 'name') {
      state.data = { name: text };
      state.step = 'address';
      onboardingStates.set(chatId, state);
      ctx.reply('Got it! What\'s your shipping address (city, country)?');
      return;
    }
    if (state.step === 'address') {
      state.data.address = text;
      state.step = 'plan';
      onboardingStates.set(chatId, state);
      ctx.reply('Choose plan: Reply "basic" (free prototype) or "premium" (mock).');
      return;
    }
    if (state.step === 'plan') {
      const plan = text === 'premium' ? 'premium' : 'basic';
      users.set(userId, { ...state.data, plan, subscribed: true }); // Mock subscribe
      onboardingStates.delete(chatId);
      ctx.reply(`Thanks, ${state.data.name}! You\'re subscribed to ${plan} plan. Now shop: e.g., "Find earbuds".`);
      return;
    }
  }

  // If not subscribed
  if (!user || !user.subscribed) {
    ctx.reply('Please /start to subscribe first!');
    return;
  }

  // Parse query (simple: assume product in text)
  const product = text.includes('under') ? text.split('under')[0].trim() : text;
  const deals = getMockDeals(product || 'any');

  if (deals.length === 0) {
    ctx.reply('No deals found. Try "earbuds", "shoes", or "laptop".');
    return;
  }

  let message = 'Top Deals:\n\n';
  deals.forEach((deal, i) => {
    message += `${i+1}. *${deal.name}* - $${deal.price} (${deal.rating}/5)\nStore: ${deal.store}\n[Buy Here](${deal.url})\n\n`;
  });
  message += 'Ask questions? E.g., "Compare 1 and 2" (prototype echo).';

  ctx.reply(message, { parse_mode: 'Markdown' });

  // Mock Q&A
  if (text.includes('compare')) {
    ctx.reply('Based on reviews, option 1 is better for battery! (Mock AI)');
  }
});

// For Vercel webhook
module.exports = bot.webhookCallback('/webhook');

// Error handling
bot.catch((err, ctx) => {
  console.error(`Error for ${ctx.updateType}`, err);
});

// Don't launch() for serverless – handled by webhook