import { and, desc, eq, ilike, isNotNull, isNull } from 'drizzle-orm';
import { products } from '../database/schema';
import type { NewProduct, Product } from '../database/schema';
import { CRUDRepository, type FindOptions } from './base.repository';

export interface ProductListOptions extends FindOptions {
  search?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  includeDeleted?: boolean;
  onlyDeleted?: boolean;
}

export class ProductRepository extends CRUDRepository<Product, string> {
  get tableName(): string {
    return 'products';
  }

  async findAll(options: ProductListOptions = {}): Promise<Product[]> {
    try {
      const conditions = [];

      if (options.search) {
        conditions.push(ilike(products.name, `%${options.search}%`));
      }

      if (options.status) {
        conditions.push(eq(products.status, options.status));
      }

      if (options.onlyDeleted) {
        conditions.push(isNotNull(products.deletedAt));
      } else if (!options.includeDeleted) {
        conditions.push(isNull(products.deletedAt));
      }

      let query = this.db.select().from(products).$dynamic();

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      query = query.orderBy(desc(products.createdAt));

      if (typeof options.limit === 'number') {
        query = query.limit(options.limit);
      }

      if (typeof options.offset === 'number') {
        query = query.offset(options.offset);
      }

      return await query;
    } catch (error) {
      this.logError('findAll', error);
      return [];
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

  async create(data: NewProduct): Promise<Product> {
    try {
      const result = await this.db.insert(products).values(data).returning();
      return result[0];
    } catch (error) {
      this.logError('create', error);
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
      const result = await this.db
        .update(products)
        .set({ deletedAt: null, updatedAt: new Date() })
        .where(eq(products.id, id))
        .returning();

      return result.length > 0;
    } catch (error) {
      this.logError('restore', error);
      return false;
    }
  }

  async updateStock(id: string, stock: number): Promise<Product | null> {
    try {
      const result = await this.db
        .update(products)
        .set({ stock, updatedAt: new Date() })
        .where(eq(products.id, id))
        .returning();

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
}
