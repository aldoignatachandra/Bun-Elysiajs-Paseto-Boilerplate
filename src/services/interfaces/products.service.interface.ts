export interface ProductDTO {
  id: string;
  ownerId: string;
  name: string;
  description: string | null;
  price: string;
  stock: number;
  category: string;
  status: 'ACTIVE' | 'INACTIVE';
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ListProductsInput {
  page: number;
  limit: number;
  search?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  includeDeleted?: boolean;
  onlyDeleted?: boolean;
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
  description?: string;
  price: string;
  stock: number;
  category: string;
  status?: 'ACTIVE' | 'INACTIVE';
}

export interface UpdateProductInput {
  id: string;
  name?: string;
  description?: string;
  price?: string;
  stock?: number;
  category?: string;
  status?: 'ACTIVE' | 'INACTIVE';
}

export interface UpdateStockInput {
  id: string;
  stock: number;
}

export interface IProductsService {
  list(input: ListProductsInput): Promise<ListProductsOutput>;
  getById(id: string, includeDeleted?: boolean): Promise<ProductDTO>;
  create(input: CreateProductInput): Promise<ProductDTO>;
  update(input: UpdateProductInput): Promise<ProductDTO>;
  delete(id: string, force?: boolean): Promise<{ message: string }>;
  restore(id: string): Promise<ProductDTO>;
  updateStock(input: UpdateStockInput): Promise<{ id: string; stock: number }>;
}
