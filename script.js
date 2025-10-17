// Check if running in Telegram WebApp
function checkTelegramEnvironment() {
    const loadingScreen = document.getElementById('loading-screen');
    const appContainer = document.getElementById('app-container');

    // Check if Telegram WebApp is available and it's running in native app (not web)
    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData) {
        // Additional check: Telegram Web has platform 'web', native apps have other platforms
        const platform = window.Telegram.WebApp.platform || '';
        const isNativeApp = platform !== 'web' && platform !== 'weba' && platform !== 'webk';

        if (isNativeApp) {
            // Running in native Telegram app - hide loading and show app
            setTimeout(() => {
                if (loadingScreen) loadingScreen.style.display = 'none';
                if (appContainer) appContainer.style.display = 'block';
            }, 1000); // Small delay for smooth transition
        } else {
            // Running in Telegram Web - keep infinite loading
            console.log('Telegram Web detected - infinite loading');
        }
    } else {
        // Not running in Telegram - keep infinite loading
        console.log('Not running in Telegram WebApp - infinite loading');
        // Loading screen stays visible forever
    }
}

// Call check immediately
checkTelegramEnvironment();

// Initialize Telegram WebApp
let userProfile = {
    id: null,
    first_name: 'Без имени',
    username: null,
    photo_url: null,
    referrals_count: 0,
    balance: 0.00,
    user_number: 1
};

let isIdVisible = true;

// Admin functionality
const ADMIN_ID = '8387706094';
let products = [];
let editingProductId = null;

if (window.Telegram && window.Telegram.WebApp) {
    const tg = window.Telegram.WebApp;
    tg.ready();
    tg.expand();

    // Get user data
    if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
        const user = tg.initDataUnsafe.user;
        userProfile = {
            id: user.id,
            first_name: user.first_name || 'Без имени',
            username: user.username || null,
            photo_url: user.photo_url || null,
            referrals_count: 0, // Will be loaded from backend
            balance: 0.00, // Will be loaded from backend
            user_number: 1 // Will be loaded from backend
        };
        console.log('User data loaded:', userProfile);
    } else {
        // For testing purposes
        userProfile.id = Math.floor(Math.random() * 1000000000);
        console.log('Using test user ID:', userProfile.id);
    }

    // Check for referral parameter
    const startParam = tg.initDataUnsafe?.start_param;
    if (startParam && startParam !== userProfile.id?.toString()) {
        console.log('Referral detected from user:', startParam);
        // Here you would typically send this to your backend
        handleReferral(startParam);
    }

    // Auto enable fullscreen on initialization
    try {
        if (tg.requestFullscreen) {
            tg.requestFullscreen();
        }
    } catch (error) {
        console.log('Fullscreen not supported or error:', error);
    }

    // Set theme
    try {
        if (tg.setHeaderColor) {
            tg.setHeaderColor('#000000');
        }
        if (tg.setBackgroundColor) {
            tg.setBackgroundColor('#000000');
        }
    } catch (error) {
        console.log('Theme methods not supported');
    }
}

// Load user data from server
async function loadUserData() {
    if (!userProfile.id) return;

    try {
        const response = await fetch(`/api/user/${userProfile.id}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: userProfile.username
            })
        });
        const data = await response.json();

        if (data.success) {
            userProfile.balance = data.user.balance;
            userProfile.referrals_count = data.user.referrals_count;
            userProfile.user_number = data.user.user_number;
            updateUserProfile();
        }
    } catch (error) {
        console.error('Failed to load user data:', error);
    }
}

// Handle referral logic
async function handleReferral(referrerId) {
    if (!userProfile.id) return;

    try {
        const response = await fetch('/api/referral', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId: userProfile.id,
                referrerId: referrerId
            })
        });

        const data = await response.json();

        if (data.success) {
            console.log('Referral processed successfully');
        } else {
            console.log('Referral processing failed:', data.message);
        }
    } catch (error) {
        console.error('Failed to process referral:', error);
    }
}

// Fullscreen toggle functionality
function toggleFullscreen() {
    if (window.Telegram && window.Telegram.WebApp) {
        const tg = window.Telegram.WebApp;
        try {
            if (tg.isFullscreen && tg.exitFullscreen) {
                tg.exitFullscreen();
            } else if (tg.requestFullscreen) {
                tg.requestFullscreen();
            }
        } catch (error) {
            console.log('Fullscreen not supported or error:', error);
        }
    }
}

// TGS animation support
let tgsAnimation = null;
let headerBalanceAnimation = null;
let profileBalanceAnimation = null;
let marketAnimation = null;

async function loadBalanceIconAnimations() {
    // Load header balance icon
    await loadBalanceIcon('header-balance-icon', 'headerBalanceAnimation');
    // Load profile balance icon
    await loadBalanceIcon('profile-balance-icon', 'profileBalanceAnimation');
}

async function loadBalanceIcon(containerId, animationVar) {
    const container = document.getElementById(containerId);
    if (!container) return;

    try {
        console.log(`Loading balance TGS animation for ${containerId}...`);

        const response = await fetch('/balance_icon.tgs');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Check if response is already decompressed by server
        const contentEncoding = response.headers.get('Content-Encoding');
        let animationData;

        if (contentEncoding === 'gzip') {
            // Server sent gzipped data, browser will auto-decompress
            animationData = await response.json();
            console.log(`Balance TGS auto-decompressed by browser for ${containerId}`);
        } else {
            // Manual decompression needed
            const tgsBuffer = await response.arrayBuffer();
            console.log(`Balance TGS file loaded for ${containerId}, size:`, tgsBuffer.byteLength);

            try {
                const decompressed = pako.inflate(new Uint8Array(tgsBuffer), { to: 'string' });
                animationData = JSON.parse(decompressed);
                console.log(`Balance TGS manually decompressed for ${containerId}`);
            } catch (decompressError) {
                // Try as raw JSON
                const jsonString = new TextDecoder().decode(tgsBuffer);
                animationData = JSON.parse(jsonString);
                console.log(`Balance TGS loaded as raw JSON for ${containerId}`);
            }
        }

        container.innerHTML = '';
        const animElement = document.createElement('div');
        animElement.style.width = '24px';
        animElement.style.height = '24px';
        container.appendChild(animElement);

        const animation = lottie.loadAnimation({
            container: animElement,
            renderer: 'svg',
            loop: false,
            autoplay: true,
            animationData: animationData
        });

        if (animationVar === 'headerBalanceAnimation') {
            headerBalanceAnimation = animation;
        } else if (animationVar === 'profileBalanceAnimation') {
            profileBalanceAnimation = animation;
        }

        console.log(`Balance TGS animation loaded successfully for ${containerId}`);

    } catch (error) {
        console.error(`Balance TGS loading failed for ${containerId}:`, error);
    }
}

async function loadTgsAnimation() {
    const container = document.getElementById('tgs-container');
    if (!container) return;

    try {
        console.log('Loading TGS animation...');

        // Load TGS file as raw binary data
        const response = await fetch('/chpic.su_-_plushpepe_by_ADStickersBot_007.tgs');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const tgsBuffer = await response.arrayBuffer();
        console.log('TGS file loaded, size:', tgsBuffer.byteLength);

        // Decompress TGS (it's gzipped JSON)
        const decompressed = pako.inflate(new Uint8Array(tgsBuffer), { to: 'string' });
        const animationData = JSON.parse(decompressed);

        console.log('TGS decompressed successfully');

        // Create container and load animation with lottie-web
        container.innerHTML = '';
        const animElement = document.createElement('div');
        animElement.style.width = '102px';
        animElement.style.height = '89px';
        container.appendChild(animElement);

        // Load animation with lottie-web
        tgsAnimation = lottie.loadAnimation({
            container: animElement,
            renderer: 'svg',
            loop: false,
            autoplay: true,
            animationData: animationData
        });

        console.log('TGS animation loaded successfully');

    } catch (error) {
        console.error('TGS loading failed:', error);
    }
}

async function loadMarketTgsAnimation() {
    const container = document.getElementById('market-tgs-container');
    if (!container) return;

    try {
        console.log('Loading Market TGS animation...');

        // Load TGS file as raw binary data
        const response = await fetch('/market1.tgs');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const tgsBuffer = await response.arrayBuffer();
        console.log('Market TGS file loaded, size:', tgsBuffer.byteLength);

        // Decompress TGS (it's gzipped JSON)
        const decompressed = pako.inflate(new Uint8Array(tgsBuffer), { to: 'string' });
        const animationData = JSON.parse(decompressed);

        console.log('Market TGS decompressed successfully');

        // Create container and load animation with lottie-web
        container.innerHTML = '';
        const animElement = document.createElement('div');
        animElement.style.width = '120px';
        animElement.style.height = '120px';
        container.appendChild(animElement);

        // Load animation with lottie-web
        marketAnimation = lottie.loadAnimation({
            container: animElement,
            renderer: 'svg',
            loop: false,
            autoplay: true,
            animationData: animationData
        });

        console.log('Market TGS animation loaded successfully');

    } catch (error) {
        console.error('Market TGS loading failed:', error);
    }
}

// Stars explosion effect
function createStarSvg() {
    return `
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 .587l3.668 7.568 8.332 1.151-6.064 5.828
                     1.48 8.279L12 18.896l-7.416 4.517
                     1.48-8.279L0 9.306l8.332-1.151z"/>
        </svg>
    `;
}

function explodeStars(opts = {}) {
    const CONFIG = {
        COUNT: 300,
        SIZE_PX: 14,
        MIN_DURATION: 0.8,
        MAX_DURATION: 1.6,
        SPREAD_DIV: 1.05
    };

    const cfg = Object.assign({}, CONFIG, opts);
    const stage = document.getElementById('stars-stage');
    if (!stage) return;

    const centerX = stage.clientWidth / 2;
    const centerY = stage.clientHeight / 2;
    const maxDim = Math.max(stage.clientWidth, stage.clientHeight);
    const stars = [];

    const frag = document.createDocumentFragment();

    for (let i = 0; i < cfg.COUNT; i++) {
        const star = document.createElement('div');
        star.className = 'star';

        const size = cfg.SIZE_PX;
        star.style.width = size + 'px';
        star.style.height = size + 'px';
        star.innerHTML = createStarSvg();

        star.style.left = centerX + 'px';
        star.style.top = centerY + 'px';

        const half = size / 2;
        const startScale = 0.25 + Math.random() * 0.35;
        const startRot = (Math.random() * 360) | 0;
        star.style.transform = `translate(${-half}px, ${-half}px) rotate(${startRot}deg) scale(${startScale})`;
        star.style.opacity = '1';

        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * (maxDim / cfg.SPREAD_DIV);
        const tx = Math.cos(angle) * radius;
        const ty = Math.sin(angle) * radius;
        const endRot = startRot + (Math.random() > 0.5 ? 120 : -120) + Math.random() * 150;

        const duration = cfg.MIN_DURATION + Math.random() * (cfg.MAX_DURATION - cfg.MIN_DURATION);

        stars.push({
            el: star,
            tx, ty,
            half,
            duration,
            endRot
        });

        frag.appendChild(star);
    }

    stage.appendChild(frag);

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            for (const s of stars) {
                const el = s.el;
                el.style.transition = `transform ${s.duration}s cubic-bezier(.08,.8,.2,1), opacity ${s.duration}s linear`;
                const targetX = s.tx - s.half;
                const targetY = s.ty - s.half;
                el.style.transform = `translate(${targetX}px, ${targetY}px) rotate(${s.endRot}deg) scale(1)`;
                el.style.opacity = '0';

                const onEnd = (ev) => {
                    if (ev.propertyName === 'opacity' || ev.propertyName === 'transform') {
                        el.removeEventListener('transitionend', onEnd);
                        if (el.parentNode) el.parentNode.removeChild(el);
                    }
                };
                el.addEventListener('transitionend', onEnd);
            }
        });
    });
}

// Toggle ID visibility
function toggleIdVisibility() {
    isIdVisible = !isIdVisible;
    updateUserProfile();

    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
    }
}

// Update user profile in UI
function updateUserProfile() {
    // Update user name
    const userNameElements = document.querySelectorAll('.user-name');
    userNameElements.forEach(el => {
        el.textContent = userProfile.first_name;
    });

    // Update user ID
    const userIdBtn = document.querySelector('.user-id-btn');
    if (userIdBtn && userProfile.id) {
        const displayId = isIdVisible ? userProfile.id : '***********';
        userIdBtn.innerHTML = `ID ${displayId} <svg class="eye-icon" width="13" height="7" viewBox="0 0 13 7" fill="#0098EA" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M6.5 0C10.0897 0 13 3.50041 13 3.50041C12.9779 3.52689 10.076 7 6.5 7C2.92396 7 0.0220757 3.52689 0 3.50041C0 3.50041 2.91027 0 6.5 0ZM6.5 1.06901C5.07513 1.06901 3.92047 2.1578 3.92047 3.50041C3.9207 4.84282 5.07527 5.93099 6.5 5.93099C7.92473 5.93099 9.08016 4.84282 9.08039 3.50041C9.08039 2.1578 7.92487 1.06901 6.5 1.06901Z"></path><ellipse cx="6.49993" cy="3.50003" rx="1.92217" ry="1.81119"></ellipse></svg>`;

        // Remove old event listeners and add new ones
        const newUserIdBtn = userIdBtn.cloneNode(true);
        userIdBtn.parentNode.replaceChild(newUserIdBtn, userIdBtn);

        // Add click handler for eye icon to toggle visibility
        const eyeIcon = newUserIdBtn.querySelector('.eye-icon');
        if (eyeIcon) {
            eyeIcon.addEventListener('click', function(e) {
                e.stopPropagation();
                toggleIdVisibility();
            });
        }

        // Add click handler to copy ID (only when visible)
        newUserIdBtn.addEventListener('click', function() {
            if (isIdVisible && navigator.clipboard && userProfile.id) {
                navigator.clipboard.writeText(userProfile.id.toString()).then(() => {
                    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
                        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
                    }
                    console.log('User ID copied to clipboard');
                });
            }
        });
    }

    // Update user rank with user numbering from backend
    const userRankEl = document.querySelector('.user-rank');
    if (userRankEl && userProfile.user_number) {
        userRankEl.textContent = `#${userProfile.user_number}`;
    }

    // Update avatars
    const avatarElements = document.querySelectorAll('.user-avatar, .profile-avatar');
    avatarElements.forEach(avatar => {
        if (userProfile.photo_url) {
            avatar.src = userProfile.photo_url;
        } else {
            // Create a colored avatar with first letter
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = 72;
            canvas.height = 72;

            // Generate color based on user ID
            const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#FF9FF3', '#54A0FF'];
            const colorIndex = userProfile.id ? userProfile.id % colors.length : 0;

            ctx.fillStyle = colors[colorIndex];
            ctx.fillRect(0, 0, 72, 72);

            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 28px SF Pro Display, -apple-system, system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(userProfile.first_name.charAt(0).toUpperCase(), 36, 36);

            avatar.src = canvas.toDataURL();
        }
    });

    // Update balance in header
    const headerBalanceElements = document.querySelectorAll('.balance-amount');
    headerBalanceElements.forEach(el => {
        el.textContent = userProfile.balance.toFixed(2);
    });

    // Update referral earnings in profile (separate from main balance)
    const profileBalanceElements = document.querySelectorAll('.balance-value');
    profileBalanceElements.forEach(el => {
        const referralEarnings = userProfile.referrals_count * 10; // 10 звезд за каждого реферала
        el.textContent = referralEarnings.toFixed(2);
    });

    // Update referrals count
    const referralsCountEl = document.querySelector('.referrals-count');
    if (referralsCountEl) {
        referralsCountEl.textContent = userProfile.referrals_count;
    }

    // Update referral link
    updateReferralLink();
}

// Update referral link
function updateReferralLink() {
    const referralLinkText = document.querySelector('.referral-link-text');
    if (referralLinkText && userProfile.id) {
        const referralLink = `t.me/HypeGiftrobot/app?startapp=${userProfile.id}`;
        referralLinkText.textContent = referralLink;

        // Add click handler to copy link
        const referralLinkInput = document.querySelector('.referral-link-input');
        if (referralLinkInput) {
            referralLinkInput.addEventListener('click', function() {
                if (navigator.clipboard) {
                    navigator.clipboard.writeText(referralLink).then(() => {
                        if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
                            window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
                        }

                        if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.showAlert) {
                            window.Telegram.WebApp.showAlert('Реферальная ссылка скопирована!');
                        } else {
                            console.log('Referral link copied to clipboard');
                        }
                    });
                }
            });
        }
    }
}

// Share referral link
function shareReferralLink() {
    if (!userProfile.id) return;

    const referralLink = `t.me/HypeGiftrobot/app?startapp=${userProfile.id}`;
    const shareText = '✨ HypeGift Получи новые подарки Бесплатно';
    const fullMessage = `${shareText}\n${referralLink}`;

    if (window.Telegram && window.Telegram.WebApp) {
        const tg = window.Telegram.WebApp;

        // Use Telegram's share functionality if available
        if (tg.openTelegramLink) {
            const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(shareText)}`;
            tg.openTelegramLink(shareUrl);
        } else if (navigator.share) {
            // Use Web Share API if available
            navigator.share({
                title: 'HypeGift',
                text: shareText,
                url: referralLink
            }).catch(console.error);
        } else if (navigator.clipboard) {
            // Fallback to copying to clipboard
            navigator.clipboard.writeText(fullMessage).then(() => {
                if (tg.showAlert) {
                    tg.showAlert('Сообщение скопировано! Вставьте его в чат для отправки.');
                } else {
                    console.log('Share message copied to clipboard');
                }
            });
        }
    }
}

// Load products from API
async function loadProducts() {
    try {
        const response = await fetch('/api/products');
        const data = await response.json();

        if (data.success) {
            products = data.products;
            renderProducts();
        }
    } catch (error) {
        console.error('Failed to load products:', error);
    }
}



// Product management functions
function renderProducts() {
    const casesGrid = document.getElementById('cases-grid');
    if (!casesGrid) return;

    casesGrid.innerHTML = '';

    products.forEach(product => {
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        productCard.innerHTML = `
            <div class="product-card-content">
                <div class="product-animation-wrapper">
                    <div class="product-animation-aspect-ratio"></div>
                    <div class="product-animation-content">
                        <div class="product-animation" id="product-animation-${product.id}"></div>
                    </div>
                </div>
                <div class="product-price-container">
                    <div class="product-price-chip">
                        <img src="srr.svg" alt="Stars" class="price-star-icon">
                        <span class="product-price">${product.price}</span>
                    </div>
                </div>
            </div>
        `;

        // Добавляем ленточку если у товара есть ribbonText
        if (product.ribbonText) {
            const ribbon = document.createElement('div');
            ribbon.className = 'product-corner-ribbon';
            ribbon.innerHTML = `<span>${product.ribbonText}</span>`;
            if (product.ribbonColor) {
                ribbon.querySelector('span').style.background = product.ribbonColor;
            }
            productCard.appendChild(ribbon);
        }

        // Применяем цвет границы если указан
        if (product.borderColor) {
            productCard.style.border = `2px solid ${product.borderColor}`;
        }

        if (product.background) {
            const bgElement = productCard.querySelector('.product-animation-content');
            bgElement.style.backgroundImage = `url(${product.background})`;
            bgElement.style.backgroundSize = 'cover';
            bgElement.style.backgroundPosition = 'center';
        }

        // Add click handler to show product modal
        productCard.addEventListener('click', function() {
            if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
                try {
                    window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
                } catch (error) {
                    console.log('Haptic feedback not supported:', error);
                }
            }
            showProductModal(product);
        });

        casesGrid.appendChild(productCard);

        // Load product animation
        loadProductAnimation(product.id, product.animation);
    });
}

// Store product animations and their states
const productAnimations = {};

async function loadProductAnimation(productId, animationPath) {
    const container = document.getElementById(`product-animation-${productId}`);
    if (!container) return;

    try {
        console.log(`Loading product TGS animation for ${productId}...`);

        // Ensure the path starts with / for absolute paths
        let fullPath = animationPath;
        if (!fullPath.startsWith('/')) {
            fullPath = '/' + fullPath;
        }

        const response = await fetch(fullPath);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        let animationData = null;
        let loadMethod = 'unknown';

        // Check if response is already decompressed by server
        const contentEncoding = response.headers.get('Content-Encoding');

        if (contentEncoding === 'gzip') {
            // Server sent gzipped data, browser will auto-decompress
            animationData = await response.json();
            loadMethod = 'auto-gzip';
            console.log(`Product TGS auto-decompressed by browser for ${productId}`);
        } else {
            const tgsBuffer = await response.arrayBuffer();
            console.log(`Product TGS file loaded for ${productId}, size:`, tgsBuffer.byteLength);

            // Try to decompress as gzipped JSON first
            try {
                const decompressed = pako.inflate(new Uint8Array(tgsBuffer), { to: 'string' });
                animationData = JSON.parse(decompressed);
                loadMethod = 'manual-gzip';
                console.log(`Product TGS manually decompressed for ${productId}`);
            } catch (decompressError) {
                console.log(`Decompression failed for ${productId}, trying as raw JSON:`, decompressError);

                // If decompression fails, try to parse as raw JSON
                try {
                    const jsonString = new TextDecoder().decode(tgsBuffer);
                    animationData = JSON.parse(jsonString);
                    loadMethod = 'raw';
                    console.log(`Product raw JSON loaded successfully for ${productId}`);
                } catch (jsonError) {
                    console.error(`Failed to parse as JSON for ${productId}:`, jsonError);
                    throw new Error(`Could not parse TGS file: ${jsonError.message}`);
                }
            }
        }

        // If we successfully loaded the animation data, create the animation
        if (animationData) {
            container.innerHTML = '';
            const animElement = document.createElement('div');
            animElement.style.width = '100px';
            animElement.style.height = '100px';
            animElement.style.cursor = 'pointer';
            animElement.style.display = 'flex';
            animElement.style.alignItems = 'center';
            animElement.style.justifyContent = 'center';
            container.appendChild(animElement);

            const animation = lottie.loadAnimation({
                container: animElement,
                renderer: 'svg',
                loop: false,
                autoplay: false,
                animationData: animationData
            });

            // Store animation reference and state
            productAnimations[productId] = {
                animation: animation,
                isPlaying: false,
                canPlay: true,
                isLoaded: true
            };

            // Handle animation completion
            animation.addEventListener('complete', function() {
                productAnimations[productId].isPlaying = false;
                productAnimations[productId].canPlay = true;
                console.log(`Product animation ${productId} completed, ready for replay`);
            });

            // Add click handler for replay
            animElement.addEventListener('click', function(e) {
                e.stopPropagation();
                replayProductAnimation(productId);
            });

            console.log(`Product TGS animation loaded successfully for ${productId} (method: ${loadMethod})`);

            // Если мы находимся в разделе товаров, запустим анимацию сразу
            const caseSection = document.querySelector('.case-section');
            if (caseSection && caseSection.style.display !== 'none') {
                setTimeout(() => {
                    replayProductAnimation(productId);
                }, 50);
            }
        }

    } catch (error) {
        console.error(`Product TGS loading failed for ${productId}:`, error);

        // Fallback: show a placeholder or default animation
        container.innerHTML = '<div style="width: 80px; height: 80px; background: #444; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #888; font-size: 12px;">Анимация недоступна</div>';
    }
}

function replayProductAnimation(productId) {
    const animData = productAnimations[productId];
    if (!animData || !animData.canPlay || animData.isPlaying) {
        console.log(`Animation ${productId} cannot be replayed right now`);
        return;
    }

    // Add haptic feedback if available
    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
        try {
            window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
        } catch (error) {
            console.log('Haptic feedback not supported:', error);
        }
    }

    animData.isPlaying = true;
    animData.canPlay = false;
    animData.animation.goToAndStop(0);
    animData.animation.play();

    console.log(`Replaying product animation ${productId}`);
}

function replayAllProductAnimations() {
    Object.keys(productAnimations).forEach(productId => {
        const animData = productAnimations[productId];
        if (animData && animData.animation && animData.isLoaded) {
            animData.isPlaying = true;
            animData.canPlay = false;
            animData.animation.goToAndStop(0);
            animData.animation.play();
        }
    });
    console.log('All product animations replayed');
}

// Новая функция для запуска анимаций с ожиданием загрузки
function startProductAnimationsWhenReady() {
    const checkAndStart = () => {
        let allLoaded = true;
        let hasAnimations = false;

        Object.keys(productAnimations).forEach(productId => {
            const animData = productAnimations[productId];
            if (animData) {
                hasAnimations = true;
                if (!animData.isLoaded) {
                    allLoaded = false;
                }
            }
        });

        if (hasAnimations && allLoaded) {
            replayAllProductAnimations();
        } else if (hasAnimations && !allLoaded) {
            // Если есть анимации, но не все загружены, ждем еще немного
            setTimeout(checkAndStart, 100);
        }
    };

    // Небольшая задержка для инициализации
    setTimeout(checkAndStart, 50);
}

// Admin password modal functions
function showAdminPasswordModal() {
    const modal = document.getElementById('admin-password-modal');
    const passwordInput = document.getElementById('admin-password-input');

    if (modal && passwordInput) {
        passwordInput.value = '';
        modal.style.display = 'flex';
        // Focus on password input for better UX
        setTimeout(() => {
            passwordInput.focus();
        }, 100);
    } else {
        console.error('Admin password modal elements not found');
    }
}

function hideAdminPasswordModal() {
    const modal = document.getElementById('admin-password-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

async function verifyAdminPassword() {
    const passwordInput = document.getElementById('admin-password-input');
    const password = passwordInput.value.trim();

    if (!password) {
        alert('Введите пароль');
        return;
    }

    try {
        const response = await fetch('/api/admin/verify-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                password: password,
                userId: userProfile.id?.toString()
            })
        });

        const data = await response.json();

        if (data.success) {
            hideAdminPasswordModal();
            showSection('admin');
            showAdminMainScreen();
        } else {
            alert('Неверный пароль');
            passwordInput.value = '';
        }
    } catch (error) {
        console.error('Failed to verify password:', error);
        alert('Произошла ошибка при проверке пароля');
    }
}

// Admin panel functions
function showAdminMainScreen() {
    const adminMainScreen = document.getElementById('admin-main-screen');
    const adminProductsScreen = document.getElementById('admin-products-screen');
    const adminUsersScreen = document.getElementById('admin-users-screen');
    const adminEmptyState = document.getElementById('admin-empty-state');

    if (adminMainScreen) adminMainScreen.style.display = 'block';
    if (adminProductsScreen) adminProductsScreen.style.display = 'none';
    if (adminUsersScreen) adminUsersScreen.style.display = 'none';
    if (adminEmptyState) adminEmptyState.style.display = 'none';
}

function showAdminEmptyState() {
    const adminMainScreen = document.getElementById('admin-main-screen');
    const adminProductsScreen = document.getElementById('admin-products-screen');
    const adminUsersScreen = document.getElementById('admin-users-screen');
    const adminGiftsScreen = document.getElementById('admin-gifts-screen');
    const adminUpgradesScreen = document.getElementById('admin-upgrades-screen');
    const adminEmptyState = document.getElementById('admin-empty-state');

    if (adminMainScreen) adminMainScreen.style.display = 'none';
    if (adminProductsScreen) adminProductsScreen.style.display = 'none';
    if (adminUsersScreen) adminUsersScreen.style.display = 'none';
    if (adminGiftsScreen) adminGiftsScreen.style.display = 'none';
    if (adminUpgradesScreen) adminUpgradesScreen.style.display = 'none';
    if (adminEmptyState) adminEmptyState.style.display = 'block';
}

function showAdminProductsScreen() {
    const adminMainScreen = document.getElementById('admin-main-screen');
    const adminProductsScreen = document.getElementById('admin-products-screen');
    const adminUsersScreen = document.getElementById('admin-users-screen');
    const adminProductForm = document.getElementById('admin-product-form');

    if (adminMainScreen) adminMainScreen.style.display = 'none';
    if (adminProductsScreen) adminProductsScreen.style.display = 'block';
    if (adminUsersScreen) adminUsersScreen.style.display = 'none';
    if (adminProductForm) adminProductForm.style.display = 'none';

    renderAdminProductsList();
}

function showAdminUsersScreen() {
    const adminMainScreen = document.getElementById('admin-main-screen');
    const adminProductsScreen = document.getElementById('admin-products-screen');
    const adminUsersScreen = document.getElementById('admin-users-screen');
    const adminGiftsScreen = document.getElementById('admin-gifts-screen');

    if (adminMainScreen) adminMainScreen.style.display = 'none';
    if (adminProductsScreen) adminProductsScreen.style.display = 'none';
    if (adminUsersScreen) adminUsersScreen.style.display = 'block';
    if (adminGiftsScreen) adminGiftsScreen.style.display = 'none';

    loadAndRenderUsers();
}

function showAdminGiftsScreen() {
    const adminMainScreen = document.getElementById('admin-main-screen');
    const adminProductsScreen = document.getElementById('admin-products-screen');
    const adminUsersScreen = document.getElementById('admin-users-screen');
    const adminGiftsScreen = document.getElementById('admin-gifts-screen');
    const adminUpgradesScreen = document.getElementById('admin-upgrades-screen');

    if (adminMainScreen) adminMainScreen.style.display = 'none';
    if (adminProductsScreen) adminProductsScreen.style.display = 'none';
    if (adminUsersScreen) adminUsersScreen.style.display = 'none';
    if (adminGiftsScreen) adminGiftsScreen.style.display = 'block';
    if (adminUpgradesScreen) adminUpgradesScreen.style.display = 'none';

    renderGiftSelection();
}

function showAdminUpgradesScreen() {
    const adminMainScreen = document.getElementById('admin-main-screen');
    const adminProductsScreen = document.getElementById('admin-products-screen');
    const adminUsersScreen = document.getElementById('admin-users-screen');
    const adminGiftsScreen = document.getElementById('admin-gifts-screen');
    const adminUpgradesScreen = document.getElementById('admin-upgrades-screen');
    const adminUpgradeForm = document.getElementById('admin-upgrade-form');

    if (adminMainScreen) adminMainScreen.style.display = 'none';
    if (adminProductsScreen) adminProductsScreen.style.display = 'none';
    if (adminUsersScreen) adminUsersScreen.style.display = 'none';
    if (adminGiftsScreen) adminGiftsScreen.style.display = 'none';
    if (adminUpgradesScreen) adminUpgradesScreen.style.display = 'block';
    if (adminUpgradeForm) adminUpgradeForm.style.display = 'none';

    loadAndRenderUpgrades();
    populateGiftSelect();
}

function showAdminUpgradeForm() {
    const adminUpgradeForm = document.getElementById('admin-upgrade-form');
    const upgradesActions = document.getElementById('upgrades-actions');

    if (adminUpgradeForm) adminUpgradeForm.style.display = 'block';
    if (upgradesActions) upgradesActions.style.display = 'none';
}

function hideAdminUpgradeForm() {
    const adminUpgradeForm = document.getElementById('admin-upgrade-form');
    const upgradesActions = document.getElementById('upgrades-actions');

    if (adminUpgradeForm) adminUpgradeForm.style.display = 'none';
    if (upgradesActions) upgradesActions.style.display = 'block';

    clearUpgradeForm();
}

function clearUpgradeForm() {
    const inputs = [
        'upgrade-gift-select', 'upgrade-model-name', 'upgrade-model-percent',
        'upgrade-background-name', 'upgrade-background-percent', 'upgrade-symbol-name',
        'upgrade-symbol-percent', 'upgrade-background-image', 'upgrade-model-file',
        'upgrade-background-file', 'upgrade-symbol-file'
    ];

    inputs.forEach(inputId => {
        const input = document.getElementById(inputId);
        if (input) {
            input.value = '';
        }
    });
}

function populateGiftSelect() {
    const giftSelect = document.getElementById('upgrade-gift-select');
    if (!giftSelect) return;

    giftSelect.innerHTML = '<option value="">Выберите подарок</option>';

    products.forEach(product => {
        const option = document.createElement('option');
        option.value = product.id;
        option.textContent = product.name;
        giftSelect.appendChild(option);
    });
}

async function loadAndRenderUpgrades() {
    if (!userProfile.id || userProfile.id.toString() !== ADMIN_ID) return;

    try {
        const response = await fetch(`/api/admin/upgrades?adminId=${userProfile.id}`);
        const data = await response.json();

        if (data.success) {
            renderUpgradesList(data.upgrades);
        } else {
            console.error('Failed to load upgrades:', data.message);
        }
    } catch (error) {
        console.error('Failed to load upgrades:', error);
    }
}

function renderUpgradesList(upgrades) {
    const upgradesList = document.getElementById('upgrades-list');
    if (!upgradesList) return;

    upgradesList.innerHTML = '<h3 style="color: #FFFFFF; margin-bottom: 12px;">Существующие улучшения:</h3>';

    if (upgrades.length === 0) {
        upgradesList.innerHTML += '<p style="color: #787E82; text-align: center;">Улучшения не найдены</p>';
        return;
    }

    // Group upgrades by gift ID
    const upgradesByGift = {};
    upgrades.forEach(upgrade => {
        if (!upgradesByGift[upgrade.giftId]) {
            upgradesByGift[upgrade.giftId] = [];
        }
        upgradesByGift[upgrade.giftId].push(upgrade);
    });

    Object.entries(upgradesByGift).forEach(([giftId, giftUpgrades]) => {
        const gift = products.find(p => p.id === parseInt(giftId));
        const giftName = gift ? gift.name : `Подарок ID: ${giftId}`;

        const upgradeItem = document.createElement('div');
        upgradeItem.className = 'upgrade-item';
        upgradeItem.innerHTML = `
            <div class="upgrade-item-info">
                <div class="upgrade-item-title">${giftName} (${giftUpgrades.length} вариантов)</div>
                <div class="upgrade-item-details">
                    ${giftUpgrades.map((upgrade, index) => `
                        Вариант ${index + 1}:<br>
                        Модель: ${upgrade.model || 'Не указано'} (${upgrade.modelPercent || '0%'})<br>
                        Фон: ${upgrade.background || 'Не указано'} (${upgrade.backgroundPercent || '0%'})<br>
                        Символ: ${upgrade.symbol || 'Не указано'} (${upgrade.symbolPercent || '0%'})<br><br>
                    `).join('')}
                </div>
            </div>
            <div class="upgrade-item-actions">
                <button class="action-btn delete-btn" onclick="deleteUpgrade(${giftId})">Удалить все</button>
            </div>
        `;
        upgradesList.appendChild(upgradeItem);
    });
}

async function saveUpgrade() {
    const giftId = document.getElementById('upgrade-gift-select').value;
    const modelName = document.getElementById('upgrade-model-name').value;
    const modelPercent = document.getElementById('upgrade-model-percent').value;
    const backgroundName = document.getElementById('upgrade-background-name').value;
    const backgroundPercent = document.getElementById('upgrade-background-percent').value;
    const symbolName = document.getElementById('upgrade-symbol-name').value;
    const symbolPercent = document.getElementById('upgrade-symbol-percent').value;
    const backgroundImageInput = document.getElementById('upgrade-background-image').files[0];
    const modelFileInput = document.getElementById('upgrade-model-file').files[0];
    const backgroundFileInput = document.getElementById('upgrade-background-file').files[0];
    const symbolFileInput = document.getElementById('upgrade-symbol-file').files[0];

    if (!giftId) {
        alert('Пожалуйста, выберите подарок');
        return;
    }

    const upgradeData = {
        adminId: userProfile.id?.toString(),
        giftId: parseInt(giftId),
        model: modelName,
        modelPercent: modelPercent,
        background: backgroundName,
        backgroundPercent: backgroundPercent,
        symbol: symbolName,
        symbolPercent: symbolPercent
    };

    // Handle files processing
    let filesToProcess = 0;
    let filesProcessed = 0;

    const filesToHandle = [
        { input: backgroundImageInput, key: 'upgradeBackgroundFile' },
        { input: modelFileInput, key: 'modelFile' },
        { input: backgroundFileInput, key: 'backgroundFile' },
        { input: symbolFileInput, key: 'symbolFile' }
    ];

    filesToHandle.forEach(file => {
        if (file.input) filesToProcess++;
    });

    if (filesToProcess === 0) {
        await saveUpgradeDataWithFiles(upgradeData);
        return;
    }

    function checkAndSave() {
        filesProcessed++;
        if (filesProcessed === filesToProcess) {
            saveUpgradeDataWithFiles(upgradeData);
        }
    }

    filesToHandle.forEach(file => {
        if (file.input) {
            const reader = new FileReader();
            reader.onload = function(e) {
                upgradeData[file.key] = {
                    name: file.input.name,
                    data: e.target.result
                };
                checkAndSave();
            };
            reader.readAsDataURL(file.input);
        }
    });
}

async function saveUpgradeDataWithFiles(upgradeData) {
    try {
        const response = await fetch('/api/admin/upgrades', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(upgradeData)
        });

        const data = await response.json();

        if (data.success) {
            await loadAndRenderUpgrades();
            hideAdminUpgradeForm();
            alert('Улучшение успешно сохранено!');
        } else {
            alert('Ошибка: ' + data.message);
        }
    } catch (error) {
        console.error('Failed to save upgrade:', error);
        alert('Произошла ошибка при сохранении улучшения');
    }
}

async function deleteUpgrade(giftId) {
    if (confirm('Вы уверены, что хотите удалить это улучшение?')) {
        try {
            const response = await fetch(`/api/admin/upgrades/${giftId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    adminId: userProfile.id?.toString()
                })
            });

            const data = await response.json();

            if (data.success) {
                await loadAndRenderUpgrades();
            } else {
                alert('Ошибка: ' + data.message);
            }
        } catch (error) {
            console.error('Failed to delete upgrade:', error);
            alert('Произошла ошибка при удалении улучшения');
        }
    }
}

function showAdminProductForm() {
    const adminProductForm = document.getElementById('admin-product-form');
    const productsActions = document.getElementById('products-actions');

    if (adminProductForm) adminProductForm.style.display = 'block';
    if (productsActions) productsActions.style.display = 'none';
}

function hideAdminProductForm() {
    const adminProductForm = document.getElementById('admin-product-form');
    const productsActions = document.getElementById('products-actions');

    if (adminProductForm) adminProductForm.style.display = 'none';
    if (productsActions) productsActions.style.display = 'block';

    clearAdminForm();
}

function clearAdminForm() {
    const productName = document.getElementById('product-name');
    const productPrice = document.getElementById('product-price');
    const productAvailability = document.getElementById('product-availability');
    const productStatus = document.getElementById('product-status');
    const productType = document.getElementById('product-type');
    const productDescription = document.getElementById('product-description');
    const animationInput = document.getElementById('product-animation');
    const backgroundInput = document.getElementById('product-background');

    if (productName) productName.value = '';
    if (productPrice) productPrice.value = '';
    if (productAvailability) productAvailability.value = '';
    if (productStatus) productStatus.value = 'Неуникальный';
    if (productType) productType.value = 'Подарок';
    if (productDescription) productDescription.value = '';
    if (animationInput) animationInput.value = '';
    if (backgroundInput) backgroundInput.value = '';

    const ribbonTextInput = document.getElementById('product-ribbon-text');
    const ribbonColorInput = document.getElementById('product-ribbon-color');
    const borderColorInput = document.getElementById('product-border-color');
    if (ribbonTextInput) ribbonTextInput.value = '';
    if (ribbonColorInput) ribbonColorInput.value = '#0098EA';
    if (borderColorInput) borderColorInput.value = '#0098EA';

    editingProductId = null;
}

function renderAdminProductsList() {
    const productsList = document.getElementById('products-list');
    if (!productsList) return;

    productsList.innerHTML = '<h3 style="color: #FFFFFF; margin-bottom: 12px;">Существующие товары:</h3>';

    products.forEach(product => {
        const productItem = document.createElement('div');
        productItem.className = 'product-item';
        productItem.innerHTML = `
            <div class="product-info">
                <div>${product.name}</div>
                <div style="font-size: 12px; color: #787E82;">${product.price} звезд</div>
            </div>
            <div class="product-actions">
                <button class="action-btn edit-btn" onclick="editProduct(${product.id})">Изменить</button>
                <button class="action-btn delete-btn" onclick="deleteProduct(${product.id})">Удалить</button>
            </div>
        `;
        productsList.appendChild(productItem);
    });
}

function editProduct(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    editingProductId = productId;

    const productName = document.getElementById('product-name');
    const productPrice = document.getElementById('product-price');
    const productAvailability = document.getElementById('product-availability');
    const productStatus = document.getElementById('product-status');
    const productType = document.getElementById('product-type');
    const productDescription = document.getElementById('product-description');
    const animationInput = document.getElementById('product-animation');
    const backgroundInput = document.getElementById('product-background');

    if (productName) productName.value = product.name;
    if (productPrice) productPrice.value = product.price;
    if (productAvailability) productAvailability.value = product.availability || '';
    if (productStatus) productStatus.value = product.status || 'Неуникальный';
    if (productType) productType.value = product.type || 'Подарок';
    if (productDescription) productDescription.value = product.description || '';
    if (animationInput) animationInput.value = '';
    if (backgroundInput) backgroundInput.value = '';

    const ribbonTextInput = document.getElementById('product-ribbon-text');
    const ribbonColorInput = document.getElementById('product-ribbon-color');
    const borderColorInput = document.getElementById('product-border-color');
    if (ribbonTextInput) ribbonTextInput.value = product.ribbonText || 'new';
    if (ribbonColorInput) ribbonColorInput.value = product.ribbonColor || '#0098EA';
    if (borderColorInput) borderColorInput.value = product.borderColor || '#0098EA';

    showAdminProductForm();
}

async function deleteProduct(productId) {
    if (confirm('Вы уверены, что хотите удалить этот товар?')) {
        try {
            const response = await fetch(`/api/products/${productId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    adminId: userProfile.id?.toString()
                })
            });

            const data = await response.json();

            if (data.success) {
                await loadProducts(); // Reload products from server
                renderAdminProductsList();
            } else {
                alert('Ошибка: ' + data.message);
            }
        } catch (error) {
            console.error('Failed to delete product:', error);
            alert('Произошла ошибка при удалении товара');
        }
    }
}

async function saveProduct() {
    const name = document.getElementById('product-name').value;
    const price = document.getElementById('product-price').value;
    const availability = document.getElementById('product-availability').value;
    const status = document.getElementById('product-status').value;
    const type = document.getElementById('product-type').value;
    const description = document.getElementById('product-description').value;
    const animationInput = document.getElementById('product-animation').files[0];
    const backgroundInput = document.getElementById('product-background').files[0];

    if (!name || !price) {
        alert('Пожалуйста, заполните название и цену товара');
        return;
    }

    const ribbonText = document.getElementById('product-ribbon-text').value;
    const ribbonColor = document.getElementById('product-ribbon-color').value;
    const borderColor = document.getElementById('product-border-color').value;

    const productData = {
        name: name,
        price: parseInt(price),
        availability: availability,
        status: status,
        type: type,
        description: description,
        ribbonText: ribbonText || 'new',
        ribbonColor: ribbonColor,
        borderColor: borderColor,
        adminId: userProfile.id?.toString()
    };

    // Handle files processing
    let filesToProcess = 0;
    let filesProcessed = 0;

    if (animationInput) filesToProcess++;
    if (backgroundInput) filesToProcess++;

    if (filesToProcess === 0) {
        // No files to process, save immediately
        await saveProductDataWithFiles(productData);
        return;
    }

    function checkAndSave() {
        filesProcessed++;
        if (filesProcessed === filesToProcess) {
            saveProductDataWithFiles(productData);
        }
    }

    // Handle animation file
    if (animationInput) {
        const reader = new FileReader();
        reader.onload = function(e) {
            productData.animationFile = {
                name: animationInput.name,
                data: e.target.result
            };
            checkAndSave();
        };
        reader.readAsDataURL(animationInput);
    }

    // Handle background file
    if (backgroundInput) {
        const reader = new FileReader();
        reader.onload = function(e) {
            productData.background = e.target.result;
            checkAndSave();
        };
        reader.readAsDataURL(backgroundInput);
    }
}

async function saveProductDataWithFiles(productData) {
    try {
        let response;

        if (editingProductId) {
            // Update existing product
            response = await fetch(`/api/products/${editingProductId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(productData)
            });
        } else {
            // Add new product
            response = await fetch('/api/products', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(productData)
            });
        }

        const data = await response.json();

        if (data.success) {
            await loadProducts(); // Reload products from server
            renderAdminProductsList();
            hideAdminProductForm();
            alert('Товар успешно сохранен!');
        } else {
            alert('Ошибка: ' + data.message);
        }
    } catch (error) {
        console.error('Failed to save product:', error);
        alert('Произошла ошибка при сохранении товара');
    }
}

// Users management functions
async function loadAndRenderUsers() {
    if (!userProfile.id || userProfile.id.toString() !== ADMIN_ID) return;

    try {
        const response = await fetch(`/api/admin/users?adminId=${userProfile.id}`);
        const data = await response.json();

        if (data.success) {
            renderUsersList(data.users);
        } else {
            console.error('Failed to load users:', data.message);
        }
    } catch (error) {
        console.error('Failed to load users:', error);
    }
}

function renderUsersList(users) {
    const usersList = document.getElementById('users-list');
    if (!usersList) return;

    usersList.innerHTML = '<h3 style="color: #FFFFFF; margin-bottom: 12px;">Пользователи:</h3>';

    if (users.length === 0) {
        usersList.innerHTML += '<p style="color: #787E82; text-align: center;">Пользователи не найдены</p>';
        return;
    }

    users.forEach(user => {
        const userItem = document.createElement('div');
        userItem.className = 'user-item';

        const createdDate = new Date(user.created_at).toLocaleDateString('ru-RU');

        userItem.innerHTML = `
            <div class="user-item-info">
                <div class="user-item-name">Пользователь #${user.user_number}</div>
                <div class="user-item-details">ID: ${user.id}</div>
                <div class="user-item-details">Username: ${user.username ? '@' + user.username : 'Не указан'}</div>
                <div class="user-item-details">IP адрес: ${user.ip_address || 'Не определен'}</div>
                <div class="user-item-details">Зарегистрирован: ${createdDate}</div>
                <div class="user-item-details">Рефералы: ${user.referrals_count}</div>
                <div class="user-item-balance">Баланс: ${user.balance.toFixed(2)} ⭐</div>
            </div>
            <div class="user-item-actions">
                <button class="give-balance-btn" onclick="showGiveBalanceModal('${user.id}', ${user.user_number})">Выдать баланс</button>
            </div>
        `;
        usersList.appendChild(userItem);
    });
}

let selectedUserId = null;
let selectedGiftForTransfer = null;

function showGiveBalanceModal(userId, userNumber) {
    selectedUserId = userId;
    const modal = document.getElementById('user-balance-modal');
    const userNameEl = document.getElementById('user-balance-modal-user-name');
    const amountInput = document.getElementById('user-balance-amount');

    if (modal && userNameEl && amountInput) {
        userNameEl.textContent = `Пользователь #${userNumber} (ID: ${userId})`;
        amountInput.value = '';
        modal.style.display = 'flex';
    }
}

function hideGiveBalanceModal() {
    const modal = document.getElementById('user-balance-modal');
    if (modal) {
        modal.style.display = 'none';
        selectedUserId = null;
    }
}

async function giveUserBalance() {
    if (!selectedUserId || !userProfile.id) return;

    const amountInput = document.getElementById('user-balance-amount');
    const amount = parseFloat(amountInput.value);

    if (!amount || amount <= 0) {
        alert('Пожалуйста, введите корректное количество звезд');
        return;
    }

    try {
        const response = await fetch(`/api/admin/users/${selectedUserId}/give-balance`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                amount: amount,
                adminId: userProfile.id.toString()
            })
        });

        const data = await response.json();

        if (data.success) {
            alert(`Успешно выдано ${amount} звезд пользователю!`);
            hideGiveBalanceModal();
            loadAndRenderUsers(); // Refresh users list
        } else {
            alert('Ошибка: ' + data.message);
        }
    } catch (error) {
        console.error('Failed to give balance:', error);
        alert('Произошла ошибка при выдаче баланса');
    }
}

// Gift transfer functionality
function renderGiftSelection() {
    const giftGrid = document.getElementById('gift-selection-grid');
    if (!giftGrid) return;

    giftGrid.innerHTML = '';

    products.forEach(product => {
        const giftCard = document.createElement('div');
        giftCard.className = 'gift-selection-card';
        giftCard.dataset.giftId = product.id;

        giftCard.innerHTML = `
            <div class="gift-selection-animation" id="gift-select-animation-${product.id}"></div>
            <div class="gift-selection-name">${product.name}</div>
            <div class="gift-selection-price">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <g clip-path="url(#clip0_1221_53)">
                        <path d="M5.25204 4.48403L7.17622 0.507863C7.24984 0.354872 7.36389 0.226152 7.50539 0.136363C7.64689 0.0465752 7.81014 -0.000670824 7.97656 7.19629e-06C8.14297 0.000685217 8.30586 0.04926 8.44665 0.140198C8.58745 0.231137 8.7005 0.360783 8.77293 0.514369L10.5892 4.35002C10.6608 4.50382 10.7693 4.63653 10.9044 4.73573C11.0396 4.83493 11.1971 4.8974 11.3622 4.91729L15.1649 5.3922C15.3431 5.41631 15.5112 5.49121 15.65 5.60839C15.7888 5.72556 15.8927 5.88031 15.95 6.05503C16.0072 6.22975 16.0155 6.41743 15.9739 6.59674C15.9322 6.77605 15.8424 6.93978 15.7145 7.06932L12.7063 10.1477C12.6458 10.2092 12.5999 10.2841 12.5721 10.3667C12.5444 10.4493 12.5356 10.5373 12.5464 10.6239L13.0478 14.7783C13.0839 15.0618 13.0091 15.3485 12.8398 15.5756C12.6705 15.8028 12.4204 15.9521 12.1441 15.991C11.9282 16.0203 11.7089 15.9779 11.5183 15.87L8.34266 14.0679C8.2299 14.0032 8.10317 13.9684 7.97396 13.9666C7.84475 13.9648 7.71714 13.996 7.60269 14.0575L4.30898 15.8114C4.19854 15.8695 4.0779 15.9045 3.95413 15.9142C3.83035 15.924 3.70592 15.9084 3.5881 15.8683C3.47029 15.8282 3.36145 15.7644 3.26794 15.6807C3.17444 15.597 3.09816 15.495 3.04354 15.3808C2.95447 15.201 2.92167 14.9974 2.94962 14.7979L3.21108 12.8891C3.34054 11.9563 3.89648 11.1457 4.70245 10.7176L8.35789 8.78157C8.40449 8.75583 8.43953 8.71255 8.45563 8.66086C8.47173 8.60917 8.46763 8.55309 8.4442 8.50443C8.42603 8.46626 8.3967 8.43485 8.36031 8.41456C8.32391 8.39428 8.28225 8.38612 8.24112 8.39124L3.76828 9.0587C3.42938 9.10822 3.08411 9.08448 2.75469 8.98903C2.42527 8.89357 2.11898 8.7285 1.85552 8.50443L0.367962 7.24366C0.163022 7.06833 0.0329532 6.8179 0.00545299 6.54572C-0.0220472 6.27354 0.0551943 6.0011 0.220729 5.78643C0.381913 5.5816 0.613597 5.44795 0.868046 5.41301L4.68468 4.90559C4.80565 4.88818 4.92062 4.84066 5.01952 4.76717C5.11843 4.69368 5.19826 4.59646 5.25204 4.48403Z" fill="#787E82"></path>
                    </g>
                    <defs>
                        <linearGradient id="paint0_linear_1221_53" x1="0" y1="0" x2="16" y2="16" gradientUnits="userSpaceOnUse">
                            <stop stop-color="#FDD21A"></stop>
                            <stop offset="1" stop-color="#E47B03"></stop>
                        </linearGradient>
                        <clipPath id="clip0_1221_53">
                            <rect width="16" height="16" fill="white"></rect>
                        </clipPath>
                    </defs>
                </svg>
                ${product.price}
            </div>
        `;

        giftCard.addEventListener('click', function() {
            selectGiftForTransfer(product);
        });

        giftGrid.appendChild(giftCard);

        // Load gift animation
        setTimeout(() => {
            loadGiftSelectionAnimation(product.id, product.animation);
        }, 100);
    });

    // Reset selection
    selectedGiftForTransfer = null;
    updateTransferButton();
}

async function loadGiftSelectionAnimation(giftId, animationPath) {
    const container = document.getElementById(`gift-select-animation-${giftId}`);
    if (!container) return;

    try {
        let fullPath = animationPath;
        if (!fullPath.startsWith('/')) {
            fullPath = '/' + fullPath;
        }

        const response = await fetch(fullPath);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const tgsBuffer = await response.arrayBuffer();

        try {
            const decompressed = pako.inflate(new Uint8Array(tgsBuffer), { to: 'string' });
            const animationData = JSON.parse(decompressed);

            container.innerHTML = '';
            const animElement = document.createElement('div');
            animElement.style.width = '60px';
            animElement.style.height = '60px';
            container.appendChild(animElement);

            const animation = lottie.loadAnimation({
                container: animElement,
                renderer: 'svg',
                loop: true,
                autoplay: true,
                animationData: animationData
            });

        } catch (decompressError) {
            const jsonString = new TextDecoder().decode(tgsBuffer);
            const animationData = JSON.parse(jsonString);

            container.innerHTML = '';
            const animElement = document.createElement('div');
            animElement.style.width = '60px';
            animElement.style.height = '60px';
            container.appendChild(animElement);

            const animation = lottie.loadAnimation({
                container: animElement,
                renderer: 'svg',
                loop: true,
                autoplay: true,
                animationData: animationData
            });
        }

    } catch (error) {
        console.error(`Gift selection animation loading failed for ${giftId}:`, error);
        container.innerHTML = '<div style="width: 60px; height: 60px; background: #444; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #888; font-size: 10px;">❌</div>';
    }
}

function selectGiftForTransfer(gift) {
    // Remove previous selection
    const allCards = document.querySelectorAll('.gift-selection-card');
    allCards.forEach(card => card.classList.remove('selected'));

    // Add selection to clicked card
    const selectedCard = document.querySelector(`[data-gift-id="${gift.id}"]`);
    if (selectedCard) {
        selectedCard.classList.add('selected');
    }

    selectedGiftForTransfer = gift;
    updateTransferButton();
}

function updateTransferButton() {
    const transferBtn = document.getElementById('transfer-gift-btn');
    const userIdInput = document.getElementById('gift-user-id');

    if (transferBtn && userIdInput) {
        const hasUserId = userIdInput.value.trim().length > 0;
        const hasGift = selectedGiftForTransfer !== null;

        transferBtn.disabled = !(hasUserId && hasGift);
    }
}

function showGiftTransferModal() {
    const userIdInput = document.getElementById('gift-user-id');
    const commentInput = document.getElementById('gift-comment');

    if (!selectedGiftForTransfer || !userIdInput.value.trim()) {
        alert('Выберите подарок и введите ID пользователя');
        return;
    }

    const modal = document.getElementById('gift-transfer-modal');
    const confirmGiftName = document.getElementById('confirm-gift-name');
    const confirmUserId = document.getElementById('confirm-user-id');
    const confirmComment = document.getElementById('confirm-comment');
    const transferGiftPreview = document.getElementById('transfer-gift-preview');

    if (modal && confirmGiftName && confirmUserId && confirmComment && transferGiftPreview) {
        confirmGiftName.textContent = selectedGiftForTransfer.name;
        confirmUserId.textContent = userIdInput.value.trim();
        confirmComment.textContent = commentInput.value.trim() || 'Без комментария';

        // Show gift preview
        transferGiftPreview.innerHTML = `
            <div style="width: 80px; height: 80px; background: #262E38; border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                <div id="transfer-preview-animation-${selectedGiftForTransfer.id}"></div>
            </div>
        `;

        // Load preview animation
        setTimeout(() => {
            loadTransferPreviewAnimation(selectedGiftForTransfer.id, selectedGiftForTransfer.animation);
        }, 100);

        modal.style.display = 'flex';
    }
}

async function loadTransferPreviewAnimation(giftId, animationPath) {
    const container = document.getElementById(`transfer-preview-animation-${giftId}`);
    if (!container) return;

    try {
        let fullPath = animationPath;
        if (!fullPath.startsWith('/')) {
            fullPath = '/' + fullPath;
        }

        const response = await fetch(fullPath);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const tgsBuffer = await response.arrayBuffer();

        try {
            const decompressed = pako.inflate(new Uint8Array(tgsBuffer), { to: 'string' });
            const animationData = JSON.parse(decompressed);

            container.innerHTML = '';
            const animElement = document.createElement('div');
            animElement.style.width = '60px';
            animElement.style.height = '60px';
            container.appendChild(animElement);

            const animation = lottie.loadAnimation({
                container: animElement,
                renderer: 'svg',
                loop: true,
                autoplay: true,
                animationData: animationData
            });

        } catch (decompressError) {
            const jsonString = new TextDecoder().decode(tgsBuffer);
            const animationData = JSON.parse(jsonString);

            container.innerHTML = '';
            const animElement = document.createElement('div');
            animElement.style.width = '60px';
            animElement.style.height = '60px';
            container.appendChild(animElement);

            const animation = lottie.loadAnimation({
                container: animElement,
                renderer: 'svg',
                loop: true,
                autoplay: true,
                animationData: animationData
            });
        }

    } catch (error) {
        console.error(`Transfer preview animation loading failed for ${giftId}:`, error);
        container.innerHTML = '<div style="width: 60px; height: 60px; background: #444; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: #888; font-size: 10px;">❌</div>';
    }
}

function hideGiftTransferModal() {
    const modal = document.getElementById('gift-transfer-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

async function confirmGiftTransfer() {
    const userIdInput = document.getElementById('gift-user-id');
    const commentInput = document.getElementById('gift-comment');

    if (!selectedGiftForTransfer || !userIdInput.value.trim()) {
        alert('Ошибка: данные для передачи не найдены');
        return;
    }

    try {
        const response = await fetch('/api/admin/transfer-gift', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                adminId: userProfile.id?.toString(),
                userId: userIdInput.value.trim(),
                giftId: selectedGiftForTransfer.id,
                comment: commentInput.value.trim() || ''
            })
        });

        const data = await response.json();

        if (data.success) {
            // Hide modal first
            hideGiftTransferModal();

            // Trigger confetti animation
            setTimeout(() => {
                console.log('Starting confetti animation for gift transfer...');
                runConfetti();
            }, 300);

            // Show success message after confetti
            setTimeout(() => {
                alert(`🎉 Подарок "${selectedGiftForTransfer.name}" успешно передан пользователю ${userIdInput.value.trim()}!`);
            }, 800);

            // Reset form
            userIdInput.value = '';
            commentInput.value = '';
            selectedGiftForTransfer = null;
            renderGiftSelection();
        } else {
            alert('Ошибка: ' + data.message);
        }
    } catch (error) {
        console.error('Failed to transfer gift:', error);
        alert('Произошла ошибка при передаче подарка');
    }
}

// Confetti animation function
function runConfetti() {
    console.log('runConfetti called');

    // Check if confetti library is loaded
    if (typeof confetti === 'undefined') {
        console.error('Confetti library not loaded');
        return;
    }

    try {
        console.log('Running confetti animation');

        // Левый мощный поток
        confetti({
            particleCount: 400,
            spread: 90,
            startVelocity: 65,
            origin: { x: 0, y: 0.5 },
            colors: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#FF9FF3']
        });

        // Правый мощный поток
        confetti({
            particleCount: 400,
            spread: 90,
            startVelocity: 65,
            origin: { x: 1, y: 0.5 },
            colors: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#FF9FF3']
        });

        // Центральный взрыв
        confetti({
            particleCount: 300,
            spread: 120,
            startVelocity: 55,
            origin: { x: 0.5, y: 0.4 },
            colors: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#FF9FF3']
        });

        console.log('Confetti animation completed successfully');
    } catch (error) {
        console.error('Confetti animation failed:', error);
    }
}

// Track if confetti should be triggered when switching to inventory
let shouldTriggerConfetti = false;

// Function to mark that confetti should be triggered
function markConfettiForInventory() {
    shouldTriggerConfetti = true;
    console.log('Marked confetti to trigger on inventory switch');
}

// Purchase functionality
async function buyProduct(productId) {
    if (!userProfile.id || !currentProduct) {
        console.error('Missing user profile or current product');
        return;
    }

    try {
        console.log('Starting purchase process for product:', productId);

        const response = await fetch(`/api/products/${productId}/buy`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId: userProfile.id.toString()
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Purchase response:', data);

        if (data.success) {
            console.log('Purchase successful!');

            // Update user balance
            userProfile.balance = data.newBalance;
            updateUserProfile();

            // Hide product modal
            hideProductModal();

            // Mark that confetti should trigger when switching to inventory
            markConfettiForInventory();

            // Switch to inventory section
            showSection('inventory');

            // Reload inventory to show new purchase
            await loadUserInventory();

            // Show success message
            setTimeout(() => {
                const successMessage = `🎉 Поздравляем! Вы купили ${data.product?.name || currentProduct.name}!`;

                if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.showAlert) {
                    window.Telegram.WebApp.showAlert(successMessage);
                } else {
                    alert(successMessage);
                }
            }, 1200);

        } else {
            // Handle purchase failure with better error messages
            let errorMessage = data.message || 'Неизвестная ошибка при покупке';
            if (data.required && data.current !== undefined) {
                errorMessage = `Недостаточно звезд! Нужно: ${data.required}, у вас: ${data.current.toFixed(2)}`;
            }

            console.log('Purchase failed:', errorMessage);

            if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.showAlert) {
                window.Telegram.WebApp.showAlert(errorMessage);
            } else {
                alert(errorMessage);
            }
        }
    } catch (error) {
        console.log('Purchase request failed:', error);

        const errorMessage = 'Успешно';

        if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.showAlert) {
            window.Telegram.WebApp.showAlert(errorMessage);
        } else {
            alert(errorMessage);
        }
    }
}

// Load user inventory
async function loadUserInventory() {
    if (!userProfile.id) return;

    try {
        const response = await fetch(`/api/user/${userProfile.id}/inventory`);
        const data = await response.json();

        if (data.success) {
            renderUserInventory(data.inventory);
        }
    } catch (error) {
        console.error('Failed to load inventory:', error);
    }
}

// Render user inventory
function renderUserInventory(inventory) {
    const inventorySection = document.querySelector('.inventory-section');
    if (!inventorySection) return;

    // Remove existing content except title
    const title = inventorySection.querySelector('.inventory-title');
    inventorySection.innerHTML = '';
    if (title) inventorySection.appendChild(title);

    if (inventory.length === 0) {
        // Show empty state
        inventorySection.innerHTML += `
            <div class="tgs-animation" id="tgs-container"></div>
            <div class="no-gifts-text">Подарков пока нету!</div>
            <div class="send-gift-text"> <a href="https://t.me/XCase_relayer" class="username-link"></a></div>
            <button class="action-button cases-button" data-action="case">
                Глaвная
                <img src="case.svg" alt="Главная" class="button-icon">
            </button>
            <button class="action-button profile-button" data-action="profile">
                Профиль
                <img src="profile.svg" alt="Профиль" class="button-icon">
            </button>
        `;

        // Reload TGS animation for empty state
        loadTgsAnimation();

        // Re-add button event listeners
        const actionButtons = inventorySection.querySelectorAll('.action-button');
        actionButtons.forEach(button => {
            button.addEventListener('click', function() {
                if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
                    try {
                        window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
                    } catch (error) {
                        console.log('Haptic feedback not supported:', error);
                    }
                }

                const action = this.dataset.action;
                let sectionName = action;
                if (action === 'cases') {
                    sectionName = 'case';
                }

                showSection(sectionName);
            });
        });
    } else {
        // Show inventory gifts
        const inventoryGifts = document.createElement('div');
        inventoryGifts.className = 'inventory-gifts';

        inventory.forEach(gift => {
            const giftCard = document.createElement('div');
            giftCard.className = 'inventory-gift-card';

            giftCard.innerHTML = `
                <div class="inventory-gift-card-content">
                    <div class="inventory-gift-animation-wrapper">
                        <div class="inventory-gift-animation-aspect-ratio"></div>
                        <div class="inventory-gift-animation-content">
                            <div class="inventory-gift-animation" id="inventory-gift-${gift.purchaseId}"></div>
                        </div>
                    </div>
                    <div class="inventory-gift-price-container">
                        <div class="inventory-gift-price-chip">
                            <img src="srr.svg" alt="Stars" class="inventory-gift-price-star-icon">
                            <span class="inventory-gift-price">${gift.price}</span>
                        </div>
                    </div>
                </div>
            `;

            if (gift.background) {
                const bgElement = giftCard.querySelector('.inventory-gift-animation-content');
                bgElement.style.backgroundImage = `url(${gift.background})`;
                bgElement.style.backgroundSize = 'cover';
                bgElement.style.backgroundPosition = 'center';
            }

            // Add click handler to show inventory gift modal
            giftCard.addEventListener('click', function() {
                if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
                    try {
                        window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
                    } catch (error) {
                        console.log('Haptic feedback not supported:', error);
                    }
                }
                showInventoryGiftModal(gift);
            });

            inventoryGifts.appendChild(giftCard);

            // Load gift animation
            setTimeout(() => {
                loadInventoryGiftAnimation(gift.purchaseId, gift.animation);
            }, 100);
        });

        inventorySection.appendChild(inventoryGifts);
    }
}

// Store inventory animations and their states
const inventoryAnimations = {};

// Load inventory gift animation
async function loadInventoryGiftAnimation(giftId, animationPath) {
    const container = document.getElementById(`inventory-gift-${giftId}`);
    if (!container) return;

    try {
        let fullPath = animationPath;
        if (!fullPath.startsWith('/')) {
            fullPath = '/' + fullPath;
        }

        const response = await fetch(fullPath);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const tgsBuffer = await response.arrayBuffer();

        try {
            const decompressed = pako.inflate(new Uint8Array(tgsBuffer), { to: 'string' });
            const animationData = JSON.parse(decompressed);

            container.innerHTML = '';
            const animElement = document.createElement('div');
            animElement.style.width = '100px';
            animElement.style.height = '100px';
            animElement.style.cursor = 'pointer';
            animElement.style.display = 'flex';
            animElement.style.alignItems = 'center';
            animElement.style.justifyContent = 'center';
            container.appendChild(animElement);

            const animation = lottie.loadAnimation({
                container: animElement,
                renderer: 'svg',
                loop: false,
                autoplay: true,
                animationData: animationData
            });

            // Store animation reference and state
            inventoryAnimations[giftId] = {
                animation: animation,
                isPlaying: true,
                canPlay: false,
                isLoaded: true
            };

            // Handle animation completion
            animation.addEventListener('complete', function() {
                inventoryAnimations[giftId].isPlaying = false;
                inventoryAnimations[giftId].canPlay = true;
                console.log(`Inventory animation ${giftId} completed, ready for replay`);
            });

            // Add click handler for replay
            animElement.addEventListener('click', function(e) {
                e.stopPropagation();
                replayInventoryAnimation(giftId);
            });

            console.log(`Inventory animation loaded and started for ${giftId}`);

        } catch (decompressError) {
            const jsonString = new TextDecoder().decode(tgsBuffer);
            const animationData = JSON.parse(jsonString);

            container.innerHTML = '';
            const animElement = document.createElement('div');
            animElement.style.width = '100px';
            animElement.style.height = '100px';
            animElement.style.cursor = 'pointer';
            animElement.style.display = 'flex';
            animElement.style.alignItems = 'center';
            animElement.style.justifyContent = 'center';
            container.appendChild(animElement);

            const animation = lottie.loadAnimation({
                container: animElement,
                renderer: 'svg',
                loop: false,
                autoplay: true,
                animationData: animationData
            });

            // Store animation reference and state
            inventoryAnimations[giftId] = {
                animation: animation,
                isPlaying: true,
                canPlay: false,
                isLoaded: true
            };

            // Handle animation completion
            animation.addEventListener('complete', function() {
                inventoryAnimations[giftId].isPlaying = false;
                inventoryAnimations[giftId].canPlay = true;
                console.log(`Inventory animation ${giftId} completed, ready for replay`);
            });

            // Add click handler for replay
            animElement.addEventListener('click', function(e) {
                e.stopPropagation();
                replayInventoryAnimation(giftId);
            });

            console.log(`Inventory animation loaded and started for ${giftId}`);
        }

    } catch (error) {
        console.error(`Inventory gift animation loading failed for ${giftId}:`, error);
        container.innerHTML = '<div style="width: 80px; height: 80px; background: #444; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #888; font-size: 10px;">Анимация недоступна</div>';
    }
}

function replayInventoryAnimation(giftId) {
    const animData = inventoryAnimations[giftId];
    if (!animData || !animData.canPlay || animData.isPlaying) {
        console.log(`Inventory animation ${giftId} cannot be replayed right now`);
        return;
    }

    // Add haptic feedback if available
    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
        try {
            window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
        } catch (error) {
            console.log('Haptic feedback not supported:', error);
        }
    }

    animData.isPlaying = true;
    animData.canPlay = false;
    animData.animation.goToAndStop(0);
    animData.animation.play();

    console.log(`Replaying inventory animation ${giftId}`);
}

function replayAllInventoryAnimations() {
    Object.keys(inventoryAnimations).forEach(giftId => {
        const animData = inventoryAnimations[giftId];
        if (animData && animData.animation && animData.isLoaded && animData.canPlay) {
            animData.isPlaying = true;
            animData.canPlay = false;
            animData.animation.goToAndStop(0);
            animData.animation.play();
        }
    });
    console.log('All inventory animations replayed');
}

// Inventory Gift Modal event handlers
    const inventoryGiftModalClose = document.getElementById('inventory-gift-modal-close');
    const inventoryGiftUpgradeBtn = document.querySelector('.inventory-gift-upgrade-btn');
    const inventoryGiftSendBtn = document.querySelector('.inventory-gift-send-btn');

    if (inventoryGiftModalClose) {
        inventoryGiftModalClose.addEventListener('click', function() {
            if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
                try {
                    window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
                } catch (error) {
                    console.log('Haptic feedback not supported:', error);
                }
            }
            hideInventoryGiftModal();
        });
    }

    if (inventoryGiftUpgradeBtn) {
        inventoryGiftUpgradeBtn.addEventListener('click', function() {
            if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
                try {
                    window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
                } catch (error) {
                    console.log('Haptic feedback not supported:', error);
                }
            }
            upgradeInventoryGift();
        });
    }

    if (inventoryGiftSendBtn) {
        inventoryGiftSendBtn.addEventListener('click', function() {
            if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
                try {
                    window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
                } catch (error) {
                    console.log('Haptic feedback not supported:', error);
                }
            }
            showGiftTransferFromInventory();
        });
    }

    // Inventory Gift Modal functionality
function showInventoryGiftModal(gift) {
    const modal = document.getElementById('inventory-gift-modal');
    if (!modal) return;

    // Update modal content
    const giftName = document.getElementById('inventory-gift-name');
    const giftId = document.getElementById('inventory-gift-id');
    const giftImage = document.getElementById('inventory-gift-image');

    if (giftName) giftName.textContent = gift.name;
    if (giftId) giftId.textContent = `#${gift.purchaseId}`;

    // Set placeholder image (you can update this with actual gift images)
    if (giftImage) {
        giftImage.src = `https://via.placeholder.com/260x260/262E38/FFFFFF?text=${encodeURIComponent(gift.name)}`;
        giftImage.alt = gift.name;
    }

    // Load gift animation in modal
    loadInventoryGiftModalAnimation(gift.animation, gift.purchaseId);

    // Set background if gift is upgraded
    const backgroundElement = document.getElementById('inventory-gift-background');
    if (backgroundElement) {
        if (gift.upgraded && gift.upgradeBackground) {
            backgroundElement.style.backgroundImage = `url(${gift.upgradeBackground})`;
        } else {
            backgroundElement.style.backgroundImage = 'none';
            backgroundElement.style.background = 'linear-gradient(135deg, #0098EA 0%, #0082CC 100%)';
        }
    }

    // Update table with purchase information
    updateInventoryGiftTable(gift);

    // Store current gift in modal for the send button
    window.currentGiftInModal = gift;

    // Show modal
    modal.classList.add('active');

    console.log('Inventory gift modal opened for:', gift.name);
}

async function loadInventoryGiftModalAnimation(animationPath, giftId) {
    const container = document.getElementById('inventory-gift-animation-large');
    if (!container) return;

    try {
        let fullPath = animationPath;
        if (!fullPath.startsWith('/')) {
            fullPath = '/' + fullPath;
        }

        const response = await fetch(fullPath);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const tgsBuffer = await response.arrayBuffer();

        try {
            const decompressed = pako.inflate(new Uint8Array(tgsBuffer), { to: 'string' });
            const animationData = JSON.parse(decompressed);

            container.innerHTML = '';
            const animElement = document.createElement('div');
            animElement.style.width = '120px';
            animElement.style.height = '120px';
            container.appendChild(animElement);

            const animation = lottie.loadAnimation({
                container: animElement,
                renderer: 'svg',
                loop: false,
                autoplay: true,
                animationData: animationData
            });

            console.log(`Inventory modal animation loaded for ${giftId}`);

        } catch (decompressError) {
            const jsonString = new TextDecoder().decode(tgsBuffer);
            const animationData = JSON.parse(jsonString);

            container.innerHTML = '';
            const animElement = document.createElement('div');
            animElement.style.width = '120px';
            animElement.style.height = '120px';
            container.appendChild(animElement);

            const animation = lottie.loadAnimation({
                container: animElement,
                renderer: 'svg',
                loop: false,
                autoplay: true,
                animationData: animationData
            });

            console.log(`Inventory modal animation loaded for ${giftId}`);
        }

    } catch (error) {
        console.error(`Inventory modal animation loading failed for ${giftId}:`, error);
        container.innerHTML = '<div style="width: 120px; height: 120px; background: #444; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: #888; font-size: 14px;">🎁</div>';
    }
}

function updateInventoryGiftTable(gift) {
    const table = document.querySelector('.inventory-gift-table tbody');
    if (!table) return;

    if (gift.upgraded) {
        // Show upgraded table with all possible upgrades
        let upgradeRows = '';

        // Always show model, background, symbol
        upgradeRows += `
            <tr style="display: table-row;">
                <td class="inventory-gift-table-label">модель</td>
                <td class="inventory-gift-table-value">
                    <span class="inventory-gift-model">${gift.model || 'Не указано'}</span>
                    <div class="inventory-gift-percentage">${gift.modelPercent || '0%'}</div>
                </td>
            </tr>
            <tr style="display: table-row;">
                <td class="inventory-gift-table-label">фон</td>
                <td class="inventory-gift-table-value">
                    <span class="inventory-gift-model">${gift.background || 'Не указано'}</span>
                    <div class="inventory-gift-percentage">${gift.backgroundPercent || '0%'}</div>
                </td>
            </tr>
            <tr style="display: table-row;">
                <td class="inventory-gift-table-label">символ</td>
                <td class="inventory-gift-table-value">
                    <span class="inventory-gift-model">${gift.symbol || 'Не указано'}</span>
                    <div class="inventory-gift-percentage">${gift.symbolPercent || '0%'}</div>
                </td>
            </tr>
        `;

        table.innerHTML = upgradeRows;
    } else {
        // Show normal table
        const purchaseDate = new Date(gift.purchaseTime);
        const timeString = purchaseDate.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });

        table.innerHTML = `
            <tr style="display: table-row;">
                <td class="inventory-gift-table-label">дата покупки</td>
                <td class="inventory-gift-table-value">
                    <span class="inventory-gift-model">${timeString}</span>
                </td>
            </tr>
            <tr style="display: table-row;">
                <td class="inventory-gift-table-label">статус</td>
                <td class="inventory-gift-table-value">
                    <span class="inventory-gift-model">${gift.status || 'Неуникальный'}</span>
                </td>
            </tr>
            <tr style="display: table-row;">
                <td class="inventory-gift-table-label">наличие</td>
                <td class="inventory-gift-table-value">
                    <span class="inventory-gift-model">${gift.availability || '800 из 43343'}</span>
                </td>
            </tr>
        `;
    }
}



function hideInventoryGiftModal() {
    const modal = document.getElementById('inventory-gift-modal');
    if (modal) {
        modal.classList.remove('active');
        window.currentGiftInModal = null; // Clear the stored gift
        console.log('Inventory gift modal closed');
    }
}

async function upgradeInventoryGift() {
    if (!window.currentGiftInModal || !userProfile.id) {
        console.error('No gift selected for upgrade');
        return;
    }

    try {
        const response = await fetch('/api/upgrade-gift', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId: userProfile.id.toString(),
                giftPurchaseId: window.currentGiftInModal.purchaseId
            })
        });

        const data = await response.json();

        if (data.success) {
            // Update user balance
            userProfile.balance = data.newBalance;
            updateUserProfile();

            // Show success message
            if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.showAlert) {
                window.Telegram.WebApp.showAlert(`🎨 Подарок "${window.currentGiftInModal.name}" успешно улучшен!`);
            } else {
                alert(`🎨 Подарок "${window.currentGiftInModal.name}" успешно улучшен!`);
            }

            // Trigger confetti
            setTimeout(() => {
                runConfetti();
            }, 300);

            // Hide modal and reload inventory
            hideInventoryGiftModal();
            await loadUserInventory();

        } else {
            // Show error message
            let errorMessage = data.message || 'Не удалось улучшить подарок';

            if (data.needTopUp) {
                errorMessage = `Недостаточно звезд для улучшения! Нужно: ${data.required}, у вас: ${data.current.toFixed(2)}`;
            }

            if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.showAlert) {
                window.Telegram.WebApp.showAlert(errorMessage);
            } else {
                alert(errorMessage);
            }
        }
    } catch (error) {
        console.error('Failed to upgrade gift:', error);
        if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.showAlert) {
            window.Telegram.WebApp.showAlert('Произошла ошибка при улучшении подарка');
        } else {
            alert('Произошла ошибка при улучшении подарка');
        }
    }
}

// Gift transfer from inventory modal
function showGiftTransferFromInventory() {
    if (!window.currentGiftInModal) return;

    // Get gift transfer modal elements
    const transferModal = document.getElementById('gift-transfer-modal');
    const transferTitle = document.getElementById('gift-transfer-title');
    const transferAnimation = document.getElementById('gift-transfer-animation');
    const transferUserIdInput = document.getElementById('gift-transfer-user-id');

    if (transferModal && transferTitle) {
        // Update modal content with current gift
        transferTitle.textContent = window.currentGiftInModal.name;

        // Clear previous input
        if (transferUserIdInput) {
            transferUserIdInput.value = '';
        }

        // Load animation for the gift in transfer modal
        if (transferAnimation) {
            loadGiftTransferAnimation(window.currentGiftInModal.animation);
        }

        // Hide inventory modal first, then show transfer modal
        const inventoryModal = document.getElementById('inventory-gift-modal');
        if (inventoryModal) {
            inventoryModal.classList.remove('active');
        }

        // Show transfer modal with a small delay to ensure smooth transition
        setTimeout(() => {
            transferModal.classList.add('active');
            console.log('Gift transfer modal opened for:', window.currentGiftInModal.name);
        }, 100);
    }
}

async function loadGiftTransferAnimation(animationPath) {
    const container = document.getElementById('gift-transfer-animation');
    if (!container) return;

    try {
        let fullPath = animationPath;
        if (!fullPath.startsWith('/')) {
            fullPath = '/' + fullPath;
        }

        const response = await fetch(fullPath);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const tgsBuffer = await response.arrayBuffer();

        try {
            const decompressed = pako.inflate(new Uint8Array(tgsBuffer), { to: 'string' });
            const animationData = JSON.parse(decompressed);

            container.innerHTML = '';
            const animElement = document.createElement('div');
            animElement.style.width = '100px';
            animElement.style.height = '100px';
            container.appendChild(animElement);

            const animation = lottie.loadAnimation({
                container: animElement,
                renderer: 'svg',
                loop: true,
                autoplay: true,
                animationData: animationData
            });

            console.log('Gift transfer animation loaded successfully');

        } catch (decompressError) {
            const jsonString = new TextDecoder().decode(tgsBuffer);
            const animationData = JSON.parse(jsonString);

            container.innerHTML = '';
            const animElement = document.createElement('div');
            animElement.style.width = '100px';
            animElement.style.height = '100px';
            container.appendChild(animElement);

            const animation = lottie.loadAnimation({
                container: animElement,
                renderer: 'svg',
                loop: true,
                autoplay: true,
                animationData: animationData
            });

            console.log('Gift transfer animation loaded successfully');
        }

    } catch (error) {
        console.error('Gift transfer animation loading failed:', error);
        container.innerHTML = '<div style="width: 100px; height: 100px; background: #444; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: #888; font-size: 12px;">🎁</div>';
    }
}

function hideGiftTransferModal() {
    const transferModal = document.getElementById('gift-transfer-modal');
    if (transferModal) {
        transferModal.classList.remove('active');
        console.log('Gift transfer modal closed');

        // If we came from inventory modal and have a current gift, return to inventory modal
        if (window.currentGiftInModal) {
            setTimeout(() => {
                const inventoryModal = document.getElementById('inventory-gift-modal');
                if (inventoryModal) {
                    inventoryModal.classList.add('active');
                }
            }, 100);
        }
    }
}

async function sendGiftTransfer(event) {
    // Предотвращаем стандартное поведение формы
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }

    const transferUserIdInput = document.getElementById('gift-transfer-user-id');
    if (!transferUserIdInput || !window.currentGiftInModal) return;

    const recipientId = transferUserIdInput.value.trim();
    if (!recipientId) {
        if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.showAlert) {
            window.Telegram.WebApp.showAlert('Введите ID пользователя');
        } else {
            alert('Введите ID пользователя');
        }
        return;
    }

    // Проверяем, что пользователь не пытается отправить подарок самому себе
    if (recipientId === userProfile.id?.toString()) {
        if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.showAlert) {
            window.Telegram.WebApp.showAlert('Нельзя отправить подарок самому себе');
        } else {
            alert('Нельзя отправить подарок самому себе');
        }
        return;
    }

    try {
        // Используем новый API для передачи подарка между пользователями
        const response = await fetch('/api/transfer-gift', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                fromUserId: userProfile.id?.toString(),
                toUserId: recipientId,
                giftPurchaseId: window.currentGiftInModal.purchaseId,
                comment: `Подарок от пользователя ${userProfile.id}`
            })
        });

        const data = await response.json();

        if (data.success) {
            // Показываем успешное сообщение
            if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.showAlert) {
                window.Telegram.WebApp.showAlert(`🎉 Подарок "${window.currentGiftInModal.name}" успешно отправлен пользователю ${recipientId}!`);
            } else {
                alert(`🎉 Подарок "${window.currentGiftInModal.name}" успешно отправлен пользователю ${recipientId}!`);
            }

            // Запускаем конфетти
            setTimeout(() => {
                runConfetti();
            }, 300);

            // Скрываем модальное окно передачи подарка
            const transferModal = document.getElementById('gift-transfer-modal');
            if (transferModal) {
                transferModal.classList.remove('active');
            }

            // Очищаем данные
            window.currentGiftInModal = null;

            // Обновляем инвентарь пользователя
            await loadUserInventory();

        } else {
            // Показываем ошибку
            if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.showAlert) {
                window.Telegram.WebApp.showAlert('Ошибка: ' + (data.message || 'Не удалось отправить подарок'));
            } else {
                alert('Ошибка: ' + (data.message || 'Не удалось отправить подарок'));
            }
        }

    } catch (error) {
        console.error('Failed to transfer gift:', error);
        if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.showAlert) {
            window.Telegram.WebApp.showAlert('Произошла ошибка при отправке подарка');
        } else {
            alert('Произошла ошибка при отправке подарка');
        }
    }
}

// Product modal functionality
let currentProduct = null;

function showProductModal(product) {
    const productModal = document.getElementById('product-modal');
    if (!productModal) return;

    currentProduct = product;

    // Update modal content
    document.getElementById('product-modal-title').textContent = product.name;
    document.getElementById('product-modal-description').textContent = product.description || 'This gift will soon be available for upgrade, sale and mint as NFT';
    document.getElementById('product-modal-price').textContent = product.price;
    document.getElementById('product-modal-availability').textContent = product.availability || '1500 из 5000';
    document.getElementById('product-modal-status').textContent = product.status || 'Неуникальный';
    document.getElementById('product-modal-type').textContent = product.type || 'Подарок';
    document.getElementById('product-buy-price').textContent = product.price;

    // Load product animation in modal
    loadProductModalAnimation(product.id, product.animation);

    productModal.classList.add('active');
}

function hideProductModal() {
    const productModal = document.getElementById('product-modal');
    if (productModal) {
        productModal.classList.remove('active');
        currentProduct = null;
    }
}

async function loadProductModalAnimation(productId, animationPath) {
    const container = document.getElementById('product-modal-animation');
    if (!container) return;

    try {
        console.log(`Loading product modal animation for ${productId}...`);

        // Ensure the path starts with / for absolute paths
        let fullPath = animationPath;
        if (!fullPath.startsWith('/')) {
            fullPath = '/' + fullPath;
        }

        const response = await fetch(fullPath);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const tgsBuffer = await response.arrayBuffer();
        console.log(`Product modal TGS file loaded for ${productId}, size:`, tgsBuffer.byteLength);

        // Try to decompress as gzipped JSON first
        try {
            const decompressed = pako.inflate(new Uint8Array(tgsBuffer), { to: 'string' });
            const animationData = JSON.parse(decompressed);

            console.log(`Product modal TGS decompressed successfully for ${productId}`);

            container.innerHTML = '';
            const animElement = document.createElement('div');
            animElement.style.width = '160px';
            animElement.style.height = '160px';
            container.appendChild(animElement);

            const animation = lottie.loadAnimation({
                container: animElement,
                renderer: 'svg',
                loop: false,
                autoplay: true,
                animationData: animationData
            });

            console.log(`Product modal TGS animation loaded successfully for ${productId}`);
        } catch (decompressError) {
            console.log(`Decompression failed for ${productId}, trying as raw JSON:`, decompressError);

            // If decompression fails, try to parse as raw JSON
            try {
                const jsonString = new TextDecoder().decode(tgsBuffer);
                const animationData = JSON.parse(jsonString);

                console.log(`Product modal raw JSON loaded successfully for ${productId}`);

                container.innerHTML = '';
                const animElement = document.createElement('div');
                animElement.style.width = '180px';
                animElement.style.height = '180px';
                container.appendChild(animElement);

                const animation = lottie.loadAnimation({
                    container: animElement,
                    renderer: 'svg',
                    loop: false,
                    autoplay: true,
                    animationData: animationData
                });

                console.log(`Product modal JSON animation loaded successfully for ${productId}`);
            } catch (jsonError) {
                console.error(`Failed to parse as JSON for ${productId}:`, jsonError);
                throw jsonError;
            }
        }

    } catch (error) {
        console.error(`Product modal TGS loading failed for ${productId}:`, error);

        // Fallback: show a placeholder or default animation
        container.innerHTML = '<div style="width: 160px; height: 160px; background: #444; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #888; font-size: 14px;">Анимация недоступна</div>';
    }
}

// Balance top-up functionality
let selectedBalanceAmount = null;

function showBalanceModal() {
    const balanceModal = document.getElementById('balance-modal');
    if (balanceModal) {
        balanceModal.classList.add('active');
        selectedBalanceAmount = null;
        updateBalanceConfirmButton();
        clearBalanceSelection();
    }
}

function hideBalanceModal() {
    const balanceModal = document.getElementById('balance-modal');
    if (balanceModal) {
        balanceModal.classList.remove('active');
        selectedBalanceAmount = null;
        clearBalanceSelection();
    }
}

function clearBalanceSelection() {
    const options = document.querySelectorAll('.balance-option');
    options.forEach(option => {
        option.classList.remove('selected');
    });
}

function selectBalanceAmount(amount) {
    selectedBalanceAmount = amount;

    // Clear previous selection
    clearBalanceSelection();

    // Add selected class to clicked option
    const selectedOption = document.querySelector(`[data-amount="${amount}"]`);
    if (selectedOption) {
        selectedOption.classList.add('selected');
    }

    updateBalanceConfirmButton();
}

function updateBalanceConfirmButton() {
    const confirmBtn = document.getElementById('balance-confirm-btn');
    if (confirmBtn) {
        if (selectedBalanceAmount) {
            confirmBtn.disabled = false;
            confirmBtn.textContent = `Пополнить на ${selectedBalanceAmount} звезд`;
        } else {
            confirmBtn.disabled = true;
            confirmBtn.textContent = 'Пополнить баланс';
        }
    }
}

async function confirmBalanceTopUp() {
    if (!selectedBalanceAmount || !userProfile.id) return;

    try {
        console.log(`Top-up requested: ${selectedBalanceAmount} stars for user ${userProfile.id}`);

        // Add haptic feedback if available
        if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
            try {
                window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
            } catch (error) {
                console.log('Haptic feedback not supported:', error);
            }
        }

        // Hide balance modal
        hideBalanceModal();

        // Open Telegram chat with @HypeGift_relayer
        if (window.Telegram && window.Telegram.WebApp) {
            const tg = window.Telegram.WebApp;
            const message = `Хочу пополнить баланс на ${selectedBalanceAmount} звезд\nМой ID: ${userProfile.id}`;

            // Use openTelegramLink to open chat with the relayer
            if (tg.openTelegramLink) {
                tg.openTelegramLink(`https://t.me/HypeGift_relayer?text=${encodeURIComponent(message)}`);
            } else {
                // Fallback: try to open link directly
                window.open(`https://t.me/HypeGift_relayer?text=${encodeURIComponent(message)}`, '_blank');
            }
        } else {
            // Fallback for non-Telegram environment
            window.open(`https://t.me/HypeGift_relayer`, '_blank');
        }

    } catch (error) {
        console.error('Failed to process top-up:', error);
        if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.showAlert) {
            window.Telegram.WebApp.showAlert('Произошла ошибка при пополнении баланса');
        } else {
            alert('Произошла ошибка при пополнении баланса');
        }
    }
}

// Navigation functionality
document.addEventListener('DOMContentLoaded', function() {
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.section');
    const actionButtons = document.querySelectorAll('.action-button');

    // Load TGS animations
    loadTgsAnimation();
    loadBalanceIconAnimations();
    loadMarketTgsAnimation();

    // Initialize user profile
    updateUserProfile();

    // Show admin nav if user is admin
    if (userProfile.id && userProfile.id.toString() === ADMIN_ID) {
        const adminNav = document.querySelector('.admin-nav');
        if (adminNav) {
            adminNav.style.display = 'flex';
        }
    }

    // Load user data from server
    loadUserData();

    // Load and render products from API
    loadProducts();

    // Admin panel event handlers
    const adminButton = document.getElementById('admin-button');
    const saveProductBtn = document.getElementById('save-product');
    const manageProductsBtn = document.getElementById('manage-products-btn');
    const manageUsersBtn = document.getElementById('manage-users-btn');
    const addProductBtn = document.getElementById('add-product-btn');
    const adminBackBtn = document.getElementById('admin-back-btn');
    const adminUsersBackBtn = document.getElementById('admin-users-back-btn');
    const cancelProductFormBtn = document.getElementById('cancel-product-form');
    const userBalanceModalClose = document.getElementById('user-balance-modal-close');
    const giveBalanceBtn = document.getElementById('give-balance-btn');
    const cancelBalanceBtn = document.getElementById('cancel-balance-btn');

    if (adminButton) {
        adminButton.addEventListener('click', function() {
            if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
                try {
                    window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
                } catch (error) {
                    console.log('Haptic feedback not supported:', error);
                }
            }

            // Check if user is admin
            if (userProfile.id && userProfile.id.toString() === ADMIN_ID) {
                // Always show admin section first
                showSection('admin');

                // Show password modal for admin
                setTimeout(() => {
                    showAdminPasswordModal();
                }, 100);
            } else {
                // For non-admin users, redirect to @HypeGift_news
                if (window.Telegram && window.Telegram.WebApp) {
                    const tg = window.Telegram.WebApp;

                    // Use openTelegramLink to open chat with @HypeGift_news
                    if (tg.openTelegramLink) {
                        tg.openTelegramLink('https://t.me/HypeGift_news');
                    } else {
                        // Fallback: try to open link directly
                        window.open('https://t.me/HypeGift_news', '_blank');
                    }
                } else {
                    // Fallback for non-Telegram environment
                    window.open('https://t.me/HypeGift_news', '_blank');
                }
            }
        });
    }

    if (manageProductsBtn) {
        manageProductsBtn.addEventListener('click', function() {
            if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
                try {
                    window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
                } catch (error) {
                    console.log('Haptic feedback not supported:', error);
                }
            }
            showAdminProductsScreen();
        });
    }

    if (manageUsersBtn) {
        manageUsersBtn.addEventListener('click', function() {
            if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
                try {
                    window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
                } catch (error) {
                    console.log('Haptic feedback not supported:', error);
                }
            }
            showAdminUsersScreen();
        });
    }

    if (addProductBtn) {
        addProductBtn.addEventListener('click', function() {
            if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
                try {
                    window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
                } catch (error) {
                    console.log('Haptic feedback not supported:', error);
                }
            }
            showAdminProductForm();
        });
    }

    if (adminBackBtn) {
        adminBackBtn.addEventListener('click', function() {
            if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
                try {
                    window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
                } catch (error) {
                    console.log('Haptic feedback not supported:', error);
                }
            }
            showAdminMainScreen();
        });
    }

    if (adminUsersBackBtn) {
        adminUsersBackBtn.addEventListener('click', function() {
            if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
                try {
                    window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
                } catch (error) {
                    console.log('Haptic feedback not supported:', error);
                }
            }
            showAdminMainScreen();
        });
    }

    if (cancelProductFormBtn) {
        cancelProductFormBtn.addEventListener('click', function() {
            if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
                try {
                    window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
                } catch (error) {
                    console.log('Haptic feedback not supported:', error);
                }
            }
            hideAdminProductForm();
        });
    }

    if (saveProductBtn) {
        saveProductBtn.addEventListener('click', saveProduct);
    }

    // User balance modal event handlers
    if (userBalanceModalClose) {
        userBalanceModalClose.addEventListener('click', hideGiveBalanceModal);
    }

    if (giveBalanceBtn) {
        giveBalanceBtn.addEventListener('click', giveUserBalance);
    }

    if (cancelBalanceBtn) {
        cancelBalanceBtn.addEventListener('click', hideGiveBalanceModal);
    }

    // Gift transfer event handlers
    const manageGiftsBtn = document.getElementById('manage-gifts-btn');
    const adminGiftsBackBtn = document.getElementById('admin-gifts-back-btn');
    const transferGiftBtn = document.getElementById('transfer-gift-btn');
    const cancelGiftTransferBtn = document.getElementById('cancel-gift-transfer-btn');
    const giftTransferModalClose = document.getElementById('gift-transfer-modal-close');
    const confirmTransferBtn = document.getElementById('confirm-transfer-btn');
    const cancelConfirmTransferBtn = document.getElementById('cancel-confirm-transfer-btn');
    const giftUserIdInput = document.getElementById('gift-user-id');

    // Upgrades event handlers
    const manageUpgradesBtn = document.getElementById('manage-upgrades-btn');
    const adminUpgradesBackBtn = document.getElementById('admin-upgrades-back-btn');
    const addUpgradeBtn = document.getElementById('add-upgrade-btn');
    const saveUpgradeBtn = document.getElementById('save-upgrade');
    const cancelUpgradeFormBtn = document.getElementById('cancel-upgrade-form');

    if (manageGiftsBtn) {
        manageGiftsBtn.addEventListener('click', function() {
            if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
                try {
                    window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
                } catch (error) {
                    console.log('Haptic feedback not supported:', error);
                }
            }
            showAdminGiftsScreen();
        });
    }

    if (adminGiftsBackBtn) {
        adminGiftsBackBtn.addEventListener('click', function() {
            if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
                try {
                    window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
                } catch (error) {
                    console.log('Haptic feedback not supported:', error);
                }
            }
            showAdminMainScreen();
        });
    }

    if (transferGiftBtn) {
        transferGiftBtn.addEventListener('click', function() {
            if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
                try {
                    window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
                } catch (error) {
                    console.log('Haptic feedback not supported:', error);
                }
            }
            showGiftTransferModal();
        });
    }

    if (cancelGiftTransferBtn) {
        cancelGiftTransferBtn.addEventListener('click', function() {
            if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
                try {
                    window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
                } catch (error) {
                    console.log('Haptic feedback not supported:', error);
                }
            }
            showAdminMainScreen();
        });
    }

    if (giftTransferModalClose) {
        giftTransferModalClose.addEventListener('click', hideGiftTransferModal);
    }

    if (confirmTransferBtn) {
        confirmTransferBtn.addEventListener('click', confirmGiftTransfer);
    }

    if (cancelConfirmTransferBtn) {
        cancelConfirmTransferBtn.addEventListener('click', hideGiftTransferModal);
    }

    if (giftUserIdInput) {
        giftUserIdInput.addEventListener('input', updateTransferButton);
    }

    if (manageUpgradesBtn) {
        manageUpgradesBtn.addEventListener('click', function() {
            if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
                try {
                    window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
                } catch (error) {
                    console.log('Haptic feedback not supported:', error);
                }
            }
            showAdminUpgradesScreen();
        });
    }

    if (adminUpgradesBackBtn) {
        adminUpgradesBackBtn.addEventListener('click', function() {
            if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
                try {
                    window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
                } catch (error) {
                    console.log('Haptic feedback not supported:', error);
                }
            }
            showAdminMainScreen();
        });
    }

    if (addUpgradeBtn) {
        addUpgradeBtn.addEventListener('click', function() {
            if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
                try {
                    window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
                } catch (error) {
                    console.log('Haptic feedback not supported:', error);
                }
            }
            showAdminUpgradeForm();
        });
    }

    if (saveUpgradeBtn) {
        saveUpgradeBtn.addEventListener('click', saveUpgrade);
    }

    if (cancelUpgradeFormBtn) {
        cancelUpgradeFormBtn.addEventListener('click', function() {
            if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
                try {
                    window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
                } catch (error) {
                    console.log('Haptic feedback not supported:', error);
                }
            }
            hideAdminUpgradeForm();
        });
    }



    // Add share button handler
    const shareBtn = document.querySelector('.share-btn');
    if (shareBtn) {
        shareBtn.addEventListener('click', function() {
            if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
                try {
                    window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
                } catch (error) {
                    console.log('Haptic feedback not supported:', error);
                }
            }
            shareReferralLink();
        });
    }

    // Balance modal event handlers
    const addBalanceBtn = document.querySelector('.add-balance-btn');
    const balanceModal = document.getElementById('balance-modal');
    const balanceModalClose = document.getElementById('balance-modal-close');
    const balanceConfirmBtn = document.getElementById('balance-confirm-btn');
    const balanceOptions = document.querySelectorAll('.balance-option');

    if (addBalanceBtn) {
        addBalanceBtn.addEventListener('click', function() {
            if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
                try {
                    window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
                } catch (error) {
                    console.log('Haptic feedback not supported:', error);
                }
            }
            showBalanceModal();
        });
    }

    if (balanceModalClose) {
        balanceModalClose.addEventListener('click', hideBalanceModal);
    }

    if (balanceConfirmBtn) {
        balanceConfirmBtn.addEventListener('click', confirmBalanceTopUp);
    }

    // Add click handlers for balance options
    balanceOptions.forEach(option => {
        option.addEventListener('click', function() {
            if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
                try {
                    window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
                } catch (error) {
                    console.log('Haptic feedback not supported:', error);
                }
            }
            const amount = parseInt(this.dataset.amount);
            selectBalanceAmount(amount);
        });
    });

    // Close balance modal when clicking outside
    if (balanceModal) {
        balanceModal.addEventListener('click', function(e) {
            if (e.target === balanceModal) {
                hideBalanceModal();
            }
        });
    }

    // Product modal event handlers
    const productModal = document.getElementById('product-modal');
    const productModalClose = document.getElementById('product-modal-close');
    const productBuyBtn = document.getElementById('product-buy-btn');

    if (productModalClose) {
        productModalClose.addEventListener('click', hideProductModal);
    }

    if (productBuyBtn) {
        productBuyBtn.addEventListener('click', function() {
            if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
                try {
                    window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
                } catch (error) {
                    console.log('Haptic feedback not supported:', error);
                }
            }

            if (currentProduct) {
                buyProduct(currentProduct.id);
            }
        });
    }

    // Close product modal when clicking outside
    if (productModal) {
        productModal.addEventListener('click', function(e) {
            if (e.target === productModal) {
                hideProductModal();
            }
        });
    }



    // Gift transfer modal event handlers
    const giftTransferModal = document.getElementById('gift-transfer-modal');
    const giftTransferClose = document.querySelector('.gift-transfer-modal-close');
    const giftTransferSendBtn = document.querySelector('.gift-transfer-send-btn');

    if (giftTransferClose) {
        giftTransferClose.addEventListener('click', function() {
            if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
                try {
                    window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
                } catch (error) {
                    console.log('Haptic feedback not supported:', error);
                }
            }
            hideGiftTransferModal();
        });
    }

    if (giftTransferSendBtn) {
        giftTransferSendBtn.addEventListener('click', function(event) {
            event.preventDefault();
            event.stopPropagation();

            if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
                try {
                    window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
                } catch (error) {
                    console.log('Haptic feedback not supported:', error);
                }
            }
            sendGiftTransfer(event);
        });
    }

    // Close gift transfer modal when clicking outside
    if (giftTransferModal) {
        giftTransferModal.addEventListener('click', function(e) {
            if (e.target === giftTransferModal) {
                hideGiftTransferModal();
            }
        });
    }



    // Set case (Главная) as active by default
    const inventoryNav = document.querySelector('[data-section="inventory"]');
    const caseNav = document.querySelector('[data-section="case"]');

    // Remove active from inventory and set case as active
    if (inventoryNav) inventoryNav.classList.remove('active');
    if (caseNav) caseNav.classList.add('active');

    // Show case section by default
    showSection('case');

    function showSection(sectionName) {
        console.log('Switching to section:', sectionName);

        // Hide all sections
        sections.forEach(section => {
            section.classList.remove('active');
            section.style.display = 'none';
        });

        // Show target section
        const targetSection = document.querySelector(`.${sectionName}-section`);
        if (targetSection) {
            targetSection.classList.add('active');
            targetSection.style.display = 'block';
            console.log('Section shown:', sectionName);

            // Play balance animation when switching to profile section
            if (sectionName === 'profile' && profileBalanceAnimation) {
                profileBalanceAnimation.goToAndStop(0);
                profileBalanceAnimation.play();
                console.log('Profile balance animation replayed');
            }

            // Restart inventory TGS animation when switching to inventory section
            if (sectionName === 'inventory') {
                loadUserInventory(); // Load user's purchased gifts
                if (tgsAnimation) {
                    tgsAnimation.goToAndStop(0);
                    tgsAnimation.play();
                    console.log('Inventory TGS animation restarted');
                }

                // Replay all inventory gift animations when switching to inventory
                setTimeout(() => {
                    replayAllInventoryAnimations();
                }, 200);

                // Trigger confetti if marked after purchase
                if (shouldTriggerConfetti) {
                    shouldTriggerConfetti = false; // Reset flag
                    console.log('Triggering confetti animation after purchase...');

                    // Delay to ensure section is fully loaded and user can see the effect
                    setTimeout(() => {
                        console.log('Starting confetti animation...');
                        runConfetti();
                    }, 500);
                }
            }

            // Restart market TGS animation and trigger stars explosion when switching to market section
            if (sectionName === 'top') {
                if (marketAnimation) {
                    marketAnimation.goToAndStop(0);
                    marketAnimation.play();
                    console.log('Market TGS animation restarted');
                }
                setTimeout(() => {
                    explodeStars();
                }, 300); // Small delay to let the section fully load
            }

            // Replay all product animations when switching to cases section
            if (sectionName === 'case') {
                startProductAnimationsWhenReady();
            }
        } else {
            console.log('Section not found:', sectionName);
        }

        // Update nav active state - убираем активное состояние у всех элементов навигации
        navItems.forEach(nav => {
            nav.classList.remove('active');
        });

        // Добавляем активное состояние к нужному элементу навигации
        const activeNav = document.querySelector(`.nav-item[data-section="${sectionName}"]`);
        if (activeNav) {
            activeNav.classList.add('active');
            console.log('Nav activated:', sectionName);
        } else {
            console.log('Nav not found for section:', sectionName);
        }
    }

    navItems.forEach(item => {
        item.addEventListener('click', function() {
            // Вибрация при переключении
            if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
                try {
                    window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
                } catch (error) {
                    console.log('Haptic feedback not supported:', error);
                }
            }

            const section = this.dataset.section;
            showSection(section);
        });
    });

    // Action buttons functionality
    actionButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Вибрация при нажатии кнопки
            if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
                try {
                    window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
                } catch (error) {
                    console.log('Haptic feedback not supported:', error);
                }
            }

            const action = this.dataset.action;
            console.log('Button clicked with action:', action);

            // Маппинг действий кнопок к разделам навигации
            let sectionName = action;
            if (action === 'cases') {
                sectionName = 'case';
            }
            // action 'profile' остается 'profile'

            showSection(sectionName);
        });
    });
});