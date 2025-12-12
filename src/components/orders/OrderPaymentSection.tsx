import React, { useState } from "react";
import { Box, Typography, CircularProgress, Card, CardMedia, Dialog, IconButton, Zoom } from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import CloseIcon from "@mui/icons-material/Close";
import DownloadIcon from "@mui/icons-material/Download";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import PaymentMethodsSelector, { PaymentMethod } from "./payment_method/PaymentMethod";
import { request } from "../../common/request";
import { toast } from "react-toastify";
import { IResponse } from "../../interfaces/response-type";
import { ButtonCustom } from "../custom";

interface OrderPaymentSectionProps {
    order: any;
}

export const OrderPaymentSection: React.FC<OrderPaymentSectionProps> = ({ order }) => {
    const [uploading, setUploading] = useState(false);
    const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
    const [viewerOpen, setViewerOpen] = useState(false);
    const [zoomLevel, setZoomLevel] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    // Transformar los pagos del backend al formato del componente
    const initialPayments: PaymentMethod[] = order.payments?.length > 0
        ? order.payments.map((p: any) => ({
            method: p.method,
            amount: Number(p.amount),
        }))
        : [{ method: "", amount: 0 }];

    const handleSavePayments = async (payments: PaymentMethod[]) => {
        const body = new URLSearchParams();

        payments.forEach((payment, index) => {
            body.append(`payments[${index}][method]`, payment.method);
            body.append(`payments[${index}][amount]`, payment.amount.toString());
        });

        try {
            const { status, response }: IResponse = await request(
                `/orders/${order.id}/payment`,
                "PUT",
                body
            );

            if (status) {
                const data = await response.json();
                toast.success(data.message || "Pagos actualizados correctamente");
            } else {
                toast.error("Error al guardar los pagos");
            }
        } catch (error) {
            console.error(error);
            toast.error("Error de conexión");
        }
    };

    const handleReceiptUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            toast.error('Por favor selecciona una imagen válida');
            return;
        }

        // Validate file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
            toast.error('La imagen no debe superar los 5MB');
            return;
        }

        setUploading(true);

        try {
            const formData = new FormData();
            formData.append('payment_receipt', file);

            const { status, response }: IResponse = await request(
                `/orders/${order.id}/payment-receipt`,
                "POST",
                formData,
                true // multipart flag for FormData
            );

            if (status === 200) {
                const data = await response.json();
                toast.success(data.message || 'Comprobante subido exitosamente');
                setReceiptPreview(data.payment_receipt_url);
                // Reload order to get updated data
                window.location.reload();
            } else {
                const errorData = await response.json().catch(() => ({ message: 'Error al subir el comprobante' }));
                toast.error(errorData.message || 'Error al subir el comprobante');
            }
        } catch (error) {
            console.error(error);
            toast.error('Error de conexión al subir el comprobante');
        } finally {
            setUploading(false);
        }
    };

    const getReceiptUrl = () => {
        if (receiptPreview) return receiptPreview;
        if (order.payment_receipt) {
            const apiUrl = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:8000/api';
            // Use API endpoint instead of direct storage link to avoid CORS
            return `${apiUrl}/orders/${order.id}/payment-receipt`;
        }
        return null;
    };

    const handleDownload = async () => {
        const url = getReceiptUrl();
        if (!url) return;

        try {
            // Fetch image (endpoint is public, no auth needed)
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error('Error al descargar');
            }

            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = `comprobante-orden-${order.name}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(downloadUrl);
            toast.success('Comprobante descargado');
        } catch (error) {
            console.error(error);
            toast.error('Error al descargar el comprobante');
        }
    };

    const handleZoomIn = () => {
        setZoomLevel(prev => Math.min(prev + 0.25, 3));
    };

    const handleZoomOut = () => {
        setZoomLevel(prev => Math.max(prev - 0.25, 0.5));
    };

    const handleOpenViewer = () => {
        setViewerOpen(true);
        setZoomLevel(1);
        setPosition({ x: 0, y: 0 });
    };

    const handleCloseViewer = () => {
        setViewerOpen(false);
        setZoomLevel(1);
        setPosition({ x: 0, y: 0 });
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (zoomLevel > 1) {
            setIsDragging(true);
            setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isDragging && zoomLevel > 1) {
            e.preventDefault();
            setPosition({
                x: e.clientX - dragStart.x,
                y: e.clientY - dragStart.y
            });
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    // Touch events for mobile
    const handleTouchStart = (e: React.TouchEvent) => {
        if (zoomLevel > 1) {
            setIsDragging(true);
            const touch = e.touches[0];
            setDragStart({ x: touch.clientX - position.x, y: touch.clientY - position.y });
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (isDragging && zoomLevel > 1) {
            // Prevent default to stop scrolling while dragging
            // e.preventDefault(); // Note: React synthetic events might typically handle this, but for scrolling we rely on overflow: hidden on container
            const touch = e.touches[0];
            setPosition({
                x: touch.clientX - dragStart.x,
                y: touch.clientY - dragStart.y
            });
        }
    };

    const handleTouchEnd = () => {
        setIsDragging(false);
    };

    return (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mb: 3, width: "100%" }}>
            <PaymentMethodsSelector
                key={JSON.stringify(order.payments)} // Force re-render when payments change due to fetch
                onSave={handleSavePayments}
                initialValue={initialPayments}
            />

            {/* Payment Receipt Section */}
            <Box sx={{ mt: 2 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                    Comprobante de Pago
                </Typography>

                {getReceiptUrl() ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Card
                            sx={{
                                maxWidth: { xs: '100%', sm: 400 },
                                cursor: 'pointer',
                                transition: 'transform 0.2s',
                                '&:hover': {
                                    transform: 'scale(1.02)'
                                }
                            }}
                            onClick={handleOpenViewer}
                        >
                            <CardMedia
                                component="img"
                                image={getReceiptUrl()!}
                                alt="Comprobante de pago"
                                sx={{
                                    maxHeight: 300,
                                    objectFit: 'contain',
                                    backgroundColor: '#f5f5f5'
                                }}
                            />
                        </Card>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            <ButtonCustom
                                variant="outlined"
                                startIcon={<FullscreenIcon />}
                                onClick={handleOpenViewer}
                                nofull
                            >
                                Ver en grande
                            </ButtonCustom>
                            <ButtonCustom
                                variant="outlined"
                                startIcon={<DownloadIcon />}
                                onClick={handleDownload}
                                nofull
                            >
                                Descargar
                            </ButtonCustom>
                        </Box>
                    </Box>
                ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        No hay comprobante de pago subido
                    </Typography>
                )}

                <ButtonCustom
                    component="label"
                    startIcon={uploading ? <CircularProgress size={20} /> : <CloudUploadIcon />}
                    disabled={uploading}
                    nofull
                    sx={{ mt: 2 }}
                >
                    {uploading ? 'Subiendo...' : (getReceiptUrl() ? 'Cambiar Comprobante' : 'Subir Comprobante')}
                    <input
                        type="file"
                        hidden
                        accept="image/*"
                        onChange={handleReceiptUpload}
                        disabled={uploading}
                    />
                </ButtonCustom>
            </Box>

            {/* Fullscreen Image Viewer */}
            <Dialog
                open={viewerOpen}
                onClose={handleCloseViewer}
                maxWidth={false}
                fullScreen
                TransitionComponent={Zoom}
                PaperProps={{
                    sx: {
                        backgroundColor: 'rgba(0, 0, 0, 0.95)',
                    }
                }}
            >
                {/* Close Button */}
                <IconButton
                    onClick={handleCloseViewer}
                    sx={{
                        position: 'fixed',
                        top: 16,
                        right: 16,
                        color: 'white',
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        '&:hover': {
                            backgroundColor: 'rgba(255, 255, 255, 0.2)',
                        },
                        zIndex: 1300
                    }}
                >
                    <CloseIcon />
                </IconButton>

                {/* Zoom Controls - Fixed at bottom */}
                <Box sx={{
                    position: 'fixed',
                    bottom: 16,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    display: 'flex',
                    gap: 1,
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: 3,
                    padding: 1.5,
                    zIndex: 1300,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
                }}>
                    <IconButton
                        onClick={handleZoomOut}
                        disabled={zoomLevel <= 0.5}
                        sx={{
                            color: 'white',
                            '&:disabled': { color: 'rgba(255,255,255,0.3)' }
                        }}
                    >
                        <ZoomOutIcon />
                    </IconButton>
                    <Typography sx={{
                        color: 'white',
                        alignSelf: 'center',
                        minWidth: 60,
                        textAlign: 'center',
                        fontWeight: 'bold'
                    }}>
                        {Math.round(zoomLevel * 100)}%
                    </Typography>
                    <IconButton
                        onClick={handleZoomIn}
                        disabled={zoomLevel >= 3}
                        sx={{
                            color: 'white',
                            '&:disabled': { color: 'rgba(255,255,255,0.3)' }
                        }}
                    >
                        <ZoomInIcon />
                    </IconButton>
                    <Box sx={{ width: 1, backgroundColor: 'rgba(255,255,255,0.2)', mx: 1 }} />
                    <IconButton
                        onClick={handleDownload}
                        sx={{ color: 'white' }}
                    >
                        <DownloadIcon />
                    </IconButton>
                </Box>

                {/* Scrollable container for image */}
                <Box sx={{
                    width: '100%',
                    height: '100%',
                    overflow: 'hidden', // Hide overflow to allow custom drag
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 2,
                    paddingBottom: 10,
                    cursor: zoomLevel > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
                }}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                >
                    {/* Image wrapper for zoom */}
                    <Box sx={{
                        display: 'inline-block',
                        transform: `scale(${zoomLevel}) translate(${position.x / zoomLevel}px, ${position.y / zoomLevel}px)`,
                        transformOrigin: 'center center',
                        transition: isDragging ? 'none' : 'transform 0.3s ease-out',
                        userSelect: 'none', // Prevent selection while dragging
                    }}>
                        <Box
                            component="img"
                            src={getReceiptUrl()!}
                            alt="Comprobante de pago"
                            sx={{
                                maxWidth: '90vw',
                                maxHeight: '90vh',
                                objectFit: 'contain',
                                display: 'block',
                                pointerEvents: 'none', // Let clicks pass through to container
                            }}
                        />
                    </Box>
                </Box>
            </Dialog>
        </Box>
    );
};
