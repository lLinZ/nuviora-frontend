// Tipos del reparto de órdenes por grupos (fase 4).

export interface GroupRef {
    id: number;
    name: string;
}

export interface SalesGroupMember {
    user_id: number;
    name: string;
    weight: number | null;
    since: string | null;
}

export interface SalesGroup {
    id: number;
    name: string;
    leader_commission_pct: number;
    leader: { id: number; name: string; weight: number | null } | null;
    members: SalesGroupMember[];
}

export interface GroupSeller {
    id: number;
    name: string;
    max_active_orders: number | null;
    active_orders: number;
    group_id: number | null;
    is_leader: boolean;
}

export interface SalesGroupsData {
    groups: SalesGroup[];
    sellers: GroupSeller[];
}

export interface OverviewSeller {
    id: number;
    name: string;
    group: GroupRef | null;
    is_leader: boolean;
    weight: number | null;
    active_orders: number;
    max_active_orders: number | null;
    at_capacity: boolean;
    target_share: number;
    received_today: number;
}

export interface OverviewShop {
    id: number;
    name: string;
    is_open: boolean;
    received_today: number;
    sellers: OverviewSeller[];
}

export interface SellerRef {
    id: number;
    name: string;
    group: GroupRef | null;
    active_orders: number;
}

export interface AssignmentOverview {
    shops: OverviewShop[];
    sellers: SellerRef[];
    load_balanced: boolean;
}

export interface ReassignStatus {
    id: number;
    description: string;
    count: number;
    default: boolean;
}

export interface ReassignPreview {
    statuses: ReassignStatus[];
    group_mate_ids: number[];
}
