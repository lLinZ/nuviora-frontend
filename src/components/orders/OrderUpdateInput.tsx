import React, { useState } from "react";
import { Box, Dialog, IconButton, darken, lighten, useTheme } from "@mui/material";
import { AttachFile, CloseRounded, SendRounded } from "@mui/icons-material";
import { red } from "@mui/material/colors";
import { toast } from "react-toastify";
import { TextFieldCustom } from "../custom";
import { useUserStore } from "../../store/user/UserStore";
import { useOrdersStore } from "../../store/orders/OrdersStore";
import { IResponse } from "../../interfaces/response-type";
import { request } from "../../common/request";

interface OrderUpdateInputProps {
    orderId: number;
}

export const OrderUpdateInput: React.FC<OrderUpdateInputProps> = ({ orderId }) => {
    const theme = useTheme();
    const user = useUserStore((state) => state.user);
    const { selectedOrder, updateOrder } = useOrdersStore();

    const [newUpdate, setNewUpdate] = useState<string>("");
    const [newUpdateImage, setNewUpdateImage] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [openPrevieww, setOpenPreview] = useState(false);

    const handleSendUpdate = async () => {
        if (!newUpdate.trim() || !orderId) return;

        const form = new FormData();
        form.append("message", newUpdate);
        if (newUpdateImage) form.append("image", newUpdateImage);

        try {
            const { status, response }: IResponse = await request(
                `/orders/${orderId}/updates`,
                "POST",
                form,
                true
            );

            if (status) {
                const data = await response.json();

                updateOrder({
                    ...selectedOrder,
                    updates: [...(selectedOrder?.updates ?? []), data.update],
                });

                setNewUpdate("");
                setNewUpdateImage(null);
                setPreview(null);

                toast.success("Actualización agregada ✅");
            } else {
                toast.error("No se pudo guardar la actualización ❌");
            }
        } catch (err) {
            toast.error("Error en servidor ⚠️");
        }
    };

    return (
        <Box sx={{
            display: "flex", flexFlow: 'column wrap', gap: 2, alignItems: "center", width: '100%', margin: 'auto',
            borderTop: '2px solid rgba(109, 109, 109, 0.1)',
            p: 2,
            background:
                theme.palette.mode === "dark"
                    ? darken(user.color, 0.92)
                    : lighten(user.color, 0.97),
            paddingInline: 2
        }}>

            {preview && (<>
                <Dialog open={openPrevieww} onClose={() => setOpenPreview(false)} maxWidth="xl" >
                    <img
                        src={preview!}
                        alt="preview"
                        style={{ width: '100%' }}
                    />
                </Dialog>
                <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>

                    <Box sx={{ cursor: 'pointer', display: 'flex', flexDirection: 'row', gap: 1, alignItems: 'center', position: 'relative', width: 65, height: 65 }} onClick={() => setOpenPreview(true)}  >
                        <Box sx={{ position: 'relative', display: 'inline-block' }}>
                            <img
                                src={preview}
                                alt="preview"
                                style={{ width: '100%' }}
                            />
                            <IconButton color="error" sx={{ width: 25, height: 25, position: 'absolute', top: 0, right: 0, zIndex: 99999, background: red[700], color: (theme) => theme.palette.getContrastText(red[700]), '&:hover': { color: red[700] } }} onClick={(e: any) => { e.stopPropagation(); setPreview(null); setNewUpdateImage(null); }}>
                                <CloseRounded sx={{ width: 15, height: 15 }} />
                            </IconButton>
                        </Box>
                    </Box>
                </Box>
            </>
            )}
            <Box sx={{ display: "flex", flexFlow: 'row wrap', alignItems: "center", gap: 1, width: { xs: '100%', md: '80%', lg: '50%' } }}>

                <TextFieldCustom
                    label="Dejar una actualización..."
                    value={newUpdate}
                    multiline
                    onChange={(e: any) => setNewUpdate(e.target.value)}
                    onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSendUpdate();
                        }
                    }}
                />

                <Box sx={{ display: 'flex', flexFlow: 'row nowrap', gap: 1, alignItems: 'center', justifyContent: "end", width: '100%' }}>

                    {/* input oculto */}
                    {user.role?.description !== 'Vendedor' && (<>
                        <input
                            type="file"
                            accept="image/*"
                            id="update-image"
                            style={{ display: "none" }}
                            onChange={(e: any) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                setNewUpdateImage(file);
                                setPreview(URL.createObjectURL(file));
                            }}
                        />

                        <label htmlFor="update-image">
                            <IconButton component="span">
                                <AttachFile />
                            </IconButton>
                        </label>
                    </>
                    )}

                    <IconButton
                        onClick={handleSendUpdate}
                        sx={{
                            background: user.color,
                            "&:hover": { background: darken(user.color, 0.2) },
                            color: theme.palette.getContrastText(user.color),
                        }}
                    >
                        <SendRounded />
                    </IconButton>
                </Box>
            </Box>
        </Box>
    );
};
