import { useState, useEffect, ChangeEvent } from "react";
import { toast } from "react-toastify";
import { request } from "../../common/request";
import { IResponse } from "../../interfaces/response-type";
import { useOrdersStore } from "../../store/orders/OrdersStore";
import { useUserStore } from "../../store/user/UserStore";

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

    const changeStatus = async (status: string, statusId: number) => {
        if (!selectedOrder) return;
        if (status === "Asignado a repartidor" && !selectedOrder.deliverer) {
            setOpenAssignDeliverer(true);
            return;
        }

        const body = new URLSearchParams();
        body.append("status_id", String(statusId));
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
            } else {
                toast.error("No se pudo actualizar el estado ❌");
            }
        } catch {
            toast.error("Error en el servidor al actualizar estado 🚨");
        }
    };

    const handleChangeNewLocation = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setNewLocation(e.target.value);
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
        updateOrder
    };
};
