// components/orders/AgentsFilter.tsx
import { Autocomplete, Box, TextField, CircularProgress } from "@mui/material";
import { useEffect, useState } from "react";
import { request } from "../../common/request";
import { IResponse } from "../../interfaces/response-type";
import { useOrdersStore } from "../../store/orders/OrdersStore";
import { toast } from "react-toastify";

export const AgentsFilter = () => {
    const { selectedAgentId, setSelectedAgentId } = useOrdersStore();
    const [agents, setAgents] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const loadAgents = async () => {
            setLoading(true);
            try {
                const { status, response }: IResponse = await request("/users/agents", "GET");
                if (status) {
                    const data = await response.json();
                    setAgents(data.data ?? []);
                } else {
                    toast.error("No se pudieron cargar los vendedores");
                }
            } catch {
                toast.error("Error al cargar vendedores");
            } finally {
                setLoading(false);
            }
        };
        loadAgents();
    }, []);

    const value = agents.find((a) => a.id === selectedAgentId) ?? null;

    return (
        <Box sx={{ mb: 2, maxWidth: 360 }}>
            <Autocomplete
                loading={loading}
                options={agents}
                value={value}
                onChange={(_, val) => setSelectedAgentId(val?.id ?? null)}
                getOptionLabel={(o) => `${o.names} ${o.surnames}`}
                isOptionEqualToValue={(opt, val) => opt.id === val.id}
                renderInput={(params) => (
                    <TextField
                        {...params}
                        label="Filtrar por vendedor"
                        InputProps={{
                            ...params.InputProps,
                            endAdornment: (
                                <>
                                    {loading ? <CircularProgress size={18} /> : null}
                                    {params.InputProps.endAdornment}
                                </>
                            ),
                        }}
                    />
                )}
            />
        </Box>
    );
};
