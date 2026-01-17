import { useState, useEffect, ChangeEvent } from "react";
import { toast } from "react-toastify";
import { request } from "../common/request";
import { IResponse } from "../interfaces/response-type";
import { useOrdersStore } from "../store/orders/OrdersStore";
import { useUserStore } from "../store/user/UserStore";

export const useOrderDialogLogic = (
    id: number | undefined,
    open: boolean,
    setOpen: React.Dispatch<React.SetStateAction<boolean>>
) => {
    const { selectedOrder, setSelectedOrder, updateOrder } = useOrdersStore();
    const user = useUserStore((state) => state.user);

    const [openCancel, setOpenCancel] = useState(false);
    const [openPostpone, setOpenPostpone] = useState(false);
    const [openApprove, setOpenApprove] = useState(false);
    const [openReject, setOpenReject] = useState(false);
    const [openApproveDelivery, setOpenApproveDelivery] = useState(false);
    const [openRejectDelivery, setOpenRejectDelivery] = useState(false);
    const [openApproveLocation, setOpenApproveLocation] = useState(false);

    const [openRejectLocation, setOpenRejectLocation] = useState(false);
    const [openApproveRejection, setOpenApproveRejection] = useState(false);
    const [openRejectRejection, setOpenRejectRejection] = useState(false);

    // 🆕 Novedades and Cash
    const [openMarkDelivered, setOpenMarkDelivered] = useState(false);
    const [openReportNovedad, setOpenReportNovedad] = useState(false);
    const [openResolveNovedad, setOpenResolveNovedad] = useState(false);
    const [pendingStatus, setPendingStatus] = useState<{ description: string, id: number } | null>(null);

    const [loadingReview, setLoadingReview] = useState(false);
    const [openAssignDeliverer, setOpenAssignDeliverer] = useState(false);
    const [openAssign, setOpenAssign] = useState(false);
    const [newLocation, setNewLocation] = useState<string>("");

    const handleClose = () => setOpen(false);

    useEffect(() => {
        if (id && open) {
            const fetchOrder = async () => {
                const { status, response }: IResponse = await request(`/orders/${id}`, "GET");
                if (status) {
                    const data = await response.json();
                    setSelectedOrder(data.order);
                    setNewLocation(data.order.location || "");
                }
            };
            fetchOrder();
        }
    }, [id, open, setSelectedOrder]);

    const sendLocation = async () => {
        if (!newLocation || !id) return;
        const body = new URLSearchParams();
        body.append('location', String(newLocation));

        try {
            const { status, response }: IResponse = await request(
                `/orders/${id}/location`,
                "PUT",
                body
            );
            if (status === 200) {
                const data = await response.json();
                updateOrder(data);
                toast.success('Ubicacion actualizada');
            } else {
                toast.error('No se logro añadir la ubicacion');
            }
        } catch (e) {
            toast.error('No se logro conectar con el servidor');
            console.log({ e });
        }
    };

    const approveCancellation = async (note: string) => {
        if (!selectedOrder) return;
        setLoadingReview(true);
        try {
            const pending = (selectedOrder.cancellations ?? []).find((c: any) => c.status === "pending");
            if (!pending) {
                toast.error("No hay solicitud pendiente");
                return;
            }
            const body = new URLSearchParams();
            if (note.trim()) body.append("response_note", note.trim());

            const { status, response }: IResponse = await request(
                `/orders/cancellations/${pending.id}/approve`,
                "PUT",
                body
            );
            if (status) {
                const data = await response.json();
                updateOrder(data.order);
                toast.success("Cancelación aprobada ✅");
                setOpenApprove(false);
            } else {
                toast.error("No se pudo aprobar ❌");
            }
        } catch {
            toast.error("Error al aprobar 🚨");
        } finally {
            setLoadingReview(false);
        }
    };

    const rejectCancellation = async (note: string) => {
        if (!selectedOrder) return;
        setLoadingReview(true);
        try {
            const pending = (selectedOrder.cancellations ?? []).find((c: any) => c.status === "pending");
            if (!pending) {
                toast.error("No hay solicitud pendiente");
                return;
            }
            const body = new URLSearchParams();
            if (note.trim()) body.append("response_note", note.trim());

            const { status, response }: IResponse = await request(
                `/orders/cancellations/${pending.id}/reject`,
                "PUT",
                body
            );
            if (status) {
                const data = await response.json();
                updateOrder(data.order);
                toast.success("Cancelación rechazada ❎");
                setOpenReject(false);
            } else {
                toast.error("No se pudo rechazar ❌");
            }
        } catch {
            toast.error("Error al rechazar 🚨");
        } finally {
            setLoadingReview(false);
        }
    };

    const changeStatus = async (status: string, statusId: number, extraData: any = null) => {
        if (!selectedOrder) return;

        // Intercept Novedades
        if (status === "Novedades" && !extraData) {
            setPendingStatus({ description: status, id: statusId });
            setOpenReportNovedad(true);
            return;
        }

        // Intercept Novedad Solucionada
        if (status === "Novedad Solucionada" && !extraData) {
            setPendingStatus({ description: status, id: statusId });
            setOpenResolveNovedad(true);
            return;
        }

        if (status === "Asignado a repartidor" && !selectedOrder.deliverer) {
            setOpenAssignDeliverer(true);
            return;
        }

        // Validar que existe comprobante de pago si se intenta cambiar a Entregado
        if (status === "Entregado") {
            if (!selectedOrder.payment_receipt) {
                toast.error("No se puede marcar como entregado sin un comprobante de pago ❌");
                return;
            }
            if (!extraData) {
                setPendingStatus({ description: status, id: statusId });
                setOpenMarkDelivered(true);
                return;
            }
        }

        // Intercept postponing
        if (status === "Programado para otro dia" || status === "Programado para mas tarde") {
            setOpenPostpone(true);
            return;
        }

        const body = new URLSearchParams();
        body.append("status_id", String(statusId));

        if (extraData) {
            Object.keys(extraData).forEach(key => {
                body.append(key, String(extraData[key]));
            });
        }

        try {
            const { status: ok, response }: IResponse = await request(
                `/orders/${selectedOrder.id}/status`,
                "PUT",
                body
            );
            if (ok) {
                const data = await response.json();
                updateOrder(data.order);
                toast.success(`Orden #${selectedOrder.name} actualizada a ${status} ✅`);

                // Cleanup
                setOpenMarkDelivered(false);
                setOpenReportNovedad(false);
                setOpenResolveNovedad(false);
                setPendingStatus(null);
            } else {
                const errorData = await response.json();
                toast.error(errorData.message || "No se pudo actualizar el estado ❌");
            }
        } catch {
            toast.error("Error en el servidor al actualizar estado 🚨");
        }
    };

    const addUpsell = async (productId: number, quantity: number, price: number) => {
        if (!selectedOrder) return false;
        try {
            const body = new URLSearchParams();
            body.append("product_id", String(productId));
            body.append("quantity", String(quantity));
            body.append("price", String(price));

            const { status, response }: IResponse = await request(
                `/orders/${selectedOrder.id}/upsell`,
                "POST",
                body
            );

            if (status) {
                const data = await response.json();
                updateOrder(data.order);
                toast.success("Upsell agregado correctamente ✅");
                return true;
            } else {
                toast.error("Error al agregar upsell ❌");
                return false;
            }
        } catch {
            toast.error("Error de servidor 🚨");
            return false;
        }
    };

    const removeUpsell = async (itemId: number) => {
        if (!selectedOrder) return;
        try {
            const { status, response }: IResponse = await request(
                `/orders/${selectedOrder.id}/upsell/${itemId}`,
                "DELETE"
            );

            if (status) {
                const data = await response.json();
                updateOrder(data.order);
                toast.success("Upsell eliminado correctamente ✅");
            } else {
                toast.error("Error al eliminar upsell ❌");
            }
        } catch {
            toast.error("Error de servidor 🚨");
        }
    };

    const approveDelivery = async (note: string) => {
        if (!selectedOrder) return;
        setLoadingReview(true);
        try {
            const pending = (selectedOrder.delivery_reviews ?? []).find((c: any) => c.status === "pending");
            if (!pending) {
                toast.error("No hay solicitud de entrega pendiente");
                return;
            }
            const body = new URLSearchParams();
            if (note.trim()) body.append("response_note", note.trim());

            const { status, response }: IResponse = await request(
                `/orders/delivery-review/${pending.id}/approve`,
                "PUT",
                body
            );
            if (status) {
                const data = await response.json();
                updateOrder(data.order);
                toast.success("Entrega aprobada ✅");
                setOpenApproveDelivery(false);
            } else {
                toast.error("No se pudo aprobar la entrega ❌");
            }
        } catch {
            toast.error("Error al aprobar entrega 🚨");
        } finally {
            setLoadingReview(false);
        }
    };

    const rejectDelivery = async (note: string) => {
        if (!selectedOrder) return;
        setLoadingReview(true);
        try {
            const pending = (selectedOrder.delivery_reviews ?? []).find((c: any) => c.status === "pending");
            if (!pending) {
                toast.error("No hay solicitud de entrega pendiente");
                return;
            }
            const body = new URLSearchParams();
            if (note.trim()) body.append("response_note", note.trim());

            const { status, response }: IResponse = await request(
                `/orders/delivery-review/${pending.id}/reject`,
                "PUT",
                body
            );
            if (status) {
                const data = await response.json();
                updateOrder(data.order);
                toast.success("Entrega rechazada ❎");
                setOpenRejectDelivery(false);
            } else {
                toast.error("No se pudo rechazar la entrega ❌");
            }
        } catch {
            toast.error("Error al rechazar entrega 🚨");
        } finally {
            setLoadingReview(false);
        }
    };

    const approveLocation = async (note: string) => {
        if (!selectedOrder) return;
        setLoadingReview(true);
        try {
            const pending = (selectedOrder.location_reviews ?? []).find((c: any) => c.status === "pending");
            if (!pending) {
                toast.error("No hay solicitud de ubicación pendiente");
                return;
            }
            const body = new URLSearchParams();
            if (note.trim()) body.append("response_note", note.trim());

            const { status, response }: IResponse = await request(
                `/orders/location-review/${pending.id}/approve`,
                "PUT",
                body
            );
            if (status) {
                const data = await response.json();
                updateOrder(data.order);
                toast.success("Cambio de ubicación aprobado ✅");
                setOpenApproveLocation(false);
            } else {
                toast.error("No se pudo aprobar el cambio ❌");
            }
        } catch {
            toast.error("Error al aprobar 🚨");
        } finally {
            setLoadingReview(false);
        }
    };

    const rejectLocation = async (note: string) => {
        if (!selectedOrder) return;
        setLoadingReview(true);
        try {
            const pending = (selectedOrder.location_reviews ?? []).find((c: any) => c.status === "pending");
            if (!pending) {
                toast.error("No hay solicitud de ubicación pendiente");
                return;
            }
            const body = new URLSearchParams();
            if (note.trim()) body.append("response_note", note.trim());

            const { status, response }: IResponse = await request(
                `/orders/location-review/${pending.id}/reject`,
                "PUT",
                body
            );
            if (status) {
                const data = await response.json();
                updateOrder(data.order);
                toast.success("Cambio de ubicación rechazado ❎");
                setOpenRejectLocation(false);
            } else {
                toast.error("No se pudo rechazar el cambio ❌");
            }
        } catch {
            toast.error("Error al rechazar 🚨");
        } finally {
            setLoadingReview(false);
        }
    };

    const approveRejection = async (note: string) => {
        if (!selectedOrder) return;
        setLoadingReview(true);
        try {
            const pending = (selectedOrder.rejection_reviews ?? []).find((c: any) => c.status === "pending");
            if (!pending) {
                toast.error("No hay solicitud de rechazo pendiente");
                return;
            }
            const body = new URLSearchParams();
            if (note.trim()) body.append("response_note", note.trim());

            const { status, response }: IResponse = await request(
                `/orders/rejection-review/${pending.id}/approve`,
                "PUT",
                body
            );
            if (status) {
                const data = await response.json();
                updateOrder(data.order);
                toast.success("Rechazo aprobado ✅");
                setOpenApproveRejection(false);
            } else {
                toast.error("No se pudo aprobar el rechazo ❌");
            }
        } catch {
            toast.error("Error el aprobar 🚨");
        } finally {
            setLoadingReview(false);
        }
    };

    const rejectRejection = async (note: string) => {
        if (!selectedOrder) return;
        setLoadingReview(true);
        try {
            const pending = (selectedOrder.rejection_reviews ?? []).find((c: any) => c.status === "pending");
            if (!pending) {
                toast.error("No hay solicitud de rechazo pendiente");
                return;
            }
            const body = new URLSearchParams();
            if (note.trim()) body.append("response_note", note.trim());

            const { status, response }: IResponse = await request(
                `/orders/rejection-review/${pending.id}/reject`,
                "PUT",
                body
            );
            if (status) {
                const data = await response.json();
                updateOrder(data.order);
                toast.success("Solicitud de rechazo denegada ❎");
                setOpenRejectRejection(false);
            } else {
                toast.error("No se pudo denegar la solicitud ❌");
            }
        } catch {
            toast.error("Error al denegar 🚨");
        } finally {
            setLoadingReview(false);
        }
    };

    const handleChangeNewLocation = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setNewLocation(e.target.value);
    };

    const setReminder = async (date: string) => {
        if (!selectedOrder) return;
        try {
            const body = new URLSearchParams();
            body.append('reminder_at', date);

            const { status, response }: IResponse = await request(
                `/orders/${selectedOrder.id}/reminder`,
                "PUT",
                body
            );
            if (status) {
                const data = await response.json();
                updateOrder(data.order);
                toast.success('Recordatorio establecido 📅');
            } else {
                toast.error('Error al guardar recordatorio');
            }
        } catch {
            toast.error('Error de conexión');
        }
    };

    return {
        selectedOrder,
        user,
        openCancel, setOpenCancel,
        openPostpone, setOpenPostpone,
        openApprove, setOpenApprove,
        openReject, setOpenReject,
        loadingReview,
        openAssignDeliverer, setOpenAssignDeliverer,
        openAssign, setOpenAssign,
        newLocation,
        handleClose,
        sendLocation,
        approveCancellation,
        rejectCancellation,
        changeStatus,
        handleChangeNewLocation,
        updateOrder,
        addUpsell,
        removeUpsell,
        openApproveDelivery, setOpenApproveDelivery,
        openRejectDelivery, setOpenRejectDelivery,
        approveDelivery,
        rejectDelivery,
        openApproveLocation, setOpenApproveLocation,
        openRejectLocation, setOpenRejectLocation,
        openApproveRejection, setOpenApproveRejection,
        openRejectRejection, setOpenRejectRejection,
        approveLocation,
        rejectLocation,
        approveRejection,
        rejectRejection,
        setReminder,
        // 🆕 
        openMarkDelivered, setOpenMarkDelivered,
        openReportNovedad, setOpenReportNovedad,
        openResolveNovedad, setOpenResolveNovedad,
        pendingStatus
    };
};
