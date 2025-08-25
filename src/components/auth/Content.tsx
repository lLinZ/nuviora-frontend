import LoyaltyRounded from "@mui/icons-material/LoyaltyRounded";
import SportsBasketballRounded from "@mui/icons-material/SportsBasketballRounded";
import TrophyRounded from '@mui/icons-material/EmojiEventsRounded';

import { Stack, Box, CardMedia } from "@mui/material";
import { TypographyCustom } from "../custom";

export const Content = () => {
    return (
        <Stack
            sx={{ flexDirection: 'column', alignSelf: 'center', gap: 4, maxWidth: 450, }}
        >
            {items.map((item, index) => (
                <Stack key={index} direction="row" sx={{ gap: 2 }}>
                    {item.icon}
                    <Box sx={{ color: 'white' }}>
                        <TypographyCustom gutterBottom sx={{ fontWeight: 'medium' }}>
                            {item.title}
                        </TypographyCustom>
                        <CardMedia
                            sx={{ height: '180px' }}
                            component='iframe'
                            title='test'
                            src={item.videoUrl}
                            allowFullScreen
                        />
                    </Box>
                </Stack>
            ))}
        </Stack>
    )
}

const items = [
    {
        icon: <SportsBasketballRounded sx={{ color: "white" }} />,
        title: 'Basket 3x3',
        videoUrl: 'https://www.youtube.com/embed/o-R_2A0ebo0?si=Fe5ED8NErscfyhzI'
    },
    {
        icon: <LoyaltyRounded sx={{ color: "white" }} />,
        title: 'Suscripcion selectiva',
        videoUrl: 'https://www.youtube.com/embed/pLpzddUO1Io?si=zWmH2XlDJIZlVbBF'
    },
    {
        icon: <TrophyRounded sx={{ color: "white" }} />,
        title: 'Copa subcampeones',
        videoUrl: 'https://www.youtube.com/embed/8IEoV5END-8?si=vyJlH3XQnxTZTz4P'
    },
];