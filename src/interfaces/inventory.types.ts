// Inventory Module Type Definitions

export interface IWarehouse {
    id: number;
    warehouse_type_id: number;
    user_id?: number | null;
    code: string;
    name: string;
    description?: string;
    location?: string;
    is_active: boolean;
    is_main: boolean;
    warehouse_type?: IWarehouseType;
    user?: IUser;
    // Metrics
    total_products_unique?: number;
    total_items_stock?: number;
    created_at?: string;
    updated_at?: string;
}

export interface IWarehouseType {
    id: number;
    code: string;
    name: string;
    description?: string;
    is_physical: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface IInventory {
    id: number;
    warehouse_id: number;
    product_id: number;
    quantity: number;
    warehouse?: IWarehouse;
    product?: IProduct;
    created_at: string;
    updated_at: string;
}

export interface IInventoryMovement {
    id: number;
    product_id: number;
    from_warehouse_id?: number | null;
    to_warehouse_id?: number | null;
    quantity: number;
    movement_type: 'transfer' | 'in' | 'out' | 'adjustment';
    reference_type?: string | null;
    reference_id?: number | null;
    user_id?: number | null;
    notes?: string | null;
    product?: IProduct;
    from_warehouse?: IWarehouse;
    to_warehouse?: IWarehouse;
    user?: IUser;
    created_at: string;
    updated_at: string;
}

export interface IProduct {
    id: number;
    title: string;
    name?: string;
    sku?: string;
    price?: number;
    cost?: number;
    cost_usd?: number;
    image?: string;
    stock?: number;
    created_at?: string;
    updated_at?: string;
}

export interface IUser {
    id: number;
    names: string;
    surnames: string;
    email: string;
}

export interface IProductStock {
    product_id: number;
    product?: IProduct;
    warehouses: Array<{
        warehouse_id: number;
        warehouse_name: string;
        warehouse_code: string;
        quantity: number;
    }>;
    total_quantity: number;
}

export interface IInventoryFilters {
    warehouse_id?: number;
    product_id?: number;
    movement_type?: 'transfer' | 'in' | 'out' | 'adjustment';
    from_date?: string;
    to_date?: string;
    search?: string;
}

export interface IStockTransferRequest {
    product_id: number;
    from_warehouse_id: number;
    to_warehouse_id: number;
    quantity: number;
    notes?: string;
}

export interface IStockAdjustmentRequest {
    product_id: number;
    warehouse_id: number;
    quantity?: number;
    new_quantity?: number;
    notes?: string;
    reference_type?: string;
    reference_id?: number;
}
