export interface ProductPriceRange {
  min: number;
  max: number;
  display: string;
}

export interface ProductAttributeInput {
  name: string;
  values: string[];
  displayOrder?: number;
}

export interface ProductVariantInput {
  name: string;
  sku: string;
  price?: number | null;
  stock?: number;
  isActive?: boolean;
  attributeValues: Record<string, string>;
}

export interface ProductAttributeDTO {
  id: string;
  name: string;
  values: string[];
  displayOrder: number;
}

export interface ProductVariantDTO {
  id: string;
  name: string;
  sku: string;
  price: number | null;
  stockQuantity: number;
  availableStock: number;
  isActive: boolean;
  attributeValues: Record<string, string>;
}

export interface ProductDTO {
  id: string;
  ownerId: string;
  name: string;
  price: ProductPriceRange;
  stock: number;
  hasVariant: boolean;
  attributes?: ProductAttributeDTO[];
  variants?: ProductVariantDTO[];
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ListProductsInput {
  page: number;
  limit: number;
  search?: string;
  includeDeleted?: boolean;
  onlyDeleted?: boolean;
  hasVariant?: boolean;
  inStock?: boolean;
  minPrice?: number;
  maxPrice?: number;
  includeVariants?: boolean;
}

export interface ListProductsOutput {
  products: ProductDTO[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface CreateProductInput {
  ownerId: string;
  name: string;
  price: number;
  stock?: number;
  attributes?: ProductAttributeInput[];
  variants?: ProductVariantInput[];
}

export interface UpdateProductInput {
  id?: string;
  currentUserId?: string;
  isAdmin?: boolean;
  name?: string;
  price?: number;
  stock?: number;
  attributes?: ProductAttributeInput[];
  variants?: ProductVariantInput[];
}

export interface GetProductInput {
  id: string;
  currentUserId?: string;
  isAdmin?: boolean;
  includeDeleted?: boolean;
  includeVariants?: boolean;
}

export interface UpdateStockInput {
  id: string;
  currentUserId?: string;
  isAdmin?: boolean;
  stock: number;
}

export interface IProductsService {
  list(input: ListProductsInput): Promise<ListProductsOutput>;
  getById(input: GetProductInput): Promise<ProductDTO>;
  create(input: CreateProductInput): Promise<ProductDTO>;
  update(input: UpdateProductInput): Promise<ProductDTO>;
  delete(id: string, force?: boolean): Promise<{ message: string }>;
  restore(id: string): Promise<ProductDTO>;
  updateStock(input: UpdateStockInput): Promise<{ id: string; stock: number }>;
}
