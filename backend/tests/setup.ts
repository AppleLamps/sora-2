jest.mock('../src/utils/prisma', () => {
    // simple in-memory mock; individual tests can override
    return {
        __esModule: true,
        default: {
            video: {
                create: jest.fn(),
                findFirst: jest.fn(),
                findUnique: jest.fn(),
                update: jest.fn(),
                delete: jest.fn(),
                findMany: jest.fn(),
                count: jest.fn(),
            },
        },
    };
});

jest.mock('../src/services/openaiService', () => {
    return {
        __esModule: true,
        createVideo: jest.fn(async ({ prompt }) => ({ id: 'video_openai_1', status: 'queued', prompt })),
        getVideoStatus: jest.fn(async (id) => ({ id, status: 'completed', url: 'https://example.com/video.mp4', thumbnail_url: 'https://example.com/thumb.jpg' })),
        deleteVideo: jest.fn(async () => { }),
        remixVideo: jest.fn(async ({ prompt }) => ({ id: 'video_openai_2', status: 'queued', prompt })),
        pollVideoStatus: jest.fn(),
        moderatePrompt: jest.fn(async () => ({ allowed: true })),
    };
});

jest.mock('../src/services/queueService', () => {
    return {
        __esModule: true,
        addVideoToQueue: jest.fn(async () => { }),
    };
});
