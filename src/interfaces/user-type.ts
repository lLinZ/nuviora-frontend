import { IRole } from "../store/user/UserStore";

export interface UserType {
    id: number;
    names: string;
    surnames: string;
    email: string;
    phone: string;
    address: string;
    role: IRole;
    status: string;
    created_at: string;
    updated_at: string;
}
