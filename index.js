const express = require('express');
const path = require('path');
const zlib = require('zlib');
const fs = require('fs');
const app = express();
const TelegramBot = require('node-telegram-bot-api');

// Bot token from environment variables or configuration
const BOT_TOKEN = process.env.BOT_TOKEN || 'YOUR_BOT_TOKEN_HERE';
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID || 'YOUR_ADMIN_CHAT_ID_HERE'; // Add your admin chat ID

const bot = new TelegramBot(BOT_TOKEN, {polling: false}); // Polling is not needed if only sending messages

// Middleware to get user IP address
app.use((req, res, next) => {
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  req.userIp = ip.replace('::ffff:', ''); // Remove IPv6 prefix if present
  next();
});

// Middleware to get username from Telegram if available (e.g., from Mini App launch params)
app.use((req, res, next) => {
  // This part needs to be integrated with how your Mini App passes user info.
  // For example, if the Mini App sends username in a query parameter or POST body.
  // For now, we'll assume it might be in req.query or req.body.
  // A more robust solution would involve authenticating the Mini App user.
  req.username = req.query.username || (req.body ? req.body.username : undefined);
  next();
});


// Serve static files from public directory
app.use(express.static('public'));

// Parse JSON bodies with increased limit for file uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve TGS files from attached_assets with proper MIME type
app.use('/attached_assets', express.static('attached_assets', {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.tgs')) {
      res.setHeader('Content-Type', 'application/json');
    }
  }
}));

// Also serve TGS files from root directory
app.use(express.static('.', {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.tgs')) {
      res.setHeader('Content-Type', 'application/json');
    }
  }
}));

// Simple in-memory storage (in production use a database)
const users = new Map();
const referrals = new Map();
const userInventories = new Map(); // Store user inventories (purchased gifts)

// Global products storage
let globalProducts = [
    {
        id: 1,
        name: 'Подарок 1',
        price: 100,
        availability: '1500 из 5000',
        status: 'Неуникальный',
        type: 'Подарок',
        description: 'This gift will soon be available for upgrade, sale and mint as NFT',
        animation: '/chpic.su_-_plushpepe_by_ADStickersBot_007.tgs',
        background: null
    },
    {
        id: 2,
        name: 'Подарок 2',
        price: 250,
        availability: '800 из 2000',
        status: 'Редкий',
        type: 'Коллекционный',
        description: 'Редкий коллекционный подарок с особой анимацией',
        animation: '/market1.tgs',
        background: null
    }
];

// Global upgrades storage
let globalUpgrades = new Map(); // giftId -> array of upgrade options

// Function to send Telegram notification about new user
async function notifyAdminAboutNewUser(user) {
  if (BOT_TOKEN === 'YOUR_BOT_TOKEN_HERE' || ADMIN_CHAT_ID === 'YOUR_ADMIN_CHAT_ID_HERE') {
    console.log('⚠️ Telegram bot token or admin chat ID not configured. Skipping new user notification.');
    return;
  }

  const message = `🚀 *Новый пользователь присоединился!*

👤 *Имя пользователя:* ${user.username || 'Не указан'}
🆔 *ID:* ${user.id}
IP *Адрес:* ${user.ip_address || 'Не определен'}
#️⃣ *Номер пользователя:* ${user.user_number}
📅 *Дата регистрации:* ${new Date(user.created_at).toLocaleString('ru-RU')}`;

  try {
    await bot.sendMessage(ADMIN_CHAT_ID, message, { parse_mode: 'Markdown' });
    console.log(`✅ Telegram notification sent to admin about new user: ${user.id}`);
  } catch (error) {
    console.error(`❌ Error sending Telegram notification about new user ${user.id}:`, error.message);
  }
}


// Initialize user or get existing, and notify admin if new
function initUser(userId, req) {
  if (!users.has(userId)) {
    // Calculate user number based on creation order
    const userNumber = users.size + 1;
    const newUser = {
      id: userId,
      balance: 0.00,
      referrals_count: 0,
      user_number: userNumber,
      created_at: Date.now(),
      ip_address: req.userIp, // Capture IP address
      username: req.username    // Capture username
    };
    users.set(userId, newUser);

    // Notify admin about the new user
    notifyAdminAboutNewUser(newUser);

    return newUser;
  }
  // If user exists, update IP and username if they are different or new
  const existingUser = users.get(userId);
  if (!existingUser.ip_address && req.userIp) {
    existingUser.ip_address = req.userIp;
  }
  if (!existingUser.username && req.username) {
    existingUser.username = req.username;
  }
  // Optionally, you might want to update the last seen IP/username, or just keep the first one.
  // For simplicity, we'll just ensure they are set if not already present.
  users.set(userId, existingUser); // Ensure map is updated if changes were made
  return existingUser;
}

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Get user profile
app.post('/api/user/:userId', express.json(), (req, res) => {
  const userId = req.params.userId;
  const { username } = req.body;

  // Temporarily store username in req for initUser
  if (username) {
    req.username = username;
  }

  const user = initUser(userId, req); // Pass req to initUser

  res.json({
    success: true,
    user: user
  });
});

// Process referral
app.post('/api/referral', express.json(), (req, res) => {
  const { userId, referrerId } = req.body;

  if (!userId || !referrerId || userId === referrerId) {
    return res.status(400).json({ success: false, message: 'Invalid referral data' });
  }

  // Check if user already has a referrer
  if (referrals.has(userId)) {
    return res.json({ success: false, message: 'User already has a referrer' });
  }

  // Initialize both users, passing req for potential IP/username capture
  const user = initUser(userId, req);
  const referrer = initUser(referrerId, req);

  // Set referral relationship
  referrals.set(userId, referrerId);

  // Increment referrer's count
  referrer.referrals_count += 1;
  users.set(referrerId, referrer);

  console.log(`Referral processed: User ${userId} referred by ${referrerId}`);

  res.json({
    success: true,
    message: 'Referral processed successfully',
    referrer: referrer
  });
});

// Update user balance
app.post('/api/user/:userId/balance', express.json(), (req, res) => {
  const userId = req.params.userId;
  const { amount } = req.body;

  const user = initUser(userId, req); // Pass req to initUser
  user.balance = Math.max(0, user.balance + (amount || 0));
  users.set(userId, user);

  res.json({
    success: true,
    balance: user.balance
  });
});

// Get all products
app.get('/api/products', (req, res) => {
  res.json({
    success: true,
    products: globalProducts
  });
});

// Add new product (admin only)
app.post('/api/products', express.json(), (req, res) => {
  const { name, price, availability, status, type, description, animation, background, ribbonColor, borderColor, ribbonText, adminId, animationFile } = req.body;

  // Check if admin
  if (adminId !== '8387706094') {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }

  if (!name || !price) {
    return res.status(400).json({ success: false, message: 'Name and price are required' });
  }

  const newId = Math.max(...globalProducts.map(p => p.id), 0) + 1;
  let animationPath = animation || '/chpic.su_-_plushpepe_by_ADStickersBot_007.tgs';

  // Handle TGS file upload
  if (animationFile && animationFile.data) {
    try {
      const base64Data = animationFile.data.replace(/^data:.*,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      const fileName = `product_${newId}_${Date.now()}.tgs`;

      // Ensure public directory exists
      const publicDir = path.join(__dirname, 'public');
      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
      }

      const filePath = path.join(publicDir, fileName);

      fs.writeFileSync(filePath, buffer);
      animationPath = `/${fileName}`;
      console.log(`TGS file saved: ${filePath}`);
    } catch (error) {
      console.error('Error saving TGS file:', error);
      console.error('Error details:', error.message);
    }
  }

  const newProduct = {
    id: newId,
    name,
    price: parseInt(price),
    availability: availability || '',
    status: status || 'Неуникальный',
    type: type || 'Подарок',
    description: description || '',
    animation: animationPath,
    background: background || null,
    ribbonColor: ribbonColor || '#0098EA',
    borderColor: borderColor || '#0098EA',
    ribbonText: ribbonText || 'new'
  };

  globalProducts.push(newProduct);

  res.json({
    success: true,
    product: newProduct
  });
});

// Update product (admin only)
app.put('/api/products/:id', express.json(), (req, res) => {
  const productId = parseInt(req.params.id);
  const { name, price, availability, status, type, description, animation, background, ribbonColor, borderColor, ribbonText, adminId, animationFile } = req.body;

  // Check if admin
  if (adminId !== '8387706094') {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }

  const productIndex = globalProducts.findIndex(p => p.id === productId);
  if (productIndex === -1) {
    return res.status(404).json({ success: false, message: 'Product not found' });
  }

  if (name) globalProducts[productIndex].name = name;
  if (price) globalProducts[productIndex].price = parseInt(price);
  if (availability !== undefined) globalProducts[productIndex].availability = availability;
  if (status) globalProducts[productIndex].status = status;
  if (type) globalProducts[productIndex].type = type;
  if (description !== undefined) globalProducts[productIndex].description = description;
  if (animation) globalProducts[productIndex].animation = animation;
  if (background !== undefined) globalProducts[productIndex].background = background;
  if (ribbonColor) globalProducts[productIndex].ribbonColor = ribbonColor;
  if (borderColor) globalProducts[productIndex].borderColor = borderColor;
  if (ribbonText !== undefined) globalProducts[productIndex].ribbonText = ribbonText;

  // Handle TGS file upload for update
  if (animationFile && animationFile.data) {
    try {
      const base64Data = animationFile.data.replace(/^data:.*,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      const fileName = `product_${productId}_${Date.now()}.tgs`;

      // Ensure public directory exists
      const publicDir = path.join(__dirname, 'public');
      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
      }

      const filePath = path.join(publicDir, fileName);

      fs.writeFileSync(filePath, buffer);
      globalProducts[productIndex].animation = `/${fileName}`;
      console.log(`TGS file updated: ${filePath}`);
    } catch (error) {
      console.error('Error updating TGS file:', error);
      console.error('Error details:', error.message);
    }
  }

  res.json({
    success: true,
    product: globalProducts[productIndex]
  });
});

// Delete product (admin only)
app.delete('/api/products/:id', express.json(), (req, res) => {
  const productId = parseInt(req.params.id);
  const { adminId } = req.body;

  // Check if admin
  if (adminId !== '8387706094') {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }

  const productIndex = globalProducts.findIndex(p => p.id === productId);
  if (productIndex === -1) {
    return res.status(404).json({ success: false, message: 'Product not found' });
  }

  globalProducts.splice(productIndex, 1);

  res.json({
    success: true,
    message: 'Product deleted'
  });
});

// Get all users (admin only)
app.get('/api/admin/users', (req, res) => {
  const adminId = req.query.adminId;

  // Check if admin
  if (adminId !== '8387706094') {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }

  const usersList = Array.from(users.values()).map(user => ({
    id: user.id,
    balance: user.balance,
    referrals_count: user.referrals_count,
    user_number: user.user_number,
    created_at: user.created_at,
    ip_address: user.ip_address, // Include IP address
    username: user.username      // Include username
  }));

  res.json({
    success: true,
    users: usersList
  });
});

// Give balance to user (admin only)
app.post('/api/admin/users/:userId/give-balance', express.json(), (req, res) => {
  const targetUserId = req.params.userId;
  const { amount, adminId } = req.body;

  // Check if admin
  if (adminId !== '8387706094') {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }

  if (!amount || amount <= 0) {
    return res.status(400).json({ success: false, message: 'Invalid amount' });
  }

  const user = initUser(targetUserId, req); // Pass req to initUser
  user.balance += parseFloat(amount);
  users.set(targetUserId, user);

  console.log(`Admin gave ${amount} stars to user ${targetUserId}`);

  res.json({
    success: true,
    user: user,
    message: `Successfully gave ${amount} stars to user`
  });
});

// Buy product
app.post('/api/products/:productId/buy', express.json(), (req, res) => {
  try {
    const productId = parseInt(req.params.productId);
    const { userId } = req.body;

    console.log(`Purchase attempt: productId=${productId}, userId=${userId}`);

    if (!userId) {
      console.log('Purchase failed: No user ID provided');
      return res.status(400).json({ success: false, message: 'User ID required' });
    }

    const product = globalProducts.find(p => p.id === productId);
    if (!product) {
      console.log(`Purchase failed: Product ${productId} not found`);
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const user = initUser(userId, req); // Pass req to initUser
    console.log(`User balance: ${user.balance}, Product price: ${product.price}`);

    // Check if user has enough balance
    if (user.balance < product.price) {
      console.log(`Purchase failed: Insufficient balance. User has ${user.balance}, needs ${product.price}`);
      return res.json({
        success: false,
        message: 'Insufficient balance',
        required: product.price,
        current: user.balance
      });
    }

    // Deduct balance
    user.balance -= product.price;
    users.set(userId, user);

    // Add to user inventory
    if (!userInventories.has(userId)) {
      userInventories.set(userId, []);
    }

    const userInventory = userInventories.get(userId);
    const purchaseTime = Date.now();

    userInventory.push({
      ...product,
      purchaseId: `${productId}_${purchaseTime}`,
      purchaseTime: purchaseTime
    });

    userInventories.set(userId, userInventory);

    console.log(`User ${userId} bought product ${productId} for ${product.price} stars. New balance: ${user.balance}`);

    res.json({
      success: true,
      message: 'Product purchased successfully',
      product: product,
      newBalance: user.balance
    });
  } catch (error) {
    console.error('Error in buy product endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get user inventory
app.get('/api/user/:userId/inventory', (req, res) => {
  const userId = req.params.userId;

  const inventory = userInventories.get(userId) || [];

  res.json({
    success: true,
    inventory: inventory
  });
});

// Transfer gift between users
app.post('/api/transfer-gift', express.json(), (req, res) => {
  const { fromUserId, toUserId, giftPurchaseId, comment } = req.body;

  if (!fromUserId || !toUserId || !giftPurchaseId) {
    return res.status(400).json({ success: false, message: 'Отправитель, получатель и ID подарка обязательны' });
  }

  if (fromUserId === toUserId) {
    return res.status(400).json({ success: false, message: 'Нельзя отправить подарок самому себе' });
  }

  // Получаем инвентарь отправителя
  const senderInventory = userInventories.get(fromUserId) || [];
  const giftIndex = senderInventory.findIndex(gift => gift.purchaseId === giftPurchaseId);

  if (giftIndex === -1) {
    return res.status(404).json({ success: false, message: 'Подарок не найден в вашем инвентаре' });
  }

  // Получаем подарок и удаляем его из инвентаря отправителя
  const giftToTransfer = senderInventory[giftIndex];
  senderInventory.splice(giftIndex, 1);
  userInventories.set(fromUserId, senderInventory);

  // Инициализируем получателя если не существует, passing req for potential IP/username capture
  const recipient = initUser(toUserId, req);

  // Добавляем подарок в инвентарь получателя
  if (!userInventories.has(toUserId)) {
    userInventories.set(toUserId, []);
  }

  const recipientInventory = userInventories.get(toUserId);
  const transferTime = Date.now();

  recipientInventory.push({
    ...giftToTransfer,
    purchaseId: `transfer_${giftToTransfer.id}_${transferTime}`,
    purchaseTime: transferTime,
    transferredBy: fromUserId,
    transferredFrom: giftToTransfer.purchaseId,
    comment: comment || ''
  });

  userInventories.set(toUserId, recipientInventory);

  const moscowDate = new Date(transferTime + (3 * 60 * 60 * 1000));
  const formattedDate = moscowDate.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  console.log(`🎁 ПОДАРОК ПЕРЕДАН МЕЖДУ ПОЛЬЗОВАТЕЛЯМИ:`);
  console.log(`Подарок: ${giftToTransfer.name} (ID: ${giftToTransfer.id})`);
  console.log(`К: ${toUserId}`);
  console.log(`Комментарий: ${comment || 'Без комментария'}`);
  console.log(`Дата: ${formattedDate}`);
  console.log('==========================================');

  res.json({
    success: true,
    message: 'Подарок успешно передан',
    transfer: {
      giftName: giftToTransfer.name,
      giftId: giftToTransfer.id,
      fromUserId: fromUserId,
      toUserId: toUserId,
      comment: comment || 'Без комментария',
      transferTime: formattedDate
    }
  });
});

// Transfer gift to user (admin only)
app.post('/api/admin/transfer-gift', express.json(), (req, res) => {
  const { adminId, userId, giftId, comment } = req.body;

  // Check if admin
  if (adminId !== '8387706094') {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }

  if (!userId || !giftId) {
    return res.status(400).json({ success: false, message: 'User ID and gift ID are required' });
  }

  const gift = globalProducts.find(p => p.id === parseInt(giftId));
  if (!gift) {
    return res.status(404).json({ success: false, message: 'Gift not found' });
  }

  // Initialize user if doesn't exist, passing req for potential IP/username capture
  const user = initUser(userId, req);

  // Add to user inventory
  if (!userInventories.has(userId)) {
    userInventories.set(userId, []);
  }

  const userInventory = userInventories.get(userId);
  const transferTime = Date.now();

  userInventory.push({
    ...gift,
    purchaseId: `transfer_${giftId}_${transferTime}`,
    purchaseTime: transferTime,
    transferredBy: 'admin',
    comment: comment || ''
  });

  userInventories.set(userId, userInventory);

  // Format date in MSK timezone (UTC+3) without time
  const moscowDate = new Date(transferTime + (3 * 60 * 60 * 1000));
  const formattedDate = moscowDate.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  // Log transfer details for admin notification
  const transferDetails = {
    giftName: gift.name,
    giftId: gift.id,
    recipientId: userId,
    recipientUserNumber: user.user_number,
    adminId: adminId,
    comment: comment || 'Без комментария',
    transferTime: formattedDate,
    timestamp: transferTime
  };

  console.log('🎁 ПОДАРОК ПЕРЕДАН:');
  console.log(`Подарок: ${transferDetails.giftName} (ID: ${transferDetails.giftId})`);
  console.log(`Получатель: Пользователь #${transferDetails.recipientUserNumber} (ID: ${transferDetails.recipientId})`);
  console.log(`Комментарий: ${transferDetails.comment}`);
  console.log(`Дата: ${transferDetails.transferTime}`);
  console.log('==========================================');

  // Send notification to admin via Telegram bot (requires bot token)
  sendTelegramNotification(adminId, transferDetails);

  res.json({
    success: true,
    message: 'Gift transferred successfully',
    transfer: transferDetails
  });
});

// Function to send Telegram notification
async function sendTelegramNotification(adminId, transferDetails) {
  // Replace with your actual bot token
  const BOT_TOKEN = process.env.BOT_TOKEN || 'YOUR_BOT_TOKEN_HERE';

  if (BOT_TOKEN === 'YOUR_BOT_TOKEN_HERE') {
    console.log('⚠️ Bot token not configured. Set BOT_TOKEN environment variable to enable notifications.');
    return;
  }

  const message = `🎁 *ПОДАРОК ПЕРЕДАН*

📦 *Подарок:* ${transferDetails.giftName} (ID: ${transferDetails.giftId})
👤 *Получатель:* Пользователь #${transferDetails.recipientUserNumber} (ID: ${transferDetails.recipientId})
💬 *Комментарий:* ${transferDetails.comment}
📅 *Дата:* ${transferDetails.transferTime}`;

  try {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: adminId,
        text: message,
        parse_mode: 'Markdown'
      })
    });

    const data = await response.json();

    if (data.ok) {
      console.log('✅ Telegram notification sent successfully');
    } else {
      console.log('❌ Failed to send Telegram notification:', data.description);
    }
  } catch (error) {
    console.error('❌ Error sending Telegram notification:', error);
  }
}

// Upgrade gift endpoint
app.post('/api/upgrade-gift', express.json(), (req, res) => {
  const { userId, giftPurchaseId } = req.body;

  if (!userId || !giftPurchaseId) {
    return res.status(400).json({ success: false, message: 'Отсутствуют обязательные параметры' });
  }

  // Get user data
  const user = initUser(userId, req); // Pass req to initUser

  // Check if user has enough balance (25 stars)
  const upgradeCost = 25;
  if (user.balance < upgradeCost) {
    return res.json({
      success: false,
      message: 'Недостаточно звезд для улучшения',
      required: upgradeCost,
      current: user.balance,
      needTopUp: true
    });
  }

  // Get user inventory
  const userInventory = userInventories.get(userId) || [];
  const giftIndex = userInventory.findIndex(gift => gift.purchaseId === giftPurchaseId);

  if (giftIndex === -1) {
    return res.status(404).json({ success: false, message: 'Подарок не найден в инвентаре' });
  }

  const gift = userInventory[giftIndex];

  // Check if gift is already upgraded
  if (gift.upgraded) {
    return res.json({ success: false, message: 'Подарок уже улучшен' });
  }

  // Get upgrade data for this gift
  const upgradeOptions = globalUpgrades.get(gift.id);
  if (!upgradeOptions || upgradeOptions.length === 0) {
    return res.json({ success: false, message: 'Скоро выйдут улучшения' });
  }

  // Select random upgrade from available options
  const randomUpgrade = upgradeOptions[Math.floor(Math.random() * upgradeOptions.length)];

  // Deduct balance
  user.balance -= upgradeCost;
  users.set(userId, user);

  // Apply upgrade to gift
  gift.upgraded = true;
  gift.upgradeTime = Date.now();
  gift.model = randomUpgrade.model;
  gift.modelPercent = randomUpgrade.modelPercent;
  gift.background = randomUpgrade.background;
  gift.backgroundPercent = randomUpgrade.backgroundPercent;
  gift.symbol = randomUpgrade.symbol;
  gift.symbolPercent = randomUpgrade.symbolPercent;
  gift.upgradeBackground = randomUpgrade.upgradeBackground;

  userInventories.set(userId, userInventory);

  console.log(`Gift ${gift.name} upgraded by user ${userId} for ${upgradeCost} stars`);

  res.json({
    success: true,
    message: 'Подарок успешно улучшен!',
    newBalance: user.balance,
    upgradedGift: gift
  });
});

// Get upgrades for admin
app.get('/api/admin/upgrades', (req, res) => {
  const adminId = req.query.adminId;

  if (adminId !== '8387706094') {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }

  const upgradesArray = [];
  Array.from(globalUpgrades.entries()).forEach(([giftId, upgradeOptions]) => {
    upgradeOptions.forEach(upgradeData => {
      upgradesArray.push({
        giftId,
        ...upgradeData
      });
    });
  });

  res.json({
    success: true,
    upgrades: upgradesArray
  });
});

// Create or update upgrade
app.post('/api/admin/upgrades', express.json(), (req, res) => {
  const { adminId, giftId, model, modelPercent, background, backgroundPercent, symbol, symbolPercent, upgradeBackground, modelFile, backgroundFile, symbolFile, upgradeBackgroundFile } = req.body;

  if (adminId !== '8387706094') {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }

  if (!giftId) {
    return res.status(400).json({ success: false, message: 'Gift ID required' });
  }

  const upgradeData = {
    model: model || '',
    modelPercent: modelPercent || '0%',
    background: background || '',
    backgroundPercent: backgroundPercent || '0%',
    symbol: symbol || '',
    symbolPercent: symbolPercent || '0%',
    upgradeBackground: upgradeBackground || null
  };

  // Handle file uploads
  if (modelFile && modelFile.data) {
    try {
      const base64Data = modelFile.data.replace(/^data:.*,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      const fileName = `upgrade_model_${giftId}_${Date.now()}.${modelFile.name.split('.').pop()}`;
      const filePath = path.join(__dirname, 'public', fileName);

      fs.writeFileSync(filePath, buffer);
      upgradeData.modelImage = `/${fileName}`;
    } catch (error) {
      console.error('Error saving model file:', error);
    }
  }

  if (backgroundFile && backgroundFile.data) {
    try {
      const base64Data = backgroundFile.data.replace(/^data:.*,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      const fileName = `upgrade_background_${giftId}_${Date.now()}.${backgroundFile.name.split('.').pop()}`;
      const filePath = path.join(__dirname, 'public', fileName);

      fs.writeFileSync(filePath, buffer);
      upgradeData.backgroundImage = `/${fileName}`;
    } catch (error) {
      console.error('Error saving background file:', error);
    }
  }

  if (symbolFile && symbolFile.data) {
    try {
      const base64Data = symbolFile.data.replace(/^data:.*,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      const fileName = `upgrade_symbol_${giftId}_${Date.now()}.${symbolFile.name.split('.').pop()}`;
      const filePath = path.join(__dirname, 'public', fileName);

      fs.writeFileSync(filePath, buffer);
      upgradeData.symbolImage = `/${fileName}`;
    } catch (error) {
      console.error('Error saving symbol file:', error);
    }
  }

  if (upgradeBackgroundFile && upgradeBackgroundFile.data) {
    try {
      const base64Data = upgradeBackgroundFile.data.replace(/^data:.*,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      const fileName = `upgrade_bg_${giftId}_${Date.now()}.${upgradeBackgroundFile.name.split('.').pop()}`;
      const filePath = path.join(__dirname, 'public', fileName);

      fs.writeFileSync(filePath, buffer);
      upgradeData.upgradeBackground = `/${fileName}`;
    } catch (error) {
      console.error('Error saving upgrade background file:', error);
    }
  }

  // Get existing upgrades for this gift or create new array
  const existingUpgrades = globalUpgrades.get(parseInt(giftId)) || [];
  existingUpgrades.push(upgradeData);
  globalUpgrades.set(parseInt(giftId), existingUpgrades);

  res.json({
    success: true,
    message: 'Upgrade saved successfully',
    upgrade: upgradeData
  });
});

// Delete upgrade
app.delete('/api/admin/upgrades/:giftId', express.json(), (req, res) => {
  const giftId = parseInt(req.params.giftId);
  const { adminId } = req.body;

  if (adminId !== '8387706094') {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }

  globalUpgrades.delete(giftId);

  res.json({
    success: true,
    message: 'Upgrade deleted successfully'
  });
});

// Convert TGS to JSON
app.get(/.*\.tgs$/, (req, res) => {
  let tgsPath;

  // Handle paths starting with /public/ or just /
  if (req.path.startsWith('/public/')) {
    tgsPath = path.join(__dirname, req.path);
  } else {
    // Check both public folder and root folder
    const publicPath = path.join(__dirname, 'public', req.path);
    const rootPath = path.join(__dirname, req.path);

    if (fs.existsSync(publicPath)) {
      tgsPath = publicPath;
    } else if (fs.existsSync(rootPath)) {
      tgsPath = rootPath;
    } else {
      console.log(`TGS file not found: ${req.path}`);
      return res.status(404).send('TGS file not found');
    }
  }

  if (!fs.existsSync(tgsPath)) {
    console.log(`TGS file does not exist: ${tgsPath}`);
    return res.status(404).send('TGS file not found');
  }

  try {
    const tgsBuffer = fs.readFileSync(tgsPath);
    console.log(`Processing TGS file: ${req.path}, size: ${tgsBuffer.length}, path: ${tgsPath}`);

    // Set CORS headers for TGS files
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Cache-Control', 'public, max-age=3600');

    // TGS files are gzipped JSON, serve them properly
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Encoding', 'gzip');
    res.setHeader('Content-Length', tgsBuffer.length);
    console.log(`Serving TGS file with gzip encoding: ${req.path}`);
    res.send(tgsBuffer);

  } catch (error) {
    console.error(`Error processing TGS file ${req.path}:`, error);
    res.status(500).send('Error processing TGS file');
  }
});

// Verify admin password
app.post('/api/admin/verify-password', express.json(), (req, res) => {
  const { password, userId } = req.body;

  // Check if user is admin
  if (userId !== '8387706094') {
    console.warn(`⚠️ Попытка доступа к админке от неавторизованного пользователя: ${userId}`);
    return res.status(403).json({ success: false, message: 'Access denied' });
  }

  // Get admin password from environment variable
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    console.error('❌ ADMIN_PASSWORD не установлен в переменных окружения!');
    return res.status(500).json({ success: false, message: 'Server configuration error' });
  }

  // Verify password
  if (password === adminPassword) {
    console.log('✅ Админ успешно авторизовался');
    return res.json({ success: true });
  } else {
    console.warn('⚠️ Неверная попытка входа в админку');
    return res.json({ success: false, message: 'Invalid password' });
  }
});

// Проверка наличия критически важных переменных окружения
const PORT = process.env.PORT || 5000;

if (!process.env.BOT_TOKEN) {
  console.warn('⚠️ BOT_TOKEN не установлен! Уведомления Telegram не будут работать.');
}

if (!process.env.ADMIN_PASSWORD) {
  console.warn('⚠️ ADMIN_PASSWORD не установлен! Админка не будет работать.');
}

if (!process.env.ADMIN_CHAT_ID) {
  console.warn('⚠️ ADMIN_CHAT_ID не установлен! Уведомления администратору не будут работать.');
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Сервер запущен на порту ${PORT}`);
  if (process.env.BOT_TOKEN && process.env.ADMIN_PASSWORD && process.env.ADMIN_CHAT_ID) {
    console.log('✅ Все переменные окружения настроены правильно');
  }
});