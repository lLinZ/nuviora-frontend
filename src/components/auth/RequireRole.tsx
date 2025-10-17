import React from "react"; "
import { Loading } from "../ui/content/Loading";
import { useValidateSession } from "../../hooks/useValidateSession";

export const RequireRole = ({
    allowedRoles,
    fallback,
    children,
}: {
    allowedRoles?: string[];
    fallback?: React.ReactNode; // e.g. <Forbidden />
    children: React.ReactNode;
}) => {
    const { loading, isValid, user, hasRole } = useValidateSession(allowedRoles);

    if (loading || !isValid || !user?.token) return <Loading />;
    if (!hasRole) return <>{fallback ?? <div style={{ padding: 24 }}>403 — No autorizado</div>}</>;

    return <>{children}</>;
};
