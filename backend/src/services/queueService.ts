import { Server as SocketIOServer } from 'socket.io';
import prisma from '../utils/prisma';
import * as openaiService from './openaiService';
import { getSocketIdForUser } from './socketRegistry';

// Process video in background without Redis queue
const processVideoInBackground = async (videoId: string, userId: string, io: SocketIOServer) => {
  try {
    const dbVideo = await prisma.video.findUnique({
      where: { id: videoId },
    });

    if (!dbVideo || !dbVideo.openaiVideoId) {
      throw new Error('Video not found');
    }

    console.log(`Processing video ${videoId} in background...`);

    const openaiVideo = await openaiService.pollVideoStatus(
      dbVideo.openaiVideoId,
      (status, progress) => {
        const socketId = getSocketIdForUser(userId);
        if (socketId) {
          io.to(socketId).emit('video:update', {
            id: videoId,
            status,
            progress,
          });
        }
        console.log(`Video ${videoId} - Status: ${status}, Progress: ${progress}%`);
      }
    );

    console.log(`OpenAI video data:`, JSON.stringify(openaiVideo, null, 2));

    // Generate our backend download URL
    const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
    const videoUrl = `${backendUrl}/api/videos/${videoId}/download`;

    const updatedVideo = await prisma.video.update({
      where: { id: videoId },
      data: {
        status: openaiVideo.status,
        videoUrl: videoUrl,
        thumbnailUrl: (openaiVideo as any).thumbnail_url || null,
      },
    });

    const socketId = getSocketIdForUser(userId);
    if (socketId) {
      io.to(socketId).emit('video:update', {
        ...updatedVideo,
        createdAt: updatedVideo.createdAt.toISOString(),
        updatedAt: updatedVideo.updatedAt.toISOString(),
      });
    }

    console.log(`✓ Video processing completed for ${videoId}. URL: ${videoUrl}`);
    return { success: true, videoId };
  } catch (error: any) {
    console.error('Video processing error:', error);

    await prisma.video.update({
      where: { id: videoId },
      data: {
        status: 'failed',
      },
    });

    const socketId = getSocketIdForUser(userId);
    if (socketId) {
      io.to(socketId).emit('video:update', {
        id: videoId,
        status: 'failed',
      });
    }

    throw error;
  }
};

export const addVideoToQueue = async (videoId: string, userId: string, io: SocketIOServer) => {
  // Process video asynchronously without waiting
  processVideoInBackground(videoId, userId, io).catch((error) => {
    console.error(`Failed to process video ${videoId}:`, error);
  });
};
