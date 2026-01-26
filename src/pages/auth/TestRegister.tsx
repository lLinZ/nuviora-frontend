import React, { useState } from 'react';
import { Box, Button, Card, CardContent, Container, MenuItem, TextField, Typography, Alert } from '@mui/material';
import { request } from '../../common/request';
import { useNavigate } from 'react-router-dom';

export const TestRegister = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [formData, setFormData] = useState({
        names: '',
        email: '',
        password: '',
        role_id: 1, // Default Vendedor, typical seed ID
        phone: '',
        address: ''
    });

    const roles = [
        { id: 1, label: 'Vendedor' },
        { id: 2, label: 'Gerente' },
        { id: 3, label: 'Admin (Master)' },
        { id: 4, label: 'Repartidor' },
        { id: 5, label: 'Agencia' },
    ];

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const result = await request('/test/register', 'POST', formData);
            if (result.status === 201 || result.status === 200) {
                const data = await result.response.json();
                setSuccess('Usuario creado correctamente. Token recibido. Redirigiendo...');

                // Optional: Auto login?
                // localStorage.setItem('token', data.token);
                // navigate('/dashboard');

                setTimeout(() => navigate('/'), 2000); // Go to login
            } else {
                const err = await result.response.json();
                setError(err.message || 'Error al crear usuario');
            }
        } catch (err) {
            console.error(err);
            setError('Error de conexión');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default' }}>
            <Container maxWidth="sm">
                <Card sx={{ borderRadius: 4, boxShadow: 3 }}>
                    <CardContent sx={{ p: 4 }}>
                        <Typography variant="h5" fontWeight="bold" gutterBottom align="center">
                            Registro de Prueba (Test)
                        </Typography>
                        <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
                            Crea un usuario rápidamente para pruebas sin validar email.
                        </Typography>

                        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

                        <form onSubmit={handleSubmit}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <TextField
                                    label="Nombre Completo"
                                    name="names"
                                    value={formData.names}
                                    onChange={handleChange}
                                    required
                                    fullWidth
                                />
                                <TextField
                                    label="Email"
                                    name="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                    fullWidth
                                />
                                <TextField
                                    label="Contraseña"
                                    name="password"
                                    type="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                    fullWidth
                                />
                                <TextField
                                    select
                                    label="Rol (ID Supuesto)"
                                    name="role_id"
                                    value={formData.role_id}
                                    onChange={handleChange}
                                    required
                                    fullWidth
                                    helperText="Asegúrate que estos IDs coincidan con tu base de datos (Seeder)."
                                >
                                    {roles.map((option) => (
                                        <MenuItem key={option.id} value={option.id}>
                                            {option.id} - {option.label}
                                        </MenuItem>
                                    ))}
                                </TextField>
                                <TextField
                                    label="Teléfono (Opcional)"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    fullWidth
                                />
                                <TextField
                                    label="Dirección (Opcional)"
                                    name="address"
                                    value={formData.address}
                                    onChange={handleChange}
                                    fullWidth
                                />

                                <Button
                                    type="submit"
                                    variant="contained"
                                    size="large"
                                    disabled={loading}
                                    sx={{ mt: 2, py: 1.5, fontWeight: 'bold' }}
                                >
                                    {loading ? 'Creando...' : 'Crear Usuario'}
                                </Button>

                                <Button
                                    variant="text"
                                    onClick={() => navigate('/')}
                                >
                                    Volver al Login
                                </Button>
                            </Box>
                        </form>
                    </CardContent>
                </Card>
            </Container>
        </Box>
    );
};
