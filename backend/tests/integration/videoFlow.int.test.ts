import request from 'supertest';
import createApp from '../../src/app';
import prisma from '../../src/utils/prisma';
import * as openaiService from '../../src/services/openaiService';

jest.mock('../../src/middleware/auth', () => ({
    authenticate: (_req: any, _res: any, next: any) => {
        _req.user = { userId: 'user_1', email: 'user@example.com' };
        next();
    },
}));

const app = createApp();

describe('Video generation flow (integration)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should create, poll, and complete a video', async () => {
        // Arrange DB mocks
        (prisma.video.create as jest.Mock).mockResolvedValue({ id: 'db_1', prompt: 'p', model: 'sora-2' });
        (prisma.video.findFirst as jest.Mock).mockResolvedValue({ id: 'db_1', userId: 'user_1', openaiVideoId: 'video_openai_1', videoUrl: null, thumbnailUrl: null });
        (prisma.video.update as jest.Mock).mockResolvedValue({ id: 'db_1', status: 'completed', videoUrl: 'https://example.com/video.mp4' });

        // Arrange OpenAI mocks
        (openaiService.createVideo as jest.Mock).mockResolvedValue({ id: 'video_openai_1', status: 'queued' });
        (openaiService.getVideoStatus as jest.Mock).mockResolvedValue({ id: 'video_openai_1', status: 'completed', url: 'https://example.com/video.mp4' });

        // Create
        const createRes = await request(app).post('/api/videos/create').set('Authorization', 'Bearer t').send({ prompt: 'p', model: 'sora-2' });
        expect(createRes.status).toBe(201);

        // Poll
        const statusRes = await request(app).get('/api/videos/status/db_1').set('Authorization', 'Bearer t');
        expect(statusRes.status).toBe(200);
        expect(statusRes.body.video.status).toBe('completed');
    });
});
