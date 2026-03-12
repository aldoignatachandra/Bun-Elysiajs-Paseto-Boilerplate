import { and, eq, isNull } from 'drizzle-orm';
import { PasswordService } from '../core/crypto/password.service';
import { logger } from '../core/logging/logger';
import { closeConnection, getConnection } from '../database/connection';
import { productAttributes, products, productVariants, users } from '../database/schema';

const SEED_ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'admin@example.com';
const SEED_ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'Admin123!';
const SEED_USER_EMAIL = process.env.SEED_USER_EMAIL ?? 'user@example.com';
const SEED_USER_PASSWORD = process.env.SEED_USER_PASSWORD ?? 'User123!';

const ROLE_ADMIN = 'ADMIN';
const ROLE_USER = 'USER';

async function ensureAdminUser(passwordService: PasswordService): Promise<string> {
  const db = getConnection();

  const existingUser = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.email, SEED_ADMIN_EMAIL), isNull(users.deletedAt)))
    .limit(1);

  if (existingUser[0]) {
    logger.info('Admin user already exists, skipping...');
    return existingUser[0].id;
  }

  const passwordHash = await passwordService.hash(SEED_ADMIN_PASSWORD);

  const [createdUser] = await db
    .insert(users)
    .values({
      email: SEED_ADMIN_EMAIL,
      username: 'admin',
      passwordHash,
      name: 'Admin',
      role: ROLE_ADMIN,
    })
    .returning({ id: users.id });

  logger.info('Admin user created', { email: SEED_ADMIN_EMAIL, password: SEED_ADMIN_PASSWORD });
  return createdUser.id;
}

async function ensureRegularUser(passwordService: PasswordService): Promise<string> {
  const db = getConnection();

  const existingUser = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.email, SEED_USER_EMAIL), isNull(users.deletedAt)))
    .limit(1);

  if (existingUser[0]) {
    logger.info('Regular user already exists, skipping...');
    return existingUser[0].id;
  }

  const passwordHash = await passwordService.hash(SEED_USER_PASSWORD);

  const [createdUser] = await db
    .insert(users)
    .values({
      email: SEED_USER_EMAIL,
      username: 'testuser',
      passwordHash,
      name: 'Test User',
      role: ROLE_USER,
    })
    .returning({ id: users.id });

  logger.info('Regular user created', { email: SEED_USER_EMAIL, password: SEED_USER_PASSWORD });
  return createdUser.id;
}

async function seedProducts(ownerId: string): Promise<void> {
  const db = getConnection();

  const productSeeds = [
    {
      name: 'Classic Cap',
      price: '19.99',
      stock: 150,
      images: 'https://example.com/cap.jpg',
      hasVariant: false,
      attributes: [] as { name: string; values: string[]; displayOrder: number }[],
      variants: [] as {
        name: string;
        sku: string;
        price: string;
        stockQuantity: number;
        stockReserved: number;
        isActive: boolean;
        attributeValues: Record<string, string>;
      }[],
    },
    {
      name: 'Premium T-Shirt',
      price: '29.99',
      stock: 0,
      images: 'https://example.com/tshirt.jpg',
      hasVariant: true,
      attributes: [
        { name: 'Color', values: ['Red', 'Blue', 'Black'], displayOrder: 0 },
        { name: 'Size', values: ['S', 'M', 'L'], displayOrder: 1 },
      ],
      variants: [
        {
          name: 'Red / S',
          sku: 'TSHIRT-RED-S',
          price: '29.99',
          stockQuantity: 40,
          stockReserved: 0,
          isActive: true,
          attributeValues: { Color: 'Red', Size: 'S' },
        },
        {
          name: 'Blue / M',
          sku: 'TSHIRT-BLUE-M',
          price: '34.99',
          stockQuantity: 35,
          stockReserved: 0,
          isActive: true,
          attributeValues: { Color: 'Blue', Size: 'M' },
        },
        {
          name: 'Black / L',
          sku: 'TSHIRT-BLACK-L',
          price: '39.99',
          stockQuantity: 30,
          stockReserved: 0,
          isActive: true,
          attributeValues: { Color: 'Black', Size: 'L' },
        },
      ],
    },
    {
      name: 'Wireless Mouse',
      price: '49.99',
      stock: 75,
      images: 'https://example.com/mouse.jpg',
      hasVariant: false,
      attributes: [],
      variants: [],
    },
    {
      name: 'Mechanical Keyboard',
      price: '89.99',
      stock: 0,
      images: 'https://example.com/keyboard.jpg',
      hasVariant: true,
      attributes: [
        { name: 'Layout', values: ['TKL', 'Full'], displayOrder: 0 },
        { name: 'Switch', values: ['Brown', 'Red'], displayOrder: 1 },
      ],
      variants: [
        {
          name: 'TKL / Brown Switch',
          sku: 'KEYBOARD-TKL-BROWN',
          price: '89.99',
          stockQuantity: 20,
          stockReserved: 0,
          isActive: true,
          attributeValues: { Layout: 'TKL', Switch: 'Brown' },
        },
        {
          name: 'Full / Red Switch',
          sku: 'KEYBOARD-FULL-RED',
          price: '99.99',
          stockQuantity: 15,
          stockReserved: 0,
          isActive: true,
          attributeValues: { Layout: 'Full', Switch: 'Red' },
        },
      ],
    },
    {
      name: 'USB-C Hub',
      price: '39.99',
      stock: 80,
      images: 'https://example.com/hub.jpg',
      hasVariant: false,
      attributes: [],
      variants: [],
    },
  ];

  for (const seed of productSeeds) {
    const existingProduct = await db
      .select({ id: products.id })
      .from(products)
      .where(and(eq(products.ownerId, ownerId), eq(products.name, seed.name), isNull(products.deletedAt)))
      .limit(1);

    if (existingProduct[0]) {
      logger.info('Product already exists, skipping', { name: seed.name });
      continue;
    }

    const stock = seed.hasVariant ? seed.variants.reduce((sum, v) => sum + v.stockQuantity, 0) : seed.stock;

    const [createdProduct] = await db
      .insert(products)
      .values({
        ownerId,
        name: seed.name,
        price: seed.price,
        stock,
        hasVariant: seed.hasVariant,
        images: seed.images,
      })
      .returning({ id: products.id });

    logger.info('Product created', { name: seed.name, stock, price: seed.price });

    if (seed.attributes.length > 0) {
      await db.insert(productAttributes).values(
        seed.attributes.map(attr => ({
          productId: createdProduct.id,
          name: attr.name,
          values: attr.values,
          displayOrder: attr.displayOrder,
        }))
      );
      logger.info('Product attributes created', { name: seed.name, count: seed.attributes.length });
    }

    if (seed.variants.length > 0) {
      await db.insert(productVariants).values(
        seed.variants.map(variant => ({
          name: variant.name,
          productId: createdProduct.id,
          sku: variant.sku,
          price: variant.price,
          stockQuantity: variant.stockQuantity,
          stockReserved: variant.stockReserved,
          isActive: variant.isActive,
          attributeValues: variant.attributeValues,
        }))
      );
      logger.info('Product variants created', { name: seed.name, count: seed.variants.length });
    }
  }
}

async function main(): Promise<void> {
  try {
    const passwordService = new PasswordService();

    logger.info('=====================================');
    logger.info('🚀 Database Seeder');
    logger.info('=====================================');

    await ensureAdminUser(passwordService);
    const userId = await ensureRegularUser(passwordService);

    await seedProducts(userId);

    logger.info('=====================================');
    logger.info('🎉 All seeding completed!');
    logger.info('=====================================');
    logger.info('Admin user:', { email: SEED_ADMIN_EMAIL, password: SEED_ADMIN_PASSWORD, role: ROLE_ADMIN });
    logger.info('Regular user:', { email: SEED_USER_EMAIL, password: SEED_USER_PASSWORD, role: ROLE_USER });
    logger.info('=====================================');

    await closeConnection();
    process.exit(0);
  } catch (error) {
    logger.error('Seed failed', error);
    await closeConnection();
    process.exit(1);
  }
}

void main();
