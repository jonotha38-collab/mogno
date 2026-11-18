const storeApi = (() => {
  const { url, publicKey, whatsapp } = window.MOGNO_CONFIG;
  const base = url.replace(/\/+$/, '');
  let token = null;
  let expiresAt = 0;

  function isSignedIn() {
    return Boolean(token && Date.now() < expiresAt);
  }

  async function request(path, { method = 'GET', body, admin = false, contentType = 'application/json', headers = {} } = {}) {
    if (admin && !isSignedIn()) throw new Error('session_expired');
    const response = await fetch(base + path, {
      method,
      headers: {
        apikey: publicKey,
        ...(admin ? { Authorization: 'Bearer ' + token } : {}),
        ...headers,
        ...(body === undefined ? {} : { 'Content-Type': contentType })
      },
      body: contentType === 'application/json' && body !== undefined ? JSON.stringify(body) : body,
      signal: AbortSignal.timeout(20000)
    });
    const raw = await response.text();
    const data = raw ? JSON.parse(raw) : null;
    if (!response.ok) throw new Error(data?.message || data?.msg || 'request_failed');
    return data;
  }

  const rpc = (name, body, admin = false) => request('/rest/v1/rpc/' + name, { method: 'POST', body, admin });

  async function signIn(email, password) {
    const session = await request('/auth/v1/token?grant_type=password', { method: 'POST', body: { email, password } });
    token = session.access_token;
    expiresAt = Date.now() + session.expires_in * 1000;
    try {
      if (!(await rpc('is_store_admin', {}, true))) throw new Error('not_authorized');
    } catch (error) {
      signOut();
      throw error;
    }
  }

  function signOut() {
    token = null;
    expiresAt = 0;
  }

  async function products() {
    const result = [];
    const pageSize = 100;
    for (let offset = 0; ; offset += pageSize) {
      const page = await request('/rest/v1/products?select=*&order=created_at.desc,id.asc&limit=' + pageSize + '&offset=' + offset);
      result.push(...page);
      if (page.length < pageSize) return result;
    }
  }

  async function uploadImage(file) {
    const extensions = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
    const extension = extensions[file.type];
    if (!extension || file.size > 5 * 1024 * 1024) throw new Error('invalid_image');
    const path = '/storage/v1/object/product-images/' + crypto.randomUUID() + '.' + extension;
    await request(path, { method: 'POST', body: file, admin: true, contentType: file.type });
    return base + path.replace('/object/', '/object/public/');
  }

  function productPath(id, version) {
    return '/rest/v1/products?id=eq.' + encodeURIComponent(id) + '&updated_at=eq.' + encodeURIComponent(version);
  }

  return {
    configured: Boolean(/^https:\/\/[^/]+$/i.test(base) && publicKey && !publicKey.startsWith('sb_secret_')),
    whatsapp: /^55\d{10,11}$/.test(whatsapp) ? whatsapp : '',
    signIn, signOut, isSignedIn, products, uploadImage,
    createProduct: body => request('/rest/v1/products', { method: 'POST', body, admin: true, headers: { Prefer: 'return=representation' } }),
    updateProduct: (id, body, version) => request(productPath(id, version), { method: 'PATCH', body, admin: true, headers: { Prefer: 'return=representation' } }),
    deleteProduct: (id, version) => request(productPath(id, version), { method: 'DELETE', admin: true, headers: { Prefer: 'return=representation' } }),
    orders: page => request('/rest/v1/orders?status=eq.pendente&order=created_at.asc,id.asc&limit=11&offset=' + page * 10, { admin: true }),
    requestOrder: (order_id, product_ids, expected_total) => rpc('request_order', { order_id, product_ids, expected_total }),
    resolveOrder: (order_id, sell) => rpc('resolve_order', { order_id, sell }, true)
  };
})();
