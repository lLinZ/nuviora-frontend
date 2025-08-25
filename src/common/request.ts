import { getCookieValue } from "../lib/functions";
import { useUserStore } from "../store/user/UserStore";

export const request = async (_url: string, method: 'POST' | 'GET' | 'PUT', body?: URLSearchParams) => {

    const url = `${import.meta.env.VITE_BACKEND_API_URL}${_url}`;
    const options = method !== 'GET' ?
        {
            method,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Bearer ${useUserStore.getState().user.token ?? getCookieValue('token')}`
            },
            body
        } : {
            method,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Bearer ${useUserStore.getState().user.token ?? getCookieValue('token')}`
            },
        }

    try {
        const response = await fetch(url, options);
        return { status: response.status, response, err: [] };
    } catch (err) {
        return { status: 500, response: {}, err };
    }
}