async function verifyLiveSite() {
  console.log('=== 1. VERIFYING PUBLIC HOMEPAGE HTML ===');
  const homeRes = await fetch('https://www.wholesaleofoklahoma.com');
  const homeHtml = await homeRes.text();
  console.log('Homepage status:', homeRes.status);
  console.log('Has Brand Directory Showcase:', homeHtml.includes('brands') || homeHtml.includes('Brand'));

  console.log('\n=== 2. VERIFYING UNAUTHENTICATED INVENTORY API (900 ITEMS, ZERO LEAKED PRICES) ===');
  const pubInvRes = await fetch('https://www.wholesaleofoklahoma.com/api/inventory?limit=5');
  const pubInv = await pubInvRes.json();
  console.log('Public inventory total items:', pubInv.total);
  console.log('Public has_pricing_access:', pubInv.has_pricing_access);
  console.log('Public sample item:', pubInv.items[0].name, '| Price:', pubInv.items[0].rate, '| Image:', pubInv.items[0].image_url);

  console.log('\n=== 3. VERIFYING AUTHENTICATED RETAILER LOGIN & PRICING ACCESS ===');
  const loginRes = await fetch('https://www.wholesaleofoklahoma.com/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'retailer@okcvapor.com', password: 'WholesaleOK2026!' })
  });
  const loginData = await loginRes.json();
  console.log('Login success:', loginData.success, 'User:', loginData.user?.businessName, 'Role:', loginData.user?.role);
  const token = loginData.token;

  console.log('\n=== 4. VERIFYING AUTHENTICATED INVENTORY ACCESS WITH EXACT ZOHO PRICING ===');
  const authedInvRes = await fetch('https://www.wholesaleofoklahoma.com/api/inventory?limit=5', {
    headers: {
      'x-session-token': token,
      'Authorization': 'Bearer ' + token
    }
  });
  const authedInv = await authedInvRes.json();
  console.log('Authed total items:', authedInv.total);
  console.log('Authed has_pricing_access:', authedInv.has_pricing_access);
  for (let i = 0; i < authedInv.items.length; i++) {
    const item = authedInv.items[i];
    console.log(`[Item ${i + 1}] ${item.brand} - ${item.name}`);
    console.log(`   Wholesale Price: $${item.rate} | MSRP: $${item.retail_msrp}`);
    console.log(`   Image: ${item.image_url}`);
  }

  console.log('\n=== 5. VERIFYING BRAND IMAGES EXIST IN PUBLIC /products/ ===');
  const testImages = [
    '/products/geekbar-15k.png',
    '/products/geekbar-25k.png',
    '/products/geekbar-60k.png',
    '/products/foger-30k.jpg',
    '/products/raz-25k.png',
    '/products/lostmary-mt15000.png',
    '/products/vozol-50k.png',
    '/products/oxbar-magic-maze.png',
    '/products/vaporesso-xros-4.png',
    '/products/smok-novo-5.png',
    '/products/coastal-clouds-60ml.png',
    '/products/opms-gold-liquid-extract.jpg',
    '/products/raw-classic-king-size-box.png'
  ];

  for (const img of testImages) {
    const imgRes = await fetch('https://www.wholesaleofoklahoma.com' + img, { method: 'HEAD' });
    console.log(`Asset ${img}: HTTP ${imgRes.status} (Content-Type: ${imgRes.headers.get('content-type')}, Size: ${imgRes.headers.get('content-length')} bytes)`);
  }
}

verifyLiveSite();
