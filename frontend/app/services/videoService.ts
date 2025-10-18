import api from '../lib/api';

export interface Video {
    id: string;
    prompt: string;
    model: string;
    size?: string;
    seconds?: number;
    status: 'queued' | 'in_progress' | 'completed' | 'failed';
    openaiVideoId: string;
    videoUrl?: string;
    thumbnailUrl?: string;
    createdAt: string;
    updatedAt: string;
}

export const videoService = {
    async createVideo(data: {
        prompt: string;
        model: string;
        size?: string;
        seconds?: number;
    }): Promise<{ id: string; openaiVideoId: string; status: Video['status'] }> {
        const response = await api.post('/api/videos/create', {
            prompt: data.prompt,
            model: data.model,
            size: data.size,
            seconds: data.seconds,
        });
        // backend returns { message, video: { id, openaiVideoId, status, prompt } }
        return response.data.video;
    },

    async getVideoStatus(id: string): Promise<Video> {
        const response = await api.get(`/api/videos/status/${id}`);
        return response.data.video;
    },

    async getVideos(limit = 20, page = 1): Promise<{ videos: Video[]; pagination: { total: number; page: number; limit: number; totalPages: number } }> {
        const params = new URLSearchParams();
        if (limit) params.append('limit', limit.toString());
        if (page) params.append('page', page.toString());

        const response = await api.get(`/api/videos?${params}`);
        return response.data;
    },

    async deleteVideo(id: string): Promise<void> {
        await api.delete(`/api/videos/${id}`);
    },

    async remixVideo(id: string, prompt: string): Promise<{ id: string; openaiVideoId: string; status: Video['status'] }> {
        const response = await api.post(`/api/videos/remix/${id}`, { prompt });
        return response.data.video;
    },
};