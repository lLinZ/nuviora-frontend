import React, { ChangeEvent } from "react";
import { Avatar, Box, Chip, CircularProgress, Typography } from "@mui/material";
import { TypographyCustom, TextFieldCustom } from "../custom";
import { Link } from "react-router-dom";
import DenseMenu from "../ui/content/DenseMenu";

interface OrderHeaderProps {
    order: any;
    user: any;
    changeStatus: (status: string, statusId: number) => void;
    newLocation: string;
    sendLocation: () => Promise<void>;
    handleChangeNewLocation: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

export const OrderHeader: React.FC<OrderHeaderProps> = ({
    order,
    user,
    changeStatus,
    newLocation,
    sendLocation,
    handleChangeNewLocation
}) => {
    return (
        <Box sx={{ paddingBlock: 4, display: 'flex', flexFlow: 'column wrap', justifyContent: 'center', alignItems: 'center' }}>
            {order.products?.length > 0 ? (
                <Avatar
                    src={order.products[0].image || undefined}
                    alt={order.products[0].title}
                    variant="rounded"
                    sx={{ width: 150, height: 150, mb: 2, borderRadius: '50%' }}
                >
                    {!order.products[0].image && (order.products[0].title?.charAt(0) ?? "P")}
                </Avatar>
            ) : (
                <Avatar
                    variant="rounded"
                    sx={{ width: 150, height: 150, mb: 2, borderRadius: '50%' }}
                >
                    <CircularProgress />
                </Avatar>
            )}

            <Box sx={{ display: 'flex', gap: 2 }}>
                <TypographyCustom variant="h5">Orden {order.name}</TypographyCustom>
                <DenseMenu
                    data={order}
                    changeStatus={changeStatus}
                    icon={false}
                    customComponent={
                        <Chip
                            sx={{
                                cursor: 'pointer',
                                background: user.color,
                                color: (theme) => theme.palette.getContrastText(user.color)
                            }}
                            label={`Status ${order.status.description}`}
                        />
                    }
                />
            </Box>

            <TypographyCustom>
                Cliente: {order.client.first_name} {order.client.last_name}
            </TypographyCustom>

            <TypographyCustom
                variant="subtitle2"
                color="text.secondary"
                sx={{
                    maxWidth: "200px",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                }}
            >
                {order.client.phone}
            </TypographyCustom>

            <TypographyCustom
                variant="subtitle2"
                color="text.secondary"
                sx={{
                    maxWidth: "200px",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                }}
            >
                {order.client.province}
            </TypographyCustom>

            <TypographyCustom>
                Total: {order.current_total_price} {order.currency}
            </TypographyCustom>

            {/** Vendedor */}
            {order.agent && <TypographyCustom>Vendedor: {order.agent.names}</TypographyCustom>}

            {/** Repartidor */}
            {order.deliverer && <TypographyCustom>Repartidor: {order.deliverer.names}</TypographyCustom>}

            {/** Ubicacion */}
            {user.role?.description === 'Repartidor' ? (
                (order.location ? (
                    <Link to={order.location} target="_blank" style={{ textDecoration: 'none' }}>
                        <TypographyCustom fontWeight={'bold'} sx={{ color: user.color }}>{order.location}</TypographyCustom>
                    </Link>
                ) : (
                    <TypographyCustom color="error">No hay ubicacion asignada aun</TypographyCustom>
                ))
            ) : (
                <Box sx={{ display: 'flex', flexFlow: 'row nowrap', gap: 1, justifyContent: 'space-evenly', alignItems: 'center' }}>
                    <TextFieldCustom
                        onBlur={sendLocation}
                        onChange={handleChangeNewLocation}
                        value={newLocation}
                        label="Ubicacion"
                    />
                </Box>
            )}
        </Box>
    );
};
