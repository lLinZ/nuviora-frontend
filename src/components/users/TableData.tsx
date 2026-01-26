import { TableRow, TableCell, IconButton, SelectChangeEvent } from "@mui/material";
import moment from "moment";
import { ChangeEvent, ReactNode, useState } from "react";
import EditRounded from "@mui/icons-material/EditRounded";
import { toast } from "react-toastify";
import { UserType } from "../../interfaces/user-type";
import { errorArrayLaravelTransformToString } from "../../lib/functions";
import { request } from "../../common/request";
import { IResponse } from "../../interfaces/response-type";
import { CancelRounded, CheckRounded } from "@mui/icons-material";
import { TextFieldCustom } from "../custom";


type InitialValues = Omit<UserType, 'id' | 'created_at' | 'updated_at' | 'closing_date' | 'observations'>

interface DataProps {
    data: any;
}
export const TableData = ({ data }: DataProps) => {
    const initialValues: InitialValues = {
        names: data.names,
        surnames: data.surnames,
        phone: data.phone,
        email: data.email,
        address: data.address,
        role: data.role,
        status: data.status,
        delivery_cost: data.delivery_cost ?? 0,
    }
    const [info, setInfo] = useState<UserType>(data);
    const [values, setValues] = useState<InitialValues>(initialValues);
    const [editing, setEditing] = useState<boolean>(false);
    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        setValues({ ...values, [e.target.name]: e.target.value })
    }
    const handleChangeSelect = (e: SelectChangeEvent<unknown>, child: ReactNode) => {
        setValues({ ...values, [e.target.name]: e.target.value })

    }
    const toggleEdit = () => {
        setEditing(!editing);
    }

    const onSubmit = async () => {
        const url = `/user/${data.id}`;
        const body = new URLSearchParams();
        for (const [key, value] of Object.entries(values)) {
            body.append(key, String(value));
        }
        const { status, response, err }: IResponse = await request(url, 'PUT', body);
        switch (status) {
            case 200:
                const { data } = await response.json();
                setInfo(data)
                toast.success('Se ha actualizado la información')
                setEditing(false);
                break;
            case 400:
                const { errors } = await response.json();
                toast.error(errorArrayLaravelTransformToString(errors))
                break;
            default:
                toast.error(`Ocurrio un error inesperado (${response.status})`)
        }
    }
    return (
        <>
            {editing ?
                <TableRow>
                    <TableCell sx={{ whiteSpace: 'nowrap', textAlign: 'center' }}>{info.id}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap', textAlign: 'center' }}><TextFieldCustom name="names" onChange={handleChange} value={values.names} /></TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap', textAlign: 'center' }}><TextFieldCustom name="surnames" onChange={handleChange} value={values.surnames} /></TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap', textAlign: 'center' }}><TextFieldCustom name="phone" onChange={handleChange} value={values.phone} /></TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap', textAlign: 'center' }}><TextFieldCustom name="email" onChange={handleChange} value={values.email} /></TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap', textAlign: 'center' }}><TextFieldCustom name="address" onChange={handleChange} value={values.address} /></TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap', textAlign: 'center' }}>
                        {data.role?.description === 'Agencia' && (
                            <TextFieldCustom name="delivery_cost" type="number" onChange={handleChange} value={values.delivery_cost} />
                        )}
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap', textAlign: 'center' }}>
                        <IconButton onClick={onSubmit}>
                            <CheckRounded />
                        </IconButton>
                        <IconButton onClick={toggleEdit}>
                            <CancelRounded />
                        </IconButton>
                    </TableCell>
                </TableRow>
                : (
                    <TableRow>
                        <TableCell sx={{ whiteSpace: 'nowrap', textAlign: 'center' }}>{info.id}</TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap', textAlign: 'center' }}>{info.names}</TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap', textAlign: 'center' }}>{info.surnames}</TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap', textAlign: 'center' }}>{info.phone}</TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap', textAlign: 'center' }}>{info.email}</TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap', textAlign: 'center' }}>{info.address}</TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap', textAlign: 'center' }}>{info.delivery_cost || 0}</TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap', textAlign: 'center' }}>
                            <IconButton onClick={toggleEdit}>
                                <EditRounded />
                            </IconButton>
                        </TableCell>
                    </TableRow>
                )}
        </>
    )
}