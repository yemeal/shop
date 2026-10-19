const path = require('node:path');
const config = require('../src/config');
const initDB = require('./db');

const categories = [
  { id: 'cat-smartphones', name: 'Смартфоны и гаджеты' },
  { id: 'cat-computers', name: 'Ноутбуки и компьютеры' },
  { id: 'cat-audio', name: 'Аудиотехника' },
  { id: 'cat-smarthome', name: 'Умный дом и техника' },
];

const products = [
  // Смартфоны и гаджеты
  {
    id: 'prod-iphone-13-pro',
    sku: 'APL-IP13P-128',
    name: 'Смартфон Apple iPhone 13 Pro 128GB',
    description: 'Флагманский смартфон с дисплеем Super Retina XDR 120 Гц, процессором A15 Bionic и тройной системой камер 12 Мп с поддержкой режима «Киноэффект».',
    price: 79990,
    imageUrl: 'https://cdn.dummyjson.com/product-images/smartphones/iphone-13-pro/thumbnail.webp',
    categoryId: 'cat-smartphones',
  },
  {
    id: 'prod-iphone-x',
    sku: 'APL-IPX-64',
    name: 'Смартфон Apple iPhone X 64GB (Space Gray)',
    description: 'Инновационный смартфон с безрамочным OLED-дисплеем Super Retina, революционной системой распознавания лица Face ID и двойной камерой.',
    price: 39990,
    imageUrl: 'https://cdn.dummyjson.com/product-images/smartphones/iphone-x/thumbnail.webp',
    categoryId: 'cat-smartphones',
  },
  {
    id: 'prod-samsung-s10',
    sku: 'SAM-S10-128',
    name: 'Смартфон Samsung Galaxy S10 128GB Prism Black',
    description: 'Ультратонкий корпус, кинематографичный экран Dynamic AMOLED с ультразвуковым сканером отпечатка пальца и профессиональная тройная камера.',
    price: 44990,
    imageUrl: 'https://cdn.dummyjson.com/product-images/smartphones/samsung-galaxy-s10/thumbnail.webp',
    categoryId: 'cat-smartphones',
  },
  {
    id: 'prod-realme-xt',
    sku: 'RLM-XT-128',
    name: 'Смартфон Realme XT 8/128GB (Pearl Blue)',
    description: 'Квадрокамера 64 Мп с сенсором Samsung GW1, стеклянный корпус с градиентным переливом и быстрая зарядка VOOC Flash Charge 3.0.',
    price: 22990,
    imageUrl: 'https://cdn.dummyjson.com/product-images/smartphones/realme-xt/thumbnail.webp',
    categoryId: 'cat-smartphones',
  },
  {
    id: 'prod-oppo-f19-pro',
    sku: 'OPP-F19P-5G',
    name: 'Смартфон Oppo F19 Pro Plus 5G 128GB',
    description: 'Быстродействующий смартфон с поддержкой 5G, ночным режимом съемки видео Ultra Night Video и быстрой зарядкой мощностью 50 Вт Flash Charge.',
    price: 27990,
    imageUrl: 'https://cdn.dummyjson.com/product-images/smartphones/oppo-f19-pro-plus/thumbnail.webp',
    categoryId: 'cat-smartphones',
  },
  {
    id: 'prod-apple-watch-4',
    sku: 'APL-W4-GLD',
    name: 'Смарт-часы Apple Watch Series 4 Gold 44mm',
    description: 'Дисплей увеличенной площади с закругленными углами, электрический датчик сердечного ритма, колесико Digital Crown с тактильным откликом.',
    price: 26990,
    imageUrl: 'https://cdn.dummyjson.com/product-images/mobile-accessories/apple-watch-series-4-gold/thumbnail.webp',
    categoryId: 'cat-smartphones',
  },
  {
    id: 'prod-rolex-submariner',
    sku: 'RLX-SUB-DATE',
    name: 'Швейцарские механические часы Rolex Submariner Date',
    description: 'Эталон среди часов для подводного плавания. Корпус из стали Oystersteel, безель Cerachrom из устойчивой к царапинам керамики и водонепроницаемость 300 м.',
    price: 890000,
    imageUrl: 'https://cdn.dummyjson.com/product-images/mens-watches/rolex-submariner-watch/thumbnail.webp',
    categoryId: 'cat-smartphones',
  },

  // Ноутбуки и компьютеры
  {
    id: 'prod-macbook-pro-14',
    sku: 'APL-MBP14-SG',
    name: 'Ноутбук Apple MacBook Pro 14" Space Grey (M1 Pro)',
    description: 'Профессиональный лэптоп для создателей контента и разработчиков. Потрясающий экран Liquid Retina XDR, слот для карт SDXC и порт HDMI.',
    price: 159990,
    imageUrl: 'https://cdn.dummyjson.com/product-images/laptops/apple-macbook-pro-14-inch-space-grey/thumbnail.webp',
    categoryId: 'cat-computers',
  },
  {
    id: 'prod-asus-zenbook-dual',
    sku: 'ASUS-ZB-DUAL',
    name: 'Ультрабук ASUS Zenbook Pro Dual Screen (Два экрана)',
    description: 'Уникальный двухэкранный ноутбук со встроенным вспомогательным тачскрином ScreenPad Plus для многозадачной комфортной работы.',
    price: 124990,
    imageUrl: 'https://cdn.dummyjson.com/product-images/laptops/asus-zenbook-pro-dual-screen-laptop/thumbnail.webp',
    categoryId: 'cat-computers',
  },
  {
    id: 'prod-huawei-matebook-x',
    sku: 'HWI-MBX-PRO',
    name: 'Ноутбук Huawei Matebook X Pro 13.9" 3K Touch',
    description: 'Безрамочный сенсорный экран 3K FullView, легкий цельнометаллический корпус весом 1.33 кг и объемное звучание четырех динамиков.',
    price: 99990,
    imageUrl: 'https://cdn.dummyjson.com/product-images/laptops/huawei-matebook-x-pro/thumbnail.webp',
    categoryId: 'cat-computers',
  },
  {
    id: 'prod-lenovo-yoga-920',
    sku: 'LNV-YOGA-920',
    name: 'Ноутбук-трансформер Lenovo Yoga 920 4K UHD',
    description: 'Уникальные часовые шарниры с поворотом на 360 градусов, стилус Active Pen в комплекте и прецизионный алюминиевый корпус.',
    price: 86990,
    imageUrl: 'https://cdn.dummyjson.com/product-images/laptops/lenovo-yoga-920/thumbnail.webp',
    categoryId: 'cat-computers',
  },
  {
    id: 'prod-dell-xps-13',
    sku: 'DELL-XPS13-9300',
    name: 'Ультрабук Dell XPS 13 9300 InfinityEdge',
    description: 'Четырехсторонний безрамочный экран формата 16:10, отделка упора для рук из углеродного волокна и длительное время автономной работы.',
    price: 112990,
    imageUrl: 'https://cdn.dummyjson.com/product-images/laptops/new-dell-xps-13-9300-laptop/thumbnail.webp',
    categoryId: 'cat-computers',
  },
  {
    id: 'prod-ipad-mini-2021',
    sku: 'APL-IPADM-21',
    name: 'Планшет Apple iPad Mini 2021 64GB Starlight',
    description: 'Компактный 8.3-дюймовый дисплей Liquid Retina, чип A15 Bionic, поддержка Apple Pencil 2 и сверхширокоугольная фронтальная камера с функцией «В центре внимания».',
    price: 46990,
    imageUrl: 'https://cdn.dummyjson.com/product-images/tablets/ipad-mini-2021-starlight/thumbnail.webp',
    categoryId: 'cat-computers',
  },
  {
    id: 'prod-galaxy-tab-s8',
    sku: 'SAM-TABS8P-GRY',
    name: 'Планшет Samsung Galaxy Tab S8 Plus 128GB Grey',
    description: 'Большой экран Super AMOLED 12.4" 120 Гц, электронное перо S Pen с минимальной задержкой в комплекте и производительный чип Snapdragon 8 Gen 1.',
    price: 59990,
    imageUrl: 'https://cdn.dummyjson.com/product-images/tablets/samsung-galaxy-tab-s8-plus-grey/thumbnail.webp',
    categoryId: 'cat-computers',
  },

  // Аудиотехника
  {
    id: 'prod-airpods-max',
    sku: 'APL-APM-SLV',
    name: 'Полноразмерные наушники Apple AirPods Max Silver',
    description: 'Высококачественный звук высокой четкости, активное шумоподавление с режимом прозрачности, сетчатое оголовье и амбушюры с эффектом памяти.',
    price: 54990,
    imageUrl: 'https://cdn.dummyjson.com/product-images/mobile-accessories/apple-airpods-max-silver/thumbnail.webp',
    categoryId: 'cat-audio',
  },
  {
    id: 'prod-airpods-2',
    sku: 'APL-AIRPODS-2',
    name: 'Беспроводные наушники Apple AirPods (2-е поколение)',
    description: 'Легендарные вкладыши с чипом Apple H1, быстрым подключением к устройствам Apple и до 24 часов воспроизведения с зарядным футляром.',
    price: 14990,
    imageUrl: 'https://cdn.dummyjson.com/product-images/mobile-accessories/apple-airpods/thumbnail.webp',
    categoryId: 'cat-audio',
  },
  {
    id: 'prod-beats-flex',
    sku: 'BTS-FLEX-WRL',
    name: 'Беспроводные наушники Beats Flex Wireless',
    description: 'Магнитные вкладыши с автоматическим включением и паузой, кабель Flex-Form из нитинола и до 12 часов непрерывного звучания музыки.',
    price: 6990,
    imageUrl: 'https://cdn.dummyjson.com/product-images/mobile-accessories/beats-flex-wireless-earphones/thumbnail.webp',
    categoryId: 'cat-audio',
  },
  {
    id: 'prod-amazon-echo-plus',
    sku: 'AMZ-ECHO-PLUS',
    name: 'Умная колонка Amazon Echo Plus с хабом Zigbee',
    description: 'Премиальное звучание 360 градусов с технологией Dolby, встроенный хаб умного дома Zigbee и температурный датчик.',
    price: 11990,
    imageUrl: 'https://cdn.dummyjson.com/product-images/mobile-accessories/amazon-echo-plus/thumbnail.webp',
    categoryId: 'cat-audio',
  },
  {
    id: 'prod-homepod-mini',
    sku: 'APL-HPM-GRY',
    name: 'Акустическая колонка Apple HomePod Mini Cosmic Grey',
    description: 'Невероятно мощный и глубокий звук для столь компактных размеров. Бесшовная интеграция с Siri, AirPlay 2 и экосистемой Apple HomeKit.',
    price: 12490,
    imageUrl: 'https://cdn.dummyjson.com/product-images/mobile-accessories/apple-homepod-mini-cosmic-grey/thumbnail.webp',
    categoryId: 'cat-audio',
  },

  // Умный дом и аксессуары
  {
    id: 'prod-selfie-lamp',
    sku: 'ACC-SLF-LAMP',
    name: 'Светодиодная кольцевая лампа со штативом для смартфона',
    description: 'Идеальное освещение для стримов, видеоконференций и фотосъемки. 3 режима температуры света (теплый, холодный, нейтральный) и 10 уровней яркости.',
    price: 2490,
    imageUrl: 'https://cdn.dummyjson.com/product-images/mobile-accessories/selfie-lamp-with-iphone/thumbnail.webp',
    categoryId: 'cat-smarthome',
  },
  {
    id: 'prod-magsafe-battery',
    sku: 'APL-MG-BAT',
    name: 'Внешний аккумулятор Apple MagSafe Battery Pack',
    description: 'Удобный беспроводной аккумулятор, который примагничивается к задней панели iPhone для быстрой и безопасной подзарядки на ходу.',
    price: 8990,
    imageUrl: 'https://cdn.dummyjson.com/product-images/mobile-accessories/apple-magsafe-battery-pack/thumbnail.webp',
    categoryId: 'cat-smarthome',
  },
];

async function seedData() {
  const dbFile = process.env.DB_FILE || config.dbFile;
  console.log(`Инициализация и наполнение базы данных: ${dbFile}`);
  const db = await initDB(dbFile, { seed: true });

  // Очистка старых данных каталога
  await db.run('DELETE FROM order_items');
  await db.run('DELETE FROM orders');
  await db.run('DELETE FROM favourite_user_products');
  await db.run('DELETE FROM cart_items');
  await db.run('DELETE FROM product_categories');
  await db.run('DELETE FROM products');
  await db.run('DELETE FROM categories');

  // Обновление демо-адреса на реалистичный
  await db.run(`
    UPDATE user_delivery_addresses
    SET country = 'Россия', city = 'Москва', street = 'Тверская улица', house = '14', apartment = '28'
    WHERE id = 'demo-address'
  `);

  // Вставка категорий
  for (const cat of categories) {
    await db.run(
      'INSERT OR REPLACE INTO categories (id, parent_id, name) VALUES (?, NULL, ?)',
      cat.id,
      cat.name,
    );
  }

  // Вставка товаров и связей
  for (const p of products) {
    const searchText = `${p.name} ${p.sku} ${p.description}`.toLowerCase();
    await db.run(
      `INSERT OR REPLACE INTO products (id, sku, name, description, price, is_active, image_url, search_text)
       VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
      p.id,
      p.sku,
      p.name,
      p.description,
      p.price,
      p.imageUrl,
      searchText,
    );

    await db.run(
      'INSERT OR REPLACE INTO product_categories (product_id, category_id) VALUES (?, ?)',
      p.id,
      p.categoryId,
    );
  }

  // Демо-заказ и товары заказа
  await db.run(`
    INSERT OR REPLACE INTO orders (id, user_id, delivery_address_id, status)
    VALUES ('ord-2026-1001', 'demo-user', 'demo-address', 'shipped')
  `);

  await db.run(`
    INSERT OR REPLACE INTO order_items (id, order_id, product_id, quantity, unit_price)
    VALUES ('item-ord-1', 'ord-2026-1001', 'prod-iphone-13-pro', 1, 79990)
  `);

  await db.run(`
    INSERT OR REPLACE INTO order_items (id, order_id, product_id, quantity, unit_price)
    VALUES ('item-ord-2', 'ord-2026-1001', 'prod-airpods-max', 1, 54990)
  `);

  // Демо-избранное
  await db.run(`
    INSERT OR REPLACE INTO favourite_user_products (product_id, user_id)
    VALUES ('prod-macbook-pro-14', 'demo-user')
  `);
  await db.run(`
    INSERT OR REPLACE INTO favourite_user_products (product_id, user_id)
    VALUES ('prod-iphone-x', 'demo-user')
  `);

  // Демо-корзина
  await db.run(`
    INSERT OR REPLACE INTO cart_items (id, user_id, product_id, quantity)
    VALUES ('cart-item-1', 'demo-user', 'prod-beats-flex', 1)
  `);

  console.log(`База данных успешно наполнена: ${categories.length} категорий, ${products.length} товаров.`);
  await db.close();
}

if (require.main === module) {
  seedData().catch((err) => {
    console.error('Ошибка при заполнении базы данных:', err);
    process.exit(1);
  });
}

module.exports = seedData;
