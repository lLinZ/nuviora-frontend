import { getCookieValue } from "../lib/functions";
import { useUserStore } from "../store/user/UserStore";

type Method = "POST" | "GET" | "PUT" | "DELETE";
type BodyType = URLSearchParams | FormData | string | undefined;

export const request = async (
    _url: string,
    method: Method,
    body?: BodyType,
    multipart = false
) => {
    const url = `${import.meta.env.VITE_BACKEND_API_URL}${_url}`;
    const token =
        useUserStore.getState().user.token ?? getCookieValue("token");

    const headers: Record<string, string> = {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
    };

    // Auto-detect Content-Type if not multipart
    if (!multipart) {
        if (body && typeof body === 'string') {
            headers["Content-Type"] = "application/json";
        } else if (body && !(body instanceof URLSearchParams) && !(body instanceof FormData)) {
            // If body is a plain object, stringify it and set JSON header
            // But the signature says BodyType = URLSearchParams | FormData | undefined
            // We need to update the signature first.
            // However, for now, let's assume the caller stringifies it.
            headers["Content-Type"] = "application/json";
        } else {
            headers["Content-Type"] = "application/x-www-form-urlencoded";
        }
    }

    const options: RequestInit = {
        method,
        headers,
    };

    if (method !== "GET" && body) {
        options.body = body as any;
    }

    try {
        const response = await fetch(url, options);
        return { status: response.status, response, err: [] };
    } catch (err) {
        return { status: 500, response: {} as any, err };
    }
};
