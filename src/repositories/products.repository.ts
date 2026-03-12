import { and, desc, eq, gte, ilike, inArray, isNotNull, isNull, lte, sql } from 'drizzle-orm';
import { productAttributes, products, productVariants } from '../database/schema';
import type { NewProduct, Product } from '../database/schema';
import { CRUDRepository } from './base.repository';

export interface ProductAttributePayload {
  name: string;
  values: string[];
  displayOrder?: number;
}

export interface ProductVariantPayload {
  sku: string;
  price?: number | null;
  stock?: number;
  isActive?: boolean;
  attributeValues: Record<string, string>;
}

export interface ProductView {
  id: string;
  ownerId: string;
  name: string;
  price: {
    min: number;
    max: number;
    display: string;
  };
  stock: number;
  hasVariant: boolean;
  attributes?: Array<{
    id: string;
    name: string;
    values: string[];
    displayOrder: number;
  }>;
  variants?: Array<{
    id: string;
    sku: string;
    price: number | null;
    stockQuantity: number;
    availableStock: number;
    isActive: boolean;
    attributeValues: Record<string, string>;
  }>;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductListOptions {
  search?: string;
  includeDeleted?: boolean;
  onlyDeleted?: boolean;
  hasVariant?: boolean;
  inStock?: boolean;
  minPrice?: number;
  maxPrice?: number;
  includeVariants?: boolean;
  limit?: number;
  offset?: number;
}

export interface ProductCreateWithVariantsInput {
  ownerId: string;
  name: string;
  price: number;
  stock?: number;
  attributes?: ProductAttributePayload[];
  variants?: ProductVariantPayload[];
}

export interface ProductUpdateWithVariantsInput {
  name?: string;
  price?: number;
  stock?: number;
  attributes?: ProductAttributePayload[];
  variants?: ProductVariantPayload[];
}

function toDecimal(value: number): string {
  return value.toFixed(2);
}

function toNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) {
    return 0;
  }

  const parsed = typeof value === 'string' ? parseFloat(value) : value;

  if (Number.isNaN(parsed)) {
    return 0;
  }

  return parsed;
}

function toPriceRange(basePrice: number, variantPrices: number[]): ProductView['price'] {
  if (variantPrices.length > 0) {
    const min = Math.min(...variantPrices);
    const max = Math.max(...variantPrices);

    return {
      min,
      max,
      display: min === max ? `$${min.toFixed(2)}` : `$${min.toFixed(2)} - $${max.toFixed(2)}`,
    };
  }

  return {
    min: basePrice,
    max: basePrice,
    display: `$${basePrice.toFixed(2)}`,
  };
}

export class ProductRepository extends CRUDRepository<Product, string> {
  get tableName(): string {
    return 'products';
  }

  async findAll(options: ProductListOptions = {}): Promise<Product[]> {
    try {
      const { includeDeleted = false, limit, offset } = options;
      const where = includeDeleted ? undefined : isNull(products.deletedAt);

      let query = this.db.select().from(products).$dynamic();

      if (where) {
        query = query.where(where);
      }

      query = query.orderBy(desc(products.createdAt));

      if (typeof limit === 'number') {
        query = query.limit(limit);
      }

      if (typeof offset === 'number') {
        query = query.offset(offset);
      }

      return await query;
    } catch (error) {
      this.logError('findAll', error);
      return [];
    }
  }

  async findWithFilters(options: ProductListOptions): Promise<{ data: ProductView[]; total: number }> {
    try {
      const {
        search,
        includeDeleted = false,
        onlyDeleted = false,
        hasVariant,
        inStock,
        minPrice,
        maxPrice,
        includeVariants = false,
        limit = 10,
        offset = 0,
      } = options;

      const conditions = [];

      if (search) {
        conditions.push(ilike(products.name, `%${search}%`));
      }

      if (onlyDeleted) {
        conditions.push(isNotNull(products.deletedAt));
      } else if (!includeDeleted) {
        conditions.push(isNull(products.deletedAt));
      }

      if (hasVariant !== undefined) {
        conditions.push(eq(products.hasVariant, hasVariant));
      }

      if (inStock) {
        conditions.push(gte(products.stock, 1));
      }

      if (minPrice !== undefined) {
        conditions.push(gte(products.price, toDecimal(minPrice)));
      }

      if (maxPrice !== undefined) {
        conditions.push(lte(products.price, toDecimal(maxPrice)));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [countResult] = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(products)
        .where(whereClause);

      const total = Number(countResult?.count || 0);

      const productRows = await this.db.select().from(products).where(whereClause).orderBy(desc(products.createdAt)).limit(limit).offset(offset);

      if (includeVariants) {
        const rows: ProductView[] = [];

        for (const row of productRows) {
          const formatted = await this.findByIdWithVariants(row.id, includeDeleted || onlyDeleted);
          if (formatted) {
            rows.push(formatted);
          }
        }

        return { data: rows, total };
      }

      const productIdsWithVariants = productRows.filter(row => row.hasVariant).map(row => row.id);
      const variantPriceMap = new Map<string, number[]>();

      if (productIdsWithVariants.length > 0) {
        const variantRows = await this.db
          .select({
            productId: productVariants.productId,
            price: productVariants.price,
          })
          .from(productVariants)
          .where(
            and(inArray(productVariants.productId, productIdsWithVariants), isNull(productVariants.deletedAt), eq(productVariants.isActive, true))
          );

        for (const variant of variantRows) {
          const existing = variantPriceMap.get(variant.productId) ?? [];
          const parsed = toNumber(variant.price);

          if (parsed > 0) {
            existing.push(parsed);
            variantPriceMap.set(variant.productId, existing);
          }
        }
      }

      return {
        data: productRows.map(row => this.formatProduct(row, [], [], variantPriceMap.get(row.id) ?? [])),
        total,
      };
    } catch (error) {
      this.logError('findWithFilters', error);
      return { data: [], total: 0 };
    }
  }

  async findById(id: string, includeDeleted = false): Promise<Product | null> {
    try {
      const conditions = [eq(products.id, id)];

      if (!includeDeleted) {
        conditions.push(isNull(products.deletedAt));
      }

      const result = await this.db
        .select()
        .from(products)
        .where(and(...conditions))
        .limit(1);

      return result[0] || null;
    } catch (error) {
      this.logError('findById', error);
      return null;
    }
  }

  async findByIdWithVariants(id: string, includeDeleted = false): Promise<ProductView | null> {
    try {
      const product = await this.findById(id, includeDeleted);

      if (!product) {
        return null;
      }

      const [attributeRows, variantRows] = await Promise.all([
        this.db
          .select()
          .from(productAttributes)
          .where(and(eq(productAttributes.productId, id), isNull(productAttributes.deletedAt)))
          .orderBy(productAttributes.displayOrder, productAttributes.createdAt),
        this.db
          .select()
          .from(productVariants)
          .where(and(eq(productVariants.productId, id), isNull(productVariants.deletedAt)))
          .orderBy(productVariants.createdAt),
      ]);

      const attributes = attributeRows.map(attribute => ({
        id: attribute.id,
        name: attribute.name,
        values: attribute.values,
        displayOrder: attribute.displayOrder,
      }));

      const variants = variantRows.map(variant => ({
        id: variant.id,
        sku: variant.sku,
        price: variant.price === null ? null : toNumber(variant.price),
        stockQuantity: variant.stockQuantity,
        availableStock: variant.stockQuantity - variant.stockReserved,
        isActive: variant.isActive,
        attributeValues: variant.attributeValues,
      }));

      const variantPrices = variants.map(variant => variant.price).filter((price): price is number => typeof price === 'number' && price > 0);

      return this.formatProduct(product, attributes, variants, variantPrices);
    } catch (error) {
      this.logError('findByIdWithVariants', error);
      return null;
    }
  }

  async create(data: NewProduct): Promise<Product> {
    try {
      const result = await this.db.insert(products).values(data).returning();
      return result[0];
    } catch (error) {
      this.logError('create', error);
      throw error;
    }
  }

  async createWithVariants(data: ProductCreateWithVariantsInput): Promise<ProductView> {
    try {
      return await this.db.transaction(async tx => {
        if (data.price <= 0) {
          throw new Error('Product price must be greater than 0');
        }

        const [product] = await tx
          .insert(products)
          .values({
            ownerId: data.ownerId,
            name: data.name,
            price: toDecimal(data.price),
            stock: data.stock ?? 0,
            hasVariant: Boolean(data.variants && data.variants.length > 0),
          })
          .returning();

        let attributes: ProductView['attributes'] = [];

        if (data.attributes && data.attributes.length > 0) {
          const inserted = await tx
            .insert(productAttributes)
            .values(
              data.attributes.map((attribute, index) => ({
                productId: product.id,
                name: attribute.name,
                values: attribute.values,
                displayOrder: attribute.displayOrder ?? index,
              }))
            )
            .returning();

          attributes = inserted.map(attribute => ({
            id: attribute.id,
            name: attribute.name,
            values: attribute.values,
            displayOrder: attribute.displayOrder,
          }));
        }

        let variants: ProductView['variants'] = [];

        if (data.variants && data.variants.length > 0) {
          for (const variant of data.variants) {
            if (variant.price !== undefined && variant.price !== null && variant.price <= 0) {
              throw new Error('Variant price must be greater than 0');
            }
          }

          const inserted = await tx
            .insert(productVariants)
            .values(
              data.variants.map(variant => ({
                productId: product.id,
                sku: variant.sku,
                price: variant.price === undefined || variant.price === null ? null : toDecimal(variant.price),
                stockQuantity: variant.stock ?? 0,
                isActive: variant.isActive ?? true,
                attributeValues: variant.attributeValues,
              }))
            )
            .returning();

          variants = inserted.map(variant => ({
            id: variant.id,
            sku: variant.sku,
            price: variant.price === null ? null : toNumber(variant.price),
            stockQuantity: variant.stockQuantity,
            availableStock: variant.stockQuantity - variant.stockReserved,
            isActive: variant.isActive,
            attributeValues: variant.attributeValues,
          }));
        }

        const [updatedProduct] = await tx.select().from(products).where(eq(products.id, product.id));

        if (!updatedProduct) {
          throw new Error('Failed to load created product');
        }

        const variantPrices = variants.map(variant => variant.price).filter((price): price is number => typeof price === 'number' && price > 0);

        return this.formatProduct(updatedProduct, attributes, variants, variantPrices);
      });
    } catch (error) {
      this.logError('createWithVariants', error);
      throw error;
    }
  }

  async update(id: string, data: Partial<Product>): Promise<Product | null> {
    try {
      const result = await this.db
        .update(products)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(products.id, id))
        .returning();

      return result[0] || null;
    } catch (error) {
      this.logError('update', error);
      throw error;
    }
  }

  async updateWithVariants(id: string, data: ProductUpdateWithVariantsInput): Promise<ProductView | null> {
    try {
      return await this.db.transaction(async tx => {
        const [existingProduct] = await tx
          .select()
          .from(products)
          .where(and(eq(products.id, id), isNull(products.deletedAt)));

        if (!existingProduct) {
          return null;
        }

        if (existingProduct.hasVariant && data.stock !== undefined) {
          throw new Error('Cannot update stock directly for products with variants');
        }

        if (data.price !== undefined && data.price <= 0) {
          throw new Error('Product price must be greater than 0');
        }

        await tx
          .update(products)
          .set({
            name: data.name ?? existingProduct.name,
            price: data.price !== undefined ? toDecimal(data.price) : existingProduct.price,
            stock: data.stock ?? existingProduct.stock,
            updatedAt: new Date(),
          })
          .where(eq(products.id, id));

        let attributes: ProductView['attributes'] = [];

        if (data.attributes !== undefined) {
          await tx
            .update(productAttributes)
            .set({ deletedAt: new Date(), updatedAt: new Date() })
            .where(and(eq(productAttributes.productId, id), isNull(productAttributes.deletedAt)));

          if (data.attributes.length > 0) {
            const insertedAttributes = await tx
              .insert(productAttributes)
              .values(
                data.attributes.map((attribute, index) => ({
                  productId: id,
                  name: attribute.name,
                  values: attribute.values,
                  displayOrder: attribute.displayOrder ?? index,
                }))
              )
              .returning();

            attributes = insertedAttributes.map(attribute => ({
              id: attribute.id,
              name: attribute.name,
              values: attribute.values,
              displayOrder: attribute.displayOrder,
            }));
          }
        } else {
          const existingAttributes = await tx
            .select()
            .from(productAttributes)
            .where(and(eq(productAttributes.productId, id), isNull(productAttributes.deletedAt)));

          attributes = existingAttributes.map(attribute => ({
            id: attribute.id,
            name: attribute.name,
            values: attribute.values,
            displayOrder: attribute.displayOrder,
          }));
        }

        let variants: ProductView['variants'] = [];

        if (data.variants !== undefined) {
          const existingVariants = await tx.select().from(productVariants).where(eq(productVariants.productId, id));

          const existingVariantMap = new Map(existingVariants.map(variant => [variant.sku, variant]));
          const processedSkus = new Set<string>();
          const variantsToInsert: Array<{
            productId: string;
            sku: string;
            price: string | null;
            stockQuantity: number;
            isActive: boolean;
            attributeValues: Record<string, string>;
          }> = [];

          for (const variant of data.variants) {
            if (variant.price !== undefined && variant.price !== null && variant.price <= 0) {
              throw new Error('Variant price must be greater than 0');
            }

            const existing = existingVariantMap.get(variant.sku);

            if (existing) {
              await tx
                .update(productVariants)
                .set({
                  price: variant.price === undefined || variant.price === null ? null : toDecimal(variant.price),
                  stockQuantity: variant.stock ?? 0,
                  isActive: variant.isActive ?? true,
                  attributeValues: variant.attributeValues,
                  deletedAt: null,
                  updatedAt: new Date(),
                })
                .where(eq(productVariants.id, existing.id));

              processedSkus.add(variant.sku);
            } else {
              variantsToInsert.push({
                productId: id,
                sku: variant.sku,
                price: variant.price === undefined || variant.price === null ? null : toDecimal(variant.price),
                stockQuantity: variant.stock ?? 0,
                isActive: variant.isActive ?? true,
                attributeValues: variant.attributeValues,
              });

              processedSkus.add(variant.sku);
            }
          }

          if (variantsToInsert.length > 0) {
            await tx.insert(productVariants).values(variantsToInsert);
          }

          const variantsToDelete = existingVariants
            .filter(variant => !processedSkus.has(variant.sku) && variant.deletedAt === null)
            .map(variant => variant.id);

          if (variantsToDelete.length > 0) {
            await tx
              .update(productVariants)
              .set({ deletedAt: new Date(), updatedAt: new Date() })
              .where(inArray(productVariants.id, variantsToDelete));
          }

          const finalVariants = await tx
            .select()
            .from(productVariants)
            .where(and(eq(productVariants.productId, id), isNull(productVariants.deletedAt)));

          variants = finalVariants.map(variant => ({
            id: variant.id,
            sku: variant.sku,
            price: variant.price === null ? null : toNumber(variant.price),
            stockQuantity: variant.stockQuantity,
            availableStock: variant.stockQuantity - variant.stockReserved,
            isActive: variant.isActive,
            attributeValues: variant.attributeValues,
          }));
        } else {
          const existingVariants = await tx
            .select()
            .from(productVariants)
            .where(and(eq(productVariants.productId, id), isNull(productVariants.deletedAt)));

          variants = existingVariants.map(variant => ({
            id: variant.id,
            sku: variant.sku,
            price: variant.price === null ? null : toNumber(variant.price),
            stockQuantity: variant.stockQuantity,
            availableStock: variant.stockQuantity - variant.stockReserved,
            isActive: variant.isActive,
            attributeValues: variant.attributeValues,
          }));
        }

        const [finalProduct] = await tx.select().from(products).where(eq(products.id, id));

        if (!finalProduct) {
          throw new Error('Failed to load updated product');
        }

        const variantPrices = variants.map(variant => variant.price).filter((price): price is number => typeof price === 'number' && price > 0);

        return this.formatProduct(finalProduct, attributes, variants, variantPrices);
      });
    } catch (error) {
      this.logError('updateWithVariants', error);
      throw error;
    }
  }

  async softDelete(id: string): Promise<boolean> {
    try {
      const result = await this.db
        .update(products)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(products.id, id), isNull(products.deletedAt)))
        .returning();

      return result.length > 0;
    } catch (error) {
      this.logError('softDelete', error);
      return false;
    }
  }

  async restore(id: string): Promise<boolean> {
    try {
      const result = await this.db.update(products).set({ deletedAt: null, updatedAt: new Date() }).where(eq(products.id, id)).returning();

      return result.length > 0;
    } catch (error) {
      this.logError('restore', error);
      return false;
    }
  }

  async updateStock(id: string, stock: number): Promise<Product | null> {
    try {
      const result = await this.db.update(products).set({ stock, updatedAt: new Date() }).where(eq(products.id, id)).returning();

      return result[0] || null;
    } catch (error) {
      this.logError('updateStock', error);
      throw error;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const result = await this.db.delete(products).where(eq(products.id, id)).returning();
      return result.length > 0;
    } catch (error) {
      this.logError('delete', error);
      return false;
    }
  }

  protected async count(): Promise<number> {
    try {
      const rows = await this.db.select({ id: products.id }).from(products);
      return rows.length;
    } catch (error) {
      this.logError('count', error);
      return 0;
    }
  }

  private formatProduct(
    product: Product,
    attributes: NonNullable<ProductView['attributes']>,
    variants: NonNullable<ProductView['variants']>,
    variantPrices: number[]
  ): ProductView {
    const basePrice = toNumber(product.price);

    return {
      id: product.id,
      ownerId: product.ownerId,
      name: product.name,
      price: toPriceRange(basePrice, variantPrices),
      stock: product.stock,
      hasVariant: product.hasVariant,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      deletedAt: product.deletedAt,
      attributes,
      variants,
    };
  }
}
