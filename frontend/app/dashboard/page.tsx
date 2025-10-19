'use client';

import { useState, useEffect, SyntheticEvent } from 'react';
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
    CardMedia,
    Chip,
    Snackbar,
    Alert,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Tooltip,
    CircularProgress,
} from '@mui/material';
import { PlayArrow, Logout, AccountCircle, CloudUpload, Refresh } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '../components/ProtectedRoute';
import { videoService, Video } from '../services/videoService';
import type { AxiosError } from 'axios';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

export default function DashboardPage() {
    const { user, logout } = useAuth();
    const router = useRouter();
    const { socket } = useSocket();
    const [prompt, setPrompt] = useState('');
    const [model, setModel] = useState('sora-2');
    const [size, setSize] = useState('1280x720');
    const [seconds, setSeconds] = useState(8);
    const [inputFile, setInputFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [videos, setVideos] = useState<Video[]>([]);
    const [, setPolling] = useState(false);
    const [showOnboarding, setShowOnboarding] = useState(true);
    const [snackbar, setSnackbar] = useState<{
        open: boolean;
        message: string;
        severity: 'success' | 'error' | 'info';
    } | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [videoToDelete, setVideoToDelete] = useState<Video | null>(null);
    const [remixDialogOpen, setRemixDialogOpen] = useState(false);
    const [videoToRemix, setVideoToRemix] = useState<Video | null>(null);
    const [remixPrompt, setRemixPrompt] = useState('');
    const [playerOpen, setPlayerOpen] = useState(false);
    const [playerUrl, setPlayerUrl] = useState<string | null>(null);

    const handleCloseSnackbar = (_?: SyntheticEvent | Event, reason?: string) => {
        if (reason === 'clickaway') {
            return;
        }
        setSnackbar(null);
    };

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
            await videoService.createVideo({
                prompt,
                model,
                size,
                seconds,
                image: inputFile,
            });

            // Reset form
            setPrompt('');
            setInputFile(null);

            // Refresh videos list
            loadVideos();
            setPolling(true);
            setSnackbar({
                open: true,
                message: 'Video generation started!',
                severity: 'success',
            });
        } catch (err) {
            const axErr = err as AxiosError<{ error?: string }>;
            const message = axErr.response?.data?.error || axErr.message || 'Failed to generate video';
            setError(message);
            setSnackbar({
                open: true,
                message,
                severity: 'error',
            });
        } finally {
            setLoading(false);
        }
    };

    const loadVideos = async (pageToLoad = 1) => {
        const normalizedPage = Math.max(1, pageToLoad);
        try {
            const result = await videoService.getVideos(10, normalizedPage);
            const totalPages = Math.max(result.pagination.totalPages, 1);

            if (result.pagination.total > 0 && normalizedPage > totalPages) {
                const fallbackResult = await videoService.getVideos(10, totalPages);
                setVideos(fallbackResult.videos);
                setPaginationData(fallbackResult.pagination);
                setPage(totalPages);
                return;
            }

            setVideos(result.videos);
            setPaginationData(result.pagination);
            setPage(result.pagination.total > 0 ? normalizedPage : 1);
        } catch (err) {
            console.error('Failed to load videos:', err);
            setPaginationData(null);
        }
    };

    const handleRemix = (video: Video) => {
        setVideoToRemix(video);
        setRemixPrompt(video.prompt);
        setRemixDialogOpen(true);
    };

    const confirmRemix = async () => {
        if (!videoToRemix) {
            return;
        }

        if (!remixPrompt.trim()) {
            setSnackbar({
                open: true,
                message: 'Remix prompt cannot be empty.',
                severity: 'error',
            });
            return;
        }

        try {
            await videoService.remixVideo(videoToRemix.id, remixPrompt.trim());
            setRemixDialogOpen(false);
            setVideoToRemix(null);
            setRemixPrompt('');
            setSnackbar({
                open: true,
                message: 'Remix started!',
                severity: 'success',
            });
            setPolling(true);
            loadVideos();
        } catch (err) {
            const axErr = err as AxiosError<{ error?: string }>;
            const message = axErr.response?.data?.error || axErr.message || 'Failed to remix video';
            setError(message);
            setSnackbar({
                open: true,
                message,
                severity: 'error',
            });
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
            setPlayerUrl((prev) => {
                if (prev) {
                    URL.revokeObjectURL(prev);
                }
                return blobUrl;
            });
            setPlayerOpen(true);
        } catch (error) {
            console.error('Error viewing video:', error);
            setSnackbar({
                open: true,
                message: 'Failed to load video. Please try again.',
                severity: 'error',
            });
        }
    };

    const handleDelete = (id: string) => {
        const video = videos.find(v => v.id === id);
        if (!video) {
            setSnackbar({
                open: true,
                message: 'Unable to find the selected video.',
                severity: 'error',
            });
            return;
        }
        setVideoToDelete(video);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (!videoToDelete) {
            return;
        }

        try {
            await videoService.deleteVideo(videoToDelete.id);
            setVideos(prev => prev.filter(v => v.id !== videoToDelete.id));
            setSnackbar({
                open: true,
                message: 'Video deleted successfully.',
                severity: 'success',
            });
        } catch (err) {
            const axErr = err as AxiosError<{ error?: string }>;
            const message = axErr.response?.data?.error || axErr.message || 'Failed to delete video';
            setError(message);
            setSnackbar({
                open: true,
                message,
                severity: 'error',
            });
        } finally {
            setDeleteDialogOpen(false);
            setVideoToDelete(null);
        }
    };

    const handleClosePlayer = () => {
        if (playerUrl) {
            URL.revokeObjectURL(playerUrl);
        }
        setPlayerOpen(false);
        setPlayerUrl(null);
    };

    // Polling effect for videos in progress
    useEffect(() => {
        loadVideos(1);
    }, []);

    useEffect(() => {
        if (!socket) {
            return;
        }

        const handleVideoUpdate = (updatedVideo: Video) => {
            setVideos(prev => {
                const existingIndex = prev.findIndex(v => v.id === updatedVideo.id);
                if (existingIndex === -1) {
                    if (page === 1) {
                        const limit = paginationData?.limit ?? 10;
                        const merged = [updatedVideo, ...prev];
                        return merged.slice(0, limit);
                    }
                    return prev;
                }
                const next = [...prev];
                next[existingIndex] = { ...next[existingIndex], ...updatedVideo };
                return next;
            });
        };

        socket.on('video:update', handleVideoUpdate);

        return () => {
            socket.off('video:update', handleVideoUpdate);
        };
    }, [socket, page, paginationData]);

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
                        <Grid item xs={12} md={12}>
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
                                            onChange={(e) => {
                                                const file = e.target.files?.[0] || null;
                                                setInputFile(file);
                                                e.target.value = '';
                                            }}
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
                        <Grid item xs={12} md={12}>
                            <Paper sx={{ p: 3 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                    <Typography variant="h5">
                                        Recent Videos
                                    </Typography>
                                    <Button
                                        size="small"
                                        startIcon={<Refresh />}
                                        onClick={() => loadVideos(page)}
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
                                    <Grid container spacing={3} sx={{ mt: 1 }}>
                                        {videos.map((video) => {
                                            const statusColor =
                                                video.status === 'completed' ? 'success' :
                                                    video.status === 'failed' ? 'error' :
                                                        video.status === 'in_progress' ? 'warning' : 'default';
                                            const isProcessing = video.status === 'in_progress' || video.status === 'queued';

                                            return (
                                                <Grid item xs={12} sm={6} lg={4} key={video.id}>
                                                    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                                                        <CardMedia
                                                            component="img"
                                                            height="160"
                                                            image={video.thumbnailUrl || 'https://via.placeholder.com/300x160.png?text=No+Thumbnail'}
                                                            alt="Video thumbnail"
                                                        />
                                                        <CardContent sx={{ flexGrow: 1 }}>
                                                            <Typography variant="h6" gutterBottom>
                                                                {video.prompt}
                                                            </Typography>
                                                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                                                                <Chip label={video.model} size="small" />
                                                                <Chip
                                                                    label={video.status}
                                                                    size="small"
                                                                    color={statusColor}
                                                                    icon={isProcessing ? <CircularProgress size={16} color="inherit" /> : undefined}
                                                                />
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
                                                </Grid>
                                            );
                                        })}
                                    </Grid>
                                )}
                                <Pagination
                                    count={paginationData?.totalPages || 1}
                                    page={page}
                                    onChange={(_event, newPage) => loadVideos(newPage)}
                                    sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}
                                />
                            </Paper>
                        </Grid>
                    </Grid>
                    <Snackbar
                        open={Boolean(snackbar?.open)}
                        autoHideDuration={6000}
                        onClose={handleCloseSnackbar}
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                    >
                        {snackbar ? (
                            <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
                                {snackbar.message}
                            </Alert>
                        ) : null}
                    </Snackbar>
                    <Dialog
                        open={deleteDialogOpen}
                        onClose={() => {
                            setDeleteDialogOpen(false);
                            setVideoToDelete(null);
                        }}
                    >
                        <DialogTitle>Delete Video</DialogTitle>
                        <DialogContent>
                            <DialogContentText>
                                {`Are you sure you want to delete "${videoToDelete?.prompt ?? ''}"? This action cannot be undone.`}
                            </DialogContentText>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => {
                                setDeleteDialogOpen(false);
                                setVideoToDelete(null);
                            }}>
                                Cancel
                            </Button>
                            <Button color="error" onClick={confirmDelete}>
                                Confirm
                            </Button>
                        </DialogActions>
                    </Dialog>
                    <Dialog
                        open={remixDialogOpen}
                        onClose={() => {
                            setRemixDialogOpen(false);
                            setVideoToRemix(null);
                            setRemixPrompt('');
                        }}
                        maxWidth="sm"
                        fullWidth
                    >
                        <DialogTitle>Remix Video</DialogTitle>
                        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
                            <Typography variant="subtitle2" color="text.secondary">
                                Original Prompt
                            </Typography>
                            <Typography variant="body1">{videoToRemix?.prompt}</Typography>
                            <TextField
                                label="Remix Prompt"
                                multiline
                                minRows={3}
                                value={remixPrompt}
                                onChange={(e) => setRemixPrompt(e.target.value)}
                                fullWidth
                            />
                        </DialogContent>
                        <DialogActions>
                            <Button
                                onClick={() => {
                                    setRemixDialogOpen(false);
                                    setVideoToRemix(null);
                                    setRemixPrompt('');
                                }}
                            >
                                Cancel
                            </Button>
                            <Button onClick={confirmRemix} variant="contained">
                                Start Remix
                            </Button>
                        </DialogActions>
                    </Dialog>
                    <Dialog open={playerOpen} onClose={handleClosePlayer} maxWidth="md" fullWidth>
                        <DialogTitle>Video Preview</DialogTitle>
                        <DialogContent>
                            {playerUrl ? (
                                <Box sx={{ position: 'relative', pt: 1 }}>
                                    <video
                                        width="100%"
                                        controls
                                        autoPlay
                                        src={playerUrl}
                                        onEnded={handleClosePlayer}
                                        style={{ borderRadius: 8 }}
                                    />
                                </Box>
                            ) : (
                                <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
                                    <CircularProgress />
                                </Box>
                            )}
                        </DialogContent>
                    </Dialog>
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
                    <Typography>We’ll start generation and stream progress updates in real time.</Typography>
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