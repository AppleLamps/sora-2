'use client';

import { useState, useEffect } from 'react';
import {
    AppBar,
    Toolbar,
    Typography,
    Button,
    Container,
    Box,
    Paper,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Grid,
    Card,
    CardContent,
    CardActions,
    Chip,
    Alert,
} from '@mui/material';
import { PlayArrow, Logout, AccountCircle, CloudUpload, Refresh } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '../components/ProtectedRoute';
import { videoService, Video } from '../services/videoService';
import type { AxiosError } from 'axios';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { Tooltip, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';

export default function DashboardPage() {
    const { user, logout } = useAuth();
    const router = useRouter();
    // Using polling for status updates
    const [prompt, setPrompt] = useState('');
    const [model, setModel] = useState('sora-2');
    const [size, setSize] = useState('1280x720');
    const [seconds, setSeconds] = useState(8);
    const [inputFile, setInputFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [videos, setVideos] = useState<Video[]>([]);
    const [polling, setPolling] = useState(false);
    const [showOnboarding, setShowOnboarding] = useState(true);

    const handleLogout = () => {
        logout();
        router.push('/login');
    };

    const handleGenerate = async () => {
        if (!prompt.trim()) {
            setError('Prompt is required');
            return;
        }

        setError('');
        setLoading(true);

        try {
            const created = await videoService.createVideo({
                prompt,
                model,
                size,
                seconds,
            });

            // Reset form
            setPrompt('');
            setInputFile(null);

            // Refresh videos list
            loadVideos();
            setPolling(true);
            alert(`Video generation started! ID: ${created.id}`);
        } catch (err) {
            const axErr = err as AxiosError<{ error?: string }>;
            const message = axErr.response?.data?.error || axErr.message || 'Failed to generate video';
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    const loadVideos = async () => {
        try {
            const result = await videoService.getVideos(10, 1);
            setVideos(result.videos);
        } catch (err) {
            console.error('Failed to load videos:', err);
        }
    };

    const handleRemix = async (video: Video) => {
        const newPrompt = window.prompt(`Enter new prompt for remixing "${video.prompt}":`);
        if (newPrompt && newPrompt.trim()) {
            try {
                await videoService.remixVideo(video.id, newPrompt.trim());
                // Start polling after remix
                setPolling(true);
                loadVideos();
                alert('Remix started!');
            } catch (err) {
                const axErr = err as AxiosError<{ error?: string }>;
                const message = axErr.response?.data?.error || axErr.message || 'Failed to remix video';
                setError(message);
            }
        }
    };

    const handleViewVideo = async (video: Video) => {
        if (!video.videoUrl) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(video.videoUrl, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to download video');
            }

            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            window.open(blobUrl, '_blank');

            // Clean up the blob URL after a delay
            setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
        } catch (error) {
            console.error('Error viewing video:', error);
            alert('Failed to load video. Please try again.');
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this video?')) {
            try {
                await videoService.deleteVideo(id);
                setVideos(prev => prev.filter(v => v.id !== id));
            } catch (err) {
                const axErr = err as AxiosError<{ error?: string }>;
                const message = axErr.response?.data?.error || axErr.message || 'Failed to delete video';
                setError(message);
            }
        }
    };

    // Polling effect for videos in progress
    useEffect(() => {
        if (!polling) return;

        let isCancelled = false;
        const inProgressIds = videos.filter(v => v.status === 'queued' || v.status === 'in_progress').map(v => v.id);
        if (inProgressIds.length === 0) {
            setPolling(false);
            return;
        }

        let attempt = 0;
        const poll = async () => {
            attempt += 1;
            try {
                const updates = await Promise.all(inProgressIds.map(id => videoService.getVideoStatus(id)));
                if (isCancelled) return;
                setVideos(prev => prev.map(v => updates.find(u => u.id === v.id) || v));
                const stillInProgress = updates.some(v => v.status === 'queued' || v.status === 'in_progress');
                if (!stillInProgress) {
                    setPolling(false);
                    // Reload all videos to ensure we have the latest data including URLs
                    loadVideos();
                    return;
                }
            } catch {
                // Keep polling, but don't crash UI
            }
            const delay = Math.min(10000 + attempt * 1000, 20000);
            setTimeout(poll, delay);
        };
        const timeout = setTimeout(poll, 1000);
        return () => {
            isCancelled = true;
            clearTimeout(timeout);
        };
    }, [polling, videos]);

    useEffect(() => {
        loadVideos();
    }, []);

    return (
        <ProtectedRoute>
            <Box sx={{ flexGrow: 1 }}>
                <AppBar position="static">
                    <Toolbar>
                        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                            Sora-2 Video Generator
                        </Typography>
                        <Tooltip title="Privacy & Terms">
                            <Button color="inherit" href="/privacy">Privacy</Button>
                        </Tooltip>
                        <Tooltip title="Privacy & Terms">
                            <Button color="inherit" href="/terms">Terms</Button>
                        </Tooltip>
                        <Button color="inherit" startIcon={<AccountCircle />}>
                            {user?.name || user?.email}
                        </Button>
                        <Button color="inherit" onClick={handleLogout} startIcon={<Logout />}>
                            Logout
                        </Button>
                    </Toolbar>
                </AppBar>

                <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
                    <OnboardingDialog open={showOnboarding} onClose={() => setShowOnboarding(false)} />
                    <Grid container spacing={3}>
                        {/* Video Generation Form */}
                        <Grid item xs={12} md={6}>
                            <Paper sx={{ p: 3 }}>
                                <Typography variant="h5" gutterBottom>
                                    Generate New Video
                                </Typography>
                                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                                <Box component="form" sx={{ mt: 2 }}>
                                    <Tooltip title="Describe the scene you want. Avoid sensitive content.">
                                        <TextField
                                            fullWidth
                                            multiline
                                            rows={4}
                                            label="Prompt"
                                            value={prompt}
                                            onChange={(e) => setPrompt(e.target.value)}
                                            sx={{ mb: 2 }}
                                        />
                                    </Tooltip>
                                    <Button
                                        variant="outlined"
                                        component="label"
                                        startIcon={<CloudUpload />}
                                        sx={{ mb: 2 }}
                                    >
                                        {inputFile ? inputFile.name : 'Upload Reference Image (Optional)'}
                                        <input
                                            type="file"
                                            hidden
                                            accept="image/*"
                                            onChange={(e) => setInputFile(e.target.files?.[0] || null)}
                                        />
                                    </Button>
                                    {inputFile && (
                                        <Button
                                            size="small"
                                            onClick={() => setInputFile(null)}
                                            sx={{ mb: 2 }}
                                        >
                                            Remove
                                        </Button>
                                    )}
                                    <FormControl fullWidth sx={{ mb: 2 }}>
                                        <InputLabel>Model</InputLabel>
                                        <Tooltip title="Sora-2 Pro offers higher fidelity at higher cost.">
                                            <Select value={model} onChange={(e) => setModel(e.target.value)}>
                                                <MenuItem value="sora-2">Sora-2</MenuItem>
                                                <MenuItem value="sora-2-pro">Sora-2 Pro</MenuItem>
                                            </Select>
                                        </Tooltip>
                                    </FormControl>
                                    <FormControl fullWidth sx={{ mb: 2 }}>
                                        <InputLabel>Resolution</InputLabel>
                                        <Tooltip title="Higher resolution increases generation time and cost.">
                                            <Select value={size} onChange={(e) => setSize(e.target.value)}>
                                                <MenuItem value="1280x720">1280x720 (HD)</MenuItem>
                                                <MenuItem value="1920x1080">1920x1080 (Full HD)</MenuItem>
                                            </Select>
                                        </Tooltip>
                                    </FormControl>
                                    <FormControl fullWidth sx={{ mb: 2 }}>
                                        <InputLabel>Duration</InputLabel>
                                        <Tooltip title="Longer clips take more time to generate.">
                                            <Select value={seconds} onChange={(e) => setSeconds(Number(e.target.value))}>
                                                <MenuItem value={4}>4 seconds</MenuItem>
                                                <MenuItem value={8}>8 seconds</MenuItem>
                                                <MenuItem value={16}>16 seconds</MenuItem>
                                            </Select>
                                        </Tooltip>
                                    </FormControl>
                                    <Button
                                        variant="contained"
                                        startIcon={<PlayArrow />}
                                        onClick={handleGenerate}
                                        fullWidth
                                        disabled={loading}
                                    >
                                        {loading ? 'Generating...' : 'Generate Video'}
                                    </Button>
                                </Box>
                            </Paper>
                        </Grid>

                        {/* Recent Videos */}
                        <Grid item xs={12} md={6}>
                            <Paper sx={{ p: 3 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                    <Typography variant="h5">
                                        Recent Videos
                                    </Typography>
                                    <Button
                                        size="small"
                                        startIcon={<Refresh />}
                                        onClick={loadVideos}
                                        variant="outlined"
                                    >
                                        Refresh
                                    </Button>
                                </Box>
                                {videos.length === 0 ? (
                                    <Typography variant="body2" color="text.secondary">
                                        No videos generated yet.
                                    </Typography>
                                ) : (
                                    <Box sx={{ mt: 2 }}>
                                        {videos.map((video) => (
                                            <Card key={video.id} sx={{ mb: 2 }}>
                                                <CardContent>
                                                    <Typography variant="h6" gutterBottom>
                                                        {video.prompt}
                                                    </Typography>
                                                    <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                                                        <Chip label={video.model} size="small" />
                                                        <Chip label={video.status} size="small" color={
                                                            video.status === 'completed' ? 'success' :
                                                                video.status === 'failed' ? 'error' :
                                                                    video.status === 'in_progress' ? 'warning' : 'default'
                                                        } />
                                                    </Box>
                                                    <Typography variant="body2" color="text.secondary">
                                                        Created: {new Date(video.createdAt).toLocaleDateString()}
                                                    </Typography>
                                                </CardContent>
                                                <CardActions>
                                                    {video.status === 'completed' && video.videoUrl && (
                                                        <Button size="small" onClick={() => handleViewVideo(video)}>
                                                            View Video
                                                        </Button>
                                                    )}
                                                    <Button size="small" onClick={() => handleRemix(video)}>
                                                        Remix
                                                    </Button>
                                                    <Button size="small" color="error" onClick={() => handleDelete(video.id)}>
                                                        Delete
                                                    </Button>
                                                </CardActions>
                                            </Card>
                                        ))}
                                    </Box>
                                )}
                            </Paper>
                        </Grid>
                    </Grid>
                </Container>
            </Box>
        </ProtectedRoute>
    );
}

// Onboarding modal component
function OnboardingDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                Welcome to Sora-2 Video Generator
            </DialogTitle>
            <DialogContent dividers>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <InfoOutlinedIcon color="primary" />
                    <Typography>Enter a descriptive prompt and choose model, resolution, and duration.</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <HelpOutlineIcon color="primary" />
                    <Typography>We’ll start generation and show progress automatically via polling.</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                    Tip: Use the sandbox by setting OPENAI_BASE_URL on the server to avoid live billing while testing.
                </Typography>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} variant="contained">Got it</Button>
            </DialogActions>
        </Dialog>
    );
}