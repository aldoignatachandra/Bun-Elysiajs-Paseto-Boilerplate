import { and, eq, isNull } from 'drizzle-orm';
import { PasswordService } from '../core/crypto/password.service';
import { logger } from '../core/logging/logger';
import { closeConnection, getConnection } from '../database/connection';
import { productAttributes, products, productVariants, users } from '../database/schema';

const SEED_ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'admin@local.dev';
const SEED_ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'Admin123!';

async function ensureSeedUser(passwordService: PasswordService): Promise<string> {
  const db = getConnection();

  const existingUser = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.email, SEED_ADMIN_EMAIL), isNull(users.deletedAt)))
    .limit(1);

  if (existingUser[0]) {
    return existingUser[0].id;
  }

  const passwordHash = await passwordService.hash(SEED_ADMIN_PASSWORD);

  const [createdUser] = await db
    .insert(users)
    .values({
      email: SEED_ADMIN_EMAIL,
      username: 'admin',
      passwordHash,
      name: 'Seed Admin',
      role: 'admin',
    })
    .returning({ id: users.id });

  return createdUser.id;
}

async function ensureSimpleProduct(ownerId: string): Promise<void> {
  const db = getConnection();

  const existingProduct = await db
    .select({ id: products.id })
    .from(products)
    .where(and(eq(products.ownerId, ownerId), eq(products.name, 'Starter Product'), isNull(products.deletedAt)))
    .limit(1);

  if (existingProduct[0]) {
    return;
  }

  await db.insert(products).values({
    ownerId,
    name: 'Starter Product',
    price: '99.90',
    stock: 100,
    hasVariant: false,
  });
}

async function ensureVariantProduct(ownerId: string): Promise<void> {
  const db = getConnection();

  const existingProduct = await db
    .select({ id: products.id })
    .from(products)
    .where(and(eq(products.ownerId, ownerId), eq(products.name, 'Variant T-Shirt'), isNull(products.deletedAt)))
    .limit(1);

  if (existingProduct[0]) {
    return;
  }

  const [createdProduct] = await db
    .insert(products)
    .values({
      ownerId,
      name: 'Variant T-Shirt',
      price: '149.90',
      stock: 0,
      hasVariant: true,
    })
    .returning({ id: products.id });

  await db.insert(productAttributes).values([
    {
      productId: createdProduct.id,
      name: 'Color',
      values: ['Black', 'White'],
      displayOrder: 0,
    },
    {
      productId: createdProduct.id,
      name: 'Size',
      values: ['M', 'L'],
      displayOrder: 1,
    },
  ]);

  await db.insert(productVariants).values([
    {
      name: 'Black - M',
      productId: createdProduct.id,
      sku: 'TSHIRT-BLK-M',
      price: '149.90',
      stockQuantity: 20,
      stockReserved: 0,
      isActive: true,
      attributeValues: { Color: 'Black', Size: 'M' },
    },
    {
      name: 'White - L',
      productId: createdProduct.id,
      sku: 'TSHIRT-WHT-L',
      price: '159.90',
      stockQuantity: 15,
      stockReserved: 0,
      isActive: true,
      attributeValues: { Color: 'White', Size: 'L' },
    },
  ]);
}

async function main(): Promise<void> {
  try {
    const passwordService = new PasswordService();

    logger.info('Seeding database...');
    const ownerId = await ensureSeedUser(passwordService);
    await ensureSimpleProduct(ownerId);
    await ensureVariantProduct(ownerId);

    logger.info('Seed completed', {
      seedAdminEmail: SEED_ADMIN_EMAIL,
    });

    await closeConnection();
    process.exit(0);
  } catch (error) {
    logger.error('Seed failed', error);
    await closeConnection();
    process.exit(1);
  }
}

void main();
