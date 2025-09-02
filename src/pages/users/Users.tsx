import { useEffect, useState } from "react";
import { useUserStore } from "../../store/user/UserStore";
import { Loading } from "../../components/ui/content/Loading";
import { Layout } from "../../components/ui/Layout";
import { DescripcionDeVista } from "../../components/ui/content/DescripcionDeVista";
import { TypographyCustom } from "../../components/custom";
import { UsersDataTable } from "../../components/users/UsersDataTable";
import { IResponse } from "../../interfaces/response-type";
import { request } from "../../common/request";
const useGetUsers = (url: string) => {
    const [data, setData] = useState<any>(null);
    const [errors, setErrors] = useState<any>(null);

    const getData = async () => {
        const { status, response }: IResponse = await request(url, 'GET');
        switch (status) {
            case 200:
                const { data: apiData } = await response.json()
                setData(apiData);
                break;
            case 400:
                const { errors } = await response.json();
                setErrors(errors);
                break;
            default:
                setErrors(['Ocurrio un error inesperado']);
                break;
        }
    }
    useEffect(() => {
        getData();
    }, []);

    return { data, setData, errors, getData }
}
export const Users = () => {
    const user = useUserStore(state => state.user);
    const { data, setData, errors } = useGetUsers('/users');
    const validateToken = useUserStore((state) => state.validateToken);
    const validarSesion = async () => {
        const result = await validateToken();
        console.log({ result });
        if (!result.status) return window.location.href = '/';
    }
    useEffect(() => {
        validarSesion();
    }, [])
    if (!user.token) return (
        <Loading />
    )

    return (
        <Layout>
            <DescripcionDeVista title={"Usuarios"} description={"En esta vista podras consultar los usuarios registrados"} />
            {errors && errors.length > 0 && (
                <>
                    <TypographyCustom color='error'>Ocurrio un error</TypographyCustom>
                    <TypographyCustom color='error'>{JSON.stringify(errors)}</TypographyCustom>
                </>
            )}
            {data && (
                <UsersDataTable data={data} setData={setData} />
            )}
        </Layout >
    )
}

