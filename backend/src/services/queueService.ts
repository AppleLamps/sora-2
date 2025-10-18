import prisma from '../utils/prisma';
import * as openaiService from './openaiService';

// Process video in background without Redis queue
const processVideoInBackground = async (videoId: string) => {
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
        console.log(`Video ${videoId} - Status: ${status}, Progress: ${progress}%`);
      }
    );

    console.log(`OpenAI video data:`, JSON.stringify(openaiVideo, null, 2));

    // Generate our backend download URL
    const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
    const videoUrl = `${backendUrl}/api/videos/${videoId}/download`;

    await prisma.video.update({
      where: { id: videoId },
      data: {
        status: openaiVideo.status,
        videoUrl: videoUrl,
        thumbnailUrl: null, // We can add thumbnail support later
      },
    });

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

    throw error;
  }
};

export const addVideoToQueue = async (videoId: string) => {
  // Process video asynchronously without waiting
  processVideoInBackground(videoId).catch((error) => {
    console.error(`Failed to process video ${videoId}:`, error);
  });
};
