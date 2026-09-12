/**
 * Mogno Brechó - Aplicação Principal
 * Gerenciamento de Vitrine, Sacola, Filtros e Painel Administrativo Completo
 */

(function () {
  'use strict';

  // --- ESTADO DA APLICAÇÃO ---
  const STORAGE_KEY_PRODUCTS = 'magno_brecho_products_v1';
  const STORAGE_KEY_CART = 'magno_brecho_cart_v1';
  const STORAGE_KEY_ADMIN_UNLOCKED = 'mogno_brecho_admin_unlocked_v1';

  // ⚠️ Troque essa senha por uma só sua e da pessoa de confiança que vai cuidar do painel.
  // Isso é uma proteção simples (não é criptografia de verdade), mas já impede
  // que visitantes comuns encontrem ou entrem no painel admin.
  const ADMIN_PASSWORD = 'mogno2026';

  let products = [];
  let cart = [];
  let activeCategory = 'todos';
  let activeSize = 'todos';
  let activeCondition = 'todos';
  let searchQuery = '';
  let activeSort = 'recent';
  let adminStatusFilter = 'todos';
  let currentEditingId = null;
  let logoClickCount = 0;
  let logoClickTimer = null;

  // --- ELEMENTOS DO DOM ---
  const elements = {
    // Views
    storeView: document.getElementById('store-view'),
    adminView: document.getElementById('admin-view'),
    btnViewStore: document.getElementById('btn-view-store'),
    btnViewAdmin: document.getElementById('btn-view-admin'),

    // Vitrine & Filtros
    productsGrid: document.getElementById('products-grid'),
    catalogCounter: document.getElementById('catalog-counter'),
    categoryPills: document.querySelectorAll('.pill-filter'),
    sizeFilters: document.querySelectorAll('.tag-size-filter'),
    conditionFilters: document.querySelectorAll('.tag-condition-filter'),
    searchInput: document.getElementById('search-products-input'),
    sortSelect: document.getElementById('sort-products-select'),

    // Sacola / Cart Drawer
    cartTriggerBtn: document.getElementById('cart-trigger-btn'),
    cartBadgeCount: document.getElementById('cart-badge-count'),
    cartDrawerOverlay: document.getElementById('cart-drawer-overlay'),
    btnCloseCart: document.getElementById('btn-close-cart'),
    cartItemsBody: document.getElementById('cart-items-body'),
    cartSubtotal: document.getElementById('cart-subtotal'),
    btnWhatsappCheckout: document.getElementById('btn-whatsapp-checkout'),

    // Modal Quick View
    detailModalBackdrop: document.getElementById('product-detail-modal'),
    btnCloseDetailModal: document.getElementById('btn-close-detail-modal'),
    detailModalContent: document.getElementById('detail-modal-body'),

    // Admin Panel
    adminMetricTotal: document.getElementById('metric-total-items'),
    adminMetricAvailable: document.getElementById('metric-available-items'),
    adminMetricSold: document.getElementById('metric-sold-items'),
    adminMetricValue: document.getElementById('metric-total-value'),
    adminForm: document.getElementById('add-product-form'),
    adminItemsList: document.getElementById('admin-items-list'),
    adminStatusTabs: document.querySelectorAll('.admin-status-tab'),
    btnResetCatalog: document.getElementById('btn-reset-catalog'),
    imagePresetBtns: document.querySelectorAll('.preset-btn'),
    imageUrlInput: document.getElementById('prod-image-url'),
    imageFileInput: document.getElementById('prod-image-file'),

    // Modal de Edição (Admin)
    editModalBackdrop: document.getElementById('product-edit-modal'),
    btnCloseEditModal: document.getElementById('btn-close-edit-modal'),
    editProductForm: document.getElementById('edit-product-form'),

    // Toast Container
    toastContainer: document.getElementById('toast-container'),

    // Acesso Restrito (Senha do Admin)
    brandLogo: document.querySelector('.brand-logo'),
    adminPasswordModal: document.getElementById('admin-password-modal'),
    adminPasswordForm: document.getElementById('admin-password-form'),
    adminPasswordInput: document.getElementById('admin-password-input'),
    passwordErrorMsg: document.getElementById('password-error-msg'),
    btnClosePasswordModal: document.getElementById('btn-close-password-modal'),
    btnLockAdmin: document.getElementById('btn-lock-admin'),

    // Menu Mobile (Hambúrguer)
    siteNav: document.getElementById('site-nav'),
    btnMobileMenuToggle: document.getElementById('btn-mobile-menu-toggle'),
    mobileNavBackdrop: document.getElementById('mobile-nav-backdrop'),
    mobileNavLinks: document.querySelectorAll('#site-nav .nav-link')
  };

  // --- INICIALIZAÇÃO ---
  function init() {
    loadProducts();
    loadCart();
    checkAdminAccess();
    setupEventListeners();
    renderStoreCatalog();
    renderCart();
    renderAdminMetrics();
    renderAdminList();
  }

  // --- ACESSO RESTRITO AO PAINEL ADMIN ---
  function checkAdminAccess() {
    const unlocked = localStorage.getItem(STORAGE_KEY_ADMIN_UNLOCKED) === 'true';
    if (unlocked && elements.btnViewAdmin) {
      elements.btnViewAdmin.style.display = 'inline-flex';
    }
  }

  function openPasswordModal() {
    if (elements.adminPasswordModal) {
      elements.adminPasswordModal.classList.add('active');
      if (elements.passwordErrorMsg) elements.passwordErrorMsg.style.display = 'none';
      setTimeout(() => elements.adminPasswordInput && elements.adminPasswordInput.focus(), 150);
    }
  }

  function closePasswordModal() {
    if (elements.adminPasswordModal) {
      elements.adminPasswordModal.classList.remove('active');
      if (elements.adminPasswordForm) elements.adminPasswordForm.reset();
    }
  }

  function handlePasswordSubmit(e) {
    e.preventDefault();
    const typed = elements.adminPasswordInput.value.trim();

    if (typed === ADMIN_PASSWORD) {
      localStorage.setItem(STORAGE_KEY_ADMIN_UNLOCKED, 'true');
      if (elements.btnViewAdmin) elements.btnViewAdmin.style.display = 'inline-flex';
      closePasswordModal();
      showToast('Acesso liberado neste dispositivo! 🔓');
      switchView('admin');
    } else {
      if (elements.passwordErrorMsg) elements.passwordErrorMsg.style.display = 'block';
      const card = document.querySelector('.password-modal-card');
      if (card) {
        card.classList.remove('shake');
        void card.offsetWidth; // reinicia a animação
        card.classList.add('shake');
      }
      elements.adminPasswordInput.value = '';
      elements.adminPasswordInput.focus();
    }
  }

  function lockAdminAccess() {
    localStorage.removeItem(STORAGE_KEY_ADMIN_UNLOCKED);
    if (elements.btnViewAdmin) elements.btnViewAdmin.style.display = 'none';
    switchView('store');
    showToast('Acesso ao painel trancado neste dispositivo.');
  }

  function handleSecretLogoClick(e) {
    // Se o admin já está liberado neste dispositivo, o clique no logo funciona normalmente.
    if (localStorage.getItem(STORAGE_KEY_ADMIN_UNLOCKED) === 'true') return;

    e.preventDefault();
    logoClickCount++;

    clearTimeout(logoClickTimer);
    logoClickTimer = setTimeout(() => { logoClickCount = 0; }, 2500);

    if (logoClickCount >= 5) {
      logoClickCount = 0;
      clearTimeout(logoClickTimer);
      openPasswordModal();
    }
  }

  function handleSecretKeyShortcut(e) {
    // Atalho alternativo pra quem prefere teclado: Ctrl/Cmd + Alt + M
    if ((e.ctrlKey || e.metaKey) && e.altKey && e.key.toLowerCase() === 'm') {
      e.preventDefault();
      openPasswordModal();
    }
  }

  // --- MENU MOBILE (HAMBÚRGUER) ---
  function openMobileMenu() {
    if (!elements.siteNav) return;
    elements.siteNav.classList.add('nav-open');
    if (elements.mobileNavBackdrop) elements.mobileNavBackdrop.classList.add('active');
    if (elements.btnMobileMenuToggle) {
      elements.btnMobileMenuToggle.setAttribute('aria-expanded', 'true');
      elements.btnMobileMenuToggle.querySelector('.icon-menu-bars').style.display = 'none';
      elements.btnMobileMenuToggle.querySelector('.icon-menu-close').style.display = 'block';
    }
    document.body.style.overflow = 'hidden';
  }

  function closeMobileMenu() {
    if (!elements.siteNav) return;
    elements.siteNav.classList.remove('nav-open');
    if (elements.mobileNavBackdrop) elements.mobileNavBackdrop.classList.remove('active');
    if (elements.btnMobileMenuToggle) {
      elements.btnMobileMenuToggle.setAttribute('aria-expanded', 'false');
      elements.btnMobileMenuToggle.querySelector('.icon-menu-bars').style.display = 'block';
      elements.btnMobileMenuToggle.querySelector('.icon-menu-close').style.display = 'none';
    }
    document.body.style.overflow = '';
  }

  function toggleMobileMenu() {
    if (elements.siteNav && elements.siteNav.classList.contains('nav-open')) {
      closeMobileMenu();
    } else {
      openMobileMenu();
    }
  }

  // --- GERENCIAMENTO DE DADOS (LOCALSTORAGE) ---
  function loadProducts() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PRODUCTS);
      if (saved) {
        products = JSON.parse(saved);
      } else {
        products = [...DEFAULT_PRODUCTS];
        saveProducts();
      }
    } catch (e) {
      console.warn('Erro ao carregar do localStorage. Usando catálogo padrão:', e);
      products = [...DEFAULT_PRODUCTS];
    }
  }

  function saveProducts() {
    try {
      localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(products));
    } catch (e) {
      console.error('Erro ao salvar produtos:', e);
    }
  }

  function loadCart() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CART);
      cart = saved ? JSON.parse(saved) : [];
    } catch (e) {
      cart = [];
    }
  }

  function saveCart() {
    try {
      localStorage.setItem(STORAGE_KEY_CART, JSON.stringify(cart));
    } catch (e) {
      console.error('Erro ao salvar sacola:', e);
    }
  }

  // --- NAVEGAÇÃO ENTRE LOJA E ADMIN ---
  function switchView(viewName) {
    if (viewName === 'admin') {
      elements.storeView.style.display = 'none';
      elements.adminView.classList.add('active');
      elements.btnViewAdmin.classList.add('active');
      elements.btnViewStore.classList.remove('active');
      renderAdminMetrics();
      renderAdminList();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      elements.adminView.classList.remove('active');
      elements.storeView.style.display = 'block';
      elements.btnViewStore.classList.add('active');
      elements.btnViewAdmin.classList.remove('active');
      renderStoreCatalog();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  // --- RENDERIZAÇÃO DA VITRINE (LOJA) ---
  function renderStoreCatalog() {
    if (!elements.productsGrid) return;

    // Filtragem
    let filtered = products.filter(item => {
      // Categoria
      if (activeCategory !== 'todos' && item.category !== activeCategory) return false;
      // Tamanho
      if (activeSize !== 'todos' && item.size !== activeSize) return false;
      // Estado
      if (activeCondition !== 'todos' && item.condition !== activeCondition) return false;
      // Busca
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(query);
        const matchBrand = item.brand.toLowerCase().includes(query);
        const matchMat = (item.material || '').toLowerCase().includes(query);
        const matchDesc = (item.description || '').toLowerCase().includes(query);
        if (!matchTitle && !matchBrand && !matchMat && !matchDesc) return false;
      }
      return true;
    });

    // Ordenação
    if (activeSort === 'price-asc') {
      filtered.sort((a, b) => a.price - b.price);
    } else if (activeSort === 'price-desc') {
      filtered.sort((a, b) => b.price - a.price);
    } else {
      // recent (mantém ou inverte id)
      // Mantém a ordem cadastrada
    }

    // Atualiza contador
    const countDisponiveis = filtered.filter(p => p.status !== 'vendido').length;
    if (elements.catalogCounter) {
      elements.catalogCounter.textContent = `${countDisponiveis} peça${countDisponiveis !== 1 ? 's' : ''} disponível${countDisponiveis !== 1 ? 'is' : ''}`;
    }

    // Renderiza cards
    if (filtered.length === 0) {
      elements.productsGrid.innerHTML = `
        <div class="empty-catalog-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color: var(--c-magno-primary); margin: 0 auto 16px;">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <h3>Nenhuma peça encontrada</h3>
          <p style="color: var(--c-charcoal-500); margin-top: 6px;">Tente ajustar os filtros ou buscar por outro termo.</p>
          <button id="btn-clear-filters" class="btn-primary" style="margin-top: 18px; padding: 10px 20px; font-size: 0.85rem;">Limpar Filtros</button>
        </div>
      `;
      const clearBtn = document.getElementById('btn-clear-filters');
      if (clearBtn) {
        clearBtn.addEventListener('click', () => {
          activeCategory = 'todos';
          activeSize = 'todos';
          activeCondition = 'todos';
          searchQuery = '';
          if (elements.searchInput) elements.searchInput.value = '';
          updateFilterPillStyles();
          renderStoreCatalog();
        });
      }
      return;
    }

    elements.productsGrid.innerHTML = filtered.map(product => {
      const isSold = product.status === 'vendido';
      const savings = product.originalPrice ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) : 0;

      return `
        <article class="product-card" data-id="${product.id}">
          <div class="card-media-wrap">
            <img src="${product.image}" alt="${product.title}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=800&q=80'">
            
            <div class="card-badges">
              ${isSold 
                ? `<span class="badge-item badge-sold">Esgotado</span>` 
                : `<span class="badge-item badge-nature">${product.badge || 'Peça Única'}</span>`}
              ${product.vibe ? `<span class="badge-item badge-vibe">${product.vibe}</span>` : ''}
            </div>

            ${isSold ? `
              <div class="sold-stamp-overlay">
                <span class="sold-stamp">Vendido</span>
              </div>
            ` : `
              <div class="card-quick-actions">
                <button class="btn-quick-view" data-action="quick-view" data-id="${product.id}">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                  Espiar Detalhes
                </button>
                <button class="btn-quick-cart" data-action="add-cart" data-id="${product.id}" title="Adicionar à Sacola">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
                </button>
              </div>
            `}
          </div>

          <div class="card-content">
            <div class="card-brand-row">
              <span class="card-brand">${product.brand}</span>
              <span class="card-size-tag">Tam ${product.size}</span>
            </div>

            <h3 class="card-title">${product.title}</h3>

            <div class="card-details-meta">
              <span>${product.material || 'Linho / Sarja'}</span>
              <span class="dot"></span>
              <span>${product.condition}</span>
            </div>

            <div class="card-price-row">
              <div class="price-box">
                <span class="current-price">R$ ${Number(product.price).toFixed(2).replace('.', ',')}</span>
                ${product.originalPrice ? `<span class="original-price">R$ ${Number(product.originalPrice).toFixed(2).replace('.', ',')}</span>` : ''}
              </div>
              ${savings > 0 && !isSold ? `<span class="savings-tag">-${savings}%</span>` : ''}
            </div>
          </div>
        </article>
      `;
    }).join('');

    // Adiciona event listeners aos botões dos cards
    elements.productsGrid.querySelectorAll('[data-action="quick-view"]').forEach(btn => {
      btn.addEventListener('click', () => openProductDetail(btn.getAttribute('data-id')));
    });

    elements.productsGrid.querySelectorAll('[data-action="add-cart"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        addToCart(btn.getAttribute('data-id'));
      });
    });
  }

  function updateFilterPillStyles() {
    elements.categoryPills.forEach(pill => {
      if (pill.getAttribute('data-category') === activeCategory) {
        pill.classList.add('active');
      } else {
        pill.classList.remove('active');
      }
    });

    elements.sizeFilters.forEach(pill => {
      if (pill.getAttribute('data-size') === activeSize) {
        pill.classList.add('active');
      } else {
        pill.classList.remove('active');
      }
    });

    elements.conditionFilters.forEach(pill => {
      if (pill.getAttribute('data-condition') === activeCondition) {
        pill.classList.add('active');
      } else {
        pill.classList.remove('active');
      }
    });
  }

  // --- MODAL DE DETALHES DO PRODUTO (QUICK VIEW) ---
  function openProductDetail(productId) {
    const product = products.find(p => p.id === productId);
    if (!product || !elements.detailModalContent) return;

    const isSold = product.status === 'vendido';
    const savings = product.originalPrice ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) : 0;

    elements.detailModalContent.innerHTML = `
      <div class="modal-gallery-side">
        <img src="${product.image}" alt="${product.title}">
        ${isSold ? `<div class="sold-stamp-overlay"><span class="sold-stamp">Vendido</span></div>` : ''}
      </div>
      <div class="modal-info-side">
        <span class="modal-brand-tag">${product.brand}</span>
        <h2 class="modal-title">${product.title}</h2>

        <div class="modal-price-box">
          <span class="modal-current-price">R$ ${Number(product.price).toFixed(2).replace('.', ',')}</span>
          ${product.originalPrice ? `<span class="original-price" style="font-size: 1.1rem;">R$ ${Number(product.originalPrice).toFixed(2).replace('.', ',')}</span>` : ''}
          ${savings > 0 ? `<span class="savings-tag">Economia de ${savings}%</span>` : ''}
        </div>

        <div class="modal-meta-grid">
          <div class="modal-meta-item">
            <small>Tamanho</small>
            <strong>${product.size}</strong>
          </div>
          <div class="modal-meta-item">
            <small>Estado da Peça</small>
            <strong>${product.condition}</strong>
          </div>
          <div class="modal-meta-item">
            <small>Composição</small>
            <strong>${product.material || 'Fibras Nobres'}</strong>
          </div>
          <div class="modal-meta-item">
            <small>Atmosfera / Vibe</small>
            <strong>${product.vibe || 'Maresia & Mogno'}</strong>
          </div>
        </div>

        <p class="modal-desc">${product.description || 'Peça única selecionada cuidadosamente por nossa equipe de curadoria.'}</p>

        ${product.measurements ? `
          <div style="background: var(--c-sand-100); padding: 12px 16px; border-radius: 8px; margin-bottom: 24px; font-size: 0.82rem;">
            <strong style="display: block; margin-bottom: 2px; color: var(--c-charcoal-800);">Medidas Estimadas:</strong>
            <span style="color: var(--c-charcoal-600);">${product.measurements}</span>
          </div>
        ` : ''}

        <div class="modal-actions-box">
          ${isSold ? `
            <button class="btn-secondary" style="width: 100%; opacity: 0.7; cursor: not-allowed;" disabled>
              Peça Esgotada
            </button>
          ` : `
            <button class="btn-primary" id="btn-modal-add-cart" style="flex: 1;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
              Adicionar à Sacola
            </button>
          `}
        </div>
      </div>
    `;

    const modalAddBtn = document.getElementById('btn-modal-add-cart');
    if (modalAddBtn) {
      modalAddBtn.addEventListener('click', () => {
        addToCart(product.id);
        closeDetailModal();
      });
    }

    elements.detailModalBackdrop.classList.add('active');
  }

  function closeDetailModal() {
    if (elements.detailModalBackdrop) {
      elements.detailModalBackdrop.classList.remove('active');
    }
  }

  // --- SACOLA DE COMPRAS (CART DRAWER) ---
  function openCart() {
    elements.cartDrawerOverlay.classList.add('active');
  }

  function closeCart() {
    elements.cartDrawerOverlay.classList.remove('active');
  }

  function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    if (product.status === 'vendido') {
      showToast('Esta peça já foi vendida.', 'warning');
      return;
    }

    // Como são peças únicas de brechó, checa se já está na sacola
    const exists = cart.find(item => item.id === productId);
    if (exists) {
      showToast('Esta peça única já está na sua sacola!', 'info');
      openCart();
      return;
    }

    cart.push({ ...product });
    saveCart();
    renderCart();
    showToast(`"${product.title}" adicionado à sacola!`);
    openCart();
  }

  function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    saveCart();
    renderCart();
    showToast('Peça removida da sacola.');
  }

  function renderCart() {
    // Contador na navbar
    if (elements.cartBadgeCount) {
      elements.cartBadgeCount.textContent = cart.length;
      elements.cartBadgeCount.style.display = cart.length > 0 ? 'flex' : 'none';
    }

    if (!elements.cartItemsBody) return;

    if (cart.length === 0) {
      elements.cartItemsBody.innerHTML = `
        <div class="cart-empty-view">
          <svg width="54" height="54" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2">
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <path d="M16 10a4 4 0 0 1-8 0"></path>
          </svg>
          <p style="font-size: 1rem; font-weight: 600; margin-bottom: 4px;">Sua sacola está vazia</p>
          <p style="font-size: 0.85rem;">Garimpe peças únicas de linho e praia em nossa arara.</p>
        </div>
      `;
      if (elements.cartSubtotal) elements.cartSubtotal.textContent = 'R$ 0,00';
      if (elements.btnWhatsappCheckout) {
        elements.btnWhatsappCheckout.disabled = true;
        elements.btnWhatsappCheckout.style.opacity = '0.5';
        elements.btnWhatsappCheckout.style.pointerEvents = 'none';
      }
      return;
    }

    // Calcula Subtotal
    const subtotal = cart.reduce((sum, item) => sum + Number(item.price), 0);
    if (elements.cartSubtotal) {
      elements.cartSubtotal.textContent = `R$ ${subtotal.toFixed(2).replace('.', ',')}`;
    }

    if (elements.btnWhatsappCheckout) {
      elements.btnWhatsappCheckout.disabled = false;
      elements.btnWhatsappCheckout.style.opacity = '1';
      elements.btnWhatsappCheckout.style.pointerEvents = 'auto';
    }

    // Renderiza itens
    elements.cartItemsBody.innerHTML = cart.map(item => `
      <div class="cart-item-row" data-id="${item.id}">
        <img src="${item.image}" alt="${item.title}" class="cart-item-img">
        <div class="cart-item-details">
          <h4 class="cart-item-name">${item.title}</h4>
          <div class="cart-item-meta">${item.brand} • Tam ${item.size}</div>
          <div class="cart-item-price">R$ ${Number(item.price).toFixed(2).replace('.', ',')}</div>
        </div>
        <button class="btn-remove-cart" data-action="remove-item" data-id="${item.id}" title="Remover da sacola">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        </button>
      </div>
    `).join('');

    elements.cartItemsBody.querySelectorAll('[data-action="remove-item"]').forEach(btn => {
      btn.addEventListener('click', () => removeFromCart(btn.getAttribute('data-id')));
    });
  }

  function checkoutViaWhatsApp() {
    if (cart.length === 0) return;

    const subtotal = cart.reduce((sum, item) => sum + Number(item.price), 0);
    let itemsText = cart.map(item => `• ${item.title} (Tam ${item.size}) - R$ ${Number(item.price).toFixed(2).replace('.', ',')}`).join('\n');

    const msg = `Olá, Mogno Brechó! 🌿☀️\n\nAdorei o acervo e gostaria de reservar as seguintes peças:\n\n${itemsText}\n\n*Total:* R$ ${subtotal.toFixed(2).replace('.', ',')}\n\nComo combinamos o pagamento e o envio?`;
    const encoded = encodeURIComponent(msg);
    // WhatsApp URL (usa número placeholder brasileiro amigável)
    const waUrl = `https://api.whatsapp.com/send?phone=5579999009560&text=${encoded}`;
    window.open(waUrl, '_blank');
  }

  // --- PAINEL DE ADMINISTRAÇÃO (CRUD & MÉTRICAS) ---
  function renderAdminMetrics() {
    const total = products.length;
    const available = products.filter(p => p.status !== 'vendido').length;
    const sold = products.filter(p => p.status === 'vendido').length;
    const totalValue = products
      .filter(p => p.status !== 'vendido')
      .reduce((sum, p) => sum + Number(p.price), 0);

    if (elements.adminMetricTotal) elements.adminMetricTotal.textContent = total;
    if (elements.adminMetricAvailable) elements.adminMetricAvailable.textContent = available;
    if (elements.adminMetricSold) elements.adminMetricSold.textContent = sold;
    if (elements.adminMetricValue) {
      elements.adminMetricValue.textContent = `R$ ${totalValue.toFixed(2).replace('.', ',')}`;
    }
  }

  function renderAdminList() {
    if (!elements.adminItemsList) return;

    let items = products;
    if (adminStatusFilter === 'disponivel') {
      items = products.filter(p => p.status !== 'vendido');
    } else if (adminStatusFilter === 'vendido') {
      items = products.filter(p => p.status === 'vendido');
    }

    if (items.length === 0) {
      elements.adminItemsList.innerHTML = `
        <div style="text-align: center; padding: 40px; color: var(--c-charcoal-500);">
          Nenhuma peça com o status selecionado.
        </div>
      `;
      return;
    }

    elements.adminItemsList.innerHTML = items.map(product => {
      const isSold = product.status === 'vendido';
      return `
        <div class="admin-item-card" data-id="${product.id}">
          <div class="admin-item-left">
            <img src="${product.image}" alt="${product.title}" class="admin-item-thumb" onerror="this.src='https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=300&q=80'">
            <div class="admin-item-info">
              <h4 class="admin-item-title">${product.title}</h4>
              <div class="admin-item-tags">
                <span class="status-pill ${isSold ? 'status-sold' : 'status-available'}">
                  ${isSold ? 'Vendido' : 'Disponível'}
                </span>
                <span>Tam: <strong>${product.size}</strong></span>
                <span>•</span>
                <span>${product.brand}</span>
                <span>•</span>
                <span>${product.category}</span>
              </div>
            </div>
          </div>

          <div class="admin-item-price">
            R$ ${Number(product.price).toFixed(2).replace('.', ',')}
          </div>

          <div class="admin-item-actions">
            ${isSold ? `
              <button class="btn-admin-action btn-toggle-available" data-action="toggle-status" data-id="${product.id}" title="Reativar peça na vitrine">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                Tornar Disponível
              </button>
            ` : `
              <button class="btn-admin-action btn-toggle-sold" data-action="toggle-status" data-id="${product.id}" title="Marcar como vendido">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                Marcar Vendida
              </button>
            `}

            <button class="btn-admin-action btn-edit-item" data-action="edit-item" data-id="${product.id}" title="Editar informações">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              Editar
            </button>

            <button class="btn-admin-action btn-delete-item" data-action="delete-item" data-id="${product.id}" title="Remover do catálogo">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Listeners de ações da lista
    elements.adminItemsList.querySelectorAll('[data-action="toggle-status"]').forEach(btn => {
      btn.addEventListener('click', () => toggleProductStatus(btn.getAttribute('data-id')));
    });

    elements.adminItemsList.querySelectorAll('[data-action="edit-item"]').forEach(btn => {
      btn.addEventListener('click', () => openEditModal(btn.getAttribute('data-id')));
    });

    elements.adminItemsList.querySelectorAll('[data-action="delete-item"]').forEach(btn => {
      btn.addEventListener('click', () => deleteProduct(btn.getAttribute('data-id')));
    });
  }

  // Alternar status (Disponível <-> Vendido)
  function toggleProductStatus(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    if (product.status === 'vendido') {
      product.status = 'disponivel';
      showToast(`Peça "${product.title}" agora está DISPONÍVEL!`);
    } else {
      product.status = 'vendido';
      // Se estava no carrinho, remove para evitar inconsistência
      cart = cart.filter(item => item.id !== productId);
      saveCart();
      renderCart();
      showToast(`Peça "${product.title}" marcada como VENDIDA!`, 'info');
    }

    saveProducts();
    renderAdminMetrics();
    renderAdminList();
    renderStoreCatalog();
  }

  // Deletar peça
  function deleteProduct(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const confirmed = confirm(`Tem certeza que deseja remover permanentemente a peça "${product.title}" do acervo?`);
    if (!confirmed) return;

    products = products.filter(p => p.id !== productId);
    cart = cart.filter(item => item.id !== productId);
    saveProducts();
    saveCart();
    renderAdminMetrics();
    renderAdminList();
    renderStoreCatalog();
    renderCart();
    showToast(`Peça removida com sucesso!`);
  }

  // Adicionar Nova Peça (Form Admin)
  function handleAddProductSubmit(e) {
    e.preventDefault();

    const title = document.getElementById('prod-title').value.trim();
    const category = document.getElementById('prod-category').value;
    const size = document.getElementById('prod-size').value;
    const price = parseFloat(document.getElementById('prod-price').value);
    const originalPrice = parseFloat(document.getElementById('prod-original-price').value) || (price * 2.2);
    const brand = document.getElementById('prod-brand').value.trim() || 'Garimpo Vintage';
    const material = document.getElementById('prod-material').value.trim() || 'Linho & Algodão';
    const condition = document.getElementById('prod-condition').value;
    const vibe = document.getElementById('prod-vibe').value.trim() || 'Maresia & Mogno';
    const badge = document.getElementById('prod-badge').value.trim() || 'Peça Única';
    const description = document.getElementById('prod-desc').value.trim();
    const measurements = document.getElementById('prod-measurements').value.trim();
    let image = elements.imageUrlInput.value.trim();

    if (!image) {
      // Usa uma imagem padrão de praia/vintage se não informada
      image = 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=1000&q=80';
    }

    const newProduct = {
      id: 'mg-' + Date.now().toString(36),
      title,
      category,
      brand,
      size,
      material,
      condition,
      price,
      originalPrice,
      status: 'disponivel',
      badge,
      image,
      description,
      measurements,
      vibe
    };

    // Adiciona ao topo
    products.unshift(newProduct);
    saveProducts();

    // Reset formulário
    elements.adminForm.reset();
    showToast(`Nova roupa "${newProduct.title}" cadastrada na vitrine!`);

    // Atualiza views
    renderAdminMetrics();
    renderAdminList();
    renderStoreCatalog();
  }

  // Modal de Edição (Admin)
  function openEditModal(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    currentEditingId = productId;

    document.getElementById('edit-prod-title').value = product.title || '';
    document.getElementById('edit-prod-category').value = product.category || 'vestidos';
    document.getElementById('edit-prod-size').value = product.size || 'M';
    document.getElementById('edit-prod-price').value = product.price || '';
    document.getElementById('edit-prod-original-price').value = product.originalPrice || '';
    document.getElementById('edit-prod-brand').value = product.brand || '';
    document.getElementById('edit-prod-material').value = product.material || '';
    document.getElementById('edit-prod-condition').value = product.condition || 'Impecável';
    document.getElementById('edit-prod-status').value = product.status || 'disponivel';
    document.getElementById('edit-prod-vibe').value = product.vibe || '';
    document.getElementById('edit-prod-image-url').value = product.image || '';
    document.getElementById('edit-prod-desc').value = product.description || '';
    document.getElementById('edit-prod-measurements').value = product.measurements || '';

    elements.editModalBackdrop.classList.add('active');
  }

  function closeEditModal() {
    currentEditingId = null;
    elements.editModalBackdrop.classList.remove('active');
  }

  function handleEditProductSubmit(e) {
    e.preventDefault();
    if (!currentEditingId) return;

    const product = products.find(p => p.id === currentEditingId);
    if (!product) return;

    product.title = document.getElementById('edit-prod-title').value.trim();
    product.category = document.getElementById('edit-prod-category').value;
    product.size = document.getElementById('edit-prod-size').value;
    product.price = parseFloat(document.getElementById('edit-prod-price').value);
    product.originalPrice = parseFloat(document.getElementById('edit-prod-original-price').value) || null;
    product.brand = document.getElementById('edit-prod-brand').value.trim();
    product.material = document.getElementById('edit-prod-material').value.trim();
    product.condition = document.getElementById('edit-prod-condition').value;
    product.status = document.getElementById('edit-prod-status').value;
    product.vibe = document.getElementById('edit-prod-vibe').value.trim();
    product.image = document.getElementById('edit-prod-image-url').value.trim() || product.image;
    product.description = document.getElementById('edit-prod-desc').value.trim();
    product.measurements = document.getElementById('edit-prod-measurements').value.trim();

    saveProducts();
    closeEditModal();
    showToast(`Peça "${product.title}" atualizada com sucesso!`);

    renderAdminMetrics();
    renderAdminList();
    renderStoreCatalog();
  }

  // --- TOAST NOTIFICATIONS ---
  function showToast(message, type = 'success') {
    if (!elements.toastContainer) return;

    const toast = document.createElement('div');
    toast.className = 'toast-message';

    let iconSvg = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="color: var(--c-magno-primary);">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>
    `;

    if (type === 'warning') {
      iconSvg = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="color: var(--c-amber-gold);">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
      `;
    }

    toast.innerHTML = `${iconSvg}<span>${message}</span>`;
    elements.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(15px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // --- EVENT LISTENERS ---
  function setupEventListeners() {
    // Alternar Loja vs Admin
    if (elements.btnViewStore) {
      elements.btnViewStore.addEventListener('click', () => switchView('store'));
    }
    if (elements.btnViewAdmin) {
      elements.btnViewAdmin.addEventListener('click', () => switchView('admin'));
    }

    // Acesso Restrito: 5 cliques no logo OU Ctrl/Cmd+Alt+M abrem a senha
    if (elements.brandLogo) {
      elements.brandLogo.addEventListener('click', handleSecretLogoClick);
    }
    document.addEventListener('keydown', handleSecretKeyShortcut);

    if (elements.adminPasswordForm) {
      elements.adminPasswordForm.addEventListener('submit', handlePasswordSubmit);
    }
    if (elements.btnClosePasswordModal) {
      elements.btnClosePasswordModal.addEventListener('click', closePasswordModal);
    }
    if (elements.adminPasswordModal) {
      elements.adminPasswordModal.addEventListener('click', (e) => {
        if (e.target === elements.adminPasswordModal) closePasswordModal();
      });
    }
    if (elements.btnLockAdmin) {
      elements.btnLockAdmin.addEventListener('click', lockAdminAccess);
    }

    // Menu Mobile (Hambúrguer)
    if (elements.btnMobileMenuToggle) {
      elements.btnMobileMenuToggle.addEventListener('click', toggleMobileMenu);
    }
    if (elements.mobileNavBackdrop) {
      elements.mobileNavBackdrop.addEventListener('click', closeMobileMenu);
    }
    elements.mobileNavLinks.forEach(link => {
      link.addEventListener('click', closeMobileMenu);
    });
    window.addEventListener('resize', () => {
      if (window.innerWidth > 900) closeMobileMenu();
    });

    // Filtros de Categoria
    elements.categoryPills.forEach(pill => {
      pill.addEventListener('click', () => {
        activeCategory = pill.getAttribute('data-category');
        updateFilterPillStyles();
        renderStoreCatalog();
      });
    });

    // Filtros de Tamanho
    elements.sizeFilters.forEach(pill => {
      pill.addEventListener('click', () => {
        activeSize = pill.getAttribute('data-size');
        updateFilterPillStyles();
        renderStoreCatalog();
      });
    });

    // Filtros de Estado da Peça
    elements.conditionFilters.forEach(pill => {
      pill.addEventListener('click', () => {
        activeCondition = pill.getAttribute('data-condition');
        updateFilterPillStyles();
        renderStoreCatalog();
      });
    });

    // Busca com debounce simples
    if (elements.searchInput) {
      elements.searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        renderStoreCatalog();
      });
    }

    // Ordenação
    if (elements.sortSelect) {
      elements.sortSelect.addEventListener('change', (e) => {
        activeSort = e.target.value;
        renderStoreCatalog();
      });
    }

    // Sacola Drawer
    if (elements.cartTriggerBtn) {
      elements.cartTriggerBtn.addEventListener('click', openCart);
    }
    if (elements.btnCloseCart) {
      elements.btnCloseCart.addEventListener('click', closeCart);
    }
    if (elements.cartDrawerOverlay) {
      elements.cartDrawerOverlay.addEventListener('click', (e) => {
        if (e.target === elements.cartDrawerOverlay) closeCart();
      });
    }
    if (elements.btnWhatsappCheckout) {
      elements.btnWhatsappCheckout.addEventListener('click', checkoutViaWhatsApp);
    }

    // Modal de Detalhes
    if (elements.btnCloseDetailModal) {
      elements.btnCloseDetailModal.addEventListener('click', closeDetailModal);
    }
    if (elements.detailModalBackdrop) {
      elements.detailModalBackdrop.addEventListener('click', (e) => {
        if (e.target === elements.detailModalBackdrop) closeDetailModal();
      });
    }

    // Admin - Status Tabs (Todos, Disponível, Vendido)
    elements.adminStatusTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        elements.adminStatusTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        adminStatusFilter = tab.getAttribute('data-status');
        renderAdminList();
      });
    });

    // Admin - Form Adicionar
    if (elements.adminForm) {
      elements.adminForm.addEventListener('submit', handleAddProductSubmit);
    }

    // Admin - Presets rápidos de imagem
    elements.imagePresetBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const url = btn.getAttribute('data-url');
        if (elements.imageUrlInput && url) {
          elements.imageUrlInput.value = url;
          showToast('Foto do preset selecionada!');
        }
      });
    });

    // Admin - Upload de imagem local (FileReader)
    if (elements.imageFileInput) {
      elements.imageFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            if (elements.imageUrlInput) {
              elements.imageUrlInput.value = event.target.result;
              showToast('Foto carregada do dispositivo!');
            }
          };
          reader.readAsDataURL(file);
        }
      });
    }

    // Admin - Restaurar Catálogo Inicial
    if (elements.btnResetCatalog) {
      elements.btnResetCatalog.addEventListener('click', () => {
        const ok = confirm('Deseja restaurar o acervo com a curadoria original de peças?');
        if (ok) {
          products = JSON.parse(JSON.stringify(DEFAULT_PRODUCTS));
          saveProducts();
          renderAdminMetrics();
          renderAdminList();
          renderStoreCatalog();
          showToast('Catálogo padrão restaurado com sucesso!');
        }
      });
    }

    // Modal de Edição (Admin)
    if (elements.btnCloseEditModal) {
      elements.btnCloseEditModal.addEventListener('click', closeEditModal);
    }
    if (elements.editModalBackdrop) {
      elements.editModalBackdrop.addEventListener('click', (e) => {
        if (e.target === elements.editModalBackdrop) closeEditModal();
      });
    }
    if (elements.editProductForm) {
      elements.editProductForm.addEventListener('submit', handleEditProductSubmit);
    }

    // Fechar modais ao teclar ESC
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeCart();
        closeDetailModal();
        closeEditModal();
      }
    });
  }

  // Iniciar após carregar o DOM
  document.addEventListener('DOMContentLoaded', init);
})();
