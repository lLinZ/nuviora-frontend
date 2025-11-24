import { getCookieValue } from "../lib/functions";
import { useUserStore } from "../store/user/UserStore";

type Method = "POST" | "GET" | "PUT" | "DELETE";
type BodyType = URLSearchParams | FormData | undefined;

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

    // Solo seteamos Content-Type cuando NO es multipart
    if (!multipart) {
        headers["Content-Type"] = "application/x-www-form-urlencoded";
    }

    const options: RequestInit = {
        method,
        headers,
    };

    if (method !== "GET" && body) {
        options.body = body;
    }

    try {
        const response = await fetch(url, options);
        return { status: response.status, response, err: [] };
    } catch (err) {
        return { status: 500, response: {} as any, err };
    }
};
