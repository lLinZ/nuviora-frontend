/** Varias agencias por ciudad (tareas 3c, 6 y 8). Ver AgencyRoutingController en el backend. */

export type RoutingAgency = {
    id: number;
    names: string;
    color?: string | null;
    /** Tarifa por carrera (USD). */
    delivery_cost: number;
    /** null = sin tope. */
    max_active_orders: number | null;
    /** Órdenes en Asignar a agencia, Asignar/Asignado a repartidor o En ruta. */
    active: number;
    full: boolean;
    cities: string[];
};

export type CityAgency = {
    id: number;
    names: string;
    color?: string | null;
    /** % en esta ciudad; null = reparto parejo. */
    weight: number | null;
    is_active: boolean;
    /** Parte que le toca hoy entre las activas (0 a 1). */
    share: number;
    active: number;
    max_active_orders: number | null;
};

export type RoutingCity = {
    id: number;
    name: string;
    delivery_cost_usd: number;
    /** Órdenes esperando porque todas sus agencias están llenas. */
    pending: number;
    agencies: CityAgency[];
};

export type AgencyRouting = {
    agencies: RoutingAgency[];
    cities: RoutingCity[];
};
