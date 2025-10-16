export const fmtMoney = (value: number, currency: string = "USD") =>
    new Intl.NumberFormat("es-VE", {
        style: "currency",
        currency,
        minimumFractionDigits: 2,
    }).format(value || 0);
