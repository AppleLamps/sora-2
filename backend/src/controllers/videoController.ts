import { Response } from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { AuthRequest } from '../middleware/auth';
import prisma from '../utils/prisma';
import * as openaiService from '../services/openaiService';
import { addVideoToQueue } from '../services/queueService';

export const createVideo = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { prompt, model, size, seconds } = req.body;
    const userId = req.user!.userId;
    const referenceImage = req.file?.buffer;
    const secondsValue = typeof seconds !== 'undefined' && seconds !== null && seconds !== '' ? Number(seconds) : undefined;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const moderation = await openaiService.moderatePrompt(prompt);
    if (!moderation.allowed) {
      return res.status(400).json({ error: 'Prompt violates content policy', moderation });
    }

    const video = await openaiService.createVideo({
      prompt,
      model,
      size,
      seconds: secondsValue,
      image: referenceImage,
    });

    const dbVideo = await prisma.video.create({
      data: {
        userId,
        prompt,
        model: model || 'sora-2',
        size: size || null,
        seconds: typeof secondsValue === 'number' && !Number.isNaN(secondsValue) ? secondsValue : null,
        status: video.status,
        openaiVideoId: video.id,
      },
    });

    const io = req.app.locals.io as SocketIOServer | undefined;
    if (!io) {
      throw new Error('Real-time service is unavailable');
    }
    await addVideoToQueue(dbVideo.id, userId, io);

    res.status(201).json({
      message: 'Video generation started',
      video: {
        id: dbVideo.id,
        openaiVideoId: video.id,
        status: video.status,
        prompt: dbVideo.prompt,
      },
    });
  } catch (error: any) {
    console.error('Create video error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const getVideoStatus = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const dbVideo = await prisma.video.findFirst({
      where: { id, userId },
    });

    if (!dbVideo) {
      return res.status(404).json({ error: 'Video not found' });
    }

    if (!dbVideo.openaiVideoId) {
      return res.json({ video: dbVideo });
    }

    const openaiVideo = await openaiService.getVideoStatus(dbVideo.openaiVideoId);

    const updatedVideo = await prisma.video.update({
      where: { id },
      data: {
        status: openaiVideo.status,
        videoUrl: (openaiVideo as any).url || dbVideo.videoUrl,
        thumbnailUrl: (openaiVideo as any).thumbnail_url || dbVideo.thumbnailUrl,
      },
    });

    res.json({ video: updatedVideo });
  } catch (error: any) {
    console.error('Get video status error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const listVideos = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user!.userId;
    const { limit = 20, page = 1 } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const [videos, total] = await Promise.all([
      prisma.video.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: Number(limit),
        skip,
      }),
      prisma.video.count({ where: { userId } }),
    ]);

    res.json({
      videos,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    console.error('List videos error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const deleteVideo = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const dbVideo = await prisma.video.findFirst({
      where: { id, userId },
    });

    if (!dbVideo) {
      return res.status(404).json({ error: 'Video not found' });
    }

    if (dbVideo.openaiVideoId) {
      try {
        await openaiService.deleteVideo(dbVideo.openaiVideoId);
      } catch (error) {
        console.error('Error deleting from OpenAI:', error);
      }
    }

    await prisma.video.delete({ where: { id } });

    res.json({ message: 'Video deleted successfully' });
  } catch (error: any) {
    console.error('Delete video error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const remixVideo = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const { prompt } = req.body;
    const userId = req.user!.userId;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required for remix' });
    }

    const originalVideo = await prisma.video.findFirst({
      where: { id, userId },
    });

    if (!originalVideo || !originalVideo.openaiVideoId) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const moderation = await openaiService.moderatePrompt(prompt);
    if (!moderation.allowed) {
      return res.status(400).json({ error: 'Prompt violates content policy', moderation });
    }

    const remixedVideo = await openaiService.remixVideo({
      videoId: originalVideo.openaiVideoId,
      prompt,
    });

    const dbVideo = await prisma.video.create({
      data: {
        userId,
        prompt: `Remix: ${prompt}`,
        model: originalVideo.model,
        size: originalVideo.size,
        seconds: originalVideo.seconds,
        status: remixedVideo.status,
        openaiVideoId: remixedVideo.id,
      },
    });

    const io = req.app.locals.io as SocketIOServer | undefined;
    if (!io) {
      throw new Error('Real-time service is unavailable');
    }
    await addVideoToQueue(dbVideo.id, userId, io);

    res.status(201).json({
      message: 'Video remix started',
      video: {
        id: dbVideo.id,
        openaiVideoId: remixedVideo.id,
        status: remixedVideo.status,
        prompt: dbVideo.prompt,
      },
    });
  } catch (error: any) {
    console.error('Remix video error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const downloadVideo = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const dbVideo = await prisma.video.findFirst({
      where: { id, userId },
    });

    if (!dbVideo) {
      return res.status(404).json({ error: 'Video not found' });
    }

    if (dbVideo.status !== 'completed') {
      return res.status(400).json({ error: 'Video is not completed yet' });
    }

    if (!dbVideo.openaiVideoId) {
      return res.status(400).json({ error: 'Video has no OpenAI ID' });
    }

    const videoBuffer = await openaiService.downloadVideoContent(dbVideo.openaiVideoId);

    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Disposition', `inline; filename="video-${dbVideo.id}.mp4"`);
    res.send(videoBuffer);
  } catch (error: any) {
    console.error('Download video error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};
