import React from "react";
import { useValidateSession } from "../../hooks/useValidateSession";
import { Loading } from "../ui/content/Loading";

export const RequireRole = ({
    allowedRoles,
    fallback,
    children,
}: {
    allowedRoles?: string[];
    fallback?: React.ReactNode; // e.g. <Forbidden />
    children: React.ReactNode;
}) => {
    const { loadingSession, isValid, user, hasRole } = useValidateSession(allowedRoles);

    if (loadingSession || !isValid || !user?.token) return <Loading />;
    if (!hasRole) return <>{fallback ?? <div style={{ padding: 24 }}>403 — No autorizado</div>}</>;

    return <>{children}</>;
};
