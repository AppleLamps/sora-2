import request from 'supertest';
import createApp from '../../src/app';
import prisma from '../../src/utils/prisma';
import * as openaiService from '../../src/services/openaiService';

const app = createApp();

// helper to attach auth header
const auth = (req: request.Test) => req.set('Authorization', 'Bearer testtoken');

jest.mock('../../src/middleware/auth', () => ({
    authenticate: (_req: any, _res: any, next: any) => {
        _req.user = { userId: 'user_1', email: 'user@example.com' };
        next();
    },
}));

describe('Video Controller', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('createVideo returns 201 and queues job', async () => {
        (prisma.video.create as jest.Mock).mockResolvedValue({ id: 'db_1', prompt: 'p', model: 'sora-2' });

        const res = await auth(request(app).post('/api/videos/create')).send({ prompt: 'p', model: 'sora-2' });
        expect(res.status).toBe(201);
        expect(res.body.video.id).toBe('db_1');
        expect(openaiService.createVideo).toHaveBeenCalled();
    });

    test('getVideoStatus returns updated video', async () => {
        (prisma.video.findFirst as jest.Mock).mockResolvedValue({ id: 'db_1', userId: 'user_1', openaiVideoId: 'video_openai_1', videoUrl: null, thumbnailUrl: null });
        (prisma.video.update as jest.Mock).mockResolvedValue({ id: 'db_1', status: 'completed', videoUrl: 'https://example.com/video.mp4' });

        const res = await auth(request(app).get('/api/videos/status/db_1'));
        expect(res.status).toBe(200);
        expect(res.body.video.status).toBe('completed');
    });

    test('remixVideo returns 201', async () => {
        (prisma.video.findFirst as jest.Mock).mockResolvedValue({ id: 'db_orig', userId: 'user_1', openaiVideoId: 'video_openai_1', model: 'sora-2' });
        (prisma.video.create as jest.Mock).mockResolvedValue({ id: 'db_new', prompt: 'Remix: p2' });

        const res = await auth(request(app).post('/api/videos/remix/db_orig')).send({ prompt: 'p2' });
        expect(res.status).toBe(201);
        expect(res.body.video.id).toBe('db_new');
    });
});
