import React from "react";
import { Box } from "@mui/material";
import PaymentMethodsSelector, { PaymentMethod } from "./payment_method/PaymentMethod";

export const OrderPaymentSection = () => {
    const handleSavePayments = (payments: PaymentMethod[]) => {
        console.log("Métodos de pago seleccionados:", payments);

        const body = new URLSearchParams();
        payments.forEach((payment, index) => {
            body.append(`payments[${index}][method]`, payment.method);
            body.append(`payments[${index}][amount]`, payment.amount.toString());
        });

        // The original code did not perform a request here. 
        // Preserving logic as-is during refactor.
    };

    return (
        <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
            <PaymentMethodsSelector
                onSave={handleSavePayments}
                initialValue={[
                    { method: "DOLARES_EFECTIVO", amount: 20 },
                ]}
            />
        </Box>
    );
};
