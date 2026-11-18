/**
 * Mogno Brechó - Aplicação Principal
 * Gerenciamento de Vitrine, Sacola, Filtros e Painel Administrativo Completo
 */

(function () {
  'use strict';

  // --- ESTADO DA APLICAÇÃO ---
  const STORAGE_KEY_CART = 'magno_brecho_cart_v1';
  const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  let catalogState = storeApi.configured ? 'loading' : 'demo';
  let pendingCheckout;
  let checkoutBusy = false;
  let orderRead = 0;
  let orderPage = 0;
  let catalogRead = 0;

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[character]);
  }

  let products = [];
  let cart = [];
  let activeCategory = 'todos';
  let activeSize = 'todos';
  let activeCondition = 'todos';
  let searchQuery = '';
  let activeSort = 'recent';
  let adminStatusFilter = 'todos';
  let editingProduct = null;

  // --- ELEMENTOS DO DOM ---
  const elements = {
    // Views
    storeView: document.getElementById('store-view'),
    adminView: document.getElementById('admin-view'),
    btnViewStore: document.getElementById('btn-view-store'),
    btnViewAdmin: document.getElementById('btn-view-admin'),

    categoryPills: document.querySelectorAll('.pill-filter'),
    sizeFilters: document.querySelectorAll('.tag-size-filter'),
    conditionFilters: document.querySelectorAll('.condition-chip'),
    searchInput: document.getElementById('search-products-input'),
    sortSelect: document.getElementById('sort-products-select'),
    btnClearAllFilters: document.getElementById('btn-clear-all-filters'),
    filtersBar: document.getElementById('filters-bar'),
    densityBtns: document.querySelectorAll('.density-btn'),
    productsGrid: document.getElementById('products-grid'),
    catalogCounter: document.getElementById('catalog-counter'),

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
    adminPasswordModal: document.getElementById('admin-password-modal'),
    adminPasswordForm: document.getElementById('admin-password-form'),
    adminPasswordInput: document.getElementById('admin-password-input'),
    passwordErrorMsg: document.getElementById('password-error-msg'),
    btnClosePasswordModal: document.getElementById('btn-close-password-modal'),
    btnLockAdmin: document.getElementById('btn-lock-admin'),

    // Popover explicativo de estado de conservação
    btnConditionInfo: document.getElementById('btn-condition-info'),
    conditionInfoPopover: document.getElementById('condition-info-popover'),
    btnCloseConditionInfo: document.getElementById('btn-close-condition-info'),

    // Menu Mobile (Hambúrguer)
    siteNav: document.getElementById('site-nav'),
    btnMobileMenuToggle: document.getElementById('btn-mobile-menu-toggle'),
    mobileNavBackdrop: document.getElementById('mobile-nav-backdrop'),
    mobileNavLinks: document.querySelectorAll('#site-nav .nav-link')
  };

  // --- INICIALIZAÇÃO ---
  function init() {
    loadCart();
    if (storeApi.configured) refreshCatalog();
    else products = prepareProductVisuals(DEFAULT_PRODUCTS);
    populateSourcePresets();
    setupEventListeners();
    renderStoreCatalog();
    renderCart();
    renderAdminMetrics();
    renderAdminList();
  }

  function populateSourcePresets() {
    const datalist = document.getElementById('source-presets-list');
    if (!datalist || typeof SOURCE_PRESETS === 'undefined') return;
    datalist.innerHTML = SOURCE_PRESETS.map(place => `<option value="${place}"></option>`).join('');
  }

  // --- ACESSO RESTRITO AO PAINEL ADMIN ---
  function openPasswordModal() {
    if (!elements.adminPasswordModal.open) {
      elements.adminPasswordModal.showModal();
      if (elements.passwordErrorMsg) elements.passwordErrorMsg.style.display = 'none';
      document.getElementById('admin-email').focus();
    }
  }

  function closePasswordModal() {
    if (elements.adminPasswordModal) {
      elements.adminPasswordModal.close();
      if (elements.adminPasswordForm) elements.adminPasswordForm.reset();
    }
  }

  async function handlePasswordSubmit(e) {
    e.preventDefault();
    const button = e.submitter;
    const message = elements.passwordErrorMsg;
    message.style.display = 'none';
    button.disabled = true;
    try {
      if (!storeApi.configured) throw new Error('not_configured');
      await storeApi.signIn(document.getElementById('admin-email').value.trim(), elements.adminPasswordInput.value);
      elements.btnViewAdmin.style.display = 'inline-flex';
      closePasswordModal();
      switchView('admin');
    } catch (error) {
      message.textContent = error.message === 'not_configured'
        ? 'Conecte a loja ao Supabase para acessar o painel.'
        : 'Não foi possível entrar. Confira as credenciais e a permissão de acesso.';
      message.style.display = 'block';
    } finally {
      button.disabled = false;
    }
  }

  function lockAdminAccess() {
    ++orderRead;
    orderPage = 0;
    storeApi.signOut();
    document.getElementById('order-list').replaceChildren();
    elements.btnViewAdmin.style.display = 'none';
    switchView('store');
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
      elements.btnMobileMenuToggle.setAttribute('aria-label', 'Fechar menu');
      elements.btnMobileMenuToggle.querySelector('.menu-toggle-label').textContent = 'Fechar';
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
      elements.btnMobileMenuToggle.setAttribute('aria-label', 'Abrir menu');
      elements.btnMobileMenuToggle.querySelector('.menu-toggle-label').textContent = 'Menu';
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

  const hangingImages = Object.fromEntries(['01','02','03','05','06','07','09'].map(n => ['mg-'+n, 'assets/hanging-mg-'+n+'.png']));
  function prepareProductVisuals(items) {
    return items.map(product => {
      const original = DEFAULT_PRODUCTS.find(p => p.id === product.id);
      const image = original && product.image === original.image && hangingImages[product.id] ? hangingImages[product.id] : product.image;
      return { ...product, image };
    });
  }

  async function refreshCatalog() {
    const read = ++catalogRead;
    try {
      const latest = await storeApi.products();
      if (read !== catalogRead) return;
      products = latest;
      const available = new Map(products.filter(p => p.status === 'disponivel').map(p => [p.id, p]));
      cart = cart.map(item => available.get(item?.id)).filter(Boolean);
      saveCart();
      catalogState = 'ready';
    } catch {
      if (read !== catalogRead) return;
      catalogState = 'error';
    }
    renderStoreCatalog();
    renderCart();
    renderAdminList();
    renderAdminMetrics();
  }

  function loadCart() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CART);
      const items = saved ? JSON.parse(saved) : [];
      cart = Array.isArray(items) ? items.filter(item => item && typeof item.id === "string") : [];
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
      if (!storeApi.isSignedIn()) return openPasswordModal();
      refreshOrders();
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

  // --- ESTADO DE CONSERVAÇÃO (helper visual) ---
  // Cada peça é classificada honestamente em 4 níveis, do melhor pro que precisa de mais atenção.
  const CONDITION_STYLES = {
    'Impecável': 'condition-impecavel',
    'Como Novo': 'condition-como-novo',
    'Reformado': 'condition-reformado',
    'Avarias': 'condition-avarias'
  };

  const CONDITION_LABELS = {
    'Impecável': 'Sem sinais de uso',
    'Como Novo': 'Como Novo',
    'Reformado': 'Reformado',
    'Avarias': 'Com Avarias'
  };

  function getConditionClass(condition) {
    return (Object.hasOwn(CONDITION_STYLES, condition) && CONDITION_STYLES[condition]) || 'condition-como-novo';
  }

  function getConditionLabel(condition) {
    return (Object.hasOwn(CONDITION_LABELS, condition) && CONDITION_LABELS[condition]) || condition || '';
  }

  function renderConditionTag(condition) {
    if (!condition) return '';
    return `<span class="condition-tag ${getConditionClass(condition)}"><span class="condition-dot"></span>${escapeHtml(getConditionLabel(condition))}</span>`;
  }

  function clearAllFilters() {
    activeCategory = 'todos';
    activeSize = 'todos';
    activeCondition = 'todos';
    searchQuery = '';
    if (elements.searchInput) elements.searchInput.value = '';
    if (elements.sortSelect) {
      elements.sortSelect.value = 'recent';
      activeSort = 'recent';
    }
    updateFilterPillStyles();
    renderStoreCatalog();
  }

  function hasActiveFilters() {
    return activeCategory !== 'todos' ||
      activeSize !== 'todos' ||
      activeCondition !== 'todos' ||
      searchQuery.trim() !== '';
  }

  function updateConditionCounts() {
    const available = products.filter(p => p.status !== 'vendido');
    const counts = {
      todos: available.length,
      'Impecável': 0,
      'Como Novo': 0,
      'Reformado': 0,
      'Avarias': 0
    };

    available.forEach(p => {
      if (counts[p.condition] !== undefined) counts[p.condition]++;
    });

    document.querySelectorAll('[data-count-for]').forEach(el => {
      const key = el.getAttribute('data-count-for');
      el.textContent = counts[key] != null ? counts[key] : 0;
    });
  }

  function catalogCategory(item) {
    if (storeApi.configured) return item.category;
    const title = (item.title || '').toLocaleLowerCase('pt-BR');
    if (/^saia\b/.test(title)) return 'saias';
    if (/^calça\b/.test(title)) return 'calcas';
    if (/^conjunto\b/.test(title)) return 'conjuntos';
    return item.category;
  }

  // --- RENDERIZAÇÃO DA VITRINE (LOJA) ---
  function renderStoreCatalog() {
    const status = document.getElementById('catalog-status');
    status.textContent = {
      loading: 'Carregando o catálogo…',
      error: 'O catálogo está indisponível. Tente carregar novamente.',
      demo: 'Catálogo demonstrativo. Os pedidos serão liberados quando a loja estiver conectada.',
      ready: ''
    }[catalogState];
    document.getElementById('retry-catalog').hidden = catalogState !== 'error';
    if (!elements.productsGrid) return;

    updateConditionCounts();

    // Filtragem
    let filtered = products.filter(item => {
      // Categoria
      if (activeCategory !== 'todos' && catalogCategory(item) !== activeCategory) return false;
      // Tamanho
      if (activeSize !== 'todos' && item.size !== activeSize) return false;
      // Estado
      if (activeCondition !== 'todos' && item.condition !== activeCondition) return false;
      // Busca
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(query);
        const matchBrand = (item.brand || '').toLowerCase().includes(query);
        const matchMat = (item.material || '').toLowerCase().includes(query);
        const matchDesc = (item.description || '').toLowerCase().includes(query);
        const matchCondition = getConditionLabel(item.condition).toLowerCase().includes(query);
        if (!matchTitle && !matchBrand && !matchMat && !matchDesc && !matchCondition) return false;
      }
      return true;
    });

    // Ordenação
    if (activeSort === 'price-asc') {
      filtered.sort((a, b) => a.price - b.price);
    } else if (activeSort === 'price-desc') {
      filtered.sort((a, b) => b.price - a.price);
    }

    // Keep apparel and accessories in separate, stable groups.
    filtered.sort((a,b) => Number(catalogCategory(a)==='acessorios') - Number(catalogCategory(b)==='acessorios'));

    // Atualiza contador e botão limpar
    const countDisponiveis = filtered.filter(p => p.status !== 'vendido').length;
    if (elements.catalogCounter) {
      elements.catalogCounter.textContent = `${countDisponiveis} peça${countDisponiveis !== 1 ? 's' : ''} ${countDisponiveis !== 1 ? 'disponíveis' : 'disponível'}`;
    }
    if (elements.btnClearAllFilters) {
      elements.btnClearAllFilters.hidden = !hasActiveFilters();
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
      if (clearBtn) clearBtn.addEventListener('click', clearAllFilters);
      return;
    }

    elements.productsGrid.innerHTML = filtered.map((product, index) => {
      const isSold = product.status === 'vendido';
      const savings = product.originalPrice ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) : 0;
      const conditionLabel = escapeHtml(getConditionLabel(product.condition));
      const accessory = catalogCategory(product) === 'acessorios';
      const newGroup = index === 0 || accessory !== (catalogCategory(filtered[index-1]) === 'acessorios');
      const groupHeading = newGroup ? `<div class="wardrobe-group-heading"><h3>${accessory ? 'Bolsas & acessórios' : 'Roupas'}</h3><p>${accessory ? 'Os detalhes que acompanham seu jeito de vestir.' : 'Seu próximo achado, peça por peça.'}</p></div>` : '';


      return `
        ${groupHeading}
        <article class="product-card ${catalogCategory(product) === 'acessorios' ? 'accessory-card' : 'clothing-card'}" data-id="${escapeHtml(product.id)}" tabindex="0" role="button" aria-label="Ver detalhes de ${escapeHtml(product.title)}" style="animation-delay: ${Math.min(index * 40, 280)}ms">
          ${catalogCategory(product) !== 'acessorios' ? `<div class="rack-hanger" aria-hidden="true"><svg viewBox="0 0 200 72" fill="none"><path d="M100 24v-7c0-10 15-10 15-1 0 5-6 7-10 9l-5 4M100 29 19 60q-5 4 2 5h158q7-1 2-5L100 29Z" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg></div>` : '<div class="accessory-shelf-spacer"></div>'}
          <div class="card-media-wrap">
            <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.title)}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=800&q=80'">

            <div class="card-badges">
              ${isSold
                ? `<span class="badge-item badge-sold">Esgotado</span>`
                : `<span class="badge-item badge-nature">${escapeHtml(product.badge || 'Peça Única')}</span>`}

            </div>



            ${isSold ? `
              <div class="sold-stamp-overlay">
                <span class="sold-stamp">Vendido</span>
              </div>
            ` : `
              <div class="card-quick-actions">
                <button class="btn-quick-view" data-action="quick-view" data-id="${escapeHtml(product.id)}">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                  Ver a peça
                </button>
                <button class="btn-quick-cart" data-action="add-cart" data-id="${escapeHtml(product.id)}" title="Adicionar à Sacola" aria-label="Adicionar à sacola">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
                </button>
              </div>
            `}
          </div>

          <div class="card-content">
            <div class="card-brand-row">
              <span class="card-brand">${escapeHtml(product.brand)}</span>
              <span class="card-size-tag">Tam ${escapeHtml(product.size)}</span>
            </div>

            <h3 class="card-title">${escapeHtml(product.title)}</h3>

            ${product.source ? `
              <div class="card-source-tag">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 10c0 6-9 13-9 13s-9-7-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                Garimpado no <strong>${escapeHtml(product.source)}</strong>
              </div>
            ` : ''}

            <div class="card-details-meta">
              <span>${escapeHtml(product.material || 'Linho / Sarja')}</span>
              <span class="dot"></span>
              ${renderConditionTag(product.condition)}
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

    // Interações dos cards
    elements.productsGrid.querySelectorAll('.product-card').forEach(card => {
      const id = card.getAttribute('data-id');
      card.addEventListener('click', (e) => {
        if (e.target.closest('[data-action]')) return;
        openProductDetail(id);
      });
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openProductDetail(id);
        }
      });
    });

    elements.productsGrid.querySelectorAll('[data-action="quick-view"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openProductDetail(btn.getAttribute('data-id'));
      });
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
      pill.classList.toggle('active', pill.getAttribute('data-category') === activeCategory);
    });

    elements.sizeFilters.forEach(pill => {
      pill.classList.toggle('active', pill.getAttribute('data-size') === activeSize);
    });

    elements.conditionFilters.forEach(pill => {
      pill.classList.toggle('active', pill.getAttribute('data-condition') === activeCondition);
    });
  }

  // --- MODAL DE DETALHES DO PRODUTO (QUICK VIEW) ---
  function openProductDetail(productId) {
    const product = products.find(p => p.id === productId);
    if (!product || !elements.detailModalContent) return;

    const isSold = product.status === 'vendido';
    const savings = product.originalPrice ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) : 0;

    elements.detailModalContent.innerHTML = `
      <div class="modal-gallery-side wardrobe-open ${catalogCategory(product) === 'acessorios' ? 'accessory-view' : ''}">${catalogCategory(product) !== 'acessorios' ? `<div class="rack-hanger" aria-hidden="true"><svg viewBox="0 0 200 72" fill="none"><path d="M100 24v-7c0-10 15-10 15-1 0 5-6 7-10 9l-5 4M100 29 19 60q-5 4 2 5h158q7-1 2-5L100 29Z" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg></div>` : ''}<div class="piece-stage" tabindex="0" aria-label="Visualização com profundidade. Arraste ou use as setas para inclinar a foto.">
        <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.title)}" draggable="false" decoding="async">
        ${isSold ? `<div class="sold-stamp-overlay"><span class="sold-stamp">Vendido</span></div>` : ''}</div><label class="piece-zoom">Ampliar <input type="range" min="1" max="1.8" step="0.05" value="1" aria-label="Ampliar foto da peça"></label><p class="piece-view-hint">Arraste para inclinar · use o controle para ampliar</p>
      </div>
      <div class="modal-info-side">
        <span class="modal-brand-tag">${escapeHtml(product.brand)}</span>
        <h2 class="modal-title">${escapeHtml(product.title)}</h2>

        <div class="modal-price-box">
          <span class="modal-current-price">R$ ${Number(product.price).toFixed(2).replace('.', ',')}</span>
          ${product.originalPrice ? `<span class="original-price" style="font-size: 1.1rem;">R$ ${Number(product.originalPrice).toFixed(2).replace('.', ',')}</span>` : ''}
          ${savings > 0 ? `<span class="savings-tag">Economia de ${savings}%</span>` : ''}
        </div>

        <div class="modal-meta-grid">
          <div class="modal-meta-item">
            <small>Tamanho</small>
            <strong>${escapeHtml(product.size)}</strong>
          </div>
          <div class="modal-meta-item">
            <small>Estado da Peça</small>
            <strong>${renderConditionTag(product.condition)}</strong>
          </div>
          <div class="modal-meta-item">
            <small>Composição</small>
            <strong>${escapeHtml(product.material || 'Fibras Nobres')}</strong>
          </div>
          <div class="modal-meta-item">
            <small>Atmosfera / Vibe</small>
            <strong>${escapeHtml(product.vibe || 'Maresia & Mogno')}</strong>
          </div>
          ${product.source ? `
            <div class="modal-meta-item">
              <small>Garimpado em</small>
              <strong>${escapeHtml(product.source)}</strong>
            </div>
          ` : ''}
        </div>

        <p class="modal-desc">${escapeHtml(product.description || 'Peça única, garimpada com carinho entre os brechós de Aracaju.')}</p>

        ${product.measurements ? `
          <div style="background: var(--c-sand-100); padding: 12px 16px; border-radius: 8px; margin-bottom: 24px; font-size: 0.82rem;">
            <strong style="display: block; margin-bottom: 2px; color: var(--c-charcoal-800);">Medidas Estimadas:</strong>
            <span style="color: var(--c-charcoal-600);">${escapeHtml(product.measurements)}</span>
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

    const stage = elements.detailModalContent.querySelector('.piece-stage');
    const zoom = elements.detailModalContent.querySelector('.piece-zoom input');
    let angleX = 0, angleY = 0, startPoint = null, scale = 1, pendingPieceFrame = false;
    const updatePiece = () => {
      stage.style.animation = 'none';
      if(pendingPieceFrame)return;
      pendingPieceFrame = true;
      requestAnimationFrame(() => {
        pendingPieceFrame = false;
        if(!stage.isConnected)return;
        stage.style.transform = `perspective(900px) translateZ(0) rotateX(${angleX}deg) rotateY(${angleY}deg) scale(${scale})`;
      });
    };
    stage.addEventListener('pointerdown', e => { if(e.pointerType==='mouse' && e.button!==0)return; e.preventDefault(); stage.focus({preventScroll:true}); stage.style.animation = 'none'; startPoint = {x:e.clientX,y:e.clientY,ax:angleX,ay:angleY}; stage.setPointerCapture(e.pointerId); });
    stage.addEventListener('pointermove', e => { if(!startPoint)return; angleY=Math.max(-24,Math.min(24,startPoint.ay+(e.clientX-startPoint.x)*.15)); angleX=Math.max(-16,Math.min(16,startPoint.ax-(e.clientY-startPoint.y)*.1)); updatePiece(); });
    stage.addEventListener('pointerup', e => { startPoint=null; if(stage.hasPointerCapture(e.pointerId))stage.releasePointerCapture(e.pointerId); });
    stage.addEventListener('lostpointercapture', () => {startPoint=null;});
    stage.addEventListener('dragstart', e => e.preventDefault());
    stage.addEventListener('pointercancel', () => { startPoint=null; });
    stage.addEventListener('keydown', e => { if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(e.key))return; e.preventDefault(); if(e.key==='Home'){angleX=0;angleY=0;}else{angleY=Math.max(-24,Math.min(24,angleY+(e.key==='ArrowRight'?4:e.key==='ArrowLeft'?-4:0)));angleX=Math.max(-16,Math.min(16,angleX+(e.key==='ArrowUp'?4:e.key==='ArrowDown'?-4:0)));}updatePiece(); });
    zoom.addEventListener('input', () => {scale=Number(zoom.value);updatePiece();});
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
    if (checkoutBusy) return;
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
    if (checkoutBusy) return;
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
    document.getElementById('checkout-notice').textContent = storeApi.whatsapp || !storeApi.configured
      ? 'Registre o pedido e combine pagamento e entrega pelo WhatsApp.'
      : 'A loja ainda precisa configurar o contato do WhatsApp.';
    elements.btnWhatsappCheckout.disabled = checkoutBusy || !cart.length || catalogState !== 'ready' || !storeApi.whatsapp;

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
      return;
    }

    // Calcula Subtotal
    const subtotal = cart.reduce((sum, item) => sum + Number(item.price), 0);
    if (elements.cartSubtotal) {
      elements.cartSubtotal.textContent = `R$ ${subtotal.toFixed(2).replace('.', ',')}`;
    }


    // Renderiza itens
    elements.cartItemsBody.innerHTML = cart.map(item => `
      <div class="cart-item-row" data-id="${escapeHtml(item.id)}">
        <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}" class="cart-item-img">
        <div class="cart-item-details">
          <h4 class="cart-item-name">${escapeHtml(item.title)}</h4>
          <div class="cart-item-meta">${escapeHtml(item.brand)} • Tam ${escapeHtml(item.size)}</div>
          <div class="cart-item-price">R$ ${Number(item.price).toFixed(2).replace('.', ',')}</div>
        </div>
        <button class="btn-remove-cart" data-action="remove-item" data-id="${escapeHtml(item.id)}" title="Remover da sacola">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        </button>
      </div>
    `).join('');

    elements.cartItemsBody.querySelectorAll('[data-action="remove-item"]').forEach(btn => {
      btn.addEventListener('click', () => removeFromCart(btn.getAttribute('data-id')));
    });
  }

  async function checkoutViaWhatsApp() {
    if (!cart.length || catalogState !== 'ready' || !storeApi.whatsapp) return;
    const button = elements.btnWhatsappCheckout;
    if (checkoutBusy || button.disabled) return;
    if (cart.length > 30) {
      document.getElementById('checkout-status').textContent = 'Registre até 30 peças por pedido.';
      return;
    }
    const status = document.getElementById('checkout-status');
    const link = document.getElementById('order-whatsapp');
    const ids = cart.map(item => item.id).sort();
    const subtotal = cart.reduce((sum, item) => sum + Math.round(Number(item.price) * 100), 0) / 100;
    const signature = JSON.stringify([ids, subtotal]);
    if (!pendingCheckout) {
      try {
        pendingCheckout = JSON.parse(sessionStorage.getItem('mogno-pending-order'));
      } catch {
        pendingCheckout = null;
      }
    }
    if (pendingCheckout?.signature !== signature || !/^[a-f0-9-]{36}$/.test(pendingCheckout.id)) {
      pendingCheckout = { signature, id: crypto.randomUUID() };
    }
    try {
      sessionStorage.setItem('mogno-pending-order', JSON.stringify(pendingCheckout));
    } catch {
      // The current tab can still retry using the in-memory order ID.
    }
    checkoutBusy = true;
    button.disabled = true;
    status.textContent = 'Registrando pedido…';
    link.hidden = true;
    try {
      const order = await storeApi.requestOrder(pendingCheckout.id, ids, subtotal);
      const message = [
        'Olá, Mogno Brechó! Gostaria de combinar o pagamento e a entrega.',
        'Pedido ' + order.id,
        ...order.items.map(item => '• ' + item.title + ' (' + item.size + ') — ' + money.format(item.price)),
        'Total das peças: ' + money.format(order.total)
      ].join('\n');
      link.href = 'https://wa.me/' + storeApi.whatsapp + '?text=' + encodeURIComponent(message);
      link.hidden = false;
      status.textContent = 'Pedido registrado. Envie o número pelo WhatsApp para confirmar a disponibilidade.';
      pendingCheckout = null;
      try {
        sessionStorage.removeItem('mogno-pending-order');
      } catch {
        // The order is already registered.
      }
      cart = cart.filter(item => !ids.includes(item.id));
      saveCart();
      renderCart();
      if (elements.cartDrawerOverlay.classList.contains('active')) link.focus();
    } catch (error) {
      if (['stock_changed', 'price_changed'].includes(error.message)) {
        await refreshCatalog();
        status.textContent = 'O estoque ou o preço mudou. Confira a sacola antes de tentar novamente.';
      } else {
        status.textContent = 'Não foi possível confirmar o registro. Tente novamente.';
      }
    } finally {
      checkoutBusy = false;
      button.disabled = !cart.length || catalogState !== 'ready' || !storeApi.whatsapp;
    }
  }

  async function refreshOrders() {
    const read = ++orderRead;
    const list = document.getElementById('order-list');
    const previous = document.getElementById('previous-orders');
    const next = document.getElementById('next-orders');
    previous.disabled = next.disabled = true;
    list.textContent = 'Carregando pedidos…';
    try {
      const orders = await storeApi.orders(orderPage);
      if (read !== orderRead || !storeApi.isSignedIn()) return;
      if (!orders.length && orderPage > 0) {
        orderPage--;
        return refreshOrders();
      }
      previous.disabled = orderPage === 0;
      next.disabled = orders.length <= 10;
      list.innerHTML = orders.slice(0, 10).map(order => `
        <article class="admin-item-card store-order">
          <div>
            <strong>Pedido ${escapeHtml(order.id)}</strong>
            <p>${order.items.map(item => escapeHtml(item.title)).join(', ')}</p>
            <p>${money.format(order.total)}</p>
          </div>
          <div class="admin-item-actions">
            <button class="btn-admin-action" data-sell="true" data-order="${escapeHtml(order.id)}">Confirmar venda</button>
            <button class="btn-admin-action" data-sell="false" data-order="${escapeHtml(order.id)}">Cancelar pedido</button>
          </div>
        </article>`).join('') || 'Nenhum pedido pendente.';
    } catch {
      if (read !== orderRead) return;
      list.textContent = storeApi.isSignedIn() ? 'Não foi possível carregar os pedidos.' : 'Entre novamente para consultar os pedidos.';
    }
  }

  function confirmAction(message, action, label) {
    const dialog = document.getElementById('store-confirm');
    dialog.querySelector('p').textContent = message;
    const button = dialog.querySelector('[value="accept"]');
    button.textContent = label;
    dialog.returnValue = '';
    dialog.addEventListener('close', () => {
      if (dialog.returnValue === 'accept') action();
    }, { once: true });
    dialog.showModal();
  }

  async function adminMutation(action, success) {
    try {
      await action();
      showToast(success);
      await refreshCatalog();
      return true;
    } catch (error) {
      if (!storeApi.isSignedIn()) {
        lockAdminAccess();
        openPasswordModal();
      }
      if (error.message === 'stale_product') await refreshCatalog();
      showToast(error.message === 'stale_product'
        ? 'A peça mudou em outra sessão. Confira o catálogo e tente novamente.'
        : error.message === 'stock_changed'
        ? 'Uma peça já foi vendida ou removida. Confira o pedido.'
        : error.message === 'invalid_image' ? 'Escolha JPG, PNG ou WebP de até 5 MB.'
        : 'Não foi possível salvar a alteração. Tente novamente.', 'warning');
      return false;
    }
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
        <div class="admin-item-card" data-id="${escapeHtml(product.id)}">
          <div class="admin-item-left">
            <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.title)}" class="admin-item-thumb" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=300&q=80'">
            <div class="admin-item-info">
              <h4 class="admin-item-title">${escapeHtml(product.title)}</h4>
              <div class="admin-item-tags">
                <span class="status-pill ${isSold ? 'status-sold' : 'status-available'}">
                  ${isSold ? 'Vendido' : 'Disponível'}
                </span>
                <span>Tam: <strong>${escapeHtml(product.size)}</strong></span>
                <span>•</span>
                <span>${escapeHtml(product.brand)}</span>
                <span>•</span>
                <span>${escapeHtml(product.category)}</span>
              </div>
            </div>
          </div>

          <div class="admin-item-price">
            R$ ${Number(product.price).toFixed(2).replace('.', ',')}
          </div>

          <div class="admin-item-actions">
            ${isSold ? `
              <button class="btn-admin-action btn-toggle-available" data-action="toggle-status" data-id="${escapeHtml(product.id)}" title="Reativar peça na vitrine">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                Tornar Disponível
              </button>
            ` : `
              <button class="btn-admin-action btn-toggle-sold" data-action="toggle-status" data-id="${escapeHtml(product.id)}" title="Marcar como vendido">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                Marcar Vendida
              </button>
            `}

            <button class="btn-admin-action btn-edit-item" data-action="edit-item" data-id="${escapeHtml(product.id)}" title="Editar informações">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              Editar
            </button>

            <button class="btn-admin-action btn-delete-item" data-action="delete-item" data-id="${escapeHtml(product.id)}" title="Remover do catálogo">
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
    const status = product.status === 'vendido' ? 'disponivel' : 'vendido';
    adminMutation(async () => {
      if (!(await storeApi.updateProduct(productId, { status }, product.updated_at)).length) throw new Error('stale_product');
    }, 'Status da peça atualizado.');
  }

  function deleteProduct(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    confirmAction('Remover “' + product.title + '” do catálogo?', () => adminMutation(async () => {
      if (!(await storeApi.deleteProduct(productId, product.updated_at)).length) throw new Error('stale_product');
    }, 'Peça removida.'), 'Remover peça');
  }

  // Adicionar Nova Peça (Form Admin)
  async function handleAddProductSubmit(e) {
    e.preventDefault();

    const title = document.getElementById('prod-title').value.trim();
    const category = document.getElementById('prod-category').value;
    const size = document.getElementById('prod-size').value;
    const price = parseFloat(document.getElementById('prod-price').value);
    const originalPrice = parseFloat(document.getElementById('prod-original-price').value) || (price * 2.2);
    const brand = document.getElementById('prod-brand').value.trim() || 'Garimpo Vintage';
    const material = document.getElementById('prod-material').value.trim() || 'Linho & Algodão';
    const condition = document.getElementById('prod-condition').value;
    const source = document.getElementById('prod-source').value.trim() || 'Garimpo por Aracaju';
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
      id: crypto.randomUUID(),
      title,
      category,
      brand,
      size,
      material,
      condition,
      source,
      price,
      originalPrice,
      status: 'disponivel',
      badge,
      image,
      description,
      measurements,
      vibe
    };

    const button = e.submitter;
    const file = elements.imageFileInput.files[0];
    button.disabled = true;
    try {
      if (image && !image.startsWith('https://')) {
        showToast('Use uma URL de foto começando com https://.', 'warning');
        elements.imageUrlInput.focus();
        return;
      }
      const saved = await adminMutation(async () => {
        if (file && !elements.imageUrlInput.value) newProduct.image = await storeApi.uploadImage(file);
        await storeApi.createProduct(newProduct);
      }, 'Peça cadastrada na vitrine.');
      if (saved) elements.adminForm.reset();
    } finally {
      button.disabled = false;
    }
  }

  // Modal de Edição (Admin)
  function openEditModal(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    editingProduct = product;

    document.getElementById('edit-prod-title').value = product.title || '';
    document.getElementById('edit-prod-category').value = product.category || 'vestidos';
    document.getElementById('edit-prod-size').value = product.size || 'M';
    document.getElementById('edit-prod-price').value = product.price || '';
    document.getElementById('edit-prod-original-price').value = product.originalPrice || '';
    document.getElementById('edit-prod-brand').value = product.brand || '';
    document.getElementById('edit-prod-material').value = product.material || '';
    document.getElementById('edit-prod-condition').value = product.condition || 'Impecável';
    document.getElementById('edit-prod-status').value = product.status || 'disponivel';
    document.getElementById('edit-prod-source').value = product.source || '';
    document.getElementById('edit-prod-vibe').value = product.vibe || '';
    document.getElementById('edit-prod-image-url').value = product.image || '';
    document.getElementById('edit-prod-desc').value = product.description || '';
    document.getElementById('edit-prod-measurements').value = product.measurements || '';

    elements.editModalBackdrop.classList.add('active');
  }

  function closeEditModal() {
    editingProduct = null;
    elements.editModalBackdrop.classList.remove('active');
  }

  async function handleEditProductSubmit(e) {
    e.preventDefault();
    const existing = editingProduct;
    if (!existing) return;
    const product = {};
    product.title = document.getElementById('edit-prod-title').value.trim();
    product.category = document.getElementById('edit-prod-category').value;
    product.size = document.getElementById('edit-prod-size').value;
    product.price = parseFloat(document.getElementById('edit-prod-price').value);
    product.originalPrice = parseFloat(document.getElementById('edit-prod-original-price').value) || null;
    product.brand = document.getElementById('edit-prod-brand').value.trim();
    product.material = document.getElementById('edit-prod-material').value.trim();
    product.condition = document.getElementById('edit-prod-condition').value;
    product.status = document.getElementById('edit-prod-status').value;
    product.source = document.getElementById('edit-prod-source').value.trim();
    product.vibe = document.getElementById('edit-prod-vibe').value.trim();
    const imageInput = document.getElementById('edit-prod-image-url');
    product.image = imageInput.value.trim() || existing.image;
    if (!product.image.startsWith('https://')) {
      showToast('Use uma URL de foto começando com https://.', 'warning');
      imageInput.focus();
      return;
    }
    product.description = document.getElementById('edit-prod-desc').value.trim();
    product.measurements = document.getElementById('edit-prod-measurements').value.trim();

    const button = e.submitter;
    button.disabled = true;
    try {
      const saved = await adminMutation(async () => {
        if (!(await storeApi.updateProduct(existing.id, product, existing.updated_at)).length) throw new Error('stale_product');
      }, 'Peça atualizada.');
      if (saved && editingProduct === existing) closeEditModal();
    } finally {
      button.disabled = false;
    }
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

    toast.innerHTML = `${iconSvg}<span>${escapeHtml(message)}</span>`;
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

    document.getElementById('admin-login').addEventListener('click', () => switchView('admin'));
    document.getElementById('retry-catalog').addEventListener('click', refreshCatalog);
    document.getElementById('refresh-orders').addEventListener('click', refreshOrders);
    document.getElementById('previous-orders').addEventListener('click', () => {
      orderPage--;
      refreshOrders();
    });
    document.getElementById('next-orders').addEventListener('click', () => {
      orderPage++;
      refreshOrders();
    });
    document.getElementById('order-list').addEventListener('click', e => {
      const button = e.target.closest('[data-order]');
      if (!button) return;
      const sell = button.dataset.sell === 'true';
      const label = sell ? 'Confirmar venda' : 'Cancelar pedido';
      confirmAction(sell ? 'Confirmar a venda e retirar as peças da disponibilidade?' : 'Cancelar este pedido pendente?', async () => {
        button.disabled = true;
        await adminMutation(() => storeApi.resolveOrder(button.dataset.order, sell), sell ? 'Venda confirmada.' : 'Pedido cancelado.');
        if (storeApi.isSignedIn()) refreshOrders();
      }, label);
    });
    const contact = document.getElementById('store-contact');
    if (storeApi.whatsapp) {
      contact.href = 'https://wa.me/' + storeApi.whatsapp;
      contact.hidden = false;
    }
    document.addEventListener('keydown', handleSecretKeyShortcut);

    if (elements.adminPasswordForm) {
      elements.adminPasswordForm.addEventListener('submit', handlePasswordSubmit);
    }
    if (elements.btnClosePasswordModal) {
      elements.btnClosePasswordModal.addEventListener('click', closePasswordModal);
    }
    elements.adminPasswordModal.addEventListener('close', () => elements.adminPasswordForm.reset());
    if (elements.btnLockAdmin) {
      elements.btnLockAdmin.addEventListener('click', lockAdminAccess);
    }

    // Popover explicativo de estado de conservação
    if (elements.btnConditionInfo && elements.conditionInfoPopover) {
      elements.btnConditionInfo.addEventListener('click', (e) => {
        e.stopPropagation();
        elements.conditionInfoPopover.classList.toggle('active');
      });
    }
    if (elements.btnCloseConditionInfo) {
      elements.btnCloseConditionInfo.addEventListener('click', () => {
        elements.conditionInfoPopover.classList.remove('active');
      });
    }
    document.addEventListener('click', (e) => {
      if (
        elements.conditionInfoPopover &&
        elements.conditionInfoPopover.classList.contains('active') &&
        !elements.conditionInfoPopover.contains(e.target) &&
        e.target !== elements.btnConditionInfo
      ) {
        elements.conditionInfoPopover.classList.remove('active');
      }
    });

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

    // Limpar todos os filtros
    if (elements.btnClearAllFilters) {
      elements.btnClearAllFilters.addEventListener('click', clearAllFilters);
    }

    // Densidade da grade (confortável / compacta)
    elements.densityBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const density = btn.getAttribute('data-density');
        elements.densityBtns.forEach(b => {
          b.classList.toggle('active', b === btn);
          b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
        });
        if (elements.productsGrid) {
          elements.productsGrid.classList.toggle('density-compact', density === 'compact');
        }
      });
    });

    // Destaque sticky da barra de filtros
    if (elements.filtersBar) {
      const onScroll = () => {
        const rect = elements.filtersBar.getBoundingClientRect();
        elements.filtersBar.classList.toggle('is-stuck', rect.top <= 76);
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }

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
      if (e.key === 'Escape' && !document.querySelector('dialog[open]')) {
        closeCart();
        closeDetailModal();
        closeEditModal();
      }
    });
  }

  // Iniciar após carregar o DOM
  document.addEventListener('DOMContentLoaded', init);
})();
