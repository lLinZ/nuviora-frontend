import { FC, useState, useEffect } from "react";
import {
    Box, Typography, Grid, Paper, Divider, Button,
    IconButton, CircularProgress,
    TextField, InputAdornment,
    Tab, Tabs, useTheme
} from "@mui/material";
import {
    SearchRounded,
    CloudUploadRounded,
    DeleteRounded,
    InfoOutlined,
    ImageRounded,
    Inventory2Outlined as Inventory2OutlinedIcon,
    EditRounded,
    SaveRounded,
    CancelRounded
} from "@mui/icons-material";
import { request } from "../../common/request";
import { toast } from "react-toastify";
import { fmtMoney } from "../../lib/money";

const BACKEND_URL = import.meta.env.VITE_BACKEND_API_URL.replace('/api', '');

interface ProductImage {
    id: number;
    path: string;
}

interface ProductDetail {
    id: number;
    title: string;
    description: string;
    showable_name?: string;
    price: number;
    image: string;
    sku: string;
    gallery: ProductImage[];
}

interface Props {
    orderProducts: any[];
    isAdmin?: boolean;
}

export const ProductTechnicalSheet: FC<Props> = ({ orderProducts, isAdmin }) => {
    const theme = useTheme();

    const getImageUrl = (path: string) => {
        if (!path) return "";
        if (path.startsWith('http')) return path;
        return `${BACKEND_URL}${path}`;
    };
    const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
    const [product, setProduct] = useState<ProductDetail | null>(null);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);
    const [activeViewTab, setActiveViewTab] = useState(0); // 0: Order Products, 1: Search
    const [isEditingDesc, setIsEditingDesc] = useState(false);
    const [tempDesc, setTempDesc] = useState("");

    useEffect(() => {
        if (orderProducts.length > 0 && activeViewTab === 0 && !selectedProductId) {
            // Default to first product if nothing selected
            fetchProductDetails(orderProducts[0].product_id);
        }
    }, [orderProducts]);

    const fetchProductDetails = async (id: number) => {
        setLoading(true);
        setSelectedProductId(id);
        setIsEditingDesc(false);
        try {
            const { status, response } = await request(`/products/${id}`, "GET");
            if (status) {
                const data = await response.json();
                setProduct(data.product);
                setTempDesc(data.product.description || "");
            }
        } catch (error) {
            toast.error("Error al cargar detalles del producto");
        } finally {
            setLoading(false);
        }
    };

    const handleSaveDescription = async () => {
        if (!product) return;
        setLoading(true);
        try {
            const { ok, status, response } = await request(`/products/${product.id}`, "PUT", {
                description: tempDesc
            });
            if (ok) {
                setProduct({ ...product, description: tempDesc });
                setIsEditingDesc(false);
                toast.success("Descripción actualizada ✨");
            } else {
                const err = await response.json();
                toast.error(err.message || `Error ${status} al actualizar descripción`);
            }
        } catch (error) {
            toast.error("Error de conexión");
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (query: string) => {
        setSearchQuery(query);
        if (query.length < 2) {
            setSearchResults([]);
            return;
        }
        setSearching(true);
        try {
            const { status, response } = await request(`/products?search=${query}`, "GET");
            if (status) {
                const data = await response.json();
                setSearchResults(data.data || []);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setSearching(false);
        }
    };

    const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!product || !e.target.files?.[0]) return;

        const formData = new FormData();
        formData.append('image', e.target.files[0]);

        setLoading(true);
        try {
            const { status, response } = await request(`/products/${product.id}/gallery`, "POST", formData, true); // true for isFormData
            if (status) {
                const data = await response.json();
                setProduct({
                    ...product,
                    gallery: [...(product.gallery || []), data.image]
                });
                toast.success("Imagen subida ✅");
            } else {
                const err = await response.json();
                toast.error(err.message || "Error al subir imagen");
            }
        } catch (error) {
            toast.error("Error de conexión");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteImage = async (imageId: number) => {
        if (!product || !confirm("¿Eliminar esta imagen de la galería?")) return;

        try {
            const { status } = await request(`/products/${product.id}/gallery/${imageId}`, "DELETE");
            if (status) {
                setProduct({
                    ...product,
                    gallery: product.gallery.filter(img => img.id !== imageId)
                });
                toast.success("Imagen eliminada");
            }
        } catch (error) {
            toast.error("Error al eliminar imagen");
        }
    };

    return (
        <Box sx={{ p: 1 }}>
            <Grid container spacing={2}>
                {/* Sidebar: List of products */}
                <Grid size={{ xs: 12, md: 3 }}>
                    <Tabs
                        value={activeViewTab}
                        onChange={(_, v) => setActiveViewTab(v)}
                        variant="fullWidth"
                        sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
                    >
                        <Tab label="Órden" />
                        <Tab label="Buscar" />
                    </Tabs>

                    {activeViewTab === 0 ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            {orderProducts.length === 0 && (
                                <Typography variant="body2" color="text.secondary" textAlign="center" py={2}>
                                    No hay productos en esta orden
                                </Typography>
                            )}
                            {orderProducts.map((op) => (
                                <Paper
                                    key={op.id}
                                    elevation={selectedProductId === op.product_id ? 2 : 0}
                                    onClick={() => fetchProductDetails(op.product_id)}
                                    sx={{
                                        p: 1.5,
                                        cursor: 'pointer',
                                        borderRadius: 2,
                                        border: '1px solid',
                                        borderColor: selectedProductId === op.product_id ? 'primary.main' : 'divider',
                                        bgcolor: selectedProductId === op.product_id ? (theme.palette.mode === 'dark' ? 'rgba(25, 118, 210, 0.1)' : 'primary.light') : 'background.paper',
                                        '&:hover': { bgcolor: selectedProductId === op.product_id ? (theme.palette.mode === 'dark' ? 'rgba(25, 118, 210, 0.2)' : 'primary.light') : 'action.hover' },
                                        transition: 'all 0.2s',
                                        opacity: selectedProductId === op.product_id ? 1 : 0.8
                                    }}
                                >
                                    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                                        <Box
                                            component="img"
                                            src={getImageUrl(op.image)}
                                            sx={{ width: 40, height: 40, borderRadius: 1, objectFit: 'cover', bgcolor: 'grey.100' }}
                                            onError={(e: any) => e.target.src = "https://via.placeholder.com/40?text=P"}
                                        />
                                        <Typography
                                            variant="subtitle2"
                                            fontWeight={selectedProductId === op.product_id ? "bold" : "medium"}
                                            sx={{
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                display: '-webkit-box',
                                                WebkitLineClamp: 2,
                                                WebkitBoxOrient: 'vertical',
                                                fontSize: '0.85rem'
                                            }}
                                        >
                                            {op.showable_name || op.title}
                                        </Typography>
                                    </Box>
                                </Paper>
                            ))}
                        </Box>
                    ) : (
                        <Box>
                            <TextField
                                fullWidth
                                size="small"
                                placeholder="Buscar producto..."
                                value={searchQuery}
                                onChange={(e) => handleSearch(e.target.value)}
                                sx={{ mb: 2 }}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchRounded fontSize="small" />
                                        </InputAdornment>
                                    ),
                                }}
                            />
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, maxHeight: '60vh', overflowY: 'auto' }}>
                                {searching && <CircularProgress size={20} sx={{ m: 'auto', my: 2 }} />}
                                {searchResults.map((p) => (
                                    <Paper
                                        key={p.id}
                                        elevation={0}
                                        onClick={() => fetchProductDetails(p.id)}
                                        sx={{
                                            p: 1,
                                            cursor: 'pointer',
                                            borderRadius: 2,
                                            border: '1px solid',
                                            borderColor: selectedProductId === p.id ? 'primary.main' : 'divider',
                                            bgcolor: selectedProductId === p.id ? (theme.palette.mode === 'dark' ? 'rgba(25, 118, 210, 0.1)' : 'primary.light') : 'background.paper',
                                            '&:hover': { bgcolor: 'action.hover' }
                                        }}
                                    >
                                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                            <Box component="img" src={getImageUrl(p.image)} sx={{ width: 32, height: 32, borderRadius: 0.5, objectFit: 'cover' }} />
                                            <Typography variant="caption" fontWeight="bold" noWrap sx={{ flex: 1 }}>{p.showable_name || p.title}</Typography>
                                        </Box>
                                    </Paper>
                                ))}
                                {!searching && searchQuery.length >= 2 && searchResults.length === 0 && (
                                    <Typography variant="caption" textAlign="center" color="text.secondary">No hay resultados</Typography>
                                )}
                            </Box>
                        </Box>
                    )}
                </Grid>

                {/* Main Content: Technical Sheet */}
                <Grid size={{ xs: 12, md: 9 }}>
                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: 400 }}>
                            <CircularProgress />
                        </Box>
                    ) : product ? (
                        <Paper elevation={0} sx={{ p: 4, borderRadius: 4, height: '100%', bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
                                <Box>
                                    <Typography variant="h5" fontWeight="black" gutterBottom>{product.showable_name || product.title}</Typography>
                                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                        <Typography variant="h6" color="primary" fontWeight="bold">
                                            Precio Aproximado: {fmtMoney(product.price, "USD")}
                                        </Typography>
                                        <Typography variant="caption" sx={{ bgcolor: 'action.hover', px: 1, borderRadius: 1 }}>SKU: {product.sku}</Typography>
                                    </Box>
                                </Box>
                                <Box
                                    component="img"
                                    src={getImageUrl(product.image)}
                                    sx={{ width: 100, height: 100, borderRadius: 3, objectFit: 'cover', boxShadow: '0 8px 16px rgba(0,0,0,0.1)' }}
                                />
                            </Box>

                            <Divider sx={{ mb: 3 }} />

                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                <Typography variant="subtitle1" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <InfoOutlined fontSize="small" /> Descripción / Especificaciones
                                </Typography>
                                {isAdmin && (
                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                        {isEditingDesc ? (
                                            <>
                                                <Button size="small" color="inherit" onClick={() => { setIsEditingDesc(false); setTempDesc(product.description || ""); }}>Can.</Button>
                                                <Button size="small" variant="contained" startIcon={<SaveRounded />} onClick={handleSaveDescription}>Guardar</Button>
                                            </>
                                        ) : (
                                            <IconButton size="small" color="primary" onClick={() => setIsEditingDesc(true)}>
                                                <EditRounded fontSize="small" />
                                            </IconButton>
                                        )}
                                    </Box>
                                )}
                            </Box>

                            {isEditingDesc ? (
                                <TextField
                                    fullWidth
                                    multiline
                                    rows={6}
                                    variant="outlined"
                                    value={tempDesc}
                                    onChange={(e) => setTempDesc(e.target.value)}
                                    sx={{ mb: 4 }}
                                />
                            ) : (
                                <Typography variant="body1" sx={{ color: 'text.secondary', whiteSpace: 'pre-line', mb: 4, lineHeight: 1.7 }}>
                                    {product.description || "Sin descripción técnica disponible."}
                                </Typography>
                            )}

                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                <Typography variant="subtitle1" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <ImageRounded fontSize="small" /> Galería de Fotos Reales
                                </Typography>
                                {isAdmin && (
                                    <Button
                                        variant="outlined"
                                        component="label"
                                        startIcon={<CloudUploadRounded />}
                                        size="small"
                                    >
                                        Subir Foto
                                        <input type="file" hidden accept="image/*" onChange={handleUploadImage} />
                                    </Button>
                                )}
                            </Box>

                            {(product.gallery || []).length > 0 ? (
                                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 2 }}>
                                    {product.gallery.map((img) => (
                                        <Box key={img.id} sx={{ position: 'relative', borderRadius: 2, overflow: 'hidden', '&:hover .delete-btn': { opacity: 1 } }}>
                                            <Box
                                                component="img"
                                                src={getImageUrl(img.path)}
                                                sx={{
                                                    width: '100%',
                                                    height: 150,
                                                    objectFit: 'cover',
                                                    cursor: 'pointer',
                                                    transition: 'transform 0.3s',
                                                    '&:hover': { transform: 'scale(1.05)' }
                                                }}
                                                onClick={() => window.open(getImageUrl(img.path), '_blank')}
                                            />
                                            {isAdmin && (
                                                <IconButton
                                                    className="delete-btn"
                                                    size="small"
                                                    onClick={() => handleDeleteImage(img.id)}
                                                    sx={{
                                                        position: 'absolute',
                                                        top: 5,
                                                        right: 5,
                                                        bgcolor: 'rgba(255,0,0,0.7)',
                                                        color: 'white',
                                                        opacity: 0,
                                                        transition: 'opacity 0.2s',
                                                        '&:hover': { bgcolor: 'red' }
                                                    }}
                                                >
                                                    <DeleteRounded fontSize="small" />
                                                </IconButton>
                                            )}
                                        </Box>
                                    ))}
                                </Box>
                            ) : (
                                <Box sx={{ p: 4, textAlign: 'center', bgcolor: 'action.hover', borderRadius: 4, border: '2px dashed', borderColor: 'divider' }}>
                                    <Typography variant="body2" color="text.secondary">No hay fotos reales registradas en la galería.</Typography>
                                </Box>
                            )}
                        </Paper>
                    ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: 400, gap: 2 }}>
                            <Inventory2OutlinedIcon sx={{ fontSize: 60, opacity: 0.1 }} />
                            <Typography variant="h6" color="text.secondary">Selecciona un producto para ver su ficha técnica</Typography>
                        </Box>
                    )}
                </Grid>
            </Grid>
        </Box>
    );
};
