import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
});

export interface CreateVideoParams {
  prompt: string;
  model?: string;
  size?: string;
  seconds?: number | string;
}

export interface RemixVideoParams {
  videoId: string;
  prompt: string;
}

export const createVideo = async (params: CreateVideoParams) => {
  const { prompt, model = 'sora-2', size, seconds } = params;

  const video = await openai.videos.create({
    model,
    prompt,
    ...(size && { size }),
    ...(seconds && { seconds: String(seconds) }),
  });

  return video;
};

export const getVideoStatus = async (videoId: string) => {
  const video = await openai.videos.retrieve(videoId);
  return video;
};

export const listVideos = async (limit = 20, after?: string, order: 'asc' | 'desc' = 'desc') => {
  const videos = await openai.videos.list({
    limit,
    ...(after && { after }),
    order,
  });
  return videos;
};

export const deleteVideo = async (videoId: string) => {
  await openai.videos.del(videoId);
};

export const remixVideo = async (params: RemixVideoParams) => {
  const { videoId, prompt } = params;

  const video = await openai.videos.remix(videoId, {
    prompt,
  });

  return video;
};

export const pollVideoStatus = async (
  videoId: string,
  onUpdate?: (status: string, progress?: number) => void
): Promise<any> => {
  let attempts = 0;
  const maxAttempts = 180;

  while (attempts < maxAttempts) {
    const video = await getVideoStatus(videoId);

    if (onUpdate) {
      onUpdate(video.status, (video as any).progress);
    }

    if (video.status === 'completed') {
      return video;
    }

    if (video.status === 'failed') {
      throw new Error('Video generation failed');
    }

    const delay = Math.min(10000 + attempts * 1000, 20000);
    await new Promise(resolve => setTimeout(resolve, delay));
    attempts++;
  }

  throw new Error('Video generation timeout');
};

export const downloadVideoContent = async (videoId: string): Promise<Buffer> => {
  const content = await openai.videos.downloadContent(videoId);
  const arrayBuffer = await content.arrayBuffer();
  return Buffer.from(arrayBuffer);
};

export const downloadThumbnail = async (videoId: string): Promise<Buffer> => {
  const content = await openai.videos.downloadContent(videoId, { variant: 'thumbnail' });
  const arrayBuffer = await content.arrayBuffer();
  return Buffer.from(arrayBuffer);
};

export const moderatePrompt = async (prompt: string): Promise<{ allowed: boolean; categories?: any; flagged?: boolean; }> => {
  // Optional moderation: require OPENAI_MODERATION_MODEL to be set, otherwise skip
  const moderationModel = process.env.OPENAI_MODERATION_MODEL;
  if (!moderationModel) {
    return { allowed: true };
  }
  try {
    const moderation = await (openai as any).moderations.create({
      model: moderationModel,
      input: prompt,
    });
    const result = moderation?.results?.[0];
    const flagged = !!result?.flagged;
    return { allowed: !flagged, categories: result?.categories, flagged };
  } catch (e) {
    // On moderation failure, be conservative: allow but log
    console.warn('Moderation check failed:', e);
    return { allowed: true };
  }
};
