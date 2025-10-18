import { Container, Typography, List, ListItem, ListItemText } from '@mui/material';

export default function TermsPage() {
    return (
        <Container maxWidth="md" sx={{ py: 5 }}>
            <Typography variant="h3" gutterBottom>Terms of Service</Typography>
            <Typography paragraph>
                By using this application, you agree to comply with all applicable laws
                and to adhere to OpenAI usage policies. You are responsible for the
                prompts you submit and the content you generate.
            </Typography>
            <Typography variant="h5" gutterBottom>Acceptable Use</Typography>
            <List>
                <ListItem><ListItemText primary="Do not submit illegal or harmful content." /></ListItem>
                <ListItem><ListItemText primary="Respect intellectual property rights." /></ListItem>
                <ListItem><ListItemText primary="Do not attempt to misuse or overload the service." /></ListItem>
            </List>
            <Typography variant="h5" gutterBottom>Accounts</Typography>
            <Typography paragraph>
                You are responsible for safeguarding your account credentials. We may
                suspend or terminate accounts that violate these terms.
            </Typography>
            <Typography variant="h5" gutterBottom>Liability</Typography>
            <Typography paragraph>
                The service is provided &quot;as is&quot; without warranties. We are not liable
                for damages arising from use of the service.
            </Typography>
            <Typography variant="h5" gutterBottom>Contact</Typography>
            <Typography paragraph>
                For questions or concerns, contact support@example.com.
            </Typography>
        </Container>
    );
}
