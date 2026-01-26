export interface ICompanyAccountDetail {
    label: string;
    value: string;
}

export interface ICompanyAccount {
    id: number;
    name: string;
    icon: string | null;
    details: ICompanyAccountDetail[] | null;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
}
