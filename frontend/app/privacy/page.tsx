import { Container, Typography, List, ListItem, ListItemText } from '@mui/material';

export default function PrivacyPage() {
    return (
        <Container maxWidth="md" sx={{ py: 5 }}>
            <Typography variant="h3" gutterBottom>Privacy Policy</Typography>
            <Typography paragraph>
                We value your privacy. This application stores only the information
                necessary to provide the service: your account details and metadata
                about generated videos. Prompts and related data may be processed by
                OpenAI to generate content. Do not submit sensitive personal data.
            </Typography>
            <Typography variant="h5" gutterBottom>Data We Collect</Typography>
            <List>
                <ListItem><ListItemText primary="Account information (email, optional name)" /></ListItem>
                <ListItem><ListItemText primary="Video prompts and generation metadata" /></ListItem>
                <ListItem><ListItemText primary="Authentication tokens" /></ListItem>
            </List>
            <Typography variant="h5" gutterBottom>How We Use Data</Typography>
            <List>
                <ListItem><ListItemText primary="Authenticate your account" /></ListItem>
                <ListItem><ListItemText primary="Generate and manage videos" /></ListItem>
                <ListItem><ListItemText primary="Maintain service quality and security" /></ListItem>
            </List>
            <Typography variant="h5" gutterBottom>Third Parties</Typography>
            <Typography paragraph>
                Video generation is performed via OpenAI APIs. Their policies apply.
            </Typography>
            <Typography variant="h5" gutterBottom>Contact</Typography>
            <Typography paragraph>
                For questions or requests, contact support@example.com.
            </Typography>
        </Container>
    );
}
