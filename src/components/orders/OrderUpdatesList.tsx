import React from "react";
import { Box, Avatar, Tooltip, Divider, useTheme } from "@mui/material";
import { TypographyCustom } from "../custom";

interface OrderUpdatesListProps {
    updates: any[];
}

export const OrderUpdatesList: React.FC<OrderUpdatesListProps> = ({ updates }) => {
    const theme = useTheme();

    return (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1, paddingBlock: 5, width: { xs: '100%', md: '80%', lg: '50%' }, margin: 'auto' }}>
            {updates?.length > 0 ? (
                updates.map((u: any) => (
                    <Box key={u.id} sx={{ p: 2, borderRadius: 5, border: (theme) => `1px solid ${theme.palette.divider}`, display: "flex", flexDirection: "column" }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1 }}>
                            <Avatar sx={{ bgcolor: u.user?.color, color: (theme) => theme.palette.getContrastText(u.user?.color || theme.palette.primary.main) }}>
                                {u.user?.names?.charAt(0) ?? "U"}
                            </Avatar>
                            <Tooltip title={u.user?.email || ''} arrow placement="top">
                                <TypographyCustom variant="subtitle2" fontWeight="bold" >
                                    {`${u.user?.names} ${u.user?.surnames}`}
                                </TypographyCustom>
                            </Tooltip>
                        </Box>
                        <Divider sx={{ mb: 2 }} />
                        <Box sx={{ paddingInline: 2 }}>

                            <TypographyCustom variant="body2" fontWeight="normal">
                                {u.message}
                            </TypographyCustom>

                            {u.image_url && (
                                <Box sx={{ mt: 1 }}>
                                    <img src={u.image_url} alt="update" style={{ width: "100%", borderRadius: 10 }} />
                                </Box>
                            )}
                        </Box>
                        <Divider sx={{ mt: 2, mb: 1 }} />
                        <TypographyCustom variant="caption" color="text.secondary">
                            {new Date(u.created_at).toLocaleString()}
                        </TypographyCustom>
                    </Box>
                ))
            ) : (
                <TypographyCustom variant="body2" color="text.secondary">
                    No hay actualizaciones todavía.
                </TypographyCustom>
            )}
        </Box>
    );
};
