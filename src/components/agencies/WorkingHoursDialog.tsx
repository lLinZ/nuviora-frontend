import { FC, useEffect, useState } from "react";
import {
    Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Stack, Switch, TextField, Typography
} from "@mui/material";
import { toast } from "react-toastify";
import { AgencyRouting, WorkingHoursFields } from "../../interfaces/agencyRouting.types";
import { routingApi } from "./agencyApi";

type Props = {
    open: boolean;
    /** Ciudad o agencia; null cierra el diálogo. */
    target: { kind: 'city' | 'agency'; id: number; name: string } & WorkingHoursFields | null;
    onClose: () => void;
    onSaved: (data: AgencyRouting) => void;
};

/**
 * Encender o apagar una ciudad o agencia y su horario (Fran, 2026-10-17: "Valencia no puede trabajar"; "Maracay todos
 * los días cierra a las 5 de la tarde"). Mientras no trabaja, las órdenes nuevas de la ciudad no pasan a vendedora.
 */
export const WorkingHoursDialog: FC<Props> = ({ open, target, onClose, onSaved }) => {
    const [working, setWorking] = useState(true);
    const [from, setFrom] = useState('');
    const [until, setUntil] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (open && target) {
            setWorking(target.is_working);
            setFrom(target.works_from ?? '');
            setUntil(target.works_until ?? '');
        }
    }, [open, target]);

    const isCity = target?.kind === 'city';

    const save = async () => {
        if (!target) return;
        setSaving(true);
        const res = await routingApi(`/${isCity ? 'cities' : 'agencies'}/${target.id}/hours`, 'PUT', {
            is_working: working,
            works_from: from || null,
            works_until: until || null,
        });
        setSaving(false);
        if (res.ok) {
            toast.success(res.message);
            onSaved(res.data);
            onClose();
        } else {
            toast.error(res.message);
        }
    };

    return (
        <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="xs">
            <DialogTitle>{target?.name}: trabaja</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    <FormControlLabel
                        control={<Switch checked={working} onChange={(e) => setWorking(e.target.checked)} color="success" />}
                        label={working ? 'Encendida' : 'Apagada'}
                    />
                    {!working && (
                        <Alert severity="warning">
                            {isCity
                                ? 'Apagada, las órdenes nuevas de esta ciudad no pasan a vendedora: esperan sin vendedora y se reparten solas cuando la enciendas.'
                                : 'Apagada, no recibe órdenes en el reparto de sus ciudades. Si es la única agencia de una ciudad, las órdenes nuevas de esa ciudad no pasan a vendedora hasta que la enciendas.'}
                        </Alert>
                    )}
                    <Typography variant="subtitle2">Horario (todos los días)</Typography>
                    <Stack direction="row" spacing={2}>
                        <TextField
                            type="time"
                            label="Desde"
                            value={from}
                            onChange={(e) => setFrom(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            fullWidth
                        />
                        <TextField
                            type="time"
                            label="Hasta"
                            value={until}
                            onChange={(e) => setUntil(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            fullWidth
                        />
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                        Vacío = todo el día. Fuera del horario es como si estuviera apagada; al llegar la hora, las órdenes que esperaban se reparten solas.
                        Las órdenes que ya tienen vendedora no cambian.
                    </Typography>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={saving}>Cancelar</Button>
                <Button variant="contained" onClick={save} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button>
            </DialogActions>
        </Dialog>
    );
};
